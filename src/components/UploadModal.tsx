'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2, Calendar, Clock } from 'lucide-react';
import { readExcelFile, parseExcelFiles, ParsedWarehouseState } from '../lib/parser';
import { parseDamagedPackagingFile } from '../lib/parseDamagedPackaging';
import { parseIncomingPackagingFile } from '../lib/parseIncomingPackaging';
import { parseNCProgressRows } from '../lib/parseNCProgress';
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
  const [targetDate, setTargetDate] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [pipeFile, setPipeFile] = useState<File | null>(null);
  const [coilFile, setCoilFile] = useState<File | null>(null);
  const [looFile, setLooFile] = useState<File | null>(null);
  const [packagingFile, setPackagingFile] = useState<File | null>(null);
  const [incomingFile, setIncomingFile] = useState<File | null>(null);
  const [ncProgressFile, setNcProgressFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canUploadPipe = isAdmin || Boolean(userPermissions?.canUploadPipe ?? userPermissions?.canUploadSAP ?? true);
  const canUploadCoil = isAdmin || Boolean(userPermissions?.canUploadCoil ?? userPermissions?.canUploadSAP ?? true);
  const canUploadLoo = isAdmin || Boolean(userPermissions?.canUploadLoo ?? userPermissions?.canUploadSAP ?? true);
  const canUploadDamagedPkg = isAdmin || Boolean(userPermissions?.canUploadDamagedPkg ?? userPermissions?.canUploadSAP ?? true);
  const canUploadIncomingPkg = isAdmin || Boolean(userPermissions?.canUploadIncomingPkg ?? userPermissions?.canUploadSAP ?? true);
  const canUploadProgressNC = isAdmin || Boolean(userPermissions?.canUploadProgressNC ?? userPermissions?.canUploadSAP ?? true);
  const hasAnyUploadPermission = canUploadPipe || canUploadCoil || canUploadLoo || canUploadDamagedPkg || canUploadIncomingPkg || canUploadProgressNC;

  const pipeInputRef = useRef<HTMLInputElement>(null);
  const coilInputRef = useRef<HTMLInputElement>(null);
  const looInputRef = useRef<HTMLInputElement>(null);
  const packagingInputRef = useRef<HTMLInputElement>(null);
  const incomingInputRef = useRef<HTMLInputElement>(null);
  const ncProgressInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const todayStr = (() => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  })();

  const isBackdate = targetDate !== todayStr;

  const handleProcessFiles = async () => {
    if (!pipeFile && !coilFile && !looFile && !packagingFile && !incomingFile && !ncProgressFile) {
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
      let ncProgressRows: Record<string, unknown>[] = [];

      // 1. Baca tiap file secara terisolasi agar error spesifik file terlihat jelas
      if (pipeFile && canUploadPipe) {
        try {
          pipeRows = await readExcelFile(pipeFile);
        } catch (e: unknown) {
          const m = e instanceof Error ? e.message : 'Format file tidak dapat dibaca';
          throw new Error(`File Data Pipa (${pipeFile.name}): ${m}`);
        }
      }

      if (coilFile && canUploadCoil) {
        try {
          coilRows = await readExcelFile(coilFile);
        } catch (e: unknown) {
          const m = e instanceof Error ? e.message : 'Format file tidak dapat dibaca';
          throw new Error(`File Data Coil (${coilFile.name}): ${m}`);
        }
      }

      if (looFile && canUploadLoo) {
        try {
          looRows = await readExcelFile(looFile);
        } catch (e: unknown) {
          const m = e instanceof Error ? e.message : 'Format file tidak dapat dibaca';
          throw new Error(`File Data LOO (${looFile.name}): ${m}`);
        }
      }

      if (packagingFile && canUploadDamagedPkg) {
        try {
          packagingRows = await readExcelFile(packagingFile);
        } catch (e: unknown) {
          const m = e instanceof Error ? e.message : 'Format file tidak dapat dibaca';
          throw new Error(`File Packaging Rusak (${packagingFile.name}): ${m}`);
        }
      }

      if (incomingFile && canUploadIncomingPkg) {
        try {
          incomingRows = await readExcelFile(incomingFile);
        } catch (e: unknown) {
          const m = e instanceof Error ? e.message : 'Format file tidak dapat dibaca';
          throw new Error(`File Incoming Packaging (${incomingFile.name}): ${m}`);
        }
      }

      if (ncProgressFile && canUploadProgressNC) {
        try {
          ncProgressRows = await readExcelFile(ncProgressFile);
        } catch (e: unknown) {
          const m = e instanceof Error ? e.message : 'Format file tidak dapat dibaca';
          throw new Error(`File Progres NC (${ncProgressFile.name}): ${m}`);
        }
      }

      // 2. Parse struktur data
      let parsedResult: ParsedWarehouseState;
      try {
        parsedResult = parseExcelFiles(pipeRows, coilRows, looRows);
      } catch (e: unknown) {
        const m = e instanceof Error ? e.message : 'Format kolom tidak cocok dengan template SAP';
        throw new Error(`Gagal memproses data Stock / LOO: ${m}`);
      }

      const uploadedCategories: ('pipe' | 'coil' | 'loo' | 'damaged_pkg' | 'incoming_pkg' | 'progress_nc')[] = [];

      if (pipeFile && pipeRows.length > 0) {
        const pipeStockTotal = (parsedResult.pipeCapacities || []).reduce((acc, c) => acc + (c.stock || 0), 0);
        if (pipeStockTotal === 0 && (!parsedResult.ncWarehouseData || parsedResult.ncWarehouseData.length === 0)) {
          throw new Error(`File Stock Pipa (${pipeFile.name}) terbaca ${pipeRows.length} baris, namun tidak ada nilai tonase yang terdeteksi. Periksa kolom SLOC, Material, dan Berat.`);
        }
        uploadedCategories.push('pipe');
      }

      if (coilFile && coilRows.length > 0) {
        const coilTotal = (parsedResult.coilStripData || []).reduce((acc, c) => acc + (c.totalTon || 0), 0);
        if (coilTotal === 0) {
          throw new Error(`File Coil/Strip (${coilFile.name}) terbaca ${coilRows.length} baris, namun tidak ada tonase bahan baku yang terdeteksi.`);
        }
        uploadedCategories.push('coil');
      }

      if (looFile && looRows.length > 0) {
        const looCount = (parsedResult.looSTData?.length || 0) + (parsedResult.looLTData?.length || 0);
        if (looCount === 0) {
          throw new Error(`File LOO (${looFile.name}) terbaca ${looRows.length} baris, namun tidak ditemukan kolom order/material yang cocok. Pastikan file memuat kolom Material/Ukuran dan Kurang(KG)/Order.`);
        }
        uploadedCategories.push('loo');
      }

      if (packagingFile && canUploadDamagedPkg && packagingRows.length > 0) {
        try {
          parsedResult.damagedPackagingData = parseDamagedPackagingFile(packagingRows);
          uploadedCategories.push('damaged_pkg');
        } catch (e: unknown) {
          const m = e instanceof Error ? e.message : 'Format kolom Packaging Rusak tidak sesuai';
          throw new Error(`Gagal memproses Packaging Rusak: ${m}`);
        }
      }

      if (incomingFile && canUploadIncomingPkg && incomingRows.length > 0) {
        try {
          parsedResult.incomingPackagingData = parseIncomingPackagingFile(incomingRows);
          uploadedCategories.push('incoming_pkg');
        } catch (e: unknown) {
          const m = e instanceof Error ? e.message : 'Format kolom Incoming Packaging tidak sesuai';
          throw new Error(`Gagal memproses Incoming Packaging: ${m}`);
        }
      }

      if (ncProgressFile && canUploadProgressNC && ncProgressRows.length > 0) {
        try {
          parsedResult.ncProgressData = parseNCProgressRows(ncProgressRows);
          uploadedCategories.push('progress_nc');
        } catch (e: unknown) {
          const m = e instanceof Error ? e.message : 'Format kolom Progres NC tidak sesuai';
          throw new Error(`Gagal memproses Progres NC: ${m}`);
        }
      }

      parsedResult.uploadedCategories = uploadedCategories;

      // 3. Format timestamp dan snapshotKey berdasarkan tanggal yang dipilih
      const chosenDate = targetDate || todayStr;
      const [yVal, mVal, dVal] = chosenDate.split('-');
      const formattedDate = `${dVal}/${mVal}/${yVal}`;
      const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      parsedResult.lastUpdated = `${formattedDate}, ${nowTime}`;
      parsedResult.snapshotKey = `snap_${chosenDate}`;
      parsedResult.targetDate = chosenDate;

      onDataParsed(parsedResult);
      onClose();
    } catch (err: unknown) {
      console.error('Upload Error:', err);
      const msg = err instanceof Error
        ? err.message
        : 'Gagal memproses file. Pastikan format kolom file sesuai export standar SAP (MB52 / MB51 / ZMM / LOO / Packaging).';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800 text-white shadow-xs">
              <Upload className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Upload Raw Data SAP</h2>
              <p className="text-xs text-slate-500 font-medium">Impor data stock pipa, coil/strip, LOO, dan transaksi harian</p>
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
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-900 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-700 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block mb-0.5">Terjadi Kendala Pemrosesan File:</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Tanggal Data / Snapshot Backdate Selector */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-800 text-white shadow-2xs">
                  <Calendar className="h-4 w-4 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Tanggal Data Snapshot</span>
                    {isBackdate ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-300">
                        <Clock className="h-3 w-3 text-amber-700" />
                        Backdate Arsip
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                        Hari Ini
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Ubah tanggal jika ingin memasukkan data tanggal sebelumnya (backdate)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer"
                />
                {isBackdate && (
                  <button
                    type="button"
                    onClick={() => setTargetDate(todayStr)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                    title="Kembalikan ke hari ini"
                  >
                    Reset Hari Ini
                  </button>
                )}
              </div>
            </div>
          </div>

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
                  accept=".xlsx, .xls, .csv, .txt, .tsv"
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
                  accept=".xlsx, .xls, .csv, .txt, .tsv"
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
                  accept=".xlsx, .xls, .csv, .txt, .tsv"
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

          {/* 6. Data Transaksi Progres NC (MVT 309, 261, 101) */}
          {canUploadProgressNC && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-emerald-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900">Data Transaksi Progres NC &amp; Repair</span>
                    <p className="text-[10px] text-slate-500 font-mono">Export SAP MB51 / ZMM (MVT 309, 261 REP, 101 REP)</p>
                  </div>
                </div>
                <input
                  ref={ncProgressInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, .txt, .tsv"
                  className="hidden"
                  onChange={(e) => setNcProgressFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  onClick={() => ncProgressInputRef.current?.click()}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {ncProgressFile ? 'Ganti File' : 'Pilih File'}
                </button>
              </div>
              {ncProgressFile && (
                <div className="mt-2.5 flex items-center gap-2 text-xs font-mono font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="truncate">{ncProgressFile.name} ({(ncProgressFile.size / 1024).toFixed(0)} KB)</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 p-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isLoading || (!pipeFile && !coilFile && !looFile && !packagingFile && !incomingFile && !ncProgressFile)}
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
                <span>{isBackdate ? `Simpan Backdate (${targetDate})` : 'Proses & Simpan ke Database'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
