import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import BlogPost from '@/models/BlogPost';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public list: published posts only, lean card fields (no body content).
export async function GET() {
    await connectToDatabase();
    const posts = await BlogPost.find({ published: true })
        .select('title slug excerpt heroImage tags categories featured publishDate readingTimeMinutes')
        .sort({ publishDate: -1, createdAt: -1 })
        .limit(200)
        .lean();
    return NextResponse.json({ ok: true, posts });
}
