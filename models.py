import uuid
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
