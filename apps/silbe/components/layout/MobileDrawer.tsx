'use client';

import Link from 'next/link';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

const PRIMARY_LINKS = [
  { href: '/editionen', label: 'Editionen' },
  { href: '/bibliothek', label: 'Bibliothek' },
  { href: '/werkstatt', label: 'Werkstatt' },
  { href: '/kontakt', label: 'Kontakt' },
] as const;

const STIMMEN = [
  { href: '/stimmen/rilke', label: 'Rainer Maria Rilke' },
  { href: '/stimmen/kafka', label: 'Franz Kafka' },
  { href: '/stimmen/mann', label: 'Thomas Mann' },
  { href: '/stimmen/zweig', label: 'Stefan Zweig' },
  { href: '/stimmen/ebner-eschenbach', label: 'Marie von Ebner-Eschenbach' },
] as const;

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function MobileDrawer() {
  const [open, setOpen] = useState(false);
  const [stimmenExpanded, setStimmenExpanded] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const previousOverflow = useRef<string>('');
  const dialogId = useId();

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow.current;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const focusables = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    focusables[0]?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  useEffect(() => {
    if (open) return;
    triggerRef.current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Navigation öffnen"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        onClick={() => setOpen(true)}
        style={{
          appearance: 'none',
          background: 'transparent',
          border: 0,
          padding: '8px',
          margin: 0,
          cursor: 'pointer',
          color: 'var(--color-ink)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Menu size={22} strokeWidth={1.25} aria-hidden />
      </button>

      <div
        aria-hidden={!open}
        onClick={close}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'color-mix(in srgb, var(--color-ink) 35%, transparent)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 320ms ease-out',
          zIndex: 60,
        }}
      />

      <div
        ref={dialogRef}
        id={dialogId}
        role="dialog"
        aria-modal="true"
        aria-label="Hauptnavigation"
        aria-hidden={!open}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100dvh',
          width: 'min(86vw, 360px)',
          backgroundColor: 'var(--color-cream)',
          borderRight: '0.5px solid color-mix(in srgb, var(--color-ink) 12%, transparent)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 320ms ease-out',
          zIndex: 70,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          visibility: open ? 'visible' : 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '0.5px solid color-mix(in srgb, var(--color-ink) 12%, transparent)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '11px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-taupe)',
            }}
          >
            Navigation
          </span>
          <button
            type="button"
            aria-label="Navigation schließen"
            onClick={close}
            style={{
              appearance: 'none',
              background: 'transparent',
              border: 0,
              padding: '8px',
              margin: 0,
              cursor: 'pointer',
              color: 'var(--color-ink)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} strokeWidth={1.25} aria-hidden />
          </button>
        </div>

        <nav aria-label="Hauptnavigation" style={{ padding: '24px', flex: 1 }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '4px' }}>
            <li>
              <button
                type="button"
                aria-expanded={stimmenExpanded}
                onClick={() => setStimmenExpanded((v) => !v)}
                style={{
                  appearance: 'none',
                  background: 'transparent',
                  border: 0,
                  padding: '12px 0',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-cormorant), Georgia, serif',
                  fontSize: '24px',
                  color: 'var(--color-ink)',
                }}
              >
                <span>Stimmen</span>
                <ChevronDown
                  size={18}
                  strokeWidth={1.25}
                  aria-hidden
                  style={{
                    transform: stimmenExpanded ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 200ms ease-out',
                  }}
                />
              </button>
              {stimmenExpanded && (
                <ul
                  style={{
                    listStyle: 'none',
                    padding: '4px 0 12px 16px',
                    margin: 0,
                    display: 'grid',
                    gap: '4px',
                    borderLeft: '0.5px solid color-mix(in srgb, var(--color-ink) 15%, transparent)',
                  }}
                >
                  {STIMMEN.map((s) => (
                    <li key={s.href}>
                      <Link
                        href={s.href}
                        onClick={close}
                        style={{
                          fontFamily: 'var(--font-crimson), Georgia, serif',
                          fontSize: '17px',
                          color: 'var(--color-ink)',
                          textDecoration: 'none',
                          display: 'block',
                          padding: '8px 12px',
                        }}
                      >
                        {s.label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link
                      href="/stimmen"
                      onClick={close}
                      style={{
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        fontSize: '13px',
                        color: 'var(--color-taupe)',
                        textDecoration: 'none',
                        display: 'block',
                        padding: '8px 12px',
                      }}
                    >
                      Alle Stimmen →
                    </Link>
                  </li>
                </ul>
              )}
            </li>
            {PRIMARY_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={close}
                  style={{
                    fontFamily: 'var(--font-cormorant), Georgia, serif',
                    fontSize: '24px',
                    color: 'var(--color-ink)',
                    textDecoration: 'none',
                    display: 'block',
                    padding: '12px 0',
                  }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div
          style={{
            padding: '24px',
            borderTop: '0.5px solid color-mix(in srgb, var(--color-ink) 12%, transparent)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-crimson), Georgia, serif',
              fontStyle: 'italic',
              fontSize: '14px',
              color: 'var(--color-taupe)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Kuratiert in Wien · Per Hand
          </p>
        </div>
      </div>
    </>
  );
}
