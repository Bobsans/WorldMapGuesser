import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { answerCountry, availableCountries, changeCurrent, createGame, startGame } from '@/game/state';

const ids = ['AD', 'BR', 'CA', 'DE'];

describe('game rules', () => {
  it('starts with three lives and a reproducible permutation without changing the catalog', () => {
    const game = startGame(ids, () => 0.5);

    expect(game.lives).toBe(3);
    expect(game.status).toBe('playing');
    expect(new Set(game.ids)).toEqual(new Set(ids));
    expect(startGame(ids, () => 0.5)).toEqual(game);
    expect(ids).toEqual(['AD', 'BR', 'CA', 'DE']);
  });

  it('does not start an empty game or answer before starting', () => {
    const ready = createGame(ids);

    expect(answerCountry(ready, 'AD')).toBe(ready);
    expect(startGame([]).status).toBe('ready');
  });

  it('wraps question navigation and skips answered questions', () => {
    let game = startGame(ids, () => 0.999);

    expect(changeCurrent(game, 'prev').currentId).toBe('DE');
    expect(changeCurrent(changeCurrent(game, 'prev'), 'next').currentId).toBe('AD');

    game = answerCountry(game, 'AD');

    expect(game.currentId).toBe('BR');
    expect(changeCurrent(game, 'prev').currentId).toBe('DE');
    expect(availableCountries(game)).not.toContain('AD');
  });

  it('marks the expected country red for a wrong answer and consumes one life', () => {
    const game = answerCountry(startGame(ids, () => 0.999), 'BR');

    expect(game.wrongs).toEqual(['AD']);
    expect(game.rights).toEqual([]);
    expect(game.currentId).toBe('BR');
    expect(game.lives).toBe(2);
  });

  it('ignores processed or unknown map targets', () => {
    const game = answerCountry(startGame(ids, () => 0.999), 'AD');

    expect(answerCountry(game, 'AD')).toBe(game);
    expect(answerCountry(game, 'invalid')).toBe(game);
  });

  it('finishes immediately on the third error and ignores further actions', () => {
    let game = startGame(ids, () => 0.999);

    for (let count = 0; count < 3; count++) {
      const wrong = availableCountries(game).find((id) => id !== game.currentId)!;
      game = answerCountry(game, wrong);
    }

    expect(game.status).toBe('loss');
    expect(game.lives).toBe(0);
    expect(game.wrongs).toHaveLength(3);
    expect(game.currentId).toBeNull();
    expect(answerCountry(game, 'DE')).toBe(game);
    expect(changeCurrent(game, 'next')).toBe(game);
  });

  it('wins after every question, including a catalog containing only one country', () => {
    const catalog: unknown = JSON.parse(readFileSync(new URL('../../src/assets/data/countries.json', import.meta.url), 'utf8'));

    expect(Object.keys(catalog as object)).toHaveLength(256);

    let game = startGame(Object.keys(catalog as object));

    while (game.currentId) {
      game = answerCountry(game, game.currentId);
    }

    expect(game.status).toBe('win');
    expect(game.rights).toHaveLength(256);
    expect(game.lives).toBe(3);
    expect(answerCountry(startGame(['AD']), 'AD').status).toBe('win');
  });

  it('finishes a completed catalog with mistakes if lives remain', () => {
    let game = answerCountry(startGame(['AD', 'BR'], () => 0.999), 'BR');

    game = answerCountry(game, 'BR');

    expect(game.status).toBe('win');
    expect(game.rights).toEqual(['BR']);
    expect(game.lives).toBe(2);
  });

  it('restarts with no previous answers or terminal state', () => {
    const previous = answerCountry(startGame(ids), 'BR');
    const next = startGame(previous.ids);

    expect(next.rights).toEqual([]);
    expect(next.wrongs).toEqual([]);
    expect(next.lives).toBe(3);
  });
});
