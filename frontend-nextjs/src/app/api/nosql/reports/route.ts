import { NextResponse } from "next/server";
import {
  getDocumentsPerEventType,
  getLogSummary,
  getEquipmentDemand,
} from "@/lib/nosql";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [n1Raw, n2Raw, n3Raw] = await Promise.all([
      getDocumentsPerEventType(),
      getLogSummary(),
      getEquipmentDemand(),
    ]);

    // Format N2 with composite label for chart: `Action / Status`
    const n2 = n2Raw.map((row) => ({
      ...row,
      status: row.status || "-",
      action_status: `${row.action} / ${row.status || "-"}`,
    }));

    return NextResponse.json({
      n1: {
        title: "N1. Documents per event type (groupBy)",
        shell: 'db.event_details.find().fields("event_type", "COUNT(_id) AS documents").groupBy("event_type")',
        chart: ["event_type", "documents"],
        data: n1Raw,
      },
      n2: {
        title: "N2. Booking log summary (groupBy on nested result.status)",
        shell: 'db.booking_logs.find().fields("action", "result.status AS status", "COUNT(_id) AS total").groupBy("action", "result.status")',
        chart: ["action_status", "total"],
        data: n2,
      },
      n3: {
        title: "N3. Most requested equipment (array field aggregation)",
        shell: 'db.event_details.find().fields("equipment")   // then counted in server runtime',
        chart: ["equipment", "events"],
        data: n3Raw,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load NoSQL reports" },
      { status: 500 }
    );
  }
}
