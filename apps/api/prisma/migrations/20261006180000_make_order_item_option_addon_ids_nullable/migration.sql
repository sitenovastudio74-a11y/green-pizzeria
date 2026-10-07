-- AlterTable
ALTER TABLE "order_item_options" ALTER COLUMN "optionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "order_item_addons" ALTER COLUMN "addonId" DROP NOT NULL;
