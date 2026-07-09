/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Team, Match } from "../types";

/**
 * Thuật toán xếp lịch thi đấu vòng tròn 1 lượt (Circle Method / Round-robin)
 * Áp dụng cơ chế xoay vòng. Nếu số đội lẻ, thêm đội "BYE" (Nghỉ).
 */
export function generateRoundRobin(teams: Team[], groupName?: string): Match[] {
  if (teams.length < 2) return [];

  // Tạo bản sao danh sách đội
  let list = [...teams];
  
  // Nếu lẻ, thêm đội ảo "Nghỉ" (BYE)
  const isOdd = list.length % 2 !== 0;
  if (isOdd) {
    list.push({ id: "BYE", name: "Nghỉ", group: groupName });
  }

  const numTeams = list.length;
  const numRounds = numTeams - 1;
  const matches: Match[] = [];

  // Để tạo thứ tự vòng đấu mượt mà và tránh trùng lặp
  for (let round = 1; round <= numRounds; round++) {
    for (let i = 0; i < numTeams / 2; i++) {
      const homeIdx = i;
      const awayIdx = numTeams - 1 - i;
      const home = list[homeIdx];
      const away = list[awayIdx];

      // Đảo vị trí sân nhà/sân khách xen kẽ để công bằng
      const isHome = round % 2 === 1 ? i % 2 === 0 : i % 2 === 1;
      const first = isHome ? home : away;
      const second = isHome ? away : home;

      if (first.id !== "BYE" && second.id !== "BYE") {
        matches.push({
          id: `${groupName || "RR"}-r${round}-${first.id}-${second.id}`,
          round,
          roundName: `Vòng ${round}`,
          group: groupName,
          homeTeamId: first.id,
          awayTeamId: second.id,
          played: false,
          homeYellowCards: 0,
          homeRedCards: 0,
          awayYellowCards: 0,
          awayRedCards: 0,
        });
      } else {
        // Trận đấu nghỉ: Đội còn lại được nghỉ ở vòng này
        const activeTeam = first.id === "BYE" ? second : first;
        matches.push({
          id: `${groupName || "RR"}-r${round}-${activeTeam.id}-bye`,
          round,
          roundName: `Vòng ${round}`,
          group: groupName,
          homeTeamId: activeTeam.id,
          awayTeamId: "BYE",
          played: true, // Coi như đã xong
          homeScore: 0,
          awayScore: 0,
          homeYellowCards: 0,
          homeRedCards: 0,
          awayYellowCards: 0,
          awayRedCards: 0,
          isBye: true,
        });
      }
    }
    // Xoay vòng tròn: giữ phần tử đầu tiên cố định, xoay các phần tử còn lại
    list = [list[0], list[list.length - 1], ...list.slice(1, list.length - 1)];
  }

  // Sắp xếp các trận đấu theo thứ tự vòng đấu cho gọn
  return matches.sort((a, b) => a.round - b.round);
}

/**
 * Thuật toán xếp lịch đấu loại trực tiếp (Knock-out)
 * Tự động tạo cây nhánh đấu. Nếu số đội không phải là lũy thừa của 2 (2, 4, 8, 16...),
 * hệ thống sẽ xếp các đội có thứ hạng cao/may mắn được "Bye" (đi thẳng vào vòng trong).
 */
export function generateKnockout(teams: Team[]): Match[] {
  if (teams.length < 2) return [];

  const list = [...teams];
  const numTeams = list.length;

  // Xác định số lượng vị trí ở vòng 1 (lũy thừa của 2 nhỏ nhất lớn hơn hoặc bằng numTeams)
  let power = 2;
  while (power < numTeams) {
    power *= 2;
  }

  // Số lượng trận đấu "Bye" (đội được đi thẳng)
  const numByes = power - numTeams;
  const matches: Match[] = [];

  // Vòng 1 (Vòng loại đầu tiên)
  // Ví dụ: Nếu có 6 đội, power = 8. Số trận đấu thực sự ở vòng 1 là (6 - (8 - 6)) / 2 = 2 trận đấu.
  // Các đội được đi tiếp (Bye) = 2 đội.
  // Hãy tổ chức các vòng đấu theo cách dễ hiển thị nhất.
  // Định dạng vòng đấu: 
  // - Vòng 1 (Vòng 16, Tứ kết, Bán kết, Chung kết tùy số đội)
  let roundIdx = 1;
  let roundName = "";
  if (power === 2) roundName = "Chung kết";
  else if (power === 4) roundName = "Bán kết";
  else if (power === 8) roundName = "Tứ kết";
  else if (power === 16) roundName = "Vòng 1/8";
  else roundName = `Vòng loại ${power}`;

  // Chuẩn bị các cặp đấu cho Vòng 1
  // Ta sắp xếp các đội xen kẽ. Để đơn giản và khoa học, ta ghép cặp:
  // Đội i vs Đội (numTeams - 1 - i) cho các trận vòng loại, còn lại được Bye.
  const round1Slots: { home: string; away: string; isBye: boolean; winnerPlaceholder?: string }[] = [];
  
  let teamIdx = 0;
  // Ghép các trận đấu thực tế trước
  const numRealMatchesInRound1 = numTeams - power / 2;
  
  for (let m = 0; m < power / 2; m++) {
    if (m < numRealMatchesInRound1) {
      // Trận đấu thực tế giữa 2 đội
      const home = list[teamIdx++];
      const away = list[teamIdx++];
      round1Slots.push({ home: home.id, away: away.id, isBye: false });
    } else {
      // Đội được đi thẳng (Bye)
      const byeTeam = list[teamIdx++];
      round1Slots.push({ home: byeTeam.id, away: "BYE", isBye: true });
    }
  }

  // Tạo các trận đấu vòng 1
  const round1Matches: Match[] = [];
  for (let m = 0; m < round1Slots.length; m++) {
    const slot = round1Slots[m];
    const matchId = `KO-r${roundIdx}-m${m + 1}`;
    
    if (slot.isBye) {
      round1Matches.push({
        id: matchId,
        round: roundIdx,
        roundName,
        homeTeamId: slot.home,
        awayTeamId: "BYE",
        played: true,
        homeScore: 1, // Tự động thắng để đi tiếp
        awayScore: 0,
        homeYellowCards: 0,
        homeRedCards: 0,
        awayYellowCards: 0,
        awayRedCards: 0,
        isBye: true,
      });
    } else {
      round1Matches.push({
        id: matchId,
        round: roundIdx,
        roundName,
        homeTeamId: slot.home,
        awayTeamId: slot.away,
        played: false,
        homeYellowCards: 0,
        homeRedCards: 0,
        awayYellowCards: 0,
        awayRedCards: 0,
      });
    }
  }
  matches.push(...round1Matches);

  // Tạo các vòng đấu tiếp theo cho đến Chung kết
  let currentRoundSlots = power / 2; // Số trận ở vòng vừa rồi
  let prevRoundMatches = round1Matches;

  while (currentRoundSlots > 1) {
    roundIdx++;
    currentRoundSlots /= 2;
    
    let nextRoundName = "";
    if (currentRoundSlots === 1) nextRoundName = "Chung kết";
    else if (currentRoundSlots === 2) nextRoundName = "Bán kết";
    else if (currentRoundSlots === 4) nextRoundName = "Tứ kết";
    else nextRoundName = `Vòng ${currentRoundSlots * 2}`;

    const nextRoundMatches: Match[] = [];
    for (let m = 0; m < currentRoundSlots; m++) {
      const matchId = `KO-r${roundIdx}-m${m + 1}`;
      
      // Xác định nguồn gốc đội thi đấu (Người thắng từ 2 trận đấu vòng trước)
      const prevMatch1Id = prevRoundMatches[m * 2].id;
      const prevMatch2Id = prevRoundMatches[m * 2 + 1].id;

      // Ban đầu khi chưa đá, ta sẽ hiển thị tên đội là placeholder như "Thắng trận X"
      // Chúng ta sẽ lưu thông tin này để xử lý hiển thị hoặc lấy động
      nextRoundMatches.push({
        id: matchId,
        round: roundIdx,
        roundName: nextRoundName,
        homeTeamId: `WIN:${prevMatch1Id}`, // Mã đặc biệt chỉ người thắng trận đấu trước
        awayTeamId: `WIN:${prevMatch2Id}`, // Mã đặc biệt chỉ người thắng trận đấu trước
        played: false,
        homeYellowCards: 0,
        homeRedCards: 0,
        awayYellowCards: 0,
        awayRedCards: 0,
      });
    }
    matches.push(...nextRoundMatches);
    prevRoundMatches = nextRoundMatches;
  }

  return matches;
}

/**
 * Hàm phân giải tên đội bóng thực tế (hỗ trợ cả các slot đặc biệt như WIN:KO-r1-m1 hay BYE)
 */
export function getTeamDisplayName(
  teamId: string,
  teamsList: Team[],
  matchesList: Match[]
): string {
  if (teamId === "BYE" || teamId === "") return "Nghỉ (Bye)";
  
  if (teamId.startsWith("WIN:")) {
    const sourceMatchId = teamId.substring(4);
    const sourceMatch = matchesList.find((m) => m.id === sourceMatchId);
    
    if (!sourceMatch) return "Thắng trận đấu";
    
    // Nếu trận đấu nguồn đã đá, trả về tên đội thắng thực tế
    if (sourceMatch.played) {
      const winnerId = getMatchWinnerId(sourceMatch);
      if (winnerId) {
        const team = teamsList.find((t) => t.id === winnerId);
        return team ? team.name : "Đội thắng";
      }
    }
    
    // Nếu chưa đá, trả về nhãn placeholder gợi ý
    // Ví dụ: "Thắng Trận 1 (Vòng loại)"
    const matchNumber = sourceMatchId.split("-m")[1] || "";
    return `Thắng Trận ${matchNumber} (${sourceMatch.roundName})`;
  }

  const team = teamsList.find((t) => t.id === teamId);
  return team ? team.name : "Không xác định";
}

/**
 * Hàm tìm ID của đội thắng trận đấu
 */
export function getMatchWinnerId(match: Match): string | null {
  if (!match.played) return null;
  
  const hs = match.homeScore ?? 0;
  const as = match.awayScore ?? 0;
  
  if (hs > as) return match.homeTeamId;
  if (as > hs) return match.awayTeamId;
  
  // Trường hợp hòa ở knockout: Phải có hiệp phụ hoặc penalty.
  // Để đơn giản và trực quan, ta mặc định đội chủ nhà thắng,
  // hoặc người dùng tự nhập tỷ số lệch (ví dụ pen 5-4 thì nhập tỷ số 5-4 hoặc bàn thắng tương ứng).
  // Ta mặc định trả về homeTeamId nếu bằng điểm mà là Bye, hoặc homeTeamId làm mặc định.
  return match.homeTeamId;
}
