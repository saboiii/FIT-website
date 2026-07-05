import mongoose from 'mongoose';

// Singleton (_id fixed by the API): onboarding drip emails for new subscribers.
const WelcomeSequenceSchema = new mongoose.Schema({
    _id: { type: String, default: 'welcome-sequence' },
    isActive: { type: Boolean, default: false },
    steps: [{
        delayDays: { type: Number, default: 0 }, // days after subscribe/previous step
        subject: { type: String, required: true },
        body: { type: String, default: '' }, // plain text/simple HTML paragraphs
    }],
}, { timestamps: true });

export default mongoose.models.WelcomeSequence || mongoose.model('WelcomeSequence', WelcomeSequenceSchema);
