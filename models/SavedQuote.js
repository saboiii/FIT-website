import mongoose from 'mongoose'

// A customer-saved instant quote that can be retrieved later and optionally
// shared via an opaque token. The `quote` breakdown mirrors lib/quoting/quote.js.
const SavedQuoteSchema = new mongoose.Schema({
    quoteId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },

    // Optional reference to the model the quote was for.
    modelRef: {
        originalName: { type: String },
        s3Key: { type: String },
    },

    // The print settings used (free-form; mirrors the editor's printSettings).
    settings: { type: mongoose.Schema.Types.Mixed },

    // Server-authoritative itemized quote (same shape persisted on CustomPrintRequest).
    quote: { type: mongoose.Schema.Types.Mixed },
    currency: { type: String, default: 'sgd' },
    total: { type: Number },

    // Validity window — re-quote if expired (pricing may have changed).
    validUntil: { type: Date },

    // Sharing (opaque token + its own expiry). Sparse so non-shared quotes don't
    // collide on null.
    shareToken: { type: String, index: { unique: true, sparse: true } },
    shareExpiresAt: { type: Date },
}, { timestamps: true })

SavedQuoteSchema.index({ userId: 1, createdAt: -1 })

if (process.env.NODE_ENV === 'development' && mongoose.models.SavedQuote) {
    delete mongoose.models.SavedQuote
}

export default mongoose.models.SavedQuote || mongoose.model('SavedQuote', SavedQuoteSchema)
