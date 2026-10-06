'use client';

import { useEffect, useRef, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type PublicTestimonial = {
  id: string;
  name: string;
  rating: number;
  comment: string;
  source: string | null;
  photoUrl: string | null;
  linkUrl: string | null;
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={rating + ' out of 5 stars'}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          viewBox="0 0 20 20"
          className={'w-4 h-4 ' + (n <= rating ? 'text-primary' : 'text-primary/25')}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 1.5l2.6 5.5 6 .8-4.4 4.2 1.1 6L10 15.1 4.7 18l1.1-6L1.4 7.8l6-.8L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

function Avatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  if (photoUrl && !failed) {
    return (
      <img
        src={photoUrl}
        alt={name}
        loading="lazy"
        draggable={false}
        onError={() => setFailed(true)}
        className="w-11 h-11 rounded-full object-cover shrink-0 border border-primary/20"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="w-11 h-11 rounded-full bg-primary text-cream-soft flex items-center justify-center font-medium shrink-0"
    >
      {initial}
    </div>
  );
}

function Card({ t, dup }: { t: PublicTestimonial; dup?: boolean }) {
  const base =
    'w-72 sm:w-80 shrink-0 rounded-2xl border border-primary/15 bg-cream-soft p-5 flex flex-col gap-3';
  let label: string | null =
    t.source === 'Website order' ? 'Verified order' : t.source ? 'via ' + t.source : null;
  if (t.linkUrl) label = label ? label + ' \u2197' : 'View review \u2197';

  const body = (
    <>
      <div className="flex items-center gap-3">
        <Avatar name={t.name} photoUrl={t.photoUrl} />
        <div className="min-w-0">
          <p className="font-medium text-dark text-sm truncate">{t.name}</p>
          {label && <p className="text-xs text-muted truncate">{label}</p>}
        </div>
      </div>
      <Stars rating={t.rating} />
      <p className="text-dark text-sm leading-relaxed line-clamp-5">{t.comment}</p>
    </>
  );

  if (t.linkUrl) {
    return (
      <a
        href={t.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        draggable={false}
        tabIndex={dup ? -1 : undefined}
        className={base + ' transition-shadow hover:shadow-md hover:border-primary/40'}
      >
        {body}
      </a>
    );
  }
  return <div className={base}>{body}</div>;
}

export default function Reviews() {
  const [items, setItems] = useState<PublicTestimonial[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(API_URL + '/testimonials/public')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch(() => {});
  }, []);

  const ready = items.length >= 3;

  const hold = () => {
    pausedRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const releaseAfter = (ms: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, ms);
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!ready || !el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let last = performance.now();
    let pos = el.scrollLeft;
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      if (pausedRef.current) {
        pos = el.scrollLeft;
      } else {
        pos += (45 * dt) / 1000;
        const half = el.scrollWidth / 2;
        if (half > 0 && pos >= half) pos -= half;
        el.scrollLeft = pos;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [ready]);

  const nudge = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    hold();
    el.scrollBy({ left: dir * 320, behavior: 'smooth' });
    releaseAfter(3500);
  };

  if (!ready) return null;

  return (
    <section className="pb-16 sm:pb-24">
      <style>{`
        .gp-rv-scroller{overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;-webkit-mask-image:linear-gradient(to right,transparent,#000 4%,#000 96%,transparent);mask-image:linear-gradient(to right,transparent,#000 4%,#000 96%,transparent);}
        .gp-rv-scroller::-webkit-scrollbar{display:none;}
        .gp-rv-track{display:flex;width:max-content;}
        .gp-rv-set{display:flex;gap:1.25rem;padding-right:1.25rem;}
        @media (prefers-reduced-motion: reduce){
          .gp-rv-dup{display:none;}
          .gp-rv-set{padding-left:1rem;}
          .gp-rv-scroller{-webkit-mask-image:none;mask-image:none;}
        }
      `}</style>
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 mb-8 text-center">
        <h2 className="font-display text-2xl sm:text-3xl text-dark">What our customers say</h2>
        <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 hidden sm:flex gap-2">
          <button
            type="button"
            aria-label="Previous reviews"
            onClick={() => nudge(-1)}
            className="w-9 h-9 rounded-full border border-primary/30 text-primary text-lg leading-none hover:bg-primary/10"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next reviews"
            onClick={() => nudge(1)}
            className="w-9 h-9 rounded-full border border-primary/30 text-primary text-lg leading-none hover:bg-primary/10"
          >
            ›
          </button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="gp-rv-scroller"
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') hold();
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') releaseAfter(300);
        }}
        onTouchStart={hold}
        onTouchEnd={() => releaseAfter(3000)}
        onTouchCancel={() => releaseAfter(3000)}
        onWheel={() => {
          hold();
          releaseAfter(2500);
        }}
      >
        <div className="gp-rv-track">
          <div className="gp-rv-set">
            {items.map((t) => (
              <Card key={t.id} t={t} />
            ))}
          </div>
          <div className="gp-rv-set gp-rv-dup" aria-hidden="true">
            {items.map((t) => (
              <Card key={'dup-' + t.id} t={t} dup />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}