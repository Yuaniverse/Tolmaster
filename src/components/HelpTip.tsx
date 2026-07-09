"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface HelpTipProps {
  content: React.ReactNode;
  title?: string;
  side?: 'top' | 'bottom';
  maxWidth?: number;
  children?: React.ReactNode;
  iconClassName?: string;
}

const GAP = 8;
const VIEWPORT_MARGIN = 8;

export default function HelpTip({ content, title, side = 'top', maxWidth = 260, children, iconClassName }: HelpTipProps) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; placedBelow: boolean } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const computePosition = () => {
    const trigger = triggerRef.current;
    const tip = tipRef.current;
    if (!trigger || !tip) return;
    const rect = trigger.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();

    let placedBelow = side === 'bottom';
    if (!placedBelow && rect.top - tipRect.height - GAP < VIEWPORT_MARGIN) {
      placedBelow = true;
    } else if (placedBelow && rect.bottom + tipRect.height + GAP > window.innerHeight - VIEWPORT_MARGIN) {
      placedBelow = false;
    }

    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - tipRect.width - VIEWPORT_MARGIN));
    const top = placedBelow ? rect.bottom + GAP : rect.top - tipRect.height - GAP;

    setPos({ left, top, placedBelow });
  };

  useEffect(() => {
    if (!open) return;
    computePosition();
    const close = () => { setOpen(false); setPinned(false); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!pinned) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPinned(false);
        setOpen(false);
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      if (tipRef.current?.contains(e.target as Node)) return;
      setPinned(false);
      setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [pinned]);

  const handleMouseEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(true), 100);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (!pinned) setOpen(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPinned(prev => {
      const next = !prev;
      setOpen(next);
      return next;
    });
  };

  return (
    <span
      ref={triggerRef}
      className="inline-flex items-center cursor-help"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      aria-describedby={open ? 'helptip-portal' : undefined}
    >
      {children ?? <Info className={iconClassName ?? 'w-3.5 h-3.5 opacity-60'} />}
      {open && createPortal(
        <div
          id="helptip-portal"
          ref={tipRef}
          role="tooltip"
          style={{
            position: 'fixed',
            left: pos?.left ?? -9999,
            top: pos?.top ?? -9999,
            maxWidth,
            visibility: pos ? 'visible' : 'hidden'
          }}
          className="z-[100] p-3 bg-[var(--chrome)] text-white text-xs rounded-[var(--r-2)] leading-relaxed shadow-lg whitespace-pre-line pointer-events-none"
        >
          {title && <strong className="block mb-1">{title}</strong>}
          {content}
        </div>,
        document.body
      )}
    </span>
  );
}
