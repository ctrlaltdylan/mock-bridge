import './style.css';

declare global {
  interface Window {
    shopify: {
      modal: {
        show(id: string): Promise<void>;
        hide(id: string): Promise<void>;
        toggle(id: string): Promise<void>;
      };
      toast: {
        show(message: string, options?: { duration?: number }): Promise<void>;
      };
      idToken(): Promise<string>;
    };
  }
}

// Load mock App Bridge when in mock environment
async function loadMockAppBridge(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Listen for mock environment signal from parent frame
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'MOCK_SHOPIFY_ENVIRONMENT') {
        window.removeEventListener('message', handleMessage);

        // Load the mock App Bridge script from the mock server
        const script = document.createElement('script');
        script.src = `${event.data.mockServerUrl}/app-bridge.js`;
        script.onload = () => {
          console.log('[TestApp] Mock App Bridge loaded');
          resolve();
        };
        script.onerror = () => reject(new Error('Failed to load mock App Bridge'));
        document.head.appendChild(script);
      }
    };

    window.addEventListener('message', handleMessage);

    // Timeout after 5 seconds if not in mock environment
    setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      // If shopify is already available (e.g., real Shopify environment), resolve
      if (window.shopify) {
        resolve();
      } else {
        reject(new Error('Not in a Shopify environment'));
      }
    }, 5000);
  });
}

// Wait for App Bridge to be available
async function init() {
  const app = document.getElementById('app')!;

  // Display current state
  app.innerHTML = `
    <h1>Mock Bridge Test App</h1>
    <div id="status">Initializing...</div>
    <hr>
    <h2>Test Actions</h2>
    <button id="show-modal">Show Modal</button>
    <button id="show-toast">Show Toast</button>
    <button id="get-token">Get Session Token</button>
    <hr>
    <h2>Results</h2>
    <pre id="results"></pre>

    <!-- Modal definition following Shopify App Bridge pattern -->
    <ui-modal id="my-modal">
      <div style="padding: 20px;">
        <h2>Test Modal</h2>
        <p>This is a test modal from the mock test app!</p>
        <p>The modal content is defined using the <code>&lt;ui-modal&gt;</code> element pattern from Shopify App Bridge.</p>
      </div>
      <ui-title-bar title="Test Modal">
        <button variant="primary" id="modal-save-btn">Save</button>
        <button id="modal-cancel-btn">Cancel</button>
      </ui-title-bar>
    </ui-modal>
  `;

  const status = document.getElementById('status')!;
  const results = document.getElementById('results')!;

  // If we're embedded in an iframe, try to load the mock App Bridge
  if (window.self !== window.top) {
    try {
      status.textContent = 'Loading mock App Bridge...';
      await loadMockAppBridge();
    } catch (e) {
      console.log('[TestApp] Mock App Bridge not loaded:', e);
    }
  }

  // Wait for shopify global
  const waitForShopify = () => new Promise<void>((resolve, reject) => {
    if (window.shopify) return resolve();
    let attempts = 0;
    const check = setInterval(() => {
      if (window.shopify) {
        clearInterval(check);
        resolve();
      }
      attempts++;
      if (attempts > 50) { // 5 seconds timeout
        clearInterval(check);
        reject(new Error('Shopify global not available'));
      }
    }, 100);
  });

  try {
    await waitForShopify();
    status.textContent = 'App Bridge Connected';
  } catch (e) {
    status.textContent = 'Not in Shopify environment';
    return;
  }

  // Modal test - using the Shopify App Bridge pattern
  // The modal content is defined in <ui-modal id="my-modal"> element above
  document.getElementById('show-modal')?.addEventListener('click', async () => {
    try {
      // Can use either shopify.modal.show() or element.show()
      await window.shopify.modal.show('my-modal');
      results.textContent = 'Modal shown successfully';
    } catch (e) {
      results.textContent = `Modal error: ${e}`;
    }
  });

  // Modal button handlers
  document.getElementById('modal-save-btn')?.addEventListener('click', () => {
    results.textContent = 'Modal Save clicked!';
    window.shopify.modal.hide('my-modal');
  });

  document.getElementById('modal-cancel-btn')?.addEventListener('click', () => {
    results.textContent = 'Modal Cancel clicked!';
    window.shopify.modal.hide('my-modal');
  });

  // Toast test
  document.getElementById('show-toast')?.addEventListener('click', async () => {
    try {
      await window.shopify.toast.show('Hello from Mock Bridge!');
      results.textContent = 'Toast shown successfully';
    } catch (e) {
      results.textContent = `Toast error: ${e}`;
    }
  });

  // Session token test
  document.getElementById('get-token')?.addEventListener('click', async () => {
    try {
      const token = await window.shopify.idToken();
      results.textContent = `Token: ${token.substring(0, 50)}...`;
    } catch (e) {
      results.textContent = `Token error: ${e}`;
    }
  });
}

init();
