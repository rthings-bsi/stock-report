'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { readExcelFile, parseExcelFiles, ParsedWarehouseState } from '../lib/parser';
import { parseDamagedPackagingFile } from '../lib/parseDamagedPackaging';
import { parseIncomingPackagingFile } from '../lib/parseIncomingPackaging';
import { RolePermissions } from '../types/auth';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataParsed: (newState: ParsedWarehouseState) => void;
  userPermissions?: RolePermissions;
  isAdmin?: boolean;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onDataParsed,
  userPermissions,
  isAdmin = false
}) => {
  const [pipeFile, setPipeFile] = useState<File | null>(null);
  const [coilFile, setCoilFile] = useState<File | null>(null);
  const [looFile, setLooFile] = useState<File | null>(null);
  const [packagingFile, setPackagingFile] = useState<File | null>(null);
  const [incomingFile, setIncomingFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canUploadPipe = isAdmin || Boolean(userPermissions?.canUploadPipe ?? userPermissions?.canUploadSAP ?? true);
  const canUploadCoil = isAdmin || Boolean(userPermissions?.canUploadCoil ?? userPermissions?.canUploadSAP ?? true);
  const canUploadLoo = isAdmin || Boolean(userPermissions?.canUploadLoo ?? userPermissions?.canUploadSAP ?? true);
  const canUploadDamagedPkg = isAdmin || Boolean(userPermissions?.canUploadDamagedPkg ?? userPermissions?.canUploadSAP ?? true);
  const canUploadIncomingPkg = isAdmin || Boolean(userPermissions?.canUploadIncomingPkg ?? userPermissions?.canUploadSAP ?? true);
  const hasAnyUploadPermission = canUploadPipe || canUploadCoil || canUploadLoo || canUploadDamagedPkg || canUploadIncomingPkg;

  const pipeInputRef = useRef<HTMLInputElement>(null);
  const coilInputRef = useRef<HTMLInputElement>(null);
  const looInputRef = useRef<HTMLInputElement>(null);
  const packagingInputRef = useRef<HTMLInputElement>(null);
  const incomingInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;
  const handleProcessFiles = async () => {
    if (!pipeFile && !coilFile && !looFile && !packagingFile && !incomingFile) {
      setErrorMsg('Silakan pilih minimal satu file spreadsheet export SAP (.xlsx / .xls).');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      let pipeRows: Record<string, unknown>[] = [];
      let coilRows: Record<string, unknown>[] = [];
      let looRows: Record<string, unknown>[] = [];
      let packagingRows: Record<string, unknown>[] = [];
      let incomingRows: Record<string, unknown>[] = [];

      if (pipeFile && canUploadPipe) pipeRows = await readExcelFile(pipeFile);
      if (coilFile && canUploadCoil) coilRows = await readExcelFile(coilFile);
      if (looFile && canUploadLoo) looRows = await readExcelFile(looFile);
      if (packagingFile && canUploadDamagedPkg) packagingRows = await readExcelFile(packagingFile);
      if (incomingFile && canUploadIncomingPkg) incomingRows = await readExcelFile(incomingFile);

      const parsedResult = parseExcelFiles(pipeRows, coilRows, looRows);
      if (packagingFile && canUploadDamagedPkg && packagingRows.length > 0) {
        parsedResult.damagedPackagingData = parseDamagedPackagingFile(packagingRows);
      }
      if (incomingFile && canUploadIncomingPkg && incomingRows.length > 0) {
        parsedResult.incomingPackagingData = parseIncomingPackagingFile(incomingRows);
      }
      onDataParsed(parsedResult);
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('Gagal memproses file. Pastikan format kolom file sesuai export standar SAP (MB52 / ZMM / LOO / Packaging).');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800 text-white shadow-xs">
              <Upload className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Upload Raw Data SAP</h2>
              <p className="text-xs text-slate-500 font-medium">Impor data transaksi stock pipa, coil/strip, dan order LOO</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!hasAnyUploadPermission && (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 font-medium text-center justify-center">
              <AlertCircle className="h-4 w-4 shrink-0 text-slate-400" />
              <span>Role Anda saat ini tidak memiliki izin untuk mengunggah file raw data manapun.</span>
            </div>
          )}

          {/* 1. Raw Stock Pipa */}
          {canUploadPipe && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-emerald-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900">Data Stock Pipa (zppshstock)</span>
                    <p className="text-[10px] text-slate-500 font-mono">Export SAP MB52 / ZPPSHSTOCK</p>
                  </div>
                </div>
                <input
                  ref={pipeInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={(e) => setPipeFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  onClick={() => pipeInputRef.current?.click()}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {pipeFile ? 'Ganti File' : 'Pilih File'}
                </button>
              </div>
              {pipeFile && (
                <div className="mt-2.5 flex items-center gap-2 text-xs font-mono font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="truncate">{pipeFile.name} ({(pipeFile.size / 1024).toFixed(0)} KB)</span>
                </div>
              )}
            </div>
          )}

          {/* 2. Raw Stock Coil & Strip */}
          {canUploadCoil && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-emerald-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900">Data Stock Coil &amp; Strip (Bahan Baku)</span>
                    <p className="text-[10px] text-slate-500 font-mono">Export SAP Stock Bahan Baku Induk</p>
                  </div>
                </div>
                <input
                  ref={coilInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={(e) => setCoilFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  onClick={() => coilInputRef.current?.click()}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {coilFile ? 'Ganti File' : 'Pilih File'}
                </button>
              </div>
              {coilFile && (
                <div className="mt-2.5 flex items-center gap-2 text-xs font-mono font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="truncate">{coilFile.name} ({(coilFile.size / 1024).toFixed(0)} KB)</span>
                </div>
              )}
            </div>
          )}

          {/* 3. Raw LOO Outstanding */}
          {canUploadLoo && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-emerald-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900">Data LOO (Delivery Order)</span>
                    <p className="text-[10px] text-slate-500 font-mono">Export SAP Open Order Delivery</p>
                  </div>
                </div>
                <input
                  ref={looInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={(e) => setLooFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  onClick={() => looInputRef.current?.click()}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {looFile ? 'Ganti File' : 'Pilih File'}
                </button>
              </div>
              {looFile && (
                <div className="mt-2.5 flex items-center gap-2 text-xs font-mono font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="truncate">{looFile.name} ({(looFile.size / 1024).toFixed(0)} KB)</span>
                </div>
              )}
            </div>
          )}

          {/* 4. Data Packaging Rusak (NG) */}
          {canUploadDamagedPkg && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-amber-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-900">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900">Data Packaging Rusak (RTP NG)</span>
                    <p className="text-[10px] text-slate-500 font-mono">File spreadsheet / CSV temuan RTP rusak</p>
                  </div>
                </div>
                <input
                  ref={packagingInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, .txt, .tsv"
                  className="hidden"
                  onChange={(e) => setPackagingFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  onClick={() => packagingInputRef.current?.click()}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {packagingFile ? 'Ganti File' : 'Pilih File'}
                </button>
              </div>
              {packagingFile && (
                <div className="mt-2.5 flex items-center gap-2 text-xs font-mono font-medium text-amber-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="truncate">{packagingFile.name} ({(packagingFile.size / 1024).toFixed(0)} KB)</span>
                </div>
              )}
            </div>
          )}

          {/* 5. Data Incoming & Mutasi Packaging (RTP) */}
          {canUploadIncomingPkg && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-emerald-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900">Data Incoming &amp; Mutasi Packaging (RTP)</span>
                    <p className="text-[10px] text-slate-500 font-mono">File audit harian &amp; mutasi penerimaan packaging</p>
                  </div>
                </div>
                <input
                  ref={incomingInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, .txt, .tsv"
                  className="hidden"
                  onChange={(e) => setIncomingFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  onClick={() => incomingInputRef.current?.click()}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {incomingFile ? 'Ganti File' : 'Pilih File'}
                </button>
              </div>
              {incomingFile && (
                <div className="mt-2.5 flex items-center gap-2 text-xs font-mono font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="truncate">{incomingFile.name} ({(incomingFile.size / 1024).toFixed(0)} KB)</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isLoading || (!pipeFile && !coilFile && !looFile && !packagingFile && !incomingFile)}
            onClick={handleProcessFiles}
            className="flex items-center gap-2 rounded-lg bg-emerald-800 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-900 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
                <span>Memproses Data...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 text-amber-300" />
                <span>Proses &amp; Simpan ke Database</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
