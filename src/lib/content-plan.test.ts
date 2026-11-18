import { describe, it, expect } from 'vitest';
import { buildContentPlanHtml, parseContentPlan, resizePieces, countByTag, emptyPlan, emptyPiece } from './content-plan';

describe('content plan', () => {
  it('resizes keeping filled pieces', () => {
    const p = resizePieces([], 3);
    p[0].title = 'Hook';
    const q = resizePieces(p, 5);
    expect(q).toHaveLength(5);
    expect(q[0].title).toBe('Hook');
    expect(resizePieces(q, 2)).toHaveLength(2);
  });
  it('ambos counts as anuncio and orgánico', () => {
    const a = { ...emptyPiece(1), usage: 'ambos' as const, goal: 'venta' as const };
    expect(countByTag([a])).toEqual({ anuncio: 1, organico: 1, venta: 1, trafico: 0 });
  });
  it('round-trips data through html', () => {
    const d = { ...emptyPlan(), summary: 'a </script> b', pieces: [emptyPiece(1)] };
    const back = parseContentPlan(buildContentPlanHtml(d, 'T', 'C'));
    expect(back?.summary).toBe('a </script> b');
    expect(back?.pieces).toHaveLength(1);
  });
});

describe('content plan references', () => {
  it('embeds a resolved TikTok short link with the TikTok player', async () => {
    const { referenceEmbed } = await import('./content-plan');
    const e = referenceEmbed('https://vt.tiktok.com/ZSp1fsWqn/', { 'https://vt.tiktok.com/ZSp1fsWqn/': 'https://www.tiktok.com/@x/video/7465794343614385414?_r=1' });
    expect(e?.src).toBe('https://www.tiktok.com/player/v1/7465794343614385414?description=0&music_info=0');
  });
  it('old plans without new fields still parse', () => {
    const html = buildContentPlanHtml({ ...emptyPlan(), pieces: [emptyPiece(1)] }, 'T', 'C').replace('"hook":""', '"x":1');
    expect(parseContentPlan(html)?.pieces[0].hook).toBe('');
  });
});
