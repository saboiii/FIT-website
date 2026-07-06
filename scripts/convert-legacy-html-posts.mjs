// Convert imported legacy posts (contentFormat 'markdown' whose `content` is
// actually raw HTML) onto the modern TipTap format: contentJson becomes one
// htmlBlock node holding the HTML byte-for-byte. The original `content`
// string is left untouched as a backup, so the change is reversible by
// setting contentFormat back to 'markdown'.
//
// Usage:
//   node scripts/convert-legacy-html-posts.mjs           # dry run (default)
//   node scripts/convert-legacy-html-posts.mjs --apply   # write changes
//
// Reads MONGODB_URI from the environment or .env in the repo root.

import { readFileSync } from 'node:fs'
import mongoose from 'mongoose'
import { buildHtmlBlockDoc } from '../lib/blog/htmlBlock.js'

const apply = process.argv.includes('--apply')

function mongoUri() {
    if (process.env.MONGODB_URI) return process.env.MONGODB_URI
    try {
        const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
        const line = env.split('\n').find((l) => l.startsWith('MONGODB_URI='))
        if (line) return line.slice('MONGODB_URI='.length).trim().replace(/^['"]|['"]$/g, '')
    } catch { /* fall through */ }
    throw new Error('MONGODB_URI not set and .env not readable')
}

const conn = await mongoose.connect(mongoUri())
const col = conn.connection.db.collection('blogposts')

const candidates = await col
    .find(
        { contentFormat: { $ne: 'tiptap' }, content: { $regex: /^\s*</ } },
        { projection: { title: 1, slug: 1, content: 1 } },
    )
    .toArray()

console.log(`${candidates.length} legacy post(s) with raw HTML content${apply ? '' : ' (dry run, pass --apply to write)'}`)

let converted = 0
for (const post of candidates) {
    const size = Buffer.byteLength(post.content || '', 'utf8')
    console.log(`- ${post.slug} | ${String(post.title).slice(0, 60)} | ${(size / 1024).toFixed(0)}KB`)
    if (!apply) continue
    await col.updateOne(
        { _id: post._id },
        {
            $set: {
                contentFormat: 'tiptap',
                contentJson: buildHtmlBlockDoc(post.content || ''),
                // `content` intentionally untouched: reversible backup.
            },
        },
    )
    converted += 1
}

console.log(apply ? `Converted ${converted} post(s).` : 'No changes written.')
await mongoose.disconnect()
