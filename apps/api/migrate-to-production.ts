// One-off migration script: local dev DB -> production (Neon) DB
// Reads SOURCE_DATABASE_URL / TARGET_DATABASE_URL from .env.migration
// Safe to re-run: uses skipDuplicates since IDs are preserved from source.

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { uploadImageToCloudinary } from './src/uploads/cloudinary';

dotenv.config({ path: path.join(__dirname, '.env.migration') });

const SOURCE_DATABASE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_DATABASE_URL = process.env.TARGET_DATABASE_URL;

if (!SOURCE_DATABASE_URL || !TARGET_DATABASE_URL) {
  console.error('Missing SOURCE_DATABASE_URL or TARGET_DATABASE_URL in .env.migration');
  process.exit(1);
}

const sourceDb = new PrismaClient({
  datasources: { db: { url: SOURCE_DATABASE_URL } },
});

const targetDb = new PrismaClient({
  datasources: { db: { url: TARGET_DATABASE_URL } },
});

const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Resolves an imageUrl: if it's already http(s), returns as-is.
// If it's a local /uploads/... path, reads the file from disk and uploads to Cloudinary.
async function resolveImageUrl(
  imageUrl: string | null,
  folder: 'categories' | 'products' | 'combos',
): Promise<string | null> {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // imageUrl looks like "/uploads/categories/xxx.png" -> take just the filename
  const filename = path.basename(imageUrl);
  const filePath = path.join(UPLOADS_DIR, folder, filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`  WARNING: local image file not found, skipping: ${filePath}`);
    return null;
  }

  const buffer = fs.readFileSync(filePath);
  const uploadedUrl = await uploadImageToCloudinary(buffer, folder);
  console.log(`  Uploaded ${filename} -> ${uploadedUrl}`);
  return uploadedUrl;
}

async function migrate() {
  console.log('--- Starting migration: local dev DB -> production Neon DB ---\n');

  // 1. Categories
  console.log('Step 1/9: Categories');
  const categories = await sourceDb.category.findMany();
  for (const cat of categories) {
    const imageUrl = await resolveImageUrl(cat.imageUrl, 'categories');
    await targetDb.category.upsert({
      where: { id: cat.id },
      create: { ...cat, imageUrl },
      update: { ...cat, imageUrl },
    });
  }
  console.log(`  Categories migrated: ${categories.length}\n`);

  // 2. Products
  console.log('Step 2/9: Products');
  const products = await sourceDb.product.findMany();
  for (const prod of products) {
    const imageUrl = await resolveImageUrl(prod.imageUrl, 'products');
    await targetDb.product.upsert({
      where: { id: prod.id },
      create: { ...prod, imageUrl },
      update: { ...prod, imageUrl },
    });
  }
  console.log(`  Products migrated: ${products.length}\n`);

  // 3. OptionGroups
  console.log('Step 3/9: Option Groups');
  const optionGroups = await sourceDb.optionGroup.findMany();
  for (const og of optionGroups) {
    await targetDb.optionGroup.upsert({
      where: { id: og.id },
      create: og,
      update: og,
    });
  }
  console.log(`  Option Groups migrated: ${optionGroups.length}\n`);

  // 4. Options
  console.log('Step 4/9: Options');
  const options = await sourceDb.option.findMany();
  for (const opt of options) {
    await targetDb.option.upsert({
      where: { id: opt.id },
      create: opt,
      update: opt,
    });
  }
  console.log(`  Options migrated: ${options.length}\n`);

  // 5. Addons (standalone)
  console.log('Step 5/9: Addons');
  const addons = await sourceDb.addon.findMany();
  for (const addon of addons) {
    await targetDb.addon.upsert({
      where: { id: addon.id },
      create: addon,
      update: addon,
    });
  }
  console.log(`  Addons migrated: ${addons.length}\n`);

  // 6. AddonGroups
  console.log('Step 6/9: Addon Groups');
  const addonGroups = await sourceDb.addonGroup.findMany();
  for (const ag of addonGroups) {
    await targetDb.addonGroup.upsert({
      where: { id: ag.id },
      create: ag,
      update: ag,
    });
  }
  console.log(`  Addon Groups migrated: ${addonGroups.length}\n`);

  // 7. ProductAddons (join table)
  console.log('Step 7/9: Product Addons (links)');
  const productAddons = await sourceDb.productAddon.findMany();
  for (const pa of productAddons) {
    await targetDb.productAddon.upsert({
      where: { id: pa.id },
      create: pa,
      update: pa,
    });
  }
  console.log(`  Product Addons migrated: ${productAddons.length}\n`);

  // 8. Combos + Slots + Slot Products
  console.log('Step 8/9: Combos, Combo Slots, Combo Slot Products');
  const combos = await sourceDb.combo.findMany();
  for (const combo of combos) {
    const imageUrl = await resolveImageUrl(combo.imageUrl, 'combos');
    await targetDb.combo.upsert({
      where: { id: combo.id },
      create: { ...combo, imageUrl },
      update: { ...combo, imageUrl },
    });
  }
  console.log(`  Combos migrated: ${combos.length}`);

  const comboSlots = await sourceDb.comboSlot.findMany();
  for (const slot of comboSlots) {
    await targetDb.comboSlot.upsert({
      where: { id: slot.id },
      create: slot,
      update: slot,
    });
  }
  console.log(`  Combo Slots migrated: ${comboSlots.length}`);

  const comboSlotProducts = await sourceDb.comboSlotProduct.findMany();
  for (const csp of comboSlotProducts) {
    await targetDb.comboSlotProduct.upsert({
      where: { id: csp.id },
      create: csp,
      update: csp,
    });
  }
  console.log(`  Combo Slot Products migrated: ${comboSlotProducts.length}\n`);

  // 9. Settings
  console.log('Step 9/9: Settings');
  const settings = await sourceDb.setting.findMany();
  for (const setting of settings) {
    await targetDb.setting.upsert({
      where: { id: setting.id },
      create: setting,
      update: setting,
    });
  }
  console.log(`  Settings migrated: ${settings.length}\n`);

  console.log('--- Migration complete ---');
}

migrate()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await sourceDb.$disconnect();
    await targetDb.$disconnect();
  });