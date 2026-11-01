import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getEventDetails } from "@/lib/nosql";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const srn = searchParams.get("srn");

    if (!srn) {
      return NextResponse.json(
        { error: "SRN parameter is required" },
        { status: 400 }
      );
    }

    const [wantedFreedSlots, history, upcoming] = await Promise.all([
      // Check if a hall the student was refused earlier is now free
      query<any>(
        `SELECT o.release_id, o.booking_date, o.slot_id, o.slot_label, o.hall_id, o.hall_name, o.capacity, o.reason, o.freed_at
         FROM v_open_freed_slots o
         WHERE EXISTS (SELECT 1 FROM booking_requests r
                       WHERE r.srn = ?
                         AND r.status = 'REJECTED'
                         AND r.remarks = 'Hall already booked for this date and slot'
                         AND r.hall_id = o.hall_id
                         AND r.slot_id = o.slot_id
                         AND r.booking_date = o.booking_date)
         ORDER BY o.booking_date, o.slot_id`,
        [srn]
      ),
      // Full booking history for this student
      query<any>(
        `SELECT request_id, booking_date, slot_label, hall_name, event_name, event_type,
                expected_attendees, coordinator, status, remarks, reviewed_by, requested_at, reviewed_at
         FROM v_booking_details
         WHERE srn = ?
         ORDER BY booking_date DESC, requested_at DESC`,
        [srn]
      ),
      // Active/upcoming bookings eligible for cancellation
      query<any>(
        `SELECT request_id, booking_date, slot_label, hall_name, event_name, status
         FROM v_booking_details
         WHERE srn = ? AND status IN ('PENDING', 'ALLOCATED') AND booking_date >= CURDATE()
         ORDER BY booking_date`,
        [srn]
      ),
    ]);

    return NextResponse.json({
      srn,
      wantedFreedSlots,
      history,
      upcoming,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch student bookings" },
      { status: 500 }
    );
  }
}
