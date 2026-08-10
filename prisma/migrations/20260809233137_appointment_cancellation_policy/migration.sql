-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "no_show_fee_cents" INTEGER;

-- AlterTable
ALTER TABLE "establishments" ADD COLUMN     "cancellation_min_hours_notice" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "no_show_fee_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "no_show_fee_percentage" INTEGER;

-- CheckConstraint: keep noShowFeePercentage in the valid 1-100 range whenever it's set,
-- mirroring the same invariant already enforced in the Establishment domain entity.
ALTER TABLE "establishments" ADD CONSTRAINT "establishments_no_show_fee_percentage_range"
  CHECK ("no_show_fee_percentage" IS NULL OR ("no_show_fee_percentage" > 0 AND "no_show_fee_percentage" <= 100));
