import mysql, { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "3306", 10),
      user: process.env.DB_USER || "seminar_app",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "seminar_booking",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true, // Returns MySQL DATE/DATETIME/TIME as strings to prevent timezone shifts
    });
  }
  return pool;
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const p = getPool();
  const [rows] = await p.query<RowDataPacket[]>(sql, params);
  return rows as unknown as T[];
}

export interface ExecuteResult {
  affectedRows: number;
  insertId: number;
}

export async function execute(sql: string, params: any[] = []): Promise<ExecuteResult> {
  const p = getPool();
  const [result] = await p.execute<ResultSetHeader>(sql, params);
  return {
    affectedRows: result.affectedRows,
    insertId: result.insertId,
  };
}

export interface BookingRequestResult {
  requestId: number;
  status: "PENDING" | "ALLOCATED" | "REJECTED" | string;
  message: string;
}

export async function callRequestBooking(
  srn: string,
  hallId: number,
  slotId: number,
  bookingDate: string,
  eventName: string,
  eventType: string,
  attendees: number,
  facultyId: number
): Promise<BookingRequestResult> {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    await conn.query(
      "CALL request_booking(?, ?, ?, ?, ?, ?, ?, ?, @out_req_id, @out_status, @out_msg)",
      [srn, hallId, slotId, bookingDate, eventName, eventType, attendees, facultyId]
    );
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT @out_req_id AS requestId, @out_status AS status, @out_msg AS message"
    );
    const row = (rows as any[])[0] || {};
    return {
      requestId: Number(row.requestId || 0),
      status: String(row.status || "ERROR"),
      message: String(row.message || ""),
    };
  } finally {
    conn.release();
  }
}

export interface BookingReviewResult {
  status: "ALLOCATED" | "REJECTED" | string;
  message: string;
}

export async function callReviewBooking(
  requestId: number,
  coordinatorId: number,
  approve: boolean,
  reason: string = ""
): Promise<BookingReviewResult> {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    await conn.query(
      "CALL review_booking(?, ?, ?, ?, @out_status, @out_msg)",
      [requestId, coordinatorId, approve ? 1 : 0, reason || null]
    );
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT @out_status AS status, @out_msg AS message"
    );
    const row = (rows as any[])[0] || {};
    return {
      status: String(row.status || "ERROR"),
      message: String(row.message || ""),
    };
  } finally {
    conn.release();
  }
}
