"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

export interface FreedSlot {
  release_id: number;
  booking_date: string;
  slot_id: number;
  slot_label: string;
  hall_id: number;
  hall_name: string;
  capacity: number;
  reason: string;
  freed_at: string;
}

interface FreedBoardProps {
  slots: FreedSlot[];
  emptyMessage?: string;
  compact?: boolean;
}

export default function FreedBoard({
  slots,
  emptyMessage = "No freed slots available right now.",
  compact = false,
}: FreedBoardProps) {
  if (!slots || slots.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-slate-500 text-xs">
        <p className="flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-slate-400" />
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-emerald-50 via-teal-50/40 to-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-xs max-w-full overflow-hidden">
      <div className="flex items-center gap-2 text-emerald-900 font-semibold text-xs mb-2.5">
        <span className="p-1 rounded-md bg-emerald-600 text-white shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
        </span>
        <div>
          <span>{slots.length} Freed Slot{slots.length > 1 ? "s" : ""} Available Again</span>
          <p className="text-[11px] text-emerald-700 font-normal">
            Previously cancelled/rejected bookings. Released automatically to everyone.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-emerald-200/80 bg-white shadow-xs max-w-full">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-emerald-100/60 text-emerald-950 font-semibold border-b border-emerald-200">
              <th className="py-2 px-2.5 whitespace-nowrap">Date</th>
              <th className="py-2 px-2.5 whitespace-nowrap">Slot</th>
              <th className="py-2 px-2.5 whitespace-nowrap">Hall</th>
              <th className="py-2 px-2.5 whitespace-nowrap">Seats</th>
              {!compact && <th className="py-2 px-2.5">Reason</th>}
              <th className="py-2 px-2.5 text-right whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-100 text-slate-700">
            {slots.map((s) => (
              <tr key={s.release_id} className="hover:bg-emerald-50/50 transition-colors">
                <td className="py-2 px-2.5 font-medium text-slate-900 whitespace-nowrap">
                  {s.booking_date}
                </td>
                <td className="py-2 px-2.5 whitespace-nowrap font-medium text-emerald-800">
                  {s.slot_label}
                </td>
                <td className="py-2 px-2.5 font-semibold text-slate-900 whitespace-nowrap">
                  {s.hall_name}
                </td>
                <td className="py-2 px-2.5 whitespace-nowrap">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                    {s.capacity}
                  </span>
                </td>
                {!compact && (
                  <td className="py-2 px-2.5 max-w-xs truncate text-slate-600 text-[11px]" title={s.reason}>
                    {s.reason}
                  </td>
                )}
                <td className="py-2 px-2.5 text-right whitespace-nowrap">
                  <Link
                    href={`/book?hallId=${s.hall_id}&slotId=${s.slot_id}&date=${s.booking_date}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium shadow-2xs transition-colors"
                  >
                    <span>Book</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
