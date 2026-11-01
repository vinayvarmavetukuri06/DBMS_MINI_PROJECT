import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getNoSqlStats } from "@/lib/nosql";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    sql: {
      connected: boolean;
      database: string;
      tablesCount?: number;
      viewsCount?: number;
      error?: string;
    };
    nosql: {
      connected: boolean;
      eventDetailsCount?: number;
      bookingLogsCount?: number;
      error?: string;
    };
  } = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    sql: {
      connected: false,
      database: process.env.DB_NAME || "seminar_booking",
    },
    nosql: {
      connected: false,
    },
  };

  // Test SQL
  try {
    const ping = await query("SELECT 1 AS ok");
    if (ping && ping.length > 0) {
      result.sql.connected = true;
      const tables = await query<any>(
        "SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'"
      );
      const views = await query<any>(
        "SHOW FULL TABLES WHERE Table_type = 'VIEW'"
      );
      result.sql.tablesCount = tables.length;
      result.sql.viewsCount = views.length;
    }
  } catch (err: any) {
    result.sql.connected = false;
    result.sql.error = err.message || "Failed to connect to MySQL relational database";
    result.status = "degraded";
  }

  // Test NoSQL
  try {
    const nosqlStats = await getNoSqlStats();
    result.nosql.connected = nosqlStats.available;
    if (nosqlStats.available) {
      result.nosql.eventDetailsCount = nosqlStats.eventDetailsCount;
      result.nosql.bookingLogsCount = nosqlStats.bookingLogsCount;
    } else {
      result.nosql.error = "Document store port 33060 not accessible";
      result.status = result.sql.connected ? "degraded" : "unhealthy";
    }
  } catch (err: any) {
    result.nosql.connected = false;
    result.nosql.error = err.message || "Failed to connect to MySQL Document Store";
    result.status = result.sql.connected ? "degraded" : "unhealthy";
  }

  if (!result.sql.connected && !result.nosql.connected) {
    result.status = "unhealthy";
  }

  return NextResponse.json(result, {
    status: result.status === "unhealthy" ? 503 : 200,
  });
}
