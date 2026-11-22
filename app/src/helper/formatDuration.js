// Durations are stored as free text ("2", "2-4 hours", "30 mins").
// Add "hours" only when the user typed just a number or range.
export const formatDuration = (duration, fallback = 'Flexible') => {
  if (!duration) return fallback;
  const text = String(duration).trim();
  return /^[\d.\s-]+$/.test(text) ? `${text} hours` : text;
};
