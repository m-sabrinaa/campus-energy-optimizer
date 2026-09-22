import { useState } from "react"
import Papa from "papaparse"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

import { optimizeEnergy } from "../services/api"
import ResultSummary from "./ResultSummary"

function OptimizerForm() {
    const [file, setFile] = useState(null)
    const [operatorNote, setOperatorNote] = useState("")
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState("")

    const handleSubmit = (e) => {
        e.preventDefault()

        if (!file) {
            setError("Please upload a CSV file.")
            return
        }

        setLoading(true)
        setError("")

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,

            complete: async (results) => {
                try {
                    const rows = results.data

                    if (!rows.length) {
                        throw new Error("CSV file is empty.")
                    }

                    // Generate scenario ID from current date + time
                    const now = new Date()

                    const scenario_id =
                        "GRID-" +
                        now.getFullYear() +
                        String(now.getMonth() + 1).padStart(2, "0") +
                        String(now.getDate()).padStart(2, "0") +
                        "-" +
                        String(now.getHours()).padStart(2, "0") +
                        String(now.getMinutes()).padStart(2, "0") +
                        String(now.getSeconds()).padStart(2, "0")

                    // Convert CSV rows into hours array
                    const hours = rows.map((row) => ({
                        hour: Number(row.hour),
                        demand: Number(row.demand),
                        solar: Number(row.solar),
                        tariff: Number(row.tariff),
                    }))

                    // Battery information comes from first CSV row
                    const firstRow = rows[0]

                    const battery = {
                        capacity: Number(firstRow.battery_capacity),
                        initial: Number(firstRow.battery_initial),
                        minimum: Number(firstRow.battery_minimum),
                        maxCharge: Number(firstRow.battery_maxCharge),
                        maxDischarge: Number(firstRow.battery_maxDischarge),
                    }

                    // Operator notes
                    const operator_notes = operatorNote
                        .split("\n")
                        .map((note) => note.trim())
                        .filter(Boolean)

                    // Final JSON object
                    const data = {
                        scenario_id,
                        operator_notes,
                        hours,
                        battery,
                    }

                    console.log("Sending JSON:", data)

                    const response = await optimizeEnergy(data)

                    console.log("Backend response:", response)

                    setResult(response)
                } catch (err) {
                    setError(err.message)
                } finally {
                    setLoading(false)
                }
            },

            error: (err) => {
                setError(err.message)
                setLoading(false)
            },
        })
    }

    return (
        <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">

            <Card>
                <CardHeader>
                    <CardTitle>Energy Data</CardTitle>
                </CardHeader>

                <CardContent>
                    <Label htmlFor="csv">Upload CSV</Label>

                    <Input
                        id="csv"
                        type="file"
                        accept=".csv"
                        className="mt-2"
                        onChange={(e) => setFile(e.target.files[0])}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Operator Note</CardTitle>
                </CardHeader>

                <CardContent>
                    <Label htmlFor="note">Enter instructions</Label>

                    <Textarea
                        id="note"
                        placeholder="Example: Reduce solar usage from 11 AM to 1 PM..."
                        className="mt-2 min-h-32"
                        value={operatorNote}
                        onChange={(e) => setOperatorNote(e.target.value)}
                    />
                </CardContent>
            </Card>

            <div className="md:col-span-2 flex justify-center">
                <Button type="submit" size="lg" disabled={loading}>
                    {loading ? "Optimizing..." : "Optimize Energy"}
                </Button>
            </div>

            {error && (
                <div className="md:col-span-2 text-red-500">
                    {error}
                </div>
            )}

            {result && (
                <div className="md:col-span-2">
                    <ResultSummary result={result} />
                </div>
            )}

        </form>
    )
}

export default OptimizerForm