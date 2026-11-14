import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { compressImage } from '../../services/imageCompress';
import { friendlyError } from '../../services/errors';

interface EvidenceInputProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}

/** Área de print: Ctrl+V em qualquer ponto da página, arrastar ou escolher arquivo. */
export default function EvidenceInput({ value, onChange, disabled = false }: EvidenceInputProps) {
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  const ingest = useCallback(async (file: Blob) => {
    setBusy(true);
    try {
      onChangeRef.current(await compressImage(file));
    } catch (err) {
      toast.error(friendlyError(err, 'Não foi possível usar este print.'));
    } finally {
      setBusy(false);
    }
  }, []);

  // Colar (Ctrl+V): só reage quando o conteúdo colado traz imagem; texto continua colando normalmente.
  useEffect(() => {
    if (disabled) return;
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.kind === 'file' && i.type.startsWith('image/'));
      const file = item?.getAsFile();
      if (file) {
        e.preventDefault();
        void ingest(file);
      } else if (e.clipboardData?.files.length) {
        toast.error('Cole ou selecione uma imagem.');
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [disabled, ingest]);

  if (value) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
        <img src={value} alt="Pré-visualização do print" className="max-h-52 w-full object-contain" />
        {!disabled && (
          <button
            type="button" onClick={() => onChange(null)} aria-label="Remover print"
            className="absolute right-2 top-2 rounded-full bg-zinc-900/70 p-1.5 text-white backdrop-blur transition hover:bg-rose-600 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && !disabled) void ingest(file);
      }}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
        dragging ? 'border-[#0bbb81] bg-emerald-50/60 dark:bg-emerald-950/20' : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-900/40'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      {busy ? <Loader2 className="h-6 w-6 animate-spin text-[#0bbb81]" /> : <ImagePlus className="h-6 w-6 text-zinc-400" />}
      <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
        {busy ? 'Processando o print...' : <>Cole o print com <kbd className="rounded border border-zinc-300 dark:border-zinc-600 px-1 text-[10px]">Ctrl</kbd>+<kbd className="rounded border border-zinc-300 dark:border-zinc-600 px-1 text-[10px]">V</kbd>, arraste aqui ou</>}
      </p>
      {!busy && (
        <button
          type="button" disabled={disabled} onClick={() => inputRef.current?.click()}
          className="text-xs font-bold text-[#006c49] dark:text-[#4bdfa1] underline-offset-2 hover:underline cursor-pointer disabled:cursor-not-allowed"
        >
          escolher arquivo
        </button>
      )}
      <input
        ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void ingest(f); e.target.value = ''; }}
      />
    </div>
  );
}
