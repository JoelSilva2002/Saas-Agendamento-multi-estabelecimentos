-- Hand-written constraints that Prisma's schema DSL cannot express (CHECK constraints and
-- GiST exclusion constraints). Prisma only replays these migration files verbatim, so
-- editing them by hand is the officially supported way to add constraints outside its DSL.

-- Needed for the exclusion constraint below: allows a btree equality operator (on the
-- employee_id uuid column) to be combined with a range overlap operator (&&) in the same
-- GiST index.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------------------------
-- Sanity CHECK constraints: start < end, positive amounts/durations, bounded ranges.
-- ---------------------------------------------------------------------------------------

ALTER TABLE "services"
  ADD CONSTRAINT "services_price_non_negative" CHECK ("price_cents" >= 0),
  ADD CONSTRAINT "services_duration_positive" CHECK ("duration_minutes" > 0);

ALTER TABLE "employee_schedule_slots"
  ADD CONSTRAINT "employee_schedule_slots_time_order" CHECK ("start_time" < "end_time"),
  ADD CONSTRAINT "employee_schedule_slots_weekday_range" CHECK ("weekday" BETWEEN 0 AND 6);

ALTER TABLE "employee_time_off"
  ADD CONSTRAINT "employee_time_off_time_order" CHECK ("start_at" < "end_at");

ALTER TABLE "availability_exceptions"
  ADD CONSTRAINT "availability_exceptions_time_order"
  CHECK ("start_time" IS NULL OR "end_time" IS NULL OR "start_time" < "end_time");

ALTER TABLE "agenda_blocks"
  ADD CONSTRAINT "agenda_blocks_time_order" CHECK ("start_at" < "end_at");

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_time_order" CHECK ("start_at" < "end_at"),
  ADD CONSTRAINT "appointments_price_non_negative" CHECK ("price_cents" >= 0);

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_positive" CHECK ("amount_cents" > 0);

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5);

ALTER TABLE "coupons"
  ADD CONSTRAINT "coupons_validity_order" CHECK ("valid_from" < "valid_until"),
  ADD CONSTRAINT "coupons_discount_value_positive" CHECK ("discount_value" > 0),
  ADD CONSTRAINT "coupons_max_uses_positive" CHECK ("max_uses" IS NULL OR "max_uses" > 0);

-- ---------------------------------------------------------------------------------------
-- Anti-double-booking: no two non-cancelled, non-fit-in appointments for the same
-- employee may have overlapping [start_at, end_at) ranges. This is a hard DB-level
-- safety net; the actual slot-availability computation (working hours, breaks, time off,
-- buffers) lives in the application-layer scheduling engine (Phase 2+) — this constraint
-- only guarantees that engine's decisions can never be undermined by a race condition or
-- a bug, it doesn't replace the engine's own logic.
-- "Encaixes" (is_fit_in = true) are explicitly allowed to overlap, since staff opted into
-- squeezing them in outside normal availability.
-- ---------------------------------------------------------------------------------------
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_overlap_per_employee"
  EXCLUDE USING gist (
    "employee_id" WITH =,
    tsrange("start_at", "end_at") WITH &&
  )
  WHERE ("is_fit_in" = false AND "status" NOT IN ('cancelled', 'no_show'));
