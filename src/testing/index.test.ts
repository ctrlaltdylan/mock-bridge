// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifySessionToken } from '../auth/jwt';
import { createFeatureStores } from '../core/stores';
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

  it('starts with no recorded calls; the stores have the page as installed', () => {
    expect(bridge.calls).toEqual([]);
    expect(bridge.navigation().url).toBe(location.href);
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

  it('mirrors a page-level <ui-title-bar> and clicks its actions from the admin', async () => {
    document.body.innerHTML = `
      <ui-title-bar title="Fees">
        <a variant="breadcrumb" href="/">Home</a>
        <button variant="primary" id="save">Save</button>
        <button tone="critical" disabled>Delete</button>
        <section label="More"><button>Export</button><button>Duplicate</button></section>
      </ui-title-bar>
      <ui-modal id="help"><ui-title-bar title="Help"></ui-title-bar></ui-modal>`;
    const saved = vi.fn();
    document.getElementById('save')!.addEventListener('click', saved);

    await vi.waitFor(() => expect(bridge.titleBar()?.title).toBe('Fees'));
    expect(bridge.titleBar()).toMatchObject({
      breadcrumb: { id: 'breadcrumb', label: 'Home', href: '/' },
      primaryAction: { id: 'save', label: 'Save', variant: 'primary', disabled: false },
      secondaryActions: [
        { id: 'secondary-0', label: 'Delete', tone: 'critical', disabled: true },
        { label: 'More', actions: [{ id: 'secondary-1-0', label: 'Export' }, { id: 'secondary-1-1', label: 'Duplicate' }] },
      ],
    });
    expect(document.querySelector('ui-title-bar')!.getAttribute('style')).toContain('display: none');

    bridge.clickTitleBarAction('Save');
    expect(saved).toHaveBeenCalledOnce();
    expect(() => bridge.clickTitleBarAction('Nope')).toThrow('No title bar action "Nope"');

    document.querySelector('ui-title-bar')!.setAttribute('title', 'Fee rules');
    await vi.waitFor(() => expect(bridge.titleBar()?.title).toBe('Fee rules'));
    document.querySelector('ui-title-bar')!.remove();
    await vi.waitFor(() => expect(bridge.titleBar()).toBeNull());
  });

  it('mirrors <s-page> headings and slotted actions', async () => {
    document.body.innerHTML = `
      <s-page heading="Fee">
        <s-link slot="breadcrumb-actions" href="/fees">Fees</s-link>
        <s-button slot="primary-action">Save</s-button>
        <s-button slot="secondary-actions" commandfor="more">More</s-button>
        <s-menu id="more"><s-button>Archive</s-button></s-menu>
        <s-button>Not an action</s-button>
      </s-page>`;
    const saved = vi.fn();
    const navigated = vi.fn((event: Event) => (event.target as Element).getAttribute('href'));
    document.querySelector('[slot="primary-action"]')!.addEventListener('click', saved);
    document.addEventListener('shopify:navigate', navigated);

    await vi.waitFor(() => expect(bridge.titleBar()).toEqual({
      title: 'Fee',
      breadcrumb: { id: 'breadcrumb', label: 'Fees', href: '/fees', disabled: false, loading: false },
      primaryAction: { id: 'primary', label: 'Save', disabled: false, loading: false },
      secondaryActions: [{ label: 'More', actions: [{ id: 'secondary-0-0', label: 'Archive', disabled: false, loading: false }] }],
    }));

    bridge.clickTitleBarAction('primary');
    bridge.clickTitleBarAction('breadcrumb');
    expect(saved).toHaveBeenCalledOnce();
    expect(navigated).toHaveReturnedWith('/fees');
    document.removeEventListener('shopify:navigate', navigated);
  });

  it('runs a title bar button\'s handlers before following its href, unless they cancel', async () => {
    document.body.innerHTML = '<s-page heading="Fee"><s-button slot="primary-action" href="/fees/new">New</s-button></s-page>';
    const button = document.querySelector('s-button')!;
    const events: string[] = [];
    const navigated = () => events.push('navigate');
    document.addEventListener('shopify:navigate', navigated);
    await vi.waitFor(() => expect(bridge.titleBar()?.primaryAction?.label).toBe('New'));

    button.addEventListener('click', () => events.push('click'), { once: true });
    bridge.clickTitleBarAction('New');
    button.addEventListener('click', event => event.preventDefault(), { once: true });
    bridge.clickTitleBarAction('New');

    expect(events).toEqual(['click', 'navigate']);
    document.removeEventListener('shopify:navigate', navigated);
  });

  it('follows the app history and sends shopify://admin links to the admin', async () => {
    history.pushState(null, '', '/fees?embedded=1&host=abc&tab=all');
    expect(bridge.navigation().url).toBe('http://localhost:3000/fees?tab=all');

    document.body.innerHTML = '<a href="shopify://admin/products?selectedView=all">Products</a><a href="https://example.com" target="_top">Out</a>';
    const [admin, out] = document.querySelectorAll('a');
    expect(admin.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))).toBe(false);
    out.click();
    expect(window.open('shopify:admin/orders', '_blank')).toBeNull();
    expect(window.open('/report.pdf')).toBeNull();

    expect(bridge.navigation().adminPath).toBe('/products?selectedView=all');
    expect(bridge.navigation().entries.slice(-4)).toEqual([
      { type: 'admin', path: '/products?selectedView=all', newContext: false },
      { type: 'open', url: 'https://example.com/', target: '_top' },
      { type: 'admin', path: '/orders', newContext: true },
      { type: 'open', url: 'http://localhost:3000/report.pdf', target: '_blank' },
    ]);
  });

  it('follows the app\'s nav menu links when the merchant picks an admin nav item', async () => {
    document.body.innerHTML = `
      <ui-nav-menu><a href="/fees">Fees</a></ui-nav-menu>
      <s-app-nav><s-link href="/rules">Rules</s-link></s-app-nav>`;
    const clicked = vi.fn((event: Event) => event.preventDefault());
    const navigated = vi.fn((event: Event) => (event.target as Element).getAttribute('href'));
    document.querySelector('a')!.addEventListener('click', clicked);
    document.addEventListener('shopify:navigate', navigated);

    bridge.navigate('/fees');
    bridge.navigate('/rules');

    expect(clicked).toHaveBeenCalledOnce();
    expect(navigated).toHaveReturnedWith('/rules');
    document.removeEventListener('shopify:navigate', navigated);
  });

  it('records window.print() without opening the print dialog', () => {
    window.print();
    window.print();
    expect(bridge.prints()).toBe(2);
  });

  it('answers navigator.share() and rejects cancelled or empty shares', async () => {
    await expect(navigator.share({ title: 'Fee', url: '/fees/1' })).resolves.toBeUndefined();
    expect(bridge.shares()).toEqual([{ title: 'Fee', url: 'http://localhost:3000/fees/1' }]);

    bridge.shareResult('cancelled');
    await expect(navigator.share({ text: 'hi' })).rejects.toMatchObject({ name: 'AbortError' });
    await expect(navigator.share({})).rejects.toThrow(TypeError);
    expect(navigator.canShare({ url: '/x' })).toBe(true);
    expect(navigator.canShare({})).toBe(false);
  });

  it('reset() cancels a share still waiting for the merchant', async () => {
    // Show the sheet instead of answering straight away.
    bridge.stores.share.actions.setOutcome({ outcome: undefined });
    const pending = navigator.share({ title: 'Fee' });
    await vi.waitFor(() => expect(bridge.stores.share.state.peek().current).toEqual({ title: 'Fee' }));

    bridge.reset();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(bridge.stores.share.state.peek().current).toBeNull();
  });

  it('stores notify subscribers of every change with the previous state', () => {
    const listener = vi.fn();
    const unsubscribe = bridge.stores.navigation.subscribe(listener);
    expect(listener).not.toHaveBeenCalled();

    bridge.stores.navigation.actions.admin({ path: '/orders' });
    bridge.stores.navigation.actions.open({ url: 'https://example.com', target: '_blank' });
    expect(listener).toHaveBeenCalledTimes(2);
    const [[afterAdmin, initial], [afterOpen, previous]] = listener.mock.calls;
    expect([initial.adminPath, afterAdmin.adminPath]).toEqual([null, '/orders']);
    expect(previous).toBe(afterAdmin);
    expect(afterOpen.entries.slice(initial.entries.length).map((entry: { type: string }) => entry.type)).toEqual(['admin', 'open']);

    unsubscribe();
    bridge.stores.navigation.actions.admin({ path: '/products' });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('mirrors <s-app-window> and opens it from invoker commands', async () => {
    document.body.innerHTML = `
      <s-app-window id="editor" src="/editor"></s-app-window>
      <button commandfor="editor" command="--toggle">Edit</button>`;
    const appWindow = document.getElementById('editor') as unknown as SAppWindowElement;
    await vi.waitFor(() => expect(bridge.appWindow('editor')).toEqual({ id: 'editor', src: 'http://localhost:3000/editor', open: false }));

    const events: string[] = [];
    for (const type of ['show', 'hide'] as const) appWindow.addEventListener?.(type, () => events.push(type));

    await appWindow.show?.();
    expect(bridge.appWindow('editor')?.open).toBe(true);

    appWindow.src = '/editor/2';
    expect(bridge.appWindow('editor')?.src).toBe('http://localhost:3000/editor/2');

    // The merchant closes the window in the admin.
    bridge.stores.appWindow.actions.hide({ id: 'editor' });
    document.querySelector('button')!.click();
    await vi.waitFor(() => expect(bridge.appWindow('editor')?.open).toBe(true));
    expect(events).toEqual(['show', 'hide', 'show']);
    expect(appWindow.contentWindow).toBeNull();
  });

  it('opens <s-app-window> from a Polaris invoker without a command (--auto)', async () => {
    document.body.innerHTML = `
      <s-app-window id="editor" src="/editor"></s-app-window>
      <s-button commandfor="editor">Edit</s-button>`;
    await vi.waitFor(() => expect(bridge.appWindow('editor')).toBeDefined());
    (document.querySelector('s-button') as HTMLElement).click();
    await vi.waitFor(() => expect(bridge.appWindow('editor')?.open).toBe(true));
  });

  it('forgets an <s-app-window> that leaves the page, and mirrors it again if it comes back', async () => {
    document.body.innerHTML = '<s-app-window id="editor" src="/editor"></s-app-window>';
    const element = document.getElementById('editor') as unknown as SAppWindowElement & HTMLElement;
    await vi.waitFor(() => expect(bridge.appWindow('editor')).toBeDefined());
    await element.show?.();

    element.remove();
    await vi.waitFor(() => expect(bridge.appWindow('editor')).toBeUndefined());
    const events: string[] = [];
    element.addEventListener('show', () => events.push('show'));
    bridge.stores.appWindow.actions.show({ id: 'editor' });
    expect(events).toEqual([]);

    document.body.append(element);
    await vi.waitFor(() => expect(bridge.appWindow('editor')).toEqual({ id: 'editor', src: 'http://localhost:3000/editor', open: true }));
  });

  it('records a hash navigation once', async () => {
    const before = bridge.navigation().entries.length;
    location.hash = '#details';
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(bridge.navigation().entries.slice(before)).toEqual([
      { type: 'history', url: expect.stringMatching(/#details$/), replace: true },
    ]);
  });

  it('does not record replaceState calls that keep the URL', () => {
    const before = bridge.navigation().entries.length;
    history.replaceState({ scroll: 10 }, '');
    history.replaceState({ scroll: 20 }, '', location.href);
    expect(bridge.navigation().entries.length).toBe(before);
  });

  it('hides a form save bar when its changed form leaves the page', async () => {
    document.body.innerHTML = '<form data-save-bar><input name="title" value="a"></form>';
    const form = document.querySelector('form')!;
    const input = form.querySelector('input')!;
    await vi.waitFor(() => expect(Object.keys(bridge.stores.saveBar.state.peek().saveBars)).toHaveLength(1));
    input.value = 'b';
    form.dispatchEvent(new Event('input', { bubbles: true }));
    const [id] = Object.keys(bridge.stores.saveBar.state.peek().saveBars);
    await vi.waitFor(() => expect(bridge.saveBar(id)?.visible).toBe(true));

    form.remove();
    await vi.waitFor(() => expect(bridge.saveBar(id)).toBeUndefined());
  });

  it('gives each form its own save bar, which shows again after reset() on the next change', async () => {
    document.body.innerHTML = '<form data-save-bar><input name="a" value="1"></form><form data-save-bar><input name="b" value="1"></form>';
    await vi.waitFor(() => expect(Object.keys(bridge.stores.saveBar.state.peek().saveBars)).toHaveLength(2));
    const form = document.querySelector('form')!;
    const edit = (value: string) => {
      form.querySelector('input')!.value = value;
      form.dispatchEvent(new Event('input', { bubbles: true }));
    };
    edit('2');
    const visible = () => Object.values(bridge.stores.saveBar.state.peek().saveBars).filter(saveBar => saveBar.visible);
    await vi.waitFor(() => expect(visible()).toHaveLength(1));

    bridge.reset();
    expect(visible()).toHaveLength(0);
    edit('3');
    await vi.waitFor(() => expect(visible()).toHaveLength(1));
  });

  it('forgets modals and nav menus that leave the page', async () => {
    document.body.innerHTML = '<ui-modal id="confirm"><p>Sure?</p></ui-modal><ui-nav-menu><a href="/fees">Fees</a></ui-nav-menu>';
    await vi.waitFor(() => expect(bridge.navMenu()).toHaveLength(1));
    await shopify.modal.show('confirm');
    expect(bridge.modal('confirm')?.open).toBe(true);

    document.body.innerHTML = '';
    await vi.waitFor(() => expect(bridge.modal('confirm')).toBeUndefined());
    expect(bridge.navMenu()).toEqual([]);
  });

  it('follows the link, not an icon inside it, and records window.open(url, "_self")', async () => {
    document.body.innerHTML = '<a href="shopify://admin/products"><svg><use href="#icon"></use></svg>Products</a>';
    const icon = document.querySelector('use')!;
    expect(icon.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))).toBe(false);
    expect(bridge.navigation().adminPath).toBe('/products');

    window.open('/checkout', '_self');
    expect(bridge.navigation().entries.at(-1)).toEqual({ type: 'open', url: 'http://localhost:3000/checkout', target: '_self' });
  });

  it('reports a new app window src once', async () => {
    document.body.innerHTML = '<s-app-window id="editor" src="/editor"></s-app-window>';
    const element = document.getElementById('editor') as unknown as SAppWindowElement & HTMLElement;
    await vi.waitFor(() => expect(bridge.appWindow('editor')).toBeDefined());
    const updates: unknown[] = [];
    const unsubscribe = bridge.stores.appWindow.subscribe(state => updates.push(state.appWindows.editor?.src));
    element.src = '/editor/2';
    await new Promise(resolve => setTimeout(resolve, 10));
    unsubscribe();
    expect(updates).toEqual(['http://localhost:3000/editor/2']);
  });

  it('reset() keeps what the page mirrors, closed', async () => {
    document.body.innerHTML = '<s-app-window id="editor" src="/editor"></s-app-window>';
    const element = document.getElementById('editor') as unknown as SAppWindowElement & HTMLElement;
    await vi.waitFor(() => expect(bridge.appWindow('editor')).toBeDefined());
    const events: string[] = [];
    element.addEventListener('hide', () => {
      events.push('hide');
      shopify.toast.show('Closed');
    });
    await element.show?.();

    element.addEventListener('hide', () => window.print());

    bridge.reset();

    expect(bridge.appWindow('editor')).toEqual({ id: 'editor', src: 'http://localhost:3000/editor', open: false });
    expect(events).toEqual(['hide']);
    // Told once every store is reset, so a store reset later doesn't undo what the app did.
    expect(bridge.prints()).toBe(1);
    // What the app did as the window closed belongs to the test that left it open.
    expect(bridge.toasts()).toEqual([]);
    await element.show?.();
    expect(bridge.appWindow('editor')?.open).toBe(true);
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

  it('dispose restores the patched window APIs', () => {
    const patched = { open: window.open, print: window.print, pushState: history.pushState, share: navigator.share };
    bridge.dispose();
    expect(window.open).not.toBe(patched.open);
    expect(window.print).not.toBe(patched.print);
    expect(history.pushState).toBe(History.prototype.pushState);
    expect(navigator.share).toBeUndefined();
  });
});

describe('createFeatureStores', () => {
  it('keeps the latest maxNavigationEntries navigation entries', () => {
    const stores = createFeatureStores({ maxNavigationEntries: 2 });
    for (const path of ['/a', '/b', '/c']) stores.navigation.actions.admin({ path });
    expect(stores.navigation.state.peek().entries.map(entry => entry.type === 'admin' && entry.path)).toEqual(['/b', '/c']);
  });
});
