/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileText,
  Settings,
  Download,
  Table as TableIcon,
  Loader2,
  X,
  ChevronRight,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { TableRow, ExtractionConfig } from './types';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [data, setData] = useState<TableRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<ExtractionConfig>({
    startPage: 1,
    endPage: 5,
    columnCount: undefined,
    headerNames: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Please upload a valid PDF file.');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleExtract = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setData([]);

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('startPage', config.startPage.toString());
    formData.append('endPage', config.endPage.toString());
    if (config.columnCount) formData.append('columnCount', config.columnCount.toString());
    if (config.headerNames) formData.append('headerNames', config.headerNames);

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      let result;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error("Server returned an invalid response. This might be due to a large file or a server-side timeout.");
      }

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to extract data');
      }

      if (!result.data || result.data.length === 0) {
        throw new Error("No table data could be identified in the specified pages. Please check your configuration or try a different page range.");
      }

      setData(result.data);
    } catch (err: any) {
      console.error("Extraction error:", err);
      setError(err.message || "An unexpected error occurred during extraction.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (data.length === 0) return;
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${file?.name.replace('.pdf', '') || 'extracted'}_data.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <TableIcon className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">PDF2CSV</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mt-1">Extract Tables from PDF</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {data.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setData([]); setFile(null); setError(null); }}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-medium transition-all"
                >
                  <X size={18} />
                  Reset
                </button>
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleDownload}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-md shadow-indigo-100"
                >
                  <Download size={18} />
                  Export to CSV
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-4 space-y-6">
          <section className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="text-indigo-600 w-5 h-5" />
              <h2 className="font-semibold text-slate-800">Data Capture Settings</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Page</label>
                  <input
                    type="number"
                    value={config.startPage}
                    onChange={(e) => setConfig({ ...config, startPage: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Page</label>
                  <input
                    type="number"
                    value={config.endPage}
                    onChange={(e) => setConfig({ ...config, endPage: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Column Count (Optional)</label>
                <input
                  type="number"
                  placeholder="Auto-detect"
                  value={config.columnCount || ''}
                  onChange={(e) => setConfig({ ...config, columnCount: parseInt(e.target.value) || undefined })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Header Names (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. ID, Name, Value"
                  value={config.headerNames}
                  onChange={(e) => setConfig({ ...config, headerNames: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
          </section>

          <section className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
            <h3 className="text-indigo-900 font-semibold mb-2">How it works</h3>
            <p className="text-indigo-700/80 text-sm leading-relaxed">
              Upload your PDF and specify the page range. Our engine will identify table structures and extract them into a clean, structured format.
            </p>
          </section>
        </aside>

        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-6">
          {/* Upload Zone */}
          {!data.length && !isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "relative group cursor-pointer",
                "bg-white border-2 border-dashed rounded-3xl p-12 text-center transition-all",
                isDragging ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50",
                file ? "border-emerald-400 bg-emerald-50/30" : ""
              )}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="application/pdf"
                className="hidden"
              />

              <div className="flex flex-col items-center gap-4">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                  file ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600"
                )}>
                  {file ? <CheckCircle2 size={32} /> : <Upload size={32} />}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {file ? file.name : "Drop your PDF here"}
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">
                    {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "or click to browse from your computer"}
                  </p>
                </div>

                {file && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExtract();
                    }}
                    disabled={isProcessing}
                    className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                  >
                    Start Extraction
                    <ChevronRight size={20} />
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="bg-white border border-slate-200 rounded-3xl p-20 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Analyzing Document</h3>
                <p className="text-slate-500 mt-2">Our engine is identifying tables and extracting data...</p>
              </div>
              <div className="w-full max-w-xs bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 15, ease: "linear" }}
                  className="h-full bg-indigo-600"
                />
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-rose-50 border border-rose-100 rounded-2xl p-6 flex items-start gap-4"
            >
              <AlertCircle className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-rose-900">Extraction Failed</h4>
                <p className="text-rose-700 text-sm mt-1">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-3 text-rose-600 text-xs font-bold uppercase tracking-wider hover:underline"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}

          {/* Data Preview */}
          {data.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <FileText className="text-indigo-600 w-5 h-5" />
                  <h3 className="font-bold text-slate-800">Preview Results</h3>
                  <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ml-2">
                    {data.length} Rows
                  </span>
                </div>
                <button
                  onClick={() => { setData([]); setFile(null); }}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                    <tr>
                      {columns.map((col) => (
                        <th key={col} className="px-6 py-4 data-grid-header border-b border-slate-100">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                        {columns.map((col) => (
                          <td key={col} className="px-6 py-3 data-grid-value text-slate-600">
                            {row[col]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto p-6 text-center text-slate-400 text-xs font-medium uppercase tracking-[0.2em] mt-12 mb-8">
        PDF2CSV &bull; PDF Table Extraction
      </footer>
    </div>
  );
}
