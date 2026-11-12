// Shared by the jsdom and Browser Mode fixtures.
import { bridge } from '../../../dist/vitest/index.js';
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

  it('reports navigation, sharing, printing and app windows to the admin', async () => {
    const start = location.href;
    history.replaceState(history.state, '', '?tab=fees');
    expect(new URL(bridge.navigation().url!).search).toBe('?tab=fees');
    history.replaceState(history.state, '', start);

    expect(window.open('shopify://admin/orders', '_top')).toBeNull();
    expect(bridge.navigation().adminPath).toBe('/orders');

    await navigator.share({ title: 'Fees', url: '/fees' });
    expect(bridge.shares()).toEqual([{ title: 'Fees', url: new URL('/fees', location.href).href }]);

    window.print();
    expect(bridge.prints()).toBe(1);

    document.body.insertAdjacentHTML('beforeend', '<s-app-window id="editor" src="/editor"></s-app-window>');
    const appWindow = document.getElementById('editor') as unknown as SAppWindowElement & HTMLElement;
    await vi.waitFor(() => expect(bridge.appWindow('editor')).toBeDefined());
    await appWindow.show?.();
    expect(bridge.appWindow('editor')?.open).toBe(true);
    appWindow.remove();
  });
});
