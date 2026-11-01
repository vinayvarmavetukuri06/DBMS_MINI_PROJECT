import mysqlx from "@mysql/xdevapi";

function getXConfig() {
  return {
    host: process.env.DB_HOST === "localhost" ? "127.0.0.1" : (process.env.DB_HOST || "127.0.0.1"),
    port: parseInt(process.env.X_PORT || "33060", 10),
    user: process.env.DB_USER || "seminar_app",
    password: process.env.DB_PASSWORD || "",
    schema: process.env.DB_NAME || "seminar_booking",
  };
}

async function openSession() {
  const session = await mysqlx.getSession(getXConfig());
  const schema = session.getSchema(process.env.DB_NAME || "seminar_booking");
  return { session, schema };
}

function docsToObjects(result: any): any[] {
  const rows = result.fetchAll();
  return rows.map((row: any) => {
    if (typeof row === "object" && row !== null && !Array.isArray(row)) {
      return row;
    }
    try {
      if (typeof row.asString === "function") {
        return JSON.parse(row.asString());
      }
      return JSON.parse(JSON.stringify(row));
    } catch {
      return row;
    }
  });
}

export async function isAvailable(): Promise<boolean> {
  try {
    const { session } = await openSession();
    await session.close();
    return true;
  } catch {
    return false;
  }
}

export async function getNoSqlStats(): Promise<{
  available: boolean;
  eventDetailsCount: number;
  bookingLogsCount: number;
}> {
  try {
    const { session, schema } = await openSession();
    try {
      const collEvents = schema.getCollection("event_details");
      const collLogs = schema.getCollection("booking_logs");
      const [eventCount, logCount] = await Promise.all([
        collEvents.count(),
        collLogs.count(),
      ]);
      return {
        available: true,
        eventDetailsCount: Number(eventCount),
        bookingLogsCount: Number(logCount),
      };
    } finally {
      await session.close();
    }
  } catch {
    return {
      available: false,
      eventDetailsCount: 0,
      bookingLogsCount: 0,
    };
  }
}

export async function saveEventDetails(doc: Record<string, any>): Promise<void> {
  const { session, schema } = await openSession();
  try {
    const coll = schema.getCollection("event_details");
    await coll.add(doc).execute();
  } finally {
    await session.close();
  }
}

export async function logAction(doc: Record<string, any>): Promise<void> {
  const { session, schema } = await openSession();
  try {
    const coll = schema.getCollection("booking_logs");
    await coll.add(doc).execute();
  } finally {
    await session.close();
  }
}

export async function getEventDetails(requestId: number): Promise<any | null> {
  const { session, schema } = await openSession();
  try {
    const coll = schema.getCollection("event_details");
    const result = await coll
      .find("request_id = :rid")
      .bind("rid", Number(requestId))
      .execute();
    const docs = docsToObjects(result);
    return docs.length > 0 ? docs[0] : null;
  } finally {
    await session.close();
  }
}

export async function searchEventDetails(
  eventType?: string | null,
  equipment?: string | null,
  limit = 50
): Promise<{ docs: any[]; shell: string }> {
  const conditions: string[] = [];
  const binds: Record<string, any> = {};

  if (eventType && eventType !== "(any)") {
    conditions.push("event_type = :type");
    binds["type"] = eventType;
  }
  if (equipment && equipment !== "(any)") {
    conditions.push(":equipment IN equipment");
    binds["equipment"] = equipment;
  }

  const conditionStr = conditions.join(" AND ");

  const { session, schema } = await openSession();
  let docs: any[] = [];
  try {
    const coll = schema.getCollection("event_details");
    let query = coll.find(conditionStr || undefined).sort("request_id DESC").limit(limit);
    for (const [key, val] of Object.entries(binds)) {
      query = query.bind(key, val);
    }
    const result = await query.execute();
    docs = docsToObjects(result);
  } finally {
    await session.close();
  }

  let shell = `db.event_details.find(${conditionStr ? `"${conditionStr}"` : ""})`;
  shell += `.sort("request_id DESC").limit(${limit})`;
  for (const [name, value] of Object.entries(binds)) {
    shell += `.bind("${name}", "${value}")`;
  }

  return { docs, shell };
}

export async function getLatestLogs(limit = 20): Promise<any[]> {
  const { session, schema } = await openSession();
  try {
    const coll = schema.getCollection("booking_logs");
    const result = await coll
      .find()
      .sort("logged_at DESC")
      .limit(limit)
      .execute();
    return docsToObjects(result);
  } finally {
    await session.close();
  }
}

export async function addTag(requestId: number, tag: string): Promise<number> {
  const { session, schema } = await openSession();
  try {
    const coll = schema.getCollection("event_details");
    const existingResult = await coll
      .find("request_id = :rid")
      .bind("rid", Number(requestId))
      .execute();
    const docs = docsToObjects(existingResult);
    if (!docs || docs.length === 0) {
      return 0;
    }

    const modify: any = coll.modify("request_id = :rid").bind("rid", Number(requestId));
    if (docs[0].tags && Array.isArray(docs[0].tags)) {
      modify.arrayAppend("tags", tag);
    } else {
      modify.set("tags", [tag]);
    }
    const res = await modify.execute();
    return Number(res.getAffectedItemsCount());
  } finally {
    await session.close();
  }
}

export async function deleteLog(_docId: string): Promise<number> {
  // Disabled by security audit: booking_logs is an append-only audit trail
  throw new Error(
    "Audit Policy Violation: Permanent deletion of records from booking_logs is prohibited to preserve audit trail integrity."
  );
}

export async function getDocumentsPerEventType(): Promise<
  { event_type: string; documents: number }[]
> {
  const { session, schema } = await openSession();
  try {
    const coll = schema.getCollection("event_details");
    const result = await coll
      .find()
      .fields("event_type", "COUNT(_id) AS documents")
      .groupBy("event_type")
      .execute();
    const rows = docsToObjects(result);
    return rows.sort((a, b) => Number(b.documents || 0) - Number(a.documents || 0));
  } finally {
    await session.close();
  }
}

export async function getLogSummary(): Promise<
  { action: string; status: string; total: number }[]
> {
  const { session, schema } = await openSession();
  try {
    const coll = schema.getCollection("booking_logs");
    const result = await coll
      .find()
      .fields("action", "result.status AS status", "COUNT(_id) AS total")
      .groupBy("action", "result.status")
      .execute();
    const rows = docsToObjects(result);
    return rows.sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
  } finally {
    await session.close();
  }
}

export async function getEquipmentDemand(): Promise<
  { equipment: string; events: number }[]
> {
  const { session, schema } = await openSession();
  try {
    const coll = schema.getCollection("event_details");
    const result = await coll.find().fields("equipment").execute();
    const docs = docsToObjects(result);
    const counts: Record<string, number> = {};
    for (const d of docs) {
      if (Array.isArray(d.equipment)) {
        for (const item of d.equipment) {
          counts[item] = (counts[item] || 0) + 1;
        }
      }
    }
    return Object.entries(counts)
      .map(([equipment, events]) => ({ equipment, events }))
      .sort((a, b) => b.events - a.events);
  } finally {
    await session.close();
  }
}
