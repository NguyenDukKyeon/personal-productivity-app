import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { model, customApiKey, userApiKey, weeklyData, metrics } = body;

    const apiKey = userApiKey || customApiKey || process.env.GEMINI_API_KEY;

    // Calculate summary statistics
    let totalDeepMins = 0;
    let avgScore = 0;
    let daysCount = 7;

    if (Array.isArray(weeklyData) && weeklyData.length > 0) {
      daysCount = weeklyData.length;
      totalDeepMins = weeklyData.reduce((acc, d) => acc + (d.deepWorkMinutes || 0), 0);
      avgScore = Math.round(weeklyData.reduce((acc, d) => acc + (d.disciplineScore || 0), 0) / daysCount);
    } else if (metrics) {
      totalDeepMins = metrics.totalWeeklyDeepMins || 0;
      avgScore = metrics.avgDisciplineScore || 0;
    }

    if (!apiKey) {
      return NextResponse.json({
        advice:
          `### 🎯 Nhận định Hiệu suất & Kỷ luật Tuần này (${model || 'Gemini 3.7 Flash'}):\n\n` +
          `1. **Thời gian Deep Work (${Math.floor(totalDeepMins / 60)}h ${totalDeepMins % 60}m trong 7 ngày):** ` +
          (totalDeepMins >= 600
            ? 'Bạn duy trì tổng lượng giờ tập trung sâu rất ấn tượng. Phong độ làm việc đầu ngày có hiệu suất cao nhất.'
            : 'Thời lượng Deep Work cần được đẩy mạnh hơn vào các khung giờ vàng buổi sáng để tránh phân mảnh tư duy.') +
          `\n\n2. **Điểm Kỷ luật Trung bình (${avgScore}%):** ` +
          (avgScore >= 75
            ? 'Chỉ số kỷ luật ở mức rất tốt! Tỷ lệ hoàn thành Top 3 nhiệm vụ trọng tâm và thói quen đạt độ ổn định cao.'
            : 'Chỉ số kỷ luật đang bị ảnh hưởng bởi việc dồn việc vào cuối ngày. Cần thiết lập quota giờ chặt chẽ hơn.') +
          `\n\n3. **Thói quen Atomic Habits:** Cần tiếp tục duy trì nguyên tắc "Never Miss Twice" (Không bỏ lỡ 2 ngày liên tiếp) để bảo vệ đà quán tính tâm lý.\n\n` +
          `💡 **Lời khuyên hành động:** Trước khi bắt đầu ngày mới, hãy chọn ra duy nhất 3 việc sống còn (Top 3 MITs) và khởi động ngay 1 phiên Pomodoro 25 phút không ngắt quãng.`,
      });
    }

    // Call Google Gemini REST API directly
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash'}:generateContent?key=${apiKey}`;

    const prompt = `Bạn là một AI Productivity & Discipline Coach hàng đầu thế giới (kết hợp các nguyên lý từ Atomic Habits của James Clear, Deep Work của Cal Newport và Eat That Frog của Brian Tracy).
Dưới đây là dữ liệu thực thi của người dùng trong 7 ngày qua:
- Tổng thời gian Deep Work thực tế: ${totalDeepMins} phút (${Math.floor(totalDeepMins / 60)} giờ ${totalDeepMins % 60} phút)
- Điểm Kỷ luật trung bình (Discipline Score): ${avgScore}%

Hãy đưa ra bài nhận định súc tích, trung thực, mang tính xây dựng cao bằng tiếng Việt theo format:
1. Đánh giá thời gian Deep Work và phong độ tập trung
2. Phân tích điểm nghẽn (Overbooking, thói quen dễ bỏ lỡ, hoặc sự trì hoãn)
3. Lời khuyên hành động cụ thể cho tuần tới`;

    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.statusText}`);
    }

    const result = await response.json();
    const generatedText =
      result.candidates?.[0]?.content?.parts?.[0]?.text || 'Không nhận được phản hồi từ AI.';

    return NextResponse.json({ advice: generatedText });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi xử lý yêu cầu AI.';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
