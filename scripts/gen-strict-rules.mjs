// Gera firestore.strict.rules a partir de firestore.rules (mantém os dois em sincronia).
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('firestore.rules', 'utf8');
const marker = /allow update: if isSupervisor\(\) \|\|\n\s+\(isOwner\(userId\) && isActiveUser\(\) &&\n\s+changedKeys\(\)\.hasOnly\(\['name','phone','photoURL','structuredPDI','badges'\]\) &&[\s\S]*?badges\.size\(\)\);/;
if (!marker.test(src)) throw new Error('Trecho de users.update não encontrado em firestore.rules');
const strict = src
  .replace(/      \/\/ O dono \(técnico ou supervisor\)[\s\S]*?\(impede auto-reativação, auto-promoção e troca de equipe\)\n/, '')
  .replace(marker, `// MODO ESTRITO (requer as Cloud Functions de /functions implantadas):
      // PDI e badges só mudam pelo servidor (Admin SDK) ou por supervisor.
      allow update: if isSupervisor() ||
        (isOwner(userId) && isActiveUser() &&
         changedKeys().hasOnly(['name','phone','photoURL']));`);
writeFileSync('firestore.strict.rules', '// ARQUIVO GERADO a partir de firestore.rules (npm run rules:strict). Não edite à mão.\n' + strict);
console.log('firestore.strict.rules gerado');
