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
        <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Xem Bảng xếp hạng:</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setSelectedGroup("all")}
              className={`px-3 py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                selectedGroup === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Xem Tất cả Bảng
            </button>
            {availableGroups.sort().map((group) => (
              <button
                key={group}
                onClick={() => setSelectedGroup(group)}
                className={`px-3 py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                  selectedGroup === group
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
        <div className="bg-white p-12 text-center text-slate-400 border border-dashed border-slate-300 rounded-lg">
          <p className="text-sm font-semibold">Chưa có dữ liệu bảng xếp hạng.</p>
          <p className="text-xs text-slate-400">Vui lòng thêm các đội bóng ở Tab "Đội bóng" để xem xếp hạng.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quy luật sắp xếp (Chú thích nhỏ cho người dùng) */}
          <div className="bg-slate-50 border border-slate-300 p-3 rounded-lg text-[11px] text-slate-600 leading-relaxed flex flex-wrap gap-4 justify-between items-center">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                <strong>Quy tắc phân hạng FIFA:</strong> Điểm số (Thắng=3, Hòa=1) → Hiệu số (HS) → Chỉ số kỷ luật (Thẻ đỏ=3đ, Thẻ vàng=1đ, <strong>ít điểm phạt hơn xếp trên</strong>) → Số bàn thắng (BT).
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] text-slate-500">
              <span className="flex items-center gap-1">🟨 = 1đ</span>
              <span className="flex items-center gap-1">🟥 = 3đ</span>
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
                  <div key={groupChar} className="bg-white rounded-lg border border-slate-300 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                      <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
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
            <div className="bg-white rounded-lg border border-slate-300 shadow-sm flex flex-col overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
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
        <tr className="border-b border-slate-300 text-slate-600 text-[10px] font-bold uppercase tracking-wider bg-slate-100">
          <th className="p-2.5 w-16 text-center">Hạng</th>
          <th className="p-2.5">Đội bóng</th>
          <th className="p-2.5 text-center w-16">ST</th>
          <th className="p-2.5 text-center w-16">T</th>
          <th className="p-2.5 text-center w-16">H</th>
          <th className="p-2.5 text-center w-16">B</th>
          <th className="p-2.5 text-center w-24">
            <span className="flex items-center justify-center gap-1">
              <Goal className="w-3.5 h-3.5 text-slate-400" />
              BT/BP
            </span>
          </th>
          <th className="p-2.5 text-center w-16">HS</th>
          <th className="p-2.5 text-center w-24">Thẻ phạt</th>
          <th className="p-2.5 text-center w-32">
            <span className="flex items-center justify-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
              Điểm Kỷ Luật
            </span>
          </th>
          <th className="p-2.5 text-center w-24 bg-slate-150">Điểm</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-150">
        {standings.map((std, idx) => {
          // Top 3 đội đứng đầu có huy hiệu đặc biệt
          const rankBg =
            idx === 0
              ? "bg-amber-100 text-amber-800 font-bold border border-amber-200"
              : idx === 1
              ? "bg-slate-150 text-slate-800 font-bold border border-slate-300"
              : idx === 2
              ? "bg-amber-50 text-amber-900 font-bold border border-amber-200"
              : "bg-slate-50 text-slate-500 border border-slate-200";

          return (
            <tr key={std.teamId} className="hover:bg-blue-50/50 transition-colors">
              <td className="p-2.5 text-center">
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] border ${rankBg}`}>
                  {idx + 1}
                </span>
              </td>
              <td className="p-2.5 font-bold text-blue-900">
                {std.teamName}
              </td>
              <td className="p-2.5 text-center font-bold text-slate-600">{std.played}</td>
              <td className="p-2.5 text-center text-emerald-600 font-bold">{std.won}</td>
              <td className="p-2.5 text-center text-slate-600 font-semibold">{std.drawn}</td>
              <td className="p-2.5 text-center text-rose-600 font-semibold">{std.lost}</td>
              <td className="p-2.5 text-center font-mono text-slate-500 font-medium">
                {std.goalsFor} - {std.goalsAgainst}
              </td>
              <td className={`p-2.5 text-center font-bold font-mono ${std.goalDifference > 0 ? "text-emerald-600" : std.goalDifference < 0 ? "text-rose-600" : "text-slate-500"}`}>
                {std.goalDifference > 0 ? `+${std.goalDifference}` : std.goalDifference}
              </td>
              <td className="p-2.5 text-center">
                <span className="font-mono text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                  🟨{std.yellowCards} | 🟥{std.redCards}
                </span>
              </td>
              <td className="p-2.5 text-center">
                <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${std.disciplinePoints > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                  {std.disciplinePoints} đ
                </span>
              </td>
              <td className="p-2.5 text-center font-bold text-slate-900 bg-slate-50">
                {std.points}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
