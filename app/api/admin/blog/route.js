import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import BlogPost from '@/models/BlogPost';
import { sanitizeString } from "@/utils/validate";
import { authenticate } from "@/lib/authenticate";
import { checkAdminPrivileges } from "@/lib/checkPrivileges";
import { readingTimeMinutes } from '@/lib/blog/readingTime';
import { extractTextFromTiptap } from '@/lib/blog/tiptapText';
import { statusWrite, effectiveStatus } from '@/lib/blog/status';
import { getPostHogClient } from '@/lib/posthog-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function computeReadingTime(body) {
    if (body.contentFormat === 'tiptap') {
        return readingTimeMinutes(extractTextFromTiptap(body.contentJson));
    }
    return readingTimeMinutes(body.content || '');
}

// Create or update a blog post. If `slug` or `_id` provided, update; otherwise create.
export async function POST(req) {
    const { userId } = await authenticate(req);
    const isAdmin = await checkAdminPrivileges(userId);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    await connectToDatabase();

    const requestedStatus = body.status || (body.published ? 'published' : 'draft');

    const data = {
        title: body.title,
        excerpt: body.excerpt || '',
        content: body.content || '',
        contentJson: body.contentJson ?? null,
        contentFormat: body.contentFormat === 'tiptap' ? 'tiptap' : 'markdown',
        heroImage: body.heroImage || '',
        cta: body.cta || {},
        tags: body.tags || [],
        categories: body.categories || [],
        featured: !!body.featured,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
        metaTitle: body.metaTitle || '',
        metaDescription: body.metaDescription || '',
        readingTimeMinutes: computeReadingTime(body),
    };

    // make slug from provided slug or title
    const slugSource = (body.slug && body.slug.trim()) || body.title || '';
    const slug = sanitizeString(slugSource).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 200);
    data.slug = slug;

    let post;
    if (body._id) {
        const existing = await BlogPost.findById(body._id).lean();
        Object.assign(data, statusWrite(requestedStatus, existing?.publishDate));
        post = await BlogPost.findByIdAndUpdate(body._id, { ...data }, { new: true, upsert: true });
    } else if (body.slug) {
        const existing = await BlogPost.findOne({ slug: body.slug }).lean();
        Object.assign(data, statusWrite(requestedStatus, existing?.publishDate));
        post = await BlogPost.findOneAndUpdate({ slug: body.slug }, { ...data }, { new: true, upsert: true });
    } else {
        Object.assign(data, statusWrite(requestedStatus, body.publishDate ? new Date(body.publishDate) : null));
        // ensure unique slug
        let uniqueSlug = data.slug || 'post';
        let counter = 0;
        while (await BlogPost.findOne({ slug: uniqueSlug })) {
            counter += 1;
            uniqueSlug = `${data.slug}-${counter}`;
        }
        data.slug = uniqueSlug;
        data.authorId = userId;
        post = await BlogPost.create(data);
    }

    if (data.status === 'published') {
        try {
            getPostHogClient().capture({
                distinctId: userId,
                event: 'blog_post_published',
                properties: {
                    slug: post.slug,
                    content_format: post.contentFormat,
                    reading_time_minutes: post.readingTimeMinutes || 0,
                    featured: !!post.featured,
                },
            });
        } catch (phErr) {
            console.error('PostHog blog_post_published capture failed:', phErr);
        }
    }

    return NextResponse.json({ ok: true, post });
}

// Admin-only list / fetch (drafts included). The public site uses /api/blog.
export async function GET(req) {
    const { userId } = await authenticate(req);
    const isAdmin = await checkAdminPrivileges(userId);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');

    await connectToDatabase();

    if (slug) {
        const post = await BlogPost.findOne({ slug }).lean();
        if (!post) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
        return NextResponse.json({ ok: true, post });
    }

    const posts = await BlogPost.find({}).sort({ createdAt: -1 }).limit(200).lean();
    for (const p of posts) p.status = effectiveStatus(p);
    return NextResponse.json({ ok: true, posts });
}

export async function DELETE(req) {
    const { userId } = await authenticate(req);
    const isAdmin = await checkAdminPrivileges(userId);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    if (!body.slug && !body._id) return NextResponse.json({ ok: false, error: 'missing identifier' }, { status: 400 });
    await connectToDatabase();
    if (body._id) await BlogPost.findByIdAndDelete(body._id);
    else await BlogPost.findOneAndDelete({ slug: body.slug });
    return NextResponse.json({ ok: true });
}
