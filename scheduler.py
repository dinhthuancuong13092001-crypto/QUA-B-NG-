from models import Team, Match
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
