import { NextRequest, NextResponse } from "next/server";
import { callRequestBooking, query } from "@/lib/db";
import { saveEventDetails, logAction } from "@/lib/nosql";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      srn,
      hallId,
      slotId,
      bookingDate,
      eventName,
      eventType,
      attendees,
      facultyId,
      equipment = [],
      speakerName,
      speakerOrg,
      tags = "",
      notes = "",
    } = body;

    // Validate required fields
    if (!srn || !hallId || !slotId || !bookingDate || !eventName?.trim() || !eventType || !attendees || !facultyId) {
      return NextResponse.json(
        { error: "Missing required booking fields" },
        { status: 400 }
      );
    }

    const numHallId = parseInt(hallId, 10);
    const numSlotId = parseInt(slotId, 10);
    const numAttendees = parseInt(attendees, 10);
    const numFacultyId = parseInt(facultyId, 10);

    // Call stored procedure request_booking
    const result = await callRequestBooking(
      srn.trim(),
      numHallId,
      numSlotId,
      bookingDate,
      eventName.trim(),
      eventType,
      numAttendees,
      numFacultyId
    );

    const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "");

    // Fetch hall name for log and alternatives
    const hallRows = await query<any>(
      "SELECT hall_name, capacity FROM seminar_halls WHERE hall_id = ?",
      [numHallId]
    );
    const hallName = hallRows[0]?.hall_name || `Hall #${numHallId}`;

    // Prepare NoSQL event_details document
    const detailsDoc: Record<string, any> = {
      request_id: result.requestId,
      event_type: eventType,
      submitted_by: srn.trim(),
      created_at: nowIso,
      equipment: Array.isArray(equipment) ? equipment : [],
    };

    if (speakerName && speakerName.trim()) {
      detailsDoc.speaker = { name: speakerName.trim() };
      if (speakerOrg && speakerOrg.trim()) {
        detailsDoc.speaker.organisation = speakerOrg.trim();
      }
    }

    const tagList = (tags || "")
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);
    if (tagList.length > 0) {
      detailsDoc.tags = tagList;
    }

    if (notes && notes.trim()) {
      detailsDoc.notes = notes.trim();
    }

    // Check alternatives if rejected
    let alternativeHalls: any[] = [];
    let freeSlotsSameHall: any[] = [];

    if (result.status === "REJECTED") {
      [alternativeHalls, freeSlotsSameHall] = await Promise.all([
        query<any>(
          `SELECT h.hall_id, h.hall_name, h.block, h.capacity, h.has_ac
           FROM seminar_halls h
           WHERE h.is_active = TRUE
             AND h.capacity >= ?
             AND NOT EXISTS (SELECT 1 FROM allocations a
                             WHERE a.hall_id = h.hall_id
                               AND a.booking_date = ?
                               AND a.slot_id = ?)
           ORDER BY h.capacity`,
          [numAttendees, bookingDate, numSlotId]
        ),
        query<any>(
          `SELECT t.slot_id, t.slot_label
           FROM time_slots t
           WHERE NOT EXISTS (SELECT 1 FROM allocations a
                             WHERE a.slot_id = t.slot_id
                               AND a.hall_id = ?
                               AND a.booking_date = ?)
           ORDER BY t.slot_id`,
          [numHallId, bookingDate]
        ),
      ]);
    }

    // Prepare NoSQL booking_logs entry
    const logDoc: Record<string, any> = {
      action: "REQUEST",
      logged_at: nowIso,
      srn: srn.trim(),
      request: {
        hall_id: numHallId,
        hall_name: hallName,
        slot_id: numSlotId,
        booking_date: bookingDate,
        attendees: numAttendees,
      },
      result: {
        request_id: result.requestId,
        status: result.status,
        message: result.message,
      },
    };

    if (result.status === "REJECTED" && alternativeHalls.length > 0) {
      logDoc.alternatives_suggested = alternativeHalls.map((h) => h.hall_name);
    }

    // Save to MySQL Document Store
    let nosqlSaved = false;
    let nosqlError: string | null = null;
    try {
      if (result.requestId > 0) {
        await saveEventDetails(detailsDoc);
      }
      await logAction(logDoc);
      nosqlSaved = true;
    } catch (e: any) {
      nosqlError = e.message || "Failed to save NoSQL documents";
    }

    const executedSql = `CALL request_booking('${srn.trim()}', ${numHallId}, ${numSlotId}, '${bookingDate}', '${eventName.trim().replace(/'/g, "''")}', '${eventType}', ${numAttendees}, ${numFacultyId}, @id, @status, @msg);
SELECT @id, @status, @msg;`;

    return NextResponse.json({
      success: true,
      result: {
        requestId: result.requestId,
        status: result.status,
        message: result.message,
        hallName,
        bookingDate,
        slotId: numSlotId,
        attendees: numAttendees,
        executedSql,
        savedNoSqlDoc: detailsDoc,
        nosqlSaved,
        nosqlError,
        alternatives: {
          otherHalls: alternativeHalls,
          freeSlotsInSameHall: freeSlotsSameHall,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process booking request" },
      { status: 500 }
    );
  }
}
