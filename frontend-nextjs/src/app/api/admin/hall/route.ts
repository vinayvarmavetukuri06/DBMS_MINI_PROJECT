import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      hallName,
      block,
      floorNo,
      capacity,
      hasProjector,
      hasAc,
      coordinatorId,
    } = body;

    if (!hallName || !block || capacity === undefined || capacity === null || capacity === "" || !coordinatorId) {
      return NextResponse.json(
        { error: "Missing required fields: hallName, block, capacity, coordinatorId." },
        { status: 400 }
      );
    }

    const cleanName = String(hallName).trim();
    const cleanBlock = String(block).trim();
    const floor = floorNo !== undefined ? parseInt(String(floorNo), 10) : 0;
    const cap = parseInt(String(capacity), 10);
    const coordId = parseInt(String(coordinatorId), 10);
    const proj = Boolean(hasProjector);
    const ac = Boolean(hasAc);

    if (isNaN(cap) || cap <= 0) {
      return NextResponse.json(
        { error: "Capacity must be greater than 0 (database CHECK constraint chk_capacity)." },
        { status: 400 }
      );
    }

    const result = await execute(
      `INSERT INTO seminar_halls (hall_name, block, floor_no, capacity, has_projector, has_ac, coordinator_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cleanName, cleanBlock, floor, cap, proj, ac, coordId]
    );

    return NextResponse.json({
      success: true,
      message: `Seminar Hall '${cleanName}' registered successfully with ID #${result.insertId}.`,
      hallId: result.insertId,
    });
  } catch (err: any) {
    const msg = err.sqlMessage || err.message || "Database insert error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
