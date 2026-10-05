'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { loadGoogleFont } from '../lib/loadGoogleFont';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type CtaContent = {
  heading: string;
  body: string;
  buttonText: string | null;
  buttonLink: string | null;
  font: string | null;
};

const FALLBACK: CtaContent = {
  heading: 'Hungry already?',
  body: 'Fresh dough, real ingredients, at your door in under an hour.',
  buttonText: 'Order now',
  buttonLink: '/menu',
  font: null,
};

export default function OrderCta() {
  const [content, setContent] = useState<CtaContent>(FALLBACK);

  useEffect(() => {
    fetch(API_URL + '/content/home')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const sections = Array.isArray(data) ? data : [];
        const cta = sections.find((s: any) => s.slot === 'order_cta');
        if (cta) {
          setContent({
            heading: cta.heading || FALLBACK.heading,
            body: cta.body || FALLBACK.body,
            buttonText: cta.buttonText || FALLBACK.buttonText,
            buttonLink: cta.buttonLink || FALLBACK.buttonLink,
            font: cta.font || null,
          });
          if (cta.font) loadGoogleFont(cta.font);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="bg-primary/10 border border-primary/20 rounded-3xl px-8 py-12 sm:py-16 text-center"
      >
        <h2
          className="font-display text-2xl sm:text-3xl text-dark mb-3"
          style={content.font ? { fontFamily: content.font } : undefined}
        >
          {content.heading}
        </h2>
        <p className="text-muted mb-8 max-w-md mx-auto">
          {content.body}
        </p>
        <Link
          href={content.buttonLink || '/menu'}
          className="inline-block rounded-full bg-primary text-cream-soft px-8 py-3.5 hover:bg-primary-soft transition-colors font-medium"
        >
          {content.buttonText || 'Order now'}
        </Link>
      </motion.div>
    </section>
  );
}
