import type { Countries, Score } from '@/types';
import countriesUrl from '@assets/data/countries.json?url';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};
const readResponse = async (response: Response): Promise<unknown> => {
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}).`);
  }
  const data: unknown = await response.json();
  if (isRecord(data) && typeof data.error === 'string') {
    throw new Error(data.error);
  }
  return data;
};
export const loadCountries = async (
  signal?: AbortSignal,
): Promise<Countries> => {
  const data = await readResponse(await fetch(countriesUrl, { signal }));
  if (
    !isRecord(data) ||
    Object.keys(data).length === 0 ||
    !Object.values(data).every(
      (country) =>
        isRecord(country) &&
        typeof country.name === 'string' &&
        typeof country.path === 'string',
    )
  ) {
    throw new Error('The map data is invalid.');
  }
  return data as Countries;
};
const isScore = (value: unknown): value is Score => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.user === 'string' &&
    Number.isInteger(value.result) &&
    Number(value.result) >= 0 &&
    Number(value.result) <= 256 &&
    Number.isInteger(value.time) &&
    Number(value.time) >= 0 &&
    Array.isArray(value.rights) &&
    value.rights.every((id) => typeof id === 'string') &&
    Array.isArray(value.wrongs) &&
    value.wrongs.every((id) => typeof id === 'string')
  );
};
export const getScores = async (signal?: AbortSignal): Promise<Score[]> => {
  const data = await readResponse(
    await fetch('/get-top', { signal, cache: 'no-store' }),
  );
  if (!Array.isArray(data) || !data.every(isScore)) {
    throw new Error('The leaderboard response is invalid.');
  }
  return data;
};
export const sendScore = async (
  score: Score,
  signal?: AbortSignal,
): Promise<void> => {
  const data = await readResponse(
    await fetch('/send-score', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(score),
      signal,
    }),
  );
  if (!isRecord(data) || data.success !== true) {
    throw new Error('The result could not be saved.');
  }
};
