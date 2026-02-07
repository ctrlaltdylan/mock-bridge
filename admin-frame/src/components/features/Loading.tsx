import { useLoadingFeatureStore } from "../../store/features/loading";

export function Loading() {
  const isLoading = useLoadingFeatureStore(state => state.isLoading);

  if (!isLoading) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        backgroundColor: 'transparent',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '30%',
          height: '100%',
          backgroundColor: '#2c6ecb',
          animation: 'loading-bar 1.5s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes loading-bar {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(200%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </div>
  );
}
