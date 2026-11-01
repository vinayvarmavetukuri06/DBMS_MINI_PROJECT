import { NextRequest, NextResponse } from "next/server";
import { getLatestLogs, deleteLog } from "@/lib/nosql";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const logs = await getLatestLogs(limit);
    return NextResponse.json({ logs });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch logs from Document Store" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  return NextResponse.json(
    {
      error:
        "Permanent deletion of audit records from booking_logs is disabled to preserve an immutable, append-only audit trail.",
    },
    { status: 403 }
  );
}
