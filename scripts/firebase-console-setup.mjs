#!/usr/bin/env node
/**
 * Aplica, via APIs oficiais do Google, as configurações de segurança que NÃO ficam
 * no repositório (console do Firebase): política de senha, domínios autorizados,
 * restrição da API key, App Check e (opcional) bloqueio do auto-cadastro.
 *
 * Uso (DRY-RUN por padrão — só imprime o que faria):
 *   export GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"   # conta com permissão no projeto
 *   node scripts/firebase-console-setup.mjs --project meu-projeto \
 *        --domains app.empresa.com,meu-projeto.web.app --referrers "https://app.empresa.com/*,https://meu-projeto.web.app/*" \
 *        [--api-key AIza...] [--enforce-appcheck] [--disable-signup] [--apply]
 *
 * Flags:
 *   --apply             executa de verdade (sem ela, só mostra)
 *   --enforce-appcheck  exige App Check no Firestore e no Auth (registre antes o app web com reCAPTCHA v3
 *                       e defina VITE_FIREBASE_APPCHECK_SITE_KEY, senão o app para de funcionar)
 *   --disable-signup    desativa o auto-cadastro (o /register deixa de funcionar; use convites/Admin)
 */
import { pathToFileURL } from 'node:url';

export function parseArgs(argv) {
  const out = { apply: false, enforceAppCheck: false, disableSignup: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') out.apply = true;
    else if (a === '--enforce-appcheck') out.enforceAppCheck = true;
    else if (a === '--disable-signup') out.disableSignup = true;
    else if (a.startsWith('--')) out[a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = argv[++i];
  }
  return out;
}

const list = (v) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []);

/** Monta as requisições (puro, testável). */
export function buildRequests(cfg) {
  if (!cfg.project) throw new Error('--project é obrigatório');
  const reqs = [];
  const itk = `https://identitytoolkit.googleapis.com/admin/v2/projects/${cfg.project}/config`;

  // 1) Política de senha (10+, minúscula e número), imposta no SERVIDOR.
  reqs.push({
    name: 'Política de senha (Auth)',
    method: 'PATCH',
    url: `${itk}?updateMask=passwordPolicyConfig`,
    body: {
      passwordPolicyConfig: {
        passwordPolicyEnforcementState: 'ENFORCE',
        forceUpgradeOnSignin: true,
        passwordPolicyVersions: [{
          customStrengthOptions: { minPasswordLength: 10, containsLowercaseCharacter: true, containsNumericCharacter: true },
        }],
      },
    },
  });

  // 2) Domínios autorizados do Auth (somente os informados + localhost só se pedido).
  const domains = list(cfg.domains);
  if (domains.length) {
    reqs.push({ name: 'Domínios autorizados (Auth)', method: 'PATCH', url: `${itk}?updateMask=authorizedDomains`, body: { authorizedDomains: domains } });
  }

  // 3) Restrição da API key a referrers HTTP (a key web é pública; restringir limita o abuso).
  const referrers = list(cfg.referrers);
  if (cfg.apiKey && referrers.length) {
    reqs.push({
      name: 'Restrição da API key',
      method: 'PATCH',
      resolveKey: cfg.apiKey, // o id da key é resolvido em tempo de execução pelo keyString
      url: 'https://apikeys.googleapis.com/v2/{keyName}?updateMask=restrictions',
      body: { restrictions: { browserKeyRestrictions: { allowedReferrers: referrers } } },
    });
  }

  // 4) App Check: impor no Firestore e no Auth (Identity Toolkit).
  if (cfg.enforceAppCheck) {
    for (const svc of ['firestore.googleapis.com', 'identitytoolkit.googleapis.com']) {
      reqs.push({
        name: `App Check ENFORCED em ${svc}`,
        method: 'PATCH',
        url: `https://firebaseappcheck.googleapis.com/v1/projects/${cfg.project}/services/${svc}?updateMask=enforcementMode`,
        body: { enforcementMode: 'ENFORCED' },
      });
    }
  }

  // 5) Auto-cadastro (opcional).
  if (cfg.disableSignup) {
    reqs.push({
      name: 'Desativar auto-cadastro (Auth)',
      method: 'PATCH',
      url: `${itk}?updateMask=signIn.email,client.permissions.disabledUserSignup`,
      body: { client: { permissions: { disabledUserSignup: true } } },
    });
  }
  return reqs;
}

async function call(token, r, project, keyName) {
  const url = r.url.replace('{keyName}', keyName ?? '');
  const res = await fetch(url, {
    method: r.method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Goog-User-Project': project },
    body: JSON.stringify(r.body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${r.name}: HTTP ${res.status} ${text.slice(0, 300)}`);
  return text;
}

async function resolveKeyName(token, project, keyString) {
  const res = await fetch(`https://apikeys.googleapis.com/v2/projects/${project}/locations/global/keys`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Goog-User-Project': project },
  });
  if (!res.ok) throw new Error(`Listar API keys: HTTP ${res.status}`);
  for (const k of (await res.json()).keys ?? []) {
    const s = await fetch(`https://apikeys.googleapis.com/v2/${k.name}/keyString`, { headers: { Authorization: `Bearer ${token}`, 'X-Goog-User-Project': project } });
    if (s.ok && (await s.json()).keyString === keyString) return k.name;
  }
  throw new Error('API key informada não encontrada no projeto.');
}

async function main() {
  const cfg = parseArgs(process.argv.slice(2));
  const reqs = buildRequests(cfg);
  console.log(`${cfg.apply ? 'APLICANDO' : 'DRY-RUN (use --apply para executar)'} em ${cfg.project}:\n`);
  for (const r of reqs) console.log(`- ${r.name}\n  ${r.method} ${r.url}\n  ${JSON.stringify(r.body)}\n`);
  if (!cfg.apply) return;
  const token = process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  if (!token) throw new Error('Defina GOOGLE_OAUTH_ACCESS_TOKEN (ex.: gcloud auth print-access-token).');
  for (const r of reqs) {
    const keyName = r.resolveKey ? await resolveKeyName(token, cfg.project, r.resolveKey) : undefined;
    await call(token, r, cfg.project, keyName);
    console.log(`✔ ${r.name}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((e) => { console.error(`✖ ${e.message}`); process.exit(1); });
}
