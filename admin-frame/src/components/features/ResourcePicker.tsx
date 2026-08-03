import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useResourcePickerFeatureStore } from '../../store/features/resource-picker';
import type { ResourcePickerType } from '../../types/resource-picker';

function focusableElementsIn(container: HTMLElement): HTMLElement[] {
  const selector =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter((el) => {
    if (el.hasAttribute('disabled')) return false;
    return el.getClientRects().length > 0;
  });
}

const typeLabels: Record<ResourcePickerType, string> = {
  product: 'Products',
  variant: 'Variants',
  collection: 'Collections',
};

function ResourcePickerModal() {
  const isOpen = useResourcePickerFeatureStore((s) => s.isOpen);
  const options = useResourcePickerFeatureStore((s) => s.options);
  const catalog = useResourcePickerFeatureStore((s) => s.catalog);
  const loading = useResourcePickerFeatureStore((s) => s.loading);
  const error = useResourcePickerFeatureStore((s) => s.error);
  const query = useResourcePickerFeatureStore((s) => s.query);
  const selectedIds = useResourcePickerFeatureStore((s) => s.selectedIds);
  const setQuery = useResourcePickerFeatureStore((s) => s.setQuery);
  const toggleId = useResourcePickerFeatureStore((s) => s.toggleId);
  const cancel = useResourcePickerFeatureStore((s) => s.cancel);
  const confirm = useResourcePickerFeatureStore((s) => s.confirm);

  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [localQuery, setLocalQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLocalQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => {
      if (localQuery !== query) {
        setQuery(localQuery);
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [localQuery, isOpen, query, setQuery]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    const id = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => {
      window.cancelAnimationFrame(id);
      if (previous instanceof HTMLElement && document.body.contains(previous)) {
        previous.focus();
      }
    };
  }, [isOpen]);

  const handleDialogKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        cancel();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const nodes = focusableElementsIn(root);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !root.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    },
    [cancel],
  );

  const pickerType: ResourcePickerType = options?.type ?? 'product';

  const rows = useMemo(() => {
    if (!catalog) return [];
    if (pickerType === 'product') {
      return catalog.products.map((p) => ({
        id: p.id,
        primary: p.title,
        secondary: p.handle,
      }));
    }
    if (pickerType === 'variant') {
      return catalog.variants.map((v) => ({
        id: v.id,
        primary: v.displayName,
        secondary: `${v.price} · ${v.sku ?? v.id}`,
      }));
    }
    return catalog.collections.map((c) => ({
      id: c.id,
      primary: c.title,
      secondary: c.handle,
    }));
  }, [catalog, pickerType]);

  if (!isOpen) {
    return null;
  }

  const heading = typeLabels[pickerType];
  const multi = options?.multiple === true;

  return (
    <div
      className="mock-resource-picker-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.45)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          cancel();
        }
      }}
    >
      <div
        id="mock-resource-picker-dialog"
        ref={dialogRef}
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: 'min(560px, 92vw)',
          maxHeight: 'min(80vh, 640px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mock-resource-picker-title"
        onKeyDown={handleDialogKeyDown}
      >
        <header
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e3e3e3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <h2 id="mock-resource-picker-title" style={{ margin: 0, fontSize: '1.1rem' }}>
            Select {heading}
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#666' }}>
            {multi ? 'Multi-select' : 'Single select'}
          </span>
        </header>

        <div style={{ padding: '12px 20px 0' }}>
          <label htmlFor="mock-rp-search" style={{ fontSize: '0.75rem', color: '#444' }}>
            Search
          </label>
          <input
            id="mock-rp-search"
            ref={searchInputRef}
            type="search"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder={`Search ${heading.toLowerCase()}…`}
            style={{
              width: '100%',
              marginTop: 6,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #c9c9c9',
              fontSize: '0.95rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 20px',
            minHeight: 200,
          }}
        >
          {loading && (
            <p style={{ color: '#666', margin: 0 }}>Loading catalog…</p>
          )}
          {error && !loading && (
            <p style={{ color: '#b00020', margin: 0 }}>{error}</p>
          )}
          {!loading && !error && rows.length === 0 && (
            <p style={{ color: '#666', margin: 0 }}>No results.</p>
          )}
          {!loading &&
            !error &&
            rows.map((row) => (
              <label
                key={row.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 8px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <input
                  type={multi ? 'checkbox' : 'radio'}
                  name={multi ? undefined : 'mock-resource-picker-row'}
                  checked={selectedIds.has(row.id)}
                  onChange={() => toggleId(row.id)}
                  style={{ marginTop: 3 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{row.primary}</div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>{row.secondary}</div>
                </div>
              </label>
            ))}
        </div>

        <footer
          style={{
            padding: '12px 20px 16px',
            borderTop: '1px solid #e3e3e3',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={cancel}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #bbb',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={loading || selectedIds.size === 0}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              background: selectedIds.size === 0 ? '#ccc' : '#2563eb',
              color: '#fff',
              cursor: selectedIds.size === 0 ? 'default' : 'pointer',
            }}
          >
            Add
          </button>
        </footer>
      </div>
    </div>
  );
}

export function ResourcePicker() {
  const [container] = useState(() => document.createElement('div'));

  useEffect(() => {
    document.body.appendChild(container);
    return () => {
      document.body.removeChild(container);
    };
  }, [container]);

  return createPortal(<ResourcePickerModal />, container);
}
