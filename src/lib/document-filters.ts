/**
 * Filtering for the Documentation library (/agencia/documentacion).
 * Search is accent- and case-insensitive and ignores punctuation, so typing
 * "b dental" finds a document called "B-Dental · Noviembre".
 */

export const NO_CLIENT_KEY = '__none__';

export interface FilterableDocument {
  id: string;
  title: string | null;
  client_id: string | null;
  client_name: string | null;
  kind: string | null;
}

export interface ClientOption {
  key: string;
  label: string;
  count: number;
}

export const normText = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Documents are grouped by client id when we have one, otherwise by the stored name. */
export const clientKeyOf = (doc: FilterableDocument): string =>
  doc.client_id || (doc.client_name?.trim() ? `name:${doc.client_name.trim().toLowerCase()}` : NO_CLIENT_KEY);

export const clientLabelOf = (
  doc: FilterableDocument,
  clients: { id: string; name: string }[] = [],
): string =>
  doc.client_name?.trim() || clients.find((c) => c.id === doc.client_id)?.name || 'Sin cliente';

export interface DocumentFilterOptions {
  search?: string;
  /** 'all' (default) or a key returned by clientKeyOf. */
  clientKey?: string;
  /** 'all' (default) or a document kind. */
  kind?: string;
}

export const filterDocuments = <T extends FilterableDocument>(
  docs: T[],
  { search, clientKey = 'all', kind = 'all' }: DocumentFilterOptions = {},
): T[] => {
  const term = normText(search ?? '');
  return docs.filter((doc) => {
    if (clientKey !== 'all' && clientKeyOf(doc) !== clientKey) return false;
    if (kind !== 'all' && (doc.kind || 'proposal') !== kind) return false;
    if (!term) return true;
    return normText(`${doc.title ?? ''} ${doc.client_name ?? ''}`).includes(term);
  });
};

/** Only clients that actually have documents, so the dropdown never offers empty options. */
export const clientOptionsOf = (
  docs: FilterableDocument[],
  clients: { id: string; name: string }[] = [],
): ClientOption[] => {
  const byKey = new Map<string, ClientOption>();
  for (const doc of docs) {
    const key = clientKeyOf(doc);
    const found = byKey.get(key);
    if (found) found.count += 1;
    else byKey.set(key, { key, label: clientLabelOf(doc, clients), count: 1 });
  }
  return [...byKey.values()].sort((a, b) =>
    a.key === NO_CLIENT_KEY ? 1 : b.key === NO_CLIENT_KEY ? -1 : a.label.localeCompare(b.label, 'es'),
  );
};
