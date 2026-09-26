// One-off migration script: migrates 2 specific users + all their connected
// data (addresses, orders, payments, deliveries, reviews, complaints)
// from local dev DB to production (Neon) DB.
// Reads SOURCE_DATABASE_URL / TARGET_DATABASE_URL from .env.migration
// Safe to re-run: uses upsert with preserved IDs.

import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

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

const EMAILS_TO_MIGRATE = ['test@example.com', 'omprakashkumar1384@gmail.com'];

async function migrateUser(email: string) {
  console.log(`\n=== Migrating user: ${email} ===`);

  const user = await sourceDb.user.findUnique({ where: { email } });
  if (!user) {
    console.warn(`  WARNING: no user found in source DB with email ${email}, skipping.`);
    return;
  }

  // Check for email/phone conflicts with a DIFFERENT existing user in target
  const conflictByEmail = await targetDb.user.findFirst({
    where: { email: user.email, NOT: { id: user.id } },
  });
  if (conflictByEmail) {
    console.error(`  ERROR: a different user already exists in target with email ${user.email}. Skipping this user entirely.`);
    return;
  }
  if (user.phone) {
    const conflictByPhone = await targetDb.user.findFirst({
      where: { phone: user.phone, NOT: { id: user.id } },
    });
    if (conflictByPhone) {
      console.error(`  ERROR: a different user already exists in target with phone ${user.phone}. Skipping this user entirely.`);
      return;
    }
  }

  await targetDb.user.upsert({
    where: { id: user.id },
    create: user,
    update: user,
  });
  console.log(`  User row migrated (role: ${user.role})`);

  // Addresses
  const addresses = await sourceDb.address.findMany({ where: { userId: user.id } });
  for (const addr of addresses) {
    await targetDb.address.upsert({ where: { id: addr.id }, create: addr, update: addr });
  }
  console.log(`  Addresses migrated: ${addresses.length}`);

  // Orders (+ nested)
  const orders = await sourceDb.order.findMany({ where: { userId: user.id } });
  for (const order of orders) {
    await targetDb.order.upsert({ where: { id: order.id }, create: order, update: order });

    // OrderItems + their options/addons
    const orderItems = await sourceDb.orderItem.findMany({ where: { orderId: order.id } });
    for (const item of orderItems) {
      await targetDb.orderItem.upsert({ where: { id: item.id }, create: item, update: item });

      const itemOptions = await sourceDb.orderItemOption.findMany({ where: { orderItemId: item.id } });
      for (const io of itemOptions) {
        await targetDb.orderItemOption.upsert({ where: { id: io.id }, create: io, update: io });
      }

      const itemAddons = await sourceDb.orderItemAddon.findMany({ where: { orderItemId: item.id } });
      for (const ia of itemAddons) {
        await targetDb.orderItemAddon.upsert({ where: { id: ia.id }, create: ia, update: ia });
      }
    }

    // OrderComboItems + their selections
    const comboItems = await sourceDb.orderComboItem.findMany({ where: { orderId: order.id } });
    for (const ci of comboItems) {
      await targetDb.orderComboItem.upsert({ where: { id: ci.id }, create: ci, update: ci });

      const selections = await sourceDb.orderComboSelection.findMany({ where: { orderComboItemId: ci.id } });
      for (const sel of selections) {
        await targetDb.orderComboSelection.upsert({ where: { id: sel.id }, create: sel, update: sel });
      }
    }

    // Payment (one-to-one)
    const payment = await sourceDb.payment.findUnique({ where: { orderId: order.id } });
    if (payment) {
      await targetDb.payment.upsert({ where: { id: payment.id }, create: payment, update: payment });
    }

    // Delivery (one-to-one)
    const delivery = await sourceDb.delivery.findUnique({ where: { orderId: order.id } });
    if (delivery) {
      await targetDb.delivery.upsert({ where: { id: delivery.id }, create: delivery, update: delivery });
    }
  }
  console.log(`  Orders migrated: ${orders.length}`);

  // Reviews
  const reviews = await sourceDb.review.findMany({ where: { userId: user.id } });
  for (const review of reviews) {
    await targetDb.review.upsert({ where: { id: review.id }, create: review, update: review });
  }
  console.log(`  Reviews migrated: ${reviews.length}`);

  // Complaints
  const complaints = await sourceDb.complaint.findMany({ where: { userId: user.id } });
  for (const complaint of complaints) {
    await targetDb.complaint.upsert({ where: { id: complaint.id }, create: complaint, update: complaint });
  }
  console.log(`  Complaints migrated: ${complaints.length}`);
}

async function migrate() {
  console.log('--- Starting user data migration: local dev DB -> production Neon DB ---');
  for (const email of EMAILS_TO_MIGRATE) {
    await migrateUser(email);
  }
  console.log('\n--- User data migration complete ---');
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