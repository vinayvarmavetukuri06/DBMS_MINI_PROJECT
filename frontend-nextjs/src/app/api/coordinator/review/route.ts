import { NextRequest, NextResponse } from "next/server";
import { callReviewBooking, query } from "@/lib/db";
import { logAction } from "@/lib/nosql";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { requestId, coordinatorId, approve, reason = "" } = await request.json();

    if (!requestId || coordinatorId === undefined || approve === undefined) {
      return NextResponse.json(
        { error: "requestId, coordinatorId, and approve flag are required" },
        { status: 400 }
      );
    }

    const numReqId = parseInt(requestId, 10);
    const numCoordId = parseInt(coordinatorId, 10);
    const isApprove = Boolean(approve);
    const reasonText = String(reason || "").trim();

    // Mandatory rejection reason validation
    if (!isApprove && !reasonText) {
      return NextResponse.json(
        { error: "A rejection reason is mandatory when declining a booking request." },
        { status: 400 }
      );
    }

    // Server-side permission check: verify that this coordinator is in charge of the hall
    const checkRows = await query<any>(
      `SELECT r.status, h.coordinator_id, h.hall_name
       FROM booking_requests r
       JOIN seminar_halls h ON h.hall_id = r.hall_id
       WHERE r.request_id = ?`,
      [numReqId]
    );

    if (!checkRows || checkRows.length === 0) {
      return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
    }

    const { status, coordinator_id: inChargeId, hall_name } = checkRows[0];

    if (status !== "PENDING") {
      return NextResponse.json(
        { error: `This request is already in ${status} status.` },
        { status: 400 }
      );
    }

    if (inChargeId !== numCoordId) {
      return NextResponse.json(
        { error: `Permission denied: Only the assigned coordinator of ${hall_name} can review this request.` },
        { status: 403 }
      );
    }

    // Call stored procedure review_booking
    const reviewResult = await callReviewBooking(
      numReqId,
      numCoordId,
      isApprove,
      reasonText
    );

    // Log decision in NoSQL Document Store
    const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "");
    try {
      const logDoc: Record<string, any> = {
        action: "REVIEW",
        logged_at: nowIso,
        coordinator_id: numCoordId,
        request_id: numReqId,
        decision: isApprove ? "APPROVED" : "REJECTED",
      };
      if (!isApprove && reasonText) {
        logDoc.reason = reasonText;
      }
      await logAction(logDoc);
    } catch {
      // Non-fatal if NoSQL audit log fails
    }

    const extra = isApprove
      ? ""
      : " Database trigger trg_free_hall_on_cancel immediately freed the hall and published the slot in freed_slots.";

    return NextResponse.json({
      success: true,
      status: reviewResult.status,
      message: `Request #${numReqId}: ${reviewResult.status}. ${reviewResult.message}.${extra}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process coordinator review" },
      { status: 500 }
    );
  }
}
