import { NextRequest, NextResponse } from "next/server";
import { getEventDetails } from "@/lib/nosql";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");

    if (!requestId) {
      return NextResponse.json(
        { error: "requestId is required" },
        { status: 400 }
      );
    }

    const doc = await getEventDetails(parseInt(requestId, 10));

    return NextResponse.json({
      requestId: parseInt(requestId, 10),
      document: doc,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to retrieve NoSQL document" },
      { status: 500 }
    );
  }
}
