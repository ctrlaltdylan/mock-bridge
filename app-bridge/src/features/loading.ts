import { invokeFeature } from "../invokeFeature";

export function loading(): (isLoading: boolean) => void {
  return (isLoading: boolean) => {
    console.log('[MockAppBridge] Loading:', isLoading);
    invokeFeature('loading', 'setLoading', { isLoading });
  };
}
