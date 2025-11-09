import { v4 as uuidv4 } from 'uuid';
import type { FeatureActionRequest } from '../../admin-frame/src/hooks/useMockBridge';
import { type FeatureActionName, type FeatureActionPayload, type FeatureName } from '../../admin-frame/src/store/features';

export function invokeFeature<F extends FeatureName, A extends FeatureActionName<F>, P extends FeatureActionPayload<F, A>>(feature: F, action: A, payload: P) {
  return new Promise((resolve, reject) => {
    const actionId = uuidv4();

    const request: FeatureActionRequest<F, A, P> = {
      feature,
      action,
      payload,
    }

    window.parent.postMessage({
      type: 'FEATURE_ACTION_REQUEST',
      action_id: actionId,
      ...request,
    }, '*');

    const rejectTimeout = setTimeout(() => {
      reject(new Error('Feature action timed out after 1 second'));
    }, 1000);

    const handler = (event: MessageEvent) => {
      if (event.data && event.data.type === 'FEATURE_ACTION_RESPONSE') {
        if (event.data.action_id !== actionId) return;

        resolve(event.data.payload);

        window.removeEventListener('message', handler);
        clearTimeout(rejectTimeout);
      }
    };

    window.addEventListener('message', handler);
  });
}