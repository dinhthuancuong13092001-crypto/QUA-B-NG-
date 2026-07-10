/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Team, Match, TeamStanding } from "../types";
import { calculateStandings } from "./standings";
import { getTeamDisplayName } from "./scheduler";

/**
 * Tiện ích xuất file Excel chuyên nghiệp chia làm nhiều Sheet
 * Nạp trực tiếp vào Excel với định dạng màu sắc xanh đậm, kẻ viền ô, căn chỉnh cột.
 */
export function exportTournamentToExcel(
  teams: Team[],
  matches: Match[],
  groups: string[]
) {
  // Tạo tiêu đề XML và cấu hình Spreadsheet 2003
  let xml = `<?xml version="1.0" encoding="utf-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:navigator"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Author>Quản lý Giải đấu Bóng đá</Author>
    <Created>${new Date().toISOString()}</Created>
  </DocumentProperties>
  <Styles>
    <!-- Style cho Header chính -->
    <Style ss:ID="HeaderStyle">
      <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF" />
      <Interior ss:Color="#1B365D" ss:Pattern="Solid" />
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#000000" />
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
      </Borders>
    </Style>
    
    <!-- Style cho Tiêu đề Bảng -->
    <Style ss:ID="TitleStyle">
      <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="14" ss:Bold="1" ss:Color="#1B365D" />
      <Alignment ss:Vertical="Center" />
    </Style>

    <!-- Style cho dữ liệu thường (căn trái) -->
    <Style ss:ID="DataLeft">
      <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB" />
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB" />
      </Borders>
      <Alignment ss:Horizontal="Left" ss:Vertical="Center" />
    </Style>

    <!-- Style cho dữ liệu thường (căn giữa) -->
    <Style ss:ID="DataCenter">
      <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB" />
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB" />
      </Borders>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
    </Style>

    <!-- Style cho dữ liệu số (căn phải) -->
    <Style ss:ID="DataNumber">
      <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB" />
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB" />
      </Borders>
      <Alignment ss:Horizontal="Right" ss:Vertical="Center" />
    </Style>

    <!-- Style cho Đội thắng hoặc nổi bật -->
    <Style ss:ID="DataBold">
      <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Bold="1" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB" />
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB" />
      </Borders>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
    </Style>
  </Styles>
`;

  // ==================== SHEET 1: DANH SÁCH ĐỘI BÓNG ====================
  xml += `
  <Worksheet ss:Name="Danh sách Đội">
    <Table ss:ExpandedColumnCount="3" ss:DefaultRowHeight="20">
      <Column ss:Width="60"/>
      <Column ss:Width="200"/>
      <Column ss:Width="120"/>
      
      <Row ss:Height="30">
        <Cell ss:MergeAcross="2" ss:StyleID="TitleStyle">
          <Data ss:Type="String">DANH SÁCH ĐỘI BÓNG THAM GIA GIẢI ĐẤU</Data>
        </Cell>
      </Row>
      <Row />
      <Row ss:Height="25">
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">STT</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Tên Đội bóng</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Bảng đấu / Nhóm</Data></Cell>
      </Row>
  `;

  teams.filter(t => t.id !== "BYE").forEach((team, index) => {
    xml += `
      <Row ss:Height="20">
        <Cell ss:StyleID="DataCenter"><Data ss:Type="Number">${index + 1}</Data></Cell>
        <Cell ss:StyleID="DataLeft"><Data ss:Type="String">${team.name}</Data></Cell>
        <Cell ss:StyleID="DataCenter"><Data ss:Type="String">${team.group || "Chưa chia bảng"}</Data></Cell>
      </Row>
    `;
  });

  xml += `
    </Table>
  </Worksheet>
  `;

  // ==================== SHEET 2: LỊCH THI ĐẤU & KẾT QUẢ ====================
  xml += `
  <Worksheet ss:Name="Lịch thi đấu &amp; Kết quả">
    <Table ss:ExpandedColumnCount="13" ss:DefaultRowHeight="20">
      <Column ss:Width="80"/>
      <Column ss:Width="80"/>
      <Column ss:Width="160"/>
      <Column ss:Width="50"/>
      <Column ss:Width="30"/>
      <Column ss:Width="50"/>
      <Column ss:Width="160"/>
      <Column ss:Width="120"/>
      <Column ss:Width="120"/>
      <Column ss:Width="120"/>
      <Column ss:Width="80"/>
      <Column ss:Width="80"/>
      <Column ss:Width="180"/>
      
      <Row ss:Height="30">
        <Cell ss:MergeAcross="12" ss:StyleID="TitleStyle">
          <Data ss:Type="String">LỊCH THI ĐẤU VÀ KẾT QUẢ CÁC TRẬN ĐẤU</Data>
        </Cell>
      </Row>
      <Row />
      <Row ss:Height="25">
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Vòng đấu</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Bảng</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Đội nhà</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Tỷ số</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">-</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Tỷ số</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Đội khách</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Thời gian</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Địa điểm</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Trọng tài</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Thẻ phạt nhà</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Thẻ phạt khách</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Ghi chú thẻ đỏ</Data></Cell>
      </Row>
  `;

  matches.forEach((match) => {
    const homeName = getTeamDisplayName(match.homeTeamId, teams, matches);
    const awayName = getTeamDisplayName(match.awayTeamId, teams, matches);
    
    const playedTextHome = match.played && !match.isBye ? `${match.homeScore}` : "";
    const playedTextAway = match.played && !match.isBye ? `${match.awayScore}` : "";
    
    const dateTimeStr = match.isBye 
      ? "Nghỉ vòng này" 
      : `${match.date || ""} ${match.time || ""}`.trim() || "Chưa xếp lịch";
      
    const locationStr = match.isBye ? "-" : match.location || "Chưa xếp địa điểm";
    const refereeStr = match.referee || "Chưa phân công";
    const groupStr = match.group || "Knock-out";

    // Tính thẻ phạt để xuất text trực quan
    const homeCardsText = match.played && !match.isBye 
      ? `V: ${match.homeYellowCards} | Đ: ${match.homeRedCards}` 
      : "-";
    const awayCardsText = match.played && !match.isBye 
      ? `V: ${match.awayYellowCards} | Đ: ${match.awayRedCards}` 
      : "-";

    const redCardNotesStr = (match.homeRedCardNotes || match.awayRedCardNotes)
      ? `${match.homeRedCardNotes ? `Nhà: ${match.homeRedCardNotes} ` : ""}${match.awayRedCardNotes ? `| Khách: ${match.awayRedCardNotes}` : ""}`
      : "-";

    xml += `
      <Row ss:Height="20">
        <Cell ss:StyleID="DataCenter"><Data ss:Type="String">${match.roundName || `Vòng ${match.round}`}</Data></Cell>
        <Cell ss:StyleID="DataCenter"><Data ss:Type="String">${groupStr}</Data></Cell>
        <Cell ss:StyleID="DataLeft"><Data ss:Type="String">${homeName}</Data></Cell>
        <Cell ss:StyleID="DataCenter"><Data ss:Type="String">${playedTextHome}</Data></Cell>
        <Cell ss:StyleID="DataCenter"><Data ss:Type="String">${match.isBye ? "REST" : "VS"}</Data></Cell>
        <Cell ss:StyleID="DataCenter"><Data ss:Type="String">${playedTextAway}</Data></Cell>
        <Cell ss:StyleID="DataLeft"><Data ss:Type="String">${awayName}</Data></Cell>
        <Cell ss:StyleID="DataCenter"><Data ss:Type="String">${dateTimeStr}</Data></Cell>
        <Cell ss:StyleID="DataLeft"><Data ss:Type="String">${locationStr}</Data></Cell>
        <Cell ss:StyleID="DataLeft"><Data ss:Type="String">${refereeStr}</Data></Cell>
        <Cell ss:StyleID="DataCenter"><Data ss:Type="String">${homeCardsText}</Data></Cell>
        <Cell ss:StyleID="DataCenter"><Data ss:Type="String">${awayCardsText}</Data></Cell>
        <Cell ss:StyleID="DataLeft"><Data ss:Type="String">${redCardNotesStr}</Data></Cell>
      </Row>
    `;
  });

  xml += `
    </Table>
  </Worksheet>
  `;

  // ==================== SHEET 3: BẢNG XẾP HẠNG ====================
  xml += `
  <Worksheet ss:Name="Bảng xếp hạng tổng hợp">
    <Table ss:ExpandedColumnCount="12" ss:DefaultRowHeight="20">
      <Column ss:Width="50"/>
      <Column ss:Width="160"/>
      <Column ss:Width="60"/>
      <Column ss:Width="50"/>
      <Column ss:Width="50"/>
      <Column ss:Width="50"/>
      <Column ss:Width="50"/>
      <Column ss:Width="60"/>
      <Column ss:Width="60"/>
      <Column ss:Width="60"/>
      <Column ss:Width="90"/>
      <Column ss:Width="60"/>
      
      <Row ss:Height="30">
        <Cell ss:MergeAcross="11" ss:StyleID="TitleStyle">
          <Data ss:Type="String">BẢNG XẾP HẠNG TOÀN GIẢI</Data>
        </Cell>
      </Row>
      <Row />
  `;

  // Nếu có chia bảng, ta sẽ liệt kê bảng xếp hạng từng bảng đấu riêng rẽ cho chuyên nghiệp
  if (groups.length > 0) {
    groups.forEach((groupName) => {
      const groupStandings = calculateStandings(teams, matches, groupName);
      
      xml += `
      <Row ss:Height="25">
        <Cell ss:MergeAcross="11" ss:StyleID="TitleStyle">
          <Data ss:Type="String">BẢNG XẾP HẠNG BẢNG ${groupName}</Data>
        </Cell>
      </Row>
      <Row ss:Height="25">
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Hạng</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Đội bóng</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Trận</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Thắng</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Hòa</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Thua</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">BT</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">BP</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">HS</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Thẻ V/Đ</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Điểm Kỷ luật</Data></Cell>
        <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Điểm số</Data></Cell>
      </Row>
      `;

      groupStandings.forEach((std, idx) => {
        xml += `
        <Row ss:Height="20">
          <Cell ss:StyleID="DataCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
          <Cell ss:StyleID="DataLeft"><Data ss:Type="String">${std.teamName}</Data></Cell>
          <Cell ss:StyleID="DataCenter"><Data ss:Type="Number">${std.played}</Data></Cell>
          <Cell ss:StyleID="DataCenter"><Data ss:Type="Number">${std.won}</Data></Cell>
          <Cell ss:StyleID="DataCenter"><Data ss:Type="Number">${std.drawn}</Data></Cell>
          <Cell ss:StyleID="DataCenter"><Data ss:Type="Number">${std.lost}</Data></Cell>
          <Cell ss:StyleID="DataCenter"><Data ss:Type="Number">${std.goalsFor}</Data></Cell>
          <Cell ss:StyleID="DataCenter"><Data ss:Type="Number">${std.goalsAgainst}</Data></Cell>
          <Cell ss:StyleID="DataCenter"><Data ss:Type="Number">${std.goalDifference}</Data></Cell>
          <Cell ss:StyleID="DataCenter"><Data ss:Type="String">V:${std.yellowCards} | Đ:${std.redCards}</Data></Cell>
          <Cell ss:StyleID="DataCenter"><Data ss:Type="Number">${std.disciplinePoints}</Data></Cell>
          <Cell ss:StyleID="DataBold"><Data ss:Type="Number">${std.points}</Data></Cell>
        </Row>
        `;
      });
      xml += `<Row /><Row />`; // Khoảng trống giữa các bảng
    });
  } else {
    // Không chia bảng, chỉ có 1 bảng đấu chung
    const allStandings = calculateStandings(teams, matches);
    
    xml += `
    <Row ss:Height="25">
      <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Hạng</Data></Cell>
      <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Đội bóng</Data></Cell>
      <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Trận</Data></Cell>
      <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Thắng</Data></Cell>
      <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Hòa</Data></Cell>
      <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Thua</Data></Cell>
      <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">BT</Data></Cell>
      <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">BP</Data></Cell>
      <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">HS</Data></Cell>
      <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Thẻ V/Đ</Data></Cell>
      <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Điểm Kỷ luật</Data></Cell>
      <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Điểm số</Data></Cell>
    </Row>
    `;

    allStandings.forEach((std, idx) => {
      xml += `
      <Row ss:Height="20">
        <Cell ss:StyleID="DataCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
        <Cell ss:StyleID="DataLeft"><Data ss:Type="String">${std.teamName}</Data></Cell>
        <Cell ss:StyleID="DataCenter"><Data ss:Type="Number">${std.played}</Data></Cell>
        <Cell ss:StyleID="DataCenter"><Data ss:Type="Number">${std.won}</Data></Cell>
        <Cell ss:StyleID="DataCenter"><Data ss:Type="Number">${std.drawn}</Data></Cell>
        <Cell ss:StyleID="DataCenter"><Data ss:Type="Number">${std.lost}</Data></Cell>
        <Cell ss:StyleID="DataCenter"><Data ss:Type="Number">${std.goalsFor}</Data></Cell>
        <Cell ss:StyleID="DataCenter"><Data ss:Type="Number">${std.goalsAgainst}</Data></Cell>
        <Cell ss:StyleID="DataCenter"><Data ss:Type="Number">${std.goalDifference}</Data></Cell>
        <Cell ss:StyleID="DataCenter"><Data ss:Type="String">V:${std.yellowCards} | Đ:${std.redCards}</Data></Cell>
        <Cell ss:StyleID="DataCenter"><Data ss:Type="Number">${std.disciplinePoints}</Data></Cell>
        <Cell ss:StyleID="DataBold"><Data ss:Type="Number">${std.points}</Data></Cell>
      </Row>
      `;
    });
  }

  xml += `
    </Table>
  </Worksheet>
  `;

  // Kết thúc Workbook
  xml += `</Workbook>`;

  // Tải file về Client
  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bao_cao_giai_dau_bong_da.xls";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
