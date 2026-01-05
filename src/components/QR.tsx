"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export default function QR({ text, size = 256 }: { text: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const renderSize = Math.round(size * dpr);

    QRCode.toCanvas(ref.current, text, {
      width: renderSize,
      margin: 1,
      errorCorrectionLevel: "M",
    });

    // keep it visually the requested size
    ref.current.style.width = `${size}px`;
    ref.current.style.height = `${size}px`;
  }, [text, size]);

  return <canvas ref={ref} className="rounded-2xl bg-white p-2 shadow-sm" />;
}