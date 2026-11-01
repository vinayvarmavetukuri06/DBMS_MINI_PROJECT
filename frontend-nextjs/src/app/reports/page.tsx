"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import {
  FileBarChart2,
  Code2,
  Table as TableIcon,
  BarChart3,
  RefreshCw,
  Sparkles,
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

interface ReportItem {
  id: string;
  title: string;
  about: string;
}

export default function ReportsPage() {
  const [reportList, setReportList] = useState<ReportItem[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>("R1");
  const [currentReport, setCurrentReport] = useState<any>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = (id: string) => {
    setLoading(true);
    fetch(`/api/reports?id=${id}`)
      .then((res) => res.json())
      .then((data) => {
        setCurrentReport(data.report);
        setReportData(data.data || []);
        if (data.allReports) setReportList(data.allReports);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchReport(selectedReportId);
  }, [selectedReportId]);

  const chartX = currentReport?.chart ? currentReport.chart[0] : null;
  const chartY = currentReport?.chart ? currentReport.chart[1] : null;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <Header
        title="SQL Reports & Analytics"
        subtitle="12 comprehensive relational SQL reports with aggregation, nested subqueries, and trend analytics."
      />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Selector Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <FileBarChart2 className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Choose a Report</h2>
              <p className="text-xs text-slate-500">
                12 predefined, optimized queries from <code className="font-mono text-indigo-600">sql/04_reports.sql</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedReportId}
              onChange={(e) => setSelectedReportId(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 min-w-80 shadow-2xs"
            >
              {reportList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => fetchReport(selectedReportId)}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
              title="Refresh report"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {currentReport && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Report {currentReport.id}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {reportData.length} records returned
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">{currentReport.title}</h2>
              <p className="text-sm text-slate-600">{currentReport.about}</p>
            </div>

            {/* Interactive Recharts Chart */}
            {chartX && chartY && reportData.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    <span>Visual Analytics ({chartY} by {chartX})</span>
                  </h3>
                </div>

                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey={chartX}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        angle={-20}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          color: "#f8fafc",
                          borderRadius: "0.5rem",
                          border: "none",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey={chartY} fill="#4f46e5" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Data Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-2">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-slate-600" />
                  <span>Report Data Grid</span>
                </h3>
                <span className="text-xs text-slate-400">All columns from SQL result set</span>
              </div>

              {reportData.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No rows returned for this report.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                        {Object.keys(reportData[0]).map((key) => (
                          <th key={key} className="py-3 px-4 capitalize whitespace-nowrap">
                            {key.replace(/_/g, " ")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {reportData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          {Object.values(row).map((val: any, colIdx) => (
                            <td key={colIdx} className="py-2.5 px-4 whitespace-nowrap font-medium text-slate-800">
                              {val !== null && val !== undefined ? String(val) : "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Predefined SQL Showcase */}
            <details className="bg-slate-900 text-slate-100 rounded-2xl p-6 shadow-xs group" open>
              <summary className="cursor-pointer font-bold text-sm text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  <span>Predefined SQL Query</span>
                </span>
                <span className="text-xs text-slate-400 font-mono font-normal">
                  Read-only predefined query from sql/04_reports.sql
                </span>
              </summary>
              <pre className="mt-4 p-4 bg-slate-950 rounded-xl overflow-x-auto text-emerald-300 font-mono text-xs leading-relaxed border border-slate-800">
                {currentReport.sql};
              </pre>
            </details>
          </div>
        )}
      </main>
    </div>
  );
}
