import mongoose from "mongoose";

const PricingTierSchema = new mongoose.Schema({
    minVolume: { type: Number, required: true, min: 0 }, // in cm³
    maxVolume: { type: Number, required: true, min: 0 }, // in cm³
    minWeight: { type: Number, required: true, min: 0 }, // in grams
    maxWeight: { type: Number, required: true, min: 0 }, // in grams
    price: { type: Number, required: true, min: 0 } // in SGD
}, { _id: false });

const BasePricingSchema = new mongoose.Schema({
    basePrice: { type: Number, default: null },
    volumeFactor: { type: Number, default: null },
    weightFactor: { type: Number, default: null },
    minPrice: { type: Number, default: null },
    maxPrice: { type: Number, default: null },
    freeShippingThreshold: { type: Number, default: null }
}, { _id: false });

const AdditionalDeliveryTypeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    displayName: { type: String, required: true },
    description: { type: String, default: "" },
    applicableToProductTypes: [{ type: String, enum: ["shop", "print"] }],
    // Only one pricing system should be present: either pricingTiers or basePricing
    pricingTiers: {
        type: [PricingTierSchema],
        default: undefined,
        required: false
    },
    basePricing: {
        type: BasePricingSchema,
        default: undefined,
        required: false
    },
    hasDefaultPrice: { type: Boolean, default: false }, // If false, creator must set price
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
}, { _id: true });

const AdditionalOrderStatusSchema = new mongoose.Schema({
    statusKey: { type: String, required: true },
    displayName: { type: String, required: true },
    description: { type: String, default: "" },
    orderType: { type: String, enum: ["order", "printOrder"], required: true },
    color: { type: String, default: "#6b7280" },
    icon: { type: String, default: "TbTruckDelivery" }, // Icon component name
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
}, { _id: true });

const AdditionalCategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    displayName: { type: String, required: true },
    type: { type: String, enum: ["shop", "print"], required: true },
    description: { type: String, default: "" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    // Optional subcategories stored as embedded documents
    subcategories: [{
        name: { type: String, required: true },
        displayName: { type: String, required: true },
        isActive: { type: Boolean, default: true }
    }]
}, { _id: true });

const AppSettingsSchema = new mongoose.Schema({
    // There should only be one settings document
    _id: { type: String, default: "app-settings" },

    // Additional delivery types - fully customizable with pricing tiers
    additionalDeliveryTypes: [AdditionalDeliveryTypeSchema],

    // Additional order statuses (beyond the hardcoded enum ones)
    additionalOrderStatuses: [AdditionalOrderStatusSchema],

    // Additional categories (beyond the hardcoded legacy ones)
    additionalCategories: [AdditionalCategorySchema],

    // Stripe price tiers for this environment (object: { tier1, tier2, tier3, tier4 })
    stripePriceTiers: {
        type: Object,
        default: undefined
    },

    // Environment: 'production' or 'development'
    env: {
        type: String,
        enum: ['production', 'development'],
        default: 'production'
    },

    // Version for future migrations if needed
    version: { type: Number, default: 1 },

    // Print pricing formula for auto-calculating custom print quotes
    // (LEGACY: superseded by quotingConfig + the Instant Quoting Engine; kept
    // until the admin "calculate print cost" tool migrates).
    printPricingFormula: {
        baseFee: { type: Number, default: 5 },
        materialCostPerGram: { type: Number, default: 0.05 },
        supportMultiplier: { type: Number, default: 1.2 },
        highQualityMultiplier: { type: Number, default: 1.5 },
        markupPercentage: { type: Number, default: 30 },
    },

    // Instant Quoting Engine configuration (see lib/quoting/pricingDefaults.js).
    // Money in major units (SGD); material rate per gram, time rate per hour.
    quotingConfig: {
        materialRatePerGram: { type: Number, default: 0.02 }, // $20/kg
        printTimeRatePerHour: { type: Number, default: 3 },   // $3/hr
        baseFee: { type: Number, default: 0 },
        postProcessingFee: { type: Number, default: 0 },
        specialRequestFee: { type: Number, default: 0 },
        priorityFee: { type: Number, default: 0 },
        expediteMode: { type: String, enum: ['percent', 'flat', 'greater'], default: 'greater' },
        expediteSurchargePercent: { type: Number, default: 50 },
        expediteSurchargeFlat: { type: Number, default: 20 },
        minimumPrice: { type: Number, default: 5 },
        // Optional per-material density overrides (g/cm³): { pla: 1.24, ... }
        materialDensities: { type: Map, of: Number, default: undefined },
    },

    // Available colours/materials for generic print configuration. Seeded from
    // lib/quoting/genericPresets DEFAULT_PRINT_COLOURS; admins curate to stock.
    // `material` (optional) maps to a quoting density key; `priceModifier`
    // (optional) is reserved for per-colour surcharges.
    printColours: {
        type: [{
            name: { type: String, required: true },
            hex: { type: String, required: true },
            material: { type: String, default: null },
            priceModifier: { type: Number, default: null },
            _id: false,
        }],
        default: undefined,
    }
}, {
    timestamps: true
});

let AppSettingsModel;
if (mongoose.models && mongoose.models.AppSettings) {
    AppSettingsModel = mongoose.models.AppSettings;
} else if (globalThis.AppSettingsModel) {
    AppSettingsModel = globalThis.AppSettingsModel;
} else {
    AppSettingsModel = mongoose.model("AppSettings", AppSettingsSchema);
    globalThis.AppSettingsModel = AppSettingsModel;
}
export default AppSettingsModel;