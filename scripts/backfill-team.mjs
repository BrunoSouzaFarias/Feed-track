#!/usr/bin/env node
/**
 * Backfill do campo `team` (denormalizado) em feedbacks, selfAssessments e auditLogs
 * criados antes do escopo de supervisor por equipe. Sem `team`, esses documentos só
 * aparecem para supervisores SEM escopo.
 *
 * DRY-RUN por padrão. Usa Application Default Credentials (Admin SDK):
 *   GOOGLE_APPLICATION_CREDENTIALS=chave.json node scripts/backfill-team.mjs --project meu-projeto [--apply]
 * (ou FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 para testar no emulador)
 */
import { pathToFileURL } from 'node:url';

/** Puro: dado docs e o mapa uid→team, devolve os updates necessários. */
export function planBackfill(docs, teamByUser) {
  const updates = [];
  const unresolved = [];
  for (const d of docs) {
    if (d.data.team) continue;
    const team = teamByUser[d.data.technicianId];
    if (team) updates.push({ path: d.path, team });
    else unresolved.push(d.path);
  }
  return { updates, unresolved };
}

async function main() {
  const args = process.argv.slice(2);
  const project = args[args.indexOf('--project') + 1];
  const apply = args.includes('--apply');
  if (!project || project.startsWith('--')) throw new Error('--project é obrigatório');
  const { initializeApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  initializeApp({ projectId: project });
  const db = getFirestore();

  const users = await db.collection('users').get();
  const teamByUser = Object.fromEntries(users.docs.map((u) => [u.id, u.data().team]));

  let total = 0;
  for (const col of ['feedbacks', 'selfAssessments', 'auditLogs']) {
    const snap = await db.collection(col).get();
    const { updates, unresolved } = planBackfill(snap.docs.map((d) => ({ path: d.ref.path, data: d.data() })), teamByUser);
    console.log(`${col}: ${updates.length} a atualizar, ${unresolved.length} sem colaborador (ignorados)`);
    total += updates.length;
    if (apply) {
      for (let i = 0; i < updates.length; i += 400) {
        const batch = db.batch();
        updates.slice(i, i + 400).forEach((u) => batch.update(db.doc(u.path), { team: u.team }));
        await batch.commit();
      }
    }
  }
  console.log(apply ? `Concluído: ${total} documentos atualizados.` : `DRY-RUN: ${total} documentos seriam atualizados (use --apply).`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((e) => { console.error(`✖ ${e.message}`); process.exit(1); });
}
