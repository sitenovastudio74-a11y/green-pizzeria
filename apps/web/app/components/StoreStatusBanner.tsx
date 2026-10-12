'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function StoreStatusBanner() {
  const [closed, setClosed] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const r = await fetch(API_URL + '/public-settings/store-status', { cache: 'no-store' });
        if (!r.ok) return;
        const data = await r.json();
        if (cancelled) return;
        setClosed(data.isOpen === false);
        setMessage(typeof data.message === 'string' ? data.message : '');
      } catch {}
    }

    load();
    const timer = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!closed) return null;

  return (
    <div role="status" className="w-full bg-dark text-cream-soft text-center text-sm sm:text-base px-4 py-3">
      {message || "We're closed right now. Please check back soon."}
    </div>
  );
}