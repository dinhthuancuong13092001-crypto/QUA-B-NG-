/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { Tournament, TournamentType, Team } from "../types";
import { 
  X, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  FolderOpen, 
  Download, 
  Upload, 
  Sparkles, 
  Trophy, 
  Calendar, 
  Users, 
  Clock 
} from "lucide-react";

interface TournamentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournaments: Tournament[];
  activeTournamentId: string;
  onSwitchTournament: (id: string) => void;
  onCreateTournament: (
    name: string, 
    type: TournamentType, 
    groupType: "single" | "multiple", 
    numGroups: number, 
    startingTeamsOption: "empty" | "default"
  ) => void;
  onDeleteTournament: (id: string) => void;
  onRenameTournament: (id: string, newName: string) => void;
  onImportTournaments: (imported: Tournament[]) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  isAutoSaveEnabled: boolean;
  setIsAutoSaveEnabled: (enabled: boolean) => void;
}

const TEMPLATE_TEAMS: Team[] = [
  { id: "T-HN", name: "Hà Nội FC", group: "A" },
  { id: "T-HP", name: "Hải Phòng FC", group: "A" },
  { id: "T-ND", name: "Thép Xanh Nam Định", group: "A" },
  { id: "T-CA", name: "Công An Hà Nội", group: "A" },
  { id: "T-BD", name: "Becamex Bình Dương", group: "B" },
  { id: "T-HA", name: "HAGL FC", group: "B" },
  { id: "T-TH", name: "Thanh Hóa FC", group: "B" },
  { id: "T-VT", name: "Viettel FC", group: "B" },
];

export default function TournamentManagerModal({
  isOpen,
  onClose,
  tournaments,
  activeTournamentId,
  onSwitchTournament,
  onCreateTournament,
  onDeleteTournament,
  onRenameTournament,
  onImportTournaments,
  showToast,
  isAutoSaveEnabled,
  setIsAutoSaveEnabled,
}: TournamentManagerModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<"list" | "create" | "backup">("list");
  
  // Create Tournament State
  const [newTourneyName, setNewTourneyName] = useState("");
  const [newTourneyType, setNewTourneyType] = useState<TournamentType>(TournamentType.ROUND_ROBIN);
  const [newGroupType, setNewGroupType] = useState<"single" | "multiple">("multiple");
  const [newNumGroups, setNewNumGroups] = useState<number>(2);
  const [startingTeams, setStartingTeams] = useState<"empty" | "default">("default");

  // Rename Tournament State
  const [editingTourneyId, setEditingTourneyId] = useState<string | null>(null);
  const [editingTourneyName, setEditingTourneyName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTourneyName.trim()) {
      showToast("Vui lòng nhập tên giải đấu!", "error");
      return;
    }
    onCreateTournament(
      newTourneyName.trim(),
      newTourneyType,
      newGroupType,
      newNumGroups,
      startingTeams
    );
    setNewTourneyName("");
    setActiveSubTab("list");
  };

  const handleStartRename = (tourney: Tournament) => {
    setEditingTourneyId(tourney.id);
    setEditingTourneyName(tourney.name);
  };

  const handleSaveRename = (id: string) => {
    if (!editingTourneyName.trim()) {
      showToast("Tên giải đấu không được để trống!", "error");
      return;
    }
    onRenameTournament(id, editingTourneyName.trim());
    setEditingTourneyId(null);
  };

  const handleExportAll = () => {
    try {
      const dataStr = JSON.stringify(tournaments, null, 2);
      const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `football_tournaments_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();
      showToast("Xuất dữ liệu giải đấu ra file JSON thành công!", "success");
    } catch (error) {
      showToast("Có lỗi xảy ra khi xuất dữ liệu!", "error");
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          
          // Validate format
          let validTournaments: Tournament[] = [];
          
          if (Array.isArray(parsed)) {
            // Check if it's an array of tournaments
            validTournaments = parsed.filter(t => t && typeof t === 'object' && t.id && t.name);
          } else if (parsed && typeof parsed === 'object' && parsed.id && parsed.name) {
            // If it's a single tournament, turn it into an array
            validTournaments = [parsed];
          }

          if (validTournaments.length === 0) {
            showToast("Định dạng file JSON không hợp lệ hoặc không có giải đấu nào!", "error");
            return;
          }

          onImportTournaments(validTournaments);
          if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (error) {
          showToast("Không thể đọc file JSON này. Vui lòng kiểm tra lại cấu trúc file!", "error");
        }
      };
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-blue-100 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col h-[550px] animate-fade-in">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-300 animate-bounce" />
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider block text-white">Hệ thống quản lý đa giải đấu</span>
              <span className="text-[10px] text-blue-100/80">Lưu trữ cục bộ, xuất nhập dữ liệu bằng file cấu trúc JSON</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-blue-200 hover:text-white transition-all p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inner Tab Bar */}
        <div className="bg-blue-50/50 border-b border-blue-100 flex px-4 flex-shrink-0">
          <button
            onClick={() => setActiveSubTab("list")}
            className={`px-4 py-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "list"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-blue-700 hover:border-blue-200"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Danh sách Giải đấu ({tournaments.length})
          </button>
          <button
            onClick={() => setActiveSubTab("create")}
            className={`px-4 py-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "create"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-blue-700 hover:border-blue-200"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Tạo giải đấu mới
          </button>
          <button
            onClick={() => setActiveSubTab("backup")}
            className={`px-4 py-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "backup"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-blue-700 hover:border-blue-200"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Sao lưu &amp; Nhập xuất File
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
          
          {/* TAB 1: TOURNAMENTS LIST */}
          {activeSubTab === "list" && (
            <div className="space-y-3">
              <div className="text-[11px] text-blue-800 bg-blue-50/70 border border-blue-100 rounded-xl p-3 leading-relaxed font-medium">
                Ứng dụng hỗ trợ quản lý song song nhiều giải đấu độc lập. Click nút <strong className="text-blue-900 font-extrabold">Kích hoạt</strong> để chuyển đổi nhanh dữ liệu đội bóng, lịch thi đấu và bảng xếp hạng tương ứng.
              </div>
              <div className="divide-y divide-blue-50 border border-blue-100 rounded-xl bg-white overflow-hidden shadow-sm">
                {tournaments.map((tourney) => {
                  const isActive = tourney.id === activeTournamentId;
                  const isEditing = editingTourneyId === tourney.id;

                  return (
                    <div 
                      key={tourney.id} 
                      className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isActive ? "bg-blue-50/30" : "hover:bg-blue-50/10"
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        {isEditing ? (
                          <div className="flex gap-2 max-w-md">
                            <input
                              type="text"
                              value={editingTourneyName}
                              onChange={(e) => setEditingTourneyName(e.target.value)}
                              className="bg-white border border-blue-500 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none w-full font-bold"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveRename(tourney.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingTourneyId(null)}
                              className="border border-slate-300 hover:bg-slate-100 text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-extrabold text-blue-950">{tourney.name}</span>
                            {isActive && (
                              <span className="bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-lg text-[9px] uppercase tracking-wider">
                                Đang hoạt động
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono font-bold">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {tourney.createdAt ? new Date(tourney.createdAt).toLocaleDateString("vi-VN") : "Chưa rõ ngày"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-blue-500" />
                            {tourney.teams?.length || 0} đội bóng
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-purple-500" />
                            {tourney.matches?.length || 0} trận đấu
                          </span>
                          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-lg font-sans font-extrabold">
                            {tourney.type === TournamentType.ROUND_ROBIN 
                              ? `Vòng tròn (${tourney.groupType === "single" ? "1 Bảng" : `${tourney.numGroups} Bảng`})` 
                              : "Loại trực tiếp (Knock-out)"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {!isActive && !isEditing && (
                          <button
                            onClick={() => onSwitchTournament(tourney.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-1 px-3 rounded-lg text-[10px] uppercase transition-all shadow-md shadow-blue-200 cursor-pointer"
                          >
                            Kích hoạt
                          </button>
                        )}
                        {!isEditing && (
                          <button
                            onClick={() => handleStartRename(tourney)}
                            className="border border-blue-100 hover:bg-blue-50 text-blue-700 font-extrabold p-1.5 rounded-lg transition-all cursor-pointer"
                            title="Sửa tên giải"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {tournaments.length > 1 && (
                          <button
                            onClick={() => {
                              if (confirm(`Bạn có chắc chắn muốn xóa giải đấu "${tourney.name}"? Thao tác này KHÔNG THỂ khôi phục!`)) {
                                onDeleteTournament(tourney.id);
                              }
                            }}
                            className="border border-rose-200 hover:border-rose-300 hover:bg-rose-50 text-rose-600 font-bold p-1 rounded transition-all cursor-pointer"
                            title="Xóa giải đấu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CREATE TOURNAMENT */}
          {activeSubTab === "create" && (
            <form onSubmit={handleCreateSubmit} className="space-y-4 max-w-lg mx-auto bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-blue-900 block uppercase tracking-wider">Tên giải đấu mới</label>
                <input
                  type="text"
                  placeholder="Ví dụ: V-League 2026, Premier League Cup..."
                  className="w-full bg-slate-50/50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-bold placeholder:text-slate-350"
                  value={newTourneyName}
                  onChange={(e) => setNewTourneyName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-blue-900 block uppercase tracking-wider">Thể thức thi đấu</label>
                  <select
                    className="w-full bg-slate-50/50 border border-blue-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer font-bold"
                    value={newTourneyType}
                    onChange={(e) => setNewTourneyType(e.target.value as TournamentType)}
                  >
                    <option value={TournamentType.ROUND_ROBIN}>Đấu vòng tròn</option>
                    <option value={TournamentType.KNOCKOUT}>Loại trực tiếp (Knock-out)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-blue-900 block uppercase tracking-wider">Đội hình ban đầu</label>
                  <select
                    className="w-full bg-slate-50/50 border border-blue-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer font-bold"
                    value={startingTeams}
                    onChange={(e) => setStartingTeams(e.target.value as "empty" | "default")}
                  >
                    <option value="default">Mặc định (8 Đội bóng Pro)</option>
                    <option value="empty">Tạo mới hoàn toàn (0 Đội)</option>
                  </select>
                </div>
              </div>

              {newTourneyType === TournamentType.ROUND_ROBIN && (
                <div className="p-3.5 bg-blue-50/30 border border-blue-100 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold text-blue-900 block uppercase tracking-wider">Phương án phân chia bảng</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewGroupType("single")}
                        className={`px-3 py-1.5 text-[10px] font-extrabold rounded-lg cursor-pointer transition-all ${
                          newGroupType === "single"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-white border border-blue-200 text-blue-700 hover:bg-blue-50"
                        }`}
                      >
                        Một bảng đấu
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewGroupType("multiple")}
                        className={`px-3 py-1.5 text-[10px] font-extrabold rounded-lg cursor-pointer transition-all ${
                          newGroupType === "multiple"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-white border border-blue-200 text-blue-700 hover:bg-blue-50"
                        }`}
                      >
                        Nhiều bảng đấu
                      </button>
                    </div>
                  </div>

                  {newGroupType === "multiple" && (
                    <div className="flex items-center justify-between pt-1 border-t border-blue-100">
                      <span className="text-[11px] font-extrabold text-blue-900">Số lượng bảng đấu:</span>
                      <div className="flex items-center gap-1.5">
                        {[2, 3, 4, 5, 6].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setNewNumGroups(num)}
                            className={`w-6 h-6 rounded-lg font-mono text-[11px] font-extrabold transition-all cursor-pointer flex items-center justify-center ${
                              newNumGroups === num
                                ? "bg-blue-650 text-white shadow-xs"
                                : "bg-white border border-blue-200 text-blue-700 hover:bg-blue-50"
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 px-4 rounded-lg text-xs uppercase tracking-wide transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2 cursor-pointer pt-2.5"
              >
                <Plus className="w-4 h-4" />
                Xác nhận tạo giải đấu
              </button>
            </form>
          )}

          {/* TAB 3: BACKUP & IMPORT */}
          {activeSubTab === "backup" && (
            <div className="space-y-4 max-w-lg mx-auto animate-fade-in">
              {/* Auto Save Setting Area */}
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-150 shadow-xs space-y-3">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0 animate-pulse" />
                  <div className="flex-1">
                    <h4 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                      Tự động tải sao lưu (Auto-Save JSON)
                      <span className="bg-blue-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase font-mono">
                        Mặc định kích hoạt
                      </span>
                    </h4>
                    <p className="text-[10px] text-blue-800 leading-normal mt-0.5 font-medium">
                      Hệ thống sẽ <strong className="text-blue-900">tự động tải file dữ liệu JSON</strong> mới nhất về thiết bị của bạn 4 giây sau khi bạn thực hiện bất kỳ thay đổi nào (như tạo giải, nhập nhanh, sửa đội bóng, đổi tỷ số). Giúp đảm bảo dữ liệu luôn an toàn trên máy tính của bạn.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white border border-blue-200 rounded-xl shadow-2xs">
                  <span className="text-xs font-extrabold text-slate-800">Tự động tải file JSON dự phòng</span>
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-xs">
                    <input
                      type="checkbox"
                      checked={isAutoSaveEnabled}
                      onChange={(e) => {
                        setIsAutoSaveEnabled(e.target.checked);
                        showToast(
                          e.target.checked 
                            ? "Đã bật tính năng tự động tải file JSON dự phòng!" 
                            : "Đã tắt tính năng tự động tải file JSON!",
                          "info"
                        );
                      }}
                      className="accent-blue-600 h-4 w-4 rounded cursor-pointer"
                    />
                    <span className={isAutoSaveEnabled ? "text-blue-600 font-extrabold" : "text-slate-400 font-extrabold"}>
                      {isAutoSaveEnabled ? "Bật" : "Tắt"}
                    </span>
                  </label>
                </div>
              </div>

              {/* Export Area */}
              <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs space-y-3">
                <div className="flex items-start gap-2.5">
                  <Download className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-extrabold text-blue-950 uppercase tracking-wider">Xuất dữ liệu giải đấu (Backup)</h4>
                    <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                      Tải file `.json` chứa toàn bộ thông tin các giải đấu hiện tại bao gồm danh sách đội, lịch thi đấu, kết quả tỷ số, và thẻ phạt để lưu trữ offline.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportAll}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-3 rounded-lg text-xs transition-all shadow-md shadow-emerald-100 uppercase cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Tải file sao lưu (.json)
                </button>
              </div>

              {/* Import Area */}
              <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs space-y-3">
                <div className="flex items-start gap-2.5">
                  <Upload className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-extrabold text-blue-950 uppercase tracking-wider">Nhập dữ liệu giải đấu (Restore)</h4>
                    <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                      Chọn file `.json` đã xuất trước đó để khôi phục hoặc nạp thêm các giải đấu mới vào hệ thống quản lý hiện tại.
                    </p>
                  </div>
                </div>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-blue-200 hover:border-blue-500 bg-blue-50/10 hover:bg-blue-50/40 rounded-xl p-6 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all text-center"
                >
                  <Upload className="w-8 h-8 text-blue-400" />
                  <span className="text-xs font-extrabold text-blue-900">Click để chọn file JSON giải đấu</span>
                  <span className="text-[9px] text-slate-400 font-medium">Chấp nhận định dạng file sao lưu chuẩn của hệ thống</span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportFileChange}
                  accept=".json"
                  className="hidden"
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer info bar */}
        <div className="p-3 bg-blue-50/50 border-t border-blue-100 flex justify-between items-center text-[10px] text-blue-800 font-mono font-bold flex-shrink-0">
          <span>Tổng số giải: {tournaments.length}</span>
          <span>Dữ liệu lưu tự động tại thiết bị này</span>
        </div>
      </div>
    </div>
  );
}
