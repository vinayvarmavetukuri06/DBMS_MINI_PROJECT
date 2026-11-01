"use client";

import { useEffect, useState, Suspense } from "react";
import Header from "@/components/Header";
import FreedBoard, { FreedSlot } from "@/components/FreedBoard";
import {
  Calendar,
  Clock,
  Building,
  User,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Code2,
  FileJson,
  ArrowRight,
  Info,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

function BookHallForm() {

  const searchParams = useSearchParams();

  // Form State
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split("T")[0];

  const [date, setDate] = useState<string>(searchParams.get("date") || defaultDate);
  const [slotId, setSlotId] = useState<string>(searchParams.get("slotId") || "1");
  const [hallId, setHallId] = useState<string>(searchParams.get("hallId") || "1");
  const [srn, setSrn] = useState<string>("");
  const [facultyId, setFacultyId] = useState<string>("");
  const [eventName, setEventName] = useState<string>("");
  const [eventType, setEventType] = useState<string>("Seminar");
  const [attendees, setAttendees] = useState<number>(50);

  // NoSQL optional fields
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [speakerName, setSpeakerName] = useState<string>("");
  const [speakerOrg, setSpeakerOrg] = useState<string>("");
  const [tags, setTags] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Options & Availability
  const [lookups, setLookups] = useState<any>(null);
  const [freedSlots, setFreedSlots] = useState<FreedSlot[]>([]);
  const [availabilityGrid, setAvailabilityGrid] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Result state
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Load lookups and freed slots
  useEffect(() => {
    fetch("/api/lookups")
      .then((res) => res.json())
      .then((data) => {
        setLookups(data);
        if (data.students?.length && !srn) setSrn(data.students[0].srn);
        if (data.faculty?.length && !facultyId) setFacultyId(String(data.faculty[0].faculty_id));
        if (data.slots?.length && !searchParams.get("slotId")) setSlotId(String(data.slots[0].slot_id));
        if (data.halls?.length && !searchParams.get("hallId")) setHallId(String(data.halls[0].hall_id));
      });

    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((d) => setFreedSlots(d.freedSlots || []));
  }, []);

  // Update dynamic hall availability whenever date or slot changes
  useEffect(() => {
    if (!date) return;
    fetch(`/api/availability?date=${date}`)
      .then((res) => res.json())
      .then((data) => {
        setAvailabilityGrid(data.grid || []);
      })
      .catch(() => {});
  }, [date]);

  // Compute hall status for current date and slot
  const hallStatusMap = new Map<number, { status: "free" | "booked" | "maintenance" | "pending"; label: string }>();
  if (lookups?.halls && availabilityGrid) {
    const selectedSlot = lookups.slots?.find((s: any) => String(s.slot_id) === String(slotId));
    const slotLabel = selectedSlot?.slot_label;

    for (const h of lookups.halls) {
      if (!h.is_active) {
        hallStatusMap.set(h.hall_id, {
          status: "maintenance",
          label: `${h.hall_name} (${h.capacity} seats) — UNDER MAINTENANCE`,
        });
      } else {
        const cell = availabilityGrid.find(
          (c: any) => c.hall_id === h.hall_id && c.slot_label === slotLabel
        );
        const booking = cell?.booking || "FREE";
        if (booking === "FREE" || booking.startsWith("FREED")) {
          hallStatusMap.set(h.hall_id, {
            status: "free",
            label: `${h.hall_name} (${h.capacity} seats) — Free`,
          });
        } else if (booking.endsWith("(awaiting approval)")) {
          hallStatusMap.set(h.hall_id, {
            status: "pending",
            label: `${h.hall_name} (${h.capacity} seats) — Awaiting Approval`,
          });
        } else {
          hallStatusMap.set(h.hall_id, {
            status: "booked",
            label: `${h.hall_name} (${h.capacity} seats) — BOOKED (${booking})`,
          });
        }
      }
    }
  }

  // Auto-default to the first available free hall whenever slot or availability updates
  useEffect(() => {
    if (!lookups?.halls?.length || !availabilityGrid?.length) return;
    const selectedSlot = lookups.slots?.find(
      (s: any) => String(s.slot_id) === String(slotId)
    );
    const slotLabel = selectedSlot?.slot_label;
    const currentCell = availabilityGrid.find(
      (c: any) => String(c.hall_id) === String(hallId) && c.slot_label === slotLabel
    );
    const currentHallObj = lookups.halls.find(
      (h: any) => String(h.hall_id) === String(hallId)
    );

    const isCurrentFree =
      currentHallObj?.is_active &&
      (!currentCell || currentCell.booking === "FREE" || currentCell.booking.startsWith("FREED"));

    if (!isCurrentFree) {
      for (const h of lookups.halls) {
        if (!h.is_active) continue;
        const cell = availabilityGrid.find(
          (c: any) => c.hall_id === h.hall_id && c.slot_label === slotLabel
        );
        if (!cell || cell.booking === "FREE" || cell.booking.startsWith("FREED")) {
          setHallId(String(h.hall_id));
          break;
        }
      }
    }
  }, [availabilityGrid, slotId, lookups]);

  const handleEquipmentToggle = (item: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setBookingResult(null);

    if (!eventName.trim()) {
      setFormError("Please enter an event name.");
      return;
    }

    // Strict validation: Never allow an unavailable hall to be submitted
    const selectedSlot = lookups?.slots?.find(
      (s: any) => String(s.slot_id) === String(slotId)
    );
    const cell = availabilityGrid.find(
      (c: any) => String(c.hall_id) === String(hallId) && c.slot_label === selectedSlot?.slot_label
    );
    const selectedHallObj = lookups?.halls?.find(
      (h: any) => String(h.hall_id) === String(hallId)
    );

    if (selectedHallObj && !selectedHallObj.is_active) {
      setFormError(
        `Cannot book: ${selectedHallObj.hall_name} is currently under maintenance. Please select an active hall.`
      );
      return;
    }

    if (cell && cell.booking !== "FREE" && !cell.booking.startsWith("FREED")) {
      setFormError(
        `Cannot book: ${selectedHallObj?.hall_name || "Selected hall"} is not free for ${selectedSlot?.slot_label || "this slot"} (${cell.booking}). Please pick an available hall.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/bookings/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          srn,
          hallId: parseInt(hallId, 10),
          slotId: parseInt(slotId, 10),
          bookingDate: date,
          eventName: eventName.trim(),
          eventType,
          attendees,
          facultyId: parseInt(facultyId, 10),
          equipment: selectedEquipment,
          speakerName,
          speakerOrg,
          tags,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit booking request");
      }

      setBookingResult(data.result);

      // Refresh availability grid
      fetch(`/api/availability?date=${date}`)
        .then((r) => r.json())
        .then((d) => setAvailabilityGrid(d.grid || []));
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <Header
        title="Book a Seminar Hall"
        subtitle="Request a hall slot for college academic, club, or cultural events."
      />

      <main className="flex-1 p-8 max-w-5xl w-full mx-auto space-y-8">
        {/* Info Banner & Freed Slots Reminder */}
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-xs text-sky-900 flex items-start gap-3">
          <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sky-950">How the Booking Process Works</p>
            <p className="text-sky-800">
              Pick the date and time slot first. The seminar hall selector dynamically indicates whether each hall is free, already booked, or under maintenance for that exact slot. Different halls can be booked simultaneously. A successful submission calls the stored procedure{" "}
              <code className="bg-sky-100 text-sky-900 px-1 py-0.5 rounded font-mono">request_booking</code>, which atomic-locks the hall as <strong>PENDING</strong> until the assigned hall coordinator reviews it.
            </p>
          </div>
        </div>

        {freedSlots.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Freed Slots (Cancelled Bookings Available Again)
            </h3>
            <FreedBoard slots={freedSlots} compact={true} />
          </div>
        )}

        {/* Feedback / Result Card */}
        {bookingResult && (
          <div
            className={`p-6 rounded-xl border shadow-sm space-y-4 ${
              bookingResult.status === "PENDING"
                ? "bg-amber-50/90 border-amber-300 text-amber-950"
                : bookingResult.status === "ALLOCATED"
                ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                : "bg-rose-50 border-rose-300 text-rose-950"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {bookingResult.status === "REJECTED" ? (
                  <AlertTriangle className="w-7 h-7 text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                )}
                <div>
                  <h3 className="text-lg font-bold">
                    Request #{bookingResult.requestId}: {bookingResult.status}
                  </h3>
                  <p className="text-sm font-medium mt-0.5">{bookingResult.message}</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/80 border shadow-2xs">
                {bookingResult.status}
              </span>
            </div>

            {/* Smart Alternatives if Rejected */}
            {bookingResult.status === "REJECTED" && (
              <div className="bg-white/90 p-4 rounded-lg border border-rose-200/80 text-xs space-y-3">
                <p className="font-semibold text-rose-900">Recommended Alternative Options:</p>

                {bookingResult.alternatives?.otherHalls?.length > 0 ? (
                  <div>
                    <span className="text-slate-600 font-medium">
                      Other halls free on {bookingResult.bookingDate} that fit {bookingResult.attendees} attendees:
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {bookingResult.alternatives.otherHalls.map((h: any) => (
                        <button
                          key={h.hall_id}
                          type="button"
                          onClick={() => setHallId(String(h.hall_id))}
                          className="px-2.5 py-1 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded font-medium hover:bg-emerald-100 flex items-center gap-1"
                        >
                          <span>{h.hall_name}</span>
                          <span className="text-[10px] text-emerald-600">({h.capacity} seats)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500">No other halls fitting {bookingResult.attendees} seats are free for that slot.</p>
                )}

                {bookingResult.alternatives?.freeSlotsInSameHall?.length > 0 && (
                  <div>
                    <span className="text-slate-600 font-medium">
                      Free slots in {bookingResult.hallName} on the same day:
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {bookingResult.alternatives.freeSlotsInSameHall.map((s: any) => (
                        <button
                          key={s.slot_id}
                          type="button"
                          onClick={() => setSlotId(String(s.slot_id))}
                          className="px-2.5 py-1 bg-sky-50 border border-sky-300 text-sky-800 rounded font-medium hover:bg-sky-100"
                        >
                          {s.slot_label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SQL Execution Card */}
            <details className="text-xs group">
              <summary className="cursor-pointer font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                <span>View Stored Procedure SQL executed</span>
              </summary>
              <pre className="mt-2 p-3 bg-slate-900 text-emerald-300 rounded-lg overflow-x-auto font-mono text-[11px] leading-relaxed">
                {bookingResult.executedSql}
              </pre>
            </details>

            {/* NoSQL Document Saved Card */}
            {bookingResult.savedNoSqlDoc && (
              <details className="text-xs group" open={bookingResult.status !== "REJECTED"}>
                <summary className="cursor-pointer font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5">
                  <FileJson className="w-3.5 h-3.5" />
                  <span>View NoSQL Document persisted in event_details</span>
                </summary>
                <pre className="mt-2 p-3 bg-slate-900 text-sky-300 rounded-lg overflow-x-auto font-mono text-[11px] leading-relaxed">
                  {JSON.stringify(bookingResult.savedNoSqlDoc, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {formError && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-medium">
            {formError}
          </div>
        )}

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-600" />
            <span>Event &amp; Hall Information</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Booking Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Time Slot Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Time Slot (Standard 2-Hour Window) *
              </label>
              <select
                value={slotId}
                onChange={(e) => setSlotId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {lookups?.slots?.map((s: any) => (
                  <option key={s.slot_id} value={s.slot_id}>
                    {s.slot_label} ({s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)})
                  </option>
                ))}
              </select>
            </div>

            {/* Seminar Hall Selection */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Seminar Hall (Shows Live Availability For Selected Slot) *
              </label>
              <select
                value={hallId}
                onChange={(e) => setHallId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
              >
                {lookups?.halls?.map((h: any) => {
                  const info = hallStatusMap.get(h.hall_id);
                  const isMaintenance = info?.status === "maintenance";
                  return (
                    <option
                      key={h.hall_id}
                      value={h.hall_id}
                      disabled={isMaintenance}
                      className={
                        info?.status === "free"
                          ? "text-emerald-700 font-semibold"
                          : info?.status === "booked"
                          ? "text-rose-600"
                          : info?.status === "pending"
                          ? "text-amber-700"
                          : "text-slate-400"
                      }
                    >
                      {info ? info.label : `${h.hall_name} (${h.capacity} seats)`}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Student SRN Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Student Requestor (SRN) *
              </label>
              <select
                value={srn}
                onChange={(e) => setSrn(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {lookups?.students?.map((s: any) => (
                  <option key={s.srn} value={s.srn}>
                    {s.srn} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Faculty Coordinator Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Faculty Coordinator *
              </label>
              <select
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {lookups?.faculty?.map((f: any) => (
                  <option key={f.faculty_id} value={f.faculty_id}>
                    {f.name} ({f.dept_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Event Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Event Name / Title *
              </label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. Hands-on Machine Learning Workshop"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Event Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Event Category *
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {lookups?.eventTypes?.map((t: string) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Expected Attendees */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Expected Attendees *
              </label>
              <input
                type="number"
                value={attendees}
                onChange={(e) => setAttendees(parseInt(e.target.value, 10) || 1)}
                min="1"
                step="5"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Section: Optional NoSQL Event Details */}
          <div className="pt-6 border-t border-slate-200 space-y-5">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-indigo-50 text-indigo-600">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Extra Event Details (Stored in MySQL Document Store)
                </h3>
                <p className="text-xs text-slate-500">
                  Saved directly as schemaless JSON in the <code className="text-indigo-600 font-mono">event_details</code> collection over X DevAPI.
                </p>
              </div>
            </div>

            {/* Equipment Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Equipment Needed (Multi-select)
              </label>
              <div className="flex flex-wrap gap-2">
                {lookups?.equipmentList?.map((eq: string) => {
                  const isSelected = selectedEquipment.includes(eq);
                  return (
                    <button
                      key={eq}
                      type="button"
                      onClick={() => handleEquipmentToggle(eq)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {eq}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Speaker / Chief Guest (Optional)
                </label>
                <input
                  type="text"
                  value={speakerName}
                  onChange={(e) => setSpeakerName(e.target.value)}
                  placeholder="e.g. Dr. Jane Smith"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Speaker&apos;s Organisation
                </label>
                <input
                  type="text"
                  value={speakerOrg}
                  onChange={(e) => setSpeakerOrg(e.target.value)}
                  placeholder="e.g. Google DeepMind / IISc"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. ai, hackathon, beginners"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Staff Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={1}
                  placeholder="e.g. Keep extra chairs ready outside the hall"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <span>Executing Stored Procedure...</span>
              ) : (
                <>
                  <span>Submit Booking Request</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function BookHallPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex flex-col bg-slate-50 min-h-screen p-12 text-center text-slate-500">
          Loading booking form...
        </div>
      }
    >
      <BookHallForm />
    </Suspense>
  );
}


