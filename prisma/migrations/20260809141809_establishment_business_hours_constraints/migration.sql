-- A day is either closed (no hours needed) or open with a valid, ordered time range.
ALTER TABLE "establishment_business_hours"
  ADD CONSTRAINT "establishment_business_hours_valid_range" CHECK (
    "is_closed" = true
    OR ("open_time" IS NOT NULL AND "close_time" IS NOT NULL AND "open_time" < "close_time")
  ),
  ADD CONSTRAINT "establishment_business_hours_weekday_range" CHECK ("weekday" BETWEEN 0 AND 6);
