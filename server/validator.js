const allowedDirectives = [
    "solar_reduction",
    "minimum_battery_reserve",
    "no_charge_window",
    "no_discharge_window",
    "max_grid_window",
    "no_op"
];

const isValidHours = (hours) => {
    return (
        Array.isArray(hours) &&
        hours.every(
            hour => Number.isInteger(hour) && hour >= 0 && hour <= 23
        ) &&
        new Set(hours).size === hours.length &&
        hours.every((hour, i) => i === 0 || hour > hours[i - 1])
    );
};

const validateDirective = (data) => {
    try {
        if (!data || !Array.isArray(data.directives)) {
            throw new Error("Invalid directives format");
        }

        data.directives.forEach((directive) => {

            if (
                typeof directive.note_index !== "number" ||
                typeof directive.applies !== "boolean" ||
                typeof directive.explanation !== "string" ||
                !allowedDirectives.includes(directive.directive_type)
            ) {
                throw new Error("Invalid directive structure");
            }

            if (directive.directive_type === "no_op") {
                if (directive.structured_adjustment !== null) {
                    throw new Error("Invalid no_op directive");
                }
                return;
            }

            const adjustment = directive.structured_adjustment;

            if (!adjustment || !isValidHours(adjustment.hours)) {
                throw new Error("Invalid hours");
            }

            if (directive.directive_type === "solar_reduction") {
                if (
                    typeof adjustment.factor !== "number" ||
                    adjustment.factor < 0 ||
                    adjustment.factor > 1
                ) {
                    throw new Error("Invalid solar reduction factor");
                }
            }

            if (directive.directive_type === "minimum_battery_reserve") {
                if (
                    typeof adjustment.minimum_energy_kwh !== "number" ||
                    adjustment.minimum_energy_kwh < 0
                ) {
                    throw new Error("Invalid battery reserve");
                }
            }

            if (directive.directive_type === "max_grid_window") {
                if (
                    typeof adjustment.max_grid_kwh !== "number" ||
                    adjustment.max_grid_kwh < 0
                ) {
                    throw new Error("Invalid grid limit");
                }
            }
        });

        return true;

    } catch (error) {
        console.error("Directive validation failed:", error.message);
        return false;
    }
};

export default validateDirective;