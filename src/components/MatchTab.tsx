/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Team, Match, TournamentType } from "../types";
import { getTeamDisplayName, getMatchWinnerId } from "../utils/scheduler";
import { Edit2, Shield, Calendar, Users, X, Info, Trophy, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MatchTabProps {
  teams: Team[];
  matches: Match[];
  setMatches: React.Dispatch<React.SetStateAction<Match[]>>;
  tournamentType: TournamentType;
}

export default function MatchTab({ teams, matches, setMatches, tournamentType }: MatchTabProps) {
  const [selectedRound, setSelectedRound] = useState<number | "all">("all");
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  // Điểm danh sách vòng đấu duy nhất có sẵn
  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);

  // Lọc danh sách các trận đấu theo vòng đã chọn
  const filteredMatches = selectedRound === "all" 
    ? matches 
    : matches.filter((m) => m.round === selectedRound);

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
            homeScore: updated.homeScore,
            awayScore: updated.awayScore,
            homeYellowCards: updated.homeYellowCards,
            homeRedCards: updated.homeRedCards,
            awayYellowCards: updated.awayYellowCards,
            awayRedCards: updated.awayRedCards,
            referee: updated.referee,
            date: updated.date,
            time: updated.time,
            played: true,
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
      {/* Bộ lọc Vòng đấu */}
      <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Lọc Vòng thi đấu:</label>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedRound("all")}
              className={`px-3 py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                selectedRound === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Tất cả các vòng
            </button>
            {rounds.map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRound(r)}
                className={`px-3 py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                  selectedRound === r
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Vòng {r}
              </button>
            ))}
          </div>
        </div>

        {tournamentType === TournamentType.KNOCKOUT && (
          <div className="text-[10px] text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded font-bold flex items-center gap-1.5 uppercase">
            <Trophy className="w-3.5 h-3.5 text-blue-600" />
            Cập nhật tỷ số để tự động phân nhánh!
          </div>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="bg-white p-12 text-center text-slate-400 border border-dashed border-slate-300 rounded-lg">
          <Info className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold">Chưa có lịch thi đấu được khởi tạo.</p>
          <p className="text-xs text-slate-400">Hãy chuyển sang Tab "Đội bóng" và bấm "Tạo Lịch Thi Đấu".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Cột trái: Danh sách trận đấu dạng bảng chi tiết */}
          <div className={`${tournamentType === TournamentType.KNOCKOUT ? "xl:col-span-8" : "xl:col-span-12"} flex flex-col`}>
            <div className="bg-white rounded-lg border border-slate-300 shadow-sm flex flex-col overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Danh sách Các cặp đấu ({filteredMatches.length} trận)
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px] text-xs">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-600 text-[10px] font-bold uppercase tracking-wider bg-slate-100">
                      <th className="p-2.5">Vòng đấu</th>
                      <th className="p-2.5">Bảng</th>
                      <th className="p-2.5 text-right">Đội nhà</th>
                      <th className="p-2.5 text-center w-24">Tỷ số</th>
                      <th className="p-2.5 text-left">Đội khách</th>
                      <th className="p-2.5">Thời gian</th>
                      <th className="p-2.5">Trọng tài</th>
                      <th className="p-2.5 text-center">Thẻ phạt (Nhà/Khách)</th>
                      <th className="p-2.5 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredMatches.map((match) => {
                      const homeName = getTeamDisplayName(match.homeTeamId, teams, matches);
                      const awayName = getTeamDisplayName(match.awayTeamId, teams, matches);
                      const isPlayed = match.played && !match.isBye;

                      return (
                        <tr
                          key={match.id}
                          className={`hover:bg-blue-50/50 transition-colors ${
                            match.isBye ? "bg-amber-50/20 text-slate-400" : ""
                          }`}
                        >
                          <td className="p-2.5 font-bold text-slate-700">
                            {match.roundName || `Vòng ${match.round}`}
                          </td>
                          <td className="p-2.5">
                            <span className="font-bold bg-slate-150 text-slate-600 px-2 py-0.5 rounded text-[9px] uppercase border border-slate-200">
                              {match.group || "Knock-out"}
                            </span>
                          </td>
                          <td className={`p-2.5 text-right font-bold ${isPlayed && (match.homeScore ?? 0) > (match.awayScore ?? 0) ? "text-blue-700" : "text-slate-800"}`}>
                            {homeName}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold">
                            {match.isBye ? (
                              <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold uppercase">Nghỉ</span>
                            ) : isPlayed ? (
                              <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[11px] tracking-wider">
                                {match.homeScore} - {match.awayScore}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[9px] font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">VS</span>
                            )}
                          </td>
                          <td className={`p-2.5 text-left font-bold ${isPlayed && (match.awayScore ?? 0) > (match.homeScore ?? 0) ? "text-blue-700" : "text-slate-800"}`}>
                            {awayName}
                          </td>
                          <td className="p-2.5 text-slate-500 font-medium text-[11px]">
                            {match.isBye ? "-" : `${match.date || ""} ${match.time || ""}`.trim() || "Chưa xếp"}
                          </td>
                          <td className="p-2.5 text-slate-600 text-[11px]">
                            {match.isBye ? "-" : match.referee || "Chưa xếp"}
                          </td>
                          <td className="p-2.5 text-center">
                            {match.isBye ? (
                              "-"
                            ) : isPlayed ? (
                              <div className="flex items-center justify-center gap-2 font-mono text-[10px] text-slate-500">
                                <div>
                                  🟨{match.homeYellowCards} 🟥{match.homeRedCards}
                                </div>
                                <div className="text-slate-300">|</div>
                                <div>
                                  🟨{match.awayYellowCards} 🟥{match.awayRedCards}
                                </div>
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            {!match.isBye && (
                              <button
                                onClick={() => handleOpenEdit(match)}
                                className="p-1 px-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 rounded transition-all cursor-pointer inline-flex items-center gap-1 font-bold text-[10px] uppercase"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Nhập</span>
                              </button>
                            )}
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
            <div className="xl:col-span-4 bg-white rounded-lg border border-slate-300 shadow-sm flex flex-col overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Sơ đồ nhánh đấu
                </h2>
              </div>

              <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto bg-slate-50/50">
                {Object.keys(koRoundsMap)
                  .sort((a, b) => parseInt(a) - parseInt(b))
                  .map((roundNumStr) => {
                    const rNum = parseInt(roundNumStr);
                    const rMatches = koRoundsMap[rNum];
                    const rName = rMatches[0].roundName || `Vòng ${rNum}`;

                    return (
                      <div key={rNum} className="space-y-2">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-200 px-2 py-0.5 rounded border border-slate-300">
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
                                className="p-2.5 border border-slate-300 rounded bg-white hover:border-blue-400 transition-all text-xs flex flex-col gap-1.5 shadow-2xs"
                              >
                                <div className="flex justify-between items-center text-[9px] font-mono text-slate-400">
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
                                      <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">
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
                                      <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">
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
              className="bg-white rounded-lg w-full max-w-lg overflow-hidden shadow-xl border border-slate-300"
            >
              <div className="bg-slate-900 p-3 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">Cập nhật Kết quả thi đấu</span>
                </div>
                <button
                  onClick={() => setEditingMatch(null)}
                  className="p-1 hover:bg-slate-800 rounded cursor-pointer text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveResult(editingMatch);
                }}
                className="p-4 space-y-4 text-xs text-slate-700"
              >
                {/* Tên Đội bóng đối đầu */}
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-300 text-xs font-bold text-slate-800">
                  <span className="text-center flex-1 pr-2 text-blue-900">
                    {getTeamDisplayName(editingMatch.homeTeamId, teams, matches)}
                  </span>
                  <span className="text-slate-400 px-3 uppercase tracking-wider text-[10px]">VS</span>
                  <span className="text-center flex-1 pl-2 text-blue-900">
                    {getTeamDisplayName(editingMatch.awayTeamId, teams, matches)}
                  </span>
                </div>

                {/* Phần Tỷ số */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Bàn thắng Đội Nhà
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold"
                      value={editingMatch.homeScore ?? 0}
                      onChange={(e) =>
                        setEditingMatch({ ...editingMatch, homeScore: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Bàn thắng Đội Khách
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold"
                      value={editingMatch.awayScore ?? 0}
                      onChange={(e) =>
                        setEditingMatch({ ...editingMatch, awayScore: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>

                {/* Phần Thẻ phạt */}
                <div className="border-t border-slate-200 pt-3 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Thống kê thẻ phạt (Tính chỉ số kỷ luật)
                  </span>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Thẻ nhà */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Thẻ vàng Đội Nhà 🟨</span>
                        <input
                          type="number"
                          min="0"
                          className="w-14 bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-right font-bold text-xs"
                          value={editingMatch.homeYellowCards}
                          onChange={(e) =>
                            setEditingMatch({ ...editingMatch, homeYellowCards: parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Thẻ đỏ Đội Nhà 🟥</span>
                        <input
                          type="number"
                          min="0"
                          className="w-14 bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-right font-bold text-xs"
                          value={editingMatch.homeRedCards}
                          onChange={(e) =>
                            setEditingMatch({ ...editingMatch, homeRedCards: parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>
                    </div>
                    {/* Thẻ khách */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Thẻ vàng Đội Khách 🟨</span>
                        <input
                          type="number"
                          min="0"
                          className="w-14 bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-right font-bold text-xs"
                          value={editingMatch.awayYellowCards}
                          onChange={(e) =>
                            setEditingMatch({ ...editingMatch, awayYellowCards: parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Thẻ đỏ Đội Khách 🟥</span>
                        <input
                          type="number"
                          min="0"
                          className="w-14 bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-right font-bold text-xs"
                          value={editingMatch.awayRedCards}
                          onChange={(e) =>
                            setEditingMatch({ ...editingMatch, awayRedCards: parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Thông tin phụ: Ngày, Giờ, Trọng tài */}
                <div className="border-t border-slate-200 pt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                      Trọng tài chính
                    </label>
                    <input
                      type="text"
                      placeholder="Trọng tài..."
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs"
                      value={editingMatch.referee || ""}
                      onChange={(e) => setEditingMatch({ ...editingMatch, referee: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                      Ngày thi đấu
                    </label>
                    <input
                      type="date"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs"
                      value={editingMatch.date || ""}
                      onChange={(e) => setEditingMatch({ ...editingMatch, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                      Giờ thi đấu
                    </label>
                    <input
                      type="time"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs"
                      value={editingMatch.time || ""}
                      onChange={(e) => setEditingMatch({ ...editingMatch, time: e.target.value })}
                    />
                  </div>
                </div>

                {/* Các nút bấm */}
                <div className="flex gap-2 justify-end border-t border-slate-200 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingMatch(null)}
                    className="border border-slate-300 text-slate-600 font-bold px-3 py-1.5 rounded hover:bg-slate-50 transition-all cursor-pointer text-xs"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-1.5 rounded transition-all shadow-xs cursor-pointer text-xs"
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
