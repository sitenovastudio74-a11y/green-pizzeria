'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';

export default function Hero() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 grid md:grid-cols-2 gap-10 items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <span className="font-tagline inline-block text-lg text-primary bg-primary/10 rounded-full px-4 py-1.5 mb-6">
          100% vegetarian &middot; Napoletana
        </span>

        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-tight text-dark mb-6 max-w-lg">
          A slice of Italy, made fresh for you.
        </h1>

        <p className="text-muted max-w-md mb-8 text-base sm:text-lg">
          Hand-stretched Napoletana pizza, baked the way it should be.
          No shortcuts, no compromises, just honest ingredients.
        </p>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/menu"
            className="rounded-full bg-primary text-cream-soft px-7 py-3 hover:bg-primary-soft transition-colors"
          >
            Explore menu
          </Link>
          <Link
            href="/menu"
            className="rounded-full border border-dark/20 text-dark px-7 py-3 hover:border-primary hover:text-primary transition-colors"
          >
            Order now
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, rotate: -6, scale: 0.94 }}
        animate={{ opacity: 1, rotate: -3, scale: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
        className="relative flex items-center justify-center py-6"
      >
        <div className="relative bg-cream-soft p-3 pb-5 rounded-2xl shadow-2xl">
          <div className="relative w-72 h-52 sm:w-96 sm:h-72 rounded-lg overflow-hidden">
            <Image
              src="/hero-pizza.png"
              alt="Fresh Napoletana pizza with basil, peppers and olives"
              fill
              sizes="(max-width: 640px) 288px, 384px"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-primary mix-blend-multiply opacity-[0.07]" />
            <div className="absolute inset-0 bg-gradient-to-t from-dark/15 via-transparent to-transparent" />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
