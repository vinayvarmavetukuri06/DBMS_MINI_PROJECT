-- =====================================================================
--  Seminar Hall Booking System - one-time setup (run as ROOT)
--
--  Run this ONCE, either:
--    * in MySQL Workbench (connected as root): open this file, click the lightning icon
--    * or in a terminal:  mysql -u root -p < sql/00_create_user.sql
--
--  It creates the database and a separate application user, so the
--  app never needs the root password.
--
--  SECURITY NOTE:
--  Replace 'YOUR_SECURE_PASSWORD_HERE' below with your chosen database
--  password before running. Then set the matching DB_PASSWORD in your
--  local .env (for Python) and frontend-nextjs/.env.local (for Next.js).
-- =====================================================================

CREATE DATABASE IF NOT EXISTS seminar_booking;

-- Replace 'YOUR_SECURE_PASSWORD_HERE' with your actual strong password
CREATE USER IF NOT EXISTS 'seminar_app'@'localhost' IDENTIFIED BY 'YOUR_SECURE_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON seminar_booking.* TO 'seminar_app'@'localhost';
FLUSH PRIVILEGES;

-- Binary logging is ON in this server (log-bin in my.ini). In that mode MySQL
-- only lets SUPER users create triggers, unless this flag is set.
-- SET PERSIST keeps it after a restart, so `python setup_db.py` always works.
SET PERSIST log_bin_trust_function_creators = 1;
