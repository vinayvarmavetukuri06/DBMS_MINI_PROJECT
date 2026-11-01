import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const coordinatorId = searchParams.get("coordinatorId");

    if (!coordinatorId) {
      return NextResponse.json(
        { error: "coordinatorId is required" },
        { status: 400 }
      );
    }

    const numCoordId = parseInt(coordinatorId, 10);

    const [hallsInCharge, pendingRequests, recentDecisions] = await Promise.all([
      query<{ hall_id: number; hall_name: string }>(
        "SELECT hall_id, hall_name FROM seminar_halls WHERE coordinator_id = ? ORDER BY hall_id",
        [numCoordId]
      ),
      query<any>(
        `SELECT v.request_id, v.booking_date, v.slot_label, v.hall_name, v.event_name,
                v.event_type, v.expected_attendees, v.capacity, v.student_name,
                v.coordinator AS faculty, v.requested_at
         FROM v_booking_details v
         JOIN seminar_halls h ON h.hall_name = v.hall_name
         WHERE v.status = 'PENDING' AND h.coordinator_id = ?
         ORDER BY v.booking_date, v.request_id`,
        [numCoordId]
      ),
      query<any>(
        `SELECT r.request_id, r.booking_date, h.hall_name, r.event_name, r.status, r.remarks,
                r.reviewed_at
         FROM booking_requests r
         JOIN seminar_halls h ON h.hall_id = r.hall_id
         WHERE r.reviewed_by = ?
         ORDER BY r.reviewed_at DESC
         LIMIT 10`,
        [numCoordId]
      ),
    ]);

    return NextResponse.json({
      coordinatorId: numCoordId,
      hallsInCharge,
      pendingRequests,
      recentDecisions,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch coordinator pending requests" },
      { status: 500 }
    );
  }
}
