/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Team, Match, TournamentType } from "../types";
import { getTeamDisplayName, getMatchWinnerId } from "../utils/scheduler";
import { Edit2, Shield, Calendar, Users, X, Info, Trophy, UserCheck, ArrowUp, ArrowDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MatchTabProps {
  teams: Team[];
  matches: Match[];
  setMatches: React.Dispatch<React.SetStateAction<Match[]>>;
  tournamentType: TournamentType;
}

export default function MatchTab({ teams, matches, setMatches, tournamentType }: MatchTabProps) {
  const [selectedRound, setSelectedRound] = useState<number | "all">("all");
  const [selectedGroup, setSelectedGroup] = useState<string | "all">("all");
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  // Điểm danh sách vòng đấu duy nhất có sẵn
  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);

  // Thu thập tất cả các tên bảng đấu đang có từ các trận đấu
  const availableGroups = Array.from(new Set(matches.map((m) => m.group).filter(Boolean))) as string[];

  // Lọc danh sách các trận đấu theo vòng và bảng đã chọn
  const filteredMatches = matches.filter((m) => {
    const roundMatch = selectedRound === "all" || m.round === selectedRound;
    const groupMatch = selectedGroup === "all" || m.group === selectedGroup || tournamentType === TournamentType.KNOCKOUT;
    return roundMatch && groupMatch;
  });

  // Kích hoạt thoại cập nhật tỷ số
  const handleOpenEdit = (match: Match) => {
    if (match.isBye) return; // Trận nghỉ không cần sửa kết quả
    setEditingMatch({ ...match });
  };

  // Lưu kết quả trận đấu và tự động cập nhật vòng Knock-out tiếp theo nếu có
  const handleSaveResult = (updated: Match) => {
    setMatches((prevMatches) => {
      // 1. Cập nhật kết quả trận đấu hiện tại
      let nextMatches = prevMatches.map((m) => {
        if (m.id === updated.id) {
          return {
            ...m,
            round: updated.round,
            roundName: updated.roundName,
            homeTeamId: updated.homeTeamId,
            awayTeamId: updated.awayTeamId,
            homeScore: updated.homeScore,
            awayScore: updated.awayScore,
            homeYellowCards: updated.homeYellowCards,
            homeRedCards: updated.homeRedCards,
            homeRedCardNotes: updated.homeRedCardNotes,
            awayYellowCards: updated.awayYellowCards,
            awayRedCards: updated.awayRedCards,
            awayRedCardNotes: updated.awayRedCardNotes,
            referee: updated.referee,
            date: updated.date,
            time: updated.time,
            location: updated.location,
            played: updated.played,
          };
        }
        return m;
      });

      // 2. Nếu là giải đấu Knockout, tự động truyền đội thắng lên vòng tiếp theo
      if (tournamentType === TournamentType.KNOCKOUT) {
        const winnerId = getMatchWinnerId(updated);
        if (winnerId) {
          nextMatches = nextMatches.map((m) => {
            let changes: Partial<Match> = {};
            
            // Nếu trận đấu ở vòng sau lấy đội thắng của trận này làm Đội Nhà (WIN:matchId)
            if (m.homeTeamId === `WIN:${updated.id}`) {
              changes.homeTeamId = winnerId;
            }
            // Nếu trận đấu ở vòng sau lấy đội thắng của trận này làm Đội Khách (WIN:matchId)
            if (m.awayTeamId === `WIN:${updated.id}`) {
              changes.awayTeamId = winnerId;
            }

            return Object.keys(changes).length > 0 ? { ...m, ...changes } : m;
          });
        }
      }

      return nextMatches;
    });

    setEditingMatch(null);
  };

  // Di chuyển vị trí trận đấu (lên/xuống trong danh sách hiển thị)
  const handleMoveMatch = (indexInFiltered: number, direction: "up" | "down") => {
    const targetIdxFiltered = direction === "up" ? indexInFiltered - 1 : indexInFiltered + 1;
    if (targetIdxFiltered < 0 || targetIdxFiltered >= filteredMatches.length) return;

    const currentMatch = filteredMatches[indexInFiltered];
    const targetMatch = filteredMatches[targetIdxFiltered];

    setMatches((prev) => {
      const idxInOriginalCurrent = prev.findIndex((m) => m.id === currentMatch.id);
      const idxInOriginalTarget = prev.findIndex((m) => m.id === targetMatch.id);

      if (idxInOriginalCurrent !== -1 && idxInOriginalTarget !== -1) {
        const updated = [...prev];
        const temp = updated[idxInOriginalCurrent];
        updated[idxInOriginalCurrent] = updated[idxInOriginalTarget];
        updated[idxInOriginalTarget] = temp;
        return updated;
      }
      return prev;
    });
  };

  // Chia trận đấu knockout theo vòng để vẽ Bracket
  const koRoundsMap: { [round: number]: Match[] } = {};
  if (tournamentType === TournamentType.KNOCKOUT) {
    matches.forEach((m) => {
      if (!koRoundsMap[m.round]) koRoundsMap[m.round] = [];
      koRoundsMap[m.round].push(m);
    });
  }

  return (
    <div id="match-tab-container" className="space-y-4">
      {/* Bộ lọc Vòng đấu & Bảng đấu */}
      <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-sm flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label className="text-[10px] font-extrabold text-blue-900/60 uppercase">Lọc Vòng thi đấu:</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedRound("all")}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                  selectedRound === "all"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "bg-blue-50 text-blue-800 hover:bg-blue-100/70"
                }`}
              >
                Tất cả các vòng
              </button>
              {rounds.map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRound(r)}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                    selectedRound === r
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                      : "bg-blue-50 text-blue-800 hover:bg-blue-100/70"
                  }`}
                >
                  Vòng {r}
                </button>
              ))}
            </div>
          </div>

          {tournamentType === TournamentType.KNOCKOUT && (
            <div className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 uppercase shadow-xs">
              <Trophy className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
              Cập nhật tỷ số để tự động phân nhánh!
            </div>
          )}
        </div>

        {/* Khối Lọc theo Bảng đấu nếu giải đấu chia bảng */}
        {tournamentType === TournamentType.ROUND_ROBIN && availableGroups.length > 0 && (
          <div className="flex items-center gap-3 pt-3 border-t border-blue-50">
            <label className="text-[10px] font-extrabold text-blue-900/60 uppercase">Chỉ hiện bảng đấu:</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedGroup("all")}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                  selectedGroup === "all"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "bg-blue-50 text-blue-800 hover:bg-blue-100/70"
                }`}
              >
                Tất cả các bảng
              </button>
              {availableGroups.sort().map((group) => (
                <button
                  key={group}
                  onClick={() => setSelectedGroup(group)}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                    selectedGroup === group
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                      : "bg-blue-50 text-blue-800 hover:bg-blue-100/70"
                  }`}
                >
                  Bảng {group}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="bg-white p-12 text-center text-slate-400 border border-dashed border-blue-100 rounded-xl shadow-sm">
          <Info className="w-8 h-8 mx-auto text-blue-300 mb-2" />
          <p className="text-sm font-bold text-blue-900/60">Chưa có lịch thi đấu được khởi tạo.</p>
          <p className="text-xs text-slate-400 mt-1">Hãy chuyển sang Tab "Đội bóng" và bấm "Tạo Lịch Thi Đấu".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Cột trái: Danh sách trận đấu dạng bảng chi tiết */}
          <div className={`${tournamentType === TournamentType.KNOCKOUT ? "xl:col-span-8" : "xl:col-span-12"} flex flex-col`}>
            <div className="bg-white rounded-xl border border-blue-100 shadow-sm flex flex-col overflow-hidden">
              <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50/50 border-b border-blue-100 flex justify-between items-center">
                <h2 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Danh sách Các cặp đấu ({filteredMatches.length} trận)
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px] text-xs">
                  <thead>
                    <tr className="border-b border-blue-100 text-blue-900 text-[9px] font-extrabold uppercase tracking-wider bg-blue-50/50">
                      <th className="p-3">Vòng đấu</th>
                      <th className="p-3 text-center w-20">Bảng</th>
                      <th className="p-3 text-right">Đội nhà</th>
                      <th className="p-3 text-center w-24">Tỷ số</th>
                      <th className="p-3 text-left">Đội khách</th>
                      <th className="p-3">Thời gian</th>
                      <th className="p-3">Trọng tài</th>
                      <th className="p-3 text-center">Thẻ phạt</th>
                      <th className="p-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-50">
                    {filteredMatches.map((match, idx) => {
                      const homeName = getTeamDisplayName(match.homeTeamId, teams, matches);
                      const awayName = getTeamDisplayName(match.awayTeamId, teams, matches);
                      const isPlayed = match.played && !match.isBye;

                      return (
                        <tr
                          key={match.id}
                          className={`hover:bg-blue-50/50 transition-colors ${
                            match.isBye ? "bg-amber-50/10 text-slate-400" : ""
                          }`}
                        >
                          <td className="p-3 font-bold text-slate-700">
                            {match.roundName || `Vòng ${match.round}`}
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-extrabold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-[9px] uppercase border border-blue-100">
                              {match.group || "Knock-out"}
                            </span>
                          </td>
                          <td className={`p-3 text-right font-bold ${isPlayed && (match.homeScore ?? 0) > (match.awayScore ?? 0) ? "text-blue-700" : "text-slate-800"}`}>
                            {homeName}
                          </td>
                          <td className="p-3 text-center font-mono font-bold">
                            {match.isBye ? (
                              <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold uppercase">Nghỉ</span>
                            ) : isPlayed ? (
                              <span className="bg-blue-900 text-white px-2.5 py-1 rounded text-[11px] tracking-wider font-extrabold shadow-sm">
                                {match.homeScore} - {match.awayScore}
                              </span>
                            ) : (
                              <span className="text-blue-500 text-[9px] font-extrabold bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">VS</span>
                            )}
                          </td>
                          <td className={`p-3 text-left font-bold ${isPlayed && (match.awayScore ?? 0) > (match.homeScore ?? 0) ? "text-blue-700" : "text-slate-800"}`}>
                            {awayName}
                          </td>
                          <td className="p-3 text-slate-500 font-medium text-[11px]">
                            {match.isBye ? "-" : (
                              <div className="space-y-0.5">
                                <div>{`${match.date || ""} ${match.time || ""}`.trim() || "Chưa xếp"}</div>
                                {match.location && (
                                  <div className="text-[10px] text-blue-600 font-extrabold flex items-center gap-0.5">
                                    <span>📍</span> {match.location}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 text-[11px]">
                            {match.isBye ? "-" : match.referee || "Chưa xếp"}
                          </td>
                          <td className="p-3 text-center">
                            {match.isBye ? (
                              "-"
                            ) : isPlayed ? (
                              <div className="flex flex-col items-center justify-center gap-1 font-mono text-[10px] text-slate-500">
                                <div className="flex items-center justify-center gap-2">
                                  <div>
                                    🟨{match.homeYellowCards} 🟥{match.homeRedCards}
                                  </div>
                                  <div className="text-slate-300">|</div>
                                  <div>
                                    🟨{match.awayYellowCards} 🟥{match.awayRedCards}
                                  </div>
                                </div>
                                {(match.homeRedCardNotes || match.awayRedCardNotes) && (
                                  <div
                                    className="text-[9px] text-red-600 font-sans font-bold bg-red-50 border border-red-200 rounded px-1.5 py-0.5 mt-0.5 cursor-help"
                                    title={`GHI CHÚ THẺ ĐỎ:\n${match.homeRedCardNotes ? `- Đội Nhà: ${match.homeRedCardNotes}\n` : ""}${match.awayRedCardNotes ? `- Đội Khách: ${match.awayRedCardNotes}` : ""}`}
                                  >
                                    🔴 Chi tiết thẻ đỏ
                                  </div>
                                )}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex gap-1.5 items-center justify-center">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveMatch(idx, "up")}
                                className={`p-1 rounded transition-all cursor-pointer ${
                                  idx === 0 ? "text-slate-300 cursor-not-allowed" : "text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                }`}
                                title="Di chuyển trận đấu lên"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === filteredMatches.length - 1}
                                onClick={() => handleMoveMatch(idx, "down")}
                                className={`p-1 rounded transition-all cursor-pointer ${
                                  idx === filteredMatches.length - 1 ? "text-slate-300 cursor-not-allowed" : "text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                }`}
                                title="Di chuyển trận đấu xuống"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              {!match.isBye && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(match)}
                                  className="p-1 px-2.5 bg-blue-50 border border-blue-150 hover:bg-blue-100 hover:border-blue-200 text-blue-700 rounded transition-all cursor-pointer inline-flex items-center gap-1 font-extrabold text-[10px] uppercase shadow-xs"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Nhập</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Cột phải: Sơ đồ nhánh Bracket cây đấu (Chỉ xuất hiện nếu Knock-out) */}
          {tournamentType === TournamentType.KNOCKOUT && (
            <div className="xl:col-span-4 bg-white rounded-xl border border-blue-100 shadow-sm flex flex-col overflow-hidden">
              <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50/50 border-b border-blue-100 flex justify-between items-center">
                <h2 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  Sơ đồ nhánh đấu
                </h2>
              </div>

              <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto bg-gradient-to-b from-blue-50/10 to-transparent">
                {Object.keys(koRoundsMap)
                  .sort((a, b) => parseInt(a) - parseInt(b))
                  .map((roundNumStr) => {
                    const rNum = parseInt(roundNumStr);
                    const rMatches = koRoundsMap[rNum];
                    const rName = rMatches[0].roundName || `Vòng ${rNum}`;

                    return (
                      <div key={rNum} className="space-y-2">
                        <div className="text-[9px] font-extrabold text-blue-900 uppercase tracking-wider bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
                          {rName}
                        </div>
                        <div className="space-y-2">
                          {rMatches.map((m) => {
                            const home = getTeamDisplayName(m.homeTeamId, teams, matches);
                            const away = getTeamDisplayName(m.awayTeamId, teams, matches);
                            const winnerId = getMatchWinnerId(m);

                            return (
                              <div
                                key={m.id}
                                className="p-2.5 border border-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all text-xs flex flex-col gap-1.5 shadow-sm"
                              >
                                <div className="flex justify-between items-center text-[9px] font-bold text-blue-900/40">
                                  <span>Trận {m.id.split("-M")[1] || m.id}</span>
                                  {m.group && <span>Bảng {m.group}</span>}
                                </div>
                                <div className="space-y-1">
                                  {/* Đội Nhà */}
                                  <div className="flex justify-between items-center">
                                    <span
                                      className={`font-semibold tracking-tight ${
                                        m.played && winnerId === m.homeTeamId
                                          ? "text-blue-700 font-bold"
                                          : m.played
                                          ? "text-slate-400 line-through"
                                          : "text-slate-700"
                                      }`}
                                    >
                                      {home}
                                    </span>
                                    {m.played && !m.isBye && (
                                      <span className="font-extrabold text-blue-900 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded text-[10px]">
                                        {m.homeScore}
                                      </span>
                                    )}
                                  </div>
                                  {/* Đội Khách */}
                                  <div className="flex justify-between items-center">
                                    <span
                                      className={`font-semibold tracking-tight ${
                                        m.played && winnerId === m.awayTeamId
                                          ? "text-blue-700 font-bold"
                                          : m.played
                                          ? "text-slate-400 line-through"
                                          : "text-slate-700"
                                      }`}
                                    >
                                      {away}
                                    </span>
                                    {m.played && !m.isBye && (
                                      <span className="font-extrabold text-blue-900 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded text-[10px]">
                                        {m.awayScore}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pop-up Modal Cập nhật Kết quả */}
      <AnimatePresence>
        {editingMatch && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-blue-100"
            >
              <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-4 text-white flex justify-between items-center shadow-md">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-200" />
                  <span className="text-xs font-extrabold uppercase tracking-wider">Cập nhật Kết quả thi đấu</span>
                </div>
                <button
                  onClick={() => setEditingMatch(null)}
                  className="p-1 hover:bg-white/10 rounded-lg cursor-pointer text-blue-200 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveResult(editingMatch);
                }}
                className="p-4 space-y-4 text-xs text-slate-700"
              >
                {/* Tên Đội bóng đối đầu / Chọn đội đấu */}
                <div className="bg-blue-50/40 p-3.5 rounded-xl border border-blue-100 space-y-3">
                  <div className="text-[10px] font-extrabold text-blue-900/60 uppercase tracking-wider">Cấu hình Đội bóng thi đấu</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                    {/* Chọn Đội Nhà */}
                    <div>
                      <label className="block text-[9px] text-blue-900/60 font-bold mb-1 uppercase">Đội Nhà</label>
                      <select
                        className="w-full bg-white border border-blue-200 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                        value={editingMatch.homeTeamId}
                        onChange={(e) => setEditingMatch({ ...editingMatch, homeTeamId: e.target.value })}
                      >
                        {editingMatch.homeTeamId.startsWith("WIN:") && (
                          <option value={editingMatch.homeTeamId}>
                            {getTeamDisplayName(editingMatch.homeTeamId, teams, matches)} (Mặc định)
                          </option>
                        )}
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                        <option value="BYE">Nghỉ (BYE)</option>
                      </select>
                    </div>

                    {/* Chọn Đội Khách */}
                    <div>
                      <label className="block text-[9px] text-blue-900/60 font-bold mb-1 uppercase">Đội Khách</label>
                      <select
                        className="w-full bg-white border border-blue-200 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                        value={editingMatch.awayTeamId}
                        onChange={(e) => setEditingMatch({ ...editingMatch, awayTeamId: e.target.value })}
                      >
                        {editingMatch.awayTeamId.startsWith("WIN:") && (
                          <option value={editingMatch.awayTeamId}>
                            {getTeamDisplayName(editingMatch.awayTeamId, teams, matches)} (Mặc định)
                          </option>
                        )}
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                        <option value="BYE">Nghỉ (BYE)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Phần Tỷ số */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-blue-900/60 uppercase mb-1">
                      Bàn thắng Đội Nhà
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full bg-slate-50/50 border border-blue-200 rounded-lg px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-blue-500"
                      value={editingMatch.homeScore ?? 0}
                      onChange={(e) =>
                        setEditingMatch({ ...editingMatch, homeScore: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-blue-900/60 uppercase mb-1">
                      Bàn thắng Đội Khách
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full bg-slate-50/50 border border-blue-200 rounded-lg px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-blue-500"
                      value={editingMatch.awayScore ?? 0}
                      onChange={(e) =>
                        setEditingMatch({ ...editingMatch, awayScore: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>

                {/* Phần Thẻ phạt & Ghi chú thẻ đỏ */}
                <div className="border-t border-blue-50 pt-3 space-y-2">
                  <span className="text-[10px] font-extrabold text-blue-900/60 uppercase tracking-wider block">
                    Thống kê thẻ phạt (Tính chỉ số kỷ luật)
                  </span>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Thẻ nhà */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-bold">Thẻ vàng Đội Nhà 🟨</span>
                        <input
                          type="number"
                          min="0"
                          className="w-14 bg-slate-50/50 border border-blue-200 rounded-lg px-2 py-1 text-right font-bold text-xs focus:outline-none focus:border-blue-500"
                          value={editingMatch.homeYellowCards}
                          onChange={(e) =>
                            setEditingMatch({ ...editingMatch, homeYellowCards: parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-bold">Thẻ đỏ Đội Nhà 🟥</span>
                        <input
                          type="number"
                          min="0"
                          className="w-14 bg-slate-50/50 border border-blue-200 rounded-lg px-2 py-1 text-right font-bold text-xs focus:outline-none focus:border-blue-500"
                          value={editingMatch.homeRedCards}
                          onChange={(e) =>
                            setEditingMatch({ ...editingMatch, homeRedCards: parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>
                      {editingMatch.homeRedCards > 0 && (
                        <div className="mt-1">
                          <input
                            type="text"
                            placeholder="Tên cầu thủ, phút, lý do..."
                            className="w-full bg-red-50/30 border border-red-200 focus:border-red-400 rounded-lg px-2.5 py-2 text-[10px] text-red-900 focus:outline-none placeholder:text-red-300"
                            value={editingMatch.homeRedCardNotes || ""}
                            onChange={(e) =>
                              setEditingMatch({ ...editingMatch, homeRedCardNotes: e.target.value })
                            }
                          />
                        </div>
                      )}
                    </div>
                    {/* Thẻ khách */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-bold">Thẻ vàng Đội Khách 🟨</span>
                        <input
                          type="number"
                          min="0"
                          className="w-14 bg-slate-50/50 border border-blue-200 rounded-lg px-2 py-1 text-right font-bold text-xs focus:outline-none focus:border-blue-500"
                          value={editingMatch.awayYellowCards}
                          onChange={(e) =>
                            setEditingMatch({ ...editingMatch, awayYellowCards: parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-bold">Thẻ đỏ Đội Khách 🟥</span>
                        <input
                          type="number"
                          min="0"
                          className="w-14 bg-slate-50/50 border border-blue-200 rounded-lg px-2 py-1 text-right font-bold text-xs focus:outline-none focus:border-blue-500"
                          value={editingMatch.awayRedCards}
                          onChange={(e) =>
                            setEditingMatch({ ...editingMatch, awayRedCards: parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>
                      {editingMatch.awayRedCards > 0 && (
                        <div className="mt-1">
                          <input
                            type="text"
                            placeholder="Tên cầu thủ, phút, lý do..."
                            className="w-full bg-red-50/30 border border-red-200 focus:border-red-400 rounded-lg px-2.5 py-2 text-[10px] text-red-900 focus:outline-none placeholder:text-red-300"
                            value={editingMatch.awayRedCardNotes || ""}
                            onChange={(e) =>
                              setEditingMatch({ ...editingMatch, awayRedCardNotes: e.target.value })
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Thông tin phụ: Ngày, Giờ, Trọng tài, Địa điểm */}
                <div className="border-t border-blue-50 pt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-blue-900/60 uppercase mb-1">
                      Vòng đấu (Số thứ tự)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full bg-slate-50/50 border border-blue-200 rounded-lg px-2.5 py-2 text-xs font-bold font-mono focus:outline-none focus:border-blue-500"
                      value={editingMatch.round}
                      onChange={(e) => setEditingMatch({ ...editingMatch, round: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-blue-900/60 uppercase mb-1">
                      Tên vòng đấu (Nhãn hiển thị)
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Vòng 1, Bán kết..."
                      className="w-full bg-slate-50/50 border border-blue-200 rounded-lg px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-blue-500"
                      value={editingMatch.roundName || ""}
                      onChange={(e) => setEditingMatch({ ...editingMatch, roundName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-blue-900/60 uppercase mb-1">
                      Trọng tài chính
                    </label>
                    <input
                      type="text"
                      placeholder="Trọng tài..."
                      className="w-full bg-slate-50/50 border border-blue-200 rounded-lg px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-blue-500"
                      value={editingMatch.referee || ""}
                      onChange={(e) => setEditingMatch({ ...editingMatch, referee: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-blue-900/60 uppercase mb-1">
                      Địa điểm thi đấu (Vị trí)
                    </label>
                    <input
                      type="text"
                      placeholder="Sân vận động, Sân A, Sân B..."
                      className="w-full bg-slate-50/50 border border-blue-200 rounded-lg px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-blue-500"
                      value={editingMatch.location || ""}
                      onChange={(e) => setEditingMatch({ ...editingMatch, location: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-blue-900/60 uppercase mb-1">
                      Ngày thi đấu
                    </label>
                    <input
                      type="date"
                      className="w-full bg-slate-50/50 border border-blue-200 rounded-lg px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-blue-500"
                      value={editingMatch.date || ""}
                      onChange={(e) => setEditingMatch({ ...editingMatch, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-blue-900/60 uppercase mb-1">
                      Giờ thi đấu
                    </label>
                    <input
                      type="time"
                      className="w-full bg-slate-50/50 border border-blue-200 rounded-lg px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-blue-500"
                      value={editingMatch.time || ""}
                      onChange={(e) => setEditingMatch({ ...editingMatch, time: e.target.value })}
                    />
                  </div>
                </div>

                {/* Trạng thái đã đấu */}
                <div className="border-t border-blue-50 pt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="match-played-checkbox"
                    className="w-4 h-4 text-blue-600 bg-slate-50 border-blue-200 rounded cursor-pointer"
                    checked={editingMatch.played}
                    onChange={(e) => setEditingMatch({ ...editingMatch, played: e.target.checked })}
                  />
                  <label htmlFor="match-played-checkbox" className="text-xs font-bold text-slate-700 cursor-pointer selection:bg-blue-100">
                    Trận đấu đã diễn ra (Bấm chọn để hiển thị tỷ số & ghi nhận điểm xếp hạng)
                  </label>
                </div>

                {/* Các nút bấm */}
                <div className="flex gap-2 justify-end border-t border-blue-50 pt-3.5">
                  <button
                    type="button"
                    onClick={() => setEditingMatch(null)}
                    className="border border-blue-250 text-blue-700 font-bold px-3.5 py-2 rounded-lg hover:bg-blue-50 transition-all cursor-pointer text-xs"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg transition-all shadow-md shadow-blue-200 cursor-pointer text-xs"
                  >
                    Lưu kết quả
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
