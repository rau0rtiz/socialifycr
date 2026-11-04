import { describe, it, expect } from 'vitest';
import {
  normText,
  clientKeyOf,
  clientLabelOf,
  filterDocuments,
  clientOptionsOf,
  NO_CLIENT_KEY,
  type FilterableDocument,
} from './document-filters';

const doc = (over: Partial<FilterableDocument> & { id: string }): FilterableDocument => ({
  title: null,
  client_id: null,
  client_name: null,
  kind: 'proposal',
  ...over,
});

const B_DENTAL = doc({ id: 'd1', title: 'B-Dental · Noviembre', client_id: 'c-bd', client_name: 'B-Dental', kind: 'report' });
const PEPTIVA = doc({ id: 'd2', title: 'Peptiva OCT 11', client_id: 'c-pe', client_name: 'Peptiva', kind: 'content_plan' });
const ORPHAN = doc({ id: 'd3', title: 'Propuesta Café Grano', client_name: 'Café Grano' });
const NOBODY = doc({ id: 'd4', title: 'Correo de bienvenida', kind: 'email' });
const ALL = [B_DENTAL, PEPTIVA, ORPHAN, NOBODY];

describe('normText', () => {
  it('ignores case, accents and punctuation', () => {
    expect(normText('B-Dental · Noviembre')).toBe('b dental noviembre');
    expect(normText('Café Grano')).toBe('cafe grano');
  });
});

describe('filterDocuments search', () => {
  it('finds a document by name without accents or the hyphen', () => {
    expect(filterDocuments(ALL, { search: 'b dental' }).map((d) => d.id)).toEqual(['d1']);
  });

  it('finds a document whose name has accents when typed without them', () => {
    expect(filterDocuments(ALL, { search: 'cafe grano' }).map((d) => d.id)).toEqual(['d3']);
  });

  it('is case-insensitive', () => {
    expect(filterDocuments(ALL, { search: 'PEPTIVA' }).map((d) => d.id)).toEqual(['d2']);
  });

  it('also matches the client name written in the title area', () => {
    expect(filterDocuments(ALL, { search: 'peptiva' }).map((d) => d.id)).toEqual(['d2']);
    expect(filterDocuments(ALL, { search: 'nada que ver' })).toEqual([]);
  });
});

describe('filterDocuments client', () => {
  it('keeps only the selected client', () => {
    expect(filterDocuments(ALL, { clientKey: 'c-bd' }).map((d) => d.id)).toEqual(['d1']);
  });

  it('groups a document that only stores a client name under that name', () => {
    expect(clientKeyOf(ORPHAN)).toBe('name:café grano');
    expect(filterDocuments(ALL, { clientKey: 'name:café grano' }).map((d) => d.id)).toEqual(['d3']);
  });

  it('selects documents with no client at all', () => {
    expect(clientKeyOf(NOBODY)).toBe(NO_CLIENT_KEY);
    expect(filterDocuments(ALL, { clientKey: NO_CLIENT_KEY }).map((d) => d.id)).toEqual(['d4']);
  });

  it('combines client and search', () => {
    expect(filterDocuments(ALL, { clientKey: 'c-bd', search: 'octubre' })).toEqual([]);
    expect(filterDocuments(ALL, { clientKey: 'c-bd', search: 'noviembre' }).map((d) => d.id)).toEqual(['d1']);
  });
});

describe('filterDocuments kind', () => {
  it('keeps only the selected kind and defaults a missing kind to proposal', () => {
    expect(filterDocuments(ALL, { kind: 'report' }).map((d) => d.id)).toEqual(['d1']);
    expect(filterDocuments(ALL, { kind: 'email' }).map((d) => d.id)).toEqual(['d4']);
    expect(filterDocuments([doc({ id: 'x', title: 'Sin tipo', kind: null })], { kind: 'proposal' }).map((d) => d.id)).toEqual(['x']);
  });
});

describe('clientOptionsOf', () => {
  it('lists each client once with its document count, alphabetical, sin cliente last', () => {
    const options = clientOptionsOf(ALL);
    expect(options).toEqual([
      { key: 'c-bd', label: 'B-Dental', count: 1 },
      { key: 'name:café grano', label: 'Café Grano', count: 1 },
      { key: 'c-pe', label: 'Peptiva', count: 1 },
      { key: NO_CLIENT_KEY, label: 'Sin cliente', count: 1 },
    ]);
  });

  it('uses the client name when the document has one, otherwise looks it up by id', () => {
    const options = clientOptionsOf([
      doc({ id: 'a', client_id: 'c1', client_name: 'Aurum Studio' }),
      doc({ id: 'b', client_id: 'c1' }),
    ], [{ id: 'c1', name: 'Aurum Studio' }]);
    expect(options).toEqual([{ key: 'c1', label: 'Aurum Studio', count: 2 }]);
    expect(clientLabelOf(doc({ id: 'b', client_id: 'c1' }), [{ id: 'c1', name: 'Aurum Studio' }])).toBe('Aurum Studio');
    expect(clientLabelOf(doc({ id: 'c', client_id: 'gone' }), [])).toBe('Sin cliente');
  });
});
