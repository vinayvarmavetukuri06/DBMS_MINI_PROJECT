"""University Seminar Hall Booking System - Streamlit front end.

Run:  streamlit run app.py
"""
from datetime import date, datetime, timedelta
from pathlib import Path

import altair as alt
import mysql.connector
import mysqlx
import pandas as pd
import streamlit as st

import db
import nosql

st.set_page_config(page_title="Seminar Hall Booking", layout="wide")

EVENT_TYPES = ["Seminar", "Workshop", "Guest Lecture", "Club Event", "Hackathon", "Cultural", "Other"]
EQUIPMENT = ["Projector", "Microphone", "Speakers", "Laptop", "Whiteboard", "Video recording", "Extra chairs"]
TABLES = ["departments", "students", "faculty", "hall_coordinators", "seminar_halls",
          "time_slots", "booking_requests", "allocations", "freed_slots"]
REPORTS_FILE = Path(__file__).parent / "sql" / "04_reports.sql"


# ---------------------------------------------------------------- lookups
def student_options():
    df = db.fetch_df("SELECT srn, name FROM students ORDER BY srn")
    return dict(zip(df.srn.tolist(), (df.srn + " - " + df.name).tolist()))


def faculty_options():
    df = db.fetch_df("""
        SELECT f.faculty_id, f.name, d.dept_code
        FROM faculty f JOIN departments d ON d.dept_id = f.dept_id
        ORDER BY d.dept_code, f.name""")
    return dict(zip(df.faculty_id.tolist(), (df.name + " (" + df.dept_code + ")").tolist()))


def slot_options():
    df = db.fetch_df("SELECT slot_id, slot_label FROM time_slots ORDER BY slot_id")
    return dict(zip(df.slot_id.tolist(), df.slot_label.tolist()))


def department_options():
    df = db.fetch_df("SELECT dept_id, dept_code FROM departments ORDER BY dept_id")
    return dict(zip(df.dept_id.tolist(), df.dept_code.tolist()))


def coordinator_options():
    df = db.fetch_df("SELECT coordinator_id, name FROM hall_coordinators ORDER BY coordinator_id")
    return dict(zip(df.coordinator_id.tolist(), df.name.tolist()))


def hall_options():
    df = db.fetch_df("SELECT hall_id, hall_name FROM seminar_halls ORDER BY hall_id")
    return dict(zip(df.hall_id.tolist(), df.hall_name.tolist()))


# ---------------------------------------------------------------- shared pieces
def schedule_grid(day):
    """Halls x time slots for one day: the event name if booked, FREE otherwise."""
    df = db.fetch_df("""
        SELECT h.hall_name,
               t.slot_label,
               CASE WHEN NOT h.is_active THEN 'UNDER MAINTENANCE'
                    WHEN r.status = 'PENDING' THEN CONCAT(r.event_name, ' (awaiting approval)')
                    WHEN r.event_name IS NOT NULL THEN r.event_name
                    WHEN o.release_id IS NOT NULL THEN 'FREED - book now'
                    ELSE 'FREE' END AS booking
        FROM seminar_halls h
        CROSS JOIN time_slots t
        LEFT JOIN allocations a
               ON a.hall_id = h.hall_id AND a.slot_id = t.slot_id AND a.booking_date = %s
        LEFT JOIN booking_requests r ON r.request_id = a.request_id
        LEFT JOIN v_open_freed_slots o
               ON o.hall_id = h.hall_id AND o.slot_id = t.slot_id AND o.booking_date = %s
        ORDER BY h.hall_id, t.slot_id""", (day, day))
    return df.pivot(index="hall_name", columns="slot_label", values="booking")


def colour_cell(value):
    if value == "FREE":
        return "background-color: #d4edda; color: #155724"
    if value.startswith("FREED"):
        return "background-color: #b7e4c7; color: #0b5d1e; font-weight: bold"
    if value.endswith("(awaiting approval)"):
        return "background-color: #fff3cd; color: #664d03"
    if value == "UNDER MAINTENANCE":
        return "background-color: #e2e3e5; color: #41464b"
    return "background-color: #f8d7da; color: #721c24"


def show_grid(day):
    st.dataframe(schedule_grid(day).style.map(colour_cell))


def free_halls(day, slot_id, min_capacity=1):
    return db.fetch_df("""
        SELECT h.hall_name, h.block, h.capacity, h.has_ac
        FROM seminar_halls h
        WHERE h.is_active = TRUE
          AND h.capacity >= %s
          AND NOT EXISTS (SELECT 1 FROM allocations a
                          WHERE a.hall_id = h.hall_id
                            AND a.booking_date = %s
                            AND a.slot_id = %s)
        ORDER BY h.capacity""", (min_capacity, day, slot_id))


def open_freed_slots(srn=None):
    """Freed slots anyone can book now. With an SRN: only the ones this student
    asked for earlier and was refused because the hall was already booked."""
    sql = """
        SELECT o.booking_date, o.slot_label, o.hall_name, o.capacity, o.reason, o.freed_at
        FROM v_open_freed_slots o"""
    params = ()
    if srn:
        sql += """
        WHERE EXISTS (SELECT 1 FROM booking_requests r
                      WHERE r.srn = %s
                        AND r.status = 'REJECTED'
                        AND r.remarks = 'Hall already booked for this date and slot'
                        AND r.hall_id = o.hall_id
                        AND r.slot_id = o.slot_id
                        AND r.booking_date = o.booking_date)"""
        params = (srn,)
    return db.fetch_df(sql + "\n        ORDER BY o.booking_date, o.slot_id", params)


def show_freed_board():
    """The 'visible to everyone' part: list every freed slot that is still free."""
    freed = open_freed_slots()
    if freed.empty:
        st.caption("No freed slots right now.")
        return
    st.success(f"**{len(freed)} freed slot(s) available again.** These were booked, then "
               "cancelled or rejected, so anyone can book them now.")
    st.dataframe(freed, hide_index=True)


def bar_chart(df, x, y):
    chart = alt.Chart(df).mark_bar().encode(
        x=alt.X(f"{x}:N", sort=None, title=x),
        y=alt.Y(f"{y}:Q", title=y),
        tooltip=list(df.columns))
    st.altair_chart(chart)


def now_iso():
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def load_reports():
    """Read sql/04_reports.sql. Each report starts with a '-- #' title line."""
    reports = []
    for line in REPORTS_FILE.read_text(encoding="utf-8").splitlines():
        if line.startswith("-- #"):
            reports.append({"title": line[4:].strip(), "about": [], "chart": None, "sql": []})
        elif not reports:
            continue
        elif line.startswith("-- chart:"):
            reports[-1]["chart"] = [c.strip() for c in line[len("-- chart:"):].split(",")]
        elif line.startswith("--"):
            reports[-1]["about"].append(line[2:].strip())
        elif line.strip():
            reports[-1]["sql"].append(line)
    for r in reports:
        r["about"] = " ".join(r["about"])
        r["sql"] = "\n".join(r["sql"]).rstrip().rstrip(";")
    return reports


# ---------------------------------------------------------------- pages
def page_dashboard():
    st.header("Dashboard")
    m = db.fetch_df("""
        SELECT (SELECT COUNT(*) FROM seminar_halls WHERE is_active)          AS active_halls,
               (SELECT COUNT(*) FROM booking_requests)                       AS total_requests,
               (SELECT COUNT(*) FROM booking_requests WHERE status = 'ALLOCATED') AS allocated,
               (SELECT COUNT(*) FROM booking_requests WHERE status = 'PENDING')   AS pending,
               (SELECT COUNT(*) FROM allocations
                 WHERE booking_date BETWEEN CURDATE() AND CURDATE() + INTERVAL 7 DAY) AS next_7_days
    """).iloc[0]
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Active halls", int(m.active_halls))
    c2.metric("Total requests", int(m.total_requests))
    c3.metric("Success rate", f"{100 * m.allocated / max(m.total_requests, 1):.1f}%")
    c4.metric("Waiting for approval", int(m.pending))
    c5.metric("Bookings in next 7 days", int(m.next_7_days))

    st.subheader("Freed slots (visible to everyone)")
    show_freed_board()

    st.subheader(f"Today's schedule ({date.today():%d %b %Y})")
    show_grid(date.today())

    st.subheader("Latest requests")
    st.dataframe(db.fetch_df("""
        SELECT request_id, booking_date, slot_label, hall_name, event_name,
               student_name, status, remarks
        FROM v_booking_details
        ORDER BY requested_at DESC
        LIMIT 10"""), hide_index=True)


def page_book():
    st.header("Request a Seminar Hall")
    st.write("Pick the date and slot first. The hall list shows which halls are free. "
             "Halls are used 9:00 to 16:00 in 2-hour slots with a 30-minute gap. A request "
             "holds the hall until the seminar hall coordinator approves it.")
    with st.expander("Freed slots (cancelled bookings anyone can take)", expanded=True):
        show_freed_board()

    result = st.session_state.pop("last_result", None)
    if result:
        show_booking_result(result)

    slots = slot_options()
    c1, c2 = st.columns(2)
    booking_date = c1.date_input("Date", value=date.today() + timedelta(days=1))
    slot_id = c2.selectbox("Time slot", list(slots), format_func=slots.get)

    halls = db.fetch_df("""
        SELECT h.hall_id, h.hall_name, h.capacity, h.is_active,
               EXISTS (SELECT 1 FROM allocations a
                       WHERE a.hall_id = h.hall_id
                         AND a.booking_date = %s
                         AND a.slot_id = %s) AS is_booked
        FROM seminar_halls h
        ORDER BY h.hall_id""", (booking_date, slot_id))
    hall_names = dict(zip(halls.hall_id.tolist(), halls.hall_name.tolist()))
    hall_labels = {}
    for h in halls.itertuples():
        state = "under maintenance" if not h.is_active else ("BOOKED" if h.is_booked else "free")
        hall_labels[int(h.hall_id)] = f"{h.hall_name} ({h.capacity} seats) - {state}"

    students = student_options()
    faculty = faculty_options()
    with st.form("booking_form"):
        srn = st.selectbox("Student", list(students), format_func=students.get)
        hall_id = st.selectbox("Seminar hall", list(hall_labels), format_func=hall_labels.get)
        event_name = st.text_input("Event name")
        c1, c2 = st.columns(2)
        event_type = c1.selectbox("Event type", EVENT_TYPES)
        attendees = c2.number_input("Expected attendees", min_value=1, value=50, step=5)
        faculty_id = st.selectbox("Faculty coordinator", list(faculty), format_func=faculty.get)

        st.markdown("**Extra event details** (optional, saved as a JSON document in the NoSQL store)")
        equipment = st.multiselect("Equipment needed", EQUIPMENT)
        c1, c2 = st.columns(2)
        speaker = c1.text_input("Speaker / chief guest")
        organisation = c2.text_input("Speaker's organisation")
        tags = st.text_input("Tags (comma separated)")
        notes = st.text_area("Notes for the hall staff")
        submitted = st.form_submit_button("Request booking", type="primary")

    if submitted:
        if not event_name.strip():
            st.warning("Please enter the event name.")
            return
        try:
            request_id, status, message = db.request_booking(
                srn, hall_id, slot_id, booking_date, event_name.strip(), event_type,
                int(attendees), faculty_id)
        except mysql.connector.Error as e:
            st.error(f"Database error: {e}")
            return

        # NoSQL: only the fields the student filled in go into the document
        details = {"request_id": request_id, "event_type": event_type, "submitted_by": srn,
                   "created_at": now_iso(), "equipment": equipment}
        if speaker.strip():
            details["speaker"] = {"name": speaker.strip()}
            if organisation.strip():
                details["speaker"]["organisation"] = organisation.strip()
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        if tag_list:
            details["tags"] = tag_list
        if notes.strip():
            details["notes"] = notes.strip()
        log = {"action": "REQUEST", "logged_at": now_iso(), "srn": srn,
               "request": {"hall_id": hall_id, "hall_name": hall_names[hall_id], "slot_id": slot_id,
                           "booking_date": str(booking_date), "attendees": int(attendees)},
               "result": {"request_id": request_id, "status": status, "message": message}}
        if status == "REJECTED" and booking_date >= date.today():
            log["alternatives_suggested"] = free_halls(booking_date, slot_id, int(attendees)).hall_name.tolist()
        try:
            nosql.save_event_details(details)
            nosql.log_action(log)
            nosql_error = None
        except mysqlx.Error as e:
            nosql_error = str(e)

        st.session_state["last_result"] = {
            "request_id": request_id, "status": status, "message": message,
            "date": booking_date, "slot_id": slot_id, "hall_id": hall_id,
            "attendees": int(attendees),
            "call": (f"CALL request_booking('{srn}', {hall_id}, {slot_id}, '{booking_date}', "
                     f"'{event_name.strip()}', '{event_type}', {int(attendees)}, {faculty_id}, "
                     f"@id, @status, @msg);"),
            "details": details, "nosql_error": nosql_error,
        }
        st.rerun()


def show_booking_result(r):
    if r["status"] == "PENDING":
        st.success(f"Request #{r['request_id']}: hall HELD (PENDING). {r['message']}. "
                   "Nobody else can book it while the coordinator decides.")
    elif r["status"] == "ALLOCATED":
        st.success(f"Request #{r['request_id']}: ALLOCATED. {r['message']}.")
    else:
        st.error(f"Request #{r['request_id']}: REJECTED. {r['message']}.")
        if r["date"] >= date.today():
            slots = slot_options()
            alternatives = free_halls(r["date"], r["slot_id"], r["attendees"])
            st.write(f"**Other halls free on {r['date']:%d %b} at {slots[r['slot_id']]} "
                     f"that fit {r['attendees']} people:**")
            if alternatives.empty:
                st.write("None. Try another slot.")
            else:
                st.dataframe(alternatives, hide_index=True)
            free_slots = db.fetch_df("""
                SELECT t.slot_label
                FROM time_slots t
                WHERE NOT EXISTS (SELECT 1 FROM allocations a
                                  WHERE a.slot_id = t.slot_id
                                    AND a.hall_id = %s
                                    AND a.booking_date = %s)
                ORDER BY t.slot_id""", (r["hall_id"], r["date"]))
            st.write("**Free slots in the hall you asked for, same day:** "
                     + (", ".join(free_slots.slot_label) or "none"))
    with st.expander("SQL that was executed"):
        st.code(r["call"] + "\nSELECT @id, @status, @msg;", language="sql")
    if r["nosql_error"]:
        st.warning(f"Booking saved in MySQL, but the NoSQL documents were not saved: {r['nosql_error']}")
    else:
        with st.expander("NoSQL document saved in event_details"):
            st.code("db.event_details.add(doc)", language="javascript")
            st.json(r["details"])


def page_availability():
    st.header("Hall Availability")
    day = st.date_input("Show schedule for", value=date.today() + timedelta(days=1))
    show_grid(day)

    st.subheader("Find a free hall")
    slots = slot_options()
    c1, c2 = st.columns(2)
    slot_id = c1.selectbox("Time slot", list(slots), format_func=slots.get)
    min_capacity = c2.number_input("At least this many seats", min_value=1, value=50, step=10)
    result = free_halls(day, slot_id, int(min_capacity))
    if result.empty:
        st.info("No hall is free for that slot and size.")
    else:
        st.dataframe(result, hide_index=True)


def page_my_bookings():
    st.header("My Bookings")
    message = st.session_state.pop("cancel_message", None)
    if message:
        st.success(message)

    students = student_options()
    srn = st.selectbox("Student", list(students), format_func=students.get)
    wanted = open_freed_slots(srn)
    if not wanted.empty:
        st.success("**Good news: a hall you were refused earlier is free again.** "
                   "Someone cancelled, so you can book it now on the Book a hall page.")
        st.dataframe(wanted, hide_index=True)
    history = db.fetch_df("""
        SELECT request_id, booking_date, slot_label, hall_name, event_name,
               expected_attendees, coordinator, status, remarks, reviewed_by
        FROM v_booking_details
        WHERE srn = %s
        ORDER BY booking_date DESC""", (srn,))
    st.dataframe(history, hide_index=True)

    if not history.empty:
        st.subheader("Event details (from the NoSQL store)")
        events = {int(r.request_id): f"#{r.request_id}  {r.booking_date}  {r.event_name}"
                  for r in history.itertuples()}
        chosen = st.selectbox("Request", list(events), format_func=events.get, key="details_request")
        try:
            doc = nosql.event_details_for(chosen)
            if doc:
                st.json(doc)
            else:
                st.caption("No NoSQL document for this request.")
        except mysqlx.Error as e:
            st.warning(f"NoSQL store not reachable: {e}")

    upcoming = db.fetch_df("""
        SELECT request_id, booking_date, slot_label, hall_name, event_name, status
        FROM v_booking_details
        WHERE srn = %s AND status IN ('PENDING', 'ALLOCATED') AND booking_date >= CURDATE()
        ORDER BY booking_date""", (srn,))
    if upcoming.empty:
        st.caption("No upcoming bookings to cancel.")
        return
    st.subheader("Cancel an upcoming booking")
    labels = {int(r.request_id): f"#{r.request_id}  {r.booking_date}  {r.slot_label}  "
                                 f"{r.hall_name}  ({r.event_name}, {r.status})" for r in upcoming.itertuples()}
    request_id = st.selectbox("Booking", list(labels), format_func=labels.get)
    if st.button("Cancel booking"):
        db.execute("""
            UPDATE booking_requests
            SET status = 'CANCELLED', remarks = 'Cancelled by student'
            WHERE request_id = %s AND status IN ('PENDING', 'ALLOCATED')""", (request_id,))
        st.session_state["cancel_message"] = (
            f"Booking #{request_id} cancelled. Trigger trg_free_hall_on_cancel removed its "
            "row from allocations and published the slot in freed_slots, so every student "
            "can now see that the hall is free again.")
        row = upcoming[upcoming.request_id == request_id].iloc[0]
        try:
            nosql.log_action({"action": "CANCEL", "logged_at": now_iso(), "srn": srn,
                              "request_id": request_id,
                              "freed_slot": {"hall_name": row.hall_name, "booking_date": str(row.booking_date),
                                             "slot": row.slot_label}})
        except mysqlx.Error:
            pass
        st.rerun()


def page_coordinator():
    st.header("Seminar Hall Coordinator")
    st.write("Every request that passes the rules holds the hall as PENDING. The coordinator "
             "in charge of the hall approves or rejects it. A rejection frees the hall and "
             "publishes the slot to everyone.")
    message = st.session_state.pop("review_message", None)
    if message:
        st.success(message)

    coordinators = coordinator_options()
    coordinator_id = st.selectbox("Coordinator", list(coordinators), format_func=coordinators.get)
    st.caption("Halls in charge: " + ", ".join(db.fetch_df(
        "SELECT hall_name FROM seminar_halls WHERE coordinator_id = %s ORDER BY hall_id",
        (coordinator_id,)).hall_name))

    pending = db.fetch_df("""
        SELECT v.request_id, v.booking_date, v.slot_label, v.hall_name, v.event_name,
               v.event_type, v.expected_attendees, v.capacity, v.student_name,
               v.coordinator AS faculty, v.requested_at
        FROM v_booking_details v
        JOIN seminar_halls h ON h.hall_name = v.hall_name
        WHERE v.status = 'PENDING' AND h.coordinator_id = %s
        ORDER BY v.booking_date, v.request_id""", (coordinator_id,))
    st.subheader(f"Waiting for your approval ({len(pending)})")
    if pending.empty:
        st.caption("Nothing to review.")
    else:
        st.dataframe(pending, hide_index=True)
        labels = {int(r.request_id): f"#{r.request_id}  {r.booking_date}  {r.slot_label}  "
                                     f"{r.hall_name}  ({r.event_name})" for r in pending.itertuples()}
        request_id = st.selectbox("Request", list(labels), format_func=labels.get)
        reason = st.text_input("Reason (needed when rejecting)")
        c1, c2 = st.columns(2)
        approve = c1.button("Approve", type="primary")
        reject = c2.button("Reject")
        if reject and not reason.strip():
            st.warning("Please type a reason before rejecting.")
        elif approve or reject:
            status, msg = db.review_booking(request_id, coordinator_id, approve, reason.strip())
            log = {"action": "REVIEW", "logged_at": now_iso(), "coordinator_id": coordinator_id,
                   "request_id": request_id, "decision": "APPROVED" if approve else "REJECTED"}
            if reject:
                log["reason"] = reason.strip()
            try:
                nosql.log_action(log)
            except mysqlx.Error:
                pass
            extra = ("" if approve else " Trigger trg_free_hall_on_cancel freed the hall and "
                     "published the slot in freed_slots.")
            st.session_state["review_message"] = f"Request #{request_id}: {status}. {msg}.{extra}"
            st.rerun()

    st.subheader("Your recent decisions")
    st.dataframe(db.fetch_df("""
        SELECT r.request_id, r.booking_date, h.hall_name, r.event_name, r.status, r.remarks,
               r.reviewed_at
        FROM booking_requests r
        JOIN seminar_halls h ON h.hall_id = r.hall_id
        WHERE r.reviewed_by = %s
        ORDER BY r.reviewed_at DESC
        LIMIT 10""", (coordinator_id,)), hide_index=True)


def page_reports():
    st.header("Reports")
    reports = load_reports()
    titles = [r["title"] for r in reports]
    report = reports[titles.index(st.selectbox("Choose a report", titles))]

    st.subheader(report["title"])
    st.caption(report["about"])
    df = db.fetch_df(report["sql"])
    if report["chart"] and not df.empty:
        bar_chart(df, *report["chart"])
    st.dataframe(df, hide_index=True)
    with st.expander("SQL query"):
        st.code(report["sql"] + ";", language="sql")


def page_nosql():
    st.header("NoSQL: MySQL Document Store")
    st.write("These collections hold schemaless JSON documents, written and read with the "
             "X DevAPI (add / find / modify / remove) instead of SQL. Each document points "
             "back to MySQL through its `request_id`.")
    if not nosql.is_available():
        st.error(f"Document Store is not reachable on port {nosql.X_PORT}.")
        return
    message = st.session_state.pop("nosql_message", None)
    if message:
        st.success(message)

    tab_events, tab_logs, tab_reports = st.tabs(["event_details", "booking_logs", "NoSQL reports"])

    with tab_events:
        st.caption("Documents have different fields depending on the event type. That is why "
                   "this data lives in a document store instead of a fixed table.")
        c1, c2 = st.columns(2)
        event_type = c1.selectbox("Event type", ["(any)"] + EVENT_TYPES)
        equipment = c2.selectbox("Needs equipment", ["(any)"] + EQUIPMENT)
        docs, shell = nosql.search_event_details(None if event_type == "(any)" else event_type,
                                                 None if equipment == "(any)" else equipment)
        st.code(shell, language="javascript")
        st.write(f"**{len(docs)} documents** (up to 50). Empty cells = field not present in that document.")
        if docs:
            table = pd.json_normalize(docs).drop(columns="_id")
            first = [c for c in ["request_id", "event_type", "submitted_by"] if c in table.columns]
            st.dataframe(table[first + [c for c in table.columns if c not in first]], hide_index=True)
            with st.expander("Raw JSON of the first document"):
                st.json(docs[0])

        st.subheader("Add a tag to an event (modify)")
        c1, c2 = st.columns(2)
        tag_request = c1.number_input("Request id", min_value=1, step=1, value=1)
        tag = c2.text_input("Tag")
        if st.button("Add tag") and tag.strip():
            changed = nosql.add_tag(int(tag_request), tag.strip())
            st.session_state["nosql_message"] = (
                f"Tag '{tag.strip()}' added to request {int(tag_request)}." if changed
                else f"No document found for request {int(tag_request)}.")
            st.rerun()

    with tab_logs:
        st.caption("Append-only log. A REQUEST entry and a CANCEL entry store different fields.")
        st.code('db.booking_logs.find().sort("logged_at DESC").limit(20)', language="javascript")
        logs = nosql.latest_logs(20)
        for log in logs:
            with st.expander(f"{log['logged_at']}   {log['action']}   {log.get('srn', '')}"):
                st.json(log)
        if logs:
            st.subheader("Delete a log document (remove)")
            ids = {log["_id"]: f"{log['logged_at']}  {log['action']}  ({log['_id']})" for log in logs}
            doc_id = st.selectbox("Document", list(ids), format_func=ids.get)
            if st.button("Delete document"):
                nosql.delete_log(doc_id)
                st.session_state["nosql_message"] = f"Log document {doc_id} removed."
                st.rerun()

    with tab_reports:
        st.subheader("N1. Documents per event type (groupBy)")
        st.code('db.event_details.find().fields("event_type", "COUNT(_id) AS documents")'
                '.groupBy("event_type")', language="javascript")
        df = pd.DataFrame(nosql.documents_per_event_type())
        bar_chart(df, "event_type", "documents")
        st.dataframe(df, hide_index=True)

        st.subheader("N2. Booking log summary (groupBy on a nested field)")
        st.code('db.booking_logs.find().fields("action", "result.status AS status", "COUNT(_id) AS total")'
                '.groupBy("action", "result.status")', language="javascript")
        df = pd.DataFrame(nosql.log_summary())
        df["status"] = df["status"].fillna("-")
        df["action_status"] = df["action"] + " / " + df["status"]
        bar_chart(df, "action_status", "total")
        st.dataframe(df[["action", "status", "total"]], hide_index=True)

        st.subheader("N3. Most requested equipment (array field)")
        st.code('db.event_details.find().fields("equipment")   // then counted in Python',
                language="javascript")
        df = pd.DataFrame(nosql.equipment_demand())
        bar_chart(df, "equipment", "events")
        st.dataframe(df, hide_index=True)


def page_admin():
    st.header("Admin")
    tab_view, tab_student, tab_hall, tab_maint, tab_slots = st.tabs(
        ["View tables", "Add student", "Add hall", "Hall maintenance", "Time slots"])

    with tab_view:
        table = st.selectbox("Table", TABLES)
        st.dataframe(db.fetch_df(f"SELECT * FROM {table}"), hide_index=True)

    with tab_student:
        depts = department_options()
        with st.form("add_student", clear_on_submit=True):
            srn = st.text_input("SRN (e.g. PES1UG24AM100)")
            name = st.text_input("Name")
            email = st.text_input("Email")
            phone = st.text_input("Phone (10 digits)")
            c1, c2 = st.columns(2)
            semester = c1.number_input("Semester", min_value=1, max_value=8, value=5)
            dept_id = c2.selectbox("Department", list(depts), format_func=depts.get)
            if st.form_submit_button("Add student"):
                try:
                    db.execute("""
                        INSERT INTO students (srn, name, email, phone, semester, dept_id)
                        VALUES (%s, %s, %s, %s, %s, %s)""",
                        (srn.strip().upper(), name.strip(), email.strip(), phone.strip() or None,
                         int(semester), dept_id))
                    st.success(f"Student {srn.strip().upper()} added.")
                except mysql.connector.Error as e:
                    st.error(f"Could not add student: {e}")

    with tab_hall:
        with st.form("add_hall", clear_on_submit=True):
            hall_name = st.text_input("Hall name")
            c1, c2, c3 = st.columns(3)
            block = c1.text_input("Block")
            floor_no = c2.number_input("Floor", min_value=0, max_value=20, value=0)
            capacity = c3.number_input("Capacity", min_value=1, value=100, step=10)
            has_projector = st.checkbox("Has projector", value=True)
            has_ac = st.checkbox("Has AC")
            coordinators = coordinator_options()
            coordinator_id = st.selectbox("Hall coordinator", list(coordinators),
                                          format_func=coordinators.get)
            if st.form_submit_button("Add hall"):
                try:
                    db.execute("""
                        INSERT INTO seminar_halls (hall_name, block, floor_no, capacity, has_projector,
                                                   has_ac, coordinator_id)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                        (hall_name.strip(), block.strip(), int(floor_no), int(capacity),
                         has_projector, has_ac, coordinator_id))
                    st.success(f"Hall '{hall_name.strip()}' added.")
                except mysql.connector.Error as e:
                    st.error(f"Could not add hall: {e}")

    with tab_maint:
        st.write("Halls under maintenance cannot be allocated.")
        halls = hall_options()
        hall_id = st.selectbox("Hall", list(halls), format_func=halls.get, key="maint_hall")
        active = db.fetch_df("SELECT is_active FROM seminar_halls WHERE hall_id = %s",
                             (hall_id,)).is_active[0]
        st.write("Current state: " + ("**available**" if active else "**under maintenance**"))
        label = "Mark under maintenance" if active else "Mark available"
        if st.button(label):
            db.execute("UPDATE seminar_halls SET is_active = NOT is_active WHERE hall_id = %s",
                       (hall_id,))
            st.rerun()

    with tab_slots:
        st.write("College rules, enforced by the database: slots lie between 09:00 and 16:00 "
                 "(CHECK), last at most 2 hours (CHECK), and need a 30-minute gap between them "
                 "(trigger trg_slot_gap_insert). Try adding a slot that breaks a rule.")
        st.dataframe(db.fetch_df("SELECT * FROM time_slots ORDER BY start_time"), hide_index=True)
        with st.form("add_slot"):
            c1, c2 = st.columns(2)
            start = c1.time_input("Start", value=datetime.strptime("15:00", "%H:%M").time())
            end = c2.time_input("End", value=datetime.strptime("17:00", "%H:%M").time())
            if st.form_submit_button("Add slot"):
                try:
                    db.execute("""
                        INSERT INTO time_slots (slot_label, start_time, end_time)
                        VALUES (%s, %s, %s)""",
                        (f"{start:%H:%M} - {end:%H:%M}", start, end))
                    st.success("Slot added.")
                except mysql.connector.Error as e:
                    st.error(f"Rejected by the database: {e.msg}")


# ---------------------------------------------------------------- main
PAGES = {
    "Dashboard": page_dashboard,
    "Book a hall": page_book,
    "Hall availability": page_availability,
    "My bookings": page_my_bookings,
    "Coordinator": page_coordinator,
    "Reports": page_reports,
    "NoSQL documents": page_nosql,
    "Admin": page_admin,
}

st.sidebar.title("Seminar Hall Booking")
choice = st.sidebar.radio("Go to", list(PAGES))
st.sidebar.caption("RDBMS: MySQL tables (SQL)\n\nNoSQL: MySQL Document Store (X DevAPI)")

try:
    db.fetch_df("SELECT 1")
except mysql.connector.Error as e:
    st.error(f"Cannot connect to MySQL: {e}")
    st.info("Start the MySQL80 service, then run `python setup_db.py` once.")
    st.stop()

PAGES[choice]()
