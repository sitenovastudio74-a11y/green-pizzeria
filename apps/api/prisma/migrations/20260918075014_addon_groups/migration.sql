-- AlterTable
ALTER TABLE "product_addons" ADD COLUMN     "addonGroupId" TEXT;

-- CreateTable
CREATE TABLE "addon_groups" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minSelectable" INTEGER NOT NULL DEFAULT 0,
    "maxSelectable" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "addon_groups_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "addon_groups" ADD CONSTRAINT "addon_groups_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_addons" ADD CONSTRAINT "product_addons_addonGroupId_fkey" FOREIGN KEY ("addonGroupId") REFERENCES "addon_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
