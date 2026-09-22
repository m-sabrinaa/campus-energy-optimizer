import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function EnergyChart({ data }) {
  return (
    <Card className="mt-8">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold">
          24-Hour Energy Usage
        </CardTitle>

        <p className="text-sm text-muted-foreground">
          Hourly comparison of solar, grid, and battery energy
        </p>
      </CardHeader>

      <CardContent>
        <div className="h-[480px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{
                top: 10,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="hour"
                tick={{ fontSize: 14 }}
                label={{
                  value: "Hour",
                  position: "insideBottom",
                  offset: -10,
                }}
              />

              <YAxis
                tick={{ fontSize: 14 }}
                label={{
                  value: "Energy (kWh)",
                  angle: -90,
                  position: "insideLeft",
                }}
              />

              <Tooltip />

              <Legend
                wrapperStyle={{
                  paddingTop: "15px",
                  fontSize: "14px",
                }}
              />

              {/* Solar */}
              <Line
                type="monotone"
                dataKey="solarUsedKwh"
                name="Solar"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
              />

              {/* Grid */}
              <Line
                type="monotone"
                dataKey="gridKwh"
                name="Grid"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
              />

              {/* Battery */}
              <Line
                type="monotone"
                dataKey="batteryKwh"
                name="Battery"
                stroke="#22c55e"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default EnergyChart