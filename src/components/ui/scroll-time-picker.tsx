import React, { useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 3;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface ScrollColumnProps {
  items: string[];
  value: string;
  onChange: (value: string) => void;
}

function ScrollColumn({ items, value, onChange }: ScrollColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const scrollToValue = useCallback((val: string, smooth = true) => {
    const idx = items.indexOf(val);
    if (idx === -1 || !containerRef.current) return;
    containerRef.current.scrollTo({
      top: idx * ITEM_HEIGHT,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, [items]);

  useEffect(() => {
    scrollToValue(value, false);
  }, []);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    clearTimeout(timeoutRef.current);
    isScrollingRef.current = true;
    timeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const idx = Math.round(scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(idx, items.length - 1));
      const selected = items[clamped];
      if (selected !== value) {
        onChange(selected);
      }
      // Snap precisely
      containerRef.current.scrollTo({
        top: clamped * ITEM_HEIGHT,
        behavior: 'smooth',
      });
      isScrollingRef.current = false;
    }, 80);
  }, [items, value, onChange]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="relative overflow-y-auto scrollbar-hide"
      style={{
        height: CONTAINER_HEIGHT,
        scrollSnapType: 'y mandatory',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Top/bottom padding so first/last items can center */}
      <div style={{ height: ITEM_HEIGHT }} />
      {items.map((item) => {
        const isSelected = item === value;
        return (
          <div
            key={item}
            className={cn(
              'flex items-center justify-center transition-all duration-150 cursor-pointer select-none',
              isSelected
                ? 'text-foreground font-bold scale-110 opacity-100'
                : 'text-muted-foreground font-medium opacity-40 scale-90'
            )}
            style={{
              height: ITEM_HEIGHT,
              scrollSnapAlign: 'center',
              fontSize: isSelected ? '1.35rem' : '1rem',
            }}
            onClick={() => {
              onChange(item);
              scrollToValue(item);
            }}
          >
            {item}
          </div>
        );
      })}
      <div style={{ height: ITEM_HEIGHT }} />
    </div>
  );
}

interface ScrollTimePickerProps {
  value: string; // HH:mm
  onChange: (value: string) => void;
}

const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

export function ScrollTimePicker({ value, onChange }: ScrollTimePickerProps) {
  const [h, m] = (value || '09:00').split(':');
  const currentHour = hours.includes(h) ? h : '09';
  // Snap minute to nearest 5
  const mNum = parseInt(m || '0', 10);
  const snapped = String(Math.round(mNum / 5) * 5).padStart(2, '0');
  const currentMinute = minutes.includes(snapped) ? snapped : '00';

  return (
    <div className="flex items-center justify-center gap-0 rounded-xl border border-border bg-muted/30 p-2 relative">
      {/* Selection indicator */}
      <div
        className="absolute left-2 right-2 rounded-lg bg-primary/10 border border-primary/20 pointer-events-none"
        style={{ height: ITEM_HEIGHT, top: '50%', transform: 'translateY(-50%)' }}
      />
      <ScrollColumn
        items={hours}
        value={currentHour}
        onChange={(newH) => onChange(`${newH}:${currentMinute}`)}
      />
      <span className="text-xl font-bold text-foreground mx-1 z-10">:</span>
      <ScrollColumn
        items={minutes}
        value={currentMinute}
        onChange={(newM) => onChange(`${currentHour}:${newM}`)}
      />
    </div>
  );
}
