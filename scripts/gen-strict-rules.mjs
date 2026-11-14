// Gera firestore.strict.rules a partir de firestore.rules (mantém os dois em sincronia).
// Única diferença: o DONO (técnico) deixa de poder gravar structuredPDI/badges direto.
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('firestore.rules', 'utf8');
const owner = /\(isOwner\(userId\) && isActiveUser\(\) &&\n\s+changedKeys\(\)\.hasOnly\(\['name','phone','photoURL','structuredPDI','badges'\]\) &&[\s\S]*?badges\.size\(\)\);/;
if (!owner.test(src)) throw new Error('Trecho do dono em users.update não encontrado em firestore.rules');
const strict = src
  .replace(/      \/\/ O dono \(técnico ou supervisor\)[\s\S]*?\(impede auto-reativação, auto-promoção e troca de equipe\)\n/, '      // MODO ESTRITO (requer as Cloud Functions de /functions): PDI e badges só mudam pelo servidor\n      // (Admin SDK) ou por supervisor; o dono só edita dados cadastrais leves.\n')
  .replace(owner, "(isOwner(userId) && isActiveUser() &&\n         changedKeys().hasOnly(['name','phone','photoURL']));");
writeFileSync('firestore.strict.rules', '// ARQUIVO GERADO a partir de firestore.rules (npm run rules:strict). Não edite à mão.\n' + strict);
console.log('firestore.strict.rules gerado');
