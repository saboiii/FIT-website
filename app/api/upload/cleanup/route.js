import { NextResponse } from "next/server";
import { s3 } from "@/lib/s3";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@clerk/nextjs/server";
import { checkAdminPrivileges } from "@/lib/checkPrivileges";

const BUCKET_NAME = process.env.NEXT_PUBLIC_S3_BUCKET_NAME;

export const runtime = "nodejs";

export async function POST(req) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // Deletes arbitrary S3 keys, so it must stay admin-only. Its sole
        // caller is the admin ProductForm's upload-failure cleanup.
        if (!(await checkAdminPrivileges(userId))) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { files } = await req.json();

        if (!files || !Array.isArray(files) || files.length === 0) {
            return NextResponse.json({ error: "No files to cleanup" }, { status: 400 });
        }

        const deletionResults = [];

        for (const filePath of files.filter((f) => typeof f === "string" && f.trim())) {
            try {
                await s3.send(
                    new DeleteObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: filePath,
                    })
                );
                deletionResults.push({ file: filePath, status: 'deleted' });
            } catch (error) {
                console.error(`Failed to delete ${filePath}:`, error);
                deletionResults.push({ file: filePath, status: 'failed', error: error.message });
            }
        }

        return NextResponse.json({
            message: "Cleanup completed",
            results: deletionResults
        });
    } catch (error) {
        console.error("Cleanup error:", error);
        return NextResponse.json({
            error: error.message || "File cleanup failed"
        }, { status: 500 });
    }
}