import sys
import os
import json
import uuid
import datetime
from PyQt6.QtWidgets import QApplication, QMainWindow, QTabWidget, QMessageBox, QWidget, QVBoxLayout, QHBoxLayout, QLabel, QComboBox, QPushButton
from PyQt6.QtGui import QIcon
from models import Team, Match, Tournament
from views import TeamTab, MatchTab, StandingsTab, ExportTab, TournamentManagerDialog

def save_tournaments_to_json(filepath, tournaments, active_id, auto_save_enabled):
    data = {
        "active_tournament_id": active_id,
        "is_auto_save_enabled": auto_save_enabled,
        "tournaments": []
    }
    for t in tournaments:
        t_data = {
            "id": t.id,
            "name": t.name,
            "type": t.type,
            "num_groups": t.num_groups,
            "group_type": t.group_type,
            "created_at": t.created_at,
            "teams": [{"id": team.id, "name": team.name, "group": team.group} for team in t.teams],
            "matches": []
        }
        for m in t.matches:
            t_data["matches"].append({
                "id": m.id,
                "round_num": m.round_num,
                "round_name": m.round_name,
                "home_team_id": m.home_team_id,
                "away_team_id": m.away_team_id,
                "home_score": m.home_score,
                "away_score": m.away_score,
                "played": m.played,
                "group": m.group,
                "date_str": m.date_str,
                "time_str": m.time_str,
                "referee": m.referee,
                "home_yellow_cards": m.home_yellow_cards,
                "home_red_cards": m.home_red_cards,
                "away_yellow_cards": m.away_yellow_cards,
                "away_red_cards": m.away_red_cards,
                "is_bye": m.is_bye
            })
        data["tournaments"].append(t_data)
        
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def load_tournaments_from_json(filepath) -> tuple:
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    tournaments = []
    for t_data in data.get("tournaments", []):
        teams = []
        for team_data in t_data.get("teams", []):
            teams.append(Team(
                id=team_data.get("id"),
                name=team_data.get("name"),
                group=team_data.get("group")
            ))
            
        matches = []
        for m_data in t_data.get("matches", []):
            matches.append(Match(
                id=m_data.get("id"),
                round_num=m_data.get("round_num", 1),
                round_name=m_data.get("round_name", ""),
                home_team_id=m_data.get("home_team_id", ""),
                away_team_id=m_data.get("away_team_id", ""),
                home_score=m_data.get("home_score"),
                away_score=m_data.get("away_score"),
                played=m_data.get("played", False),
                group=m_data.get("group"),
                date_str=m_data.get("date_str", ""),
                time_str=m_data.get("time_str", ""),
                referee=m_data.get("referee", ""),
                home_yellow_cards=m_data.get("home_yellow_cards", 0),
                home_red_cards=m_data.get("home_red_cards", 0),
                away_yellow_cards=m_data.get("away_yellow_cards", 0),
                away_red_cards=m_data.get("away_red_cards", 0),
                is_bye=m_data.get("is_bye", False)
            ))
            
        tournaments.append(Tournament(
            id=t_data.get("id"),
            name=t_data.get("name"),
            type=t_data.get("type"),
            num_groups=t_data.get("num_groups", 1),
            group_type=t_data.get("group_type", "single"),
            teams=teams,
            matches=matches,
            created_at=t_data.get("created_at", "")
        ))
        
    return (
        tournaments,
        data.get("active_tournament_id", ""),
        data.get("is_auto_save_enabled", True)
    )

class MainWindow(QMainWindow):
    """Cửa sổ chính của chương trình quản lý giải bóng đá"""
    BACKUP_FILE = "football_tournaments_backup.json"

    def __init__(self):
        super().__init__()
        self.setWindowTitle("Hệ thống Quản lý và Chia cặp đấu giải Bóng đá (PyQt6)")
        self.resize(1100, 750)
        
        # State
        self.tournaments = []
        self.active_tournament_id = ""
        self.is_auto_save_enabled = True
        
        self.init_data()
        self.init_ui()

    def init_data(self):
        """Khởi động ứng dụng: đọc file dự phòng nếu có, hoặc tạo giải đấu mặc định ban đầu"""
        if os.path.exists(self.BACKUP_FILE):
            try:
                tours, active_id, auto_save = load_tournaments_from_json(self.BACKUP_FILE)
                if tours:
                    self.tournaments = tours
                    self.active_tournament_id = active_id if active_id else tours[0].id
                    self.is_auto_save_enabled = auto_save
                    return
            except Exception as e:
                print(f"Lỗi đọc file backup JSON: {str(e)}")
                
        # Nếu chưa có file hoặc đọc lỗi, khởi tạo giải đấu mặc định đầu tiên
        t_id = "TOURNAMENT-DEFAULT"
        sample_names = ["Hà Nội FC", "Hải Phòng FC", "Thép Xanh Nam Định", "Công An Hà Nội", "Becamex Bình Dương", "HAGL FC", "Thanh Hóa FC", "Viettel FC"]
        default_teams = []
        for i, name in enumerate(sample_names):
            group_char = "A" if i < 4 else "B"
            default_teams.append(Team(id=f"T-00{i+1}", name=name, group=group_char))
            
        default_tournament = Tournament(
            id=t_id,
            name="Giải vô địch Quốc gia V-League Pro",
            type="ROUND_ROBIN",
            num_groups=2,
            group_type="multiple",
            teams=default_teams,
            matches=[],
            created_at=datetime.datetime.now().isoformat()
        )
        
        self.tournaments = [default_tournament]
        self.active_tournament_id = t_id
        self.save_state()

    def get_active_tournament(self) -> Tournament:
        active = next((t for t in self.tournaments if t.id == self.active_tournament_id), None)
        if not active:
            if self.tournaments:
                self.active_tournament_id = self.tournaments[0].id
                return self.tournaments[0]
            else:
                self.init_data()
                return self.tournaments[0]
        return active

    @property
    def teams(self):
        return self.get_active_tournament().teams

    @teams.setter
    def teams(self, value):
        self.get_active_tournament().teams = value
        self.save_state()

    @property
    def matches(self):
        return self.get_active_tournament().matches

    @matches.setter
    def matches(self, value):
        self.get_active_tournament().matches = value
        self.save_state()

    def save_state(self):
        if self.is_auto_save_enabled:
            try:
                save_tournaments_to_json(
                    self.BACKUP_FILE,
                    self.tournaments,
                    self.active_tournament_id,
                    self.is_auto_save_enabled
                )
            except Exception as e:
                print(f"Lỗi tự động sao lưu: {str(e)}")

    def init_ui(self):
        # Layout tổng thể
        central_widget = QWidget()
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        
        # --- Thanh Header chọn giải đấu ---
        header_widget = QWidget()
        header_widget.setStyleSheet("background-color: #f1f3f5; border-bottom: 1px solid #dee2e6;")
        header_layout = QHBoxLayout(header_widget)
        header_layout.setContentsMargins(15, 10, 15, 10)
        
        lbl_select = QLabel("<b>Giải đấu đang chọn:</b>")
        lbl_select.setStyleSheet("font-size: 13px;")
        header_layout.addWidget(lbl_select)
        
        self.combo_active_tournament = QComboBox()
        self.combo_active_tournament.setMinimumWidth(300)
        self.combo_active_tournament.setStyleSheet("padding: 4px; font-weight: bold;")
        self.combo_active_tournament.currentIndexChanged.connect(self.on_active_tournament_changed)
        header_layout.addWidget(self.combo_active_tournament)
        
        self.btn_manage_tournaments = QPushButton("⚙️ Quản lý Giải đấu")
        self.btn_manage_tournaments.setStyleSheet(
            "background-color: #495057; color: white; font-weight: bold; padding: 5px 12px; border-radius: 4px;"
        )
        self.btn_manage_tournaments.clicked.connect(self.manage_tournaments)
        header_layout.addWidget(self.btn_manage_tournaments)
        
        header_layout.addStretch()
        
        main_layout.addWidget(header_widget)
        
        # QTabWidget chính
        self.tabs = QTabWidget()
        self.tabs.setStyleSheet("QTabBar::tab { padding: 10px 20px; font-weight: bold; }")
        
        self.team_tab = TeamTab(self)
        self.match_tab = MatchTab(self)
        self.standing_tab = StandingsTab(self)
        self.export_tab = ExportTab(self)
        
        self.tabs.addTab(self.team_tab, "👥 Đội bóng & Chia Bảng")
        self.tabs.addTab(self.match_tab, "📅 Lịch đấu & Kết quả")
        self.tabs.addTab(self.standing_tab, "🏆 Bảng xếp hạng")
        self.tabs.addTab(self.export_tab, "📥 Xuất Excel")
        
        main_layout.addWidget(self.tabs)
        self.setCentralWidget(central_widget)
        
        # Đồng bộ Combo chọn giải đấu
        self.update_tournament_combobox()
        self.refresh_all_tabs()

    def update_tournament_combobox(self):
        self.combo_active_tournament.blockSignals(True)
        self.combo_active_tournament.clear()
        for t in self.tournaments:
            self.combo_active_tournament.addItem(t.name, t.id)
            
        idx = self.combo_active_tournament.findData(self.active_tournament_id)
        if idx >= 0:
            self.combo_active_tournament.setCurrentIndex(idx)
        self.combo_active_tournament.blockSignals(False)

    def on_active_tournament_changed(self, idx):
        if idx < 0:
            return
        t_id = self.combo_active_tournament.itemData(idx)
        self.active_tournament_id = t_id
        self.save_state()
        self.refresh_all_tabs()

    def manage_tournaments(self):
        dialog = TournamentManagerDialog(self, self)
        dialog.exec()

    def refresh_all_tabs(self):
        self.team_tab.refresh_config_views()
        self.team_tab.update_team_table()
        self.match_tab.refresh_matches()
        self.standing_tab.refresh_standings()

def main():
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    
    window = MainWindow()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
