import mongoose from 'mongoose';

// Autosave snapshot of the blog editor form — one per (post, admin user).
const BlogDraftSchema = new mongoose.Schema({
    postId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userId: { type: String, required: true },
    form: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

BlogDraftSchema.index({ postId: 1, userId: 1 }, { unique: true });

export default mongoose.models.BlogDraft || mongoose.model('BlogDraft', BlogDraftSchema);
