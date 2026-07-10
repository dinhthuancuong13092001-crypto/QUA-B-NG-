/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Team, Match, TournamentType, Tournament } from "./types";
import { generateRoundRobin, generateKnockout } from "./utils/scheduler";
import { exportTournamentToExcel } from "./utils/excelExporter";
import TeamTab from "./components/TeamTab";
import MatchTab from "./components/MatchTab";
import StandingsTab from "./components/StandingsTab";
import PythonTab from "./components/PythonTab";
import TournamentManagerModal from "./components/TournamentManagerModal";
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

const DEFAULT_TOURNAMENT_ID = "TOURNAMENT-DEFAULT";

const INITIAL_TOURNAMENT: Tournament = {
  id: DEFAULT_TOURNAMENT_ID,
  name: "Giải vô địch Quốc gia V-League Pro",
  type: TournamentType.ROUND_ROBIN,
  numGroups: 2,
  groupType: "multiple",
  teams: INITIAL_TEAMS,
  matches: [],
  createdAt: new Date().toISOString(),
};

export default function App() {
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    const saved = localStorage.getItem("football_tournaments");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Error reading tournaments from localStorage", e);
      }
    }
    return [INITIAL_TOURNAMENT];
  });

  const [activeTournamentId, setActiveTournamentId] = useState<string>(() => {
    const savedId = localStorage.getItem("football_active_tournament_id");
    const savedTournaments = localStorage.getItem("football_tournaments");
    if (savedId && savedTournaments) {
      try {
        const parsed = JSON.parse(savedTournaments);
        if (Array.isArray(parsed) && parsed.some((t) => t.id === savedId)) {
          return savedId;
        }
      } catch (e) {
        console.error("Error reading active tournament ID", e);
      }
    }
    return DEFAULT_TOURNAMENT_ID;
  });

  const activeTourney = tournaments.find((t) => t.id === activeTournamentId) || tournaments[0] || INITIAL_TOURNAMENT;

  const [teams, setTeams] = useState<Team[]>(activeTourney.teams);
  const [matches, setMatches] = useState<Match[]>(activeTourney.matches);
  const [tournamentType, setTournamentType] = useState<TournamentType>(activeTourney.type);
  const [numGroups, setNumGroups] = useState<number>(activeTourney.numGroups);
  const [groupType, setGroupType] = useState<"single" | "multiple">(activeTourney.groupType);
  const [activeTab, setActiveTab] = useState<"teams" | "matches" | "standings" | "python">("teams");
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("football_auto_save_json");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const ignoreSaveRef = useRef(false);
  const isFirstMountRef = useRef(true);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    // Clear existing timer if called multiple times
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  };

  // Sync isAutoSaveEnabled to localStorage
  useEffect(() => {
    localStorage.setItem("football_auto_save_json", JSON.stringify(isAutoSaveEnabled));
  }, [isAutoSaveEnabled]);

  // Debounced auto-save JSON download
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    if (!isAutoSaveEnabled) return;

    const timer = setTimeout(() => {
      try {
        const dataStr = JSON.stringify(tournaments, null, 2);
        const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
        
        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", dataUri);
        linkElement.setAttribute("download", `football_tournaments_backup.json`);
        linkElement.click();
        showToast("Đã tự động tải file JSON dự phòng mới nhất!", "success");
      } catch (e) {
        console.error("Auto backup download failed:", e);
      }
    }, 4000); // 4 seconds debounce

    return () => clearTimeout(timer);
  }, [tournaments, isAutoSaveEnabled]);

  // Sync active tournament state with localStorage and the tournaments list
  useEffect(() => {
    if (ignoreSaveRef.current) return;

    setTournaments((prevTournaments) => {
      const updated = prevTournaments.map((t) => {
        if (t.id === activeTournamentId) {
          return {
            ...t,
            teams,
            matches,
            type: tournamentType,
            numGroups,
            groupType,
          };
        }
        return t;
      });
      localStorage.setItem("football_tournaments", JSON.stringify(updated));
      return updated;
    });
    localStorage.setItem("football_active_tournament_id", activeTournamentId);
  }, [teams, matches, tournamentType, numGroups, groupType, activeTournamentId]);

  const handleSwitchTournament = (id: string) => {
    const target = tournaments.find((t) => t.id === id);
    if (!target) return;

    ignoreSaveRef.current = true;

    setActiveTournamentId(id);
    setTeams(target.teams || []);
    setMatches(target.matches || []);
    setTournamentType(target.type || TournamentType.ROUND_ROBIN);
    setNumGroups(target.numGroups || 2);
    setGroupType(target.groupType || "multiple");

    showToast(`Đã chuyển sang giải đấu "${target.name}"!`, "success");

    setTimeout(() => {
      ignoreSaveRef.current = false;
    }, 50);
  };

  const handleCreateTournament = (
    name: string,
    type: TournamentType,
    gType: "single" | "multiple",
    numG: number,
    startingTeamsOption: "empty" | "default"
  ) => {
    const newId = `TOURNAMENT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const initialTeamsList = startingTeamsOption === "default" ? INITIAL_TEAMS : [];
    
    const formattedTeams = initialTeamsList.map(t => ({
      ...t,
      group: type === TournamentType.KNOCKOUT ? undefined : t.group
    }));

    const newTourney: Tournament = {
      id: newId,
      name,
      type,
      groupType: gType,
      numGroups: numG,
      teams: formattedTeams,
      matches: [],
      createdAt: new Date().toISOString(),
    };

    ignoreSaveRef.current = true;

    setTournaments((prev) => {
      const updated = [...prev, newTourney];
      localStorage.setItem("football_tournaments", JSON.stringify(updated));
      return updated;
    });

    setActiveTournamentId(newId);
    setTeams(formattedTeams);
    setMatches([]);
    setTournamentType(type);
    setNumGroups(numG);
    setGroupType(gType);
    
    showToast(`Đã tạo thành công giải đấu "${name}"!`, "success");

    setTimeout(() => {
      ignoreSaveRef.current = false;
    }, 50);
  };

  const handleDeleteTournament = (id: string) => {
    if (tournaments.length <= 1) {
      showToast("Không thể xóa giải đấu duy nhất còn lại!", "error");
      return;
    }

    setTournaments((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      localStorage.setItem("football_tournaments", JSON.stringify(filtered));
      
      if (activeTournamentId === id) {
        const nextActive = filtered[0];
        setTimeout(() => {
          handleSwitchTournament(nextActive.id);
        }, 10);
      }
      return filtered;
    });

    showToast("Đã xóa giải đấu thành công!", "success");
  };

  const handleRenameTournament = (id: string, newName: string) => {
    setTournaments((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, name: newName } : t));
      localStorage.setItem("football_tournaments", JSON.stringify(updated));
      return updated;
    });
    showToast("Đã đổi tên giải đấu thành công!", "success");
  };

  const handleImportTournaments = (imported: Tournament[]) => {
    const sanitized = imported.map((t) => {
      const clashing = tournaments.some((existing) => existing.id === t.id);
      const newId = clashing 
        ? `TOURNAMENT-${Math.random().toString(36).substring(2, 8).toUpperCase()}` 
        : t.id;
      return {
        ...t,
        id: newId,
        createdAt: t.createdAt || new Date().toISOString(),
        teams: t.teams || [],
        matches: t.matches || [],
        numGroups: t.numGroups || 2,
        groupType: t.groupType || "multiple",
        type: t.type || TournamentType.ROUND_ROBIN,
      };
    });

    setTournaments((prev) => {
      const updated = [...prev, ...sanitized];
      localStorage.setItem("football_tournaments", JSON.stringify(updated));
      return updated;
    });

    showToast(`Đã nạp thành công ${sanitized.length} giải đấu từ file!`, "success");
    
    if (sanitized.length > 0) {
      setTimeout(() => {
        handleSwitchTournament(sanitized[0].id);
      }, 50);
    }
  };

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
    <div className="min-h-screen bg-[#f4f7fc] flex flex-col font-sans select-none text-slate-800">
      {/* HEADER CỦA TOÀN BỘ ỨNG DỤNG - Modern Premium White-Blue (Trắng Xanh) Theme */}
      <header className="flex flex-col md:flex-row items-center justify-between px-6 py-3.5 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 text-white shadow-lg sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 text-white flex items-center justify-center shadow-inner">
            <Trophy className="w-5.5 h-5.5 text-yellow-300" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-md font-extrabold tracking-tight flex items-center gap-2">
              Quản lý Giải đấu Bóng đá Pro
              <span className="text-[10px] bg-white/20 border border-white/30 text-white px-2 py-0.5 rounded-full font-bold">
                v2.5
              </span>
            </h1>
            <p className="text-[10px] text-blue-100 font-semibold tracking-wide uppercase">
              Sắp lịch thi đấu thông minh &amp; Sắp xếp bảng thứ bậc chuẩn FIFA
            </p>
          </div>
        </div>

        {/* BỘ LỌC CHỌN GIẢI ĐẤU NHANH TRÊN HEADER */}
        <div className="flex items-center gap-2 mt-3 md:mt-0 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-white/20 shadow-xs">
          <span className="text-[9px] font-bold text-blue-100 uppercase tracking-wider font-mono">Giải đấu:</span>
          <select
            value={activeTournamentId}
            onChange={(e) => handleSwitchTournament(e.target.value)}
            className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer max-w-[150px] sm:max-w-[200px] truncate pr-1"
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.id} className="bg-blue-800 text-white font-semibold text-xs">
                {t.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setIsManagerOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold px-3 py-1 rounded-md text-[10px] transition-all cursor-pointer flex items-center gap-1 shadow-md hover:scale-102 active:scale-98"
            title="Quản lý giải đấu (Thêm / Sửa / Xóa / Sao lưu)"
          >
            <Settings className="w-3 h-3 animate-spin-slow" />
            <span>Thêm/Xóa giải</span>
          </button>
          
          <label className="flex items-center gap-1.5 cursor-pointer pl-2.5 border-l border-white/20 select-none">
            <input
              type="checkbox"
              checked={isAutoSaveEnabled}
              onChange={(e) => {
                setIsAutoSaveEnabled(e.target.checked);
                showToast(
                  e.target.checked 
                    ? "Đã bật tự động tải file JSON khi cập nhật!" 
                    : "Đã tắt tự động tải file JSON!", 
                  "info"
                );
              }}
              className="accent-emerald-400 rounded text-emerald-500 h-3.5 w-3.5 focus:ring-0 cursor-pointer"
            />
            <span className="text-[10px] font-bold text-blue-50 hover:text-white transition-colors" title="Mặc định tự lưu và tải file backup JSON khi thay đổi">
              Tự lưu JSON
            </span>
          </label>
        </div>

        {/* THÔNG TIN TRẠNG THÁI GIẢI ĐẤU (High Density Stats Indicator) */}
        <div className="flex gap-4 text-xs mt-3 md:mt-0">
          <div className="flex flex-col items-end">
            <span className="text-blue-200 uppercase font-extrabold text-[9px] tracking-wider">Thể thức giải</span>
            <span className="font-bold text-white text-right">
              {tournamentType === TournamentType.ROUND_ROBIN ? "Vòng tròn tính điểm" : "Đấu loại trực tiếp"}
            </span>
          </div>
          <div className="w-px bg-white/20"></div>
          <div className="flex flex-col items-end">
            <span className="text-blue-200 uppercase font-extrabold text-[9px] tracking-wider">Trạng thái</span>
            <span className={`font-bold text-right ${matches.length > 0 ? (matches.filter(m => m.played).length === matches.length ? "text-amber-300" : "text-emerald-300") : "text-blue-200"}`}>
              {matches.length > 0 ? (matches.filter(m => m.played).length === matches.length ? "Đã kết thúc" : "Đang diễn ra") : "Chưa bắt đầu"}
            </span>
          </div>
        </div>
      </header>

      {/* MODERN TRẮNG-XANH TAB BAR */}
      <nav className="flex bg-white border-b border-blue-100 px-6 sticky top-[57px] z-20 shadow-sm">
        <button
          onClick={() => setActiveTab("teams")}
          className={`px-5 py-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "teams"
              ? "border-blue-600 text-blue-600 font-extrabold bg-blue-50/50"
              : "border-transparent text-slate-500 hover:text-blue-600 hover:bg-blue-50/20"
          }`}
        >
          <Users className="w-4 h-4" />
          Quản lý Đội bóng
        </button>
        <button
          onClick={() => setActiveTab("matches")}
          className={`px-5 py-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "matches"
              ? "border-blue-600 text-blue-600 font-extrabold bg-blue-50/50"
              : "border-transparent text-slate-500 hover:text-blue-600 hover:bg-blue-50/20"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Lịch thi đấu &amp; Kết quả
        </button>
        <button
          onClick={() => setActiveTab("standings")}
          className={`px-5 py-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "standings"
              ? "border-blue-600 text-blue-600 font-extrabold bg-blue-50/50"
              : "border-transparent text-slate-500 hover:text-blue-600 hover:bg-blue-50/20"
          }`}
        >
          <Trophy className="w-4 h-4" />
          Bảng xếp hạng
        </button>
        <button
          onClick={() => setActiveTab("python")}
          className={`px-5 py-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "python"
              ? "border-blue-600 text-blue-600 font-extrabold bg-blue-50/50"
              : "border-transparent text-slate-500 hover:text-blue-600 hover:bg-blue-50/20"
          }`}
        >
          <Terminal className="w-4 h-4" />
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
      <footer className="bg-white border-t border-blue-100 px-6 py-3 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500 font-mono shadow-inner">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1 text-emerald-600 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> 
            Hệ thống sẵn sàng
          </span>
          <span className="text-blue-100">|</span>
          <span>Hệ thống: React + Tailwind CSS (Trắng Xanh Theme)</span>
          <span className="text-blue-100">|</span>
          <span>Bộ nhớ đệm: Trực quan hóa dữ liệu thời gian thực</span>
        </div>
        <div className="mt-1 sm:mt-0 text-slate-400 font-medium">
          Hỗ trợ kỹ thuật: support@footyapp.vn | Trực quan &amp; Chuyên nghiệp
        </div>
      </footer>

      {/* TOURNAMENT MANAGER MODAL */}
      <TournamentManagerModal
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        tournaments={tournaments}
        activeTournamentId={activeTournamentId}
        onSwitchTournament={handleSwitchTournament}
        onCreateTournament={handleCreateTournament}
        onDeleteTournament={handleDeleteTournament}
        onRenameTournament={handleRenameTournament}
        onImportTournaments={handleImportTournaments}
        showToast={showToast}
        isAutoSaveEnabled={isAutoSaveEnabled}
        setIsAutoSaveEnabled={setIsAutoSaveEnabled}
      />

      {/* GLOBAL TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded shadow-lg border text-xs font-bold transition-all animate-fade-in ${
          toast.type === "success" 
            ? "bg-emerald-50 border-emerald-300 text-emerald-800 animate-slide-in" 
            : toast.type === "error" 
            ? "bg-rose-50 border-rose-300 text-rose-800 animate-slide-in" 
            : "bg-blue-50 border-blue-300 text-blue-800 animate-slide-in"
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
