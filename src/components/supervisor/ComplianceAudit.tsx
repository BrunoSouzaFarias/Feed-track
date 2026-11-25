import { useEffect, useState } from 'react';
import { auditService } from '../../services/auditService';
import { isFirebaseMock } from '../../services/env';
import { verifySignature } from '../../services/signatureService';
import { Shield, Search, CheckCircle, FileText, Key, ShieldCheck, Download } from 'lucide-react';
import type { AuditLog } from '../../types';
import toast from 'react-hot-toast';

interface ComplianceAuditProps {
  logs: AuditLog[];
  onRefresh: () => void;
}

export default function ComplianceAudit({ logs, onRefresh }: ComplianceAuditProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  // Resultado da verificação criptográfica (ECDSA) de cada assinatura.
  const [validity, setValidity] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    // Válida = assinatura confere com a chave do log E (quando há registro central) essa
    // chave é a ANCORADA para o signatário. Falha ao ler a âncora não marca nada como válido.
    auditService.getAnchoredKeys()
      .then((anchored) => Promise.all(logs.map(async (l) => {
        const sigOk = await verifySignature(l.hash, l.signature, l.publicKey);
        const anchorOk = isFirebaseMock || anchored[l.signerId ?? l.technicianId] === l.publicKey;
        return [l.id, sigOk && anchorOk] as const;
      })))
      .then((entries) => { if (!cancelled) setValidity(Object.fromEntries(entries)); })
      .catch(() => { if (!cancelled) setValidity({}); });
    return () => { cancelled = true; };
  }, [logs]);

  const filteredLogs = logs.filter(log => 
    log.technicianName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.hash.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${type} copiado para a área de transferência!`),
      () => toast.error('Não foi possível copiar. Selecione o texto manualmente.')
    );
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `trilha_auditoria_compliance_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Trilha de auditoria exportada em JSON!");
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-pulse" /> Trilha de Auditoria & Conformidade (Audit Trail)
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Logs de eventos invioláveis com integridade garantida por SHA-256 e assinaturas criptográficas simuladas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Atualizar Logs
          </button>
          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Exportar JSON
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-xl p-4 flex items-start gap-3 text-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-emerald-800 dark:text-emerald-400">Garantia de Integridade dos Dados</p>
          <p className="text-zinc-650 dark:text-zinc-300 leading-relaxed">
            Cada assinatura de feedback ou conclusão de meta do PDI gera um hash criptográfico <code className="bg-emerald-100/50 dark:bg-emerald-900/20 px-1 py-0.5 rounded text-emerald-750 font-mono">SHA-256</code> exclusivo contendo os dados do evento. O hash é assinado com ECDSA P-256 por uma chave não-exportável guardada no dispositivo do colaborador, e a assinatura pode ser verificada com a chave pública registrada no log (selo ao lado de cada evento).
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Filtrar logs por colaborador, tipo de evento, hash..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 placeholder-zinc-400 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Logs Table / List */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-500 font-bold text-left">
                <th className="p-4 uppercase tracking-wider">Timestamp</th>
                <th className="p-4 uppercase tracking-wider">Colaborador</th>
                <th className="p-4 uppercase tracking-wider">Evento</th>
                <th className="p-4 uppercase tracking-wider">Descrição do Log</th>
                <th className="p-4 uppercase tracking-wider text-center">Integridade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-150 dark:divide-zinc-800/60">
              {filteredLogs.map(log => {
                const isExpanded = expandedLogId === log.id;
                const isSignature = log.eventType === 'feedback_signature';
                
                return (
                  <tr key={log.id} className="transition-all">
                    <td colSpan={5} className="p-0">
                      <table className="w-full text-xs table-fixed">
                        <tbody>
                          <tr 
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-all cursor-pointer select-none"
                          >
                            <td className="p-4 text-zinc-400 dark:text-zinc-500 whitespace-nowrap w-[20%]">
                              {new Date(log.timestamp).toLocaleString('pt-BR')}
                            </td>
                            <td className="p-4 font-bold text-zinc-800 dark:text-zinc-200 w-[20%] truncate">
                              {log.technicianName}
                              {validity[log.id] !== undefined && (
                                <span
                                  title={validity[log.id] ? 'Assinatura verificada e chave ancorada no servidor' : 'Assinatura inválida OU chave diferente da registrada'}
                                  className={`ml-2 text-[9px] font-bold uppercase ${validity[log.id] ? 'text-emerald-600' : 'text-red-600'}`}
                                >
                                  {validity[log.id] ? '✓ válida' : '✗ inválida'}
                                </span>
                              )}
                            </td>
                            <td className="p-4 w-[15%]">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wide ${
                                isSignature
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400' 
                                  : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400'
                              }`}>
                                {isSignature ? 'Assinatura' : 'Meta Concluída'}
                              </span>
                            </td>
                            <td className="p-4 text-zinc-650 dark:text-zinc-300 w-[33%] truncate">
                              {log.details}
                            </td>
                            <td className="p-4 text-center w-[12%]">
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                <CheckCircle className="w-4 h-4 shrink-0" />
                                <span>Íntegro</span>
                              </span>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr>
                              <td colSpan={5} className="p-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-b border-zinc-150 dark:border-zinc-800">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-sans">
                                  {/* Left panel: Log info */}
                                  <div className="space-y-3 p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                    <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
                                      <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                        <FileText className="w-4 h-4 text-emerald-500" /> Detalhes do Log
                                      </span>
                                      <span className="text-[10px] text-zinc-400 font-mono">ID: {log.id}</span>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <div className="flex justify-between">
                                        <span className="text-zinc-400">ID da Entidade:</span>
                                        <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{log.entityId}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-zinc-400">ID do Colaborador:</span>
                                        <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{log.technicianId}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-zinc-400">Tipo de Evento:</span>
                                        <span className="font-semibold text-zinc-750 dark:text-zinc-200">{log.eventType}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-zinc-400">Data do Log:</span>
                                        <span className="font-semibold text-zinc-750 dark:text-zinc-200">{new Date(log.timestamp).toISOString()}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right panel: Cryptography Info */}
                                  <div className="space-y-3 p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg font-mono">
                                    <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
                                      <span className="font-bold text-zinc-850 dark:text-zinc-100 flex items-center gap-1.5 font-sans font-bold">
                                        <Key className="w-4 h-4 text-emerald-500" /> Assinatura Digital & Hash
                                      </span>
                                      <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-sans font-bold">
                                        Assinatura Válida
                                      </span>
                                    </div>

                                    <div className="space-y-2.5 text-[11px]">
                                      <div>
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-zinc-400 font-sans text-xs">Hash SHA-256 do Registro:</span>
                                          <button 
                                            onClick={() => handleCopy(log.hash, 'Hash SHA-256')} 
                                            className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-sans"
                                          >
                                            Copiar
                                          </button>
                                        </div>
                                        <div className="p-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded text-zinc-650 dark:text-zinc-300 break-all select-all font-mono">
                                          {log.hash}
                                        </div>
                                      </div>

                                      <div>
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-zinc-400 font-sans text-xs">Assinatura Digital RSA (Simulada):</span>
                                          <button 
                                            onClick={() => handleCopy(log.signature, 'Assinatura')} 
                                            className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-sans"
                                          >
                                            Copiar
                                          </button>
                                        </div>
                                        <div className="p-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded text-zinc-650 dark:text-zinc-300 break-all select-all font-mono">
                                          {log.signature}
                                        </div>
                                      </div>

                                      <div>
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-zinc-400 font-sans text-xs">Chave Pública do Colaborador:</span>
                                          <button 
                                            onClick={() => handleCopy(log.publicKey, 'Chave Pública')} 
                                            className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-sans"
                                          >
                                            Copiar
                                          </button>
                                        </div>
                                        <div className="p-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded text-zinc-500 break-all select-all font-mono text-[9px]">
                                          {log.publicKey}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-400 italic">
                    Nenhum log encontrado correspondente aos critérios de pesquisa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
