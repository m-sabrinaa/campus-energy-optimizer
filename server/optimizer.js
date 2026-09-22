const TOLERANCE = 0.01;

const DSolarReduction = "solar_reduction";
const DMinimumBatteryReserve = "minimum_battery_reserve";
const DNoChargeWindow = "no_charge_window";
const DNoDischargeWindow = "no_discharge_window";
const DMaxGridWindow = "max_grid_window";
const DNoOp = "no_op";


const cleanHours = (input) => {
    const seen = new Set();
    const output = [];

    for (const h of input || []) {
        if (h < 0 || h > 23 || seen.has(h)) continue;

        seen.add(h);
        output.push(h);
    }

    return output.sort((a, b) => a - b);
};


const decodeDirective = (directiveType, applies, raw) => {
    if (directiveType === DNoOp || !applies) {
        return { type: DNoOp };
    }

    let adjustment;

    try {
        adjustment = typeof raw === "string"
            ? JSON.parse(raw)
            : raw;
    } catch {
        return { type: DNoOp };
    }

    const hours = cleanHours(adjustment?.hours);

    if (hours.length === 0) {
        return { type: DNoOp };
    }

    switch (directiveType) {

        case DSolarReduction:
            if (
                typeof adjustment.factor !== "number" ||
                !Number.isFinite(adjustment.factor) ||
                adjustment.factor < 0 ||
                adjustment.factor > 1
            ) {
                return { type: DNoOp };
            }

            return {
                type: directiveType,
                applies: true,
                hours,
                factor: adjustment.factor
            };

        case DMinimumBatteryReserve:
            if (
                typeof adjustment.minimum_energy_kwh !== "number" ||
                !Number.isFinite(adjustment.minimum_energy_kwh) ||
                adjustment.minimum_energy_kwh < 0
            ) {
                return { type: DNoOp };
            }

            return {
                type: directiveType,
                applies: true,
                hours,
                minimumEnergyKwh: adjustment.minimum_energy_kwh
            };

        case DNoChargeWindow:
        case DNoDischargeWindow:
            return {
                type: directiveType,
                applies: true,
                hours
            };

        case DMaxGridWindow:
            if (
                typeof adjustment.max_grid_kwh !== "number" ||
                !Number.isFinite(adjustment.max_grid_kwh) ||
                adjustment.max_grid_kwh < 0
            ) {
                return { type: DNoOp };
            }

            return {
                type: directiveType,
                applies: true,
                hours,
                maxGridKwh: adjustment.max_grid_kwh
            };

        default:
            return { type: DNoOp };
    }
};


const buildConstraints = (hours, batt, directives) => {
    const constraints = {
        effectiveSolar: Array(24),
        reserveFloor: Array(24),
        noCharge: Array(24).fill(false),
        noDischarge: Array(24).fill(false),
        gridCap: Array(24)
    };

    for (let h = 0; h < 24; h++) {
        constraints.effectiveSolar[h] = hours[h].solar;
        constraints.reserveFloor[h] = batt.minimum;
        constraints.gridCap[h] = Infinity;
    }

    for (const d of directives) {
        if (!d.applies || d.type === DNoOp) continue;

        switch (d.type) {

            case DSolarReduction:
                for (const h of d.hours) {
                    constraints.effectiveSolar[h] =
                        hours[h].solar * d.factor;
                }
                break;

            case DMinimumBatteryReserve:
                for (const h of d.hours) {
                    if (d.minimumEnergyKwh > constraints.reserveFloor[h]) {
                        constraints.reserveFloor[h] = d.minimumEnergyKwh;
                    }
                }
                break;

            case DNoChargeWindow:
                for (const h of d.hours) {
                    constraints.noCharge[h] = true;
                }
                break;

            case DNoDischargeWindow:
                for (const h of d.hours) {
                    constraints.noDischarge[h] = true;
                }
                break;

            case DMaxGridWindow:
                for (const h of d.hours) {
                    if (d.maxGridKwh < constraints.gridCap[h]) {
                        constraints.gridCap[h] = d.maxGridKwh;
                    }
                }
                break;
        }
    }

    return constraints;
};


const stepFor = (initial) => {
    if (
        Math.abs(initial / 0.5 - Math.round(initial / 0.5)) < 1e-9
    ) {
        return 0.5;
    }

    return 0.25;
};


const optimize = (hours, batt, constraints) => {

    const step = stepFor(batt.initial);

    const n = Math.round(batt.capacity / step);

    let e0 = Math.round(batt.initial / step);

    e0 = Math.max(0, Math.min(e0, n));

    const snapErr = e0 * step - batt.initial;

    const INF = 1e18;

    let prev = Array(n + 1).fill(INF);
    prev[e0] = 0;

    const parents = Array.from(
        { length: 24 },
        () =>
            Array.from(
                { length: n + 1 },
                () => ({
                    prevIdx: -1,
                    charge: 0,
                    dis: 0
                })
            )
    );

    const maxChargeSteps = (remaining) => {
        const max = Math.min(batt.maxCharge, remaining);
        return Math.floor(max / step + 1e-9);
    };


    for (let h = 0; h < 24; h++) {

        const cur = Array(n + 1).fill(INF);

        for (let i = 0; i <= n; i++) {

            const base = prev[i];

            if (base >= INF / 2) continue;

            const energy = i * step;

            const relax = (chargeSteps, dischargeSteps) => {

                const j = i + chargeSteps - dischargeSteps;

                if (j < 0 || j > n) return;

                const charge = chargeSteps * step;
                const discharge = dischargeSteps * step;

                let need =
                    hours[h].demand +
                    charge -
                    discharge;

                if (need < -1e-9) return;

                if (need < 0) need = 0;

                const solarUsed = Math.min(
                    constraints.effectiveSolar[h],
                    need
                );

                const grid = need - solarUsed;

                const energyAfter =
                    energy + charge - discharge;

                if (
                    energyAfter <
                    constraints.reserveFloor[h] - TOLERANCE ||
                    energyAfter >
                    batt.capacity + TOLERANCE
                ) {
                    return;
                }

                if (
                    grid >
                    constraints.gridCap[h] + TOLERANCE
                ) {
                    return;
                }

                const cost =
                    base + grid * hours[h].tariff;

                if (cost < cur[j] - 1e-12) {
                    cur[j] = cost;

                    parents[h][j] = {
                        prevIdx: i,
                        charge: chargeSteps,
                        dis: dischargeSteps
                    };
                }
            };


            // Idle
            relax(0, 0);


            // Charge
            if (!constraints.noCharge[h]) {

                for (
                    let k = 1;
                    k <= maxChargeSteps(batt.capacity - energy);
                    k++
                ) {
                    relax(k, 0);
                }
            }


            // Discharge
            if (!constraints.noDischarge[h]) {

                const maxDischarge =
                    Math.min(batt.maxDischarge, energy);

                for (
                    let k = 1;
                    k <= Math.floor(
                        maxDischarge / step + 1e-9
                    );
                    k++
                ) {
                    relax(0, k);
                }
            }
        }

        prev = cur;
    }


    if (prev[e0] >= INF / 2) {
        throw new Error(
            "Infeasible scenario under hard directives"
        );
    }


    // Reconstruct optimal actions
    const actions = Array.from(
        { length: 24 },
        () => ({ charge: 0, discharge: 0 })
    );

    let idx = e0;

    for (let h = 23; h >= 0; h--) {

        const parent = parents[h][idx];

        if (parent.prevIdx < 0) {
            throw new Error(
                `Reconstruction failed at hour ${h}`
            );
        }

        actions[h] = {
            charge: parent.charge,
            discharge: parent.dis
        };

        idx = parent.prevIdx;
    }


    // Build final plan
    const plan = Array(24);

    let energy = batt.initial;

    for (let h = 0; h < 24; h++) {

        const charge = actions[h].charge * step;
        const discharge = actions[h].discharge * step;

        let need =
            hours[h].demand +
            charge -
            discharge;

        if (need < 0) need = 0;

        const solarUsed = Math.min(
            constraints.effectiveSolar[h],
            need
        );

        const grid = need - solarUsed;

        const energyAfter =
            energy + charge - discharge;

        let batteryAction = "idle";
        let batteryKwh = 0;

        if (actions[h].charge > 0) {
            batteryAction = "charge";
            batteryKwh = charge;
        } else if (actions[h].discharge > 0) {
            batteryAction = "discharge";
            batteryKwh = discharge;
        }

        plan[h] = {
            hour: h,
            gridKwh: grid,
            solarUsedKwh: solarUsed,
            batteryAction,
            batteryKwh,
            batteryEnergyAfterKwh: energyAfter
        };

        energy = energyAfter;
    }


    if (snapErr !== 0) {

        for (let h = 0; h < 24; h++) {

            const p = plan[h];

            if (
                p.batteryEnergyAfterKwh <
                constraints.reserveFloor[h] - TOLERANCE ||
                p.batteryEnergyAfterKwh >
                batt.capacity + TOLERANCE
            ) {
                throw new Error(
                    `Snap-shift bound violation at hour ${h}`
                );
            }
        }
    }

    return plan;
};


const totals = (plan, hours) => {

    let grid = 0;
    let cost = 0;
    let peak = 0;

    for (let h = 0; h < plan.length; h++) {

        const p = plan[h];

        grid += p.gridKwh;

        cost +=
            p.gridKwh * hours[h].tariff;

        if (p.gridKwh > peak) {
            peak = p.gridKwh;
        }
    }

    return {
        grid,
        cost,
        peak
    };
};


const isFiniteNonNeg = (value) => {
    return Number.isFinite(value) && value >= -1e-9;
};


const replay = (plan, hours, batt, constraints) => {

    if (plan.length !== 24) {
        throw new Error(
            "hourly_plan must contain 24 entries"
        );
    }

    const seen = new Set();

    let energy = batt.initial;

    for (let h = 0; h < plan.length; h++) {

        const p = plan[h];

        if (p.hour !== h) {
            throw new Error(`Hour ${h} out of order`);
        }

        if (seen.has(p.hour)) {
            throw new Error(`Duplicate hour ${p.hour}`);
        }

        seen.add(p.hour);


        if (
            !isFiniteNonNeg(p.gridKwh) ||
            !isFiniteNonNeg(p.solarUsedKwh) ||
            !isFiniteNonNeg(p.batteryKwh) ||
            !Number.isFinite(p.batteryEnergyAfterKwh)
        ) {
            throw new Error(
                `Non-finite or negative value at hour ${h}`
            );
        }


        let charge = 0;
        let discharge = 0;

        switch (p.batteryAction) {

            case "idle":

                if (Math.abs(p.batteryKwh) > TOLERANCE) {
                    throw new Error(
                        `Idle must have battery_kwh 0 at hour ${h}`
                    );
                }

                break;


            case "charge":

                charge = p.batteryKwh;

                if (
                    charge >
                    batt.maxCharge + TOLERANCE
                ) {
                    throw new Error(
                        `Charge rate violation at hour ${h}`
                    );
                }

                if (
                    constraints.noCharge[h] &&
                    charge > TOLERANCE
                ) {
                    throw new Error(
                        `Charging in no-charge window at hour ${h}`
                    );
                }

                break;


            case "discharge":

                discharge = p.batteryKwh;

                if (
                    discharge >
                    batt.maxDischarge + TOLERANCE
                ) {
                    throw new Error(
                        `Discharge rate violation at hour ${h}`
                    );
                }

                if (
                    constraints.noDischarge[h] &&
                    discharge > TOLERANCE
                ) {
                    throw new Error(
                        `Discharging in no-discharge window at hour ${h}`
                    );
                }

                break;


            default:
                throw new Error(
                    `Invalid battery_action at hour ${h}`
                );
        }


        const energyAfter =
            energy + charge - discharge;

        if (
            Math.abs(
                energyAfter - p.batteryEnergyAfterKwh
            ) > TOLERANCE
        ) {
            throw new Error(
                `Battery transition mismatch at hour ${h}`
            );
        }


        if (
            energyAfter <
            constraints.reserveFloor[h] - TOLERANCE ||
            energyAfter >
            batt.capacity + TOLERANCE
        ) {
            throw new Error(
                `Battery bound violation at hour ${h}`
            );
        }


        if (
            p.solarUsedKwh >
            constraints.effectiveSolar[h] + TOLERANCE
        ) {
            throw new Error(
                `Solar overuse at hour ${h}`
            );
        }


        const lhs =
            p.gridKwh +
            p.solarUsedKwh +
            discharge;

        const rhs =
            hours[h].demand +
            charge;

        if (Math.abs(lhs - rhs) > TOLERANCE) {
            throw new Error(
                `Energy balance failure at hour ${h}`
            );
        }


        if (
            p.gridKwh >
            constraints.gridCap[h] + TOLERANCE
        ) {
            throw new Error(
                `Grid cap violation at hour ${h}`
            );
        }

        energy = energyAfter;
    }


    if (
        Math.abs(energy - batt.initial) > TOLERANCE
    ) {
        throw new Error(
            "End-of-day battery neutrality violated"
        );
    }

    return true;
};


export {
    decodeDirective,
    buildConstraints,
    optimize,
    totals,
    replay
};