import { useEffect, useState } from 'react';

export const PH_TIMEZONE = 'Asia/Manila';
export const PH_TIMEZONE_LABEL = 'Philippine Standard Time (GMT+8)';
const PH_OFFSET_MINUTES = 8 * 60;

const pad = (value) => String(value).padStart(2, '0');

const fromFallbackShift = (date) => {
  const shifted = new Date(date.getTime() + PH_OFFSET_MINUTES * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds()
  };
};

export const getPhDateParts = (date = new Date()) => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: PH_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).formatToParts(date);

    const values = {};
    parts.forEach(part => {
      values[part.type] = part.value;
    });

    const hour = Number(values.hour);
    return {
      year: Number(values.year),
      month: Number(values.month),
      day: Number(values.day),
      hour: hour === 24 ? 0 : hour,
      minute: Number(values.minute),
      second: Number(values.second)
    };
  } catch {
    return fromFallbackShift(date);
  }
};

export const getPhDateString = (date = new Date()) => {
  const { year, month, day } = getPhDateParts(date);
  return `${year}-${pad(month)}-${pad(day)}`;
};

export const getPhTimeString = (date = new Date()) => {
  const { hour, minute } = getPhDateParts(date);
  return `${pad(hour)}:${pad(minute)}`;
};

export const getPhDateTimeString = (date = new Date()) => {
  const { second } = getPhDateParts(date);
  return `${getPhDateString(date)} ${getPhTimeString(date)}:${pad(second)}`;
};

export const getPhTodayDateObject = (date = new Date()) => {
  const { year, month, day } = getPhDateParts(date);
  return new Date(year, month - 1, day);
};

export const formatPhDateObject = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('default', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};

export const normalizeDateString = (value) => {
  if (!value) return '';
  if (typeof value === 'object') return getPhDateString(value);

  const trimmed = String(value).trim();
  if (!trimmed) return '';

  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${pad(Number(month))}-${pad(Number(day))}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return '';
  return getPhDateString(parsed);
};

export const normalizeTimeString = (value) => {
  if (!value) return '';
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  return `${pad(Number(match[1]))}:${match[2]}`;
};

export const toDisplayTime = (value) => {
  const normalized = normalizeTimeString(value);
  if (!normalized) return '';
  const [hourText, minute] = normalized.split(':');
  const hour = Number(hourText);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${suffix}`;
};

export const phWallClockToMillis = (dateValue, timeValue) => {
  const dateText = normalizeDateString(dateValue);
  if (!dateText) return 0;

  const [year, month, day] = dateText.split('-').map(Number);
  const timeText = String(timeValue || '').trim();
  const match = timeText.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);

  let hour = 12;
  let minute = 0;
  if (match) {
    hour = Number(match[1]);
    minute = Number(match[2]);
    const meridiem = match[3] ? match[3].toUpperCase() : null;
    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
  }

  const utcMillis = Date.UTC(year, month - 1, day, hour, minute, 0);
  return utcMillis - PH_OFFSET_MINUTES * 60 * 1000;
};

export const isSamePhDay = (firstDate, secondDate = new Date()) =>
  normalizeDateString(firstDate) === getPhDateString(secondDate);

export const usePhClock = (intervalMs = 30000) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return undefined;
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return {
    now,
    nowMs: now.getTime(),
    todayStr: getPhDateString(now),
    timeStr: getPhTimeString(now)
  };
};
