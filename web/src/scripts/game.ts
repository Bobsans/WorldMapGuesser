import type { CountryId, Direction, Outcome } from '@/types';
import { shuffle } from '@/scripts/utils';

export interface Game {
  ids: readonly CountryId[];
  rights: readonly CountryId[];
  wrongs: readonly CountryId[];
  lives: number;
  currentId: CountryId | null;
  status: 'ready' | 'playing' | Outcome;
}
export const createGame = (ids: readonly CountryId[] = []): Game => {
  return {
    ids: [...ids],
    rights: [],
    wrongs: [],
    lives: 3,
    currentId: null,
    status: 'ready',
  };
};
export const startGame = (
  ids: readonly CountryId[],
  random: () => number = Math.random,
): Game => {
  const order = shuffle(ids, random);
  return {
    ...createGame(order),
    currentId: order[0] ?? null,
    status: order.length ? 'playing' : 'ready',
  };
};
export const availableCountries = (game: Game): CountryId[] => {
  const answered = new Set([...game.rights, ...game.wrongs]);
  return game.ids.filter((id) => !answered.has(id));
};
export const changeCurrent = (game: Game, direction: Direction): Game => {
  if (game.status !== 'playing' || game.currentId === null) {
    return game;
  }
  const available = availableCountries(game);
  if (!available.length) {
    return game;
  }
  const index = available.indexOf(game.currentId);
  const next =
    (index + (direction === 'next' ? 1 : -1) + available.length) %
    available.length;
  return { ...game, currentId: available[next]! };
};
export const answerCountry = (game: Game, selected: CountryId): Game => {
  if (game.status !== 'playing' || game.currentId === null) {
    return game;
  }
  const available = availableCountries(game);
  if (!available.includes(selected)) {
    return game;
  }
  const expected = game.currentId;
  const index = available.indexOf(expected);
  const correct = expected === selected;
  const rights = correct ? [...game.rights, expected] : game.rights;
  const wrongs = correct ? game.wrongs : [...game.wrongs, expected];
  const lives = game.lives - Number(!correct);
  const remaining = available.filter((id) => id !== expected);
  const status =
    lives === 0 ? 'loss' : remaining.length === 0 ? 'win' : 'playing';
  return {
    ...game,
    rights,
    wrongs,
    lives,
    status,
    currentId:
      status === 'playing' ? remaining[index % remaining.length]! : null,
  };
};
