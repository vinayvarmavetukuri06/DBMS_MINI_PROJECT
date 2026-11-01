"use client";

import { useEffect, useState } from "react";
import { Server, Database, CheckCircle2, Clock } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const [health, setHealth] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch(() => setHealth({ status: "error" }));

    const now = new Date();
    setCurrentDate(
      now.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    );
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-10 shadow-xs">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Date display */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{currentDate || "Loading date..."}</span>
        </div>

        {/* Database Status Pills */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
              health?.sql?.connected
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>SQL: {health?.sql?.connected ? "Online" : "Connecting..."}</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
              health?.nosql?.connected
                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>NoSQL: {health?.nosql?.connected ? "Online" : "Connecting..."}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
