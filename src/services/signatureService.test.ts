import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { sha256Hex, signHash, verifySignature } from './signatureService';

describe('signatureService (ECDSA P-256)', () => {
  it('sha256Hex é estável', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('assina e verifica; detecta adulteração do hash, da assinatura e troca de chave', async () => {
    const hash = await sha256Hex('feedback:1');
    const { signature, publicKey } = await signHash(hash, 'tech1');
    expect(await verifySignature(hash, signature, publicKey)).toBe(true);
    expect(await verifySignature(await sha256Hex('feedback:2'), signature, publicKey)).toBe(false);
    expect(await verifySignature(hash, signature.slice(0, -4) + 'AAAA', publicKey)).toBe(false);

    const other = await signHash(hash, 'tech2');
    expect(other.publicKey).not.toBe(publicKey);
    expect(await verifySignature(hash, signature, other.publicKey)).toBe(false);
  });

  it('reutiliza o mesmo par de chaves por usuário', async () => {
    const h = await sha256Hex('x');
    const a = await signHash(h, 'tech3');
    const b = await signHash(h, 'tech3');
    expect(a.publicKey).toBe(b.publicKey);
  });

  it('a assinatura NÃO é derivável do userId (não é forjável como antes)', async () => {
    const h = await sha256Hex('x');
    const { signature } = await signHash(h, 'tech4');
    expect(signature).not.toContain('SIG_RSA');
    expect(await verifySignature(h, 'SIG_RSA_SHA256_DEADBEEF', '{}')).toBe(false);
  });
});
