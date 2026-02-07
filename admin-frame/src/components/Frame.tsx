type Props = {
  children: React.ReactNode;
}

export function Frame({ children }: Props) {
  return (
    <div
      className="frame"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: 'rgb(26, 26, 26)',
      }}
    >
      <div
        className="top-bar"
        style={{ height: '3.5rem', width: '100%', backgroundColor: 'rgb(26, 26, 26)', color: 'white' }}
      >
        <h3>Mock Bridge</h3>
      </div>

      <div
        className="main-content"
        style={{
          display: 'flex',
          flex: 1,
          width: '100%',
          borderTopLeftRadius: '0.75rem',
          borderTopRightRadius: '0.75rem',
          overflow: 'hidden',
        }}
      >
        <div className="navigation" style={{ width: '240px', backgroundColor: 'rgb(235, 235, 235)' }}>
          <s-stack justifyContent="stretch">
            <s-button variant="tertiary">Home</s-button>
            <s-button variant="tertiary">Products</s-button>
            <s-button variant="tertiary">Orders</s-button>
            <s-button variant="tertiary">Customers</s-button>
            <s-button variant="tertiary">Analytics</s-button>
            <s-button variant="tertiary">Marketing</s-button>
          </s-stack>
        </div>

        <div
          className="app-container"
          style={{
            flex: 1,
            width: '100%',
            backgroundColor: 'white',
          }}
        >
          <div
            className="app-title-bar"
            style={{
              height: '3.5rem',
              width: '100%',
              backgroundColor: 'rgb(241, 241, 241)',
              color: 'white',
              borderBottom: '1px solid rgb(235, 235, 235)',
            }}
          >

          </div>

          {children}
        </div>
      </div>
    </div>
  );
}