import { describe, expect, it } from 'vitest';
import { DELIVERY_TYPES, PIECE_TYPES, deliveryProgress, deliveryType, validDeliveryTarget } from './calendar-targets';

const month = '2026-10-01';

describe('deliveryProgress', () => {
  it('counts scheduled pieces per type against fixed targets', () => {
    const items = [
      { publish_date: '2026-10-05', content_type: 'reel' },
      { publish_date: '2026-10-12', content_type: 'reel' },
      { publish_date: '2026-10-06', content_type: 'foto' },
      { publish_date: '2026-11-02', content_type: 'reel' }, // other month
      { publish_date: null, content_type: 'foto' }, // unscheduled
    ];
    const targets = [
      { client_id: 'c1', content_type: 'reel', monthly_target: 4 },
      { client_id: 'c1', content_type: 'foto', monthly_target: 4 },
    ];
    const p = deliveryProgress(items, month, targets, '2026-10-15');
    const reel = p.types.find((t) => t.type.value === 'reel')!;
    const foto = p.types.find((t) => t.type.value === 'foto')!;
    expect(reel.scheduled).toBe(2);
    expect(foto.scheduled).toBe(1);
    expect(p.totalTarget).toBe(8);
    expect(p.totalScheduled).toBe(3);
  });

  it('counts TikToks and Shorts toward the reels target', () => {
    const items = [
      { publish_date: '2026-10-05', content_type: 'reel' },
      { publish_date: '2026-10-08', content_type: 'tiktok' },
      { publish_date: '2026-10-09', content_type: 'short' },
      { publish_date: '2026-10-20', content_type: 'story' }, // not video
    ];
    const targets = [{ client_id: 'c1', content_type: 'reel', monthly_target: 4 }];
    const p = deliveryProgress(items, month, targets, '2026-10-15');
    expect(p.types).toHaveLength(1);
    expect(p.types[0].type.value).toBe('reel');
    expect(p.types[0].scheduled).toBe(3);
    expect(p.totalScheduled).toBe(3);
  });

  it('merges legacy TikTok/Short target rows into one reels bucket', () => {
    const items = [
      { publish_date: '2026-10-02', content_type: 'tiktok' },
      { publish_date: '2026-10-03', content_type: 'short' },
    ];
    const targets = [
      { client_id: 'c1', content_type: 'reel', monthly_target: 2 },
      { client_id: 'c1', content_type: 'tiktok', monthly_target: 1 },
      { client_id: 'c1', content_type: 'short', monthly_target: 1 },
    ];
    const p = deliveryProgress(items, month, targets, '2026-10-15');
    expect(p.types).toHaveLength(1);
    expect(p.types[0].target).toBe(4);
    expect(p.types[0].scheduled).toBe(2);
    expect(p.totalTarget).toBe(4);
  });

  it('marks a type behind when due pieces fall short of elapsed-month pace', () => {
    // Mid-month (15 of 31): expected ceil(4 * 15/31) = 2 reels due by today, only 1 scheduled.
    const items = [{ publish_date: '2026-10-10', content_type: 'reel' }];
    const targets = [{ client_id: 'c1', content_type: 'reel', monthly_target: 4 }];
    const p = deliveryProgress(items, month, targets, '2026-10-15');
    expect(p.types[0].expected).toBe(2);
    expect(p.types[0].pace).toBe('behind');
    expect(p.pace).toBe('behind');
  });

  it('is on-track when due pieces cover the elapsed pace', () => {
    const items = [
      { publish_date: '2026-10-03', content_type: 'reel' },
      { publish_date: '2026-10-10', content_type: 'reel' },
    ];
    const targets = [{ client_id: 'c1', content_type: 'reel', monthly_target: 4 }];
    expect(deliveryProgress(items, month, targets, '2026-10-15').pace).toBe('on-track');
  });

  it('ignores types without a target and reports unset when no targets exist', () => {
    const items = [{ publish_date: '2026-10-05', content_type: 'story' }];
    expect(deliveryProgress(items, month, [], '2026-10-15').pace).toBe('unset');
    const p = deliveryProgress(items, month, [{ client_id: 'c1', content_type: 'reel', monthly_target: 4 }], '2026-10-15');
    expect(p.types).toHaveLength(1);
    expect(p.types[0].type.value).toBe('reel');
  });

  it('treats future months as not yet started', () => {
    const targets = [{ client_id: 'c1', content_type: 'reel', monthly_target: 4 }];
    expect(deliveryProgress([], '2026-12-01', targets, '2026-10-15').pace).toBe('future');
  });
});

describe('delivery buckets', () => {
  it('offers one editable delivery row for vertical video', () => {
    expect(DELIVERY_TYPES.map((t) => t.value)).not.toContain('tiktok');
    expect(DELIVERY_TYPES.map((t) => t.value)).not.toContain('short');
    expect(DELIVERY_TYPES.find((t) => t.value === 'reel')!.plural).toBe('Reels / TikToks / Shorts');
  });

  it('keeps TikTok and Short selectable as piece types', () => {
    expect(PIECE_TYPES.map((t) => t.value)).toEqual(
      expect.arrayContaining(['reel', 'tiktok', 'short', 'story', 'foto', 'post', 'carrusel', 'diseno', 'correo', 'otro']),
    );
  });
});

describe('deliveryType', () => {
  it('resolves known types and falls back to otro', () => {
    expect(deliveryType('carrusel').label).toBe('Carrusel');
    expect(deliveryType('correo').label).toBe('Correo');
    expect(deliveryType('tiktok').label).toBe('TikTok');
    expect(deliveryType('short').label).toBe('Short');
    expect(deliveryType(null).value).toBe('otro');
    expect(deliveryType('inventado').value).toBe('otro');
  });
});

describe('validDeliveryTarget', () => {
  it('accepts integers from 0 to 10000', () => {
    expect(validDeliveryTarget(0)).toBe(true);
    expect(validDeliveryTarget(4)).toBe(true);
    expect(validDeliveryTarget(-1)).toBe(false);
    expect(validDeliveryTarget(2.5)).toBe(false);
    expect(validDeliveryTarget(10001)).toBe(false);
  });
});
