/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Team, Match, TeamStanding } from "../types";

/**
 * Tính toán bảng xếp hạng từ danh sách đội bóng và kết quả trận đấu.
 * Hỗ trợ lọc theo bảng đấu hoặc trả về bảng xếp hạng tổng hợp.
 */
export function calculateStandings(
  teams: Team[],
  matches: Match[],
  groupName?: string
): TeamStanding[] {
  // Lọc danh sách đội theo bảng đấu (nếu có yêu cầu lọc)
  const groupTeams = groupName
    ? teams.filter((t) => t.group === groupName && t.id !== "BYE")
    : teams.filter((t) => t.id !== "BYE");

  // Khởi tạo bảng xếp hạng rỗng cho từng đội
  const standingsMap: { [teamId: string]: TeamStanding } = {};
  
  groupTeams.forEach((team) => {
    standingsMap[team.id] = {
      teamId: team.id,
      teamName: team.name,
      groupName: team.group,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      yellowCards: 0,
      redCards: 0,
      disciplinePoints: 0,
      points: 0,
    };
  });

  // Duyệt qua tất cả các trận đấu có liên quan
  matches.forEach((match) => {
    // Chỉ tính các trận đấu đã chơi và không phải là trận Bye ẩn danh
    if (!match.played || match.isBye) return;

    // Nếu đang tính cho một bảng cụ thể, chỉ xét các trận thuộc bảng đó
    if (groupName && match.group !== groupName) return;

    const homeId = match.homeTeamId;
    const awayId = match.awayTeamId;

    // Bỏ qua nếu đội bóng không thuộc nhóm đang tính (ví dụ khi chia bảng)
    if (!standingsMap[homeId] || !standingsMap[awayId]) return;

    const homeScore = match.homeScore ?? 0;
    const awayScore = match.awayScore ?? 0;

    const homeStanding = standingsMap[homeId];
    const awayStanding = standingsMap[awayId];

    // Cập nhật số trận
    homeStanding.played += 1;
    awayStanding.played += 1;

    // Cập nhật bàn thắng/bàn thua
    homeStanding.goalsFor += homeScore;
    homeStanding.goalsAgainst += awayScore;
    awayStanding.goalsFor += awayScore;
    awayStanding.goalsAgainst += homeScore;

    // Cập nhật kết quả thắng, hòa, thua và điểm số
    if (homeScore > awayScore) {
      homeStanding.won += 1;
      homeStanding.points += 3;
      awayStanding.lost += 1;
    } else if (homeScore < awayScore) {
      awayStanding.won += 1;
      awayStanding.points += 3;
      homeStanding.lost += 1;
    } else {
      homeStanding.drawn += 1;
      homeStanding.points += 1;
      awayStanding.drawn += 1;
      awayStanding.points += 1;
    }

    // Cập nhật thẻ phạt và điểm kỷ luật
    // Quy tắc: 1 Thẻ đỏ = 3 điểm phạt, 1 Thẻ vàng = 1 điểm phạt
    homeStanding.yellowCards += match.homeYellowCards ?? 0;
    homeStanding.redCards += match.homeRedCards ?? 0;
    homeStanding.disciplinePoints +=
      (match.homeYellowCards ?? 0) * 1 + (match.homeRedCards ?? 0) * 3;

    awayStanding.yellowCards += match.awayYellowCards ?? 0;
    awayStanding.redCards += match.awayRedCards ?? 0;
    awayStanding.disciplinePoints +=
      (match.awayYellowCards ?? 0) * 1 + (match.awayRedCards ?? 0) * 3;
  });

  // Tính toán lại hiệu số bàn thắng bại cho từng đội
  const standingsList = Object.values(standingsMap).map((item) => {
    item.goalDifference = item.goalsFor - item.goalsAgainst;
    return item;
  });

  // Thuật toán sắp xếp xếp hạng nghiêm ngặt theo tiêu chuẩn người dùng yêu cầu:
  // 1. Điểm số (points) giảm dần
  // 2. Hiệu số bàn thắng bại (goalDifference) giảm dần
  // 3. Điểm kỷ luật (disciplinePoints) tăng dần (ít điểm phạt hơn đứng trước)
  // 4. Số bàn thắng ghi được (goalsFor) giảm dần
  standingsList.sort((a, b) => {
    // 1. So sánh điểm
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    // 2. So sánh hiệu số bàn thắng bại
    if (b.goalDifference !== a.goalDifference) {
      return b.goalDifference - a.goalDifference;
    }
    // 3. So sánh chỉ số kỷ luật (Đội nào điểm kỷ luật nhỏ hơn xếp trên)
    if (a.disciplinePoints !== b.disciplinePoints) {
      return a.disciplinePoints - b.disciplinePoints;
    }
    // 4. So sánh số bàn thắng ghi được
    if (b.goalsFor !== a.goalsFor) {
      return b.goalsFor - a.goalsFor;
    }
    // Mặc định sắp xếp theo tên nếu hoàn toàn bằng nhau
    return a.teamName.localeCompare(b.teamName);
  });

  return standingsList;
}
