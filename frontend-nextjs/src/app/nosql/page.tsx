"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import {
  Database,
  FileJson,
  Search,
  Tag,
  Trash2,
  BarChart3,
  Terminal,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Plus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const EVENT_TYPES = ["(any)", "Seminar", "Workshop", "Guest Lecture", "Club Event", "Hackathon", "Cultural", "Other"];
const EQUIPMENT = ["(any)", "Projector", "Microphone", "Speakers", "Laptop", "Whiteboard", "Video recording", "Extra chairs"];

export default function NoSqlPage() {
  const [activeTab, setActiveTab] = useState<"events" | "logs" | "reports">("events");

  // Tab 1: event_details state
  const [eventTypeFilter, setEventTypeFilter] = useState("(any)");
  const [equipmentFilter, setEquipmentFilter] = useState("(any)");
  const [eventDocs, setEventDocs] = useState<any[]>([]);
  const [shellQuery, setShellQuery] = useState("");
  const [tagRequestId, setTagRequestId] = useState("1");
  const [tagValue, setTagValue] = useState("");
  const [selectedRawDoc, setSelectedRawDoc] = useState<any>(null);

  // Tab 2: booking_logs state
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedLogId, setSelectedLogId] = useState("");

  // Tab 3: NoSQL reports state
  const [reports, setReports] = useState<any>(null);

  // Common UI state
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Fetch event_details
  const fetchEvents = () => {
    setLoading(true);
    fetch(`/api/nosql/events?eventType=${encodeURIComponent(eventTypeFilter)}&equipment=${encodeURIComponent(equipmentFilter)}`)
      .then((res) => res.json())
      .then((data) => {
        setEventDocs(data.docs || []);
        setShellQuery(data.shell || "");
        if (data.docs?.length) {
          setSelectedRawDoc(data.docs[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // Fetch booking_logs
  const fetchLogs = () => {
    setLoading(true);
    fetch("/api/nosql/logs?limit=20")
      .then((res) => res.json())
      .then((data) => {
        setLogs(data.logs || []);
        if (data.logs?.length) {
          setSelectedLogId(data.logs[0]._id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // Fetch NoSQL reports
  const fetchReports = () => {
    setLoading(true);
    fetch("/api/nosql/reports")
      .then((res) => res.json())
      .then((data) => {
        setReports(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (activeTab === "events") fetchEvents();
    if (activeTab === "logs") fetchLogs();
    if (activeTab === "reports") fetchReports();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "events") {
      fetchEvents();
    }
  }, [eventTypeFilter, equipmentFilter]);

  // Handle Add Tag
  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagRequestId || !tagValue.trim()) return;
    setActionMessage(null);

    const res = await fetch("/api/nosql/tag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: tagRequestId, tag: tagValue.trim() }),
    });
    const data = await res.json();
    setActionMessage(data.message);
    setTagValue("");
    fetchEvents();
  };

  // Handle Delete Log
  const handleDeleteLog = async () => {
    if (!selectedLogId) return;
    setActionMessage(null);

    const res = await fetch("/api/nosql/logs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId: selectedLogId }),
    });
    const data = await res.json();
    setActionMessage(data.message);
    fetchLogs();
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <Header
        title="NoSQL: MySQL Document Store"
        subtitle="Schemaless JSON document collections accessed via X Protocol on port 33060 without SQL."
      />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab("events");
                setActionMessage(null);
              }}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-colors ${
                activeTab === "events"
                  ? "border-indigo-600 text-indigo-700 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Collection: event_details
            </button>
            <button
              onClick={() => {
                setActiveTab("logs");
                setActionMessage(null);
              }}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-colors ${
                activeTab === "logs"
                  ? "border-indigo-600 text-indigo-700 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Collection: booking_logs
            </button>
            <button
              onClick={() => {
                setActiveTab("reports");
                setActionMessage(null);
              }}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-colors ${
                activeTab === "reports"
                  ? "border-indigo-600 text-indigo-700 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              NoSQL Reports (N1–N3)
            </button>
          </div>

          <button
            onClick={() => {
              if (activeTab === "events") fetchEvents();
              if (activeTab === "logs") fetchLogs();
              if (activeTab === "reports") fetchReports();
            }}
            className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg shadow-2xs mb-1"
            title="Refresh active tab"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Feedback Alert */}
        {actionMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-medium flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* TAB 1: event_details */}
        {activeTab === "events" && (
          <div className="space-y-6">
            {/* Filter Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Search Documents (Multi-condition find)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Schemaless documents have different fields per event type (speaker for lectures, tools for workshops, etc.).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Event Type
                    </label>
                    <select
                      value={eventTypeFilter}
                      onChange={(e) => setEventTypeFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      {EVENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Needs Equipment
                    </label>
                    <select
                      value={equipmentFilter}
                      onChange={(e) => setEquipmentFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      {EQUIPMENT.map((eq) => (
                        <option key={eq} value={eq}>
                          {eq}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* MySQL Shell Equivalent Command */}
              {shellQuery && (
                <div className="bg-slate-900 text-emerald-300 p-3.5 rounded-xl font-mono text-xs flex items-center gap-2 overflow-x-auto border border-slate-800">
                  <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{shellQuery}</span>
                </div>
              )}
            </div>

            {/* Document Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  {eventDocs.length} Documents Found (Showing up to 50)
                </span>
                <span className="text-[11px] text-slate-400">Empty cells = field not present in that document</span>
              </div>

              {eventDocs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No documents match your filter.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold z-10">
                      <tr>
                        <th className="py-2.5 px-3">Req #</th>
                        <th className="py-2.5 px-3">Event Type</th>
                        <th className="py-2.5 px-3">Submitted By</th>
                        <th className="py-2.5 px-3">Equipment</th>
                        <th className="py-2.5 px-3">Speaker</th>
                        <th className="py-2.5 px-3">Tags</th>
                        <th className="py-2.5 px-3">Notes</th>
                        <th className="py-2.5 px-3 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {eventDocs.map((doc, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            #{doc.request_id}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-medium text-indigo-700">
                            {doc.event_type}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{doc.submitted_by}</td>
                          <td className="py-2.5 px-3 max-w-xs truncate text-[11px]">
                            {Array.isArray(doc.equipment) ? doc.equipment.join(", ") : "—"}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-[11px]">
                            {doc.speaker?.name ? `${doc.speaker.name} (${doc.speaker.organisation || "N/A"})` : "—"}
                          </td>
                          <td className="py-2.5 px-3">
                            {Array.isArray(doc.tags) && doc.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {doc.tags.map((t: string, i: number) => (
                                  <span key={i} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-medium border border-indigo-200">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-2.5 px-3 max-w-xs truncate text-slate-500 text-[11px]" title={doc.notes}>
                            {doc.notes || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => setSelectedRawDoc(doc)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition-colors"
                            >
                              JSON
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Raw JSON Inspector */}
            {selectedRawDoc && (
              <details className="bg-slate-900 text-slate-100 rounded-2xl p-6 shadow-xs group" open>
                <summary className="cursor-pointer font-bold text-sm text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-sky-400" />
                    <span>Raw JSON Document: Request #{selectedRawDoc.request_id}</span>
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-normal">
                    _id: {selectedRawDoc._id}
                  </span>
                </summary>
                <pre className="mt-4 p-4 bg-slate-950 rounded-xl overflow-x-auto text-sky-300 font-mono text-xs leading-relaxed border border-slate-800">
                  {JSON.stringify(selectedRawDoc, null, 2)}
                </pre>
              </details>
            )}

            {/* In-Place Modification Form (Modify.arrayAppend) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600" />
                <span>Add Tag to Event Document (X DevAPI modify / arrayAppend)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Demonstrates schema modification: appends a tag into the document&apos;s <code className="font-mono">tags</code> array using <code className="font-mono text-indigo-600">coll.modify().arrayAppend(&apos;tags&apos;, tag)</code>.
              </p>

              <form onSubmit={handleAddTag} className="flex flex-col md:flex-row items-center gap-4">
                <div className="w-full md:w-48">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Request ID
                  </label>
                  <input
                    type="number"
                    value={tagRequestId}
                    onChange={(e) => setTagRequestId(e.target.value)}
                    min="1"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="w-full md:flex-1">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tag Name
                  </label>
                  <input
                    type="text"
                    value={tagValue}
                    onChange={(e) => setTagValue(e.target.value)}
                    placeholder="e.g. keynote, featured, robotics"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full md:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-end"
                >
                  Add Tag
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: booking_logs */}
        {activeTab === "logs" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Append-Only Audit Log (booking_logs Collection)
                </h3>
                <p className="text-xs text-slate-500">
                  Every booking request, coordinator review, and student cancellation writes an immutable log document into the store.
                </p>
              </div>

              <div className="bg-slate-900 text-emerald-300 p-3.5 rounded-xl font-mono text-xs flex items-center gap-2 border border-slate-800">
                <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>db.booking_logs.find().sort(&quot;logged_at DESC&quot;).limit(20)</span>
              </div>
            </div>

            {/* Log Entries Accordion */}
            <div className="space-y-3">
              {logs.map((log) => {
                let badgeClass = "bg-slate-100 text-slate-700";
                if (log.action === "REQUEST") badgeClass = "bg-sky-50 text-sky-700 border border-sky-200";
                if (log.action === "REVIEW") badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                if (log.action === "CANCEL") badgeClass = "bg-rose-50 text-rose-700 border border-rose-200";

                return (
                  <details
                    key={log._id}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs group"
                  >
                    <summary className="p-4 cursor-pointer hover:bg-slate-50/80 transition-colors flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${badgeClass}`}>
                          {log.action}
                        </span>
                        <span className="font-mono text-slate-500">{log.logged_at}</span>
                        {log.srn && (
                          <span className="font-semibold text-slate-800">Student: {log.srn}</span>
                        )}
                        {log.coordinator_id && (
                          <span className="font-semibold text-slate-800">Coordinator #{log.coordinator_id}</span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-slate-400">ID: {log._id}</span>
                    </summary>
                    <div className="p-4 border-t border-slate-100 bg-slate-950 text-sky-300 font-mono text-xs overflow-x-auto">
                      <pre>{JSON.stringify(log, null, 2)}</pre>
                    </div>
                  </details>
                );
              })}
            </div>

            {/* Audit Preservation Notice */}
            <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertCircle className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Append-Only Audit Policy (Deletion Prohibited)
                  </h3>
                  <p className="text-xs text-slate-400">
                    To preserve complete transaction history, permanent deletion from the <code className="font-mono text-sky-400">booking_logs</code> collection is strictly disabled. All audit entries are immutable.
                  </p>
                </div>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono flex items-center justify-between">
                <span>Security Constraint: coll.remove() disabled for booking_logs</span>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] uppercase font-bold">
                  Enforced
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: NoSQL Reports (N1, N2, N3) */}
        {activeTab === "reports" && reports && (
          <div className="space-y-8">
            {/* N1 Report */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">{reports.n1.title}</h3>
                <div className="bg-slate-900 text-emerald-300 p-3 rounded-lg font-mono text-xs mt-2 border border-slate-800">
                  {reports.n1.shell}
                </div>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reports.n1.data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="event_type" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip />
                    <Bar dataKey="documents" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Event Type</th>
                      <th className="py-2.5 px-3">Total Documents</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {reports.n1.data.map((r: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-semibold text-slate-900">{r.event_type}</td>
                        <td className="py-2 px-3 font-medium text-indigo-700">{r.documents}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* N2 Report */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">{reports.n2.title}</h3>
                <div className="bg-slate-900 text-emerald-300 p-3 rounded-lg font-mono text-xs mt-2 border border-slate-800">
                  {reports.n2.shell}
                </div>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reports.n2.data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="action_status" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#0284c7" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Result Status</th>
                      <th className="py-2.5 px-3">Total Logs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {reports.n2.data.map((r: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-bold text-slate-900">{r.action}</td>
                        <td className="py-2 px-3">{r.status}</td>
                        <td className="py-2 px-3 font-semibold text-sky-700">{r.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* N3 Report */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">{reports.n3.title}</h3>
                <div className="bg-slate-900 text-emerald-300 p-3 rounded-lg font-mono text-xs mt-2 border border-slate-800">
                  {reports.n3.shell}
                </div>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reports.n3.data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="equipment" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip />
                    <Bar dataKey="events" fill="#059669" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Equipment</th>
                      <th className="py-2.5 px-3">Requested In Events</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {reports.n3.data.map((r: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-semibold text-slate-900">{r.equipment}</td>
                        <td className="py-2 px-3 font-bold text-emerald-700">{r.events}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
