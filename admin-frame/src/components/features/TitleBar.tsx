import { Fragment } from "preact";
import { adminPath, stores, titleBar, type TitleBarAction } from "../../store/features";

const click = (action: TitleBarAction) => stores.titleBar.actions.click({ id: action.id });

function ActionButton({ action, variant }: { action: TitleBarAction; variant?: 'primary' | 'secondary' | 'tertiary' }) {
  return (
    <s-button
      variant={variant ?? action.variant as any}
      tone={action.tone as any}
      disabled={action.disabled}
      loading={action.loading}
      onClick={() => click(action)}
    >
      {action.label}
    </s-button>
  );
}

/** The app's `<ui-title-bar>` or `<s-page>` title and actions. */
export function TitleBar() {
  if (!titleBar.value || adminPath.value !== null) return null;

  const { title, breadcrumb, primaryAction, secondaryActions } = titleBar.value;

  return (
    <div
      className="title-bar"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', height: '100%', padding: '0 16px', color: 'rgb(48, 48, 48)' }}
    >
      <s-stack direction="inline" alignItems="center" gap="small-200">
        {breadcrumb && (
          <>
            <ActionButton action={breadcrumb} variant="tertiary" />
            <s-icon type="chevron-right" />
          </>
        )}
        <s-heading>{title}</s-heading>
      </s-stack>

      <s-stack direction="inline" alignItems="center" gap="small-200">
        {secondaryActions.map((item, index) => 'actions' in item ? (
          <Fragment key={`group-${index}`}>
            <s-button commandFor={`title-bar-group-${index}`} icon="chevron-down">{item.label}</s-button>
            <s-menu id={`title-bar-group-${index}`}>
              {item.actions.map(action => <ActionButton key={action.id} action={action} />)}
            </s-menu>
          </Fragment>
        ) : (
          <ActionButton key={item.id} action={item} variant="secondary" />
        ))}
        {primaryAction && <ActionButton action={primaryAction} variant="primary" />}
      </s-stack>
    </div>
  );
}
