# Campus Energy Optimizer

A full-stack, AI-powered energy optimization system for university campuses. Upload a 24-hour CSV of energy data (demand, solar generation, tariffs, battery specs), optionally add free-text operator notes, and the system returns a cost-minimized hourly plan for grid import, solar usage, and battery charge/discharge — powered by dynamic programming with LLM-interpreted operator constraints.

---

## What It Does

1. **User Input**: Takes a 24-hour campus energy CSV file and optional operator notes.
2. **LLM Processing**: Operator notes are interpreted by an LLM into structured constraints.
3. **Optimization**: Runs dynamic programming to compute a cost-minimized 24-hour schedule.
4. **Frontend Dashboard**: Displays total cost (BDT), total grid import, peak grid load, an interactive energy chart, and a 24-hour schedule table.

---

## Input → Output Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              INPUT                                     │
│  1. CSV file (24 rows: demand, solar, tariff + battery specs)          │
│  2. Operator notes (optional, one per line)                            │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        PROCESSING PIPELINE                             │
│                                                                        │
│  ① Frontend parses CSV with PapaParse → builds JSON payload            │
│  ② POST /optimize-energy → validaterequest.middleware.js               │
│  ③ If operator notes exist → llm.js sends to OpenRouter API           │
│  ④ LLM response validated by validator.js                              │
│  ⑤ Directives decoded → constraints built (optimizer.js)               │
│  ⑥ DP optimizer finds minimum-cost 24h plan (optimizer.js)             │
│  ⑦ replay() validates the plan against all constraints                 │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              OUTPUT                                    │
│  • hourly_plan: 24 entries (gridKwh, solarUsedKwh, batteryAction,      │
│    batteryKwh, batteryEnergyAfterKwh)                                  │
│  • total_grid_kwh, total_cost_bdt, peak_grid_kwh                       │
│  • directive_interpretation: how each operator note was understood      │
│  • plan_summary: human-readable description                            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer      | Technology                                                            |
| :--------- | :-------------------------------------------------------------------- |
| Frontend   | React 19, Vite 8, Tailwind CSS 4, Recharts 3, PapaParse 5            |
| UI Library | shadcn/ui v4 (base-nova style) — Card, Button, Input, Label, Textarea |
| Icons      | Lucide React                                                          |
| Font       | Geist (via @fontsource-variable/geist)                                |
| Backend    | Node.js, Express 5, CORS                                             |
| LLM        | OpenAI SDK 7 → OpenRouter API (`openrouter/free` model)              |
| Language   | JavaScript (ES Modules on both client and server)                     |

---

## Project Structure

```text
campus-energy-optimizer/
├── client/                     # Frontend (Vite + React)
│   └── src/
│       ├── components/         # UI & dashboard components (charts, form, table)
│       ├── services/api.js     # Backend API client
│       ├── App.jsx             # Main application layout
│       └── main.jsx            # Client entry point
├── server/                     # Backend (Express)
│   ├── app.js                  # Server entry & endpoints
│   ├── controller.js           # Workflow orchestration
│   ├── llm.js                  # OpenRouter integration
│   ├── optimizer.js            # Dynamic programming optimizer
│   ├── validaterequest.middleware.js # Request validation
│   └── validator.js            # Directive structure validator
├── campus_energy_data.csv      # Sample 24-hour energy dataset
├── .gitignore
└── README.md
```

---

## Strict CSV Format

The CSV must contain **exactly 24 data rows** (hours 0–23) with these **10 columns**:

| Column                 | Type    | Description                           |
| :--------------------- | :------ | :------------------------------------ |
| `date`                 | string  | Date in `YYYY-MM-DD` format           |
| `hour`                 | integer | Hour of the day (`0` to `23`)         |
| `demand`               | number  | Energy demand in kWh                  |
| `solar`                | number  | Solar generation in kWh               |
| `tariff`               | number  | Grid electricity rate (BDT/kWh)       |
| `battery_capacity`     | number  | Total battery capacity in kWh         |
| `battery_initial`      | number  | Battery energy at start of day in kWh |
| `battery_minimum`      | number  | Minimum allowed battery level in kWh  |
| `battery_maxCharge`    | number  | Max charge rate per hour in kWh       |
| `battery_maxDischarge` | number  | Max discharge rate per hour in kWh    |

**Example (first 3 rows):**

```csv
date,hour,demand,solar,tariff,battery_capacity,battery_initial,battery_minimum,battery_maxCharge,battery_maxDischarge
2026-09-22,0,180,0,7.5,600,300,60,120,120
2026-09-22,1,160,0,7.5,600,300,60,120,120
2026-09-22,2,150,0,7.2,600,300,60,120,120
```

> **Note:** Battery columns (`battery_capacity`, `battery_initial`, `battery_minimum`, `battery_maxCharge`, `battery_maxDischarge`) are read from the **first row only**. They should be consistent across all rows. A sample file `campus_energy_data.csv` is included in the repo.

---

## Running Locally

### 1. Clone the Repository

```bash
git clone https://github.com/m-sabrinaa/campus-energy-optimizer.git
cd campus-energy-optimizer
```

### 2. Set Up Environment Variables

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
PORT=3000
LLM_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 3. Run the Backend

```bash
cd server
npm install
npx nodemon app.js
```

### 4. Run the Frontend

Open a **new terminal**:

```bash
cd client
npm install
npm run dev
```

---

## How to Test

1. Open `http://localhost:5173` in your browser.
2. Upload the included [`campus_energy_data.csv`](./campus_energy_data.csv) sample file.
3. *(Optional)* Enter an operator note (e.g., *"Reduce solar by 80% from 11 AM to 1 PM"*).
4. Click **Optimize Energy** to view the summary metrics, interactive energy chart, and hourly schedule.

---

## API Endpoints

| API                    | Description                                                     |
| :--------------------- | :-------------------------------------------------------------- |
| `GET /health`          | Health check                                                    |
| `POST /optimize-energy`| Submit campus energy data and receive an optimized 24-hour plan |