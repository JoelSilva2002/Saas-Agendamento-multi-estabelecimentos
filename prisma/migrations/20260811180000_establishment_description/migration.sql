-- Free-text presentation of the establishment, shown to clients in the public directory and
-- on its page. Nullable: existing establishments have none and stay perfectly usable.
ALTER TABLE "establishments" ADD COLUMN "description" TEXT;
