'use client';

import Link from 'next/link';
import { motion } from 'motion/react';

export default function OrderCta() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="bg-primary/10 border border-primary/20 rounded-3xl px-8 py-12 sm:py-16 text-center"
      >
        <h2 className="font-display text-2xl sm:text-3xl text-dark mb-3">
          Hungry already?
        </h2>
        <p className="text-muted mb-8 max-w-md mx-auto">
          Fresh dough, real ingredients, at your door in under an hour.
        </p>
        <Link
          href="/menu"
          className="inline-block rounded-full bg-primary text-cream-soft px-8 py-3.5 hover:bg-primary-soft transition-colors font-medium"
        >
          Order now
        </Link>
      </motion.div>
    </section>
  );
}
