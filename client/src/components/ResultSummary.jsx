import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function ResultSummary({ result }) {
  return (
    <div className="mt-10 space-y-6">

      {/* 3 Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">

        <Card>
          <CardHeader>
            <CardTitle>Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ৳ {result.total_cost_bdt}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Grid Import</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {result.total_grid_kwh} kWh
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Peak Grid Load</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {result.peak_grid_kwh} kWh
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Plan Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Execution Summary</CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-muted-foreground">
            {result.plan_summary}
          </p>
        </CardContent>
      </Card>

    </div>
  )
}

export default ResultSummary