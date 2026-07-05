import mongoose from 'mongoose';

// Follow-topics for newsletter segmentation.
const InterestSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Interest || mongoose.model('Interest', InterestSchema);
