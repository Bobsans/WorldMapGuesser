export const secondsToTime = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const parts = [minutes % 60, total % 60];

  if (hours > 0) {
    parts.unshift(hours % 24);
  }

  const clock = parts.map((part) => String(part).padStart(2, '0')).join(':');

  return days > 0 ? `${days}d ${clock}` : clock;
};
