import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { srn, name, email, phone, semester, deptId } = body;

    if (!srn || !name || !email || !deptId || semester === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: srn, name, email, deptId, semester." },
        { status: 400 }
      );
    }

    const cleanSrn = String(srn).trim().toUpperCase();
    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = phone ? String(phone).trim() : null;
    const semNum = parseInt(String(semester), 10);
    const deptNum = parseInt(String(deptId), 10);

    if (isNaN(semNum) || semNum < 1 || semNum > 8) {
      return NextResponse.json(
        { error: "Semester must be an integer between 1 and 8 (database CHECK constraint chk_semester)." },
        { status: 400 }
      );
    }

    await execute(
      `INSERT INTO students (srn, name, email, phone, semester, dept_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cleanSrn, cleanName, cleanEmail, cleanPhone, semNum, deptNum]
    );

    return NextResponse.json({
      success: true,
      message: `Student ${cleanSrn} (${cleanName}) enrolled successfully in department #${deptNum}.`,
      student: { srn: cleanSrn, name: cleanName, email: cleanEmail, semester: semNum, dept_id: deptNum },
    });
  } catch (err: any) {
    const msg = err.sqlMessage || err.message || "Database insert error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
