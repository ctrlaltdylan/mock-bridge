// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifySessionToken } from '../auth/jwt';
import { createTestBridge, type TestBridge } from './index';

const graphql = (query: string, variables?: object) =>
  fetch('shopify:admin/api/2025-10/graphql.json', { method: 'POST', body: JSON.stringify({ query, variables }) });

describe('createTestBridge', () => {
  let bridge: TestBridge;
  let uninstall: () => void;
  let realFetch: typeof fetch;

  beforeEach(() => {
    realFetch = vi.fn(async () => new Response('app backend')) as unknown as typeof fetch;
    vi.stubGlobal('fetch', realFetch);
    bridge = createTestBridge({ shop: 'my-shop.myshopify.com', apiKey: 'key', clientSecret: 'secret' });
    uninstall = bridge.install(globalThis);
  });

  afterEach(() => {
    uninstall();
    bridge.dispose();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('installs window.shopify with the configured shop', () => {
    expect(window.shopify).toBe(bridge.shopify);
    expect(shopify.config).toEqual({ apiKey: 'key', shop: 'my-shop.myshopify.com', locale: 'en' });
    expect(shopify.environment.embedded).toBe(true);
  });

  it('signs id tokens with the client secret', async () => {
    const payload = await verifySessionToken(await shopify.idToken(), 'secret');
    expect(payload).toMatchObject({ aud: 'key', dest: 'https://my-shop.myshopify.com' });
  });

  it('records toasts, loading, save bars and modals', async () => {
    const id = shopify.toast.show('Saved', { isError: true, onAction: () => {} });
    shopify.loading(true);
    await shopify.saveBar.show('form');
    await shopify.modal.show('confirm');
    await vi.waitFor(() => expect(bridge.loading()).toBe(true));

    expect(bridge.toasts()).toEqual([{ id, message: 'Saved', isError: true, duration: undefined, action: undefined }]);
    expect(bridge.saveBar('form')).toMatchObject({ visible: true });
    expect(bridge.modal('confirm')).toMatchObject({ open: true });

    await shopify.saveBar.hide('form');
    expect(bridge.saveBar('form')?.visible).toBe(false);
  });

  it('answers GraphQL operations by name, including shopify: direct API access', async () => {
    const handler = vi.fn(() => ({ data: { shop: { name: 'Mock' } } }));
    bridge.graphql('ShopName', handler);

    const response = await graphql('query ShopName($id: ID) { shop { name } }', { id: '1' });

    expect(await response.json()).toEqual({ data: { shop: { name: 'Mock' } } });
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ operationName: 'ShopName', variables: { id: '1' }, method: 'POST' }));
    expect(bridge.adminRequests).toHaveLength(1);
    expect(realFetch).not.toHaveBeenCalled();
  });

  it('falls back to a * handler and passes Response objects through', async () => {
    bridge.graphql('*', () => new Response('nope', { status: 500 }));
    expect((await graphql('mutation Anything { x }')).status).toBe(500);
  });

  it('rejects unhandled operations with a hint', async () => {
    await expect(graphql('query Missing { x }')).rejects.toThrow(`bridge.graphql('Missing'`);
  });

  it('answers REST requests by method and path', async () => {
    bridge.rest('GET', 'shop.json', () => ({ shop: { id: 1 } }));
    bridge.rest('GET', /^products\/\d+\.json$/, request => ({ url: request.url }));

    expect(await (await fetch('shopify:admin/api/2025-10/shop.json')).json()).toEqual({ shop: { id: 1 } });
    expect(await (await fetch('/admin/api/2025-10/products/7.json')).json()).toEqual({ url: '/admin/api/2025-10/products/7.json' });
  });

  it('adds an id token to same-origin requests only', async () => {
    await fetch('/api/session', { method: 'POST' });
    await fetch('https://example.com/other');

    const [[, sameOrigin], [, crossOrigin]] = vi.mocked(realFetch).mock.calls;
    expect(new Headers(sameOrigin?.headers).get('Authorization')).toMatch(/^Bearer ey/);
    expect(crossOrigin?.headers).toBeUndefined();
  });

  it('resolves the resource picker with the configured selection', async () => {
    expect(await shopify.resourcePicker({ type: 'product' })).toEqual([]);

    bridge.resourcePicker([{ id: 'gid://shopify/Product/1' }]);
    const selected = await shopify.resourcePicker({ type: 'product' });
    expect(selected).toEqual([{ id: 'gid://shopify/Product/1' }]);
    expect(selected?.selection).toEqual([{ id: 'gid://shopify/Product/1' }]);

    bridge.resourcePicker(undefined);
    expect(await shopify.resourcePicker({ type: 'product' })).toBeUndefined();
  });

  it('mirrors <ui-modal> and <ui-nav-menu> elements', async () => {
    document.body.innerHTML = `
      <ui-modal id="help"><p>Body</p><ui-title-bar title="Help"></ui-title-bar></ui-modal>
      <ui-nav-menu><a href="/" rel="home">Home</a><a href="/fees">Fees</a></ui-nav-menu>`;

    await vi.waitFor(() => expect(bridge.modal('help')).toMatchObject({ heading: 'Help', html: '<p>Body</p>' }));
    expect(bridge.navMenu()).toEqual([
      { label: 'Home', href: '/', isHome: true },
      { label: 'Fees', href: '/fees', isHome: false },
    ]);

    (document.getElementById('help') as unknown as { show(): void }).show();
    await vi.waitFor(() => expect(bridge.modal('help')?.open).toBe(true));
  });

  it('reset() clears state and restores handlers to the checkpoint', async () => {
    bridge.graphql('Kept', () => ({ data: {} }));
    bridge.checkpoint();
    bridge.graphql('Dropped', () => ({ data: {} }));
    shopify.toast.show('hi');
    await graphql('query Kept { x }');

    bridge.reset();

    expect(bridge.toasts()).toEqual([]);
    expect(bridge.adminRequests).toEqual([]);
    await expect(graphql('query Kept { x }')).resolves.toBeInstanceOf(Response);
    await expect(graphql('query Dropped { x }')).rejects.toThrow('No handler');
  });

  it('uninstall restores fetch and removes the global', () => {
    uninstall();
    expect(globalThis.fetch).toBe(realFetch);
    expect('shopify' in globalThis).toBe(false);
  });
});
