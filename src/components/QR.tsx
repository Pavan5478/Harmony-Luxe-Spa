"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export default function QR({
  text,
  size = 256,
}: {
  text: string;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, text, {
      width: size,
      margin: 1,
    });
  }, [text, size]);

  return (
    <canvas
      ref={ref}
      className="rounded-2xl bg-white p-2 shadow-sm"
      style={{ width: size, height: size }}
    />
  );
}