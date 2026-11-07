import { describe, expect, it } from 'vitest';
import { campaignAds } from './campaign-ads';

describe('ads per campaign', () => {
  it('keeps three campaigns separate and preserves each ranking', () => {
    const ads = [{ id: 'a1', campaign_id: 'one' }, { id: 'b1', campaign_id: 'two' }, { id: 'a2', campaign_id: 'one' }, { id: 'c1', campaign_id: 'three' }];
    expect(['one', 'two', 'three'].map(id => campaignAds(ads, id).map(ad => ad.id))).toEqual([['a1', 'a2'], ['b1'], ['c1']]);
  });
  it('returns no unrelated ads for a campaign without ads', () => {
    expect(campaignAds([{ campaign_id: 'other' }], 'empty')).toEqual([]);
  });
});