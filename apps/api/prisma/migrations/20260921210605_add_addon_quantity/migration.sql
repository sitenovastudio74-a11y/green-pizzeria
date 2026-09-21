-- AlterTable
ALTER TABLE "cart_item_addons" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "order_item_addons" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;
