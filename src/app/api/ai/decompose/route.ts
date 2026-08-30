import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  let taskTitle = 'Nhiệm vụ mới';
  try {
    const body = await req.json();
    taskTitle = body.taskGoal || body.taskTitle || taskTitle;
    const { model, customApiKey, userApiKey } = body;

    const apiKey = userApiKey || customApiKey || process.env.GEMINI_API_KEY;

    const fallbackSteps = [
      { title: `Đọc tài liệu & Nghiên cứu cốt lõi: ${taskTitle}`, estimatedMinutes: 45 },
      { title: `Phác thảo cấu trúc & giải pháp kỹ thuật: ${taskTitle}`, estimatedMinutes: 60 },
      { title: `Thực thi module chính (Giai đoạn 1)`, estimatedMinutes: 90 },
      { title: `Kiểm thử, nghiệm thu & tinh chỉnh`, estimatedMinutes: 45 },
    ];

    if (!apiKey) {
      return NextResponse.json({
        subtasks: fallbackSteps,
        steps: fallbackSteps,
      });
    }

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash'}:generateContent?key=${apiKey}`;

    const prompt = `Phân rã mục tiêu lớn sau đây thành 3 đến 5 bước hành động cụ thể, khả thi, kèm theo thời lượng ước tính bằng phút (từ 15 đến 90 phút cho mỗi bước):
"${taskTitle}"

Yêu cầu trả về DUY NHẤT một JSON hợp lệ theo định dạng sau (không kèm markdown format ngoài json):
{
  "subtasks": [
    { "title": "Tên bước hành động cụ thể", "estimatedMinutes": 45 }
  ]
}`;

    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.statusText}`);
    }

    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    const subtasks = (parsed.subtasks || parsed.steps || []).map((s: { title: string; estimatedMinutes?: number; minutes?: number }) => ({
      title: s.title,
      estimatedMinutes: s.estimatedMinutes || s.minutes || 45,
    }));

    return NextResponse.json({
      subtasks: subtasks.length > 0 ? subtasks : fallbackSteps,
      steps: subtasks.length > 0 ? subtasks : fallbackSteps,
    });
  } catch {
    const fallbackSteps = [
      { title: `Nghiên cứu & Chuẩn bị tài liệu: ${taskTitle}`, estimatedMinutes: 45 },
      { title: `Thiết kế & Phác thảo chi tiết`, estimatedMinutes: 60 },
      { title: `Thực thi phần việc chính`, estimatedMinutes: 90 },
      { title: `Hoàn thiện & Nghiệm thu`, estimatedMinutes: 45 },
    ];
    return NextResponse.json({
      subtasks: fallbackSteps,
      steps: fallbackSteps,
    });
  }
}
