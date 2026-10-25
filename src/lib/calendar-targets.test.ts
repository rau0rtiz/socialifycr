import { describe, expect, it } from 'vitest';
import { deliveryProgress, deliveryType, validDeliveryTarget } from './calendar-targets';

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

describe('deliveryType', () => {
  it('resolves known types and falls back to otro', () => {
    expect(deliveryType('carrusel').label).toBe('Carrusel');
    expect(deliveryType('correo').label).toBe('Correo');
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
