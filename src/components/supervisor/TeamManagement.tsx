import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Users, UserPlus, Edit, Eye, Target, ToggleLeft, ToggleRight, X, Loader2, Mail, User as UserIcon, Trash2, Download } from 'lucide-react';
import type { User, Feedback } from '../../types';
import { userService } from '../../services/userService';
import { validatePassword } from '../../services/passwordPolicy';
import { friendlyError } from '../../services/errors';
import { useAuth } from '../../hooks/useAuth';
import { exportService } from '../../services/exportService';
import Avatar from '../shared/Avatar';
import toast from 'react-hot-toast';

interface TeamManagementProps {
  technicians: User[];
  feedbacks: Feedback[];
  onRefresh: () => void;
  onSelectTechnicianFeedbacks: (techName: string) => void;
  onSelectTechnicianPDI: (techId: string) => void;
}

export default function TeamManagement({
  technicians,
  feedbacks,
  onRefresh,
  onSelectTechnicianFeedbacks,
  onSelectTechnicianPDI
}: TeamManagementProps) {
  const { user, createTechnicianBySupervisor } = useAuth();
  
  // States
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<'all' | 'back-office' | 'teleservice'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<User | null>(null);
  
  // Form States (Add)
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newTeam, setNewTeam] = useState<'back-office' | 'teleservice'>('back-office');
  const [newPosition, setNewPosition] = useState('');
  const [adding, setAdding] = useState(false);

  // Form States (Edit)
  const [editName, setEditName] = useState('');
  const [editTeam, setEditTeam] = useState<'back-office' | 'teleservice'>('back-office');
  const [editPosition, setEditPosition] = useState('');
  const [updating, setUpdating] = useState(false);

  // Filters list using useMemo
  const filteredTechnicians = useMemo(() => {
    if (selectedTeamFilter === 'all') return technicians;
    return technicians.filter(t => t.team === selectedTeamFilter);
  }, [technicians, selectedTeamFilter]);

  const handleExportTechPDF = (tech: User) => {
    const techFeedbacks = feedbacks.filter(f => f.technicianId === tech.uid);
    if (techFeedbacks.length === 0) {
      toast.error(`Não há feedbacks registrados para ${tech.name} para exportar.`);
      return;
    }
    exportService.exportToPDF(techFeedbacks, user?.name || 'Supervisor', tech.name);
    toast.success(`Relatório em PDF de ${tech.name} gerado com sucesso!`);
  };

  // Actions
  const handleToggleActive = async (tech: User) => {
    try {
      const nextActive = !tech.active;
      await userService.toggleUserActive(tech.uid, nextActive);
      toast.success(`Técnico ${nextActive ? 'ativado' : 'inativado'} com sucesso!`);
      onRefresh();
    } catch (err) {
      toast.error(friendlyError(err, 'Erro ao alternar status do colaborador.'));
    }
  };

  const handleOpenEdit = (tech: User) => {
    setEditingTech(tech);
    setEditName(tech.name);
    setEditTeam(tech.team);
    setEditPosition(tech.position);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTech || !editName || !editPosition) {
      toast.error('Preencha todos os campos.');
      return;
    }
    setUpdating(true);
    try {
      await userService.updateUser(editingTech.uid, {
        name: editName,
        team: editTeam,
        position: editPosition
      });
      toast.success('Cadastro atualizado com sucesso!');
      setIsEditModalOpen(false);
      onRefresh();
    } catch (err) {
      toast.error(friendlyError(err, 'Erro ao atualizar cadastro.'));
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async (tech: User) => {
    const confirmDelete = window.confirm(`Tem certeza que deseja excluir o colaborador "${tech.name}"? Esta ação é irreversível e removerá o cadastro do banco de dados.`);
    if (!confirmDelete) return;

    try {
      await userService.deleteUser(tech.uid);
      toast.success(`Colaborador "${tech.name}" excluído com sucesso!`);
      onRefresh();
    } catch (err) {
      toast.error(friendlyError(err, 'Erro ao excluir colaborador.'));
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword || !newPosition) {
      toast.error('Preencha todos os campos.');
      return;
    }
    const policyError = validatePassword(newPassword);
    if (policyError) {
      toast.error(policyError);
      return;
    }
    setAdding(true);
    try {
      await createTechnicianBySupervisor(newName, newEmail, newPassword, newTeam, newPosition);
      toast.success('Novo colaborador cadastrado com sucesso!');
      setIsAddModalOpen(false);
      // Reset form
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewPosition('');
      onRefresh();
    } catch (err) {
      toast.error(friendlyError(err, 'Erro ao cadastrar novo colaborador.'));
    } finally {
      setAdding(false);
    }
  };

  const renderAddModal = () => {
    if (!isAddModalOpen || typeof document === 'undefined') return null;
    return createPortal(
      <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xs">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-left">
          <button
            onClick={() => setIsAddModalOpen(false)}
            className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-5 flex items-center gap-1.5">
            <UserPlus className="w-5 h-5 text-liberty" /> Novo Colaborador
          </h3>
          
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Nome Completo
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Ex: Pedro Henrique"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                E-mail corporativo
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  placeholder="pedro.henrique@liberty.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Senha inicial
              </label>
              <input
                type="password"
                placeholder="Mínimo 10 caracteres, com letras e números"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Time
                </label>
                <select
                  value={newTeam}
                  onChange={(e) => setNewTeam(e.target.value as 'back-office' | 'teleservice')}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent dark:bg-zinc-900 text-sm cursor-pointer"
                >
                  <option value="back-office">Back-office</option>
                  <option value="teleservice">Teleservice</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Cargo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Agente N1"
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={adding}
                className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-liberty to-liberty-sky text-white rounded-lg hover:opacity-95 shadow cursor-pointer"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cadastrar'}
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );
  };

  const renderEditModal = () => {
    if (!isEditModalOpen || !editingTech || typeof document === 'undefined') return null;
    return createPortal(
      <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xs">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-left">
          <button
            onClick={() => setIsEditModalOpen(false)}
            className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-5 flex items-center gap-1.5">
            <Edit className="w-5 h-5 text-liberty" /> Editar Cadastro
          </h3>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Time
                </label>
                <select
                  value={editTeam}
                  onChange={(e) => setEditTeam(e.target.value as 'back-office' | 'teleservice')}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent dark:bg-zinc-900 text-sm cursor-pointer"
                >
                  <option value="back-office">Back-office</option>
                  <option value="teleservice">Teleservice</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Cargo
                </label>
                <input
                  type="text"
                  value={editPosition}
                  onChange={(e) => setEditPosition(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-liberty to-liberty-sky text-white rounded-lg hover:opacity-95 shadow cursor-pointer"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-md text-left">
      
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-liberty" />
          <h2 className="text-xl font-bold text-zinc-955 dark:text-zinc-50">
            Gestão de Equipe ({technicians.length})
          </h2>
        </div>

        <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
          {/* Team Filter */}
          <select
            value={selectedTeamFilter}
            onChange={(e) => setSelectedTeamFilter(e.target.value as 'all' | 'back-office' | 'teleservice')}
            className="px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 cursor-pointer"
          >
            <option value="all">Todos os Times</option>
            <option value="back-office">Back-office</option>
            <option value="teleservice">Teleservice</option>
          </select>

          {/* Add user button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-liberty to-liberty-sky text-white font-semibold rounded-xl text-sm shadow-md cursor-pointer hover:opacity-95 transition-opacity w-full sm:w-auto"
          >
            <UserPlus className="w-4 h-4" /> Adicionar Colaborador
          </button>
        </div>
      </div>

      {/* Table */}
      {filteredTechnicians.length > 0 ? (
        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <table className="w-full min-w-[750px] table-fixed divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/80 text-xs font-bold text-zinc-505 dark:text-zinc-400 text-left">
                <th className="px-4 py-3 w-16 text-center">Foto</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3 w-40">Time</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3 w-32 text-center">Status</th>
                <th className="px-4 py-3 w-44 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
              {filteredTechnicians.map((tech) => (
                <tr key={tech.uid} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="px-4 py-3 text-center">
                    <Avatar name={tech.name} photoURL={tech.photoURL} size="sm" />
                  </td>
                  <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {tech.name}
                  </td>
                  <td className="px-4 py-3 truncate">
                    <span className="capitalize px-2 py-0.5 text-xs font-medium rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {tech.team}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 truncate">
                    {tech.position}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(tech)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                        tech.active
                          ? 'bg-emerald-100 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50'
                          : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      {tech.active ? (
                        <>
                           <ToggleRight className="w-4 h-4 text-emerald-600" /> Ativo
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4 text-zinc-400" /> Inativo
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(tech)}
                        className="p-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-505 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        title="Editar cadastro"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onSelectTechnicianFeedbacks(tech.name)}
                        className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-250 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-505 hover:text-liberty dark:hover:text-liberty-sky transition-colors cursor-pointer"
                        title="Ver feedbacks"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onSelectTechnicianPDI(tech.uid)}
                        className="p-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-550 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                        title="Gerenciar PDI"
                      >
                        <Target className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleExportTechPDF(tech)}
                        className="p-2 rounded-lg bg-zinc-50 hover:bg-[#006c49]/10 dark:bg-zinc-800 dark:hover:bg-[#006c49]/20 text-zinc-505 hover:text-[#006c49] dark:hover:text-[#4bdfa1] transition-colors cursor-pointer"
                        title="Exportar PDF de Feedbacks"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteUser(tech)}
                        className="p-2 rounded-lg bg-zinc-50 hover:bg-rose-50 dark:bg-zinc-800 dark:hover:bg-rose-950/20 text-zinc-505 hover:text-rose-600 dark:hover:text-rose-450 transition-colors cursor-pointer"
                        title="Excluir colaborador"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center italic text-zinc-500 dark:text-zinc-400 py-8">
          Nenhum técnico cadastrado para o time selecionado.
        </p>
      )}

      {renderAddModal()}
      {renderEditModal()}
    </div>
  );
}
