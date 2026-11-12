// A stand-in for app code: Admin API through direct API access, plus App Bridge UI calls.

export async function loadFees(): Promise<Array<{ id: string }>> {
  const response = await fetch('shopify:admin/api/2025-10/graphql.json', {
    method: 'POST',
    body: JSON.stringify({ query: 'query FeeRules($type: String!) { metaobjects(type: $type, first: 10) { nodes { id } } }', variables: { type: 'fee' } }),
  });
  if (!response.ok) throw new Error(`Shopify request failed (${response.status})`);
  const { data } = await response.json();
  return data.metaobjects.nodes;
}

export async function saveFee(title: string) {
  shopify.loading(true);
  try {
    const response = await fetch('shopify:admin/api/2025-10/graphql.json', {
      method: 'POST',
      body: JSON.stringify({ query: 'mutation FeeSave($title: String!) { save(title: $title) { id } }', variables: { title } }),
    });
    const { data } = await response.json();
    await shopify.saveBar.hide('fee-form');
    shopify.toast.show('Saved');
    return data.save.id as string;
  } finally {
    shopify.loading(false);
  }
}

export async function pickProduct() {
  const selected = await shopify.resourcePicker({ type: 'product' });
  return selected?.[0]?.id;
}
