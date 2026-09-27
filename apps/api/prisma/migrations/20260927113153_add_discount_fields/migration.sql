-- AlterTable
ALTER TABLE "combos" ADD COLUMN     "discountDisabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "discountPercent" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "discountDisabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "discountPercent" INTEGER DEFAULT 0;
