'use client';

import React, { useState, useEffect } from 'react';
import { Palette, X, RotateCcw, Check, Image as ImageIcon } from 'lucide-react';
import { UIThemeConfig, COLOR_PRESETS, RADIUS_PRESETS, BACKGROUND_PRESETS, DEFAULT_UI_THEME } from '@/types/theme';

interface UIThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: UIThemeConfig;
  onSaveTheme: (newTheme: UIThemeConfig) => void;
}

export const UIThemeModal: React.FC<UIThemeModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSaveTheme,
}) => {
  const [theme, setTheme] = useState<UIThemeConfig>(currentTheme);

  useEffect(() => {
    setTheme(currentTheme);
  }, [isOpen, currentTheme]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveTheme(theme);
    onClose();
  };

  const handleReset = () => {
    setTheme(DEFAULT_UI_THEME);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Kustomisasi Tema & Desain UI</h2>
              <p className="text-xs text-slate-500 font-mono">Ubah judul, warna banner, background halaman, dan card</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* 1. App Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-700 font-mono">
              Judul Utama Dashboard
            </label>
            <input
              type="text"
              value={theme.appTitle}
              onChange={(e) => setTheme({ ...theme, appTitle: e.target.value })}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none shadow-2xs font-mono"
              placeholder="Contoh: Spindo Unit 5 - Warehouse"
            />
          </div>

          {/* 2. Background Pattern Presets */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-bold uppercase text-slate-700 font-mono flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-emerald-800" />
              <span>Gaya Background Utama Halaman</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {BACKGROUND_PRESETS.map((bg) => {
                const isSelected = theme.bgPattern === bg.id;
                return (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setTheme({ ...theme, bgPattern: bg.id as UIThemeConfig['bgPattern'] })}
                    className={`flex flex-col text-left p-2.5 rounded-lg border transition-all cursor-pointer font-mono ${
                      isSelected
                        ? 'border-emerald-700 bg-emerald-50/50 ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${isSelected ? 'font-bold text-emerald-950' : 'text-slate-800'}`}>
                        {bg.name}
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-emerald-800" />}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5">{bg.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Color Theme Palette */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-bold uppercase text-slate-700 font-mono">
              Warna Banner & Aksen
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = theme.primaryColor === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setTheme({ ...theme, primaryColor: preset.id })}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer font-mono ${
                      isSelected
                        ? 'border-emerald-700 bg-emerald-50/50 ring-1 ring-emerald-600 font-bold'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-4 w-4 rounded-full ${preset.bgClass} border border-white shadow-xs`} />
                      <span className="text-[11px] truncate">{preset.name}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-emerald-800 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Card Radius Setting */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-bold uppercase text-slate-700 font-mono">
              Sudut Lengkung Card (Border Radius)
            </label>
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              {RADIUS_PRESETS.map((rad) => {
                const isSelected = theme.cardRadius === rad.id;
                return (
                  <button
                    key={rad.id}
                    type="button"
                    onClick={() => setTheme({ ...theme, cardRadius: rad.id as UIThemeConfig['cardRadius'] })}
                    className={`p-2 rounded border text-center transition-all cursor-pointer text-[11px] ${
                      isSelected
                        ? 'border-emerald-700 bg-emerald-50/60 font-bold text-emerald-950 ring-1 ring-emerald-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {rad.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 p-4 bg-slate-50/50">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-mono font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-mono font-bold transition-all shadow-xs cursor-pointer"
            >
              <Check className="h-3.5 w-3.5 text-amber-300" />
              <span>Terapkan Desain</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
