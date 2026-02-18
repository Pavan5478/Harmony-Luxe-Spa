// src/components/billing/CustomerCard.tsx
"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { CustomerDraft } from "@/types/billing";

type Props = {
  value: CustomerDraft;
  onChange: (v: CustomerDraft) => void;
  /** Optional extra classes so the parent can control box vs. flat layout */
  className?: string;
  /** Optional: show compact helper row */
  compactHint?: boolean;
};

function onlyDigits(s: string) {
  return s.replace(/\D+/g, "");
}

function formatIndianPhone(raw: string) {
  const d = onlyDigits(raw).slice(0, 10);
  // simple: 98765 43210
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)} ${d.slice(5)}`;
}

function isValidPhone10(raw: string) {
  const d = onlyDigits(raw);
  return d.length === 10;
}

function looksLikeEmail(raw: string) {
  const v = raw.trim();
  if (!v) return true; // optional
  // lightweight email check (fast + good UX)
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

export default function CustomerCard({
  value,
  onChange,
  className,
  compactHint = false,
}: Props) {
  const uid = useId();
  const nameId = `${uid}-name`;
  const phoneId = `${uid}-phone`;
  const emailId = `${uid}-email`;
  const helpId = `${uid}-help`;

  const nameRef = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);

  const [touched, setTouched] = useState({
    name: false,
    phone: false,
    email: false,
  });

  const name = (value.name ?? "").trim();
  const phoneRaw = value.phone ?? "";
  const email = (value.email ?? "").trim();

  const phoneDigits = useMemo(() => onlyDigits(phoneRaw), [phoneRaw]);

  const errors = useMemo(() => {
    const e: { name?: string; phone?: string; email?: string } = {};

    if (touched.name && name.length === 0) e.name = "Enter customer name.";
    if (touched.phone && !isValidPhone10(phoneRaw))
      e.phone = "Enter a valid 10-digit phone number.";
    if (touched.email && !looksLikeEmail(email))
      e.email = "Enter a valid email address (or leave blank).";

    return e;
  }, [touched, name, phoneRaw, email]);

  const isComplete = name.length > 0 && isValidPhone10(phoneRaw) && looksLikeEmail(email);

  function setField<K extends keyof CustomerDraft>(key: K, next: CustomerDraft[K]) {
    onChange({ ...value, [key]: next });
  }

  function onNameChange(next: string) {
    setField("name", next);
  }

  function onPhoneChange(next: string) {
    // allow +91 users to paste, strip to 10 digits
    const formatted = formatIndianPhone(next);
    setField("phone", formatted);
  }

  function onEmailChange(next: string) {
    setField("email", next);
  }

  function onKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    field: "name" | "phone" | "email",
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      // Move to next field (fast billing keyboard flow)
      if (field === "name") phoneRef.current?.focus();
      if (field === "phone") emailRef.current?.focus();
      if (field === "email") emailRef.current?.blur();
    }

    // ESC clears the current field (quick ops)
    if (e.key === "Escape") {
      e.preventDefault();
      if (field === "name") onNameChange("");
      if (field === "phone") onPhoneChange("");
      if (field === "email") onEmailChange("");
    }
  }

  const base = "rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5";
  const classes = [base, className].filter(Boolean).join(" ");

  return (
    <section className={classes} aria-labelledby={`${uid}-title`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id={`${uid}-title`}
            className="text-sm font-semibold text-foreground sm:text-base"
          >
            Customer details
          </h2>
          {/* {!compactHint && (
            <p id={helpId} className="mt-1 text-[11px] text-muted">
              Name & phone are required. Email is optional.
            </p>
          )} */}
        </div>

        {/* status pill */}
        <span
          className={[
            "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
            isComplete
              ? "bg-success/15 text-success"
              : "bg-warning/15 text-warning",
          ].join(" ")}
          aria-live="polite"
        >
          {isComplete ? "Ready" : "Required"}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {/* Name */}
        <div className="field">
          <label htmlFor={nameId} className="field-label">
            Name <span className="text-danger">*</span>
          </label>
          <input
            ref={nameRef}
            id={nameId}
            type="text"
            inputMode="text"
            autoComplete="name"
            placeholder="Customer name"
            value={value.name ?? ""}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, name: true }))}
            onKeyDown={(e) => onKeyDown(e, "name")}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${nameId}-err` : helpId}
            className={[
              "rounded-full border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none",
              "focus-visible:ring-2 focus-visible:ring-primary",
              errors.name ? "border-danger/60 ring-0" : "border-border",
            ].join(" ")}
          />
          {errors.name && (
            <p id={`${nameId}-err`} className="mt-1 text-[11px] font-medium text-danger">
              {errors.name}
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="field">
          <label htmlFor={phoneId} className="field-label">
            Phone <span className="text-danger">*</span>
          </label>
          <input
            ref={phoneRef}
            id={phoneId}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="10-digit phone"
            value={phoneRaw}
            onChange={(e) => onPhoneChange(e.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
            onKeyDown={(e) => onKeyDown(e, "phone")}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? `${phoneId}-err` : `${phoneId}-hint`}
            className={[
              "rounded-full border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none",
              "focus-visible:ring-2 focus-visible:ring-primary",
              errors.phone ? "border-danger/60 ring-0" : "border-border",
            ].join(" ")}
          />
          <div className="mt-1 flex items-center justify-between gap-2">
            <p id={`${phoneId}-hint`} className="text-[11px] text-muted">
              {phoneDigits.length}/10 digits
            </p>
            {phoneDigits.length === 10 && !errors.phone && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Valid
              </span>
            )}
          </div>
          {errors.phone && (
            <p id={`${phoneId}-err`} className="mt-1 text-[11px] font-medium text-danger">
              {errors.phone}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="field">
          <label htmlFor={emailId} className="field-label">
            Email <span className="text-muted">(optional)</span>
          </label>
          <input
            ref={emailRef}
            id={emailId}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="example@email.com"
            value={value.email ?? ""}
            onChange={(e) => onEmailChange(e.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, email: true }))}
            onKeyDown={(e) => onKeyDown(e, "email")}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${emailId}-err` : `${emailId}-hint`}
            className={[
              "rounded-full border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none",
              "focus-visible:ring-2 focus-visible:ring-primary",
              errors.email ? "border-danger/60 ring-0" : "border-border",
            ].join(" ")}
          />
          <p id={`${emailId}-hint`} className="mt-1 text-[11px] text-muted">
            Used for sending invoices later.
          </p>
          {errors.email && (
            <p id={`${emailId}-err`} className="mt-1 text-[11px] font-medium text-danger">
              {errors.email}
            </p>
          )}
        </div>
      </div>

      {/* compact hint row (optional) */}
      {compactHint && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
              Enter
            </kbd>
            next field
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
              Esc
            </kbd>
            clear field
          </span>
        </div>
      )}
    </section>
  );
}
