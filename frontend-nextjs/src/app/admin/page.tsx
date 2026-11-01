"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import {
  ShieldAlert,
  Table as TableIcon,
  UserPlus,
  Building2,
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Info,
  Terminal,
  Trash2,
} from "lucide-react";

const RELATIONAL_TABLES = [
  { id: "departments", name: "departments (Departments)" },
  { id: "students", name: "students (Student Profiles)" },
  { id: "faculty", name: "faculty (Faculty Advisors)" },
  { id: "hall_coordinators", name: "hall_coordinators (In-charge Coordinators)" },
  { id: "seminar_halls", name: "seminar_halls (Physical Halls & Capacities)" },
  { id: "time_slots", name: "time_slots (Operational Slots & Rules)" },
  { id: "booking_requests", name: "booking_requests (All Booking Holds & Reviews)" },
  { id: "allocations", name: "allocations (Active Booked Hall Locks)" },
  { id: "freed_slots", name: "freed_slots (Trigger-Freed Public Slots)" },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<
    "tables" | "student" | "hall" | "maintenance" | "slots"
  >("tables");

  // Lookups cache for select dropdowns
  const [departments, setDepartments] = useState<any[]>([]);
  const [coordinators, setCoordinators] = useState<any[]>([]);

  // Tab 1: Table viewer state
  const [selectedTable, setSelectedTable] = useState("students");
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(false);

  // Tab 2: Add student state
  const [studentSrn, setStudentSrn] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentSemester, setStudentSemester] = useState(5);
  const [studentDeptId, setStudentDeptId] = useState("");

  // Tab 3: Add hall state
  const [hallName, setHallName] = useState("");
  const [hallBlock, setHallBlock] = useState("");
  const [hallFloor, setHallFloor] = useState(1);
  const [hallCapacity, setHallCapacity] = useState(100);
  const [hasProjector, setHasProjector] = useState(true);
  const [hasAc, setHasAc] = useState(false);
  const [hallCoordId, setHallCoordId] = useState("");

  // Tab 4: Maintenance state
  const [maintenanceHalls, setMaintenanceHalls] = useState<any[]>([]);

  // Tab 5: Slot constraints state
  const [slotsList, setSlotsList] = useState<any[]>([]);
  const [slotStartTime, setSlotStartTime] = useState("15:00");
  const [slotEndTime, setSlotEndTime] = useState("17:00");
  const [slotLabel, setSlotLabel] = useState("");

  // Feedback states
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
    details?: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load initial lookups
  useEffect(() => {
    fetch("/api/lookups")
      .then((res) => res.json())
      .then((data) => {
        setDepartments(data.departments || []);
        setCoordinators(data.coordinators || []);
        if (data.departments?.length) {
          setStudentDeptId(String(data.departments[0].dept_id));
        }
        if (data.coordinators?.length) {
          setHallCoordId(String(data.coordinators[0].coordinator_id));
        }
      });
  }, []);

  // Fetch table data
  const fetchTable = (tableName: string) => {
    setTableLoading(true);
    fetch(`/api/admin/tables?table=${tableName}`)
      .then((res) => res.json())
      .then((data) => {
        setTableData(data.rows || []);
        setTableLoading(false);
      })
      .catch(() => setTableLoading(false));
  };

  // Fetch maintenance list
  const fetchMaintenance = () => {
    fetch("/api/admin/maintenance")
      .then((res) => res.json())
      .then((data) => setMaintenanceHalls(data.halls || []));
  };

  // Fetch slots list
  const fetchSlots = () => {
    fetch("/api/admin/slot")
      .then((res) => res.json())
      .then((data) => setSlotsList(data.slots || []));
  };

  useEffect(() => {
    if (activeTab === "tables") fetchTable(selectedTable);
    if (activeTab === "maintenance") fetchMaintenance();
    if (activeTab === "slots") fetchSlots();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "tables") fetchTable(selectedTable);
  }, [selectedTable]);

  // Handle Add Student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          srn: studentSrn,
          name: studentName,
          email: studentEmail,
          phone: studentPhone,
          semester: studentSemester,
          deptId: studentDeptId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add student");
      }

      setFeedback({ type: "success", message: data.message });
      setStudentSrn("");
      setStudentName("");
      setStudentEmail("");
      setStudentPhone("");
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Add Hall
  const handleAddHall = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/hall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hallName,
          block: hallBlock,
          floorNo: hallFloor,
          capacity: hallCapacity,
          hasProjector,
          hasAc,
          coordinatorId: hallCoordId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add seminar hall");
      }

      setFeedback({ type: "success", message: data.message });
      setHallName("");
      setHallBlock("");
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Toggle Maintenance
  const handleToggleMaintenance = async (hallId: number) => {
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hallId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Toggle failed");
      setFeedback({ type: "success", message: data.message });
      fetchMaintenance();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  // Handle Test Add Slot
  const handleAddSlot = async (start: string, end: string, label?: string) => {
    setFeedback(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: start,
          endTime: end,
          customLabel: label,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "error",
          message: "Rejected by Database Rule / Trigger",
          details: data.error,
        });
      } else {
        setFeedback({ type: "success", message: data.message });
        fetchSlots();
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Slot
  const handleDeleteSlot = async (slotId: number) => {
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/slot?slotId=${slotId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFeedback({ type: "success", message: data.message });
      fetchSlots();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <Header
        title="Admin Control Center"
        subtitle="Inspect relational tables, manage infrastructure, configure student records, and test database constraints."
      />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => {
                setActiveTab("tables");
                setFeedback(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-colors ${
                activeTab === "tables"
                  ? "border-indigo-600 text-indigo-700 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>Relational Tables</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("student");
                setFeedback(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-colors ${
                activeTab === "student"
                  ? "border-indigo-600 text-indigo-700 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Student</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("hall");
                setFeedback(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-colors ${
                activeTab === "hall"
                  ? "border-indigo-600 text-indigo-700 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Add Seminar Hall</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("maintenance");
                setFeedback(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-colors ${
                activeTab === "maintenance"
                  ? "border-indigo-600 text-indigo-700 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Hall Maintenance</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("slots");
                setFeedback(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-colors ${
                activeTab === "slots"
                  ? "border-indigo-600 text-indigo-700 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Time-Slot Constraints &amp; Triggers</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs font-medium flex items-start gap-3 shadow-xs ${
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
            <div className="space-y-1">
              <p className="font-bold">{feedback.message}</p>
              {feedback.details && (
                <p className="font-mono text-[11px] bg-rose-100/70 text-rose-900 p-2 rounded-lg">
                  {feedback.details}
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: Relational Table Viewer */}
        {activeTab === "tables" && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Direct Relational Table Explorer
                </h3>
                <p className="text-xs text-slate-500">
                  Inspect raw rows from any of the 9 MySQL tables (parameterized server-side queries).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 min-w-64"
                >
                  {RELATIONAL_TABLES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => fetchTable(selectedTable)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                  title="Refresh table rows"
                >
                  <RefreshCw className={`w-4 h-4 ${tableLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Table: <code className="font-mono text-indigo-700">{selectedTable}</code> (
                  {tableData.length} records shown)
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  SELECT * FROM {selectedTable} LIMIT 100
                </span>
              </div>

              {tableData.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No records currently exist in this table.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold z-10">
                      <tr>
                        {Object.keys(tableData[0]).map((col) => (
                          <th key={col} className="py-2.5 px-3 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 font-mono text-[11px]">
                      {tableData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          {Object.values(row).map((val: any, colIdx) => (
                            <td key={colIdx} className="py-2 px-3 whitespace-nowrap">
                              {val !== null && val !== undefined ? String(val) : (
                                <span className="text-slate-300 italic">NULL</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Add Student */}
        {activeTab === "student" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs max-w-2xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <span>Enroll New Student</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Enforces relational integrity: Department ID foreign key, unique SRN, unique Email, and semester check constraint (1-8).
              </p>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  SRN (e.g. PES1UG24CS999) *
                </label>
                <input
                  type="text"
                  value={studentSrn}
                  onChange={(e) => setStudentSrn(e.target.value)}
                  placeholder="PES1UG24CS999"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Vinay Varma"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="student@pes.edu"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone (10 digits)
                  </label>
                  <input
                    type="tel"
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    placeholder="9876543210"
                    maxLength={10}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Semester (CHECK: 1–8) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={studentSemester}
                    onChange={(e) => setStudentSemester(parseInt(e.target.value, 10))}
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department (FK) *
                  </label>
                  <select
                    value={studentDeptId}
                    onChange={(e) => setStudentDeptId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    {departments.map((d) => (
                      <option key={d.dept_id} value={d.dept_id}>
                        {d.dept_code} — {d.dept_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors disabled:opacity-50 mt-2"
              >
                {submitting ? "Enrolling..." : "Enroll Student"}
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: Add Hall */}
        {activeTab === "hall" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs max-w-2xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <span>Register New Seminar Hall</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Inserts into <code className="font-mono text-indigo-600">seminar_halls</code> with capacity checks, facility flags, and hall coordinator assignment.
              </p>
            </div>

            <form onSubmit={handleAddHall} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hall Name (Unique) *
                </label>
                <input
                  type="text"
                  value={hallName}
                  onChange={(e) => setHallName(e.target.value)}
                  placeholder="e.g. Turing Auditorium"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Campus Block *
                  </label>
                  <input
                    type="text"
                    value={hallBlock}
                    onChange={(e) => setHallBlock(e.target.value)}
                    placeholder="B-Block / Tech Park"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Floor Number
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={hallFloor}
                    onChange={(e) => setHallFloor(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Capacity (Seats) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={hallCapacity}
                    onChange={(e) => setHallCapacity(parseInt(e.target.value, 10))}
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Coordinator (FK) *
                </label>
                <select
                  value={hallCoordId}
                  onChange={(e) => setHallCoordId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  {coordinators.map((c) => (
                    <option key={c.coordinator_id} value={c.coordinator_id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={hasProjector}
                    onChange={(e) => setHasProjector(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Has Projector Installed</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={hasAc}
                    onChange={(e) => setHasAc(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Air Conditioned</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors disabled:opacity-50 mt-2"
              >
                {submitting ? "Registering..." : "Register Seminar Hall"}
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: Hall Maintenance Toggle */}
        {activeTab === "maintenance" && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Maintenance Logic in Stored Procedure</p>
                <p className="text-amber-800 mt-0.5">
                  When a hall is marked <strong>Under Maintenance</strong> (<code className="font-mono bg-amber-100 text-amber-900 px-1 py-0.5 rounded">is_active = FALSE</code>), the stored procedure <code className="font-mono bg-amber-100 text-amber-900 px-1 py-0.5 rounded">request_booking</code> automatically rejects any new booking attempts with: <em>&quot;Hall is under maintenance&quot;</em>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {maintenanceHalls.map((h) => (
                <div
                  key={h.hall_id}
                  className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                    h.is_active
                      ? "border-slate-200 hover:border-slate-300"
                      : "border-amber-300 bg-amber-50/20"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-slate-400">
                        #{h.hall_id}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          h.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-100 text-amber-900 border border-amber-300"
                        }`}
                      >
                        {h.is_active ? "Available" : "Under Maintenance"}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900">{h.hall_name}</h4>
                    <p className="text-xs text-slate-500">
                      {h.block} • Floor {h.floor_no} • {h.capacity} seats
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Coordinator: <strong>{h.coordinator_name}</strong>
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 mt-4">
                    <button
                      onClick={() => handleToggleMaintenance(h.hall_id)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-semibold shadow-2xs transition-colors ${
                        h.is_active
                          ? "bg-amber-100 hover:bg-amber-200 text-amber-900"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      {h.is_active ? "Mark Under Maintenance" : "Mark Available"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: Time Slot Constraints & Trigger Testing */}
        {activeTab === "slots" && (
          <div className="space-y-8">
            {/* Rule Explanations Banner */}
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <ShieldAlert className="w-5 h-5" />
                <span>Enforced Database Rules on time_slots</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <p className="font-semibold text-emerald-400 font-mono">1. chk_slot_time</p>
                  <p className="text-slate-300">
                    <code className="font-mono text-sky-300">CHECK (end_time &gt; start_time)</code> — End time cannot be earlier than or equal to start time.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <p className="font-semibold text-emerald-400 font-mono">2. chk_slot_hours</p>
                  <p className="text-slate-300">
                    <code className="font-mono text-sky-300">CHECK (start_time &gt;= &apos;09:00:00&apos; AND end_time &lt;= &apos;16:00:00&apos;)</code> — Operating hours between 9 AM and 4 PM only.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <p className="font-semibold text-emerald-400 font-mono">3. chk_slot_max_2h</p>
                  <p className="text-slate-300">
                    <code className="font-mono text-sky-300">CHECK (TIMEDIFF(end_time, start_time) &lt;= &apos;02:00:00&apos;)</code> — A single slot booking lasts at most 2 hours.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <p className="font-semibold text-amber-400 font-mono">4. trg_slot_gap_insert (Trigger)</p>
                  <p className="text-slate-300">
                    <code className="font-mono text-amber-300">BEFORE INSERT trigger</code> — Enforces minimum 30 minute gap between slots for hall preparation.
                  </p>
                </div>
              </div>
            </div>

            {/* Current Slots Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Current Database Time Slots ({slotsList.length})
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  SELECT * FROM time_slots ORDER BY start_time
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="py-2.5 px-4">Slot ID</th>
                      <th className="py-2.5 px-4">Label</th>
                      <th className="py-2.5 px-4">Start Time</th>
                      <th className="py-2.5 px-4">End Time</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-mono text-xs">
                    {slotsList.map((s) => (
                      <tr key={s.slot_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-slate-900">#{s.slot_id}</td>
                        <td className="py-2.5 px-4 font-semibold text-indigo-700">{s.slot_label}</td>
                        <td className="py-2.5 px-4">{s.start_time}</td>
                        <td className="py-2.5 px-4">{s.end_time}</td>
                        <td className="py-2.5 px-4 text-right">
                          {s.slot_id > 3 ? (
                            <button
                              onClick={() => handleDeleteSlot(s.slot_id)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-sans"
                            >
                              Delete
                            </button>
                          ) : (
                            <span className="text-slate-400 font-sans text-[11px] italic">
                              Default System Slot
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Test Presets (Testing Constraints) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Quick Constraint &amp; Trigger Violation Tests</span>
              </h3>
              <p className="text-xs text-slate-500">
                Click any test button to fire an INSERT statement directly into the database and observe the exact MySQL engine or trigger error:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => handleAddSlot("14:00", "13:00", "Reverse Slot")}
                  disabled={submitting}
                  className="p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-left space-y-1 transition-colors"
                >
                  <p className="text-xs font-bold text-rose-900">Test chk_slot_time</p>
                  <p className="text-[11px] text-rose-700">14:00 to 13:00 (End &lt; Start)</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddSlot("15:00", "17:00", "Late Slot")}
                  disabled={submitting}
                  className="p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-left space-y-1 transition-colors"
                >
                  <p className="text-xs font-bold text-rose-900">Test chk_slot_hours</p>
                  <p className="text-[11px] text-rose-700">15:00 to 17:00 (Ends past 16:00)</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddSlot("09:00", "12:00", "3-Hour Slot")}
                  disabled={submitting}
                  className="p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-left space-y-1 transition-colors"
                >
                  <p className="text-xs font-bold text-rose-900">Test chk_slot_max_2h</p>
                  <p className="text-[11px] text-rose-700">09:00 to 12:00 (Exceeds 2 hrs)</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddSlot("11:00", "12:00", "No Gap Slot")}
                  disabled={submitting}
                  className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-left space-y-1 transition-colors"
                >
                  <p className="text-xs font-bold text-amber-900">Test trg_slot_gap</p>
                  <p className="text-[11px] text-amber-800">11:00 to 12:00 (Zero min gap)</p>
                </button>
              </div>
            </div>

            {/* Custom Slot Form */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Custom Slot Insertion Tester
              </h3>
              <p className="text-xs text-slate-500">
                Enter arbitrary start and end times to test valid slot insertions or edge-case constraints.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Time (HH:MM)
                  </label>
                  <input
                    type="time"
                    value={slotStartTime}
                    onChange={(e) => setSlotStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Time (HH:MM)
                  </label>
                  <input
                    type="time"
                    value={slotEndTime}
                    onChange={(e) => setSlotEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Optional Custom Label
                  </label>
                  <input
                    type="text"
                    value={slotLabel}
                    onChange={(e) => setSlotLabel(e.target.value)}
                    placeholder="e.g. Special Session"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddSlot(slotStartTime, slotEndTime, slotLabel)}
                disabled={submitting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                {submitting ? "Testing..." : "Execute INSERT time_slots"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
