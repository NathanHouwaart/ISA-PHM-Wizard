import { describe, it, expect } from 'vitest';
import { applyFilesToRange } from './dataGridUtils';

function makeFile(name, webkitRelativePath) {
  return { name, webkitRelativePath };
}

describe('applyFilesToRange', () => {
  it('assigns files row-major to range cells', () => {
    const rows = [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }];
    const cols = [{ prop: 'c1' }, { prop: 'c2' }, { prop: 'c3' }];

    const range = { x: 0, y: 0, x1: 1, y1: 1 }; // 2x2 from (0,0) to (1,1)
    const files = [makeFile('a.txt'), makeFile('b.txt'), makeFile('c.txt')];

    const result = applyFilesToRange(range, rows, cols, files);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ rowId: 'r1', columnId: 'c1', value: 'a.txt' });
    expect(result[1]).toEqual({ rowId: 'r1', columnId: 'c2', value: 'b.txt' });
    expect(result[2]).toEqual({ rowId: 'r2', columnId: 'c1', value: 'c.txt' });
  });

  it('uses webkitRelativePath when available', () => {
    const rows = [{ id: 'r1' }];
    const cols = [{ prop: 'c1' }];
    const range = { x: 0, y: 0 };
    const files = [makeFile('a.txt', 'dir/sub/a.txt')];

    const result = applyFilesToRange(range, rows, cols, files);
    expect(result[0].value).toBe('dir/sub/a.txt');
  });

  it('naturally sorts numeric filenames before assignment', () => {
    const rows = [{ id: 'r1' }];
    const cols = [{ prop: 'c1' }, { prop: 'c2' }, { prop: 'c3' }];
    const range = { x: 0, y: 0, x1: 2, y1: 0 };
    const files = [makeFile('1.csv'), makeFile('10.csv'), makeFile('2.csv')];

    const result = applyFilesToRange(range, rows, cols, files);

    expect(result).toHaveLength(3);
    expect(result[0].value).toBe('1.csv');
    expect(result[1].value).toBe('2.csv');
    expect(result[2].value).toBe('10.csv');
  });

  it('returns empty for invalid inputs', () => {
    expect(applyFilesToRange(null, [], [], [])).toEqual([]);
    expect(applyFilesToRange({}, [], [], null)).toEqual([]);
  });
});
