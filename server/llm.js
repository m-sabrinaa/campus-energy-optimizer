import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const prompt = `
You interpret campus energy operator notes into strict JSON directives.

Allowed directive_type values:
- solar_reduction: {"hours":[...], "factor": number 0..1}
- minimum_battery_reserve: {"hours":[...], "minimum_energy_kwh": number}
- no_charge_window: {"hours":[...]}
- no_discharge_window: {"hours":[...]}
- max_grid_window: {"hours":[...], "max_grid_kwh": number}
- no_op: null

Rules:
1. Return exactly one directive object for each input note, in the same order.
2. Each object must contain:
   {
     "note_index": number,
     "applies": boolean,
     "directive_type": string,
     "structured_adjustment": object|null,
     "explanation": string
   }
3. Relevant energy-related instructions must have applies=true.
4. Irrelevant notes must have:
   applies=false,
   directive_type="no_op",
   structured_adjustment=null.
5. Status or outcome statements are no_op. Do not turn an expected outcome into an instruction.
6. Hours must be whole-hour integers from 0 to 23, unique and ascending.
   Use start-inclusive, end-exclusive intervals.
   Examples:
   "1 PM to 3 PM" → [13,14]
   "2 PM to 4 PM" → [14,15]
   "6 PM to 9 PM" → [18,19,20]
   "11 PM to midnight" → [23]
7. For solar_reduction, factor means the fraction of solar generation remaining:
   "80% reduction" → 0.2
   "drop to 20%" → 0.2
   "25% of forecast" → 0.25
   "about half" → 0.5
   "no solar" → 0.0
8. For minimum_battery_reserve:
   - "Keep at least 120 kWh" → 120
   - Only extract explicitly stated kWh values.
   - Never invent a battery reserve value.
9. For max_grid_window, extract the explicitly stated maximum grid energy in kWh.
10. no_charge_window and no_discharge_window contain only hours.
11. Never invent hours, values, demand, solar, tariff, or battery information.
12. Never create a directive_type outside the allowed list.
13. Return ONLY valid JSON.
14. The output must have exactly this structure:
   {
     "directives": [...]
   }

The user will provide the complete scenario data and operator notes in the next message.
`;

const openrouter = new OpenAI({
    baseURL: process.env.LLM_BASE_URL,
    apiKey: process.env.OPENROUTER_API_KEY
});

const interpretNotes = async (operatorNotes) => {
    try {
        const response = await openrouter.chat.completions.create({
            model: "openrouter/free",

            messages: [
                {
                    role: "system",
                    content: prompt
                },
                {
                    role: "user",
                    content: operatorNotes.join("\n")
                }
            ]
        });

        const content = response.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error("Unable to process operator notes.");
        }

        return content;

    } catch (error) {
        console.error("LLM error:", error);

        throw new Error("Unable to process operator notes.");
    }
};

export default interpretNotes;