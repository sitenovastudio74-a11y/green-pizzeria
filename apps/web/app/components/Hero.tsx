'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import { loadGoogleFont } from '../lib/loadGoogleFont';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type HeroContent = {
  tagline: string | null;
  heading: string;
  body: string;
  imageUrl: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  font: string | null;
};

const FALLBACK: HeroContent = {
  tagline: '100% vegetarian \u00b7 Napoletana',
  heading: 'A slice of Italy, made fresh for you.',
  body: 'Hand-stretched Napoletana pizza, baked the way it should be. No shortcuts, no compromises, just honest ingredients.',
  imageUrl: '/hero-pizza.png',
  buttonText: 'Explore menu',
  buttonLink: '/menu',
  font: null,
};

export default function Hero() {
  const [content, setContent] = useState<HeroContent>(FALLBACK);

  useEffect(() => {
    fetch(API_URL + '/content/home')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const sections = Array.isArray(data) ? data : [];
        const hero = sections.find((s: any) => s.slot === 'hero');
        if (hero) {
          setContent({
            tagline: hero.tagline || FALLBACK.tagline,
            heading: hero.heading || FALLBACK.heading,
            body: hero.body || FALLBACK.body,
            imageUrl: hero.imageUrl || FALLBACK.imageUrl,
            buttonText: hero.buttonText || FALLBACK.buttonText,
            buttonLink: hero.buttonLink || FALLBACK.buttonLink,
            font: hero.font || null,
          });
          if (hero.font) loadGoogleFont(hero.font);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 grid md:grid-cols-2 gap-10 items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <span className="font-tagline inline-block text-lg text-primary bg-primary/10 rounded-full px-4 py-1.5 mb-6">
          {content.tagline}
        </span>

        <h1
          className="font-display text-4xl sm:text-5xl md:text-6xl leading-tight text-dark mb-6 max-w-lg"
          style={content.font ? { fontFamily: content.font } : undefined}
        >
          {content.heading}
        </h1>

        <p className="text-muted max-w-md mb-8 text-base sm:text-lg">
          {content.body}
        </p>

        <div className="flex flex-wrap gap-4">
          <Link
            href={content.buttonLink || '/menu'}
            className="rounded-full bg-primary text-cream-soft px-7 py-3 hover:bg-primary-soft transition-colors"
          >
            {content.buttonText || 'Explore menu'}
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
              src={content.imageUrl || '/hero-pizza.png'}
              alt="Fresh Napoletana pizza with basil, peppers and olives"
              fill
              sizes="(max-width: 640px) 288px, 384px"
              className="object-cover"
              priority
              unoptimized={!!content.imageUrl && content.imageUrl.startsWith('http')}
            />
            <div className="absolute inset-0 bg-primary mix-blend-multiply opacity-[0.07]" />
            <div className="absolute inset-0 bg-gradient-to-t from-dark/15 via-transparent to-transparent" />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
