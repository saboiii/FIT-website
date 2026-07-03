import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import BlogPost from '@/models/BlogPost';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public fetch: published posts only. Admin previews go through /api/admin/blog.
export async function GET(req, { params }) {
    const { slug } = await params;
    await connectToDatabase();
    const post = await BlogPost.findOne({ slug, published: true }).lean();
    if (!post) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, post });
}
