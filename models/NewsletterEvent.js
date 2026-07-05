import mongoose from 'mongoose';

// sent / open / click ledger, feeding per-campaign stats.
const NewsletterEventSchema = new mongoose.Schema({
    campaignId: { type: mongoose.Schema.Types.ObjectId, required: true },
    subscriberToken: { type: String, required: true },
    type: { type: String, enum: ['sent', 'open', 'click'], required: true },
    url: { type: String, default: '' },
}, { timestamps: true });

NewsletterEventSchema.index({ campaignId: 1, type: 1 });

export default mongoose.models.NewsletterEvent || mongoose.model('NewsletterEvent', NewsletterEventSchema);
