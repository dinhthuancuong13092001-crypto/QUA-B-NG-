/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Team, TournamentType } from "../types";
import { Plus, Edit2, Trash2, Shuffle, Calendar, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface TeamTabProps {
  teams: Team[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  tournamentType: TournamentType;
  setTournamentType: (type: TournamentType) => void;
  numGroups: number;
  setNumGroups: (num: number) => void;
  groupType: "single" | "multiple";
  setGroupType: (type: "single" | "multiple") => void;
  onGenerateSchedule: () => void;
}

export default function TeamTab({
  teams,
  setTeams,
  tournamentType,
  setTournamentType,
  numGroups,
  setNumGroups,
  groupType,
  setGroupType,
  onGenerateSchedule,
}: TeamTabProps) {
  const [newTeamName, setNewTeamName] = useState("");
  const [showQuickImport, setShowQuickImport] = useState(false);
  const [quickImportText, setQuickImportText] = useState("");
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  useEffect(() => {
    const teamIds = teams.map((t) => t.id);
    setSelectedTeamIds((prev) => prev.filter((id) => teamIds.includes(id)));
  }, [teams]);

  const availableGroups = groupType === "single"
    ? ["A"]
    : Array.from({ length: numGroups }, (_, i) => String.fromCharCode(65 + i));

  const handleGroupChange = (teamId: string, newGroup: string) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, group: newGroup } : t))
    );
    showToast(`Đã chuyển đội bóng sang Bảng ${newGroup}!`, "success");
  };

  const handleQuickImport = () => {
    const lines = quickImportText
      .split(/[\n,;]+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      showToast("Vui lòng nhập danh sách tên đội bóng!", "error");
      return;
    }

    const duplicatesInInput: string[] = [];
    const alreadyExist: string[] = [];
    const newTeamsToAppend: Team[] = [];
    const seenInInput = new Set<string>();

    for (const name of lines) {
      const nameLower = name.toLowerCase();
      if (seenInInput.has(nameLower)) {
        duplicatesInInput.push(name);
        continue;
      }
      seenInInput.add(nameLower);

      if (teams.some((t) => t.name.toLowerCase() === nameLower)) {
        alreadyExist.push(name);
        continue;
      }

      newTeamsToAppend.push({
        id: `T-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        name,
        group: tournamentType === TournamentType.KNOCKOUT ? undefined : "A",
      });
    }

    if (newTeamsToAppend.length === 0) {
      if (alreadyExist.length > 0) {
        showToast("Tất cả các đội bóng đã tồn tại!", "error");
      } else {
        showToast("Không tìm thấy đội bóng hợp lệ để thêm!", "error");
      }
      return;
    }

    setTeams((prev) => [...prev, ...newTeamsToAppend]);
    setQuickImportText("");
    setShowQuickImport(false);

    let msg = `Đã nhập nhanh ${newTeamsToAppend.length} đội bóng thành công!`;
    if (alreadyExist.length > 0) {
      msg += ` (${alreadyExist.length} đội trùng lặp đã bị bỏ qua)`;
    }
    showToast(msg, "success");
  };

  const handleAddTeam = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTeamName.trim();
    if (!name) return;

    if (teams.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      showToast("Tên đội bóng này đã tồn tại trong danh sách!", "error");
      return;
    }

    const newTeam: Team = {
      id: `T-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name,
      group: tournamentType === TournamentType.KNOCKOUT ? undefined : "A",
    };

    setTeams((prev) => [...prev, newTeam]);
    setNewTeamName("");
    showToast(`Đã thêm đội bóng "${name}" thành công!`, "success");
  };

  const handleStartEdit = (team: Team) => {
    setEditingTeamId(team.id);
    setEditingName(team.name);
  };

  const handleSaveEdit = (id: string) => {
    const name = editingName.trim();
    if (!name) return;

    if (teams.some((t) => t.id !== id && t.name.toLowerCase() === name.toLowerCase())) {
      showToast("Tên đội bóng mới trùng lặp với đội khác!", "error");
      return;
    }

    setTeams((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name } : t))
    );
    setEditingTeamId(null);
    showToast("Đã cập nhật tên đội bóng thành công!", "success");
  };

  const handleDeleteTeam = (team: Team) => {
    setTeamToDelete(team);
  };

  // Chia bảng ngẫu nhiên dựa trên số lượng bảng cấu hình
  const handleShuffleGroups = () => {
    if (teams.length === 0) {
      showToast("Hãy thêm các đội bóng trước khi chia bảng!", "error");
      return;
    }

    if (tournamentType === TournamentType.KNOCKOUT) {
      showToast("Thể thức đấu loại trực tiếp (Knock-out) không cần phân bảng!", "error");
      return;
    }

    const shuffled = [...teams].sort(() => Math.random() - 0.5);

    if (groupType === "single") {
      const updated = shuffled.map((t) => ({ ...t, group: "A" }));
      setTeams(updated);
      showToast("Đã phân phối tất cả các đội bóng vào Bảng A!", "success");
    } else {
      const updated = shuffled.map((t, idx) => {
        const groupChar = String.fromCharCode(65 + (idx % numGroups)); // A, B, C...
        return { ...t, group: groupChar };
      });
      setTeams(updated);
      showToast(`Đã chia đều ngẫu nhiên các đội bóng vào ${numGroups} Bảng (A-${String.fromCharCode(65 + numGroups - 1)})!`, "success");
    }
  };

  // Trích xuất các bảng đấu hiện tại để hiển thị
  const groupsMap: { [key: string]: Team[] } = {};
  teams.forEach((t) => {
    const g = t.group || "Chưa chia bảng";
    if (!groupsMap[g]) groupsMap[g] = [];
    groupsMap[g].push(t);
  });

  return (
    <div id="team-tab-container" className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Cấu hình & Thêm đội (Cột Trái) */}
      <div id="config-panel" className="lg:col-span-5 flex flex-col gap-4">
        {/* Cấu hình Thể Thức */}
        <div className="bg-white rounded-lg border border-slate-300 shadow-sm flex flex-col overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Cấu hình thể thức giải đấu
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Thể thức thi đấu</label>
              <select
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-600 transition-all"
                value={tournamentType}
                onChange={(e) => {
                  const val = e.target.value as TournamentType;
                  setTournamentType(val);
                  if (val === TournamentType.KNOCKOUT) {
                    setTeams((prev) => prev.map((t) => ({ ...t, group: undefined })));
                  } else {
                    setTeams((prev) => prev.map((t) => ({ ...t, group: "A" })));
                  }
                }}
              >
                <option value={TournamentType.ROUND_ROBIN}>Đấu vòng tròn (Round-robin)</option>
                <option value={TournamentType.KNOCKOUT}>Đấu loại trực tiếp (Knock-out)</option>
              </select>
            </div>

            {tournamentType === TournamentType.ROUND_ROBIN && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 border-t border-slate-200 pt-3"
              >
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cấu hình phân bảng</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGroupType("single")}
                      className={`py-1.5 text-xs font-bold rounded transition-all cursor-pointer ${
                        groupType === "single"
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      1 Bảng duy nhất
                    </button>
                    <button
                      type="button"
                      onClick={() => setGroupType("multiple")}
                      className={`py-1.5 text-xs font-bold rounded transition-all cursor-pointer ${
                        groupType === "multiple"
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Chia nhiều Bảng
                    </button>
                  </div>
                </div>

                {groupType === "multiple" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="flex items-center justify-between bg-slate-50 p-2.5 rounded border border-slate-200"
                  >
                    <span className="text-[11px] text-slate-500 font-semibold uppercase">Số lượng bảng đấu:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="2"
                        max="8"
                        className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-center font-bold text-slate-800"
                        value={numGroups}
                        onChange={(e) => setNumGroups(Math.max(2, Math.min(8, parseInt(e.target.value) || 2)))}
                      />
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">Bảng</span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Thêm Đội bóng & Thao tác */}
        <div className="bg-white rounded-lg border border-slate-300 shadow-sm flex flex-col overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {showQuickImport ? "Nhập nhanh danh sách" : "Thêm đội bóng mới"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowQuickImport(!showQuickImport);
                setQuickImportText("");
                setNewTeamName("");
              }}
              className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-blue-500" />
              {showQuickImport ? "Quay lại thêm lẻ" : "Nhập nhanh/Hàng loạt"}
            </button>
          </div>
          <div className="p-4 space-y-4">
            {showQuickImport ? (
              <div className="space-y-2.5 animate-fade-in">
                <p className="text-[10px] text-slate-500 leading-normal">
                  Nhập danh sách các đội bóng của bạn vào khung dưới đây. Phân tách các đội bằng <strong>dấu xuống dòng</strong> hoặc <strong>dấu phẩy</strong>.
                </p>
                <textarea
                  rows={4}
                  placeholder="Ví dụ:&#10;Hải Phòng FC&#10;Sông Lam Nghệ An&#10;Bình Định, Khánh Hòa"
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-all font-sans leading-relaxed"
                  value={quickImportText}
                  onChange={(e) => setQuickImportText(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleQuickImport}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded text-xs transition-all shadow-xs uppercase cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Xác nhận nhập danh sách
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddTeam} className="flex gap-2 animate-fade-in">
                <input
                  type="text"
                  placeholder="Nhập tên đội bóng..."
                  className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-all"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition-all shadow-xs flex items-center justify-center cursor-pointer font-bold text-xs"
                >
                  <Plus className="w-4 h-4 mr-1" /> Thêm
                </button>
              </form>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-200">
              {tournamentType === TournamentType.ROUND_ROBIN && (
                <button
                  type="button"
                  onClick={handleShuffleGroups}
                  className="flex-1 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold py-2 px-3 rounded flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Shuffle className="w-3.5 h-3.5 text-slate-400" />
                  Chia bảng ngẫu nhiên
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (teams.length < 2) {
                    showToast("Cần có ít nhất 2 đội bóng để lập lịch thi đấu!", "error");
                  } else {
                    onGenerateSchedule();
                  }
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
              >
                <Calendar className="w-3.5 h-3.5" />
                Tạo Lịch Thi Đấu ⚽
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách đội & Nhóm (Cột Phải) */}
      <div id="teams-list-panel" className="lg:col-span-7 flex flex-col">
        <div className="bg-white rounded-lg border border-slate-300 shadow-sm flex flex-col overflow-hidden min-h-[400px]">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Danh sách Đội bóng tham gia ({teams.length} đội)
              </h2>
              {selectedTeamIds.length > 0 && (
                <button
                  onClick={() => setIsConfirmBulkDeleteOpen(true)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2 py-1 rounded text-[10px] uppercase cursor-pointer flex items-center gap-1 shadow-xs transition-all animate-fade-in"
                >
                  <Trash2 className="w-3 h-3" />
                  Xóa {selectedTeamIds.length} đội đã chọn
                </button>
              )}
            </div>
            <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold uppercase">
              {tournamentType === TournamentType.KNOCKOUT ? "Knock-out" : "Đấu vòng tròn"}
            </span>
          </div>

          {teams.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center py-12 text-center text-slate-400 border border-dashed border-slate-200 m-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Chưa có đội bóng nào tham gia.</p>
              <p className="text-xs text-slate-400">Hãy thêm tên đội bóng ở khung bên trái để bắt đầu.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              {/* Bảng danh sách đội bóng chuẩn High Density desktop */}
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-600 sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 text-center w-10">
                      <input
                        type="checkbox"
                        className="cursor-pointer accent-blue-600 rounded"
                        checked={teams.length > 0 && selectedTeamIds.length === teams.length}
                        onChange={() => {
                          if (selectedTeamIds.length === teams.length) {
                            setSelectedTeamIds([]);
                          } else {
                            setSelectedTeamIds(teams.map((t) => t.id));
                          }
                        }}
                      />
                    </th>
                    <th className="p-2.5 font-bold uppercase tracking-wider text-[10px] text-center w-12">#</th>
                    <th className="p-2.5 font-bold uppercase tracking-wider text-[10px]">ID</th>
                    <th className="p-2.5 font-bold uppercase tracking-wider text-[10px]">Tên Đội Bóng</th>
                    <th className="p-2.5 font-bold uppercase tracking-wider text-[10px] text-center w-28">Bảng đấu</th>
                    <th className="p-2.5 font-bold uppercase tracking-wider text-[10px] text-center w-28">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {teams.map((team, idx) => {
                    const isEditing = editingTeamId === team.id;
                    const isSelected = selectedTeamIds.includes(team.id);
                    const groupBadgeColor = 
                      team.group === "A" ? "bg-blue-50 text-blue-700 border-blue-200" :
                      team.group === "B" ? "bg-purple-50 text-purple-700 border-purple-200" :
                      team.group === "C" ? "bg-orange-50 text-orange-700 border-orange-200" :
                      team.group === "D" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      "bg-slate-50 text-slate-600 border-slate-200";

                    return (
                      <tr key={team.id} className={`hover:bg-blue-50/50 transition-colors ${isSelected ? "bg-blue-50/20" : ""}`}>
                        <td className="p-2.5 text-center w-10">
                          <input
                            type="checkbox"
                            className="cursor-pointer accent-blue-600 rounded"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedTeamIds((prev) =>
                                prev.includes(team.id)
                                  ? prev.filter((id) => id !== team.id)
                                  : [...prev, team.id]
                              );
                            }}
                          />
                        </td>
                        <td className="p-2.5 font-mono text-center text-slate-400">{String(idx + 1).padStart(2, "0")}</td>
                        <td className="p-2.5 font-mono text-slate-500">{team.id}</td>
                        <td className="p-2.5">
                          {isEditing ? (
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                className="flex-1 bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-700 font-bold focus:outline-none"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEdit(team.id)}
                                className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-bold hover:bg-blue-700 cursor-pointer"
                              >
                                Lưu
                              </button>
                            </div>
                          ) : (
                            <span className="font-bold text-blue-900 text-xs">{team.name}</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          {tournamentType === TournamentType.ROUND_ROBIN ? (
                            <select
                              value={team.group || "A"}
                              onChange={(e) => handleGroupChange(team.id, e.target.value)}
                              className={`px-2 py-0.5 text-[10px] font-bold border rounded cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${groupBadgeColor}`}
                            >
                              {availableGroups.map((g) => (
                                <option key={g} value={g} className="bg-white text-slate-800 font-bold">
                                  Bảng {g}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Knock-out</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => handleStartEdit(team)}
                              className="text-xs text-slate-500 hover:text-blue-600 font-bold px-1.5 py-0.5 rounded hover:bg-slate-100 transition-all cursor-pointer"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => handleDeleteTeam(team)}
                              className="text-xs text-slate-500 hover:text-rose-600 font-bold px-1.5 py-0.5 rounded hover:bg-rose-50 transition-all cursor-pointer"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CUSTOM OVERLAY CONFIRMATION MODAL */}
      {teamToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-300 shadow-xl max-w-sm w-full overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Xác nhận xóa đội bóng</span>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Bạn có chắc chắn muốn xóa đội bóng <strong className="text-slate-800">{teamToDelete.name}</strong> không? Toàn bộ lịch thi đấu liên quan cũng sẽ bị loại bỏ khỏi hệ thống.
              </p>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setTeamToDelete(null)}
                  className="border border-slate-300 text-slate-600 font-bold px-3 py-1.5 rounded hover:bg-slate-50 transition-all cursor-pointer text-xs"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTeams((prev) => prev.filter((t) => t.id !== teamToDelete.id));
                    setTeamToDelete(null);
                    showToast(`Đã xóa đội bóng "${teamToDelete.name}" thành công!`, "success");
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-1.5 rounded transition-all shadow-xs cursor-pointer text-xs"
                >
                  Đồng ý xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isConfirmBulkDeleteOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-300 shadow-xl max-w-sm w-full overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Xác nhận xóa hàng loạt</span>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Bạn có chắc chắn muốn xóa <strong className="text-slate-800">{selectedTeamIds.length}</strong> đội bóng đã chọn không? Toàn bộ lịch thi đấu liên quan cũng sẽ bị loại bỏ khỏi hệ thống.
              </p>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmBulkDeleteOpen(false)}
                  className="border border-slate-300 text-slate-600 font-bold px-3 py-1.5 rounded hover:bg-slate-50 transition-all cursor-pointer text-xs"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTeams((prev) => prev.filter((t) => !selectedTeamIds.includes(t.id)));
                    setSelectedTeamIds([]);
                    setIsConfirmBulkDeleteOpen(false);
                    showToast("Đã xóa các đội bóng được chọn thành công!", "success");
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-1.5 rounded transition-all shadow-xs cursor-pointer text-xs"
                >
                  Đồng ý xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded shadow-lg border text-xs font-bold transition-all animate-fade-in ${
          toast.type === "success" 
            ? "bg-emerald-50 border-emerald-300 text-emerald-800" 
            : toast.type === "error" 
            ? "bg-rose-50 border-rose-300 text-rose-800" 
            : "bg-blue-50 border-blue-300 text-blue-800"
        }`}>
          <span className="text-sm">
            {toast.type === "success" ? "✓" : toast.type === "error" ? "✗" : "ℹ"}
          </span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
