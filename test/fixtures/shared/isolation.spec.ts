// A second file: each test file gets a fresh bridge.
import { bridge } from '../../../dist/vitest/index.js';
import { expect, it } from 'vitest';
import { loadFees } from './app';

it('does not see handlers from other files', async () => {
  expect(bridge.toasts()).toEqual([]);
  await expect(loadFees()).rejects.toThrow('No handler for Admin GraphQL operation "FeeRules"');
});
