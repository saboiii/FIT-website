/**
 * Calculate a suggested print cost based on print configuration and dimensions.
 * @param {Object} config - printSettings from CustomPrintRequest
 * @param {Object} dimensions - { length, width, height, weight } in cm/kg
 * @param {Object} formula - printPricingFormula from AppSettings
 * @returns {number} Suggested price
 */
export function calculatePrintCost(config, dimensions, formula) {
    if (!formula) return 0;

    const {
        baseFee = 5,
        materialCostPerGram = 0.05,
        supportMultiplier = 1.2,
        highQualityMultiplier = 1.5,
        markupPercentage = 30,
    } = formula;

    // Estimate material weight from dimensions
    const vol = (dimensions?.length || 10) * (dimensions?.width || 10) * (dimensions?.height || 10);
    const estimatedWeight = dimensions?.weight ? dimensions.weight * 1000 : vol * 0.001 * 1200; // PLA density ~1.24g/cm3

    // Infill affects material usage
    const infillDensity = (config?.sparseInfillDensity || 20) / 100;
    const materialUsage = estimatedWeight * (0.3 + 0.7 * infillDensity); // Shell + infill

    let cost = baseFee;
    cost += materialUsage * materialCostPerGram;

    // Layer height affects print time
    if (config?.layerHeight && config.layerHeight < 0.15) {
        cost *= highQualityMultiplier;
    }

    // Support adds material and time
    if (config?.enableSupport) {
        cost *= supportMultiplier;
    }

    // Apply markup
    cost *= (1 + markupPercentage / 100);

    return Math.round(cost * 100) / 100;
}
