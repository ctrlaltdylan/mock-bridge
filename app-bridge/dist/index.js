"use strict";
(() => {
  // node_modules/uuid/dist/esm-browser/stringify.js
  var byteToHex = [];
  for (let i = 0; i < 256; ++i) {
    byteToHex.push((i + 256).toString(16).slice(1));
  }
  function unsafeStringify(arr, offset = 0) {
    return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
  }

  // node_modules/uuid/dist/esm-browser/rng.js
  var getRandomValues;
  var rnds8 = new Uint8Array(16);
  function rng() {
    if (!getRandomValues) {
      if (typeof crypto === "undefined" || !crypto.getRandomValues) {
        throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
      }
      getRandomValues = crypto.getRandomValues.bind(crypto);
    }
    return getRandomValues(rnds8);
  }

  // node_modules/uuid/dist/esm-browser/native.js
  var randomUUID = typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID.bind(crypto);
  var native_default = { randomUUID };

  // node_modules/uuid/dist/esm-browser/v4.js
  function v4(options, buf, offset) {
    if (native_default.randomUUID && !buf && !options) {
      return native_default.randomUUID();
    }
    options = options || {};
    const rnds = options.random ?? options.rng?.() ?? rng();
    if (rnds.length < 16) {
      throw new Error("Random bytes length must be >= 16");
    }
    rnds[6] = rnds[6] & 15 | 64;
    rnds[8] = rnds[8] & 63 | 128;
    if (buf) {
      offset = offset || 0;
      if (offset < 0 || offset + 16 > buf.length) {
        throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
      }
      for (let i = 0; i < 16; ++i) {
        buf[offset + i] = rnds[i];
      }
      return buf;
    }
    return unsafeStringify(rnds);
  }
  var v4_default = v4;

  // src/invokeFeature.ts
  function invokeFeature(feature, action, payload, timeoutMs = 1e3) {
    return new Promise((resolve, reject) => {
      const actionId = v4_default();
      const request = {
        feature,
        action,
        payload
      };
      window.parent.postMessage(
        {
          type: "FEATURE_ACTION_REQUEST",
          action_id: actionId,
          ...request
        },
        "*"
      );
      const rejectTimeout = setTimeout(() => {
        window.removeEventListener("message", handler);
        reject(new Error(`Feature action timed out after ${timeoutMs} ms`));
      }, timeoutMs);
      const handler = (event) => {
        if (event.source !== window.parent) return;
        if (!event.data || event.data.type !== "FEATURE_ACTION_RESPONSE") return;
        if (event.data.action_id !== actionId) return;
        resolve(event.data.payload);
        window.removeEventListener("message", handler);
        clearTimeout(rejectTimeout);
      };
      window.addEventListener("message", handler);
    });
  }

  // src/features/modal.ts
  function attachModalContentObserver(modalElement, propagate) {
    const contentElement = document.createElement("div");
    modalElement.content = contentElement;
    const observer = new MutationObserver((mutations) => {
      propagate(contentElement.innerHTML);
    });
    observer.observe(contentElement, {
      childList: true,
      subtree: true
    });
  }
  function observeModalElements() {
    function extractModalData(modalElement) {
      const id = modalElement.getAttribute("id");
      if (!id) return null;
      const variant = modalElement.getAttribute("variant") || "base";
      const src = modalElement.getAttribute("src");
      const titleBar = modalElement.querySelector("ui-title-bar");
      const title = titleBar?.getAttribute("title") || "";
      const buttons = titleBar ? Array.from(titleBar.querySelectorAll("button")).map((btn) => ({
        id: btn.getAttribute("id") || "",
        label: btn.textContent || "",
        variant: btn.getAttribute("variant") || void 0,
        tone: btn.getAttribute("tone") || void 0,
        disabled: btn.disabled,
        loading: btn.hasAttribute("loading")
      })) : [];
      return {
        id,
        title,
        variant,
        src,
        buttons
      };
    }
    function extractModalHtml(modalElement) {
      const clone = modalElement.cloneNode(true);
      const titleBar = clone.querySelector("ui-title-bar");
      if (titleBar) {
        titleBar.remove();
      }
      return clone.innerHTML.trim();
    }
    async function syncModalToParent(modalElement) {
      const data = extractModalData(modalElement);
      if (data) {
        await invokeFeature("modal", "update", {
          id: data.id,
          heading: data.title,
          content: data
        });
        const html = extractModalHtml(modalElement);
        if (html) {
          await invokeFeature("modal", "updateHtml", {
            id: data.id,
            html
          });
        }
      }
    }
    function observeModals() {
      const modals = document.querySelectorAll("ui-modal");
      modals.forEach((modal2) => {
        modal2.style.display = "none";
        syncModalToParent(modal2);
        attachModalContentObserver(modal2, (html) => {
          const id2 = modal2.getAttribute("id");
          if (!id2) return;
          invokeFeature("modal", "updateHtml", {
            id: id2,
            html
          });
        });
        const id = modal2.getAttribute("id");
        if (!id) return;
        modal2.show = () => {
          invokeFeature("modal", "show", { id });
        };
        modal2.hide = () => {
          invokeFeature("modal", "hide", { id });
        };
        modal2.toggle = () => {
          invokeFeature("modal", "toggle", { id });
        };
      });
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", observeModals);
    } else {
      observeModals();
    }
    const documentObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement && node.tagName.toLowerCase() === "ui-modal") {
            syncModalToParent(node);
          }
        });
      });
    });
    documentObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
  function modal() {
    if (typeof document !== "undefined") {
      observeModalElements();
    }
    return {
      toggle: async (id) => {
        await invokeFeature("modal", "toggle", { id });
      },
      show: async (id) => {
        await invokeFeature("modal", "show", { id });
      },
      hide: async (id) => {
        await invokeFeature("modal", "hide", { id });
      }
    };
  }

  // src/features/save-bar.ts
  function observeSaveBarElements() {
    function setupSaveBar(element) {
      const id = element.getAttribute("id");
      if (!id) return;
      element.style.display = "none";
      const discardConfirmation = element.hasAttribute("data-discard-confirmation");
      invokeFeature("saveBar", "update", { id, discardConfirmation });
      element.show = () => {
        invokeFeature("saveBar", "show", { id });
      };
      element.hide = () => {
        invokeFeature("saveBar", "hide", { id });
      };
    }
    function setupFormSaveBar(form) {
      const id = `form-save-bar-${Date.now()}`;
      const discardConfirmation = form.hasAttribute("data-discard-confirmation");
      let isDirty = false;
      const originalValues = /* @__PURE__ */ new Map();
      const inputs = form.querySelectorAll("input, textarea, select");
      inputs.forEach((input) => {
        const el = input;
        originalValues.set(el.name || el.id, el.value);
      });
      form.addEventListener("input", () => {
        let hasChanges = false;
        inputs.forEach((input) => {
          const el = input;
          const key = el.name || el.id;
          if (originalValues.get(key) !== el.value) {
            hasChanges = true;
          }
        });
        if (hasChanges && !isDirty) {
          isDirty = true;
          invokeFeature("saveBar", "show", { id });
        } else if (!hasChanges && isDirty) {
          isDirty = false;
          invokeFeature("saveBar", "hide", { id });
        }
      });
      window.addEventListener("message", (event) => {
        if (event.data?.type === "SAVE_BAR_SAVE" && event.data.id === id) {
          form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          isDirty = false;
          invokeFeature("saveBar", "hide", { id });
        }
        if (event.data?.type === "SAVE_BAR_DISCARD" && event.data.id === id) {
          form.reset();
          isDirty = false;
        }
      });
      invokeFeature("saveBar", "update", { id, discardConfirmation });
    }
    function observeElements() {
      document.querySelectorAll("ui-save-bar").forEach((el) => setupSaveBar(el));
      document.querySelectorAll("form[data-save-bar]").forEach((el) => setupFormSaveBar(el));
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", observeElements);
    } else {
      observeElements();
    }
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (node.tagName.toLowerCase() === "ui-save-bar") {
              setupSaveBar(node);
            }
            if (node.tagName === "FORM" && node.hasAttribute("data-save-bar")) {
              setupFormSaveBar(node);
            }
          }
        });
      });
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
  function saveBar() {
    if (typeof document !== "undefined") {
      observeSaveBarElements();
    }
    return {
      show: async (id) => {
        await invokeFeature("saveBar", "show", { id });
      },
      hide: async (id) => {
        await invokeFeature("saveBar", "hide", { id });
      },
      toggle: async (id) => {
        await invokeFeature("saveBar", "toggle", { id });
      },
      leaveConfirmation: async () => {
      }
    };
  }

  // src/features/scopes.ts
  function scopes() {
    return {
      query: async () => {
        return {
          granted: [],
          required: [],
          optional: []
        };
      },
      request: async () => {
        return {
          result: "granted-all",
          detail: {
            granted: [],
            required: [],
            optional: []
          }
        };
      },
      revoke: async () => {
        return {
          result: "granted-all",
          detail: {
            granted: [],
            required: [],
            optional: []
          }
        };
      }
    };
  }

  // src/features/config.ts
  function config() {
    return {
      apiKey: "",
      shop: "",
      locale: "en"
    };
  }

  // src/features/environment.ts
  function environment() {
    return {
      embedded: window.self !== window.top,
      mobile: /mobile|android|iphone|ipad/i.test(navigator.userAgent),
      pos: false
    };
  }

  // src/features/user.ts
  function user() {
    return async () => {
      return {
        id: 0,
        email: "",
        name: ""
      };
    };
  }

  // src/features/toast.ts
  function toast() {
    let toastId = 0;
    return {
      show: (message, opts) => {
        const id = `toast-${++toastId}`;
        console.log("[MockAppBridge] Toast:", message, opts);
        return id;
      },
      hide: (id) => {
        console.log("[MockAppBridge] Hide toast:", id);
      }
    };
  }

  // src/resource-picker-bridge.ts
  async function openMockResourcePickerFromBridge(options) {
    const raw = await invokeFeature(
      "resourcePicker",
      "open",
      options,
      3e5
    );
    if (!raw || typeof raw !== "object") {
      return { cancelled: true, selection: [] };
    }
    return {
      cancelled: Boolean(raw.cancelled),
      selection: Array.isArray(raw.selection) ? raw.selection : []
    };
  }
  function bridgePayloadFromLegacyResourcePickerOptions(options) {
    let type = "product";
    if (options?.type === "variant" || options?.type === "product_variant") {
      type = "variant";
    } else if (options?.type === "collection") {
      type = "collection";
    }
    return {
      type,
      multiple: options?.multiple,
      selectionIds: options?.selectionIds
    };
  }

  // src/features/resource-picker.ts
  function resourcePicker() {
    return async (options) => {
      const payload = bridgePayloadFromLegacyResourcePickerOptions({
        type: options?.type,
        multiple: options?.multiple === true,
        selectionIds: options?.selectionIds
      });
      const result = await openMockResourcePickerFromBridge(payload);
      return result.cancelled ? [] : result.selection;
    };
  }

  // src/features/scanner.ts
  function scanner() {
    return {
      capture: async () => {
        return {
          data: ""
        };
      }
    };
  }

  // src/features/pos.ts
  function pos() {
    return {
      cart: {
        fetch: async () => ({
          subTotal: "0.00",
          taxTotal: "0.00",
          grandTotal: "0.00",
          lineItems: [],
          properties: {}
        }),
        subscribe: (callback) => {
          console.log("[MockAppBridge] POS cart subscribed:", callback);
          return () => {
          };
        },
        setCustomer: async (customer) => {
          console.log("[MockAppBridge] POS setCustomer:", customer);
        },
        removeCustomer: async () => {
          console.log("[MockAppBridge] POS removeCustomer");
        },
        addAddress: async (address) => {
          console.log("[MockAppBridge] POS addAddress:", address);
        },
        updateAddress: async (index, address) => {
          console.log("[MockAppBridge] POS updateAddress:", index, address);
        },
        applyCartDiscount: async (type, discountDescription, amount) => {
          console.log("[MockAppBridge] POS applyCartDiscount:", type, discountDescription, amount);
        },
        applyCartCodeDiscount: async (code) => {
          console.log("[MockAppBridge] POS applyCartCodeDiscount:", code);
        },
        removeCartDiscount: async () => {
          console.log("[MockAppBridge] POS removeCartDiscount");
        },
        removeAllDiscounts: async (disableAutomaticDiscounts) => {
          console.log("[MockAppBridge] POS removeAllDiscounts:", disableAutomaticDiscounts);
        },
        addCartProperties: async (properties) => {
          console.log("[MockAppBridge] POS addCartProperties:", properties);
        },
        removeCartProperties: async (keys) => {
          console.log("[MockAppBridge] POS removeCartProperties:", keys);
        },
        addCustomSale: async (customSale) => {
          console.log("[MockAppBridge] POS addCustomSale:", customSale);
        },
        clear: async () => {
          console.log("[MockAppBridge] POS clear cart");
        },
        addLineItem: async (variantId, quantity) => {
          console.log("[MockAppBridge] POS addLineItem:", variantId, quantity);
        },
        updateLineItem: async (uuid, quantity) => {
          console.log("[MockAppBridge] POS updateLineItem:", uuid, quantity);
        },
        removeLineItem: async (uuid) => {
          console.log("[MockAppBridge] POS removeLineItem:", uuid);
        },
        setLineItemDiscount: async (uuid, type, discountDescription, amount) => {
          console.log("[MockAppBridge] POS setLineItemDiscount:", uuid, type, discountDescription, amount);
        },
        removeLineItemDiscount: async (uuid) => {
          console.log("[MockAppBridge] POS removeLineItemDiscount:", uuid);
        },
        addLineItemProperties: async (uuid, properties) => {
          console.log("[MockAppBridge] POS addLineItemProperties:", uuid, properties);
        },
        removeLineItemProperties: async (uuid, properties) => {
          console.log("[MockAppBridge] POS removeLineItemProperties:", uuid, properties);
        }
      },
      close: async () => {
        console.log("[MockAppBridge] POS close");
      },
      device: async () => ({
        name: "",
        serialNumber: ""
      }),
      location: async () => ({
        id: 0,
        name: "",
        active: true
      })
    };
  }

  // src/features/intents.ts
  function intents() {
    return {
      invoke: async (query) => {
        console.log("[MockAppBridge] Intent invoked:", query);
        return {
          complete: Promise.resolve({ code: "ok" })
        };
      },
      register: (callback) => {
        console.log("[MockAppBridge] Intent handler registered:", callback);
        return () => {
        };
      }
    };
  }

  // src/features/web-vitals.ts
  function webVitals() {
    return {
      onReport: async (callback) => {
        console.log("[MockAppBridge] Web Vitals callback registered:", callback);
      }
    };
  }

  // src/features/support.ts
  function support() {
    return {
      registerHandler: async (callback) => {
        console.log("[MockAppBridge] Support handler registered:", callback);
      }
    };
  }

  // src/features/reviews.ts
  function reviews() {
    return {
      request: async () => {
        console.log("[MockAppBridge] Review requested");
        return {
          success: true,
          code: "success",
          message: "Review modal shown successfully"
        };
      }
    };
  }

  // src/features/picker.ts
  function picker() {
    return async (options) => {
      console.log("[MockAppBridge] Picker opened with options:", options);
      return {
        selected: Promise.resolve([])
      };
    };
  }

  // src/features/app.ts
  function app() {
    return {
      extensions: async () => {
        console.log("[MockAppBridge] Extensions requested");
        return [];
      }
    };
  }

  // src/features/loading.ts
  function loading() {
    return (isLoading) => {
      console.log("[MockAppBridge] Loading:", isLoading);
      void invokeFeature("loading", "setLoading", { isLoading: Boolean(isLoading) }).catch(
        (err) => {
          console.warn("[MockAppBridge] loading/setLoading failed:", err);
        }
      );
    };
  }

  // src/features/nav-menu.ts
  function observeNavMenuElements() {
    function extractNavItems(navMenu2) {
      const items = [];
      const links = navMenu2.querySelectorAll("a, ui-link, s-link");
      links.forEach((link) => {
        const href = link.getAttribute("href") || "/";
        const label = link.textContent?.trim() || "";
        const isHome = link.getAttribute("rel") === "home";
        if (label) {
          items.push({ label, href, isHome });
        }
      });
      return items;
    }
    function setupNavMenu(navMenu2) {
      navMenu2.style.display = "none";
      const items = extractNavItems(navMenu2);
      if (items.length > 0) {
        invokeFeature("navMenu", "setItems", { items });
      }
      const observer2 = new MutationObserver(() => {
        const updatedItems = extractNavItems(navMenu2);
        invokeFeature("navMenu", "setItems", { items: updatedItems });
      });
      observer2.observe(navMenu2, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
    function observeElements() {
      const selectors = ["ui-nav-menu", "nav-menu", "s-app-nav"];
      selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => setupNavMenu(el));
      });
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", observeElements);
    } else {
      observeElements();
    }
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            const tagName = node.tagName.toLowerCase();
            if (["ui-nav-menu", "nav-menu", "s-app-nav"].includes(tagName)) {
              setupNavMenu(node);
            }
          }
        });
      });
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
    window.addEventListener("message", (event) => {
      if (event.data?.type === "NAV_MENU_CLICK") {
        const href = event.data.href;
        if (href) {
          window.location.href = href;
        }
      }
    });
  }
  function navMenu() {
    if (typeof document !== "undefined") {
      observeNavMenuElements();
    }
    return {};
  }

  // src/index.ts
  (function(window2) {
    "use strict";
    const appInstances = /* @__PURE__ */ new Map();
    let currentSessionToken = null;
    let tokenRefreshInterval = null;
    const Actions = {
      Modal: {
        Action: {
          OPEN: "MODAL_OPEN",
          CLOSE: "MODAL_CLOSE",
          UPDATE: "MODAL_UPDATE",
          DATA: "MODAL_DATA"
        },
        Size: {
          Small: "small",
          Medium: "medium",
          Large: "large",
          Full: "full"
        },
        create: function(app2, options) {
          return {
            id: "modal_" + Date.now(),
            dispatch: function(action) {
              app2.dispatch({ type: action, payload: options });
            },
            set: function(newOptions) {
              Object.assign(options, newOptions);
              this.dispatch(Actions.Modal.Action.UPDATE);
            },
            unsubscribe: function() {
            }
          };
        }
      },
      Toast: {
        Action: {
          SHOW: "TOAST_SHOW",
          CLEAR: "TOAST_CLEAR"
        },
        create: function(app2, options) {
          return {
            dispatch: function(action) {
              if (action === Actions.Toast.Action.SHOW) {
                console.log("[MockAppBridge] Toast:", options.message);
              }
            }
          };
        }
      },
      Loading: {
        Action: {
          START: "LOADING_START",
          STOP: "LOADING_STOP"
        },
        create: function(app2) {
          return {
            dispatch: function(action) {
              app2.dispatch({ type: action });
            }
          };
        }
      },
      TitleBar: {
        Action: {
          UPDATE: "TITLEBAR_UPDATE"
        },
        create: function(app2, options) {
          return {
            set: function(newOptions) {
              Object.assign(options, newOptions);
              app2.dispatch({ type: Actions.TitleBar.Action.UPDATE, payload: options });
            }
          };
        }
      },
      ResourcePicker: {
        Action: {
          OPEN: "RESOURCE_PICKER_OPEN",
          SELECT: "RESOURCE_PICKER_SELECT",
          CANCEL: "RESOURCE_PICKER_CANCEL"
        },
        ResourceType: {
          Product: "product",
          ProductVariant: "variant",
          Collection: "collection"
        },
        create: function(app2, options) {
          const subscribers = /* @__PURE__ */ new Map();
          const notifySubscribers = (action, payload) => {
            subscribers.forEach((callback) => {
              if (callback.action === action) {
                callback.handler(payload);
              }
            });
          };
          return {
            dispatch: function(action) {
              if (action === Actions.ResourcePicker.Action.OPEN) {
                void openMockResourcePickerFromBridge(
                  bridgePayloadFromLegacyResourcePickerOptions({
                    type: options?.type,
                    multiple: options?.multiple,
                    selectionIds: options?.selectionIds
                  })
                ).then((result) => {
                  if (result.cancelled) {
                    notifySubscribers(Actions.ResourcePicker.Action.CANCEL, {});
                  } else {
                    notifySubscribers(Actions.ResourcePicker.Action.SELECT, {
                      selection: result.selection
                    });
                  }
                }).catch(() => {
                  notifySubscribers(Actions.ResourcePicker.Action.CANCEL, {});
                });
              }
            },
            subscribe: function(action, handler) {
              const id = Date.now();
              subscribers.set(id, { action, handler });
              return () => subscribers.delete(id);
            }
          };
        }
      },
      Redirect: {
        Action: {
          APP: "APP_REDIRECT",
          REMOTE: "REMOTE_REDIRECT",
          ADMIN_PATH: "ADMIN_PATH_REDIRECT"
        },
        create: function(app2) {
          return {
            dispatch: function(action, payload) {
              if (action === Actions.Redirect.Action.REMOTE) {
                window2.open(payload.url, payload.newContext ? "_blank" : "_self");
              }
            }
          };
        },
        toRemote: function(payload) {
          return { type: Actions.Redirect.Action.REMOTE, payload };
        },
        toApp: function(payload) {
          return { type: Actions.Redirect.Action.APP, payload };
        }
      },
      Error: {
        Action: {
          INVALID_ACTION: "INVALID_ACTION",
          INVALID_PAYLOAD: "INVALID_PAYLOAD",
          NETWORK: "NETWORK_ERROR",
          UNAUTHORIZED: "UNAUTHORIZED"
        }
      }
    };
    const utilities = {
      getSessionToken: async function(_app) {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Session token request timeout"));
          }, 5e3);
          const handler = function(event) {
            if (event.data && event.data.type === "SESSION_TOKEN_RESPONSE") {
              clearTimeout(timeout);
              window2.removeEventListener("message", handler);
              currentSessionToken = event.data.token;
              resolve(event.data.token);
            }
          };
          window2.addEventListener("message", handler);
          window2.parent.postMessage({
            type: "SESSION_TOKEN_REQUEST",
            source: "app"
          }, "*");
        });
      },
      /**
       * Adopt the `id_token` the host put in the iframe URL.
       *
       * `getSessionToken` only fills `currentSessionToken` once the app asks for a token, but the
       * patched `window.fetch` below needs one from the very first request. An app that never calls
       * `shopify.idToken()` (most apps — the real App Bridge hands them an authenticated `fetch`)
       * would otherwise send every data request unauthenticated, and the host would bounce it to
       * the session-token page instead of returning data.
       */
      seedSessionTokenFromUrl: function() {
        try {
          const fromUrl = new URLSearchParams(window2.location.search).get("id_token");
          if (fromUrl && !currentSessionToken) {
            currentSessionToken = fromUrl;
            console.log("[MockAppBridge] Seeded session token from id_token URL param");
          }
        } catch (e) {
          console.warn("[MockAppBridge] Could not read id_token from URL:", e.message);
        }
        return currentSessionToken;
      },
      /**
       * Keep a live token in hand. Mock tokens are short-lived by design (see
       * `sessionTokenTtlSeconds`), and a stale one fails validation exactly like no token at all.
       */
      startSessionTokenRefresh: function(ttlSeconds) {
        if (tokenRefreshInterval) return;
        if (window2.parent === window2) return;
        const ttlMs = (ttlSeconds && ttlSeconds > 0 ? ttlSeconds : 60) * 1e3;
        const intervalMs = Math.max(5e3, Math.min(3e4, Math.floor(ttlMs / 2)));
        tokenRefreshInterval = window2.setInterval(async () => {
          try {
            await utilities.getSessionToken(null);
          } catch (error) {
            console.error("[MockAppBridge] Token refresh failed:", error);
          }
        }, intervalMs);
      },
      authenticatedFetch: function(app2, fetch2) {
        return async function(...args) {
          const token = await utilities.getSessionToken(app2);
          const url = args[0];
          const options = args[1] || {};
          if (typeof url === "string") {
            options.headers = options.headers || {};
            if (options.headers instanceof Headers) {
              options.headers.append("Authorization", `Bearer ${token}`);
            } else {
              options.headers["Authorization"] = `Bearer ${token}`;
            }
          }
          return fetch2(url, options);
        };
      }
    };
    function createApp(config2) {
      if (!config2.apiKey) {
        throw new Error("API key is required");
      }
      if (!config2.host) {
        throw new Error("Host is required");
      }
      const app2 = {
        config: config2,
        listeners: /* @__PURE__ */ new Set(),
        errorListeners: /* @__PURE__ */ new Set(),
        dispatch: function(action) {
          console.log("[MockAppBridge] Dispatching:", action);
          window2.parent.postMessage({
            type: "APP_BRIDGE_ACTION",
            action,
            source: "app"
          }, "*");
          this.listeners.forEach((listener) => listener(action));
        },
        subscribe: function(eventNameOrCallback, callback) {
          const handler = callback || eventNameOrCallback;
          const wrappedHandler = (action) => {
            if (typeof eventNameOrCallback === "string") {
              if (action.type === eventNameOrCallback) {
                handler(action);
              }
            } else {
              handler(action);
            }
          };
          this.listeners.add(wrappedHandler);
          return () => {
            this.listeners.delete(wrappedHandler);
          };
        },
        error: function(callback) {
          this.errorListeners.add(callback);
          return () => {
            this.errorListeners.delete(callback);
          };
        },
        getState: async function() {
          return {
            staffMember: {
              id: "123456789",
              name: "Test User",
              email: "test@mockshop.com"
            },
            shop: {
              domain: new URL(atob(config2.host)).hostname,
              name: "Mock Shop"
            }
          };
        },
        // Add idToken method for @shopify/app-bridge-react compatibility
        idToken: async function() {
          return utilities.getSessionToken(app2);
        }
      };
      appInstances.set(config2.apiKey, app2);
      utilities.startSessionTokenRefresh();
      return app2;
    }
    const platform = {
      isShopifyEmbedded: function() {
        return window2.self !== window2.top;
      },
      isMobile: function() {
        return /mobile|android|iphone|ipad/i.test(navigator.userAgent);
      },
      isShopifyMobile: function() {
        return false;
      },
      isShopifyPOS: function() {
        return false;
      }
    };
    window2.createApp = createApp;
    window2.shopifyAppBridge = {
      createApp,
      actions: Actions,
      utilities,
      platform
    };
    window2.shopify = {
      modal: modal(),
      saveBar: saveBar(),
      scopes: scopes(),
      config: config(),
      environment: environment(),
      user: user(),
      toast: toast(),
      resourcePicker: resourcePicker(),
      scanner: scanner(),
      pos: pos(),
      intents: intents(),
      webVitals: webVitals(),
      support: support(),
      reviews: reviews(),
      picker: picker(),
      app: app(),
      // Lifecycle methods
      ready: Promise.resolve(),
      loading: loading(),
      // Origin should be empty string for mock
      origin: "",
      // Add idToken method directly to shopify global for useAppBridge() compatibility
      idToken: async function() {
        console.log("[MockAppBridge] idToken called on shopify global");
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Session token request timeout"));
          }, 5e3);
          const handler = function(event) {
            if (event.data && event.data.type === "SESSION_TOKEN_RESPONSE") {
              clearTimeout(timeout);
              window2.removeEventListener("message", handler);
              currentSessionToken = event.data.token;
              resolve(event.data.token);
            }
          };
          window2.addEventListener("message", handler);
          window2.parent.postMessage({
            type: "SESSION_TOKEN_REQUEST",
            source: "app"
          }, "*");
        });
      }
    };
    if (!window2.ShopifyAppBridge) {
      window2.ShopifyAppBridge = {
        createApp,
        actions: Actions,
        utilities,
        platform
      };
    }
    navMenu();
    console.log("[MockAppBridge] Client library loaded");
    let adminApiConfig = "mock";
    let mockServerUrl = "";
    const detectMockServerUrl = () => {
      const scripts = document.querySelectorAll('script[src*="app-bridge.js"]');
      for (const script of Array.from(scripts)) {
        const src = script.src;
        if (src) {
          const url = new URL(src);
          return url.origin;
        }
      }
      try {
        if (window2.parent !== window2) {
          return window2.parent.location.origin;
        }
      } catch (e) {
      }
      return "http://localhost:3080";
    };
    mockServerUrl = detectMockServerUrl();
    utilities.seedSessionTokenFromUrl();
    utilities.startSessionTokenRefresh();
    const fetchAdminApiConfig = async () => {
      try {
        const response = await fetch(`${mockServerUrl}/api/config`);
        const config2 = await response.json();
        if (config2.adminApi) {
          adminApiConfig = config2.adminApi;
          console.log("[MockAppBridge] Admin API config:", adminApiConfig);
        }
        if (config2.sessionTokenTtlSeconds) {
          if (tokenRefreshInterval) {
            window2.clearInterval(tokenRefreshInterval);
            tokenRefreshInterval = null;
          }
          utilities.startSessionTokenRefresh(config2.sessionTokenTtlSeconds);
        }
      } catch (error) {
        console.warn("[MockAppBridge] Could not fetch admin API config, using default (mock)");
      }
    };
    fetchAdminApiConfig();
    const isAdminApiRequest = (url) => {
      if (typeof url !== "string") return false;
      return url.includes("/admin/api/") || url.match(/^https:\/\/[^/]+\.myshopify\.com\/admin\/api\//) !== null;
    };
    const _fetch = window2.fetch;
    window2.fetch = async (...args) => {
      const [input, init] = args;
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const options = init || {};
      const headers = {};
      if (options.headers) {
        if (options.headers instanceof Headers) {
          options.headers.forEach((value, key) => {
            headers[key] = value;
          });
        } else if (Array.isArray(options.headers)) {
          options.headers.forEach(([key, value]) => {
            headers[key] = value;
          });
        } else {
          Object.assign(headers, options.headers);
        }
      }
      if (currentSessionToken) {
        headers["Authorization"] = `Bearer ${currentSessionToken}`;
      }
      if (isAdminApiRequest(url)) {
        console.log("[MockAppBridge] Intercepting Admin API request:", url);
        if (adminApiConfig === "mock") {
          return _fetch(`${mockServerUrl}/mock-admin-api`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...headers
            },
            body: JSON.stringify({
              url,
              method: options.method || "GET",
              body: options.body
            })
          });
        } else if (typeof adminApiConfig === "object" && "proxy" in adminApiConfig) {
          return _fetch(adminApiConfig.proxy, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...headers
            },
            body: JSON.stringify({
              url,
              method: options.method || "GET",
              body: options.body
            })
          });
        } else if (typeof adminApiConfig === "object" && "accessToken" in adminApiConfig) {
          headers["X-Shopify-Access-Token"] = adminApiConfig.accessToken;
          delete headers["Authorization"];
          return _fetch(url, {
            ...options,
            headers
          });
        }
      }
      return _fetch(input, {
        ...options,
        headers
      });
    };
  })(window);
})();
