"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarPlus,
  CalendarDays,
  UserCheck,
  ClipboardList,
  FileBarChart2,
  Database,
  ShieldAlert,
  GraduationCap,
  Sparkles,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/book", label: "Book a Hall", icon: CalendarPlus },
  { href: "/availability", label: "Hall Availability", icon: CalendarDays },
  { href: "/my-bookings", label: "My Bookings", icon: ClipboardList },
  { href: "/coordinator", label: "Coordinator Approval", icon: UserCheck },
  { href: "/reports", label: "SQL Reports", icon: FileBarChart2 },
  { href: "/nosql", label: "NoSQL Documents", icon: Database },
  { href: "/admin", label: "Admin Dashboard", icon: ShieldAlert },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight leading-tight text-white">
            Seminar Booking
          </h1>
          <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
            DBMS Project
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
          Navigation
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Database Technology Badges */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-300">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Storage Engines
          </span>
          <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded">
            Connected
          </span>
        </div>
        <div className="bg-slate-900/90 rounded-md p-2 border border-slate-800 text-[11px] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">RDBMS:</span>
            <span className="text-slate-200 font-mono text-[10px]">MySQL 8.0 (3306)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">NoSQL:</span>
            <span className="text-slate-200 font-mono text-[10px]">X DevAPI (33060)</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
