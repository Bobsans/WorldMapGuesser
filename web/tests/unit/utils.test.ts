import { describe, expect, it } from 'vitest';
import { shuffle } from '@/utils/random';
import { secondsToTime } from '@/utils/time';

const ids = ['AD', 'BR', 'CA', 'DE'];

describe('utilities', () => {
  it('does not change its input while shuffling', () => {
    expect(shuffle(ids, () => 0)).not.toEqual(ids);
    expect(ids[0]).toBe('AD');
  });

  it.each([
    [0, '00:00'],
    [65, '01:05'],
    [3601, '01:00:01'],
    [86400, '1d 00:00:00'],
    [-2, '00:00'],
  ])('formats %s seconds', (seconds, expected) => {
    expect(secondsToTime(Number(seconds))).toBe(expected);
  });
});
