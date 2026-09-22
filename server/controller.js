import interpretNotes from "./llm.js";
import validateDirective from "./validator.js";
import {
    decodeDirective,
    buildConstraints,
    optimize,
    totals,
    replay
} from "./optimizer.js";

const workflow = async (req, res) => {
    try {

        if (
            !Array.isArray(req.body.hours) ||
            req.body.hours.length !== 24 ||
            req.body.hours.some((item, index) => item.hour !== index)
        ) {
            return res.status(400).json({
                error: "Invalid hours",
                message: "hours must contain exactly 24 entries for hours 0–23."
            });
        }

        // Default: no directives
        let parsed_response = {
            directives: []
        };

        // Only call LLM if operator notes exist
        if (
            Array.isArray(req.body.operator_notes) &&
            req.body.operator_notes.length > 0
        ) {
            const llm_response = await interpretNotes(req.body.operator_notes);

            const clean_response = llm_response
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();

            parsed_response = JSON.parse(clean_response);

            const isValid = validateDirective(parsed_response);

            if (!isValid) {
                throw new Error("Invalid LLM directive");
            }
        }

        // Convert LLM directives
        const directives = parsed_response.directives.map(d =>
            decodeDirective(
                d.directive_type,
                d.applies,
                d.structured_adjustment
            )
        );

        // Build constraints
        const constraints = buildConstraints(
            req.body.hours,
            req.body.battery,
            directives
        );

        // Optimize
        const plan = optimize(
            req.body.hours,
            req.body.battery,
            constraints
        );

        // Calculate totals
        const summary = totals(plan, req.body.hours);

        // Validate final plan
        replay(
            plan,
            req.body.hours,
            req.body.battery,
            constraints
        );

        res.json({
            scenario_id: req.body.scenario_id,

            directive_interpretation: parsed_response.directives,

            hourly_plan: plan,

            total_grid_kwh: summary.grid,

            total_cost_bdt: summary.cost,

            peak_grid_kwh: summary.peak,

            plan_summary:
                "The plan uses available solar energy and battery storage while following all operator directives."
        });

    } catch (error) {
        console.error("Optimization error:", error);

        return res.status(500).json({
            error: "Internal server error",
            message: error.message
        });
    }
};

export default workflow;