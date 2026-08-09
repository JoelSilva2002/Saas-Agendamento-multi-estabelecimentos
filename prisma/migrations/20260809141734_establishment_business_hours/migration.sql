-- AlterTable
ALTER TABLE "establishments" ADD COLUMN     "address_city" TEXT,
ADD COLUMN     "address_complement" TEXT,
ADD COLUMN     "address_country" TEXT NOT NULL DEFAULT 'BR',
ADD COLUMN     "address_neighborhood" TEXT,
ADD COLUMN     "address_number" TEXT,
ADD COLUMN     "address_state" TEXT,
ADD COLUMN     "address_street" TEXT,
ADD COLUMN     "address_zip_code" TEXT,
ADD COLUMN     "phones" TEXT[];

-- CreateTable
CREATE TABLE "establishment_business_hours" (
    "id" TEXT NOT NULL,
    "establishment_id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "open_time" TIME,
    "close_time" TIME,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "establishment_business_hours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "establishment_business_hours_establishment_id_weekday_key" ON "establishment_business_hours"("establishment_id", "weekday");

-- AddForeignKey
ALTER TABLE "establishment_business_hours" ADD CONSTRAINT "establishment_business_hours_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
