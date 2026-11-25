import { AppError } from './errors';

/**
 * Compressão do print no navegador para caber em um documento do Firestore
 * (limite de 1 MiB): lado maior até MAX_SIDE, JPEG, reduzindo a qualidade até caber.
 */
export const MAX_SIDE = 1600;
export const MAX_DATA_URL_LENGTH = 800_000;
const QUALITIES = [0.85, 0.7, 0.55, 0.4];

export function fitDimensions(w: number, h: number, maxSide = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(w, h));
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

/** Tenta as qualidades em ordem e devolve o primeiro resultado que cabe; null se nenhum couber. */
export function pickEncoding(
  encode: (quality: number) => string,
  maxLength = MAX_DATA_URL_LENGTH,
  qualities = QUALITIES
): string | null {
  for (const q of qualities) {
    const out = encode(q);
    if (out.length <= maxLength) return out;
  }
  return null;
}

export async function compressImage(file: Blob): Promise<string> {
  if (!file.type.startsWith('image/')) throw new AppError('Cole ou selecione uma imagem.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new AppError('Não foi possível ler esta imagem. Tente outro print.');
  }
  try {
    const { width, height } = fitDimensions(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new AppError('Seu navegador não conseguiu processar a imagem.');
    // Fundo branco: prints com transparência não ficam pretos ao virar JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const dataUrl = pickEncoding((q) => canvas.toDataURL('image/jpeg', q));
    if (!dataUrl) throw new AppError('O print é grande demais mesmo comprimido. Recorte a área relevante e tente de novo.');
    return dataUrl;
  } finally {
    bitmap.close();
  }
}
