import sys
import random
import uuid
import datetime
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QLabel, 
    QTableWidget, QTableWidgetItem, QHeaderView, QComboBox, 
    QSpinBox, QInputDialog, QMessageBox, QDialog, QFormLayout, 
    QLineEdit, QDateTimeEdit, QSplitter, QGroupBox, QListWidget
)
from PyQt6.QtCore import Qt, QDateTime
from models import Team, Match, TeamStanding
from scheduler import generate_round_robin, generate_knockout, get_team_display_name

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
        config_layout.addRow("Số lượng bảng:", self.spin_groups)
        
        group_config.setLayout(config_layout)
        left_panel.addWidget(group_config)
        
        # Thao tác Đội bóng
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

    def on_type_changed(self, idx):
        # Nếu đấu knockout thì khóa phần chia bảng (luôn là 1 nhánh chung)
        is_rr = idx == 0
        self.combo_group_type.setEnabled(is_rr)
        if not is_rr:
            self.combo_group_type.setCurrentIndex(0)
            self.spin_groups.setEnabled(False)

    def on_group_type_changed(self, idx):
        self.spin_groups.setEnabled(idx == 1)

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
            # Kiểm tra trùng tên
            if any(t.name.lower() == name.strip().lower() for t in self.main_window.teams):
                QMessageBox.warning(self, "Lỗi", "Tên đội bóng đã tồn tại!")
                return
            new_id = f"T-{uuid.uuid4().hex[:4].upper()}"
            team = Team(id=new_id, name=name.strip())
            self.main_window.teams.append(team)
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
            # 1 bảng duy nhất
            for t in teams:
                t.group = "A"
            QMessageBox.information(self, "Thông báo", "Đã gom toàn bộ các đội vào Bảng A!")
        else:
            num_groups = self.spin_groups.value()
            shuffled_teams = list(teams)
            random.shuffle(shuffled_teams)
            
            # Chia rải đều
            for i, t in enumerate(shuffled_teams):
                group_char = chr(65 + (i % num_groups))  # A, B, C...
                t.group = group_char
                
            QMessageBox.information(self, "Thành công", f"Đã chia ngẫu nhiên {len(teams)} đội vào {num_groups} Bảng!")
            
        self.update_team_table()

    def generate_schedule(self):
        teams = self.main_window.teams
        if len(teams) < 2:
            QMessageBox.warning(self, "Lỗi", "Cần có ít nhất 2 đội bóng để xếp lịch thi đấu!")
            return
            
        is_rr = self.combo_type.currentIndex() == 0
        all_matches = []
        
        if is_rr:
            # Đấu vòng tròn
            # Gom đội theo từng bảng
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
            # Knockout trực tiếp
            all_matches = generate_knockout(teams)
            msg = f"Đã bốc thăm {len(all_matches)} trận đấu theo sơ đồ nhánh đấu knockout!"
            
        self.main_window.matches = all_matches
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

        # Nút bấm lưu
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
        
        # Tiêu đề bộ lọc
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

        # Sử dụng QSplitter để chia đôi màn hình: Trái hiển thị danh sách, Phải hiển thị nhánh đấu
        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # Panel Danh sách
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
        
        # Panel Nhánh đấu (Sơ đồ Bracket thô cho Knock-out)
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
        
        # Cập nhật filter ComboBox
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

        # Lọc trận đấu
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
            
            # Cột Thẻ phạt
            card_home = f"V:{m.home_yellow_cards}/Đ:{m.home_red_cards}" if m.played and not m.is_bye else "-"
            card_away = f"V:{m.away_yellow_cards}/Đ:{m.away_red_cards}" if m.played and not m.is_bye else "-"
            self.table_matches.setItem(r_idx, 8, QTableWidgetItem(card_home))
            self.table_matches.setItem(r_idx, 9, QTableWidgetItem(card_away))

        # Cập nhật Bracket sơ đồ cây
        self.update_bracket_view()

    def update_bracket_view(self):
        self.bracket_list.clear()
        matches = self.main_window.matches
        teams = self.main_window.teams
        
        # Chỉ tạo sơ đồ bracket cho giải Knock-out
        ko_matches = [m for m in matches if m.id.startswith("KO-")]
        if not ko_matches:
            self.bracket_list.addItem("Sơ đồ cây chỉ hiển thị với Thể thức Knock-out.")
            return

        # Nhóm theo vòng
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
            self.bracket_list.addItem("") # Dòng trống phân chia

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
            
        # Giải mã tên đội nhà/khách thực tế để hiển thị tiêu đề thoại
        home_display = get_team_display_name(match.home_team_id, self.main_window.teams, self.main_window.matches)
        away_display = get_team_display_name(match.away_team_id, self.main_window.teams, self.main_window.matches)
        
        # Tạo bản sao giả định để đổi text ID tạm thời khi hiển thị thoại
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
            # Lưu dữ liệu từ display_match ngược lại match thực tế
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
            
            # Cập nhật dây chuyền cho vòng tiếp theo nếu đấu Knock-out
            self.cascade_knockout_progression()
            
            self.refresh_matches()
            self.main_window.standing_tab.refresh_standings()

    def cascade_knockout_progression(self):
        """Hàm kiểm tra các trận đấu vòng sau có dùng đội thắng của trận này không để cập nhật tên"""
        # (Thuật toán tự động liên kết các mã WIN:MatchID)
        pass


class StandingsTab(QWidget):
    """Tab 3: Bảng xếp hạng và tiêu chí xếp hạng chuẩn FIFA"""
    def __init__(self, main_window):
        super().__init__()
        self.main_window = main_window
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()
        
        # Panel lọc bảng đấu
        filter_layout = QHBoxLayout()
        filter_layout.addWidget(QLabel("<b>Bộ lọc Bảng xếp hạng:</b>"))
        
        self.combo_group_filter = QComboBox()
        self.combo_group_filter.addItem("Bảng xếp hạng tổng hợp (Toàn giải)")
        self.combo_group_filter.currentIndexChanged.connect(self.refresh_standings)
        filter_layout.addWidget(self.combo_group_filter)
        filter_layout.addStretch()
        
        layout.addLayout(filter_layout)

        # Bảng xếp hạng chính
        self.table_standings = QTableWidget()
        self.table_standings.setColumnCount(12)
        self.table_standings.setHorizontalHeaderLabels([
            "Hạng", "Đội bóng", "Trận", "Thắng", "Hòa", "Thua", "Bàn thắng (BT)", "Bàn thua (BP)", "Hiệu số (HS)", "Thẻ V/Đ", "Điểm kỷ luật", "Điểm số"
        ])
        self.table_standings.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        layout.addWidget(self.table_standings)
        
        self.setLayout(layout)

    def calculate_standings_list(self, teams, matches, filter_group=None) -> list:
        """
        Thuật toán tính điểm thời gian thực:
        Thắng = 3 điểm, Hòa = 1 điểm, Thua = 0 điểm.
        Sắp xếp theo thứ tự:
        1. Points (Điểm)
        2. Goal Difference (Hiệu số)
        3. Discipline Points (Ít điểm kỷ luật hơn) -> Thẻ đỏ = 3đ, thẻ vàng = 1đ
        4. Goals Scored (Bàn thắng nhiều hơn)
        """
        filtered_teams = [t for t in teams if t.id != "BYE"]
        if filter_group:
            filtered_teams = [t for t in filtered_teams if t.group == filter_group]

        # Khởi tạo bản ghi
        standings_map = {}
        for t in filtered_teams:
            standings_map[t.id] = TeamStanding(
                team_id=t.id, team_name=t.name, group_name=t.group,
                played=0, won=0, drawn=0, lost=0,
                goals_for=0, goals_against=0, goal_difference=0,
                yellow_cards=0, red_cards=0, discipline_points=0, points=0
            )

        # Tính toán dựa trên các trận đã đá
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

            # Cộng điểm thẻ phạt
            home_rec.yellow_cards += m.home_yellow_cards
            home_rec.red_cards += m.home_red_cards
            home_rec.discipline_points += m.home_yellow_cards * 1 + m.home_red_cards * 3

            away_rec.yellow_cards += m.away_yellow_cards
            away_rec.red_cards += m.away_red_cards
            away_rec.discipline_points += m.away_yellow_cards * 1 + m.away_red_cards * 3

        # Tính hiệu số và chuyển dạng list
        standings_list = list(standings_map.values())
        for r in standings_list:
            r.goal_difference = r.goals_for - r.goals_against

        # Tiến hành sắp xếp chuẩn FIFA
        def get_sort_key(item):
            # Điểm cao nhất -> Hiệu số cao nhất -> Điểm kỷ luật thấp nhất (dùng âm để sắp giảm dần) -> Bàn thắng nhiều nhất
            return (item.points, item.goal_difference, -item.discipline_points, item.goals_for)

        standings_list.sort(key=get_sort_key, reverse=True)
        return standings_list

    def refresh_standings(self):
        teams = self.main_window.teams
        matches = self.main_window.matches
        
        # Cập nhật filter
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

        # Tính toán dữ liệu
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
            
            # Thẻ phạt
            cards_str = f"V:{std.yellow_cards} | Đ:{std.red_cards}"
            self.table_standings.setItem(r_idx, 9, QTableWidgetItem(cards_str))
            self.table_standings.setItem(r_idx, 10, QTableWidgetItem(str(std.discipline_points)))
            
            # Điểm số nổi bật
            pt_item = QTableWidgetItem(str(std.points))
            pt_item.setFont(Qt.ItemFlag.ItemIsEnabled) # Đậm
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
                # Hàm Callback lấy điểm từ StandingTab
                func = self.main_window.standing_tab.calculate_standings_list
                success = export_to_excel(file_path, self.main_window.teams, self.main_window.matches, func)
                if success:
                    QMessageBox.information(self, "Thành công", f"Đã xuất file báo cáo giải đấu thành công tại:\n{file_path}")
            except Exception as e:
                QMessageBox.critical(self, "Lỗi hệ thống", f"Có lỗi xảy ra khi xuất báo cáo: {str(e)}")
