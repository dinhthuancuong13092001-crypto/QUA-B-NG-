/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { pythonCodebase } from "../data/pythonCode";
import { Download, Copy, Check, FileCode, Terminal, HelpCircle, FileSpreadsheet, PlayCircle } from "lucide-react";

interface PythonTabProps {
  onExportExcel: () => void;
}

export default function PythonTab({ onExportExcel }: PythonTabProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const selectedFile = pythonCodebase[selectedFileIndex];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selectedFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("Không thể sao chép văn bản, hãy bôi đen và copy thủ công!");
    }
  };

  const handleDownloadFile = (fileName: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="python-tab-container" className="space-y-4">
      {/* Khối Trên: Xuất Excel trực tiếp từ Trình duyệt Web */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-250 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xs font-extrabold text-emerald-900 flex items-center gap-2 uppercase tracking-wider">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 animate-pulse" />
            Xuất báo cáo kết quả ra Excel (.xls / .xlsx)
          </h2>
          <p className="text-xs text-emerald-800 leading-relaxed max-w-2xl font-medium">
            Tải ngay toàn bộ dữ liệu giải đấu hiện tại bao gồm: danh sách đội, bảng xếp hạng tổng hợp theo tiêu chí FIFA, toàn bộ lịch thi đấu, tỷ số, trọng tài và các thẻ phạt vào một file báo cáo chuyên nghiệp.
          </p>
        </div>
        <button
          onClick={onExportExcel}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-4 rounded-lg transition-all shadow-md shadow-emerald-100 self-start md:self-center cursor-pointer text-xs flex items-center gap-2 uppercase tracking-wide"
        >
          <Download className="w-3.5 h-3.5" />
          Tải báo cáo Excel 📥
        </button>
      </div>

      {/* Khối Dưới: Kho lưu trữ mã nguồn Python PyQt6 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Cột trái: Danh sách các file Python và Hướng dẫn */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm space-y-3">
            <h3 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-blue-600" />
              Mã nguồn Python PyQt6
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Dưới đây là mã nguồn ứng dụng Python được module hóa thành các file riêng biệt để chạy ứng dụng máy tính cục bộ (Desktop App).
            </p>

            <div className="space-y-1.5 pt-1">
              {pythonCodebase.map((file, idx) => (
                <button
                  key={file.name}
                  onClick={() => {
                    setSelectedFileIndex(idx);
                    setCopied(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg transition-all border flex items-start gap-2.5 cursor-pointer ${
                    selectedFileIndex === idx
                      ? "bg-blue-650 border-blue-700 text-white shadow-md shadow-blue-100"
                      : "bg-blue-50/40 border-blue-100/60 text-slate-700 hover:bg-blue-50 hover:text-blue-900"
                  }`}
                >
                  <FileCode className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${selectedFileIndex === idx ? "text-cyan-200" : "text-blue-400"}`} />
                  <div className="space-y-0.5">
                    <div className="text-xs font-extrabold font-mono">{file.name}</div>
                    <div className={`text-[10px] leading-tight ${selectedFileIndex === idx ? "text-blue-100/80" : "text-slate-450"}`}>
                      {file.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Hướng dẫn cài đặt & chạy cục bộ */}
          <div className="bg-gradient-to-br from-indigo-900 to-blue-950 text-indigo-100 p-4 rounded-xl space-y-3 shadow-md border border-indigo-950">
            <h4 className="text-xs font-extrabold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" />
              Hướng dẫn chạy local
            </h4>
            <div className="text-xs space-y-3 leading-relaxed">
              <div>
                <span className="font-extrabold text-white block mb-1">Bước 1: Cài đặt thư viện bổ trợ</span>
                <p className="text-indigo-200/80">Gõ lệnh cài đặt PyQt6 và openpyxl vào Terminal:</p>
                <code className="block bg-indigo-950/80 p-2 rounded-lg font-mono text-[10px] text-cyan-300 border border-indigo-900 mt-1 selection:bg-indigo-800">
                  pip install PyQt6 openpyxl
                </code>
              </div>
              <div>
                <span className="font-extrabold text-white block mb-1">Bước 2: Tải các file code</span>
                <p className="text-indigo-200/80">Tải xuống 5 file Python phía trên và lưu vào cùng thư mục.</p>
              </div>
              <div>
                <span className="font-extrabold text-white block mb-1">Bước 3: Khởi chạy ứng dụng</span>
                <p className="text-indigo-200/80">Di chuyển terminal vào thư mục chứa code và chạy:</p>
                <code className="block bg-indigo-950/80 p-2 rounded-lg font-mono text-[10px] text-cyan-300 border border-indigo-900 mt-1 selection:bg-indigo-800">
                  python main.py
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải: Trình đọc code trực quan với Terminal Dark-theme */}
        <div className="lg:col-span-8 bg-slate-950 rounded-xl overflow-hidden border border-slate-900 shadow-xl flex flex-col h-[520px]">
          {/* Thanh Toolbar */}
          <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-950 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 shadow-xs"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500 shadow-xs"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs"></span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-300">
                {selectedFile.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Nút Sao chép */}
              <button
                onClick={handleCopy}
                className="bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 text-slate-300 p-1.5 px-3 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 text-[11px]">Đã chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px]">Sao chép</span>
                  </>
                )}
              </button>

              {/* Nút Tải xuống file */}
              <button
                onClick={() => handleDownloadFile(selectedFile.name, selectedFile.content)}
                className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 px-3 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-md shadow-blue-900/35"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="text-[11px]">Tải file</span>
              </button>
            </div>
          </div>

          {/* Nội dung code */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300 leading-relaxed bg-slate-950 select-text">
            <pre className="whitespace-pre">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
