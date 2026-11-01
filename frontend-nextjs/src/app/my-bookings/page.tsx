"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import {
  User,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  FileJson,
  Calendar,
  Building,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface BookingItem {
  request_id: number;
  booking_date: string;
  slot_label: string;
  hall_name: string;
  event_name: string;
  event_type: string;
  expected_attendees: number;
  coordinator: string;
  status: string;
  remarks: string;
  reviewed_by: string | null;
  requested_at: string;
  reviewed_at: string | null;
}

export default function MyBookingsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedSrn, setSelectedSrn] = useState<string>("");
  const [wantedFreedSlots, setWantedFreedSlots] = useState<any[]>([]);
  const [history, setHistory] = useState<BookingItem[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [selectedUpcomingId, setSelectedUpcomingId] = useState<string>("");

  // NoSQL document inspect state
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [nosqlDoc, setNosqlDoc] = useState<any>(null);
  const [nosqlLoading, setNosqlLoading] = useState(false);

  // Status & action state
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load students list
  useEffect(() => {
    fetch("/api/lookups")
      .then((res) => res.json())
      .then((data) => {
        setStudents(data.students || []);
        if (data.students?.length) {
          setSelectedSrn(data.students[0].srn);
        }
      });
  }, []);

  // Fetch bookings whenever student SRN changes
  const fetchStudentBookings = (srn: string) => {
    if (!srn) return;
    setLoading(true);
    setCancelMessage(null);
    setCancelError(null);
    setNosqlDoc(null);

    fetch(`/api/bookings/my-bookings?srn=${encodeURIComponent(srn)}`)
      .then((res) => res.json())
      .then((data) => {
        setWantedFreedSlots(data.wantedFreedSlots || []);
        setHistory(data.history || []);
        setUpcoming(data.upcoming || []);
        if (data.upcoming?.length) {
          setSelectedUpcomingId(String(data.upcoming[0].request_id));
        } else {
          setSelectedUpcomingId("");
        }
        if (data.history?.length) {
          setSelectedRequestId(String(data.history[0].request_id));
          loadNosqlDoc(String(data.history[0].request_id));
        }
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStudentBookings(selectedSrn);
  }, [selectedSrn]);

  // Fetch NoSQL document for selected request
  const loadNosqlDoc = (reqId: string) => {
    if (!reqId) return;
    setNosqlLoading(true);
    fetch(`/api/nosql/details?requestId=${reqId}`)
      .then((res) => res.json())
      .then((data) => {
        setNosqlDoc(data.document);
        setNosqlLoading(false);
      })
      .catch(() => setNosqlLoading(false));
  };

  const handleCancel = async () => {
    if (!selectedUpcomingId) return;
    setCancelling(true);
    setCancelMessage(null);
    setCancelError(null);

    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: parseInt(selectedUpcomingId, 10),
          srn: selectedSrn,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel booking");
      }

      setCancelMessage(data.message);
      fetchStudentBookings(selectedSrn);
    } catch (err: any) {
      setCancelError(err.message || "Failed to cancel booking");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <Header
        title="My Bookings"
        subtitle="View student request history, inspect associated NoSQL event documents, and cancel upcoming bookings."
      />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Student Selector Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <User className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Select Student (SRN)</h2>
              <p className="text-xs text-slate-500">Filter requests by student registration number</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedSrn}
              onChange={(e) => setSelectedSrn(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 min-w-64"
            >
              {students.map((s) => (
                <option key={s.srn} value={s.srn}>
                  {s.srn} — {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => fetchStudentBookings(selectedSrn)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
              title="Refresh student bookings"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Cancellation Message Banner */}
        {cancelMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-medium flex items-start gap-2.5 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900">Cancellation Successful</p>
              <p className="mt-0.5">{cancelMessage}</p>
            </div>
          </div>
        )}

        {cancelError && (
          <div className="p-4 bg-rose-50 border border-rose-300 text-rose-950 rounded-xl text-xs font-medium flex items-center gap-2">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{cancelError}</span>
          </div>
        )}

        {/* Good News: Freed Slot Alert for This Student */}
        {wantedFreedSlots.length > 0 && (
          <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <span>Good News: A Hall You Were Refused Earlier Is Free Again!</span>
            </div>
            <p className="text-xs text-emerald-800">
              You previously requested a hall that was booked, but the previous booking was cancelled or rejected by a coordinator. It is now published in <code className="bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded font-mono">freed_slots</code> and open for you to take!
            </p>

            <div className="overflow-x-auto rounded-lg border border-emerald-200 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-emerald-100/60 text-emerald-950 font-semibold border-b border-emerald-200">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Time Slot</th>
                    <th className="py-2.5 px-3">Seminar Hall</th>
                    <th className="py-2.5 px-3">Capacity</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100 text-slate-700">
                  {wantedFreedSlots.map((s) => (
                    <tr key={s.release_id} className="hover:bg-emerald-50/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{s.booking_date}</td>
                      <td className="py-2.5 px-3 font-medium text-emerald-800">{s.slot_label}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{s.hall_name}</td>
                      <td className="py-2.5 px-3">{s.capacity} seats</td>
                      <td className="py-2.5 px-3 max-w-xs truncate text-slate-600">{s.reason}</td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          href={`/book?hallId=${s.hall_id}&slotId=${s.slot_id}&date=${s.booking_date}`}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs"
                        >
                          <span>Book It Now</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Booking History Table */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Booking History ({history.length} Requests)
            </h2>
            <span className="text-xs text-slate-400">Queried from v_booking_details</span>
          </div>

          {history.length === 0 ? (
            <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
              No booking requests found for this student.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="py-3 px-4">Req #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Slot</th>
                      <th className="py-3 px-4">Hall</th>
                      <th className="py-3 px-4">Event Name</th>
                      <th className="py-3 px-4">Attendees</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Remarks</th>
                      <th className="py-3 px-4">Coordinator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {history.map((r) => {
                      let badgeClass = "bg-slate-100 text-slate-700";
                      if (r.status === "ALLOCATED") badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold";
                      if (r.status === "PENDING") badgeClass = "bg-amber-50 text-amber-800 border border-amber-200 font-semibold";
                      if (r.status === "REJECTED") badgeClass = "bg-rose-50 text-rose-700 border border-rose-200";
                      if (r.status === "CANCELLED") badgeClass = "bg-zinc-100 text-zinc-600 border border-zinc-200";

                      return (
                        <tr key={r.request_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                            #{r.request_id}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-900">
                            {r.booking_date}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-indigo-700 font-medium">
                            {r.slot_label}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                            {r.hall_name}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate" title={r.event_name}>
                            {r.event_name}
                          </td>
                          <td className="py-3 px-4">{r.expected_attendees} seats</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] ${badgeClass}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-slate-500 text-[11px]" title={r.remarks}>
                            {r.remarks || "—"}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                            {r.reviewed_by ? (
                              <span className="font-medium text-slate-700">{r.reviewed_by}</span>
                            ) : (
                              <span className="italic text-slate-400">Awaiting review</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Section: Associated NoSQL Event Document Viewer */}
        {history.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <FileJson className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Event Details (From MySQL Document Store)
                </h3>
                <p className="text-xs text-slate-500">
                  Retrieved via X DevAPI from the <code className="text-indigo-600 font-mono">event_details</code> collection using <code className="font-mono">request_id</code>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                Select Request:
              </label>
              <select
                value={selectedRequestId}
                onChange={(e) => {
                  setSelectedRequestId(e.target.value);
                  loadNosqlDoc(e.target.value);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 font-medium max-w-md focus:ring-2 focus:ring-indigo-500"
              >
                {history.map((h) => (
                  <option key={h.request_id} value={h.request_id}>
                    #{h.request_id} — {h.booking_date} ({h.event_name})
                  </option>
                ))}
              </select>
            </div>

            {nosqlLoading ? (
              <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-500">
                Loading document from MySQL Document Store...
              </div>
            ) : nosqlDoc ? (
              <div className="mt-2 p-4 bg-slate-900 text-sky-300 rounded-xl overflow-x-auto font-mono text-xs shadow-inner leading-relaxed">
                <pre>{JSON.stringify(nosqlDoc, null, 2)}</pre>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-500 italic">
                No NoSQL document found for Request #{selectedRequestId}.
              </div>
            )}
          </section>
        )}

        {/* Section: Cancel an Upcoming Booking (Triggers Automatic Freed Slot) */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Trash2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Cancel an Upcoming Booking</h3>
              <p className="text-xs text-slate-500">
                Cancelling fires database trigger <code className="text-rose-600 font-mono">trg_free_hall_on_cancel</code>, which frees the allocation and automatically publishes the slot to everyone.
              </p>
            </div>
          </div>

          {upcoming.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              No upcoming active or pending bookings to cancel for this student.
            </p>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="max-w-xl">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Booking To Cancel
                </label>
                <select
                  value={selectedUpcomingId}
                  onChange={(e) => setSelectedUpcomingId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-rose-500 font-medium"
                >
                  {upcoming.map((u) => (
                    <option key={u.request_id} value={u.request_id}>
                      #{u.request_id} • {u.booking_date} • {u.slot_label} • {u.hall_name} ({u.event_name}, {u.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling || !selectedUpcomingId}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{cancelling ? "Executing Cancellation..." : "Cancel This Booking"}</span>
                </button>
                <span className="text-xs text-slate-500">
                  Fires trigger <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono">trg_free_hall_on_cancel</code>
                </span>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
