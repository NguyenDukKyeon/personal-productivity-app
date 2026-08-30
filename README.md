# Smart Planner OS — High Discipline Personal Productivity Workstation

> Hệ thống quản trị năng suất và rèn luyện kỷ luật cá nhân thế hệ mới, được thiết kế theo triết lý **High Discipline, Low Friction** (Kỷ luật cao, Giảm thiểu ma sát), loại bỏ các yếu tố gamification ảo và tập trung 100% vào dữ liệu thực thi thực tế.

---

## 🌟 Tính Năng Cốt Lõi (5 Trụ Cột Kỷ Luật)

### 1. ⚡ Today Workstation (Daily Execution)
- **Quỹ giờ khả dụng (Capacity Gauge):** Thiết lập quota giờ làm việc mỗi ngày (4h, 6h, 8h...), cảnh báo quá tải đỏ (*Overbooked Alert*) khi xếp lịch vượt quota.
- **Top 3 Sống Còn (Eat The Frog):** Đóng đinh 1-3 việc quan trọng nhất ngày (#1, #2, #3) với nút kích hoạt Focus tức thì và confetti mừng hoàn thành trọn vẹn.
- **Thanh nhập liệu thông minh (Smart Natural Language Quick Capture - Phím `N`):** Nhận diện cú pháp tự nhiên: `~45m`, `!p1`, `@09:00`, `/project-name`, `#today`.
- **Lưới Khung Giờ 24h (Interactive Timeblock):** Chế độ xem Lưới theo giờ (06:00 - 22:00) và Danh sách, bấm vào khoảng trống để xếp lịch ngay.
- **Bảng điều khiển lệnh toàn cục (Command Palette `⌘K` / `Ctrl+K`):** Tìm kiếm siêu tốc xuyên suốt dự án và thao tác nhanh 1 chạm.

### 2. 🧠 Bài Ôn Tập Ngắt Quãng (Spaced Repetition Ebbinghaus Engine)
- Tự động quét các bài học đã hoàn thành và nhắc nhở ôn tập ngắt quãng theo các mốc khoa học: **1 ngày (24h)**, **3 ngày**, **7 ngày (1 tuần)**, **14 ngày (2 tuần)**, **30 ngày (1 tháng)**.
- Quản lý ngân sách ôn tập tối đa 20% quỹ giờ ngày, không làm quá tải bài mới.
- Nút **"Ôn 15m (Focus)"** mở phiên Pomodoro ôn tập tức thì.

### 3. 🧘 Deep Work Focus Station (Focus Engine)
- **Đồng hồ đa chế độ:** Pomodoro (25/5, 50/10 tùy chỉnh), Flow Mode (đếm tiến), Break Mode (nghỉ ngắn 5m / nghỉ dài 15m).
- **Bộ sinh âm thanh nền thực nghiệm (Procedural Ambient Soundscapes - Web Audio API):** 🌧️ Mưa rơi (*Rain*), 🌊 Sóng biển (*Ocean Waves*), ☕ Quán cafe (*Cafe Murmur*), 💨 Tiếng ồn trắng (*White Noise*), 🧠 Sóng não Gamma 40Hz (*Binaural Beats*). 100% offline, không cần tải file nặng.
- **Sổ xả não (Distraction Braindump):** Ghi chú ý nghĩ vụt qua kèm nút `+ Tạo Task` chuyển đổi trực tiếp thành công việc.
- **Widget nổi toàn cục (Global Focus Overlay - PiP):** Đếm thời gian xuyên suốt mọi trang.

### 4. 📊 Atomic Habits & Routines (Kỷ Luật Thói Quen)
- Phân nhóm Routine: Sáng (*Morning*), Chiều (*Afternoon*), Tối (*Evening*), Linh hoạt (*Anytime*).
- **Theo dõi định lượng (Quantitative Tracking):** Hỗ trợ đếm trang sách, phút thiền, ml nước, số lần kèm nút `+` / `-` vi mô.
- **Quy tắc "Never Miss Twice":** Cảnh báo cam nhấp nháy khi lỡ 1 ngày để bảo vệ chuỗi.
- Đo lường **Streak liên tục** và **Tỷ lệ kiên định 30 ngày (% Consistency Rate)**.

### 5. 📅 Flexible Multi-Day Planner & Learning Roadmap
- **Bảng Kanban 7 ngày + Cột Backlog:** Điều hướng tuần trước/sau, nút chuyển ngày nhanh `+1 ngày →`, quota bar cho từng ngày.
- **Quản lý môn học 3 cấp độ (Course → Topic → Lesson):** Nhập bài học hàng loạt (*Bulk Add Lessons*).
- **Thuật toán dự báo (Forecast Engine & What-If Simulator):** Thanh trượt 0.5h - 10h/ngày dự đoán ngày học hết bài.
- **AI Coach & Task Decomposer:** Tích hợp Google Gemini (Gemini 3.7 Flash, 3.5 Flash, 2.5 Flash) phân tích tuần và bẻ nhỏ mục tiêu.
- **Di trú dữ liệu (Legacy Migration):** Import & Export JSON toàn diện từ phiên bản Smart Planner cũ.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling & Design System:** Tailwind CSS v4 + Lucide Icons + Framer Motion (Chuẩn Linear / Things 3 Anti-AI craft)
- **Theme:** Obsidian Dark (`#090a0f`) & Clean Studio Slate (`#f8fafc`) với Zero-FOUC ThemeProvider
- **State & Storage:** Zustand + LocalStorage / IndexedDB (Hỗ trợ Guest Mode & Offline)
- **Audio:** Web Audio API Procedural Synthesizer
- **Testing:** Vitest Test Suite (100% Edge Cases Coverage)

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ

```bash
# 1. Cài đặt dependencies
npm install

# 2. Khởi chạy máy chủ phát triển
npm run dev

# 3. Mở trình duyệt tại http://localhost:3000

# 4. Chạy kiểm thử tự động (Unit Tests)
npm test

# 5. Kiểm tra kiểu dữ liệu TypeScript
npm run typecheck
```

---

## 📄 Bản Quyền & Giấy Phép

Phát triển bởi **NguyenDukKyeon**. Giấy phép MIT.
