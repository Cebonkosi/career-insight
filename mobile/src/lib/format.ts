const dateFormat = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

export function formatDate(iso: string) {
  return dateFormat.format(new Date(iso));
}

/** "Closes in 3 days", "Closes today", "Closed" — for deadline badges. */
export function deadlineLabel(iso: string | null) {
  if (!iso) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.floor((new Date(iso).getTime() - startOfToday.getTime()) / msPerDay);

  if (days < 0) return { text: 'Closed', urgent: false, closed: true };
  if (days === 0) return { text: 'Closes today', urgent: true, closed: false };
  if (days <= 7) return { text: `Closes in ${days} day${days === 1 ? '' : 's'}`, urgent: true, closed: false };
  return { text: `Closes ${formatDate(iso)}`, urgent: false, closed: false };
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
