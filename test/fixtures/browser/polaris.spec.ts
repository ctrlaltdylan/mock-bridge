import { bridge } from '../../../dist/vitest/index.mjs';
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
