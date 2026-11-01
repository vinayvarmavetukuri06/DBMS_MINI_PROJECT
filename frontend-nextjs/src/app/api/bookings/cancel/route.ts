import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { logAction } from "@/lib/nosql";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { requestId, srn } = await request.json();

    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      );
    }

    const numRequestId = parseInt(requestId, 10);

    // Fetch booking details before cancellation to capture freed slot details for the log
    const rows = await query<any>(
      `SELECT request_id, srn, hall_name, slot_label, booking_date, event_name, status
       FROM v_booking_details
       WHERE request_id = ? AND status IN ('PENDING', 'ALLOCATED')`,
      [numRequestId]
    );


    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "Booking request not found or not in PENDING/ALLOCATED status" },
        { status: 404 }
      );
    }

    const booking = rows[0];

    // Cancel booking: fires trigger trg_free_hall_on_cancel automatically
    const result = await execute(
      `UPDATE booking_requests
       SET status = 'CANCELLED', remarks = 'Cancelled by student'
       WHERE request_id = ? AND status IN ('PENDING', 'ALLOCATED')`,
      [numRequestId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "Failed to cancel booking request" },
        { status: 400 }
      );
    }

    // Log cancellation in NoSQL Document Store
    const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "");
    try {
      await logAction({
        action: "CANCEL",
        logged_at: nowIso,
        srn: booking.srn,
        request_id: numRequestId,
        freed_slot: {
          hall_name: booking.hall_name,
          booking_date: booking.booking_date,
          slot: booking.slot_label,
        },
      });
    } catch {
      // Non-fatal if NoSQL log fails
    }

    return NextResponse.json({
      success: true,
      message: `Booking #${numRequestId} cancelled. Database trigger trg_free_hall_on_cancel removed its allocation and published the slot in freed_slots, making it immediately available to all students.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to cancel booking" },
      { status: 500 }
    );
  }
}
