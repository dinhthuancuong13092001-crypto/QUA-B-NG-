import sys
import random
import uuid
import datetime
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QLabel, 
    QTableWidget, QTableWidgetItem, QHeaderView, QComboBox, 
    QSpinBox, QInputDialog, QMessageBox, QDialog, QFormLayout, 
    QLineEdit, QDateTimeEdit, QSplitter, QGroupBox, QListWidget, QCheckBox, QTabWidget
)
from PyQt6.QtCore import Qt, QDateTime
from models import Team, Match, TeamStanding, Tournament
from scheduler import generate_round_robin, generate_knockout, get_team_display_name

class TournamentManagerDialog(QDialog):
    """Cửa sổ quản lý danh sách các giải đấu (Thêm, Xóa, Đổi tên, Sao lưu)"""
    def __init__(self, main_window, parent=None):
        super().__init__(parent)
        self.main_window = main_window
        self.setWindowTitle("Quản lý Danh sách Giải đấu")
        self.resize(750, 480)
        self.init_ui()

    def init_ui(self):
        main_layout = QVBoxLayout()
        
        self.tabs = QTabWidget()
        
        # --- Tab 1: Danh sách giải ---
        tab_list = QWidget()
        list_layout = QHBoxLayout(tab_list)
        
        self.list_widget = QListWidget()
        self.list_widget.currentRowChanged.connect(self.on_selection_changed)
        list_layout.addWidget(self.list_widget, 2)
        
        details_panel = QVBoxLayout()
        self.lbl_details_title = QLabel("<b>Thông tin giải đấu</b>")
        self.lbl_details_title.setStyleSheet("font-size: 14px; color: #1B365D;")
        details_panel.addWidget(self.lbl_details_title)
        
        self.lbl_details_type = QLabel("Thể thức: Vòng tròn")
        details_panel.addWidget(self.lbl_details_type)
        
        self.lbl_details_teams = QLabel("Số đội bóng: 8 đội")
        details_panel.addWidget(self.lbl_details_teams)
        
        self.lbl_details_matches = QLabel("Số trận đấu: 0 trận")
        details_panel.addWidget(self.lbl_details_matches)
        
        self.lbl_details_created = QLabel("Ngày tạo: -")
        details_panel.addWidget(self.lbl_details_created)
        
        details_panel.addStretch()
        
        # Buttons
        self.btn_select = QPushButton("Chọn làm giải hiện tại 🎯")
        self.btn_select.setStyleSheet("font-weight: bold; background-color: #1B365D; color: white; padding: 6px;")
        self.btn_select.clicked.connect(self.select_tournament)
        details_panel.addWidget(self.btn_select)
        
        self.btn_rename = QPushButton("Đổi tên giải đấu ✏️")
        self.btn_rename.clicked.connect(self.rename_tournament)
        details_panel.addWidget(self.btn_rename)
        
        self.btn_delete = QPushButton("Xóa giải đấu ❌")
        self.btn_delete.setStyleSheet("color: red;")
        self.btn_delete.clicked.connect(self.delete_tournament)
        details_panel.addWidget(self.btn_delete)
        
        list_layout.addLayout(details_panel, 3)
        self.tabs.addTab(tab_list, "Danh sách Giải đấu")
        
        # --- Tab 2: Tạo giải mới ---
        tab_new = QWidget()
        new_layout = QFormLayout(tab_new)
        
        self.txt_new_name = QLineEdit()
        self.txt_new_name.setPlaceholderText("Nhập tên giải đấu mới...")
        new_layout.addRow("Tên giải đấu:", self.txt_new_name)
        
        self.combo_new_type = QComboBox()
        self.combo_new_type.addItems(["Đấu vòng tròn (Round-robin)", "Đấu loại trực tiếp (Knock-out)"])
        self.combo_new_type.currentIndexChanged.connect(self.on_new_type_changed)
        new_layout.addRow("Thể thức thi đấu:", self.combo_new_type)
        
        self.combo_new_group_type = QComboBox()
        self.combo_new_group_type.addItems(["1 Bảng duy nhất", "N Bảng đấu"])
        self.combo_new_group_type.currentIndexChanged.connect(self.on_new_group_type_changed)
        new_layout.addRow("Phân chia bảng:", self.combo_new_group_type)
        
        self.spin_new_groups = QSpinBox()
        self.spin_new_groups.setRange(2, 8)
        self.spin_new_groups.setValue(2)
        self.spin_new_groups.setEnabled(False)
        new_layout.addRow("Số lượng bảng:", self.spin_new_groups)
        
        self.chk_with_samples = QCheckBox("Khởi tạo sẵn 8 đội bóng mẫu")
        self.chk_with_samples.setChecked(True)
        new_layout.addRow("", self.chk_with_samples)
        
        btn_create = QPushButton("Tạo giải đấu ⚽")
        btn_create.setStyleSheet("font-weight: bold; background-color: #198754; color: white; padding: 6px;")
        btn_create.clicked.connect(self.create_tournament)
        new_layout.addRow("", btn_create)
        
        self.tabs.addTab(tab_new, "Tạo Giải đấu Mới")
        
        # --- Tab 3: Sao lưu / Khôi phục ---
        tab_backup = QWidget()
        backup_layout = QVBoxLayout(tab_backup)
        
        self.chk_auto_save = QCheckBox("Tự động sao lưu dữ liệu ra file 'football_tournaments_backup.json' khi thay đổi")
        self.chk_auto_save.setChecked(self.main_window.is_auto_save_enabled)
        self.chk_auto_save.toggled.connect(self.on_auto_save_toggled)
        backup_layout.addWidget(self.chk_auto_save)
        
        lbl_desc = QLabel(
            "Bạn có thể xuất toàn bộ danh sách các giải đấu hiện tại ra một file JSON\n"
            "để lưu trữ dự phòng, hoặc nhập một file sao lưu JSON đã lưu từ trước."
        )
        lbl_desc.setStyleSheet("color: #6c757d; line-height: 1.4; margin-top: 10px; margin-bottom: 10px;")
        backup_layout.addWidget(lbl_desc)
        
        btn_export_json = QPushButton("Xuất toàn bộ Giải đấu ra file JSON 📤")
        btn_export_json.clicked.connect(self.export_json)
        backup_layout.addWidget(btn_export_json)
        
        btn_import_json = QPushButton("Khôi phục Giải đấu từ file JSON 📥")
        btn_import_json.clicked.connect(self.import_json)
        backup_layout.addWidget(btn_import_json)
        
        backup_layout.addStretch()
        self.tabs.addTab(tab_backup, "Sao lưu & Khôi phục")
        
        main_layout.addWidget(self.tabs)
        self.setLayout(main_layout)
        
        self.refresh_list()

    def refresh_list(self):
        self.list_widget.clear()
        for t in self.main_window.tournaments:
            active_suffix = " (Đang chọn)" if t.id == self.main_window.active_tournament_id else ""
            self.list_widget.addItem(f"{t.name}{active_suffix}")
            
        # Select active tournament row
        for idx, t in enumerate(self.main_window.tournaments):
            if t.id == self.main_window.active_tournament_id:
                self.list_widget.setCurrentRow(idx)
                break

    def on_selection_changed(self, idx):
        if idx < 0 or idx >= len(self.main_window.tournaments):
            return
        t = self.main_window.tournaments[idx]
        self.lbl_details_title.setText(f"<b>{t.name}</b>")
        type_str = "Đấu vòng tròn (Round-robin)" if t.type == "ROUND_ROBIN" else "Đấu loại trực tiếp (Knock-out)"
        self.lbl_details_type.setText(f"Thể thức: {type_str}")
        self.lbl_details_teams.setText(f"Số đội bóng: {len([team for team in t.teams if team.id != 'BYE'])} đội")
        self.lbl_details_matches.setText(f"Số trận đấu: {len(t.matches)} trận")
        self.lbl_details_created.setText(f"Ngày tạo: {t.created_at[:10] if t.created_at else '-'}")

    def on_new_type_changed(self, idx):
        is_rr = idx == 0
        self.combo_new_group_type.setEnabled(is_rr)
        if not is_rr:
            self.combo_new_group_type.setCurrentIndex(0)
            self.spin_new_groups.setEnabled(False)

    def on_new_group_type_changed(self, idx):
        self.spin_new_groups.setEnabled(idx == 1)

    def select_tournament(self):
        idx = self.list_widget.currentRow()
        if idx < 0:
            return
        t = self.main_window.tournaments[idx]
        self.main_window.active_tournament_id = t.id
        self.main_window.update_tournament_combobox()
        self.main_window.refresh_all_tabs()
        self.refresh_list()
        QMessageBox.information(self, "Thông báo", f"Đã chuyển sang giải đấu: {t.name}")

    def rename_tournament(self):
        idx = self.list_widget.currentRow()
        if idx < 0:
            return
        t = self.main_window.tournaments[idx]
        new_name, ok = QInputDialog.getText(self, "Đổi tên giải đấu", "Nhập tên mới:", text=t.name)
        if ok and new_name.strip():
            t.name = new_name.strip()
            self.main_window.update_tournament_combobox()
            self.main_window.save_state()
            self.refresh_list()

    def delete_tournament(self):
        if len(self.main_window.tournaments) <= 1:
            QMessageBox.warning(self, "Lỗi", "Không thể xóa giải đấu duy nhất còn lại!")
            return
            
        idx = self.list_widget.currentRow()
        if idx < 0:
            return
        t = self.main_window.tournaments[idx]
        
        reply = QMessageBox.question(
            self, "Xác nhận", f"Bạn có chắc chắn muốn xóa giải đấu '{t.name}'?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        if reply == QMessageBox.StandardButton.Yes:
            self.main_window.tournaments = [tour for tour in self.main_window.tournaments if tour.id != t.id]
            if self.main_window.active_tournament_id == t.id:
                self.main_window.active_tournament_id = self.main_window.tournaments[0].id
                
            self.main_window.update_tournament_combobox()
            self.main_window.save_state()
            self.main_window.refresh_all_tabs()
            self.refresh_list()

    def create_tournament(self):
        name = self.txt_new_name.text().strip()
        if not name:
            QMessageBox.warning(self, "Lỗi", "Vui lòng nhập tên giải đấu!")
            return
            
        t_id = f"TOURNAMENT-{uuid.uuid4().hex[:6].upper()}"
        is_rr = self.combo_new_type.currentIndex() == 0
        
        t_type = "ROUND_ROBIN" if is_rr else "KNOCK_OUT"
        g_type = "multiple" if (is_rr and self.combo_new_group_type.currentIndex() == 1) else "single"
        num_g = self.spin_new_groups.value() if (is_rr and g_type == "multiple") else 1
        
        teams = []
        if self.chk_with_samples.isChecked():
            sample_names = ["Hà Nội FC", "Hải Phòng FC", "Thép Xanh Nam Định", "Công An Hà Nội", "Becamex Bình Dương", "HAGL FC", "Thanh Hóa FC", "Viettel FC"]
            for i, team_name in enumerate(sample_names):
                group_char = "A" if (g_type == "multiple" and i < 4) else ("B" if (g_type == "multiple") else "A")
                teams.append(Team(id=f"T-00{i+1}", name=team_name, group=group_char))
                
        new_tour = Tournament(
            id=t_id,
            name=name,
            type=t_type,
            num_groups=num_g,
            group_type=g_type,
            teams=teams,
            matches=[],
            created_at=datetime.datetime.now().isoformat()
        )
        
        self.main_window.tournaments.append(new_tour)
        self.main_window.active_tournament_id = t_id
        
        self.main_window.update_tournament_combobox()
        self.main_window.save_state()
        self.main_window.refresh_all_tabs()
        
        self.refresh_list()
        self.txt_new_name.clear()
        self.tabs.setCurrentIndex(0)
        QMessageBox.information(self, "Thành công", f"Đã tạo thành công giải đấu mới: {name}")

    def on_auto_save_toggled(self, checked):
        self.main_window.is_auto_save_enabled = checked
        self.main_window.save_state()

    def export_json(self):
        from main import save_tournaments_to_json
        from PyQt6.QtWidgets import QFileDialog
        file_path, _ = QFileDialog.getSaveFileName(
            self, "Xuất file sao lưu cấu hình giải đấu", "backup_giai_dau.json", "JSON Files (*.json)"
        )
        if file_path:
            try:
                save_tournaments_to_json(
                    file_path, 
                    self.main_window.tournaments, 
                    self.main_window.active_tournament_id, 
                    self.main_window.is_auto_save_enabled
                )
                QMessageBox.information(self, "Thành công", f"Đã xuất file sao lưu thành công tại:\n{file_path}")
            except Exception as e:
                QMessageBox.critical(self, "Lỗi", f"Có lỗi xảy ra khi xuất file: {str(e)}")

    def import_json(self):
        from main import load_tournaments_from_json
        from PyQt6.QtWidgets import QFileDialog
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Mở file sao lưu cấu hình giải đấu", "", "JSON Files (*.json)"
        )
        if file_path:
            try:
                tours, active_id, auto_save = load_tournaments_from_json(file_path)
                if not tours:
                    raise Exception("File JSON không chứa dữ liệu giải đấu hợp lệ.")
                    
                self.main_window.tournaments = tours
                self.main_window.active_tournament_id = active_id if active_id else tours[0].id
                self.main_window.is_auto_save_enabled = auto_save
                
                self.main_window.update_tournament_combobox()
                self.main_window.save_state()
                self.main_window.refresh_all_tabs()
                
                self.refresh_list()
                self.chk_auto_save.setChecked(auto_save)
                QMessageBox.information(self, "Thành công", f"Đã nhập {len(tours)} giải đấu từ file sao lưu thành công!")
            except Exception as e:
                QMessageBox.critical(self, "Lỗi", f"Có lỗi xảy ra khi đọc file sao lưu:\n{str(e)}")


class TeamTab(QWidget):
    """Tab 1: Quản lý Đội bóng và cấu hình chia bảng"""
    def __init__(self, main_window):
        super().__init__()
        self.main_window = main_window
        self.init_ui()

    def init_ui(self):
        layout = QHBoxLayout()
        
        # --- Panel Trái: Cấu hình và Chức năng ---
        left_panel = QVBoxLayout()
        
        group_config = QGroupBox("Cấu hình Giải đấu")
        config_layout = QFormLayout()
        
        self.combo_type = QComboBox()
        self.combo_type.addItems(["Đấu vòng tròn (Round-robin)", "Đấu loại trực tiếp (Knock-out)"])
        self.combo_type.currentIndexChanged.connect(self.on_type_changed)
        config_layout.addRow("Thể thức thi đấu:", self.combo_type)
        
        self.combo_group_type = QComboBox()
        self.combo_group_type.addItems(["1 Bảng duy nhất", "N Bảng đấu"])
        self.combo_group_type.currentIndexChanged.connect(self.on_group_type_changed)
        config_layout.addRow("Phân chia bảng:", self.combo_group_type)
        
        self.spin_groups = QSpinBox()
        self.spin_groups.setRange(2, 8)
        self.spin_groups.setValue(2)
        self.spin_groups.setEnabled(False)
        self.spin_groups.valueChanged.connect(self.on_spin_groups_changed)
        config_layout.addRow("Số lượng bảng:", self.spin_groups)
        
        group_config.setLayout(config_layout)
        left_panel.addWidget(group_config)
        
        # Quản lý Đội bóng
        team_group = QGroupBox("Quản lý Đội bóng")
        team_layout = QVBoxLayout()
        
        self.btn_add_team = QPushButton("Thêm Đội bóng")
        self.btn_add_team.clicked.connect(self.add_team)
        team_layout.addWidget(self.btn_add_team)
        
        self.btn_edit_team = QPushButton("Sửa tên Đội")
        self.btn_edit_team.clicked.connect(self.edit_team)
        team_layout.addWidget(self.btn_edit_team)
        
        self.btn_delete_team = QPushButton("Xóa Đội bóng")
        self.btn_delete_team.clicked.connect(self.delete_team)
        team_layout.addWidget(self.btn_delete_team)
        
        self.btn_shuffle_groups = QPushButton("Chia Bảng Ngẫu Nhiên")
        self.btn_shuffle_groups.clicked.connect(self.shuffle_groups)
        team_layout.addWidget(self.btn_shuffle_groups)
        
        self.btn_generate_schedule = QPushButton("Khởi Tạo Lịch Thi Đấu ⚽")
        self.btn_generate_schedule.setStyleSheet("font-weight: bold; background-color: #1B365D; color: white;")
        self.btn_generate_schedule.clicked.connect(self.generate_schedule)
        team_layout.addWidget(self.btn_generate_schedule)
        
        team_group.setLayout(team_layout)
        left_panel.addWidget(team_group)
        left_panel.addStretch()
        
        # --- Panel Phải: Bảng Danh Sách Đội bóng ---
        right_panel = QVBoxLayout()
        self.lbl_count = QLabel("Danh sách Đội bóng (0 đội)")
        self.lbl_count.setStyleSheet("font-weight: bold; font-size: 13px;")
        right_panel.addWidget(self.lbl_count)
        
        self.table_teams = QTableWidget()
        self.table_teams.setColumnCount(3)
        self.table_teams.setHorizontalHeaderLabels(["ID Đội", "Tên Đội bóng", "Bảng đấu"])
        self.table_teams.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.table_teams.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        right_panel.addWidget(self.table_teams)
        
        layout.addLayout(left_panel, 1)
        layout.addLayout(right_panel, 2)
        self.setLayout(layout)

    def refresh_config_views(self):
        self.combo_type.blockSignals(True)
        self.combo_group_type.blockSignals(True)
        self.spin_groups.blockSignals(True)
        
        t = self.main_window.get_active_tournament()
        is_rr = t.type == "ROUND_ROBIN"
        self.combo_type.setCurrentIndex(0 if is_rr else 1)
        
        is_multiple = t.group_type == "multiple"
        self.combo_group_type.setCurrentIndex(1 if is_multiple else 0)
        self.combo_group_type.setEnabled(is_rr)
        
        self.spin_groups.setValue(t.num_groups)
        self.spin_groups.setEnabled(is_rr and is_multiple)
        
        self.combo_type.blockSignals(False)
        self.combo_group_type.blockSignals(False)
        self.spin_groups.blockSignals(False)

    def on_type_changed(self, idx):
        is_rr = idx == 0
        self.combo_group_type.setEnabled(is_rr)
        if not is_rr:
            self.combo_group_type.setCurrentIndex(0)
            self.spin_groups.setEnabled(False)
        
        t = self.main_window.get_active_tournament()
        t.type = "ROUND_ROBIN" if is_rr else "KNOCK_OUT"
        if not is_rr:
            t.group_type = "single"
        self.main_window.save_state()

    def on_group_type_changed(self, idx):
        is_multiple = idx == 1
        self.spin_groups.setEnabled(is_multiple)
        
        t = self.main_window.get_active_tournament()
        t.group_type = "multiple" if is_multiple else "single"
        self.main_window.save_state()

    def on_spin_groups_changed(self, val):
        t = self.main_window.get_active_tournament()
        t.num_groups = val
        self.main_window.save_state()

    def update_team_table(self):
        teams = self.main_window.teams
        self.table_teams.setRowCount(len(teams))
        for r_idx, team in enumerate(teams):
            self.table_teams.setItem(r_idx, 0, QTableWidgetItem(team.id))
            self.table_teams.setItem(r_idx, 1, QTableWidgetItem(team.name))
            self.table_teams.setItem(r_idx, 2, QTableWidgetItem(team.group or "Chưa phân"))
        self.lbl_count.setText(f"Danh sách Đội bóng ({len(teams)} đội)")

    def add_team(self):
        name, ok = QInputDialog.getText(self, "Thêm Đội", "Nhập tên đội bóng:")
        if ok and name.strip():
            if any(t.name.lower() == name.strip().lower() for t in self.main_window.teams):
                QMessageBox.warning(self, "Lỗi", "Tên đội bóng đã tồn tại!")
                return
            new_id = f"T-{uuid.uuid4().hex[:4].upper()}"
            team = Team(id=new_id, name=name.strip())
            self.main_window.teams.append(team)
            self.main_window.save_state()
            self.update_team_table()

    def edit_team(self):
        selected = self.table_teams.currentRow()
        if selected < 0:
            QMessageBox.information(self, "Gợi ý", "Vui lòng chọn đội bóng để sửa!")
            return
        team_id = self.table_teams.item(selected, 0).text()
        team = next(t for t in self.main_window.teams if t.id == team_id)
        
        name, ok = QInputDialog.getText(self, "Sửa Đội", f"Nhập tên mới cho đội '{team.name}':", text=team.name)
        if ok and name.strip():
            team.name = name.strip()
            self.main_window.save_state()
            self.update_team_table()
            self.main_window.standing_tab.refresh_standings()

    def delete_team(self):
        selected = self.table_teams.currentRow()
        if selected < 0:
            QMessageBox.information(self, "Gợi ý", "Vui lòng chọn đội bóng để xóa!")
            return
        team_id = self.table_teams.item(selected, 0).text()
        
        reply = QMessageBox.question(
            self, "Xác nhận", "Bạn có chắc chắn muốn xóa đội bóng này và xóa lịch thi đấu liên quan?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        if reply == QMessageBox.StandardButton.Yes:
            self.main_window.teams = [t for t in self.main_window.teams if t.id != team_id]
            self.main_window.matches = []  # Reset matches khi xóa đội
            self.main_window.save_state()
            self.update_team_table()
            self.main_window.match_tab.refresh_matches()
            self.main_window.standing_tab.refresh_standings()

    def shuffle_groups(self):
        teams = self.main_window.teams
        if not teams:
            QMessageBox.warning(self, "Lỗi", "Chưa có đội bóng nào để chia bảng!")
            return
            
        is_rr = self.combo_type.currentIndex() == 0
        if not is_rr or self.combo_group_type.currentIndex() == 0:
            for t in teams:
                t.group = "A"
            QMessageBox.information(self, "Thông báo", "Đã gom toàn bộ các đội vào Bảng A!")
        else:
            num_groups = self.spin_groups.value()
            shuffled_teams = list(teams)
            random.shuffle(shuffled_teams)
            
            for i, t in enumerate(shuffled_teams):
                group_char = chr(65 + (i % num_groups))
                t.group = group_char
                
            QMessageBox.information(self, "Thành công", f"Đã chia ngẫu nhiên {len(teams)} đội vào {num_groups} Bảng!")
            
        self.main_window.save_state()
        self.update_team_table()

    def generate_schedule(self):
        teams = self.main_window.teams
        if len(teams) < 2:
            QMessageBox.warning(self, "Lỗi", "Cần có ít nhất 2 đội bóng để xếp lịch thi đấu!")
            return
            
        is_rr = self.combo_type.currentIndex() == 0
        all_matches = []
        
        if is_rr:
            groups_dict = {}
            for t in teams:
                grp = t.group or "A"
                if grp not in groups_dict:
                    groups_dict[grp] = []
                groups_dict[grp].append(t)
                
            for grp, grp_teams in groups_dict.items():
                grp_matches = generate_round_robin(grp_teams, grp)
                all_matches.extend(grp_matches)
                
            msg = f"Đã khởi tạo {len(all_matches)} trận đấu vòng tròn cho các bảng!"
        else:
            all_matches = generate_knockout(teams)
            msg = f"Đã bốc thăm {len(all_matches)} trận đấu theo sơ đồ nhánh đấu knockout!"
            
        self.main_window.matches = all_matches
        self.main_window.save_state()
        self.main_window.match_tab.refresh_matches()
        self.main_window.standing_tab.refresh_standings()
        QMessageBox.information(self, "Thành công", msg)


class MatchEditDialog(QDialog):
    """Cửa sổ Pop-up (QDialog) để quản lý chi tiết kết quả trận đấu"""
    def __init__(self, match, parent=None):
        super().__init__(parent)
        self.match = match
        self.setWindowTitle("Cập nhật kết quả trận đấu")
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()
        form = QFormLayout()

        self.lbl_teams = QLabel(f"Trận đấu: {self.match.home_team_id} VS {self.match.away_team_id}")
        self.lbl_teams.setStyleSheet("font-weight: bold; font-size: 13px; color: #1B365D;")
        layout.addWidget(self.lbl_teams)

        # Tỷ số
        self.spin_home = QSpinBox()
        self.spin_home.setRange(0, 99)
        self.spin_home.setValue(self.match.home_score if self.match.home_score is not None else 0)
        form.addRow("Bàn thắng Đội Nhà:", self.spin_home)

        self.spin_away = QSpinBox()
        self.spin_away.setRange(0, 99)
        self.spin_away.setValue(self.match.away_score if self.match.away_score is not None else 0)
        form.addRow("Bàn thắng Đội Khách:", self.spin_away)

        # Thẻ phạt
        self.spin_home_yellow = QSpinBox()
        self.spin_home_yellow.setRange(0, 20)
        self.spin_home_yellow.setValue(self.match.home_yellow_cards)
        form.addRow("Thẻ vàng Đội Nhà:", self.spin_home_yellow)

        self.spin_home_red = QSpinBox()
        self.spin_home_red.setRange(0, 5)
        self.spin_home_red.setValue(self.match.home_red_cards)
        form.addRow("Thẻ đỏ Đội Nhà:", self.spin_home_red)

        self.spin_away_yellow = QSpinBox()
        self.spin_away_yellow.setRange(0, 20)
        self.spin_away_yellow.setValue(self.match.away_yellow_cards)
        form.addRow("Thẻ vàng Đội Khách:", self.spin_away_yellow)

        self.spin_away_red = QSpinBox()
        self.spin_away_red.setRange(0, 5)
        self.spin_away_red.setValue(self.match.away_red_cards)
        form.addRow("Thẻ đỏ Đội Khách:", self.spin_away_red)

        # Thông tin phụ
        self.txt_referee = QLineEdit(self.match.referee)
        form.addRow("Trọng tài chính:", self.txt_referee)

        self.edit_date = QLineEdit(self.match.date_str or datetime.date.today().strftime("%Y-%m-%d"))
        form.addRow("Ngày thi đấu (YYYY-MM-DD):", self.edit_date)

        self.edit_time = QLineEdit(self.match.time_str or "18:00")
        form.addRow("Giờ thi đấu (HH:MM):", self.edit_time)

        layout.addLayout(form)

        btns = QHBoxLayout()
        btn_save = QPushButton("Lưu kết quả")
        btn_save.clicked.connect(self.save)
        btn_save.setStyleSheet("background-color: green; color: white; font-weight: bold;")
        
        btn_cancel = QPushButton("Hủy")
        btn_cancel.clicked.connect(self.reject)
        
        btns.addWidget(btn_save)
        btns.addWidget(btn_cancel)
        layout.addLayout(btns)

        self.setLayout(layout)

    def save(self):
        self.match.home_score = self.spin_home.value()
        self.match.away_score = self.spin_away.value()
        self.match.home_yellow_cards = self.spin_home_yellow.value()
        self.match.home_red_cards = self.spin_home_red.value()
        self.match.away_yellow_cards = self.spin_away_yellow.value()
        self.match.away_red_cards = self.spin_away_red.value()
        self.match.referee = self.txt_referee.text().strip()
        self.match.date_str = self.edit_date.text().strip()
        self.match.time_str = self.edit_time.text().strip()
        self.match.played = True
        self.accept()


class MatchTab(QWidget):
    """Tab 2: Lịch thi đấu & Cập nhật kết quả (Hỗ trợ hiển thị song song danh sách và sơ đồ cây nhánh đấu)"""
    def __init__(self, main_window):
        super().__init__()
        self.main_window = main_window
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()
        
        filter_layout = QHBoxLayout()
        filter_layout.addWidget(QLabel("Bộ lọc Vòng đấu:"))
        
        self.combo_round_filter = QComboBox()
        self.combo_round_filter.addItem("Tất cả các vòng")
        self.combo_round_filter.currentIndexChanged.connect(self.refresh_matches)
        filter_layout.addWidget(self.combo_round_filter)
        filter_layout.addStretch()
        
        self.btn_update_match = QPushButton("✏ Nhập kết quả Trận đấu")
        self.btn_update_match.setStyleSheet("background-color: #0d6efd; color: white; font-weight: bold;")
        self.btn_update_match.clicked.connect(self.update_match_result)
        filter_layout.addWidget(self.btn_update_match)
        
        layout.addLayout(filter_layout)

        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        list_widget = QWidget()
        list_layout = QVBoxLayout(list_widget)
        list_layout.addWidget(QLabel("<b>Danh Sách Các Cặp Đấu</b>"))
        
        self.table_matches = QTableWidget()
        self.table_matches.setColumnCount(10)
        self.table_matches.setHorizontalHeaderLabels([
            "ID Trận", "Vòng", "Bảng", "Đội nhà", "Tỷ số", "Đội khách", "Trọng tài", "Thời gian", "Thẻ Nhà", "Thẻ Khách"
        ])
        self.table_matches.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.table_matches.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        list_layout.addWidget(self.table_matches)
        
        bracket_widget = QWidget()
        bracket_layout = QVBoxLayout(bracket_widget)
        bracket_layout.addWidget(QLabel("<b>Nhánh Đấu / Bracket (Dành cho Knock-out)</b>"))
        
        self.bracket_list = QListWidget()
        self.bracket_list.setStyleSheet("font-family: Consolas, Courier; background-color: #f8f9fa;")
        bracket_layout.addWidget(self.bracket_list)
        
        splitter.addWidget(list_widget)
        splitter.addWidget(bracket_widget)
        splitter.setSizes([500, 300])
        
        layout.addWidget(splitter)
        self.setLayout(layout)

    def refresh_matches(self):
        matches = self.main_window.matches
        teams = self.main_window.teams
        
        current_idx = self.combo_round_filter.currentIndex()
        self.combo_round_filter.blockSignals(True)
        self.combo_round_filter.clear()
        self.combo_round_filter.addItem("Tất cả các vòng")
        
        max_round = max([m.round_num for m in matches]) if matches else 0
        for r in range(1, max_round + 1):
            self.combo_round_filter.addItem(f"Vòng {r}")
        
        if current_idx < self.combo_round_filter.count() and current_idx > 0:
            self.combo_round_filter.setCurrentIndex(current_idx)
        self.combo_round_filter.blockSignals(False)

        selected_round = self.combo_round_filter.currentIndex()
        filtered_matches = matches
        if selected_round > 0:
            filtered_matches = [m for m in matches if m.round_num == selected_round]

        self.table_matches.setRowCount(len(filtered_matches))
        for r_idx, m in enumerate(filtered_matches):
            home_name = get_team_display_name(m.home_team_id, teams, matches)
            away_name = get_team_display_name(m.away_team_id, teams, matches)
            
            score_str = f"{m.home_score} - {m.away_score}" if m.played and not m.is_bye else ("REST" if m.is_bye else "vs")
            time_str = "Nghỉ vòng này" if m.is_bye else f"{m.date_str} {m.time_str}".strip() or "Chưa xếp"
            
            self.table_matches.setItem(r_idx, 0, QTableWidgetItem(m.id))
            self.table_matches.setItem(r_idx, 1, QTableWidgetItem(m.round_name))
            self.table_matches.setItem(r_idx, 2, QTableWidgetItem(m.group or "Knock-out"))
            self.table_matches.setItem(r_idx, 3, QTableWidgetItem(home_name))
            self.table_matches.setItem(r_idx, 4, QTableWidgetItem(score_str))
            self.table_matches.setItem(r_idx, 5, QTableWidgetItem(away_name))
            self.table_matches.setItem(r_idx, 6, QTableWidgetItem(m.referee or "Chưa có"))
            self.table_matches.setItem(r_idx, 7, QTableWidgetItem(time_str))
            
            card_home = f"V:{m.home_yellow_cards}/Đ:{m.home_red_cards}" if m.played and not m.is_bye else "-"
            card_away = f"V:{m.away_yellow_cards}/Đ:{m.away_red_cards}" if m.played and not m.is_bye else "-"
            self.table_matches.setItem(r_idx, 8, QTableWidgetItem(card_home))
            self.table_matches.setItem(r_idx, 9, QTableWidgetItem(card_away))

        self.update_bracket_view()

    def update_bracket_view(self):
        self.bracket_list.clear()
        matches = self.main_window.matches
        teams = self.main_window.teams
        
        ko_matches = [m for m in matches if m.id.startswith("KO-")]
        if not ko_matches:
            self.bracket_list.addItem("Sơ đồ cây chỉ hiển thị với Thể thức Knock-out.")
            return

        rounds_dict = {}
        for m in ko_matches:
            if m.round_num not in rounds_dict:
                rounds_dict[m.round_num] = []
            rounds_dict[m.round_num].append(m)

        for round_num in sorted(rounds_dict.keys()):
            r_matches = rounds_dict[round_num]
            r_name = r_matches[0].round_name
            self.bracket_list.addItem(f"=== {r_name.upper()} ===")
            
            for m in r_matches:
                home_name = get_team_display_name(m.home_team_id, teams, matches)
                away_name = get_team_display_name(m.away_team_id, teams, matches)
                score_str = f"[{m.home_score} - {m.away_score}]" if m.played and not m.is_bye else "vs"
                
                self.bracket_list.addItem(f"  Trận {m.id.split('-M')[-1]}: {home_name} {score_str} {away_name}")
            self.bracket_list.addItem("")

    def update_match_result(self):
        selected = self.table_matches.currentRow()
        if selected < 0:
            QMessageBox.information(self, "Thông báo", "Vui lòng chọn trận đấu trong danh sách để cập nhật kết quả!")
            return
            
        match_id = self.table_matches.item(selected, 0).text()
        match = next(m for m in self.main_window.matches if m.id == match_id)
        
        if match.is_bye:
            QMessageBox.information(self, "Thông báo", "Trận đấu nghỉ (BYE) không thể sửa kết quả tỷ số!")
            return
            
        home_display = get_team_display_name(match.home_team_id, self.main_window.teams, self.main_window.matches)
        away_display = get_team_display_name(match.away_team_id, self.main_window.teams, self.main_window.matches)
        
        display_match = Match(
            id=match.id,
            round_num=match.round_num,
            round_name=match.round_name,
            home_team_id=home_display,
            away_team_id=away_display,
            home_score=match.home_score,
            away_score=match.away_score,
            home_yellow_cards=match.home_yellow_cards,
            home_red_cards=match.home_red_cards,
            away_yellow_cards=match.away_yellow_cards,
            away_red_cards=match.away_red_cards,
            referee=match.referee,
            date_str=match.date_str,
            time_str=match.time_str,
            played=match.played
        )

        dialog = MatchEditDialog(display_match, self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            match.home_score = display_match.home_score
            match.away_score = display_match.away_score
            match.home_yellow_cards = display_match.home_yellow_cards
            match.home_red_cards = display_match.home_red_cards
            match.away_yellow_cards = display_match.away_yellow_cards
            match.away_red_cards = display_match.away_red_cards
            match.referee = display_match.referee
            match.date_str = display_match.date_str
            match.time_str = display_match.time_str
            match.played = True
            
            self.cascade_knockout_progression()
            self.main_window.save_state()
            
            self.refresh_matches()
            self.main_window.standing_tab.refresh_standings()

    def cascade_knockout_progression(self):
        """Hàm tự động đẩy đội thắng vòng Knockout lên trận đấu giữ chỗ tương ứng ở vòng sau"""
        matches = self.main_window.matches
        for m in matches:
            if not m.id.startswith("KO-"):
                continue
            
            # Nếu trận này chưa đá nhưng phụ thuộc vào đội thắng của trận trước
            if not m.played:
                if m.home_team_id.startswith("WIN:"):
                    source_match_id = m.home_team_id[4:]
                    source_match = next((x for x in matches if x.id == source_match_id), None)
                    if source_match and source_match.played:
                        # Tìm người thắng
                        hs = source_match.home_score if source_match.home_score is not None else 0
                        as_ = source_match.away_score if source_match.away_score is not None else 0
                        winner_id = source_match.home_team_id if hs >= as_ else source_match.away_team_id
                        m.home_team_id = winner_id
                        
                if m.away_team_id.startswith("WIN:"):
                    source_match_id = m.away_team_id[4:]
                    source_match = next((x for x in matches if x.id == source_match_id), None)
                    if source_match and source_match.played:
                        hs = source_match.home_score if source_match.home_score is not None else 0
                        as_ = source_match.away_score if source_match.away_score is not None else 0
                        winner_id = source_match.home_team_id if hs >= as_ else source_match.away_team_id
                        m.away_team_id = winner_id


class StandingsTab(QWidget):
    """Tab 3: Bảng xếp hạng và tiêu chí xếp hạng chuẩn FIFA"""
    def __init__(self, main_window):
        super().__init__()
        self.main_window = main_window
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()
        
        filter_layout = QHBoxLayout()
        filter_layout.addWidget(QLabel("<b>Bộ lọc Bảng xếp hạng:</b>"))
        
        self.combo_group_filter = QComboBox()
        self.combo_group_filter.addItem("Bảng xếp hạng tổng hợp (Toàn giải)")
        self.combo_group_filter.currentIndexChanged.connect(self.refresh_standings)
        filter_layout.addWidget(self.combo_group_filter)
        filter_layout.addStretch()
        
        layout.addLayout(filter_layout)

        self.table_standings = QTableWidget()
        self.table_standings.setColumnCount(12)
        self.table_standings.setHorizontalHeaderLabels([
            "Hạng", "Đội bóng", "Trận", "Thắng", "Hòa", "Thua", "Bàn thắng (BT)", "Bàn thua (BP)", "Hiệu số (HS)", "Thẻ V/Đ", "Điểm kỷ luật", "Điểm số"
        ])
        self.table_standings.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        layout.addWidget(self.table_standings)
        
        self.setLayout(layout)

    def calculate_standings_list(self, teams, matches, filter_group=None) -> list:
        filtered_teams = [t for t in teams if t.id != "BYE"]
        if filter_group:
            filtered_teams = [t for t in filtered_teams if t.group == filter_group]

        standings_map = {}
        for t in filtered_teams:
            standings_map[t.id] = TeamStanding(
                team_id=t.id, team_name=t.name, group_name=t.group,
                played=0, won=0, drawn=0, lost=0,
                goals_for=0, goals_against=0, goal_difference=0,
                yellow_cards=0, red_cards=0, discipline_points=0, points=0
            )

        for m in matches:
            if not m.played or m.is_bye:
                continue
            if m.home_team_id not in standings_map or m.away_team_id not in standings_map:
                continue

            hs = m.home_score if m.home_score is not None else 0
            as_ = m.away_score if m.away_score is not None else 0
            
            home_rec = standings_map[m.home_team_id]
            away_rec = standings_map[m.away_team_id]

            home_rec.played += 1
            away_rec.played += 1
            home_rec.goals_for += hs
            home_rec.goals_against += as_
            away_rec.goals_for += as_
            away_rec.goals_against += hs

            if hs > as_:
                home_rec.won += 1
                home_rec.points += 3
                away_rec.lost += 1
            elif as_ > hs:
                away_rec.won += 1
                away_rec.points += 3
                home_rec.lost += 1
            else:
                home_rec.drawn += 1
                home_rec.points += 1
                away_rec.drawn += 1
                away_rec.points += 1

            home_rec.yellow_cards += m.home_yellow_cards
            home_rec.red_cards += m.home_red_cards
            home_rec.discipline_points += m.home_yellow_cards * 1 + m.home_red_cards * 3

            away_rec.yellow_cards += m.away_yellow_cards
            away_rec.red_cards += m.away_red_cards
            away_rec.discipline_points += m.away_yellow_cards * 1 + m.away_red_cards * 3

        standings_list = list(standings_map.values())
        for r in standings_list:
            r.goal_difference = r.goals_for - r.goals_against

        def get_sort_key(item):
            # Điểm cao nhất -> Hiệu số cao nhất -> Điểm kỷ luật thấp nhất (dùng âm) -> Bàn thắng nhiều nhất
            return (item.points, item.goal_difference, -item.discipline_points, item.goals_for)

        standings_list.sort(key=get_sort_key, reverse=True)
        return standings_list

    def refresh_standings(self):
        teams = self.main_window.teams
        matches = self.main_window.matches
        
        current_idx = self.combo_group_filter.currentIndex()
        self.combo_group_filter.blockSignals(True)
        self.combo_group_filter.clear()
        self.combo_group_filter.addItem("Bảng xếp hạng tổng hợp (Toàn giải)")
        
        groups_list = sorted(list(set([t.group for t in teams if t.group])))
        for g in groups_list:
            self.combo_group_filter.addItem(f"Bảng {g}")
            
        if current_idx < self.combo_group_filter.count() and current_idx > 0:
            self.combo_group_filter.setCurrentIndex(current_idx)
        self.combo_group_filter.blockSignals(False)

        selected_grp = None
        if self.combo_group_filter.currentIndex() > 0:
            selected_grp = self.combo_group_filter.currentText().replace("Bảng ", "")

        standings = self.calculate_standings_list(teams, matches, selected_grp)

        self.table_standings.setRowCount(len(standings))
        for r_idx, std in enumerate(standings):
            self.table_standings.setItem(r_idx, 0, QTableWidgetItem(str(r_idx + 1)))
            self.table_standings.setItem(r_idx, 1, QTableWidgetItem(std.team_name))
            self.table_standings.setItem(r_idx, 2, QTableWidgetItem(str(std.played)))
            self.table_standings.setItem(r_idx, 3, QTableWidgetItem(str(std.won)))
            self.table_standings.setItem(r_idx, 4, QTableWidgetItem(str(std.drawn)))
            self.table_standings.setItem(r_idx, 5, QTableWidgetItem(str(std.lost)))
            self.table_standings.setItem(r_idx, 6, QTableWidgetItem(str(std.goals_for)))
            self.table_standings.setItem(r_idx, 7, QTableWidgetItem(str(std.goals_against)))
            self.table_standings.setItem(r_idx, 8, QTableWidgetItem(str(std.goal_difference)))
            
            cards_str = f"V:{std.yellow_cards} | Đ:{std.red_cards}"
            self.table_standings.setItem(r_idx, 9, QTableWidgetItem(cards_str))
            self.table_standings.setItem(r_idx, 10, QTableWidgetItem(str(std.discipline_points)))
            
            pt_item = QTableWidgetItem(str(std.points))
            pt_item.setFont(Qt.ItemFlag.ItemIsEnabled)
            self.table_standings.setItem(r_idx, 11, pt_item)


class ExportTab(QWidget):
    """Tab 4: Xuất bản dữ liệu báo cáo"""
    def __init__(self, main_window):
        super().__init__()
        self.main_window = main_window
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()
        
        info_box = QGroupBox("Xuất dữ liệu Excel (.xlsx)")
        info_layout = QVBoxLayout()
        
        lbl_desc = QLabel(
            "Tính năng này cho phép bạn xuất toàn bộ dữ liệu hiện tại của giải đấu\n"
            "bao gồm: Danh sách đội, Lịch thi đấu, Trọng tài, Bàn thắng và Điểm số\n"
            "ra một file Excel chuyên nghiệp với nhiều trang tính phân định rõ ràng."
        )
        lbl_desc.setStyleSheet("line-height: 1.5; font-size: 11px;")
        info_layout.addWidget(lbl_desc)
        
        self.btn_export = QPushButton("Xuất File Excel Ngay 📥")
        self.btn_export.setStyleSheet("font-size: 14px; font-weight: bold; background-color: #198754; color: white; padding: 10px;")
        self.btn_export.clicked.connect(self.do_export)
        info_layout.addWidget(self.btn_export)
        
        info_box.setLayout(info_layout)
        layout.addWidget(info_box)
        layout.addStretch()
        self.setLayout(layout)

    def do_export(self):
        from exporter import export_to_excel
        from PyQt6.QtWidgets import QFileDialog
        
        if not self.main_window.teams:
            QMessageBox.warning(self, "Lỗi", "Không có dữ liệu đội bóng để xuất!")
            return
            
        file_path, _ = QFileDialog.getSaveFileName(
            self, "Lưu file báo cáo Excel", "bao_cao_giai_dau.xlsx", "Excel Files (*.xlsx)"
        )
        if file_path:
            try:
                func = self.main_window.standing_tab.calculate_standings_list
                success = export_to_excel(file_path, self.main_window.teams, self.main_window.matches, func)
                if success:
                    QMessageBox.information(self, "Thành công", f"Đã xuất file báo cáo giải đấu thành công tại:\n{file_path}")
            except Exception as e:
                QMessageBox.critical(self, "Lỗi hệ thống", f"Có lỗi xảy ra khi xuất báo cáo: {str(e)}")
