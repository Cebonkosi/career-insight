// en-GB gives "20 Oct 2026" like the mockups; en-ZA zero-pads the day ("06 Nov").
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const longDateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export function formatDate(iso: string) {
  return dateFormat.format(new Date(iso));
}

export function formatLongDate(iso: string) {
  return longDateFormat.format(new Date(iso));
}

/**
 * Deadline line for cards: "Closes 20 Oct 2026 · 8 days left" (days only in the
 * last two weeks, as in the mockups), "Closes today", or "Closed".
 */
export function deadlineLabel(iso: string | null) {
  if (!iso) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.floor((new Date(iso).getTime() - startOfToday.getTime()) / msPerDay);

  if (days < 0) return { text: 'Closed', closed: true };
  if (days === 0) return { text: 'Closes today', closed: false };
  const left = days <= 14 ? ` · ${days} day${days === 1 ? '' : 's'} left` : '';
  return { text: `Closes ${formatDate(iso)}${left}`, closed: false };
}

/** [10, 11, 12] → "Grade 10–12", [11] → "Grade 11", [9, 11] → "Grades 9, 11". */
export function gradeRange(grades: number[] | null) {
  if (!grades?.length) return null;
  const sorted = [...grades].sort((a, b) => a - b);
  if (sorted.length === 1) return `Grade ${sorted[0]}`;
  const contiguous = sorted.every((g, i) => i === 0 || g === sorted[i - 1] + 1);
  return contiguous
    ? `Grade ${sorted[0]}–${sorted[sorted.length - 1]}`
    : `Grades ${sorted.join(', ')}`;
}

/** Splits free-text requirements into checklist lines, dropping bullets and blanks. */
export function requirementLines(text: string | null) {
  if (!text) return [];
  return text
    .split(/\r?\n|;/)
    .map((line) => line.replace(/^\s*([-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

/** "…/forms/future-makers%20application.pdf?token=x" → "future-makers application.pdf". */
export function fileNameFromUrl(url: string) {
  try {
    const path = new URL(url).pathname;
    return decodeURIComponent(path.slice(path.lastIndexOf('/') + 1)) || 'Application form';
  } catch {
    return 'Application form';
  }
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
