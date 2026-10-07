-- DropForeignKey
ALTER TABLE "cart_item_addons" DROP CONSTRAINT "cart_item_addons_addonId_fkey";

-- DropForeignKey
ALTER TABLE "cart_item_options" DROP CONSTRAINT "cart_item_options_optionId_fkey";

-- DropForeignKey
ALTER TABLE "order_item_addons" DROP CONSTRAINT "order_item_addons_addonId_fkey";

-- DropForeignKey
ALTER TABLE "order_item_options" DROP CONSTRAINT "order_item_options_optionId_fkey";

-- AddForeignKey
ALTER TABLE "cart_item_options" ADD CONSTRAINT "cart_item_options_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item_addons" ADD CONSTRAINT "cart_item_addons_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "addons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_options" ADD CONSTRAINT "order_item_options_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_addons" ADD CONSTRAINT "order_item_addons_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "addons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
