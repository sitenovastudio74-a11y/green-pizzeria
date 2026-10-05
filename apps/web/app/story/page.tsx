'use client';

import { Fragment, useEffect, useState } from 'react';
import { loadGoogleFont } from '../lib/loadGoogleFont';
import { useSectionText, fontStyle } from '../lib/useSectionText';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type StoryBlock = {
  id: string;
  type: 'TEXT' | 'HEADING' | 'IMAGE' | 'LIST';
  content: string;
  imageUrl: string | null;
  linkText: string | null;
  linkUrl: string | null;
  font: string | null;
  sortOrder: number;
};

function renderBlock(b: StoryBlock) {
  const style = b.font ? { fontFamily: b.font } : undefined;

  if (b.type === 'HEADING') {
    return (
      <h2 key={b.id} className="text-xl font-semibold mt-10 mb-3" style={style}>
        {b.content}
      </h2>
    );
  }

  if (b.type === 'IMAGE') {
    if (!b.imageUrl) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img key={b.id} src={b.imageUrl} alt={b.content || 'Green Pizzeria'} className="w-full rounded-xl my-6" />
    );
  }

  if (b.type === 'LIST') {
    const items = b.content.split('\n').map((s) => s.trim()).filter(Boolean);
    return (
      <ul key={b.id} className="text-muted space-y-2 list-disc pl-5" style={style}>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }

  const parts = b.content.split('{{LINK}}');
  const hasLink = !!b.linkText && !!b.linkUrl;
  return (
    <p key={b.id} className="text-muted mb-4" style={style}>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 && hasLink ? (
            <a href={b.linkUrl as string} className="text-green-600 font-medium">
              {b.linkText}
            </a>
          ) : null}
        </Fragment>
      ))}
    </p>
  );
}

function FallbackBody() {
  return (
    <>
      <p className="text-muted mb-4">
        Green Pizzeria was born out of a simple idea: pizza in India deserves to
        be made the way it is in Naples - hand-stretched, wood-fired, and built
        on honest ingredients, with nothing to hide behind heavy toppings or
        shortcuts.
      </p>

      <p className="text-muted mb-4">
        Every pizza we make starts with a slow-proofed Napoletana dough, topped
        with fresh vegetables, quality cheese, and sauces made in-house. We are
        proud to be a 100% vegetarian kitchen - it is not a limitation, it is a
        craft, and we have spent real time getting the balance of flavour and
        texture right without ever reaching for meat as a shortcut.
      </p>

      <p className="text-muted mb-4">
        We are based in Ashok Vihar, Delhi, and we bake, box and deliver every
        order ourselves - no matter if you are dining in, picking up, or having
        it delivered to your door. From our combos to our build-your-own options,
        everything on the menu is designed to be shared, customised, and enjoyed
        fresh out of the oven.
      </p>

      <p className="text-muted mb-4">
        Whether it is a quiet weeknight dinner or a celebration with friends, our
        goal is the same every time: a genuinely good, honest slice of Italy,
        made fresh for you.
      </p>

      <h2 className="text-xl font-semibold mt-10 mb-3">What makes us different</h2>
      <ul className="text-muted space-y-2 list-disc pl-5">
        <li>100% vegetarian kitchen, every single item on the menu</li>
        <li>Hand-stretched, wood-fired Napoletana-style dough</li>
        <li>Fresh, in-house sauces and no artificial shortcuts</li>
        <li>Dine-in, takeaway, and delivery - all made and packed with the same care</li>
        <li>Combos and customisable options built for sharing</li>
      </ul>

      <h2 className="text-xl font-semibold mt-10 mb-3">Get in touch</h2>
      <p className="text-muted">
        Have a question, feedback, or a special request? We would love to hear
        from you - visit our{" "}
        <a href="/contact" className="text-green-600 font-medium">Contact Us page</a>
        {" "}for our phone, email, and address.
      </p>
    </>
  );
}

export default function StoryPage() {
  const [blocks, setBlocks] = useState<StoryBlock[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'fallback'>('loading');
  const title = useSectionText('story_title', 'Our story', 'Inter');

  useEffect(() => {
    fetch(API_URL + '/content/story')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list: StoryBlock[] = Array.isArray(data) ? data : [];
        if (list.length === 0) {
          setStatus('fallback');
          return;
        }
        const sorted = [...list].sort((a, b) => a.sortOrder - b.sortOrder);
        const fonts = new Set<string>();
        sorted.forEach((b) => {
          if (b.font) fonts.add(b.font);
        });
        fonts.forEach((f) => loadGoogleFont(f));
        setBlocks(sorted);
        setStatus('ok');
      })
      .catch(() => setStatus('fallback'));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold mb-6" style={fontStyle(title.font)}>{title.text}</h1>
      {status === 'ok' && blocks.map((b) => renderBlock(b))}
      {status === 'fallback' && <FallbackBody />}
    </div>
  );
}