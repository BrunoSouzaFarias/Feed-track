import { describe, it, expect } from 'vitest';
import { fitDimensions, pickEncoding, compressImage, MAX_DATA_URL_LENGTH } from './imageCompress';

describe('fitDimensions', () => {
  it('reduz pelo lado maior mantendo a proporção', () => {
    expect(fitDimensions(3200, 1600)).toEqual({ width: 1600, height: 800 });
    expect(fitDimensions(1000, 4000)).toEqual({ width: 400, height: 1600 });
  });
  it('não amplia imagens pequenas', () => expect(fitDimensions(800, 600)).toEqual({ width: 800, height: 600 }));
});

describe('pickEncoding', () => {
  it('tenta as qualidades em ordem e devolve a primeira que cabe', () => {
    const tried: number[] = [];
    const out = pickEncoding((q) => { tried.push(q); return 'x'.repeat(q > 0.6 ? 2000 : 500); }, 1000);
    expect(tried).toEqual([0.85, 0.7, 0.55]);
    expect(out).toHaveLength(500);
  });
  it('devolve null quando nem a menor qualidade cabe', () => {
    expect(pickEncoding(() => 'x'.repeat(MAX_DATA_URL_LENGTH + 1))).toBeNull();
  });
});

describe('compressImage', () => {
  it('recusa o que não é imagem (ex.: texto colado)', async () => {
    await expect(compressImage(new Blob(['oi'], { type: 'text/plain' }))).rejects.toThrow('Cole ou selecione uma imagem.');
  });
});
