"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";

type OrderSummary = {
  id: string;
  status: string;
};

const POLL_INTERVAL_MS = 8000;

export default function OrderRingAlert() {
  const router = useRouter();
  const [newOrderCount, setNewOrderCount] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);
  const ringingRef = useRef(false);
  const ringOscillatorRef = useRef<OscillatorNode | null>(null);
  const ringLfoRef = useRef<OscillatorNode | null>(null);
  const ringGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    const unlock = () => {
      if (audioUnlockedRef.current) return;
      try {
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        const ctx: AudioContext = new AudioContextClass();
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        audioCtxRef.current = ctx;
        audioUnlockedRef.current = true;
      } catch {
      }
    };
    document.addEventListener("click", unlock);
    document.addEventListener("keydown", unlock);
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  const startRingLoop = () => {
    if (ringingRef.current) return;
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    ringingRef.current = true;

    // Continuous phone-style ring: a steady tone whose volume is
    // warbled by a low-frequency oscillator, so it keeps ringing
    // without gaps of silence until stopRingLoop() is called.
    const carrier = ctx.createOscillator();
    carrier.type = "sine";
    carrier.frequency.value = 950;

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 5.5;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.28;

    const mainGain = ctx.createGain();
    mainGain.gain.value = 0.28;

    lfo.connect(lfoGain);
    lfoGain.connect(mainGain.gain);
    carrier.connect(mainGain);
    mainGain.connect(ctx.destination);

    carrier.start();
    lfo.start();

    ringOscillatorRef.current = carrier;
    ringLfoRef.current = lfo;
    ringGainRef.current = mainGain;
  };

  const stopRingLoop = () => {
    ringingRef.current = false;
    try {
      ringOscillatorRef.current?.stop();
    } catch {}
    try {
      ringLfoRef.current?.stop();
    } catch {}
    ringOscillatorRef.current = null;
    ringLfoRef.current = null;
    ringGainRef.current = null;
  };

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const r = await apiFetch("/orders");
        if (!r.ok) return;
        const data: OrderSummary[] = await r.json();
        if (cancelled) return;

        const pending = data.filter((o) => o.status === "PAYMENT_SUCCESS");
        setNewOrderCount(pending.length);

        if (pending.length > 0) {
          startRingLoop();
        } else {
          stopRingLoop();
        }
      } catch {
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      stopRingLoop();
    };
  }, []);

  if (newOrderCount === 0) return null;

  return (
    <button
      onClick={() => router.push("/admin/kitchen")}
      className="fixed top-4 right-4 z-50 bg-red-600 text-white rounded-full px-4 py-2.5 text-sm font-medium shadow-lg flex items-center gap-2 animate-pulse"
    >
      🔔 {newOrderCount} new order{newOrderCount === 1 ? "" : "s"}! — click to view
    </button>
  );
}
