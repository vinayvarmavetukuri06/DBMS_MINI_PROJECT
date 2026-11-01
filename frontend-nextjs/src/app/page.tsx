"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import FreedBoard, { FreedSlot } from "@/components/FreedBoard";
import ScheduleGrid, { ScheduleCell } from "@/components/ScheduleGrid";
import {
  Building2,
  CalendarCheck,
  CheckCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  metrics: {
    activeHalls: number;
    totalRequests: number;
    allocated: number;
    pending: number;
    next7Days: number;
    successRate: string;
  };
  freedSlots: FreedSlot[];
  todaySchedule: {
    slots: string[];
    halls: string[];
    cells: ScheduleCell[];
  };
  latestRequests: {
    request_id: number;
    booking_date: string;
    slot_label: string;
    hall_name: string;
    event_name: string;
    student_name: string;
    status: string;
    remarks: string;
    requested_at: string;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    fetch("/api/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch dashboard data");
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <Header
        title="Dashboard"
        subtitle="Real-time hall occupancy, approval status, and automated freed-slot notifications."
      />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Quick action bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Live MySQL Database View</span>
            <span>•</span>
            <span className="text-slate-700">9 Relational Tables &amp; 2 Document Collections</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium shadow-2xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/book"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <span>Request a Hall</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">
            Failed to load dashboard data: {error}
          </div>
        )}

        {/* 1. Real-Time Metric Cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Active Halls</span>
                <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                  <Building2 className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {data.metrics.activeHalls}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Available for bookings</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total Requests</span>
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <CalendarCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {data.metrics.totalRequests}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Logged in database</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Success Rate</span>
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-emerald-600 mt-2">
                {data.metrics.successRate}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{data.metrics.allocated} approved</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Waiting Approval</span>
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-amber-600 mt-2">
                {data.metrics.pending}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Held as PENDING</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs col-span-2 md:col-span-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Next 7 Days</span>
                <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                  <CheckCircle className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-purple-600 mt-2">
                {data.metrics.next7Days}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Confirmed slots</p>
            </div>
          </div>
        )}

        {/* 2. Publicly Visible Freed Slots */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Freed Slots</span>
              <span className="text-xs font-normal text-slate-500">
                (Visible to everyone • Trigger-published upon cancellation)
              </span>
            </h2>
          </div>
          {data && <FreedBoard slots={data.freedSlots} />}
        </section>

        {/* 3. Today's Hall Schedule */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Today&apos;s Hall Schedule</h2>
              <p className="text-xs text-slate-500">
                Live grid across all seminar halls and standard university time slots.
              </p>
            </div>
            <Link
              href="/availability"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>View other dates</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {data && (
            <ScheduleGrid
              slots={data.todaySchedule.slots.map((s, idx) => ({ slot_id: idx + 1, slot_label: s }))}
              halls={data.todaySchedule.halls.map((h, idx) => ({ hall_id: idx + 1, hall_name: h }))}
              cells={data.todaySchedule.cells}
            />
          )}
        </section>

        {/* 4. Recent Booking Requests */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Latest Booking Requests</h2>
            <span className="text-xs text-slate-400 font-medium">Joined from v_booking_details</span>
          </div>

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
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Remarks</th>
                    <th className="py-3 px-4">Requested At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {data?.latestRequests.map((r) => {
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
                        <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                          {r.hall_name}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate" title={r.event_name}>
                          {r.event_name}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">{r.student_name}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] ${badgeClass}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-500 text-[11px]" title={r.remarks}>
                          {r.remarks || "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                          {r.requested_at}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
