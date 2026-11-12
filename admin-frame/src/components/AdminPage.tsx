/** Stands in for an admin page the app sent the merchant to, e.g. `shopify://admin/products`. */
export function AdminPage({ path }: { path: string }) {
  const section = path.split(/[/?#]/)[1] || 'home';
  const title = section.charAt(0).toUpperCase() + section.slice(1).replace(/_/g, ' ');

  return (
    <div className="admin-page" data-admin-path={path} style={{ padding: '24px', color: '#303030' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: '20px' }}>{title}</h2>
      <p style={{ margin: 0 }}>
        The app opened the Shopify admin page <code>{path}</code>, which the mock doesn't render.
        Pick an item under App to go back to the app.
      </p>
    </div>
  );
}
