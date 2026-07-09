/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Team {
  id: string;
  name: string;
  group?: string; // Tên bảng (A, B, C...) hoặc ID bảng
}

export interface Group {
  id: string;
  name: string;
  teams: Team[];
}

export enum TournamentType {
  KNOCKOUT = "KNOCK_OUT",
  ROUND_ROBIN = "ROUND_ROBIN",
}

export interface Tournament {
  id: string;
  name: string;
  type: TournamentType;
  numGroups: number;
  groupType: "single" | "multiple";
  teams: Team[];
  matches: Match[];
  createdAt?: string;
}

export interface Match {
  id: string;
  round: number; // Vòng đấu (1, 2, 3...)
  roundName?: string; // Tên vòng đấu (Vòng 1, Bán kết, Chung kết...)
  group?: string; // Tên bảng đấu nếu thi đấu vòng tròn
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  played: boolean;
  date?: string; // Ngày thi đấu
  time?: string; // Giờ thi đấu
  referee?: string; // Trọng tài bắt chính
  homeYellowCards: number;
  homeRedCards: number;
  awayYellowCards: number;
  awayRedCards: number;
  isBye?: boolean; // Trận đấu với đội "Nghỉ"
}

export interface TeamStanding {
  teamId: string;
  teamName: string;
  groupName?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number; // Bàn thắng
  goalsAgainst: number; // Bàn thua
  goalDifference: number; // Hiệu số
  yellowCards: number;
  redCards: number;
  disciplinePoints: number; // Điểm phạt kỷ luật (1 thẻ đỏ = 3đ, 1 thẻ vàng = 1đ)
  points: number; // Điểm số (Thắng = 3, Hòa = 1, Thua = 0)
}
