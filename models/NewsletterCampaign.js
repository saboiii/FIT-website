import mongoose from 'mongoose';

const NewsletterCampaignSchema = new mongoose.Schema({
    subject: { type: String, required: true },
    intro: { type: String, default: '' },
    articleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost' }],
    audience: {
        type: { type: String, enum: ['all', 'interests'], default: 'all' },
        interestIds: [{ type: String }],
    },
    status: {
        type: String,
        enum: ['draft', 'scheduled', 'sending', 'sent', 'failed'],
        default: 'draft',
    },
    scheduledFor: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    // Dispatch claim lock (atomic scheduled→sending transition stamps this).
    dispatchLockAt: { type: Date, default: null },
    // Resume ledger: unsubscribe tokens already sent to (skip on retry).
    sentTokens: [{ type: String }],
    counts: {
        sent: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
    },
    lastError: { type: String, default: '' },
}, { timestamps: true });

NewsletterCampaignSchema.index({ status: 1, scheduledFor: 1 });

export default mongoose.models.NewsletterCampaign || mongoose.model('NewsletterCampaign', NewsletterCampaignSchema);
