import { NextRequest, NextResponse } from "next/server";
import { searchEventDetails } from "@/lib/nosql";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("eventType");
    const equipment = searchParams.get("equipment");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const result = await searchEventDetails(
      eventType === "(any)" ? null : eventType,
      equipment === "(any)" ? null : equipment,
      limit
    );

    return NextResponse.json({ ...result, count: result.docs.length });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to search event details in NoSQL store" },
      { status: 500 }
    );
  }
}
