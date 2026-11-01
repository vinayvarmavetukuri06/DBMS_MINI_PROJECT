import { NextRequest, NextResponse } from "next/server";
import { addTag } from "@/lib/nosql";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { requestId, tag } = await request.json();

    if (!requestId || !tag?.trim()) {
      return NextResponse.json(
        { error: "requestId and tag are required" },
        { status: 400 }
      );
    }

    const numReqId = parseInt(requestId, 10);
    const affected = await addTag(numReqId, tag.trim());

    if (affected === 0) {
      return NextResponse.json(
        { success: false, message: `No event document found for request #${numReqId}.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Tag '${tag.trim()}' added to request #${numReqId} in event_details collection.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update tag in Document Store" },
      { status: 500 }
    );
  }
}
