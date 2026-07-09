import sys
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
