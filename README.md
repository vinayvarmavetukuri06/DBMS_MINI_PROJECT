# University Seminar Hall Booking System

A DBMS project where students request a seminar hall for a date and time slot.
If the hall is free (and big enough, and not under maintenance) the database
holds it and the **seminar hall coordinator** approves or rejects it; otherwise
the request is rejected with the reason and the app suggests other free halls.

**Novelty, from how our college works:** coordinator approval, and **freed slots
visible to everyone**. When a booking is cancelled or rejected, a trigger publishes
the slot, so other students (especially the ones refused earlier) can book it. The
college timings (9 AM–4 PM, 2 hours max, 30 minute gap) are enforced in the database.

- **RDBMS:** MySQL 8.0 (9 tables, 2 views, 2 stored procedures, 3 triggers)
- **NoSQL:** MySQL Document Store, with 2 collections of schemaless JSON documents (`event_details`, `booking_logs`) used through the X DevAPI
- **Front end:** Python + Streamlit
- **Reports:** 12 SQL reports and 3 NoSQL reports, with charts

## Project files

| File | What it is |
|---|---|
| `sql/00_create_user.sql` | Run once as root: creates the database and the app user |
| `sql/01_schema.sql` | All 9 tables with keys and constraints, plus the 2 views |
| `sql/02_procedures_triggers.sql` | `request_booking` and `review_booking` procedures; `trg_free_hall_on_cancel` and the slot-gap triggers |
| `sql/03_sample_data.sql` | Sample data: 6 departments, 42 students, 12 faculty, 3 hall coordinators, 7 halls, 3 slots, 202 requests, 14 freed slots |
| `sql/04_reports.sql` | The 12 report queries (the app reads them from here) |
| `sql/05_demo_queries.sql` | Step-by-step queries to show in MySQL Workbench (structure, booking flow, rules that must fail, reports) |
| `setup_db.py` | Runs files 01–03 and loads the NoSQL collections. Run again any time to reset to the sample data |
| `app.py` | The Streamlit app (all pages) |
| `db.py` | Connects to MySQL and runs queries and the procedure (SQL) |
| `nosql.py` | All NoSQL operations: add / find / modify / remove / groupBy on the document collections |
| `nosql_data/*.json` | Sample documents: 202 event details, 375 booking log entries |
| `config.py` | Database connection settings |
| `docs/er_diagram.html` | ER diagram (Chen notation) and relational schema, printable |
| `docs/er_diagram.png` | ER diagram image for slides |
| `docs/final_er.pdf` | ER diagram + relational schema as a 2-page PDF |
| `docs/viva_notes.md` | Explanation of the design, a demo script and likely viva questions |
| `docs/sql_python_explained.md` | How db.py and app.py connect the SQL to the Streamlit website |

## First-time setup

1. Make sure the MySQL service is running. It is set to start manually on this
   laptop, so after a restart open **Services**, find **MySQL80** and click **Start**.
   You can also run this in an administrator terminal: `net start MySQL80`.
2. Run `sql/00_create_user.sql` once as root (MySQL Workbench, or
   `source D:/dbms project/sql/00_create_user.sql` at the `mysql>` prompt).
3. Install the Python packages and load the database:
   ```bash
   pip install -r requirements.txt
   ```
   ```bash
   pip install --no-deps mysqlx-connector-python
   ```
   ```bash
   python setup_db.py
   ```
   The NoSQL part connects on port 33060 (the MySQL X Protocol). It is on by default in MySQL 8.

## Run the app

```bash
streamlit run app.py
```

It opens at http://localhost:8501.

**Before every demo**, run `python setup_db.py` to reset the data, so test
bookings from practice runs disappear.

## App pages

- **Dashboard:** key numbers, the freed-slots board (visible to everyone), today's hall schedule, latest requests
- **Book a hall:** the booking form. It calls the stored procedure (SQL), which holds the hall as PENDING, and saves the optional event details as a JSON document (NoSQL)
- **Hall availability:** colour-coded hall × slot grid for any date (booked, awaiting approval, freed, free), and a "find a free hall" search
- **My bookings:** a student's request history, an alert when a hall they were refused is free again, each event's NoSQL document, and cancelling (fires the trigger, which frees and publishes the slot)
- **Coordinator:** the seminar hall coordinator approves or rejects pending requests for their halls (`review_booking`)
- **Reports:** the 12 SQL reports with charts and the SQL behind each
- **NoSQL documents:** search, modify and remove documents, plus 3 NoSQL reports
- **Admin:** view any table, add students or halls, put a hall under maintenance, try adding a time slot (the database enforces the college timing rules)
