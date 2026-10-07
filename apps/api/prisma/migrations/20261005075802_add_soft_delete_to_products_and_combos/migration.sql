-- AlterTable
ALTER TABLE "combos" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;
