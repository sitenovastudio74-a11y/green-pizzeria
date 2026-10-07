-- DropForeignKey
ALTER TABLE "cart_combo_items" DROP CONSTRAINT "cart_combo_items_comboId_fkey";

-- DropForeignKey
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_productId_fkey";

-- DropForeignKey
ALTER TABLE "order_combo_items" DROP CONSTRAINT "order_combo_items_comboId_fkey";

-- AlterTable
ALTER TABLE "order_combo_items" ALTER COLUMN "comboId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_combo_items" ADD CONSTRAINT "cart_combo_items_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "combos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_combo_items" ADD CONSTRAINT "order_combo_items_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "combos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
