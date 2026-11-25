import { describe, it, expect } from 'vitest';
// @ts-expect-error módulo .mjs sem tipos
import { buildRequests, parseArgs } from './firebase-console-setup.mjs';

describe('firebase-console-setup', () => {
  it('sempre inclui a política de senha com mínimo de 10 caracteres', () => {
    const r = buildRequests({ project: 'p' });
    expect(r).toHaveLength(1);
    expect(r[0].body.passwordPolicyConfig.passwordPolicyVersions[0].customStrengthOptions.minPasswordLength).toBe(10);
    expect(r[0].url).toContain('updateMask=passwordPolicyConfig');
  });
  it('só inclui domínios, API key, App Check e bloqueio de cadastro quando pedidos', () => {
    const r = buildRequests({ project: 'p', domains: 'a.com,b.com', referrers: 'https://a.com/*', apiKey: 'AIza', enforceAppCheck: true, disableSignup: true });
    expect(r.map((x: { name: string }) => x.name)).toEqual([
      'Política de senha (Auth)', 'Domínios autorizados (Auth)', 'Restrição da API key',
      'App Check ENFORCED em firestore.googleapis.com', 'App Check ENFORCED em identitytoolkit.googleapis.com',
      'Desativar auto-cadastro (Auth)',
    ]);
    expect(r[1].body.authorizedDomains).toEqual(['a.com', 'b.com']);
  });
  it('exige --project e interpreta flags', () => {
    expect(() => buildRequests({})).toThrow(/--project/);
    expect(parseArgs(['--project', 'x', '--apply', '--domains', 'a.com'])).toMatchObject({ project: 'x', apply: true, domains: 'a.com' });
  });
});
