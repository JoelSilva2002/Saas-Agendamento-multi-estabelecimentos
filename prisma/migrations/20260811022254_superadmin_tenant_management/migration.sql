-- AlterEnum
ALTER TYPE "TenantStatus" ADD VALUE 'cancelled';

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "document" TEXT,
ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'free';

-- CreateTable
CREATE TABLE "impersonation_sessions" (
    "id" TEXT NOT NULL,
    "platform_admin_user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "impersonated_user_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "impersonation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "impersonation_sessions_tenant_id_idx" ON "impersonation_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "impersonation_sessions_platform_admin_user_id_idx" ON "impersonation_sessions"("platform_admin_user_id");

-- AddForeignKey
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_platform_admin_user_id_fkey" FOREIGN KEY ("platform_admin_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_impersonated_user_id_fkey" FOREIGN KEY ("impersonated_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
