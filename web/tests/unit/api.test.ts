import { afterEach, describe, expect, it, vi } from 'vitest';
import { getScores, loadCountries, sendScore } from '@/scripts/api';
import type { Score } from '@/types';

const score: Score = {
  user: 'Player',
  result: 1,
  time: 20,
  rights: ['AD'],
  wrongs: ['BR'],
};
afterEach(() => vi.unstubAllGlobals());
describe('legacy API compatibility', () => {
  it('uses root API paths instead of concatenating the current page URL', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json([score]));
    vi.stubGlobal('fetch', fetch);
    expect(await getScores()).toEqual([score]);
    expect(fetch).toHaveBeenCalledWith(
      '/get-top',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });
  it('preserves the existing score payload and checks success', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ success: true }));
    vi.stubGlobal('fetch', fetch);
    await sendScore(score);
    expect(fetch).toHaveBeenCalledWith(
      '/send-score',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(score),
      }),
    );
  });
  it('does not report a legacy error response as a saved result', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ error: 'Invalid data.' })),
    );
    await expect(sendScore(score)).rejects.toThrow('Invalid data.');
  });
  it('rejects malformed leaderboard records and HTTP errors', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json([{ user: 'broken' }]))
      .mockResolvedValueOnce(new Response('', { status: 503 }));
    vi.stubGlobal('fetch', fetch);
    await expect(getScores()).rejects.toThrow('invalid');
    await expect(getScores()).rejects.toThrow('503');
  });
  it('loads the map as a separate asset and validates its shape', async () => {
    const data = { AD: { name: 'Andorra', path: 'M 0 0' } };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(data))
      .mockResolvedValueOnce(Response.json({ AD: null }));
    vi.stubGlobal('fetch', fetch);
    expect(await loadCountries()).toEqual(data);
    await expect(loadCountries()).rejects.toThrow('map data is invalid');
  });
});
