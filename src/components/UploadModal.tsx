'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2, Calendar, Clock } from 'lucide-react';
import { readExcelFile, readExcelFileRawMatrix, parseExcelFiles, ParsedWarehouseState } from '../lib/parser';
import { parseDamagedPackagingFile } from '../lib/parseDamagedPackaging';
import { parseIncomingPackagingFile } from '../lib/parseIncomingPackaging';
import { parseNCProgressRows } from '../lib/parseNCProgress';
import { parseStockOpnameFile } from '../lib/parseStockOpname';
import { RolePermissions } from '../types/auth';
import { WarehouseCapacityConfig } from '../types/warehouse';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataParsed: (newState: ParsedWarehouseState) => void;
  userPermissions?: RolePermissions;
  isAdmin?: boolean;
  capacityConfig?: WarehouseCapacityConfig;
}

interface UploadItemRowProps {
  canUpload: boolean;
  title: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  isPackaging?: boolean;
}

const UploadItemRow: React.FC<UploadItemRowProps> = ({
  canUpload,
  title,
  file,
  onFileChange,
  inputRef,
  isPackaging = false
}) => {
  if (!canUpload) return null;

  return (
    <div
      className={`px-3.5 py-2.5 transition-colors ${
        file ? 'bg-emerald-50/40' : 'hover:bg-slate-50/70'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              file
                ? 'bg-emerald-100 text-emerald-700'
                : isPackaging
                ? 'bg-amber-50 text-amber-600'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {file ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-slate-800 block truncate">
              {title}
            </span>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx, .xls, .csv, .txt, .tsv"
          className="hidden"
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
        />

        {file ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="inline-flex items-center gap-1 max-w-[135px] px-2 py-0.5 rounded-md bg-emerald-100/70 border border-emerald-200/60 text-[11px] font-medium text-emerald-800">
              <span className="truncate">{file.name}</span>
              <span className="text-[9px] text-emerald-600 font-mono shrink-0">
                {(file.size / 1024).toFixed(0)}K
              </span>
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-2 py-0.5 text-[10.5px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200/70 cursor-pointer transition-colors"
              title="Ganti file"
            >
              Ganti
            </button>
            <button
              type="button"
              onClick={() => {
                onFileChange(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
              title="Hapus file"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Pilih File
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onDataParsed,
  userPermissions,
  isAdmin = false,
  capacityConfig
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
  const [stoFile, setStoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canUploadPipe = isAdmin || Boolean(userPermissions?.canUploadPipe ?? userPermissions?.canUploadSAP ?? true);
  const canUploadCoil = isAdmin || Boolean(userPermissions?.canUploadCoil ?? userPermissions?.canUploadSAP ?? true);
  const canUploadLoo = isAdmin || Boolean(userPermissions?.canUploadLoo ?? userPermissions?.canUploadSAP ?? true);
  const canUploadDamagedPkg = isAdmin || Boolean(userPermissions?.canUploadDamagedPkg ?? userPermissions?.canUploadSAP ?? true);
  const canUploadIncomingPkg = isAdmin || Boolean(userPermissions?.canUploadIncomingPkg ?? userPermissions?.canUploadSAP ?? true);
  const canUploadProgressNC = isAdmin || Boolean(userPermissions?.canUploadProgressNC ?? userPermissions?.canUploadSAP ?? true);
  const canUploadSTO = isAdmin || Boolean(userPermissions?.canUploadSTO ?? userPermissions?.canUploadSAP ?? true);
  const hasAnyUploadPermission = canUploadPipe || canUploadCoil || canUploadLoo || canUploadDamagedPkg || canUploadIncomingPkg || canUploadProgressNC || canUploadSTO;

  const pipeInputRef = useRef<HTMLInputElement>(null);
  const coilInputRef = useRef<HTMLInputElement>(null);
  const looInputRef = useRef<HTMLInputElement>(null);
  const packagingInputRef = useRef<HTMLInputElement>(null);
  const incomingInputRef = useRef<HTMLInputElement>(null);
  const ncProgressInputRef = useRef<HTMLInputElement>(null);
  const stoInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const todayStr = (() => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  })();

  const isBackdate = targetDate !== todayStr;
  const selectedCount = [pipeFile, coilFile, looFile, packagingFile, incomingFile, ncProgressFile, stoFile].filter(Boolean).length;

  const handleProcessFiles = async () => {
    if (!pipeFile && !coilFile && !looFile && !packagingFile && !incomingFile && !ncProgressFile && !stoFile) {
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
      let stoRawMatrix: unknown[][] = [];

      // 1. Baca tiap file secara terisolasi agar error spesifik file terlihat jelas
      // Cek apakah user memilih file yang sama untuk slot Pipa dan Coil
      const isSameFileForPipeAndCoil = Boolean(
        pipeFile && coilFile &&
        (pipeFile === coilFile || (pipeFile.name === coilFile.name && pipeFile.size === coilFile.size))
      );

      if (pipeFile && canUploadPipe) {
        try {
          const sheetPipa = await readExcelFile(pipeFile, 'pipa');
          if (sheetPipa.length > 0) {
            pipeRows = sheetPipa;
          } else {
            pipeRows = await readExcelFile(pipeFile);
          }
        } catch (e: unknown) {
          const m = e instanceof Error ? e.message : 'Format file tidak dapat dibaca';
          throw new Error(`File Data Pipa (${pipeFile.name}): ${m}`);
        }
      }

      if (coilFile && canUploadCoil && !isSameFileForPipeAndCoil) {
        try {
          const sheetCoil = await readExcelFile(coilFile, 'coil');
          if (sheetCoil.length > 0) {
            coilRows = sheetCoil;
          } else {
            coilRows = await readExcelFile(coilFile);
          }
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

      if (stoFile && canUploadSTO) {
        try {
          stoRawMatrix = await readExcelFileRawMatrix(stoFile);
        } catch (e: unknown) {
          const m = e instanceof Error ? e.message : 'Format file tidak dapat dibaca';
          throw new Error(`File Data Stock Opname (${stoFile.name}): ${m}`);
        }
      }

      // 2. Parse struktur data (otomatis segregasi pipe vs coil jika 1 file zppshstock diupload di slot pipa)
      let parsedResult: ParsedWarehouseState;
      try {
        parsedResult = parseExcelFiles(pipeRows, coilRows, looRows, { customCapacities: capacityConfig });
      } catch (e: unknown) {
        const m = e instanceof Error ? e.message : 'Format kolom tidak cocok dengan template SAP';
        throw new Error(`Gagal memproses data Stock / LOO: ${m}`);
      }

      const uploadedCategories: ('pipe' | 'coil' | 'loo' | 'damaged_pkg' | 'incoming_pkg' | 'progress_nc' | 'sto')[] = [];

      if (pipeFile && pipeRows.length > 0) {
        const pipeStockTotal = (parsedResult.pipeCapacities || []).reduce((acc, c) => acc + (c.stock || 0), 0);
        if (pipeStockTotal > 0 || (parsedResult.ncWarehouseData && parsedResult.ncWarehouseData.length > 0)) {
          uploadedCategories.push('pipe');
        }
        // Jika 1 file zppshstock diupload di slot pipa dan memuat data coil/strip:
        const coilTotalFromPipe = (parsedResult.coilStripData || []).reduce((acc, c) => acc + (c.totalTon || 0), 0);
        const hasCoilDataFromPipe = coilTotalFromPipe > 0 || (parsedResult.unfifoCoilData && parsedResult.unfifoCoilData.length > 0) || (parsedResult.coilStripData && parsedResult.coilStripData.some(c => (c.totalQty || 0) > 0));
        if (!coilFile && hasCoilDataFromPipe && !uploadedCategories.includes('coil')) {
          uploadedCategories.push('coil');
        }
      }

      if (coilFile && coilRows.length > 0) {
        if (!uploadedCategories.includes('coil')) {
          uploadedCategories.push('coil');
        }
        // Jika file yang diunggah di slot coil memuat data pipa juga:
        const pipeStockTotalFromCoil = (parsedResult.pipeCapacities || []).reduce((acc, c) => acc + (c.stock || 0), 0);
        if (!pipeFile && pipeStockTotalFromCoil > 0 && !uploadedCategories.includes('pipe')) {
          uploadedCategories.push('pipe');
        }
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

      if (stoFile && canUploadSTO && stoRawMatrix.length > 0) {
        try {
          parsedResult.stoData = parseStockOpnameFile(stoRawMatrix);
          uploadedCategories.push('sto');
        } catch (e: unknown) {
          const m = e instanceof Error ? e.message : 'Format kolom Stock Opname tidak sesuai';
          throw new Error(`Gagal memproses Data Stock Opname: ${m}`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-[500px] max-h-[92vh] my-auto flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4.5 py-3 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-700 shadow-2xs shrink-0">
              <Upload className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 tracking-tight leading-tight">Upload Raw Data SAP</h2>
              <p className="text-[10.5px] text-slate-500 font-medium leading-tight mt-0.5">Impor data stock pipa, coil/strip, LOO, dan transaksi harian</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-3.5 space-y-2.5 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/80 p-2.5 text-xs text-rose-900 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="font-bold block mb-0.5">Terjadi Kendala Pemrosesan File:</span>
                <span className="text-rose-800 text-[11px] leading-snug">{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Tanggal Data Snapshot - Compact Minimalist Bar */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span className="text-xs font-medium text-slate-600 shrink-0">Tanggal Snapshot:</span>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer text-xs min-w-0 flex-1"
              />
            </div>
            {isBackdate ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200/80">
                  <Clock className="h-2.5 w-2.5 text-amber-600" />
                  Backdate
                </span>
                <button
                  type="button"
                  onClick={() => setTargetDate(todayStr)}
                  className="text-[10px] font-semibold text-slate-500 hover:text-slate-900 underline cursor-pointer"
                  title="Kembalikan ke hari ini"
                >
                  Reset
                </button>
              </div>
            ) : (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200/80 shrink-0">
                Hari Ini
              </span>
            )}
          </div>

          {!hasAnyUploadPermission && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-500 font-medium text-center justify-center">
              <AlertCircle className="h-4 w-4 shrink-0 text-slate-400" />
              <span>Role Anda saat ini tidak memiliki izin untuk mengunggah file raw data manapun.</span>
            </div>
          )}

          {/* Unified Clean List Container */}
          <div className="rounded-xl border border-slate-200/80 bg-white divide-y divide-slate-100 overflow-hidden shadow-2xs">
            {/* 1. Raw Stock Pipa */}
            <UploadItemRow
              canUpload={canUploadPipe}
              title="Data Stock Pipa (zppshstock)"
              file={pipeFile}
              onFileChange={setPipeFile}
              inputRef={pipeInputRef}
            />

            {/* 2. Raw Stock Coil & Strip */}
            <UploadItemRow
              canUpload={canUploadCoil}
              title="Data Stock Coil & Strip (Bahan Baku)"
              file={coilFile}
              onFileChange={setCoilFile}
              inputRef={coilInputRef}
            />

            {/* 3. Raw LOO Outstanding */}
            <UploadItemRow
              canUpload={canUploadLoo}
              title="Data LOO (Delivery Order)"
              file={looFile}
              onFileChange={setLooFile}
              inputRef={looInputRef}
            />

            {/* 4. Data Packaging Rusak (NG) */}
            <UploadItemRow
              canUpload={canUploadDamagedPkg}
              title="Data Packaging Rusak (RTP NG)"
              file={packagingFile}
              onFileChange={setPackagingFile}
              inputRef={packagingInputRef}
              isPackaging={true}
            />

            {/* 5. Data Incoming & Mutasi Packaging (RTP) */}
            <UploadItemRow
              canUpload={canUploadIncomingPkg}
              title="Data Incoming & Mutasi Packaging (RTP)"
              file={incomingFile}
              onFileChange={setIncomingFile}
              inputRef={incomingInputRef}
              isPackaging={true}
            />

            {/* 6. Data Transaksi Progres NC (MVT 309, 261, 101) */}
            <UploadItemRow
              canUpload={canUploadProgressNC}
              title="Data Transaksi Progres NC & Repair"
              file={ncProgressFile}
              onFileChange={setNcProgressFile}
              inputRef={ncProgressInputRef}
            />

            {/* 7. Data Stock Opname (Actual vs SAP) */}
            <UploadItemRow
              canUpload={canUploadSTO}
              title="Data Stock Opname (Actual vs SAP)"
              file={stoFile}
              onFileChange={setStoFile}
              inputRef={stoInputRef}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {selectedCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-semibold text-[10.5px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                {selectedCount} file dipilih
              </span>
            ) : (
              <span className="text-slate-400 text-[10.5px]">Belum ada file dipilih</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer shadow-2xs transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isLoading || selectedCount === 0}
              onClick={handleProcessFiles}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-800 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-900 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-300" />
                  <span>Mengupload...</span>
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5 text-amber-300" />
                  <span>{isBackdate ? `Upload (${targetDate})` : 'Upload'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
