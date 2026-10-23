import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Countries, Score } from '@/types';
import type { Point } from '@/map/viewport';

const countries = JSON.parse(readFileSync(new URL('../../src/assets/data/countries.json', import.meta.url), 'utf8')) as Countries;

let submitted: Score[];

test.beforeEach(async ({ page }) => {
  submitted = [];

  await page.route('**/api/scores', async (route) => {
    if (route.request().method() === 'POST') {
      submitted.push(route.request().postDataJSON() as Score);
      await route.fulfill({ json: { success: true } });
      return;
    }

    await route.fulfill({
      json: [
        {
          user: 'Fixture Player',
          result: 1,
          time: 61,
          rights: ['RU'],
          wrongs: ['BR'],
        },
      ],
    });
  });
});

const start = async (page: Page): Promise<void> => {
  await page.goto('./');

  await expect(page.getByRole('button', { name: 'START', exact: true })).toBeDisabled();

  await page.getByRole('textbox', { name: 'Nickname' }).fill('Test Player');

  await expect(page.getByRole('button', { name: 'START', exact: true })).toBeEnabled();

  await page.getByRole('textbox', { name: 'Nickname' }).press('Enter');

  await expect(page.getByRole('dialog')).toHaveCount(0);
};

const countryPoint = async (page: Page, id: string, scope = '.game-app'): Promise<Point> => {
  const point = await page.evaluate(({ countryId, scope }) => {
    const shape = document.querySelector<SVGPathElement>(`${scope} path[data-country="${countryId}"]`);

    if (!shape) {
      return null;
    }

    const bounds = shape.getBBox();
    const matrix = shape.getScreenCTM();

    if (!matrix) {
      return null;
    }

    for (let row = 0; row < 40; row++) {
      for (let column = 0; column < 40; column++) {
        const local = new DOMPoint(bounds.x + ((column + 0.5) * bounds.width) / 40, bounds.y + ((row + 0.5) * bounds.height) / 40);

        if (!shape.isPointInFill(local)) {
          continue;
        }

        const screen = local.matrixTransform(matrix);
        const hit = document.elementFromPoint(screen.x, screen.y)?.closest<SVGPathElement>('[data-country]');

        if (hit?.dataset.country === countryId) {
          return { x: screen.x, y: screen.y };
        }
      }

    }

    return null;
  }, { countryId: id, scope });

  expect(point, `Visible map point for ${id}`).not.toBeNull();

  return point!;
};

const clickCountry = async (page: Page, id: string, touch = false): Promise<void> => {
  const point = await countryPoint(page, id);

  if (touch) {
    await page.touchscreen.tap(point.x, point.y);
  } else {
    await page.mouse.click(point.x, point.y);
  }
};

test('preserves 256 countries, keyboard navigation, lives, result saving and restart', async ({ page, isMobile }, testInfo) => {
  const errors: string[] = [];

  page.on('pageerror', (error) => errors.push(error.message));

  await start(page);

  await expect(page.locator('.game-app path[data-country]')).toHaveCount(256);

  await page.screenshot({ path: testInfo.outputPath('playing.png') });

  const initial = await page.locator('.game-header-country').innerText();

  await page.keyboard.press('ArrowRight');

  await expect(page.locator('.game-header-country')).not.toHaveText(initial);

  await page.keyboard.press('ArrowLeft');

  await expect(page.locator('.game-header-country')).toHaveText(initial);

  const wrongs: string[] = [];

  for (let index = 0; index < 3; index++) {
    const name = await page.locator('.game-header-country').innerText();
    const expected = Object.keys(countries).find((id) => countries[id]?.name === name)!;

    wrongs.push(expected);

    const selected = ['RU', 'CA', 'BR', 'AU'].find((id) => id !== expected && !wrongs.includes(id))!;

    await clickCountry(page, selected, isMobile);
  }

  await expect(page.getByRole('heading', { name: 'YOU LOSE!' })).toBeVisible();

  await expect.poll(() => submitted.length).toBe(1);

  expect(submitted[0]).toMatchObject({
    user: 'Test Player',
    result: 0,
    rights: [],
    wrongs,
  });

  await page.getByRole('button', { name: 'RESTART', exact: true }).click();

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.game-header-score')).toHaveText('0/256');
  await expect(page.getByLabel('3 lives remaining')).toBeVisible();
  expect(errors).toEqual([]);
});

test('finishes a complete fixture game with a win and does not accept extra answers', async ({ page, isMobile }) => {
  const fixture = Object.fromEntries(['BR', 'CA', 'AU'].map((id) => [id, countries[id]]));

  await page.route('**/countries-*.json', (route) => route.fulfill({ json: fixture }));
  await start(page);

  for (let index = 0; index < 3; index++) {
    const name = await page.locator('.game-header-country').innerText();
    const id = Object.keys(fixture).find((key) => fixture[key]?.name === name)!;
    await clickCountry(page, id, isMobile);
  }

  await expect(page.getByRole('heading', { name: 'YOU WIN!' })).toBeVisible();

  await expect.poll(() => submitted.length).toBe(1);

  expect(submitted[0]?.result).toBe(3);
  expect(submitted[0]?.rights).toHaveLength(3);
});

test('opens and closes the saved map without closing the welcome dialog', async ({ page }, testInfo) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'View map for Fixture Player' }).click();

  const preview = page.getByRole('dialog', { name: 'Saved game map' });

  await expect(preview.locator('path.map-right')).toHaveCount(1);
  await expect(preview.locator('path.map-wrong')).toHaveCount(1);

  const close = await preview.getByRole('button', { name: 'Close map preview' }).boundingBox();
  const map = await preview.locator('.score-preview-map').boundingBox();

  expect(close!.y + close!.height).toBeLessThanOrEqual(map!.y);
  expect(await preview.locator('.game-modal-close').evaluate((button) => getComputedStyle(button).backgroundColor)).toBe('rgba(0, 0, 0, 0)');

  const point = await countryPoint(page, 'BR', '.score-preview-map');

  await page.mouse.move(point.x, point.y);

  await expect(preview.getByRole('tooltip')).toHaveText(countries.BR!.name);

  await page.screenshot({ path: testInfo.outputPath('saved-map-tooltip.png') });

  await page.mouse.move(0, 0);

  await expect(preview.getByRole('tooltip')).toHaveCount(0);

  const original = await preview.locator('svg').getAttribute('viewBox');

  await preview.getByRole('button', { name: 'Zoom in', exact: true }).click();

  await expect(preview.locator('svg')).not.toHaveAttribute('viewBox', original!);

  await page.keyboard.press('Escape');

  await expect(preview).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Welcome to World Map Guesser' })).toBeVisible();
});

test('scrolls only the leaderboard in welcome and result dialogs with ten scores', async ({ page, isMobile }, testInfo) => {
  await page.route('**/api/scores', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      json: Array.from({ length: 10 }, (_, index) => ({
        user: `Fixture Player ${index + 1}`,
        result: 10 - index,
        time: 61 + index,
        rights: ['RU'],
        wrongs: ['BR'],
      })),
    });
  });
  await page.route('**/countries-*.json', (route) => route.fulfill({ json: { BR: countries.BR } }));
  await page.goto('./');

  const checkScroll = async (): Promise<void> => {
    const dialog = page.getByRole('dialog');

    await expect(dialog.locator('tbody tr')).toHaveCount(10);
    await expect(dialog).not.toHaveClass(/game-modal-enter-active/);

    expect(await dialog.evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);

    const list = dialog.locator('.score-table-scroll');

    expect(await list.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);

    await list.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    await expect(dialog.getByRole('button', { name: 'View map for Fixture Player 10', exact: true })).toBeInViewport();
    expect(await dialog.evaluate((element) => element.scrollTop)).toBe(0);
  };

  for (const width of [1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await checkScroll();
  }

  await page.screenshot({ path: testInfo.outputPath('welcome-long-list.png') });
  await page.getByRole('textbox', { name: 'Nickname' }).fill('Test Player');
  await page.getByRole('button', { name: 'START', exact: true }).click();

  await expect(page.getByRole('dialog')).toHaveCount(0);

  await clickCountry(page, 'BR', isMobile);

  await expect(page.getByRole('heading', { name: 'YOU WIN!' })).toBeVisible();

  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await checkScroll();

    await expect(page.getByRole('button', { name: 'RESTART', exact: true })).toBeInViewport();
  }

  await page.screenshot({ path: testInfo.outputPath('result-long-list.png') });
});

test('animates dialog entry and keeps the native dialog open throughout exit', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./');

  await expect(page.getByRole('button', { name: 'View map for Fixture Player' })).toBeEnabled();

  const entering = await page.getByRole('button', { name: 'View map for Fixture Player' }).evaluate(async (button) => {
    (button as HTMLButtonElement).click();
    await new Promise(requestAnimationFrame);

    return document.querySelector('[aria-label="Saved game map"]')?.classList.contains('game-modal-enter-active');
  });

  expect(entering).toBe(true);

  const preview = page.getByRole('dialog', { name: 'Saved game map' });

  await expect(preview).not.toHaveClass(/game-modal-enter-active/);

  const exit = await preview.evaluate(async (dialog) => {
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    await new Promise(requestAnimationFrame);

    return {
      open: (dialog as HTMLDialogElement).open,
      leaving: dialog.classList.contains('game-modal-leave-active'),
      duration: getComputedStyle(dialog).transitionDuration,
      content: dialog.textContent,
    };
  });

  expect(exit).toMatchObject({ open: true, leaving: true, duration: '0.18s, 0.18s' });
  expect(exit.content).toContain('Fixture Player');

  await expect(preview).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'View map for Fixture Player' }).click();

  await expect(preview).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(preview).toHaveCount(0);
});

test('loads every image with a same-origin image CSP', async ({ page }) => {
  const violations: string[] = [];

  page.on('console', (message) => {
    if (message.text().includes('Content Security Policy')) {
      violations.push(message.text());
    }
  });
  await page.route('**/', async (route) => {
    const response = await route.fetch();

    await route.fulfill({
      response,
      headers: { ...response.headers(), 'Content-Security-Policy': "img-src 'self'" },
    });
  });

  const imagesLoaded = async (): Promise<void> => {
    await expect.poll(() => page.locator('img').evaluateAll((images) => {
      return images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0);
    })).toBe(true);
  };

  await page.goto('./');
  await imagesLoaded();
  await start(page);
  await imagesLoaded();

  expect(violations).toEqual([]);
});

test('keeps the timer layout stable and releases button focus when navigating with arrows', async ({ page }) => {
  await page.clock.install();
  await start(page);
  await page.evaluate(() => document.fonts.ready);

  const positions = async (): Promise<(number | undefined)[]> => {
    const boxes = await Promise.all([
      '.game-header-restart', '.game-header-selector', '.game-header-lives', '.game-header-score', '.game-header-time',
    ].map((selector) => page.locator(selector).boundingBox()));

    return boxes.flatMap((box) => [box?.x, box?.width]);
  };

  const initial = await positions();

  for (const milliseconds of [11000, 59000, 3599000]) {
    await page.clock.fastForward(milliseconds);

    expect(await positions()).toEqual(initial);
  }

  const restart = page.getByRole('button', { name: 'Restart game' });

  await restart.click();

  for (const key of ['ArrowRight', 'ArrowLeft']) {
    await restart.focus();
    await page.keyboard.press(key);

    await expect(restart).not.toBeFocused();
  }

  await restart.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');

  await expect(restart).toBeFocused();
  expect(await restart.evaluate((button) => button.matches(':focus-visible'))).toBe(true);
});

test('stops the result timer when saving fails and keeps restart available', async ({ page, isMobile }) => {
  await page.clock.install();
  await page.route('**/api/scores', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }

    submitted.push(route.request().postDataJSON() as Score);
    await route.fulfill({ json: { error: 'Fixture save failure.' } });
  });

  await start(page);
  await page.clock.fastForward(5000);

  const processed: string[] = [];

  for (let index = 0; index < 3; index++) {
    const name = await page.locator('.game-header-country').innerText();
    const expected = Object.keys(countries).find((id) => countries[id]?.name === name)!;

    processed.push(expected);

    const selected = ['RU', 'CA', 'BR', 'AU'].find((id) => id !== expected && !processed.includes(id))!;

    await clickCountry(page, selected, isMobile);
  }

  await expect(page.getByText('Fixture save failure.', { exact: true })).toBeVisible();
  expect(submitted[0]?.time).toBeGreaterThanOrEqual(5);

  const timer = page.locator('.game-result-scores p').nth(1).locator('strong');
  const frozen = await timer.innerText();

  await page.clock.fastForward(60000);

  await expect(timer).toHaveText(frozen);

  await page.getByRole('button', { name: 'RESTART', exact: true }).click();

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('3 lives remaining')).toBeVisible();
  expect(submitted).toHaveLength(1);
});

test('does not select a country after dragging and supports wheel zoom', async ({ page }) => {
  await start(page);

  const point = await countryPoint(page, 'BR');

  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 30, point.y + 20, { steps: 5 });
  await page.mouse.up();

  await expect(page.locator('.game-header-score')).toHaveText('0/256');
  await expect(page.getByLabel('3 lives remaining')).toBeVisible();

  const svg = page.locator('.game-app .world-map-svg');
  const original = await svg.getAttribute('viewBox');

  await page.mouse.wheel(0, -400);

  await expect(svg).not.toHaveAttribute('viewBox', original!);

  await page.getByRole('button', { name: 'Fit world map' }).click();

  await expect(svg).toHaveAttribute('viewBox', original!);
});

test('keeps the map and dialogs usable at narrow and wide viewport sizes', async ({ page }, testInfo) => {
  await page.goto('./');

  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });

    await expect(page.getByRole('textbox', { name: 'Nickname' })).toBeVisible();

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.getByRole('dialog').evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth)).toBe(true);

    if (width === 320 || width === 1280) {
      await page.screenshot({
        path: testInfo.outputPath(`welcome-${width}.png`),
      });
    }
  }
});

test('handles a real two-finger pinch without answering a question', async ({ page, context, isMobile }) => {
  test.skip(!isMobile, 'Touch gesture coverage uses the mobile browser context.');

  await start(page);

  const svg = page.locator('.game-app .world-map-svg');
  const rect = (await svg.boundingBox())!;
  const x = rect.x + rect.width / 2;
  const y = rect.y + rect.height / 2;
  const original = await svg.getAttribute('viewBox');
  const client = await context.newCDPSession(page);

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: x - 30, y, id: 1 },
      { x: x + 30, y, id: 2 },
    ],
  });

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: x - 70, y, id: 1 },
      { x: x + 70, y, id: 2 },
    ],
  });

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });

  await expect(svg).not.toHaveAttribute('viewBox', original!);
  await expect(page.locator('.game-header-score')).toHaveText('0/256');
  await expect(page.getByLabel('3 lives remaining')).toBeVisible();

  await client.detach();
});
