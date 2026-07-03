import type { Feedback } from '../types';
import { parseDate } from './dateUtils';

const PDF_PAGE_LIMIT = 500;

// Prevents CSV formula injection: Excel/Sheets execute a cell's content as a
// formula when it starts with =, +, -, @ (or a tab/CR). Prefixing with a
// single quote forces it to be read as plain text instead of executed.
function sanitizeCsvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export const exportService = {
  async exportToPDF(feedbacks: Feedback[], supervisorName: string, technicianName?: string) {
    const { jsPDF } = await import('jspdf');

    const batch = feedbacks.slice(0, PDF_PAGE_LIMIT);
    const truncated = feedbacks.length > PDF_PAGE_LIMIT;
    if (truncated) {
      console.warn(
        `[exportService] Export limitado a ${PDF_PAGE_LIMIT} feedbacks (total: ${feedbacks.length}). ` +
        'Use filtros para exportar conjuntos menores.'
      );
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    const pageWidth = doc.internal.pageSize.width; // 210mm
    const pageHeight = doc.internal.pageSize.height; // 297mm
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2); // 170mm

    // Draw header decoration block (Elegant dark bar)
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Branding / Accent line
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.rect(0, 45, pageWidth, 2, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('FEED-TRACK', margin, 18);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Relatório Executivo de Feedbacks', margin, 24);

    // Meta Header (Right aligned)
    const rightAlignX = pageWidth - margin;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Colaborador: ${technicianName || 'Geral'}`, rightAlignX, 18, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Supervisor: ${supervisorName}`, rightAlignX, 24, { align: 'right' });

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    doc.text(`Emitido em: ${dateStr}`, rightAlignX, 30, { align: 'right' });

    if (truncated) {
      doc.setFontSize(8.5);
      doc.setTextColor(245, 158, 11);
      doc.text(
        `⚠ Exibindo ${PDF_PAGE_LIMIT} de ${feedbacks.length} registros. Use filtros para exportar o restante.`,
        margin, 53
      );
    }

    let currentY = truncated ? 62 : 58;

    // Iterate feedbacks as elegant blocks (cards)
    batch.forEach((f) => {
      const date = parseDate(f.createdAt);
      const dateStr = date.toLocaleDateString('pt-BR');
      
      // Setup text and wrap
      const isPositive = f.type === 'positive';
      const typeLabel = isPositive ? 'FEEDBACK POSITIVO' : 'FEEDBACK DE DESENVOLVIMENTO';
      const statusLabel = f.status === 'read' ? 'Lido' : 'Pendente de leitura';
      
      const desc = f.description || '';
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const wrappedDesc = doc.splitTextToSize(desc, contentWidth - 16); // padding 8 on left and right
      
      // Calculate card height dynamically based on description size
      const descHeight = wrappedDesc.length * 4.8;
      const cardHeight = 24 + descHeight;

      // Page break check
      if (currentY + cardHeight > pageHeight - 25) {
        doc.addPage();
        // Draw small page top header
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, 15, 'F');
        doc.setFillColor(16, 185, 129);
        doc.rect(0, 15, pageWidth, 1, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('FEED-TRACK — Relatório Executivo', margin, 10);

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(`Colaborador: ${technicianName || 'Geral'}`, rightAlignX, 10, { align: 'right' });

        currentY = 24;
      }

      // Draw Card Container (light gray border with subtle background fill)
      doc.setFillColor(250, 250, 250); // clear light background
      doc.setDrawColor(226, 232, 240); // slate-200 border
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, currentY, contentWidth, cardHeight, 1.5, 1.5, 'FD');

      // Left Accent Color Bar inside card (Green for positive, Orange/Amber for development)
      if (isPositive) {
        doc.setFillColor(16, 185, 129); // emerald-500
      } else {
        doc.setFillColor(245, 158, 11); // amber-500
      }
      doc.rect(margin + 0.3, currentY + 0.3, 3, cardHeight - 0.6, 'F');

      // Card Header
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text(typeLabel, margin + 8, currentY + 7);

      // Card Header Date and Status
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`Data: ${dateStr}   |   Eixo: ${f.axis}   |   Status: ${statusLabel}`, margin + 8, currentY + 12);

      // Divider line in card
      doc.setDrawColor(241, 245, 249); // slate-100
      doc.setLineWidth(0.25);
      doc.line(margin + 8, currentY + 14, margin + contentWidth - 8, currentY + 14);

      // Description text
      doc.setTextColor(51, 65, 85); // slate-700
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      
      let textY = currentY + 19;
      wrappedDesc.forEach((line: string) => {
        doc.text(line, margin + 8, textY);
        textY += 4.8;
      });

      // Advance vertical offset for next card
      currentY += cardHeight + 8;
    });

    // Footer layout for all pages
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184); // slate-400
      
      // Bottom line decoration
      doc.setDrawColor(241, 245, 249); // slate-100
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      
      doc.text('FEED-TRACK — Gestão de Desempenho e Metas', margin, pageHeight - 10);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 25, pageHeight - 10);
    }
    
    doc.save(`feed-track-relatorio-${technicianName ? technicianName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'geral'}.pdf`);
  },

  exportTeamData(
    teamData: {
      technician: any;
      climate: {
        communication: number;
        teamwork: number;
        technical: number;
        proactivity: number;
        attendance: number;
        overall: number;
        assessmentsCount: number;
      };
      pdi: {
        total: number;
        pending: number;
        inProgress: number;
        completed: number;
        completionRate: number;
      };
      feedbacks: {
        total: number;
        positive: number;
        development: number;
        pending: number;
      };
    }[],
    format: 'csv' | 'xlsx'
  ) {
    const isExcel = format === 'xlsx';
    const separator = isExcel ? ';' : ',';
    
    // Headers
    const headers = [
      'Nome do Colaborador',
      'E-mail',
      'Time',
      'Cargo',
      'Status',
      'Qtd Autoavaliações',
      'Média Comunicação',
      'Média Trabalho em Equipe',
      'Média Conhecimento Técnico',
      'Média Proatividade',
      'Média Comprometimento',
      'Média Geral de Clima',
      'PDI: Total de Objetivos',
      'PDI: Pendentes',
      'PDI: Em Andamento',
      'PDI: Concluídos',
      'PDI: Taxa de Conclusão (%)',
      'Feedbacks: Total',
      'Feedbacks: Positivos',
      'Feedbacks: Desenvolvimento',
      'Feedbacks: Pendentes'
    ];

    const rows = teamData.map(item => {
      const statusStr = item.technician.active ? 'Ativo' : 'Inativo';
      const teamStr = item.technician.team === 'back-office' ? 'Back-office' : 'Teleservice';
      
      const formatNum = (val: number) => {
        if (isExcel) {
          // Replace dot with comma for Portuguese Excel decimal format compatibility
          return val.toString().replace('.', ',');
        }
        return val.toString();
      };

      return [
        sanitizeCsvCell(item.technician.name),
        sanitizeCsvCell(item.technician.email),
        sanitizeCsvCell(teamStr),
        sanitizeCsvCell(item.technician.position),
        sanitizeCsvCell(statusStr),
        item.climate.assessmentsCount,
        formatNum(item.climate.communication),
        formatNum(item.climate.teamwork),
        formatNum(item.climate.technical),
        formatNum(item.climate.proactivity),
        formatNum(item.climate.attendance),
        formatNum(item.climate.overall),
        item.pdi.total,
        item.pdi.pending,
        item.pdi.inProgress,
        item.pdi.completed,
        formatNum(item.pdi.completionRate),
        item.feedbacks.total,
        item.feedbacks.positive,
        item.feedbacks.development,
        item.feedbacks.pending
      ];
    });

    // BOM (Byte Order Mark) for UTF-8 so Excel opens accented characters correctly
    const csvContent = "\uFEFF" + [headers.join(separator), ...rows.map(r => r.join(separator))].join('\r\n');

    // The content is always plain delimited text \u2014 for "Excel" we just use a
    // semicolon separator and comma decimals (pt-BR Excel convention), but it
    // is still CSV, not an OOXML/zip spreadsheet. Naming it .xlsx would make
    // Excel report the file as corrupted, so it always downloads as .csv.
    const fileExtension = 'csv';
    const mimeType = 'text/csv;charset=utf-8;';

    const blob = new Blob([csvContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filename = `feed-track-exportacao-equipe-${dateStr}.${fileExtension}`;
    
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

