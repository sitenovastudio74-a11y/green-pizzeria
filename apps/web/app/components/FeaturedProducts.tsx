'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Product = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: string;
  isFeatured: boolean;
};

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch(API_URL + "/products")
      .then((res) => res.json())
      .then((data: Product[]) => setProducts(data.filter((p) => p.isFeatured)))
      .catch(() => setProducts([]));
  }, []);

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h2 className="font-display text-2xl sm:text-3xl text-dark mb-6">
        Most loved
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 sm:gap-8">
        {products.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <Link href={"/menu/" + product.id} className="flex flex-col items-center text-center group">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-cream-soft border border-dark/10 overflow-hidden flex items-center justify-center mb-3 group-hover:border-primary transition-colors">
                {product.imageUrl ? (
                  <img src={API_URL + product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display italic text-primary text-2xl">
                    {product.name.charAt(0)}
                  </span>
                )}
              </div>
              <span className="text-sm sm:text-base text-dark font-medium">{product.name}</span>
              <span className="text-sm text-muted">Rs. {product.basePrice}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
