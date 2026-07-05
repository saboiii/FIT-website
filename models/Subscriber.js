import mongoose from 'mongoose';

const SubscriberSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    fullName: { type: String, default: '' },
    interestIds: [{ type: String }],
    unsubscribeToken: { type: String, required: true, unique: true },
    status: { type: String, enum: ['active', 'unsubscribed'], default: 'active' },
    preferences: {
        frequency: { type: String, enum: ['all', 'weekly', 'monthly'], default: 'all' },
        pausedUntil: { type: Date, default: null },
    },
    // Welcome drip progress: index of the next step to send (0-based);
    // welcomeStepSentAt = when the previous step went out.
    welcomeStep: { type: Number, default: 0 },
    welcomeStepSentAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.models.Subscriber || mongoose.model('Subscriber', SubscriberSchema);
