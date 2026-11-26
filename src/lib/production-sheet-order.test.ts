import { describe, expect, it } from 'vitest';
import { reorderOrderedIds } from './production-sheet-order';

describe('reorderOrderedIds', () => {
  it('moves a piece to the position of another piece', () => {
    expect(reorderOrderedIds(['one', 'two', 'three'], 'three', 'one')).toEqual(['three', 'one', 'two']);
    expect(reorderOrderedIds(['one', 'two', 'three'], 'one', 'three')).toEqual(['two', 'three', 'one']);
  });

  it('keeps the order when the drag ends over the same piece', () => {
    expect(reorderOrderedIds(['one', 'two'], 'one', 'one')).toEqual(['one', 'two']);
  });

  it('does not invent an order when either piece is missing', () => {
    expect(reorderOrderedIds(['one', 'two'], 'missing', 'two')).toEqual(['one', 'two']);
    expect(reorderOrderedIds(['one', 'two'], 'one', 'missing')).toEqual(['one', 'two']);
  });
});
