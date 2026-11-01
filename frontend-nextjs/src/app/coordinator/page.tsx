"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Building,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

export default function CoordinatorPage() {
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [selectedCoordId, setSelectedCoordId] = useState<string>("1");
  const [hallsInCharge, setHallsInCharge] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [recentDecisions, setRecentDecisions] = useState<any[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [rejectReason, setRejectReason] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Load coordinators list
  useEffect(() => {
    fetch("/api/lookups")
      .then((res) => res.json())
      .then((data) => {
        setCoordinators(data.coordinators || []);
        if (data.coordinators?.length) {
          setSelectedCoordId(String(data.coordinators[0].coordinator_id));
        }
      });
  }, []);

  // Fetch coordinator pending and decisions
  const loadCoordinatorData = (coordId: string) => {
    if (!coordId) return;
    setLoading(true);
    fetch(`/api/coordinator/pending?coordinatorId=${coordId}`)
      .then((res) => res.json())
      .then((data) => {
        setHallsInCharge(data.hallsInCharge || []);
        setPendingRequests(data.pendingRequests || []);
        setRecentDecisions(data.recentDecisions || []);
        if (data.pendingRequests?.length) {
          setSelectedRequestId(String(data.pendingRequests[0].request_id));
        } else {
          setSelectedRequestId("");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadCoordinatorData(selectedCoordId);
  }, [selectedCoordId]);

  const handleReview = async (approve: boolean) => {
    if (!selectedRequestId) return;
    setFeedback(null);

    if (!approve && !rejectReason.trim()) {
      setFeedback({
        type: "error",
        message: "Please type a rejection reason before rejecting.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/coordinator/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: parseInt(selectedRequestId, 10),
          coordinatorId: parseInt(selectedCoordId, 10),
          approve,
          reason: rejectReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process review");
      }

      setFeedback({ type: "success", message: data.message });
      setRejectReason("");
      loadCoordinatorData(selectedCoordId);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Review failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <Header
        title="Seminar Hall Coordinator"
        subtitle="Manage hall booking requests, enforce faculty verification, and approve or reject holds."
      />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Info Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-900">Coordinator Workflow &amp; Triggers</p>
            <p className="text-amber-800">
              Every request that passes database capacity and timing rules holds the hall as <strong>PENDING</strong>. Only the coordinator in charge of that hall may decide. Approval converts the request to <strong>ALLOCATED</strong>. A rejection releases the hold and fires trigger <code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-mono">trg_free_hall_on_cancel</code>, automatically publishing the slot in <code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-mono">freed_slots</code> so other students can immediately take it.
            </p>
          </div>
        </div>

        {/* Coordinator Selector Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <UserCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Seminar Hall Coordinator</h2>
              <p className="text-xs text-slate-500">
                Halls in charge:{" "}
                <span className="font-semibold text-indigo-700">
                  {hallsInCharge.map((h) => h.hall_name).join(", ") || "None"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedCoordId}
              onChange={(e) => setSelectedCoordId(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 min-w-64"
            >
              {coordinators.map((c) => (
                <option key={c.coordinator_id} value={c.coordinator_id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
            <button
              onClick={() => loadCoordinatorData(selectedCoordId)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
              title="Refresh coordinator queue"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs font-medium flex items-start gap-2.5 shadow-xs ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                : "bg-rose-50 border-rose-300 text-rose-950"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">
                {feedback.type === "success" ? "Decision Processed" : "Action Blocked"}
              </p>
              <p className="mt-0.5 leading-relaxed">{feedback.message}</p>
            </div>
          </div>
        )}

        {/* Pending Requests Queue */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Waiting For Your Approval</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                {pendingRequests.length} Pending
              </span>
            </h2>
            <span className="text-xs text-slate-400">Filtered by your assigned seminar halls</span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
              <CheckCircle2 className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
              <span>No pending requests requiring your review right now. All caught up!</span>
            </div>
          ) : (
            <>
              {/* Queue Table */}
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
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Attendees</th>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Faculty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {pendingRequests.map((r) => (
                        <tr
                          key={r.request_id}
                          className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                            String(r.request_id) === String(selectedRequestId)
                              ? "bg-indigo-50/50"
                              : ""
                          }`}
                          onClick={() => setSelectedRequestId(String(r.request_id))}
                        >
                          <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                            #{r.request_id}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                            {r.booking_date}
                          </td>
                          <td className="py-3 px-4 text-indigo-700 font-medium whitespace-nowrap">
                            {r.slot_label}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                            {r.hall_name}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate" title={r.event_name}>
                            {r.event_name}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">{r.event_type}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {r.expected_attendees} / {r.capacity} seats
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">{r.student_name}</td>
                          <td className="py-3 px-4 whitespace-nowrap">{r.faculty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Decision Action Form */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Take Action on Request #{selectedRequestId}</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Selected Request
                    </label>
                    <select
                      value={selectedRequestId}
                      onChange={(e) => setSelectedRequestId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      {pendingRequests.map((r) => (
                        <option key={r.request_id} value={r.request_id}>
                          #{r.request_id} • {r.booking_date} • {r.slot_label} • {r.hall_name} ({r.event_name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Rejection Reason (Mandatory when declining)
                    </label>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. Hall reserved for university placement drive"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleReview(true)}
                    disabled={submitting || !selectedRequestId}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Request (Allocate)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReview(false)}
                    disabled={submitting || !selectedRequestId}
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Request (Frees Slot)</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Coordinator's Recent Decisions */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Your Recent Decisions</h2>
            <span className="text-xs text-slate-400">Last 10 reviews by this coordinator</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                    <th className="py-3 px-4">Req #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Hall</th>
                    <th className="py-3 px-4">Event Name</th>
                    <th className="py-3 px-4">Decision</th>
                    <th className="py-3 px-4">Remarks</th>
                    <th className="py-3 px-4">Reviewed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {recentDecisions.map((r) => (
                    <tr key={r.request_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        #{r.request_id}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                        {r.booking_date}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {r.hall_name}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate" title={r.event_name}>
                        {r.event_name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            r.status === "ALLOCATED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-500 text-[11px]" title={r.remarks}>
                        {r.remarks || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                        {r.reviewed_at}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
