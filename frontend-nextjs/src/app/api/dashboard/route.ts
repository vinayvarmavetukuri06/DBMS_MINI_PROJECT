import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [metricsRows, freedSlots, todayScheduleRows, latestRequests, slots, halls] =
      await Promise.all([
        query<any>(`
          SELECT (SELECT COUNT(*) FROM seminar_halls WHERE is_active)          AS active_halls,
                 (SELECT COUNT(*) FROM booking_requests)                       AS total_requests,
                 (SELECT COUNT(*) FROM booking_requests WHERE status = 'ALLOCATED') AS allocated,
                 (SELECT COUNT(*) FROM booking_requests WHERE status = 'PENDING')   AS pending,
                 (SELECT COUNT(*) FROM allocations
                   WHERE booking_date BETWEEN CURDATE() AND CURDATE() + INTERVAL 7 DAY) AS next_7_days
        `),
        query<any>(`
          SELECT o.release_id, o.booking_date, o.slot_id, o.slot_label, o.hall_id, o.hall_name, o.capacity, o.reason, o.freed_at
          FROM v_open_freed_slots o
          ORDER BY o.booking_date, o.slot_id
        `),
        query<any>(`
          SELECT h.hall_id,
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
                 ON a.hall_id = h.hall_id AND a.slot_id = t.slot_id AND a.booking_date = CURDATE()
          LEFT JOIN booking_requests r ON r.request_id = a.request_id
          LEFT JOIN v_open_freed_slots o
                 ON o.hall_id = h.hall_id AND o.slot_id = t.slot_id AND o.booking_date = CURDATE()
          ORDER BY h.hall_id, t.slot_id
        `),
        query<any>(`
          SELECT request_id, booking_date, slot_label, hall_name, event_name,
                 student_name, status, remarks, requested_at
          FROM v_booking_details
          ORDER BY requested_at DESC
          LIMIT 10
        `),
        query<any>("SELECT slot_id, slot_label FROM time_slots ORDER BY slot_id"),
        query<any>("SELECT hall_id, hall_name FROM seminar_halls ORDER BY hall_id"),
      ]);

    const m = metricsRows[0] || {};
    const totalReq = Number(m.total_requests || 0);
    const allocatedReq = Number(m.allocated || 0);
    const successRate = totalReq > 0 ? ((allocatedReq / totalReq) * 100).toFixed(1) : "0.0";

    const metrics = {
      activeHalls: Number(m.active_halls || 0),
      totalRequests: totalReq,
      allocated: allocatedReq,
      pending: Number(m.pending || 0),
      next7Days: Number(m.next_7_days || 0),
      successRate: `${successRate}%`,
    };

    return NextResponse.json({
      metrics,
      freedSlots,
      todaySchedule: {
        slots: slots.map((s) => s.slot_label),
        halls: halls.map((h) => h.hall_name),
        cells: todayScheduleRows,
      },
      latestRequests,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
