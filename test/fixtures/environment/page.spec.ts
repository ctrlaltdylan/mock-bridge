import { bridge } from '../../../dist/vitest/index.js';
import { expect, it } from 'vitest';

it('installs shopify before the page parses, so page scripts can use it', () => {
  expect(document.body.dataset.shop).toBe('fixture.myshopify.com');
  expect(bridge.toasts().map(toast => toast.message)).toEqual(['Booted']);
  expect(bridge.modal('welcome')).toMatchObject({ heading: 'Welcome', html: '<p>Hello</p>' });
  expect(document.querySelector<HTMLElement>('ui-modal')?.style.display).toBe('none');
  // Only what the page's script called: mirroring the modal isn't a call.
  expect(bridge.calls.map(call => `${call.feature}.${call.action}`)).toEqual(['toast.show']);
});

it('shares one shopify global between the page and test code', () => {
  expect(shopify.config.shop).toBe('fixture.myshopify.com');
  expect(window.shopify).toBe(bridge.shopify);
});
