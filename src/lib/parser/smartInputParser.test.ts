import { describe, it, expect } from 'vitest';
import { parseSmartTaskInput } from './smartInputParser';

describe('Smart Natural Language Task Parser Edge Cases', () => {
  it('parses empty or whitespace-only input safely', () => {
    const res = parseSmartTaskInput('');
    expect(res.cleanTitle).toBe('Nhiệm vụ mới');
    expect(res.estimatedMinutes).toBe(30);
    expect(res.priority).toBe('p3_medium');
  });

  it('parses Vietnamese unicode task titles with complex diacritics', () => {
    const res = parseSmartTaskInput('Luyện tập giải đề thi thử ĐGNL ~45m !p1');
    expect(res.cleanTitle).toBe('Luyện tập giải đề thi thử ĐGNL');
    expect(res.estimatedMinutes).toBe(45);
    expect(res.priority).toBe('p1_urgent');
  });

  it('parses various duration syntax (~45m, ~1.5h, ~90, ~2hours)', () => {
    expect(parseSmartTaskInput('Đọc sách ~45m').estimatedMinutes).toBe(45);
    expect(parseSmartTaskInput('Học lập trình ~1.5h').estimatedMinutes).toBe(90);
    expect(parseSmartTaskInput('Viết báo cáo ~2h').estimatedMinutes).toBe(120);
    expect(parseSmartTaskInput('Thiền ~15min').estimatedMinutes).toBe(15);
  });

  it('parses all priority variations (!p1, !p2, !p3, !p4, !urgent, !high, !med, !low)', () => {
    expect(parseSmartTaskInput('Task !p1').priority).toBe('p1_urgent');
    expect(parseSmartTaskInput('Task !urgent').priority).toBe('p1_urgent');
    expect(parseSmartTaskInput('Task !p2').priority).toBe('p2_high');
    expect(parseSmartTaskInput('Task !high').priority).toBe('p2_high');
    expect(parseSmartTaskInput('Task !p3').priority).toBe('p3_medium');
    expect(parseSmartTaskInput('Task !med').priority).toBe('p3_medium');
    expect(parseSmartTaskInput('Task !p4').priority).toBe('p4_low');
    expect(parseSmartTaskInput('Task !low').priority).toBe('p4_low');
  });

  it('parses time slots with 12h/24h and am/pm notation (@08:30, @9:00, @2pm, @14:00)', () => {
    expect(parseSmartTaskInput('Task @08:30').scheduledTimeStart).toBe('08:30');
    expect(parseSmartTaskInput('Task @9:00').scheduledTimeStart).toBe('09:00');
    expect(parseSmartTaskInput('Task @2pm').scheduledTimeStart).toBe('14:00');
    expect(parseSmartTaskInput('Task @14:15').scheduledTimeStart).toBe('14:15');
  });

  it('parses dates (#today, #tomorrow, #backlog, #2026-09-01)', () => {
    const today = parseSmartTaskInput('Task #today');
    expect(today.scheduledDate).toBeDefined();

    const backlog = parseSmartTaskInput('Task #backlog');
    expect(backlog.scheduledDate).toBeNull();

    const customDate = parseSmartTaskInput('Task #2026-09-15');
    expect(customDate.scheduledDate).toBe('2026-09-15');
  });

  it('parses projects with slash and plus prefixes (/React-NextJS, +ToanCaoCap)', () => {
    expect(parseSmartTaskInput('Học Server Components /React-NextJS').projectQuery).toBe('React-NextJS');
    expect(parseSmartTaskInput('Làm bài tập tích phân +ToanCaoCap').projectQuery).toBe('ToanCaoCap');
  });

  it('handles combined complex string with all attributes at once', () => {
    const res = parseSmartTaskInput('Ôn thi cuối kỳ môn Giải tích ~90m !p1 @14:00 #today /Toan-1');
    expect(res.cleanTitle).toBe('Ôn thi cuối kỳ môn Giải tích');
    expect(res.estimatedMinutes).toBe(90);
    expect(res.priority).toBe('p1_urgent');
    expect(res.scheduledTimeStart).toBe('14:00');
    expect(res.projectQuery).toBe('Toan-1');
  });
});
