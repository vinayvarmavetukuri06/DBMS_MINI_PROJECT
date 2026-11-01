import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const halls = await query<any>(`
      SELECT h.hall_id, h.hall_name, h.block, h.floor_no, h.capacity, h.is_active,
             c.name AS coordinator_name, c.email AS coordinator_email
      FROM seminar_halls h
      JOIN hall_coordinators c ON c.coordinator_id = h.coordinator_id
      ORDER BY h.hall_id
    `);
    return NextResponse.json({ halls });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch halls maintenance status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hallId } = body;

    if (!hallId) {
      return NextResponse.json({ error: "Missing hallId" }, { status: 400 });
    }

    const id = parseInt(String(hallId), 10);

    // Toggle is_active
    await execute(
      "UPDATE seminar_halls SET is_active = NOT is_active WHERE hall_id = ?",
      [id]
    );

    // Fetch updated row
    const rows = await query<any>(
      "SELECT hall_id, hall_name, is_active FROM seminar_halls WHERE hall_id = ?",
      [id]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "Hall not found" }, { status: 404 });
    }

    const updated = rows[0];
    const statusLabel = updated.is_active ? "Available" : "Under Maintenance";

    return NextResponse.json({
      success: true,
      message: `${updated.hall_name} is now marked as ${statusLabel}.`,
      hall: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update maintenance status" },
      { status: 500 }
    );
  }
}
