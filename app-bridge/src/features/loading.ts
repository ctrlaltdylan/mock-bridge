import { invokeFeature } from "../invokeFeature";

export function loading(): (isLoading?: boolean) => void {
  return (isLoading?: boolean) => {
    console.log('[MockAppBridge] Loading:', isLoading);
    void invokeFeature('loading', 'setLoading', { isLoading: Boolean(isLoading) }).catch(
      (err: unknown) => {
        console.warn('[MockAppBridge] loading/setLoading failed:', err);
      },
    );
  };
}
