/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Team, Match, TournamentType } from "./types";
import { generateRoundRobin, generateKnockout } from "./utils/scheduler";
import { exportTournamentToExcel } from "./utils/excelExporter";
import TeamTab from "./components/TeamTab";
import MatchTab from "./components/MatchTab";
import StandingsTab from "./components/StandingsTab";
import PythonTab from "./components/PythonTab";
import { Users, Calendar, Trophy, Terminal, Sparkles, Settings } from "lucide-react";

// Dữ liệu 8 đội bóng mặc định chuẩn bị sẵn
const INITIAL_TEAMS: Team[] = [
  { id: "T-HN", name: "Hà Nội FC", group: "A" },
  { id: "T-HP", name: "Hải Phòng FC", group: "A" },
  { id: "T-ND", name: "Thép Xanh Nam Định", group: "A" },
  { id: "T-CA", name: "Công An Hà Nội", group: "A" },
  { id: "T-BD", name: "Becamex Bình Dương", group: "B" },
  { id: "T-HA", name: "HAGL FC", group: "B" },
  { id: "T-TH", name: "Thanh Hóa FC", group: "B" },
  { id: "T-VT", name: "Viettel FC", group: "B" },
];

export default function App() {
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournamentType, setTournamentType] = useState<TournamentType>(TournamentType.ROUND_ROBIN);
  const [numGroups, setNumGroups] = useState<number>(2);
  const [groupType, setGroupType] = useState<"single" | "multiple">("multiple");
  const [activeTab, setActiveTab] = useState<"teams" | "matches" | "standings" | "python">("teams");

  // Xử lý tạo lịch thi đấu toàn diện
  const handleGenerateSchedule = () => {
    if (teams.length < 2) {
      alert("Cần có ít nhất 2 đội bóng để lập lịch thi đấu!");
      return;
    }

    let generatedMatches: Match[] = [];

    if (tournamentType === TournamentType.ROUND_ROBIN) {
      // Đấu vòng tròn
      if (groupType === "single") {
        // Gom tất cả vào 1 bảng
        const allInOne = teams.map((t) => ({ ...t, group: "A" }));
        setTeams(allInOne);
        generatedMatches = generateRoundRobin(allInOne, "A");
      } else {
        // Chia thành N bảng đấu
        const groupsMap: { [key: string]: Team[] } = {};
        teams.forEach((t) => {
          const g = t.group || "A";
          if (!groupsMap[g]) groupsMap[g] = [];
          groupsMap[g].push(t);
        });

        Object.keys(groupsMap).forEach((groupChar) => {
          const groupTeams = groupsMap[groupChar];
          const groupMatches = generateRoundRobin(groupTeams, groupChar);
          generatedMatches.push(...groupMatches);
        });
      }
    } else {
      // Đấu loại trực tiếp (Knockout)
      generatedMatches = generateKnockout(teams);
    }

    setMatches(generatedMatches);
    setActiveTab("matches"); // Chuyển luôn sang tab lịch thi đấu để người dùng theo dõi
  };

  // Trích xuất danh sách các bảng đấu đang có
  const availableGroups = Array.from(new Set(teams.map((t) => t.group).filter(Boolean))) as string[];

  const handleExportExcel = () => {
    exportTournamentToExcel(teams, matches, tournamentType === TournamentType.ROUND_ROBIN ? availableGroups : []);
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col font-sans select-none text-slate-900">
      {/* HEADER CỦA TOÀN BỘ ỨNG DỤNG - High Density Dark Theme */}
      <header className="flex flex-col md:flex-row items-center justify-between px-6 py-3 bg-[#1e293b] text-white shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500 rounded text-white flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-md font-bold tracking-tight flex items-center gap-2">
              Quản lý Giải đấu Bóng đá Pro
              <span className="text-[10px] bg-slate-800 border border-slate-700 text-sky-400 px-2 py-0.5 rounded font-semibold">
                v2.4
              </span>
            </h1>
            <p className="text-[10px] text-slate-300 opacity-80 font-medium">
              Sắp lịch thi đấu thông minh &amp; Sắp xếp bảng thứ bậc chuẩn FIFA
            </p>
          </div>
        </div>

        {/* THÔNG TIN TRẠNG THÁI GIẢI ĐẤU (High Density Stats Indicator) */}
        <div className="flex gap-4 text-xs mt-3 md:mt-0">
          <div className="flex flex-col items-end">
            <span className="opacity-60 uppercase font-bold text-[9px] tracking-wider">Thể thức giải</span>
            <span className="font-semibold text-slate-100">
              {tournamentType === TournamentType.ROUND_ROBIN ? "Chia bảng đấu vòng tròn" : "Đấu loại trực tiếp"}
            </span>
          </div>
          <div className="w-px bg-white/20"></div>
          <div className="flex flex-col items-end">
            <span className="opacity-60 uppercase font-bold text-[9px] tracking-wider">Trạng thái</span>
            <span className={`font-semibold ${matches.length > 0 ? (matches.filter(m => m.played).length === matches.length ? "text-amber-400" : "text-emerald-400") : "text-slate-400"}`}>
              {matches.length > 0 ? (matches.filter(m => m.played).length === matches.length ? "Đã kết thúc" : "Đang diễn ra") : "Chưa bắt đầu"}
            </span>
          </div>
        </div>
      </header>

      {/* PYQT6 STYLE TAB BAR */}
      <nav className="flex bg-white border-b border-slate-300 px-4 sticky top-[56px] z-20 shadow-2xs">
        <button
          onClick={() => setActiveTab("teams")}
          className={`px-5 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "teams"
              ? "border-blue-600 text-blue-600 font-bold bg-slate-50/50"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Quản lý Đội bóng
        </button>
        <button
          onClick={() => setActiveTab("matches")}
          className={`px-5 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "matches"
              ? "border-blue-600 text-blue-600 font-bold bg-slate-50/50"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Lịch thi đấu &amp; Kết quả
        </button>
        <button
          onClick={() => setActiveTab("standings")}
          className={`px-5 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "standings"
              ? "border-blue-600 text-blue-600 font-bold bg-slate-50/50"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          Bảng xếp hạng
        </button>
        <button
          onClick={() => setActiveTab("python")}
          className={`px-5 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "python"
              ? "border-blue-600 text-blue-600 font-bold bg-slate-50/50"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Xuất bản dữ liệu &amp; Python Code
        </button>
      </nav>

      {/* NỘI DUNG CHÍNH CỦA TAB ĐANG CHỌN */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="min-h-[500px]">
          {activeTab === "teams" && (
            <TeamTab
              teams={teams}
              setTeams={setTeams}
              tournamentType={tournamentType}
              setTournamentType={setTournamentType}
              numGroups={numGroups}
              setNumGroups={setNumGroups}
              groupType={groupType}
              setGroupType={setGroupType}
              onGenerateSchedule={handleGenerateSchedule}
            />
          )}

          {activeTab === "matches" && (
            <MatchTab
              teams={teams}
              matches={matches}
              setMatches={setMatches}
              tournamentType={tournamentType}
            />
          )}

          {activeTab === "standings" && (
            <StandingsTab
              teams={teams}
              matches={matches}
            />
          )}

          {activeTab === "python" && (
            <PythonTab
              onExportExcel={handleExportExcel}
            />
          )}
        </div>
      </main>

      {/* FOOTER BAR (PyQt6 Styled System Status) */}
      <footer className="bg-slate-200 border-t border-slate-300 px-6 py-2.5 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-600 font-mono">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 
            Sẵn sàng
          </span>
          <span className="text-slate-400">|</span>
          <span>Hệ thống: React + Tailwind CSS High Density Theme</span>
          <span className="text-slate-400">|</span>
          <span>Bộ nhớ đệm: Cục bộ (localStorage ready)</span>
        </div>
        <div className="mt-1 sm:mt-0 text-right">
          Hỗ trợ kỹ thuật: support@footyapp.vn | Phiên bản PyQt6 Desktop Ready
        </div>
      </footer>
    </div>
  );
}
