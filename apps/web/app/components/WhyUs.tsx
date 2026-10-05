'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { loadGoogleFont } from '../lib/loadGoogleFont';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Point = { title: string; text: string; font: string | null };

const FALLBACK: Point[] = [
  { title: '100% vegetarian', text: 'Every base, sauce, and topping - meat-free, always.', font: null },
  { title: 'Wood-fired Napoletana', text: 'Hand-stretched dough, baked the traditional way.', font: null },
  { title: 'Fresh, not frozen', text: 'Made to order, delivered while it is still hot.', font: null },
];

export default function WhyUs() {
  const [points, setPoints] = useState<Point[]>(FALLBACK);

  useEffect(() => {
    fetch(API_URL + '/content/home')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const sections = Array.isArray(data) ? data : [];
        const slots = ['why_us_1', 'why_us_2', 'why_us_3'];
        const found = slots
          .map((slot) => sections.find((s: any) => s.slot === slot))
          .filter(Boolean);
        if (found.length === 3) {
          const next = found.map((s: any, i: number) => ({
            title: s.heading || FALLBACK[i].title,
            text: s.body || FALLBACK[i].text,
            font: s.font || null,
          }));
          setPoints(next);
          next.forEach((p) => p.font && loadGoogleFont(p.font));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="bg-dark text-cream-soft">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid sm:grid-cols-3 gap-10 sm:gap-8">
        {points.map((point, i) => (
          <motion.div
            key={point.title + i}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className={
              "pt-6 sm:pt-0 sm:px-8 " +
              (i > 0 ? "border-t sm:border-t-0 sm:border-l border-cream-soft/15" : "")
            }
          >
            <h3
              className="font-display text-xl sm:text-2xl mb-2"
              style={point.font ? { fontFamily: point.font } : undefined}
            >
              {point.title}
            </h3>
            <p className="text-cream-soft/70 leading-relaxed">{point.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
