import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const slots = await query<any>(
      "SELECT slot_id, slot_label, start_time, end_time FROM time_slots ORDER BY start_time"
    );
    return NextResponse.json({ slots });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch time slots" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startTime, endTime, customLabel } = body;

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: "Start time and end time are required (format HH:MM or HH:MM:SS)." },
        { status: 400 }
      );
    }

    const start = String(startTime).trim();
    const end = String(endTime).trim();
    const label = customLabel ? String(customLabel).trim() : `${start} - ${end}`;

    const res = await execute(
      "INSERT INTO time_slots (slot_label, start_time, end_time) VALUES (?, ?, ?)",
      [label, start, end]
    );

    return NextResponse.json({
      success: true,
      message: `Slot '${label}' created successfully with ID #${res.insertId}.`,
      slotId: res.insertId,
    });
  } catch (err: any) {
    const dbError = err.sqlMessage || err.message || "Constraint violation";
    return NextResponse.json(
      {
        success: false,
        error: dbError,
        code: err.code,
        sqlState: err.sqlState,
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get("slotId");

    if (!slotId) {
      return NextResponse.json({ error: "Missing slotId parameter" }, { status: 400 });
    }

    const id = parseInt(slotId, 10);
    // Protect default slots 1 to 3
    if (id <= 3) {
      return NextResponse.json(
        { error: "Default university time slots (#1, #2, #3) cannot be deleted." },
        { status: 400 }
      );
    }

    await execute("DELETE FROM time_slots WHERE slot_id = ?", [id]);
    return NextResponse.json({ success: true, message: `Slot #${id} deleted.` });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.sqlMessage || err.message || "Failed to delete slot" },
      { status: 400 }
    );
  }
}
