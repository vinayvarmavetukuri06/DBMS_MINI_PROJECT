"use client";

import Link from "next/link";

export interface ScheduleCell {
  hall_id: number;
  hall_name: string;
  slot_id: number;
  slot_label: string;
  booking: string;
}

interface ScheduleGridProps {
  slots: { slot_id: number; slot_label: string }[];
  halls: { hall_id: number; hall_name: string; capacity?: number }[];
  cells: ScheduleCell[];
  dateStr?: string;
}

export default function ScheduleGrid({
  slots,
  halls,
  cells,
  dateStr,
}: ScheduleGridProps) {
  // Map lookup: `hall_id-slot_id` -> booking string
  const lookup: Record<string, string> = {};
  for (const c of cells) {
    lookup[`${c.hall_name}__${c.slot_label}`] = c.booking;
  }

  function getCellStyle(value: string) {
    if (!value || value === "FREE") {
      return {
        bg: "bg-emerald-50/80 text-emerald-800 border-emerald-200 hover:bg-emerald-100/90",
        label: "FREE",
        badge: "bg-emerald-100 text-emerald-800",
        isFree: true,
      };
    }
    if (value.startsWith("FREED")) {
      return {
        bg: "bg-teal-100/90 text-teal-950 border-teal-300 font-bold hover:bg-teal-200",
        label: value,
        badge: "bg-teal-200 text-teal-900",
        isFreed: true,
      };
    }
    if (value.endsWith("(awaiting approval)")) {
      return {
        bg: "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100",
        label: value,
        badge: "bg-amber-200 text-amber-900",
        isPending: true,
      };
    }
    if (value === "UNDER MAINTENANCE") {
      return {
        bg: "bg-slate-100 text-slate-500 border-slate-200 italic",
        label: value,
        badge: "bg-slate-200 text-slate-600",
        isMaintenance: true,
      };
    }
    return {
      bg: "bg-rose-50 text-rose-950 border-rose-200 font-medium hover:bg-rose-100",
      label: value,
      badge: "bg-rose-100 text-rose-800",
      isBooked: true,
    };
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="py-3 px-4 font-semibold text-slate-700 w-48">Seminar Hall</th>
              {slots.map((s) => (
                <th key={s.slot_id} className="py-3 px-4 font-semibold text-slate-700 text-center">
                  {s.slot_label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {halls.map((h) => (
              <tr key={h.hall_id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap bg-slate-50/30">
                  <div className="font-semibold">{h.hall_name}</div>
                  {h.capacity && (
                    <div className="text-[11px] text-slate-500">{h.capacity} seats</div>
                  )}
                </td>
                {slots.map((s) => {
                  const val = lookup[`${h.hall_name}__${s.slot_label}`] || "FREE";
                  const style = getCellStyle(val);
                  return (
                    <td key={s.slot_id} className="p-2 text-center align-middle">
                      <div
                        className={`py-2 px-3 rounded-lg border text-xs text-center transition-all flex flex-col items-center justify-center min-h-[46px] ${style.bg}`}
                      >
                        <span className="line-clamp-2 leading-tight">{style.label}</span>
                        {(style.isFree || style.isFreed) && dateStr && (
                          <Link
                            href={`/book?hallId=${h.hall_id}&slotId=${s.slot_id}&date=${dateStr}`}
                            className="mt-1 text-[10px] underline font-semibold opacity-80 hover:opacity-100"
                          >
                            Click to book
                          </Link>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center gap-4 text-[11px] text-slate-600">
        <span className="font-medium text-slate-700">Legend:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300"></span>
          <span>FREE (Available)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-teal-200 border border-teal-400"></span>
          <span>FREED - book now</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-300"></span>
          <span>Awaiting approval (PENDING)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-rose-100 border border-rose-300"></span>
          <span>BOOKED (ALLOCATED)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slate-200 border border-slate-300"></span>
          <span>UNDER MAINTENANCE</span>
        </span>
      </div>
    </div>
  );
}
