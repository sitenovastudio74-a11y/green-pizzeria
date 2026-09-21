'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isLoggedIn } from '../login/page';

const links = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/story', label: 'Our story' },
  { href: '/offers', label: 'Offers' },
  { href: '/track', label: 'Track order' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, [pathname]);

  const barBase = "block h-0.5 w-6 bg-dark transition-transform";
  const barTop = open ? barBase + " translate-y-2 rotate-45" : barBase;
  const barMid = open ? "block h-0.5 w-6 bg-dark transition-opacity opacity-0" : "block h-0.5 w-6 bg-dark transition-opacity";
  const barBottom = open ? barBase + " -translate-y-2 -rotate-45" : barBase;

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="sticky top-0 z-50 bg-cream/95 backdrop-blur border-b border-dark/10"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
        <Link href="/" className="font-brand font-black not-italic text-xl sm:text-2xl text-primary shrink-0">
          Green Pizzeria
        </Link>

        <nav className="hidden lg:flex items-center gap-8 text-sm text-dark">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-primary transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-5 text-sm text-dark shrink-0">
          <Link href="/account" className="hover:text-primary transition-colors">
            {loggedIn ? "Account" : "Log in"}
          </Link>
          <Link
            href="/cart"
            className="rounded-full bg-primary text-cream-soft px-4 py-2 hover:bg-primary-soft transition-colors"
          >
            Cart
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          className="lg:hidden flex flex-col gap-1.5 p-2 shrink-0"
        >
          <span className={barTop} />
          <span className={barMid} />
          <span className={barBottom} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="lg:hidden overflow-hidden border-t border-dark/10"
          >
            <div className="px-4 sm:px-6 py-4 flex flex-col gap-4 text-sm text-dark">
              {links.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              ))}
              <Link href="/account" onClick={() => setOpen(false)}>{loggedIn ? "Account" : "Log in"}</Link>
              <Link
                href="/cart"
                onClick={() => setOpen(false)}
                className="rounded-full bg-primary text-cream-soft px-4 py-2 text-center"
              >
                Cart
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
