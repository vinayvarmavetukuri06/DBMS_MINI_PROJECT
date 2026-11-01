import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const slotIdParam = searchParams.get("slotId");
    const minCapacityParam = searchParams.get("minCapacity");

    // Format tomorrow as default date if none provided
    let dateStr = dateParam;
    if (!dateStr) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateStr = tomorrow.toISOString().split("T")[0];
    }

    const [slots, halls, gridRows] = await Promise.all([
      query<any>("SELECT slot_id, slot_label, start_time, end_time FROM time_slots ORDER BY slot_id"),
      query<any>("SELECT hall_id, hall_name, capacity, is_active FROM seminar_halls ORDER BY hall_id"),
      query<any>(
        `SELECT h.hall_id,
                h.hall_name,
                t.slot_id,
                t.slot_label,
                CASE WHEN NOT h.is_active THEN 'UNDER MAINTENANCE'
                     WHEN r.status = 'PENDING' THEN CONCAT(r.event_name, ' (awaiting approval)')
                     WHEN r.event_name IS NOT NULL THEN r.event_name
                     WHEN o.release_id IS NOT NULL THEN 'FREED - book now'
                     ELSE 'FREE' END AS booking
         FROM seminar_halls h
         CROSS JOIN time_slots t
         LEFT JOIN allocations a
                ON a.hall_id = h.hall_id AND a.slot_id = t.slot_id AND a.booking_date = ?
         LEFT JOIN booking_requests r ON r.request_id = a.request_id
         LEFT JOIN v_open_freed_slots o
                ON o.hall_id = h.hall_id AND o.slot_id = t.slot_id AND o.booking_date = ?
         ORDER BY h.hall_id, t.slot_id`,
        [dateStr, dateStr]
      ),
    ]);

    // If slotId is provided, also fetch free halls filter
    let freeHalls: any[] = [];
    if (slotIdParam) {
      const slotId = parseInt(slotIdParam, 10);
      const minCapacity = parseInt(minCapacityParam || "1", 10);
      freeHalls = await query<any>(
        `SELECT h.hall_id, h.hall_name, h.block, h.capacity, h.has_ac, h.has_projector
         FROM seminar_halls h
         WHERE h.is_active = TRUE
           AND h.capacity >= ?
           AND NOT EXISTS (SELECT 1 FROM allocations a
                           WHERE a.hall_id = h.hall_id
                             AND a.booking_date = ?
                             AND a.slot_id = ?)
         ORDER BY h.capacity`,
        [minCapacity, dateStr, slotId]
      );
    }

    return NextResponse.json({
      date: dateStr,
      slots,
      halls,
      grid: gridRows,
      freeHalls,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch availability data" },
      { status: 500 }
    );
  }
}
