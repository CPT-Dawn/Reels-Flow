import { expect, it } from 'vitest';
import { page } from 'vitest/browser';

// Proves the runner drives a real browser with real layout.
it('renders and measures an element', async () => {
  document.body.innerHTML = '<div style="width: 120px; height: 40px">Reels Flow</div>';

  await expect.element(page.getByText('Reels Flow')).toBeVisible();
  expect(document.body.firstElementChild!.getBoundingClientRect().width).toBe(120);
});
