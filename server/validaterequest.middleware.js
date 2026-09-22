const validateRequest = (req, res, next) => {
    try {
        const { scenario_id, hours, battery } = req.body;

        // scenario_id
        if (typeof scenario_id !== "string" || scenario_id.trim() === "") {
            return res.status(400).json({
                error: "Invalid scenario_id",
                message: "scenario_id must be a non-empty string."
            });
        }

        // hours
        if (!Array.isArray(hours) || hours.length !== 24) {
            return res.status(400).json({
                error: "Invalid hours",
                message: "hours must contain exactly 24 entries."
            });
        }

        // Check hours 0-23 and required values
        for (let i = 0; i < hours.length; i++) {
            const { hour, demand, solar, tariff } = hours[i];

            if (hour !== i) {
                return res.status(400).json({
                    error: "Invalid hour range",
                    message: "hours must contain entries from hour 0 to hour 23 in order."
                });
            }

            if (
                typeof demand !== "number" ||
                !Number.isFinite(demand) ||
                demand < 0
            ) {
                return res.status(400).json({
                    error: "Invalid demand",
                    message: `Invalid demand at hour ${hour}.`
                });
            }

            if (
                typeof solar !== "number" ||
                !Number.isFinite(solar) ||
                solar < 0
            ) {
                return res.status(400).json({
                    error: "Invalid solar",
                    message: `Invalid solar value at hour ${hour}.`
                });
            }

            if (
                typeof tariff !== "number" ||
                !Number.isFinite(tariff) ||
                tariff < 0
            ) {
                return res.status(400).json({
                    error: "Invalid tariff",
                    message: `Invalid tariff at hour ${hour}.`
                });
            }
        }

        // battery
        if (!battery || typeof battery !== "object") {
            return res.status(400).json({
                error: "Invalid battery",
                message: "Battery information is required."
            });
        }

        const {
            capacity,
            initial,
            minimum,
            maxCharge,
            maxDischarge
        } = battery;

        if (
            typeof capacity !== "number" ||
            !Number.isFinite(capacity) ||
            capacity <= 0
        ) {
            return res.status(400).json({
                error: "Invalid battery capacity"
            });
        }

        if (
            typeof initial !== "number" ||
            !Number.isFinite(initial) ||
            initial < 0 ||
            initial > capacity
        ) {
            return res.status(400).json({
                error: "Invalid initial battery energy"
            });
        }

        if (
            typeof minimum !== "number" ||
            !Number.isFinite(minimum) ||
            minimum < 0 ||
            minimum > capacity
        ) {
            return res.status(400).json({
                error: "Invalid minimum battery energy"
            });
        }

        if (
            typeof maxCharge !== "number" ||
            !Number.isFinite(maxCharge) ||
            maxCharge < 0
        ) {
            return res.status(400).json({
                error: "Invalid maxCharge"
            });
        }

        if (
            typeof maxDischarge !== "number" ||
            !Number.isFinite(maxDischarge) ||
            maxDischarge < 0
        ) {
            return res.status(400).json({
                error: "Invalid maxDischarge"
            });
        }

        next();

    } catch (error) {
        console.error("Request validation error:", error);

        return res.status(500).json({
            error: "Request Validation error"
        });
    }
};

export default validateRequest;