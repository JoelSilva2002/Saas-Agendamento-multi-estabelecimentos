-- Walk-in clients created inline by staff (no email/password given) need a users row with
-- neither. The unique index on email is untouched — Postgres treats NULLs as distinct, so
-- multiple email-less walk-ins coexist fine and everyone who does have an email keeps the
-- "one account per email" guarantee.
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
