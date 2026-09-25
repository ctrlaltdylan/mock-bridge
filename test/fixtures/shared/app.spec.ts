// Shared by the jsdom and Browser Mode fixtures.
import { bridge } from '../../../dist/vitest/index.mjs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadFees, pickProduct, saveFee } from './app';

beforeAll(() => {
  // Persists for the whole file.
  bridge.graphql('FeeRules', ({ variables }) => ({ data: { metaobjects: { nodes: [{ id: `${variables?.type}-1` }] } } }));
});

describe('app', () => {
  it('loads fees through shopify:admin direct API access', async () => {
    expect(await loadFees()).toEqual([{ id: 'fee-1' }]);
    expect(bridge.adminRequests.map(request => request.operationName)).toEqual(['FeeRules']);
  });

  it('saves, hides the save bar and toasts', async () => {
    bridge.graphql('FeeSave', ({ variables }) => ({ data: { save: { id: `saved-${variables?.title}` } } }));
    await shopify.saveBar.show('fee-form');

    expect(await saveFee('Excise')).toBe('saved-Excise');
    expect(bridge.toasts().map(toast => toast.message)).toEqual(['Saved']);
    expect(bridge.saveBar('fee-form')?.visible).toBe(false);
    await vi.waitFor(() => expect(bridge.loading()).toBe(false));
  });

  it('resets per-test handlers and state after each test', async () => {
    expect(bridge.toasts()).toEqual([]);
    expect(bridge.adminRequests).toEqual([]);
    await expect(saveFee('Again')).rejects.toThrow('No handler for Admin GraphQL operation "FeeSave"');
    // Top-level handlers survive.
    expect(await loadFees()).toEqual([{ id: 'fee-1' }]);
  });

  it('answers the resource picker', async () => {
    bridge.resourcePicker([{ id: 'gid://shopify/Product/1' }]);
    expect(await pickProduct()).toBe('gid://shopify/Product/1');
  });

  it('issues id tokens for the configured shop', async () => {
    expect(shopify.config.shop).toBe('fixture.myshopify.com');
    const [, payload] = (await shopify.idToken()).split('.');
    expect(JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))).toMatchObject({ dest: 'https://fixture.myshopify.com' });
  });
});
