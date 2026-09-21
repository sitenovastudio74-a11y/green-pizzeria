'use client';

import { motion } from 'motion/react';

const points = [
  {
    title: '100% vegetarian',
    text: 'Every base, sauce, and topping - meat-free, always.',
  },
  {
    title: 'Wood-fired Napoletana',
    text: 'Hand-stretched dough, baked the traditional way.',
  },
  {
    title: 'Fresh, not frozen',
    text: 'Made to order, delivered while it is still hot.',
  },
];

export default function WhyUs() {
  return (
    <section className="bg-dark text-cream-soft">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid sm:grid-cols-3 gap-10 sm:gap-8">
        {points.map((point, i) => (
          <motion.div
            key={point.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className={
              "pt-6 sm:pt-0 sm:px-8 " +
              (i > 0 ? "border-t sm:border-t-0 sm:border-l border-cream-soft/15" : "")
            }
          >
            <h3 className="font-display text-xl sm:text-2xl mb-2">{point.title}</h3>
            <p className="text-cream-soft/70 leading-relaxed">{point.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
