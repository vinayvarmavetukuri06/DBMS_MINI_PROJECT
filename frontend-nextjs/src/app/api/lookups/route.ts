import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [students, faculty, slots, halls, coordinators, departments] = await Promise.all([
      query<{ srn: string; name: string }>(
        "SELECT srn, name FROM students ORDER BY srn"
      ),
      query<{ faculty_id: number; name: string; dept_code: string }>(
        `SELECT f.faculty_id, f.name, d.dept_code
         FROM faculty f
         JOIN departments d ON d.dept_id = f.dept_id
         ORDER BY d.dept_code, f.name`
      ),
      query<{ slot_id: number; slot_label: string; start_time: string; end_time: string }>(
        "SELECT slot_id, slot_label, start_time, end_time FROM time_slots ORDER BY slot_id"
      ),
      query<{
        hall_id: number;
        hall_name: string;
        block: string;
        floor_no: number;
        capacity: number;
        has_projector: number;
        has_ac: number;
        is_active: number;
      }>("SELECT * FROM seminar_halls ORDER BY hall_id"),
      query<{ coordinator_id: number; name: string; email: string }>(
        "SELECT coordinator_id, name, email FROM hall_coordinators ORDER BY coordinator_id"
      ),
      query<{ dept_id: number; dept_code: string; dept_name: string }>(
        "SELECT dept_id, dept_code, dept_name FROM departments ORDER BY dept_id"
      ),
    ]);

    const eventTypes = [
      "Seminar",
      "Workshop",
      "Guest Lecture",
      "Club Event",
      "Hackathon",
      "Cultural",
      "Other",
    ];

    const equipmentList = [
      "Projector",
      "Microphone",
      "Speakers",
      "Laptop",
      "Whiteboard",
      "Video recording",
      "Extra chairs",
    ];

    return NextResponse.json({
      students,
      faculty,
      slots,
      halls,
      coordinators,
      departments,
      eventTypes,
      equipmentList,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch lookups" },
      { status: 500 }
    );
  }
}
