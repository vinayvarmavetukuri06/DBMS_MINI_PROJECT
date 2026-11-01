import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const WHITELISTED_TABLES = [
  "departments",
  "students",
  "faculty",
  "hall_coordinators",
  "seminar_halls",
  "time_slots",
  "booking_requests",
  "allocations",
  "freed_slots",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table") || "students";

    if (!WHITELISTED_TABLES.includes(table)) {
      return NextResponse.json(
        { error: `Invalid table: ${table}. Access restricted to whitelisted tables only.` },
        { status: 400 }
      );
    }

    const rows = await query<any>(`SELECT * FROM ${table} LIMIT 100`);
    return NextResponse.json({
      table,
      tables: WHITELISTED_TABLES,
      rows,
      count: rows.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to query relational table" },
      { status: 500 }
    );
  }
}
