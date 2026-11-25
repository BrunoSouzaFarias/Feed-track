import { describe, it, expect } from 'vitest';
import { sanitizeCsvCell } from './exportService';

describe('sanitizeCsvCell', () => {
  it('escapa aspas', () => expect(sanitizeCsvCell('a "b"')).toBe('"a ""b"""'));
  it.each(['=1+1', '+SUM(A1)', '-2', '@cmd', '\t=x', ' =cmd', ' =cmd', '＝1+1'])(
    'neutraliza fórmula: %j',
    (v) => expect(sanitizeCsvCell(v).startsWith(`"'`)).toBe(true)
  );
  it('não altera texto comum', () => expect(sanitizeCsvCell('Ana Silva')).toBe('"Ana Silva"'));
});
