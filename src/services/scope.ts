import type { User } from '../types';

type Team = 'back-office' | 'teleservice';

/**
 * Escopo do supervisor logado: equipe que ele gerencia (null = todas).
 * É definido pelo AuthProvider; os serviços usam para filtrar consultas
 * (as regras do Firestore exigem a consulta já filtrada, senão negam tudo).
 */
let managedTeam: Team | null = null;

export const scope = {
  set(user: User | null) {
    managedTeam = user?.role === 'supervisor' ? (user.managedTeam ?? null) : null;
  },
  get(): Team | null {
    return managedTeam;
  },
  /** true se o item (com `team`) está dentro do escopo atual. Itens legados sem team só aparecem p/ escopo total. */
  allows(team: string | null | undefined): boolean {
    return managedTeam === null || team === managedTeam;
  },
};
