import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function ScheduleTable({ data }) {
  return (
    <Card className="mt-8">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold">
          Hourly Energy Schedule
        </CardTitle>

        <p className="text-sm text-muted-foreground">
          Energy allocation for each hour of the day
        </p>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/60">
                <th className="px-6 py-4 text-left text-base font-bold">
                  Hour
                </th>

                <th className="px-6 py-4 text-right text-base font-bold">
                  Solar (kWh)
                </th>

                <th className="px-6 py-4 text-right text-base font-bold">
                  Grid (kWh)
                </th>

                <th className="px-6 py-4 text-right text-base font-bold">
                  Battery (kWh)
                </th>
              </tr>
            </thead>

            <tbody>
              {data.map((item) => (
                <tr
                  key={item.hour}
                  className="border-b last:border-0 transition-colors hover:bg-muted/40"
                >
                  <td className="px-6 py-4 font-semibold">
                    {item.hour}
                  </td>

                  <td className="px-6 py-4 text-right">
                    {item.solarUsedKwh}
                  </td>

                  <td className="px-6 py-4 text-right">
                    {item.gridKwh}
                  </td>

                  <td className="px-6 py-4 text-right">
                    {item.batteryKwh}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export default ScheduleTable