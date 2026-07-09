/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PythonFile {
  name: string;
  description: string;
  content: string;
}

export const pythonCodebase: PythonFile[] = [
  {
    name: "models.py",
    description: "Chứa các lớp cấu trúc dữ liệu cho Đội bóng, Trận đấu và Bảng xếp hạng.",
    content: `import uuid
from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class Team:
    id: str
    name: str
    group: Optional[str] = None  # Tên bảng đấu (A, B, C...) hoặc None nếu không chia bảng

@dataclass
class Match:
    id: str
    round_num: int           # Vòng đấu (1, 2, 3...)
    round_name: str          # Tên vòng đấu (Vòng 1, Bán kết, Chung kết...)
    home_team_id: str        # ID đội nhà hoặc mã "WIN:Trận_ID" hoặc "BYE"
    away_team_id: str        # ID đội khách hoặc mã "WIN:Trận_ID" hoặc "BYE"
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    played: bool = False
    group: Optional[str] = None  # Tên bảng đấu nếu thuộc vòng đấu vòng tròn
    date_str: str = ""       # Ngày thi đấu
    time_str: str = ""       # Giờ thi đấu
    referee: str = ""        # Trọng tài bắt chính
    home_yellow_cards: int = 0
    home_red_cards: int = 0
    away_yellow_cards: int = 0
    away_red_cards: int = 0
    is_bye: bool = False     # Trận đấu với đội Nghỉ (BYE)

@dataclass
class TeamStanding:
    team_id: str
    team_name: str
    group_name: Optional[str] = None
    played: int = 0
    won: int = 0
    drawn: int = 0
    lost: int = 0
    goals_for: int = 0        # Số bàn thắng ghi được (Goals Scored)
    goals_against: int = 0    # Số bàn thua (Goals Against)
    goal_difference: int = 0  # Hiệu số (Goal Difference)
    yellow_cards: int = 0
    red_cards: int = 0
    discipline_points: int = 0  # Điểm phạt kỷ luật: 1 thẻ đỏ = 3đ, 1 thẻ vàng = 1đ
    points: int = 0           # Điểm số chuẩn FIFA: Thắng = 3đ, Hòa = 1đ, Thua = 0đ
`
  },
  {
    name: "scheduler.py",
    description: "Chứa thuật toán xếp cặp đấu vòng tròn (Circle Method) và đấu loại trực tiếp (Knock-out).",
    content: `from models import Team, Match
from typing import List, Dict, Optional

def generate_round_robin(teams: List[Team], group_name: Optional[str] = None) -> List[Match]:
    """
    Áp dụng thuật toán xoay vòng (Circle Method) để xếp lịch thi đấu vòng tròn 1 lượt.
    Nếu số lượng đội trong một bảng là lẻ, tự động thêm một đội ảo tên là 'Nghỉ' (BYE).
    """
    if len(teams) < 2:
        return []
        
    team_list = list(teams)
    
    # Thêm đội BYE nếu số lượng đội lẻ
    if len(team_list) % 2 != 0:
        team_list.append(Team(id="BYE", name="Nghỉ", group=group_name))
        
    n = len(team_list)
    num_rounds = n - 1
    matches = []
    
    for r in range(1, num_rounds + 1):
        for i in range(n // 2):
            home_idx = i
            away_idx = n - 1 - i
            home = team_list[home_idx]
            away = team_list[away_idx]
            
            # Luân phiên sân nhà/sân khách cho công bằng
            is_home = (i % 2 == 0) if r % 2 == 1 else (i % 2 == 1)
            first = home if is_home else away
            second = away if is_home else home
            
            match_id = f"{group_name or 'RR'}-R{r}-{first.id}-{second.id}"
            
            if first.id != "BYE" and second.id != "BYE":
                matches.append(Match(
                    id=match_id,
                    round_num=r,
                    round_name=f"Vòng {r}",
                    home_team_id=first.id,
                    away_team_id=second.id,
                    played=False,
                    group=group_name
                ))
            else:
                # Đội thi đấu với BYE sẽ được nghỉ ngơi vòng này
                active_team = second if first.id == "BYE" else first
                matches.append(Match(
                    id=match_id,
                    round_num=r,
                    round_name=f"Vòng {r}",
                    home_team_id=active_team.id,
                    away_team_id="BYE",
                    played=True,
                    home_score=0,
                    away_score=0,
                    group=group_name,
                    is_bye=True
                ))
                
        # Xoay vòng tròn: giữ phần tử đầu tiên cố định, rải đều các phần tử còn lại
        team_list = [team_list[0]] + [team_list[-1]] + team_list[1:-1]
        
    return sorted(matches, key=lambda m: m.round_num)

def generate_knockout(teams: List[Team]) -> List[Match]:
    """
    Xếp cặp đấu loại trực tiếp (Knock-out) theo nhánh cây.
    Xử lý các kích thước đội không phải lũy thừa của 2 bằng cách thêm các slot 'Bye' ở vòng đầu tiên.
    """
    if len(teams) < 2:
        return []
        
    team_list = list(teams)
    num_teams = len(team_list)
    
    # Tính lũy thừa gần nhất của 2 (lớn hơn hoặc bằng số đội)
    power = 2
    while power < num_teams:
        power *= 2
        
    matches = []
    round_idx = 1
    
    # Xác định tên vòng đầu
    if power == 2:
        round_name = "Chung kết"
    elif power == 4:
        round_name = "Bán kết"
    elif power == 8:
        round_name = "Tứ kết"
    elif power == 16:
        round_name = "Vòng 1/8"
    else:
        round_name = f"Vòng loại {power}"
        
    # Chuẩn bị cặp đấu vòng 1
    slots = []
    team_ptr = 0
    num_real_matches = num_teams - power // 2  # Số trận thực sự cần đá ở vòng loại
    
    for m in range(power // 2):
        if m < num_real_matches:
            home = team_list[team_ptr]
            team_ptr += 1
            away = team_list[team_ptr]
            team_ptr += 1
            slots.append({"home": home.id, "away": away.id, "is_bye": False})
        else:
            bye_team = team_list[team_ptr]
            team_ptr += 1
            slots.append({"home": bye_team.id, "away": "BYE", "is_bye": True})
            
    round1_matches = []
    for m, slot in enumerate(slots):
        match_id = f"KO-R{round_idx}-M{m + 1}"
        if slot["is_bye"]:
            # Trận đấu có đội được đặc cách (BYE) đi thẳng
            round1_matches.append(Match(
                id=match_id,
                round_num=round_idx,
                round_name=round_name,
                home_team_id=slot["home"],
                away_team_id="BYE",
                played=True,
                home_score=1,
                away_score=0,
                is_bye=True
            ))
        else:
            round1_matches.append(Match(
                id=match_id,
                round_num=round_idx,
                round_name=round_name,
                home_team_id=slot["home"],
                away_team_id=slot["away"],
                played=False
            ))
    matches.extend(round1_matches)
    
    current_slots = power // 2
    prev_matches = round1_matches
    
    # Xây dựng các vòng tiếp theo cho đến trận Chung kết
    while current_slots > 1:
        round_idx += 1
        current_slots //= 2
        
        if current_slots == 1:
            next_round_name = "Chung kết"
        elif current_slots == 2:
            next_round_name = "Bán kết"
        elif current_slots == 4:
            next_round_name = "Tứ kết"
        else:
            next_round_name = f"Vòng {current_slots * 2}"
            
        next_round_matches = []
        for m in range(current_slots):
            match_id = f"KO-R{round_idx}-M{m + 1}"
            prev_m1_id = prev_matches[m * 2].id
            prev_m2_id = prev_matches[m * 2 + 1].id
            
            # Sử dụng mã WIN:MatchID làm giữ chỗ cho đội thắng của trận đấu trước
            next_round_matches.append(Match(
                id=match_id,
                round_num=round_idx,
                round_name=next_round_name,
                home_team_id=f"WIN:{prev_m1_id}",
                away_team_id=f"WIN:{prev_m2_id}",
                played=False
            ))
        matches.extend(next_round_matches)
        prev_matches = next_round_matches
        
    return matches

def get_team_display_name(team_id: str, teams: List[Team], matches: List[Match]) -> str:
    """Trả về tên hiển thị của đội bóng, giải mã mã WIN:MatchID nếu cần thiết."""
    if team_id == "BYE" or not team_id:
        return "Nghỉ (BYE)"
        
    if team_id.startswith("WIN:"):
        source_id = team_id[4:]
        source_match = next((m for m in matches if m.id == source_id), None)
        if not source_match:
            return "Thắng trận đấu"
            
        if source_match.played:
            winner_id = get_match_winner_id(source_match)
            if winner_id:
                winner_team = next((t for t in teams if t.id == winner_id), None)
                if winner_team:
                    return winner_team.name
            return "Đội thắng"
            
        # Nếu chưa đá, trả về nhãn giữ chỗ
        match_num = source_id.split("-M")[-1] if "-M" in source_id else ""
        return f"Thắng Trận {match_num} ({source_match.round_name})"
        
    team = next((t for t in teams if t.id == team_id), None)
    return team.name if team else "Chưa xác định"

def get_match_winner_id(match: Match) -> Optional[str]:
    """Tìm ID của đội thắng trận đấu."""
    if not match.played:
        return None
    hs = match.home_score if match.home_score is not None else 0
    as_ = match.away_score if match.away_score is not None else 0
    if hs > as_:
        return match.home_team_id
    elif as_ > hs:
        return match.away_team_id
    return match.home_team_id  # Mặc định chủ nhà nếu có hòa
`
  },
  {
    name: "exporter.py",
    description: "Sử dụng thư viện openpyxl để xuất báo cáo Excel định dạng chuyên nghiệp với nhiều Sheet.",
    content: `import datetime
from typing import List
from models import Team, Match, TeamStanding
from scheduler import get_team_display_name

try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False

def export_to_excel(filepath: str, teams: List[Team], matches: List[Match], standings_func) -> bool:
    """
    Xuất dữ liệu giải đấu ra file Excel sử dụng openpyxl.
    Định dạng màu sắc chuyên nghiệp (Header xanh đậm, chữ trắng, viền rõ ràng, tự chỉnh độ rộng).
    """
    if not OPENPYXL_AVAILABLE:
        print("Lỗi: Cần cài đặt thư viện 'openpyxl' để xuất file Excel. Chạy lệnh: pip install openpyxl")
        return False
        
    wb = openpyxl.Workbook()
    
    # Định nghĩa các Style cho Excel
    header_fill = PatternFill(start_color="1B365D", end_color="1B365D", fill_type="solid")
    header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    title_font = Font(name="Segoe UI", size=14, bold=True, color="1B365D")
    data_font = Font(name="Segoe UI", size=10)
    bold_font = Font(name="Segoe UI", size=10, bold=True)
    
    thin_border = Border(
        left=Side(style='thin', color='D1D5DB'),
        right=Side(style='thin', color='D1D5DB'),
        top=Side(style='thin', color='D1D5DB'),
        bottom=Side(style='thin', color='D1D5DB')
    )
    
    align_center = Alignment(horizontal='center', vertical='center')
    align_left = Alignment(horizontal='left', vertical='center')
    align_right = Alignment(horizontal='right', vertical='center')
    
    # ==================== SHEET 1: DANH SÁCH ĐỘI BÓNG ====================
    ws1 = wb.active
    ws1.title = "Danh sách Đội"
    ws1.views.sheetView[0].showGridLines = True
    
    ws1.cell(row=1, column=1, value="DANH SÁCH ĐỘI BÓNG THAM GIA GIẢI ĐẤU").font = title_font
    ws1.row_dimensions[1].height = 30
    
    headers1 = ["STT", "Tên Đội bóng", "Bảng đấu"]
    ws1.row_dimensions[3].height = 25
    
    for col_idx, h in enumerate(headers1, 1):
        cell = ws1.cell(row=3, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = align_center
        cell.border = thin_border
        
    row_ptr = 4
    for idx, t in enumerate(filter(lambda x: x.id != "BYE", teams), 1):
        ws1.row_dimensions[row_ptr].height = 20
        c1 = ws1.cell(row=row_ptr, column=1, value=idx)
        c2 = ws1.cell(row=row_ptr, column=2, value=t.name)
        c3 = ws1.cell(row=row_ptr, column=3, value=t.group or "Không chia bảng")
        
        for c in (c1, c2, c3):
            c.font = data_font
            c.border = thin_border
        c1.alignment = align_center
        c2.alignment = align_left
        c3.alignment = align_center
        row_ptr += 1
        
    auto_fit_columns(ws1)
    
    # ==================== SHEET 2: LỊCH THI ĐẤU & KẾT QUẢ ====================
    ws2 = wb.create_sheet("Lịch thi đấu & Kết quả")
    ws2.views.sheetView[0].showGridLines = True
    
    ws2.cell(row=1, column=1, value="LỊCH THI ĐẤU VÀ KẾT QUẢ CÁC TRẬN ĐẤU").font = title_font
    ws2.row_dimensions[1].height = 30
    
    headers2 = ["Vòng đấu", "Bảng", "Đội nhà", "Tỷ số nhà", "-", "Tỷ số khách", "Đội khách", "Thời gian", "Trọng tài", "Thẻ nhà", "Thẻ khách"]
    ws2.row_dimensions[3].height = 25
    
    for col_idx, h in enumerate(headers2, 1):
        cell = ws2.cell(row=3, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = align_center
        cell.border = thin_border
        
    row_ptr = 4
    for m in matches:
        ws2.row_dimensions[row_ptr].height = 20
        home_name = get_team_display_name(m.home_team_id, teams, matches)
        away_name = get_team_display_name(m.away_team_id, teams, matches)
        
        score_home = m.home_score if m.played and not m.is_bye else ""
        score_away = m.away_score if m.played and not m.is_bye else ""
        vs_str = "REST" if m.is_bye else "VS"
        
        time_str = "Nghỉ vòng này" if m.is_bye else f"{m.date_str} {m.time_str}".strip()
        ref_str = m.referee if m.referee else "Chưa phân công"
        
        card_home_str = f"V:{m.home_yellow_cards} | Đ:{m.home_red_cards}" if m.played and not m.is_bye else "-"
        card_away_str = f"V:{m.away_yellow_cards} | Đ:{m.away_red_cards}" if m.played and not m.is_bye else "-"
        
        vals = [
            m.round_name, m.group or "Knock-out", home_name, score_home, 
            vs_str, score_away, away_name, time_str, ref_str, card_home_str, card_away_str
        ]
        
        for col_idx, val in enumerate(vals, 1):
            c = ws2.cell(row=row_ptr, column=col_idx, value=val)
            c.font = data_font
            c.border = thin_border
            if col_idx in (1, 2, 4, 5, 6, 8, 10, 11):
                c.alignment = align_center
            else:
                c.alignment = align_left
        row_ptr += 1
        
    auto_fit_columns(ws2)
    
    # ==================== SHEET 3: BẢNG XẾP HẠNG ====================
    ws3 = wb.create_sheet("Bảng xếp hạng tổng hợp")
    ws3.views.sheetView[0].showGridLines = True
    
    ws3.cell(row=1, column=1, value="BẢNG XẾP HẠNG TOÀN GIẢI").font = title_font
    ws3.row_dimensions[1].height = 30
    
    groups_list = sorted(list(set([t.group for t in teams if t.group])))
    
    row_ptr = 3
    if groups_list:
        # Nếu có chia bảng đấu
        for g_name in groups_list:
            ws3.cell(row=row_ptr, column=1, value=f"BẢNG XẾP HẠNG BẢNG {g_name}").font = Font(name="Segoe UI", size=12, bold=True, color="1B365D")
            ws3.row_dimensions[row_ptr].height = 25
            row_ptr += 1
            
            headers3 = ["Hạng", "Đội bóng", "Trận", "Thắng", "Hòa", "Thua", "BT", "BP", "HS", "Thẻ phạt", "Điểm phạt", "Điểm số"]
            ws3.row_dimensions[row_ptr].height = 25
            for col_idx, h in enumerate(headers3, 1):
                cell = ws3.cell(row=row_ptr, column=col_idx, value=h)
                cell.font = header_font
                cell.fill = header_fill
                cell.alignment = align_center
                cell.border = thin_border
            row_ptr += 1
            
            g_standings = standings_func(teams, matches, g_name)
            for idx, std in enumerate(g_standings, 1):
                ws3.row_dimensions[row_ptr].height = 20
                vals = [
                    idx, std.team_name, std.played, std.won, std.drawn, std.lost,
                    std.goals_for, std.goals_against, std.goal_difference,
                    f"V:{std.yellow_cards} | Đ:{std.red_cards}", std.discipline_points, std.points
                ]
                for col_idx, val in enumerate(vals, 1):
                    c = ws3.cell(row=row_ptr, column=col_idx, value=val)
                    c.border = thin_border
                    if col_idx == 12:
                        c.font = bold_font
                    else:
                        c.font = data_font
                        
                    if col_idx in (1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12):
                        c.alignment = align_center
                    else:
                        c.alignment = align_left
                row_ptr += 1
            row_ptr += 2  # Tạo khoảng cách giữa các bảng
    else:
        # Không chia bảng
        headers3 = ["Hạng", "Đội bóng", "Trận", "Thắng", "Hòa", "Thua", "BT", "BP", "HS", "Thẻ phạt", "Điểm phạt", "Điểm số"]
        ws3.row_dimensions[row_ptr].height = 25
        for col_idx, h in enumerate(headers3, 1):
            cell = ws3.cell(row=row_ptr, column=col_idx, value=h)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = align_center
            cell.border = thin_border
        row_ptr += 1
        
        all_standings = standings_func(teams, matches, None)
        for idx, std in enumerate(all_standings, 1):
            ws3.row_dimensions[row_ptr].height = 20
            vals = [
                idx, std.team_name, std.played, std.won, std.drawn, std.lost,
                std.goals_for, std.goals_against, std.goal_difference,
                f"V:{std.yellow_cards} | Đ:{std.red_cards}", std.discipline_points, std.points
            ]
            for col_idx, val in enumerate(vals, 1):
                c = ws3.cell(row=row_ptr, column=col_idx, value=val)
                c.border = thin_border
                if col_idx == 12:
                    c.font = bold_font
                else:
                    c.font = data_font
                    
                if col_idx in (1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12):
                    c.alignment = align_center
                else:
                    c.alignment = align_left
            row_ptr += 1
            
    auto_fit_columns(ws3)
    
    wb.save(filepath)
    return True

def auto_fit_columns(ws):
    """Căn chỉnh động độ rộng của cột dựa trên nội dung."""
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            if cell.value:
                val_str = str(cell.value)
                # Tính độ dài thô sơ, hỗ trợ hiển thị tiếng Việt có dấu
                val_len = len(val_str.encode('utf-8')) // 2 + 3
                if val_len > max_len:
                    max_len = val_len
        ws.column_dimensions[col_letter].width = max(max_len, 10)
`
  },
  {
    name: "views.py",
    description: "Chứa các Widget giao diện tab PyQt6 kế thừa từ QWidget và QTableWidget.",
    content: `import sys
import random
import uuid
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
`
  },
  {
    name: "main.py",
    description: "Điểm khởi chạy ứng dụng (Entry point), thiết lập QMainWindow và chạy QTabWidget chính.",
    content: `import sys
from PyQt6.QtWidgets import QApplication, QMainWindow, QTabWidget, QMessageBox
from PyQt6.QtGui import QIcon
from models import Team, Match
from views import TeamTab, MatchTab, StandingsTab, ExportTab

class MainWindow(QMainWindow):
    """Cửa sổ chính của chương trình quản lý và chia cặp đấu giải bóng đá"""
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Hệ thống Quản lý và Chia cặp đấu giải Bóng đá (PyQt6)")
        self.resize(1100, 700)
        
        # Cơ sở dữ liệu tạm thời
        self.teams = []
        self.matches = []
        
        self.init_data()
        self.init_ui()

    def init_data(self):
        """Khởi tạo một số dữ liệu mẫu ban đầu để kiểm tra ứng dụng dễ dàng"""
        sample_names = ["Hà Nội FC", "Hải Phòng FC", "Thép Xanh Nam Định", "Công An Hà Nội", "Becamex Bình Dương", "HAGL FC", "Thanh Hóa FC", "Viettel FC"]
        for i, name in enumerate(sample_names):
            # Mặc định chia 2 bảng
            group_char = "A" if i < 4 else "B"
            self.teams.append(Team(id=f"T-00{i+1}", name=name, group=group_char))

    def init_ui(self):
        # QTabWidget chính
        self.tabs = QTabWidget()
        
        self.team_tab = TeamTab(self)
        self.match_tab = MatchTab(self)
        self.standing_tab = StandingsTab(self)
        self.export_tab = ExportTab(self)
        
        self.tabs.addTab(self.team_tab, "👥 Đội bóng & Chia Bảng")
        self.tabs.addTab(self.match_tab, "📅 Lịch đấu & Kết quả")
        self.tabs.addTab(self.standing_tab, "🏆 Bảng xếp hạng")
        self.tabs.addTab(self.export_tab, "📥 Xuất Excel")
        
        self.setCentralWidget(self.tabs)
        
        # Đổ dữ liệu lên bảng ban đầu
        self.team_tab.update_team_table()
        
        # Khóa hoặc nhắc nhở xếp lịch ban đầu
        self.match_tab.refresh_matches()
        self.standing_tab.refresh_standings()

def main():
    app = QApplication(sys.argv)
    
    # Thiết lập giao diện Fusion hiện đại, thanh lịch
    app.setStyle("Fusion")
    
    window = MainWindow()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
`
  }
];
