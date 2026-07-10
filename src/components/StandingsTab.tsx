/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Team, Match } from "../types";
import { calculateStandings } from "../utils/standings";
import { Award, Filter, ShieldAlert, Goal } from "lucide-react";

interface StandingsTabProps {
  teams: Team[];
  matches: Match[];
}

export default function StandingsTab({ teams, matches }: StandingsTabProps) {
  const [selectedGroup, setSelectedGroup] = useState<string | "all">("all");

  // Thu thập tất cả các tên bảng đấu đang có
  const availableGroups = Array.from(new Set(teams.map((t) => t.group).filter(Boolean))) as string[];

  // Nếu lọc "all" và có chia bảng, chúng ta hiển thị bảng xếp hạng từng bảng riêng biệt cho trực quan
  const isMultipleGroups = availableGroups.length > 0;

  return (
    <div id="standings-tab-container" className="space-y-4">
      {/* Khối Lọc theo Bảng đấu */}
      {isMultipleGroups && (
        <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-[10px] font-extrabold text-blue-900/60 uppercase">Xem Bảng xếp hạng:</span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setSelectedGroup("all")}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                selectedGroup === "all"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "bg-blue-50 text-blue-800 hover:bg-blue-100/70"
              }`}
            >
              Xem Tất cả Bảng
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

      {/* Hiển thị bảng xếp hạng */}
      {teams.length === 0 ? (
        <div className="bg-white p-12 text-center text-slate-400 border border-dashed border-blue-100 rounded-xl shadow-sm">
          <p className="text-sm font-bold text-blue-900/60">Chưa có dữ liệu bảng xếp hạng.</p>
          <p className="text-xs text-slate-450 mt-1">Vui lòng thêm các đội bóng ở Tab "Đội bóng" để xem xếp hạng.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quy luật sắp xếp (Chú thích nhỏ cho người dùng) */}
          <div className="bg-gradient-to-r from-blue-50/50 to-cyan-50/30 border border-blue-100 p-3 rounded-xl text-[11px] text-slate-600 leading-relaxed flex flex-wrap gap-4 justify-between items-center shadow-xs">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                <strong className="text-blue-950 font-extrabold">Quy tắc phân hạng FIFA:</strong> Điểm số (Thắng=3, Hòa=1) → Hiệu số (HS) → Chỉ số kỷ luật (Thẻ đỏ=3đ, Thẻ vàng=1đ, <strong className="text-emerald-700">ít điểm phạt hơn xếp trên</strong>) → Số bàn thắng (BT).
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] text-slate-500 font-bold">
              <span className="flex items-center gap-1 bg-yellow-50 text-yellow-800 border border-yellow-200 px-1.5 py-0.5 rounded">🟨 = 1đ</span>
              <span className="flex items-center gap-1 bg-red-50 text-red-800 border border-red-200 px-1.5 py-0.5 rounded">🟥 = 3đ</span>
            </div>
          </div>

          {/* Vẽ từng bảng xếp hạng cụ thể */}
          {isMultipleGroups ? (
            // Trường hợp có chia nhiều bảng đấu
            availableGroups
              .filter((g) => selectedGroup === "all" || selectedGroup === g)
              .sort()
              .map((groupChar) => {
                const groupStandings = calculateStandings(teams, matches, groupChar);
                return (
                  <div key={groupChar} className="bg-white rounded-xl border border-blue-100 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50/50 border-b border-blue-100 flex justify-between items-center">
                      <h2 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                        BẢNG XẾP HẠNG BẢNG {groupChar}
                      </h2>
                    </div>
                    <div className="overflow-x-auto">
                      <StandingsTable standings={groupStandings} />
                    </div>
                  </div>
                );
              })
          ) : (
            // Trường hợp 1 bảng duy nhất (Giải đấu vòng tròn chung hoặc Knockout)
            <div className="bg-white rounded-xl border border-blue-100 shadow-sm flex flex-col overflow-hidden">
              <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50/50 border-b border-blue-100 flex justify-between items-center">
                <h2 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  BẢNG XẾP HẠNG TỔNG HỢP (Toàn giải)
                </h2>
              </div>
              <div className="overflow-x-auto">
                <StandingsTable standings={calculateStandings(teams, matches)} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Sub-component: StandingsTable hiển thị bảng xếp hạng chuẩn
function StandingsTable({ standings }: { standings: ReturnType<typeof calculateStandings> }) {
  return (
    <table className="w-full text-left border-collapse min-w-[700px] text-xs">
      <thead>
        <tr className="border-b border-blue-100 text-blue-900 text-[9px] font-extrabold uppercase tracking-wider bg-blue-50/50">
          <th className="p-3 w-16 text-center">Hạng</th>
          <th className="p-3">Đội bóng</th>
          <th className="p-3 text-center w-16">ST</th>
          <th className="p-3 text-center w-16">T</th>
          <th className="p-3 text-center w-16">H</th>
          <th className="p-3 text-center w-16">B</th>
          <th className="p-3 text-center w-24">
            <span className="flex items-center justify-center gap-1 text-blue-900/60">
              <Goal className="w-3.5 h-3.5" />
              BT/BP
            </span>
          </th>
          <th className="p-3 text-center w-16">HS</th>
          <th className="p-3 text-center w-24">Thẻ phạt</th>
          <th className="p-3 text-center w-32">
            <span className="flex items-center justify-center gap-1 text-blue-900/60">
              <ShieldAlert className="w-3.5 h-3.5" />
              Điểm Kỷ Luật
            </span>
          </th>
          <th className="p-3 text-center w-24 bg-blue-100/50 text-blue-900 font-extrabold">Điểm</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-blue-50">
        {standings.map((std, idx) => {
          // Top 3 đội đứng đầu có huy hiệu đặc biệt
          const rankBg =
            idx === 0
              ? "bg-amber-550 text-white font-extrabold border border-amber-500 bg-gradient-to-br from-yellow-400 to-amber-500 shadow-xs"
              : idx === 1
              ? "bg-slate-300 text-slate-800 font-extrabold border border-slate-400"
              : idx === 2
              ? "bg-amber-600 text-white font-extrabold border border-amber-700 bg-gradient-to-br from-orange-400 to-amber-600 shadow-xs"
              : "bg-blue-50/50 text-blue-800 border border-blue-100";

          return (
            <tr key={std.teamId} className="hover:bg-blue-50/50 transition-colors">
              <td className="p-3 text-center">
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${rankBg}`}>
                  {idx + 1}
                </span>
              </td>
              <td className="p-3 font-extrabold text-blue-950">
                {std.teamName}
              </td>
              <td className="p-3 text-center font-bold text-slate-600">{std.played}</td>
              <td className="p-3 text-center text-emerald-600 font-extrabold">{std.won}</td>
              <td className="p-3 text-center text-slate-600 font-semibold">{std.drawn}</td>
              <td className="p-3 text-center text-rose-600 font-semibold">{std.lost}</td>
              <td className="p-3 text-center font-mono text-slate-500 font-medium">
                {std.goalsFor} - {std.goalsAgainst}
              </td>
              <td className={`p-3 text-center font-extrabold font-mono ${std.goalDifference > 0 ? "text-emerald-600" : std.goalDifference < 0 ? "text-rose-600" : "text-slate-500"}`}>
                {std.goalDifference > 0 ? `+${std.goalDifference}` : std.goalDifference}
              </td>
              <td className="p-3 text-center">
                <span className="font-mono text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-lg">
                  🟨{std.yellowCards} | 🟥{std.redCards}
                </span>
              </td>
              <td className="p-3 text-center">
                <span className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold border ${std.disciplinePoints > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-550 text-emerald-700 border-emerald-200"}`}>
                  {std.disciplinePoints} đ
                </span>
              </td>
              <td className="p-3 text-center font-extrabold text-blue-900 bg-blue-50/30">
                {std.points}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
