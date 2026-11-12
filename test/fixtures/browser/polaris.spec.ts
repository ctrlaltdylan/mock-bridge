import { bridge } from '../../../dist/vitest/index.js';
import { expect, it, vi } from 'vitest';

it('renders Polaris web components alongside the mock', async () => {
  const clicked = vi.fn(() => shopify.toast.show('Clicked'));
  document.body.innerHTML = '<s-page heading="Fees"><s-button id="add" variant="primary">Add new</s-button></s-page>';
  const button = document.getElementById('add')!;
  button.addEventListener('click', clicked);

  await customElements.whenDefined('s-button');
  expect(button.shadowRoot).toBeTruthy();

  button.click();
  expect(clicked).toHaveBeenCalledOnce();
  expect(bridge.toasts().map(toast => toast.message)).toEqual(['Clicked']);
});

it('mirrors a Polaris <s-page> into the admin title bar', async () => {
  const saved = vi.fn();
  document.body.innerHTML = `
    <s-page heading="Fee">
      <s-link slot="breadcrumb-actions" href="/fees">Fees</s-link>
      <s-button slot="primary-action" id="save">Save</s-button>
    </s-page>`;
  document.getElementById('save')!.addEventListener('click', saved);
  await customElements.whenDefined('s-page');

  await vi.waitFor(() => expect(bridge.titleBar()).toMatchObject({
    title: 'Fee',
    breadcrumb: { label: 'Fees', href: '/fees' },
    primaryAction: { id: 'save', label: 'Save' },
  }));
  bridge.clickTitleBarAction('Save');
  expect(saved).toHaveBeenCalledOnce();
});
