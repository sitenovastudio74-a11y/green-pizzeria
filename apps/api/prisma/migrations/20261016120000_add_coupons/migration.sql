CREATE TABLE IF NOT EXISTS "coupons" ("id" TEXT NOT NULL, "code" TEXT NOT NULL, "percentOff" INTEGER NOT NULL, "maxDiscount" DECIMAL(10,2), "minOrder" DECIMAL(10,2), "expiresAt" TIMESTAMP(3), "usageLimit" INTEGER, "usedCount" INTEGER NOT NULL DEFAULT 0, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "coupons_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "coupons_code_key" ON "coupons"("code");
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "couponCode" TEXT;
