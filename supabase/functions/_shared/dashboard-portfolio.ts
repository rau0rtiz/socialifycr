export function portfolioAccounts<T extends { id: string }>(owned: T[], shared: T[]): T[] {
  return [...new Map([...owned, ...shared].map((a) => [a.id, a])).values()];
}

export function selectedPortfolioAccounts(selected: string[], allowed: { id: string }[]): string[] {
  const ids = new Set(allowed.map((a) => a.id.replace(/^act_/, '')));
  return selected.filter((id) => ids.has(id.replace(/^act_/, '')));
}