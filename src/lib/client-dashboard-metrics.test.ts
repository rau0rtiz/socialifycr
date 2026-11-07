import { describe, expect, it } from 'vitest';
import { resultTypeFor, metricsFor, isCampaignVisible, currencyRate, previousRange, rankAds } from '../../supabase/functions/_shared/dashboard-metrics';

describe('client dashboard metrics', () => {
  it('maps objectives to result types', () => {
    expect(resultTypeFor('OUTCOME_SALES')).toBe('purchase');
    expect(resultTypeFor('OUTCOME_LEADS')).toBe('leads');
    expect(resultTypeFor('OUTCOME_TRAFFIC')).toBe('traffic');
    expect(resultTypeFor('OUTCOME_AWARENESS')).toBe('reach');
    expect(resultTypeFor('OUTCOME_ENGAGEMENT', { actions: [{ action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '3' }] })).toBe('messages');
  });
  it('override wins over objective', () => {
    expect(resultTypeFor('OUTCOME_SALES', undefined, 'messages')).toBe('messages');
  });
  it('cost per purchase and ROAS', () => {
    const m = metricsFor({ spend: '100', actions: [{ action_type: 'omni_purchase', value: '4' }, { action_type: 'purchase', value: '4' }], action_values: [{ action_type: 'omni_purchase', value: '300' }] }, 'purchase');
    expect(m.results).toBe(4);
    expect(m.cost_per_result).toBe(25);
    expect(m.roas).toBe(3);
  });
  it('reach uses cost per thousand impressions', () => {
    expect(metricsFor({ spend: '10', reach: '800', impressions: '2000' }, 'reach').cost_per_result).toBe(5);
  });
  it('CRC display multiplies USD by 520', () => {
    expect(currencyRate('USD', 'CRC')).toBe(520);
    expect(metricsFor({ spend: '2' }, 'leads', 520).spend).toBe(1040);
  });
  it('empty selection shows every campaign', () => {
    expect(isCampaignVisible('1', null)).toBe(true);
    expect(isCampaignVisible('1', ['2'])).toBe(false);
  });
  it('previous range has the same length', () => {
    expect(previousRange('2026-11-01', '2026-11-07')).toEqual({ since: '2026-10-25', until: '2026-10-31' });
  });
  it('ranks by results then cost', () => {
    const mk = (r: number, c: number) => ({ metrics: { results: r, cost_per_result: c } as any });
    expect(rankAds([mk(2, 5), mk(5, 9), mk(5, 3)]).map((a) => a.metrics.cost_per_result)).toEqual([3, 9, 5]);
  });
});
