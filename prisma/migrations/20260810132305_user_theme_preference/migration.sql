-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('light', 'dark', 'system');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "theme_preference" "ThemePreference" NOT NULL DEFAULT 'system';

