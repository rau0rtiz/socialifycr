import { describe, expect, it } from 'vitest';
import { portfolioAccounts, selectedPortfolioAccounts } from '../../supabase/functions/_shared/dashboard-portfolio';

describe('client business portfolio', () => {
  it('only permits advertising accounts associated with the selected portfolio', () => {
    expect(selectedPortfolioAccounts(['act_maracuya', 'act_peptiva'], [{ id: 'act_maracuya' }])).toEqual(['act_maracuya']);
  });
  it('includes owned and shared portfolio accounts once', () => {
    expect(portfolioAccounts([{ id: 'act_owned' }], [{ id: 'act_shared' }, { id: 'act_owned' }])).toEqual([{ id: 'act_owned' }, { id: 'act_shared' }]);
  });
  it('never falls back to all advertising accounts when portfolio access is unavailable', () => {
    expect(selectedPortfolioAccounts(['act_maracuya'], [])).toEqual([]);
  });
});