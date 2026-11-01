"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import ScheduleGrid, { ScheduleCell } from "@/components/ScheduleGrid";
import {
  Calendar,
  Search,
  CheckCircle2,
  Building,
  Sparkles,
  ArrowRight,
  Filter,
} from "lucide-react";
import Link from "next/link";

export default function AvailabilityPage() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split("T")[0];

  const [date, setDate] = useState<string>(defaultDate);
  const [slotId, setSlotId] = useState<string>("1");
  const [minCapacity, setMinCapacity] = useState<number>(50);

  const [slots, setSlots] = useState<any[]>([]);
  const [halls, setHalls] = useState<any[]>([]);
  const [gridCells, setGridCells] = useState<ScheduleCell[]>([]);
  const [freeHalls, setFreeHalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAvailability = () => {
    setLoading(true);
    fetch(`/api/availability?date=${date}&slotId=${slotId}&minCapacity=${minCapacity}`)
      .then((res) => res.json())
      .then((data) => {
        setSlots(data.slots || []);
        setHalls(data.halls || []);
        setGridCells(data.grid || []);
        setFreeHalls(data.freeHalls || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAvailability();
  }, [date, slotId, minCapacity]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <Header
        title="Hall Availability"
        subtitle="Explore seminar hall schedules, occupancy states, and filter free halls by capacity."
      />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Date Selector Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Show Schedule For Date</h2>
              <p className="text-xs text-slate-500">Pick any date to inspect the live allocation schedule</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => {
                const t = new Date();
                t.setDate(t.getDate() + 1);
                setDate(t.toISOString().split("T")[0]);
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Tomorrow
            </button>
          </div>
        </div>

        {/* Schedule Matrix */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Daily Schedule Matrix ({date})
              </h2>
              <p className="text-xs text-slate-500">
                Cross-joined across all seminar halls and university 2-hour slots. Different halls can be booked simultaneously.
              </p>
            </div>
          </div>

          <ScheduleGrid
            slots={slots}
            halls={halls}
            cells={gridCells}
            dateStr={date}
          />
        </section>

        {/* Find a Free Hall Filter Section */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Search className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Find a Free Hall Instantly</h2>
              <p className="text-xs text-slate-500">
                Filter by time slot and seat capacity to find halls that are free and ready to book.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Time Slot
              </label>
              <select
                value={slotId}
                onChange={(e) => setSlotId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                {slots.map((s) => (
                  <option key={s.slot_id} value={s.slot_id}>
                    {s.slot_label} ({s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Minimum Capacity (Seats)
              </label>
              <input
                type="number"
                value={minCapacity}
                onChange={(e) => setMinCapacity(parseInt(e.target.value, 10) || 1)}
                min="1"
                step="10"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Filter Result Table */}
          <div className="pt-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Matching Free Halls ({freeHalls.length} Available)
            </div>

            {freeHalls.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
                No active seminar hall fits that slot and capacity criteria for {date}. Try a smaller capacity or another time slot.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="py-3 px-4">Hall Name</th>
                      <th className="py-3 px-4">Block &amp; Location</th>
                      <th className="py-3 px-4">Capacity</th>
                      <th className="py-3 px-4">Amenities</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {freeHalls.map((h) => (
                      <tr key={h.hall_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {h.hall_name}
                        </td>
                        <td className="py-3 px-4">{h.block}</td>
                        <td className="py-3 px-4 font-medium text-emerald-700">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
                            {h.capacity} seats
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {h.has_ac ? (
                              <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-[10px] font-medium border border-sky-200">
                                Air Conditioned
                              </span>
                            ) : null}
                            {h.has_projector ? (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                                Projector
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/book?hallId=${h.hall_id}&slotId=${slotId}&date=${date}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                          >
                            <span>Book This Hall</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
