-- CreateTable
CREATE TABLE "combos" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "isEligibleForCoupons" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_slots" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "selectCount" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "combo_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_slot_products" (
    "id" TEXT NOT NULL,
    "comboSlotId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "combo_slot_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_combo_items" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceSnapshot" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_combo_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_combo_selections" (
    "id" TEXT NOT NULL,
    "cartComboItemId" TEXT NOT NULL,
    "comboSlotId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "cart_combo_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_combo_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "comboName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_combo_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_combo_selections" (
    "id" TEXT NOT NULL,
    "orderComboItemId" TEXT NOT NULL,
    "slotLabel" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,

    CONSTRAINT "order_combo_selections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "combo_slot_products_comboSlotId_productId_key" ON "combo_slot_products"("comboSlotId", "productId");

-- AddForeignKey
ALTER TABLE "combo_slots" ADD CONSTRAINT "combo_slots_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "combos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_slot_products" ADD CONSTRAINT "combo_slot_products_comboSlotId_fkey" FOREIGN KEY ("comboSlotId") REFERENCES "combo_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_slot_products" ADD CONSTRAINT "combo_slot_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_combo_items" ADD CONSTRAINT "cart_combo_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_combo_items" ADD CONSTRAINT "cart_combo_items_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "combos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_combo_selections" ADD CONSTRAINT "cart_combo_selections_cartComboItemId_fkey" FOREIGN KEY ("cartComboItemId") REFERENCES "cart_combo_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_combo_items" ADD CONSTRAINT "order_combo_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_combo_items" ADD CONSTRAINT "order_combo_items_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "combos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_combo_selections" ADD CONSTRAINT "order_combo_selections_orderComboItemId_fkey" FOREIGN KEY ("orderComboItemId") REFERENCES "order_combo_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
