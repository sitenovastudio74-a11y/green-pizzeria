'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Category = {
  id: string;
  name: string;
  imageUrl: string | null;
};

export default function CategoryRail() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch(API_URL + "/categories")
      .then((res) => res.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h2 className="font-display text-2xl sm:text-3xl text-dark mb-6">
        What are you craving?
      </h2>

      <div className="flex gap-5 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {categories.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <Link
              href={"/menu?category=" + cat.id}
              className="flex flex-col items-center gap-2 shrink-0 group"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-cream-soft border border-dark/10 flex items-center justify-center overflow-hidden group-hover:border-primary transition-colors">
                {cat.imageUrl ? (
                  <img src={API_URL + cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display italic text-primary text-lg">
                    {cat.name.charAt(0)}
                  </span>
                )}
              </div>
              <span className="text-sm text-dark text-center max-w-[6rem]">{cat.name}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
