!function () {
  var t, n, e;
  const i = Symbol.for("RemoteUi::Retain")
    , o = Symbol.for("RemoteUi::Release")
    , r = Symbol.for("RemoteUi::RetainedBy");
  class a {
    constructor() {
      this.memoryManaged = new Set
    }
    add(t) {
      this.memoryManaged.add(t),
        t[r].add(this),
        t[i]()
    }
    release() {
      for (const t of this.memoryManaged)
        t[r].delete(this),
          t[o]();
      this.memoryManaged.clear()
    }
  }
  function s(t) {
    return !!(t && t[i] && t[o])
  }
  function c(t, { deep: n = !0 } = {}) {
    return l(t, n, new Map)
  }
  function l(t, n, e) {
    const o = e.get(t);
    if (null != o)
      return o;
    const r = s(t);
    if (r && t[i](),
      e.set(t, r),
      n) {
      if (Array.isArray(t)) {
        const i = t.reduce(((t, i) => l(i, n, e) || t), r);
        return e.set(t, i),
          i
      }
      if (f(t)) {
        const i = Object.keys(t).reduce(((i, o) => l(t[o], n, e) || i), r);
        return e.set(t, i),
          i
      }
    }
    return e.set(t, r),
      r
  }
  function u(t, { deep: n = !0 } = {}) {
    return d(t, n, new Map)
  }
  function d(t, n, e) {
    const i = e.get(t);
    if (null != i)
      return i;
    const r = s(t);
    if (r && t[o](),
      e.set(t, r),
      n) {
      if (Array.isArray(t)) {
        const i = t.reduce(((t, i) => d(i, n, e) || t), r);
        return e.set(t, i),
          i
      }
      if (f(t)) {
        const i = Object.keys(t).reduce(((i, o) => d(t[o], n, e) || i), r);
        return e.set(t, i),
          i
      }
    }
    return r
  }
  function f(t) {
    if (null == t || "object" != typeof t)
      return !1;
    const n = Object.getPrototypeOf(t);
    return null == n || n === Object.prototype
  }
  const h = "_@f";
  function p(t) {
    const n = new Map
      , e = new Map
      , c = new Map;
    return {
      encode: function i(o, r = new Map) {
        if (null == o)
          return [o];
        const a = r.get(o);
        if (a)
          return a;
        if ("object" == typeof o) {
          if (Array.isArray(o)) {
            r.set(o, [void 0]);
            const t = []
              , n = [o.map((n => {
                const [e, o = []] = i(n, r);
                return t.push(...o),
                  e
              }
              )), t];
            return r.set(o, n),
              n
          }
          if (f(o)) {
            r.set(o, [void 0]);
            const t = []
              , n = [Object.keys(o).reduce(((n, e) => {
                const [a, s = []] = i(o[e], r);
                return t.push(...s),
                {
                  ...n,
                  [e]: a
                }
              }
              ), {}), t];
            return r.set(o, n),
              n
          }
        }
        if ("function" == typeof o) {
          if (n.has(o)) {
            const t = n.get(o)
              , e = [{
                [h]: t
              }];
            return r.set(o, e),
              e
          }
          const i = t.uuid();
          n.set(o, i),
            e.set(i, o);
          const a = [{
            [h]: i
          }];
          return r.set(o, a),
            a
        }
        const s = [o];
        return r.set(o, s),
          s
      },
      decode: l,
      async call(t, n) {
        const i = new a
          , o = e.get(t);
        if (null == o)
          throw Error("You attempted to call a function that was already released.");
        try {
          const t = s(o) ? [i, ...o[r]] : [i];
          return await o(...l(n, t))
        } finally {
          i.release()
        }
      },
      release(t) {
        const i = e.get(t);
        i && (e.delete(t),
          n.delete(i))
      },
      terminate() {
        n.clear(),
          e.clear(),
          c.clear()
      }
    };
    function l(n, e) {
      if ("object" == typeof n) {
        if (null == n)
          return n;
        if (Array.isArray(n))
          return n.map((t => l(t, e)));
        if (h in n) {
          const a = n[h];
          if (c.has(a))
            return c.get(a);
          let s = 0
            , l = !1;
          const u = () => {
            s -= 1,
              0 === s && (l = !0,
                c.delete(a),
                t.release(a))
          }
            , d = () => {
              s += 1
            }
            , f = new Set(e)
            , p = (...n) => {
              if (l)
                throw Error("You attempted to call a function that was already released.");
              if (!c.has(a))
                throw Error("You attempted to call a function that was already revoked.");
              return t.call(a, n)
            }
            ;
          Object.defineProperties(p, {
            [o]: {
              value: u,
              writable: !1
            },
            [i]: {
              value: d,
              writable: !1
            },
            [r]: {
              value: f,
              writable: !1
            }
          });
          for (const t of f)
            t.add(p);
          return c.set(a, p),
            p
        }
        if (f(n))
          return Object.keys(n).reduce(((t, i) => ({
            ...t,
            [i]: l(n[i], e)
          })), {})
      }
      return n
    }
  }
  function v() {
    return `${m()}-${m()}-${m()}-${m()}`
  }
  function m() {
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)
  }
  function w(t, n) {
    if (n)
      for (let e in n) {
        const i = n[e];
        null != i && "" !== i && (t[e] = i)
      }
  }
  function b(t, n) {
    customElements.get(t) || customElements.define(t, n)
  }
  const y = null != (t = globalThis.HTMLElement) ? t : class {
  }
    ;
  class g extends y {
    constructor() {
      super(),
        this.attachShadow({
          mode: "open"
        }).innerHTML = "<style>:host{display: none;}</style><slot></slot>"
    }
  }
  function A(t) {
    return t.replace(/-([a-z])/gi, ((t, n) => n.toUpperCase()))
  }
  function E(t) {
    try {
      return navigator.userAgent.toLowerCase().includes(t.toLowerCase())
    } catch (n) {
      return !1
    }
  }
  function k() {
    return E("Unframed") && "MobileWebView" in window
  }
  function C() {
    return E("Shopify Mobile")
  }
  function P() {
    return E("Extensibility")
  }
  function L() {
    return E("Shopify POS")
  }
  const T = "app-iframe"
    , S = /frame:\/*([^/]+)\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?$/
    , I = (() => {
      var t;
      const [, n, e, i] = null != (t = window.name.match(S)) ? t : [];
      return {
        apiKey: n,
        scope: e,
        mode: i
      }
    }
    )()
    , x = window.name.startsWith(T) || "main" === I.scope
    , M = "modal" === I.scope
    , R = ["hmac", "locale", "protocol", "session", "id_token", "shop", "timestamp", "host", "embedded", "appLoadId", "link_source"];
  function O(t) {
    const n = new URL(t);
    return R.forEach((t => n.searchParams.delete(t))),
      n
  }
  const $ = ["FailedAuthentication", "InvalidAction", "InvalidActionType", "InvalidOptions", "InvalidOrigin", "InvalidPayload", "Network", "Permission", "Persistence", "UnexpectedAction", "UnsupportedOperation"];
  function B(t, n, e) {
    $.forEach((i => {
      t.subscribe("Error." + i, n, e)
    }
    ))
  }
  function F() {
    let t, n = !1;
    const e = new Promise((n => {
      t = n
    }
    ));
    return {
      get promise() {
        return e
      },
      resolve(e) {
        n = !0,
          t(e)
      },
      get resolved() {
        return n
      }
    }
  }
  function _() {
    let t = Promise.resolve();
    const n = {};
    return {
      get promise() {
        return t
      },
      has: t => !!n[t],
      add(e) {
        const i = F();
        n[e] = i,
          t = t.then((() => i.promise))
      },
      resolve(t) {
        const e = n[t];
        e && (e.resolve(null),
          delete n[t])
      },
      isResolved(t) {
        const e = n[t];
        return !e || e.resolved
      }
    }
  }
  function N({ keys: t, held: n, handler: e, keyEvent: i = "keydown" }) {
    let o = [];
    const r = i => {
      t.flat().includes(i.key) ? (o.push(i.key),
        (e => {
          const i = t.every((t => o.includes(t)))
            , r = !n || ((t, n) => n.some((n => t.getModifierState(n))))(e, n);
          return i && r
        }
        )(i) && !a() && e(i)) : s()
    }
      , a = () => {
        const t = document.activeElement;
        return null != t && null != t.nodeName && ("INPUT" === t.nodeName || "SELECT" === t.nodeName || "TEXTAREA" === t.nodeName || t.hasAttribute("contenteditable"))
      }
      , s = () => {
        o = []
      }
      ;
    return document.addEventListener(i, r, {
      capture: !0
    }),
      () => {
        document.removeEventListener(i, r, {
          capture: !0
        })
      }
  }
  function U() {
    const t = window.shopify.config.host;
    return "https://" + atob(t)
  }
  const D = Symbol()
    , j = Symbol()
    , q = Symbol()
    , z = Symbol()
    , V = "data-save-bar"
    , H = "data-discard-confirmation"
    , W = "ui-save-bar"
    , X = "update";
  function K(t, { onChange: n, filter: e = () => !0 }) {
    function i() {
      const i = nt(t).filter((t => Y(t) && e(t)));
      let o = !1
        , r = !1;
      for (const t of i)
        if (o = [].some.call(t.elements, Q),
          o)
          break;
      for (const t of i)
        if (r = t.hasAttribute(H),
          r)
          break;
      const a = o ? {
        discardConfirmation: r,
        saveButton: {
          onAction: () => function (t) {
            for (const n of nt(t))
              Y(n) && Z(n)
          }(t)
        },
        discardButton: {
          onAction: () => function (t) {
            for (const n of nt(t))
              Y(n) && tt(n)
          }(t)
        }
      } : void 0;
      n(a)
    }
    function o(t) {
      const n = "target" in t ? t.target : t;
      n && (n[D] || ("values" in n && (n[q] = n.values),
        "value" in n && ("defaultValue" in n && (n.defaultValue = n.value),
          n[j] = n.value),
        "checked" in n && (n[z] = n.checked)))
    }
    function r(t) {
      const n = t.target;
      n && (n[D] = !0,
        i())
    }
    function a(t) {
      const n = t.target;
      if (Y(n)) {
        for (const t of n.elements)
          t[D] = !1,
            o(t);
        i()
      }
    }
    function s(t) {
      const n = t.target;
      if (Y(n)) {
        for (const t of n.elements) {
          if (q in t && "values" in t && (t.values = t[q]),
            j in t) {
            const n = Object.getOwnPropertyDescriptor(t.constructor.prototype, "value");
            n && n.set ? n.set.call(t, t[j]) : t.value = t[j]
          }
          z in t && (t.checked = t[z]),
            t[D] = !1,
            o(t),
            J(t),
            t[D] = !1
        }
        i()
      }
    }
    i();
    const c = new MutationObserver((t => {
      for (const n of t)
        if (n.attributeName && "form" === n.target.nodeName.toLowerCase())
          return i()
    }
    ));
    return c.observe(t, {
      subtree: !0,
      childList: !0,
      attributes: !0,
      attributeFilter: [V, H]
    }),
      t.addEventListener("focusin", o),
      t.addEventListener("beforeinput", o),
      t.addEventListener("change", r),
      t.addEventListener("input", r),
      t.addEventListener("submit", a),
      t.addEventListener("reset", s),
    {
      onChange: i,
      unobserve: () => {
        c.disconnect(),
          t.removeEventListener("focusin", o),
          t.removeEventListener("beforeinput", o),
          t.removeEventListener("change", r),
          t.removeEventListener("input", r),
          t.removeEventListener("submit", a),
          t.removeEventListener("reset", s)
      }
    }
  }
  function G(t, { onChange: n, filter: e = () => !0 }) {
    function i() {
      var i, o, r, a, s, c;
      const l = Array.from(t.querySelectorAll(W)).filter((t => e(t) && t.showing))
        , u = l.length > 0 ? l[l.length - 1] : void 0
        , d = u ? {
          discardConfirmation: u.discardConfirmation,
          saveButton: {
            loading: null == (i = u.saveButton) ? void 0 : i.loading,
            disabled: null == (o = u.saveButton) ? void 0 : o.disabled,
            onAction: null == (r = u.saveButton) ? void 0 : r.onAction
          },
          discardButton: {
            loading: null == (a = u.discardButton) ? void 0 : a.loading,
            disabled: null == (s = u.discardButton) ? void 0 : s.disabled,
            onAction: null == (c = u.discardButton) ? void 0 : c.onAction
          }
        } : void 0;
      n(d)
    }
    function o(t) {
      var n;
      (n = t.target) && n instanceof Element && n.nodeName.toLowerCase() === W && (t.stopPropagation(),
        i())
    }
    return t.addEventListener(X, o),
    {
      onChange: i,
      unobserve: () => {
        t.removeEventListener(X, o)
      }
    }
  }
  function J(t) {
    !("type" in t) || "radio" !== t.type && "checkbox" !== t.type || t.dispatchEvent(new Event("click", {
      bubbles: !0
    })),
      t.dispatchEvent(new InputEvent("input", {
        bubbles: !0,
        inputType: "reset"
      })),
      t.dispatchEvent(new Event("change", {
        bubbles: !0
      }))
  }
  function Y(t) {
    return !!t && t instanceof Element && "form" === t.nodeName.toLowerCase() && t.hasAttribute(V)
  }
  function Q(t) {
    return !0 === t[D] && ("value" in t && t.value !== t[j] || "values" in t && t.values !== t[q] || "checked" in t && t.checked !== t[z])
  }
  function Z(t) {
    if (t.requestSubmit)
      return t.requestSubmit();
    const n = document.createElement("input");
    n.type = "submit",
      n.hidden = !0,
      t.appendChild(n),
      n.click(),
      t.removeChild(n)
  }
  function tt(t) {
    t.reset()
  }
  function nt(t) {
    const n = Array.from(t.querySelectorAll("form"));
    return t instanceof HTMLFormElement && n.push(t),
      n
  }
  class et {
    constructor() {
      this.listeners = new Map
    }
    addEventListener(t, n) {
      this.listeners.has(t) || this.listeners.set(t, new Set),
        this.listeners.get(t).add(n)
    }
    removeEventListener(t, n) {
      this.listeners.has(t) && this.listeners.get(t).delete(n)
    }
    async dispatchEvent(t, n, e) {
      if (!this.listeners.has(t))
        return !0;
      c(n);
      const i = new CustomEvent(t, {
        detail: n
      })
        , o = Promise.all(Array.from(this.listeners.get(t)).map((t => t(i)))).finally((() => u(n)));
      return !1 !== (null == e ? void 0 : e.wait) && await o,
        !i.defaultPrevented
    }
  }
  const it = /\/app\-?bridge[/.-]/i
    , ot = "https://cdn.shopify.com/shopifycloud/app-bridge.js"
    , rt = null != (e = "object" == typeof document ? null == (n = window.document.currentScript) ? void 0 : n.src : void 0) ? e : ot
    , at = function (t) {
      try {
        return new URL(t).origin
      } catch (n) {
        return null
      }
    }(rt) || ""
    , st = {
      apiKey: "",
      appOrigins: [],
      debug: {},
      disabledFeatures: [],
      experimentalFeatures: [],
      locale: "en-US",
      host: ""
    }
    , ct = new URL(/^https:\/\/cdn\.shopify(\.com|cdn\.net)$/.test(at) ? rt : ot).hostname;
  function lt(t, n) {
    var e, i;
    switch (t) {
      case "disabledFeatures":
      case "experimentalFeatures":
      case "appOrigins":
        return null != (i = null == (e = null == n ? void 0 : n.split(",")) ? void 0 : e.map((t => t.trim()))) ? i : void 0;
      case "debug":
        return {
          webVitals: null == n ? void 0 : n.includes("web-vitals")
        };
      default:
        return n
    }
  }
  const ut = ["apiKey", "shop"]
    , dt = C() || L() ? /(^admin\.shopify\.com|\.myshopify\.com|\.spin\.dev|admin\.shop\.dev|localhost|\.myshopify\.io)$/ : /(^admin\.shopify\.com|\.spin\.dev|admin\.shop\.dev|localhost)$/
    , ft = {
      TITLE_BAR: "TITLEBAR",
      WEBVITALS: "WEB_VITALS"
    };
  function ht(t, n) {
    var e;
    const [i, ...o] = t.split(".")
      , r = pt(i);
    let a = "APP::" + (null != (e = ft[r]) ? e : r);
    for (const c of o)
      a += "::" + pt(c);
    const s = {
      group: i,
      type: a
    };
    return null != n && (s.payload = n),
      s
  }
  function pt(t) {
    return t.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase()
  }
  const vt = Symbol();
  function mt(t, n, e) {
    const i = t[n];
    return Object.defineProperty(t, n, {
      enumerable: !0,
      configurable: !0,
      value: e,
      writable: !0
    }),
      e[vt] = i,
      i
  }
  function wt(t, n) {
    const e = t[n][vt];
    e && Object.defineProperty(t, n, {
      enumerable: !0,
      configurable: !0,
      value: e,
      writable: !0
    })
  }
  const bt = ({ api: t, protocol: n, internalApiPromise: e }) => {
    const i = self.fetch;
    async function o(t, n) {
      const e = new Headers(n.headers).get("Shopify-Challenge-Required");
      return e && (null == t ? void 0 : t.isChallengeUrl) && await t.isChallengeUrl(e) && (null == t ? void 0 : t.startChallenge) ? {
        verified: await t.startChallenge(e)
      } : {
        verified: !1
      }
    }
    mt(globalThis, "fetch", (async function (r, a) {
      var s;
      const c = new Request(r instanceof Request ? r.clone() : r, a)
        , { appOrigins: l = [] } = t.config
        , u = new URL(c.url)
        , d = u.protocol === location.protocol && (u.hostname === location.hostname || u.hostname.endsWith("." + location.hostname)) || l.includes(u.origin)
        , f = "cdn.shopify.com" === u.hostname
        , { adminApi: h, trustChallenge: p } = await e || {};
      if (!d && !f && "function" == typeof (null == h ? void 0 : h.shouldIntercept) && "function" == typeof h.fetch) {
        const t = Array.from(c.headers.entries())
          , n = await h.shouldIntercept(c.method, c.url, t);
        if (null == n ? void 0 : n.intercept) {
          const n = {
            method: c.method,
            url: c.url,
            headers: t,
            body: null != (s = await c.text()) ? s : void 0
          }
            , e = await h.fetch(n);
          if (!p)
            return new Response(e.body, e);
          const { verified: i } = await o(p, e);
          if (i) {
            const t = await h.fetch(n);
            return new Response(t.body, t)
          }
          return new Response(e.body, e)
        }
      }
      const v = d && !c.headers.has("Authorization");
      v && c.headers.set("Authorization", "Bearer " + await t.idToken()),
        d && !c.headers.has("X-Requested-With") && c.headers.set("X-Requested-With", "XMLHttpRequest"),
        d && !c.headers.has("Accept-Language") && void 0 !== t.config.locale && c.headers.set("Accept-Language", t.config.locale);
      const m = c.clone();
      let w = await i(c);
      w.headers.get("X-Shopify-Retry-Invalid-Session-Request") && v && (m.headers.set("Authorization", "Bearer " + await t.idToken()),
        w = await i(m));
      const b = w.headers.get("X-Shopify-API-Request-Failure-Reauthorize-Url");
      if (d && b)
        return n.send("Navigation.redirect.remote", {
          url: new URL(b, location.href).href
        }),
          new Promise((() => { }
          ));
      if (d) {
        const { verified: t } = await o(p, w);
        if (t)
          return await i(m)
      }
      return w
    }
    ))
  }
    , yt = ({ api: t, protocol: n, internalApiPromise: e }) => {
      t.idToken = async function () {
        const { idToken: t } = await e || {};
        return t ? await t() : new Promise((t => {
          n.subscribe("SessionToken.respond", (({ sessionToken: n }) => {
            t(n)
          }
          ), {
            once: !0
          }),
            n.send("SessionToken.request")
        }
        ))
      }
    }
    , gt = Symbol();
  class At {
    constructor(t, n, e, i) {
      this.action = t,
        this.type = n,
        this.data = e,
        this[gt] = i
    }
    finish() {
      this[gt]()
    }
  }
  class Et {
    constructor(t) {
      this.complete = t
    }
  }
  async function kt(t) {
    try {
      const n = "function" == typeof t ? t() : (await t)();
      return await Promise.resolve(n)
    } catch (n) { }
  }
  const Ct = ["shopify:", "app:", "extension:"]
    , Pt = [...Ct, "https:", "http:"]
    , Lt = ["_self", "_top", "_parent", "_blank"]
    , Tt = ["a", "s-link", "s-button", "s-clickable"]
    , St = Symbol("SIMULATING_CLICK");
  function It(t, n) {
    addEventListener("click", (function e(i) {
      i.target === t && (removeEventListener("click", e),
        i.defaultPrevented || n(i))
    }
    ))
  }
  function xt(t, n = !0) {
    let e = new URL(t, location.href);
    if (Ct.includes(e.protocol)) {
      const t = `${e.host}${e.pathname}${e.search}`
        , n = t.startsWith("/") ? t : "/" + t;
      e = new URL(`${e.protocol}${n}`)
    }
    return n && "app:" === e.protocol && (e.host = location.host,
      e.protocol = location.protocol),
      e.origin === location.origin ? (e.hash = "",
        O(e)) : e
  }
  function Mt(t, n, e) {
    const i = xt(t)
      , o = [...Tt.map((t => "ui-nav-menu > " + t)), ...Tt.map((t => t))].join(",");
    return Array.from(document.querySelectorAll(o)).filter((t => {
      var o, r;
      const a = t.getAttribute("href")
        , s = null != (o = t.getAttribute("target")) ? o : "_self"
        , c = null != (r = t.getAttribute("rel")) ? r : "";
      return !(!a || !Ot(i, xt(a)) || n && s !== n || e && c !== e)
    }
    ))[0]
  }
  function Rt(t) {
    return t.replace(/\/+$/g, "")
  }
  function Ot(t, n) {
    if (t.href === n.href)
      return !0;
    if (t.protocol !== n.protocol || t.host !== n.host || Rt(t.pathname) !== Rt(n.pathname))
      return !1;
    if (!t.search && !n.search)
      return !0;
    if (!t.search || !n.search)
      return !1;
    const e = new URLSearchParams(t.search)
      , i = new URLSearchParams(n.search)
      , o = Array.from(e.entries()).sort((([t], [n]) => t.localeCompare(n)))
      , r = Array.from(i.entries()).sort((([t], [n]) => t.localeCompare(n)));
    return o.length === r.length && o.every((([t, n], e) => t === r[e][0] && n === r[e][1]))
  }
  const $t = ({ internalApiPromise: t, saveBarManager: n, rpcEventTarget: e }) => {
    const i = new AbortController;
    async function o(e) {
      var i;
      const { navigation: o } = await t
        , r = new URL(e.detail.destination.url, location.href)
        , a = `${r.pathname}${r.search}`;
      if (n.isSaveBarVisible)
        return;
      const s = xt(a);
      if (Ot(s, xt(location.href)))
        return;
      const c = Mt(s, "_self")
        , { pathname: l, search: u } = s;
      c ? (c[St] = !0,
        It(c, (t => {
          (function (t) {
            var n;
            const e = t.getAttribute("href");
            if (!e)
              return !1;
            const i = xt(e)
              , o = null != (n = t.getAttribute("target")) ? n : "_self";
            return i.origin === location.origin && "_self" === o
          }
          )(c) && (t.preventDefault(),
            t.stopImmediatePropagation(),
            kt((() => {
              var t;
              return null == (t = null == o ? void 0 : o.navigate) ? void 0 : t.call(o, `app:${l}${u}`)
            }
            )))
        }
        )),
        c.click(),
        c[St] = !1) : await (null == (i = null == o ? void 0 : o.navigate) ? void 0 : i.call(o, `app:${l}${u}`))
    }
    e.addEventListener("navigate", o),
      i.signal.addEventListener("abort", (() => {
        e.removeEventListener("navigate", o)
      }
      )),
      addEventListener("beforeunload", (() => i.abort())),
      addEventListener("click", (t => {
        var e, i;
        if (t.target && t.target[St])
          return;
        if (t.defaultPrevented)
          return;
        const o = function (t) {
          if (!t)
            return;
          let n = t;
          for (; n;) {
            if (n instanceof Element && Tt.includes(n.nodeName.toLowerCase())) {
              if (null == n.getAttribute("href")) {
                n = n.parentNode;
                continue
              }
              return n
            }
            n = n.parentNode
          }
        }(t.target)
          , r = null == o ? void 0 : o.getAttribute("href")
          , a = null != (e = null == o ? void 0 : o.getAttribute("target")) ? e : "_self"
          , s = null != (i = null == o ? void 0 : o.getAttribute("rel")) ? i : void 0;
        if (!o || !r)
          return;
        const { protocol: u } = xt(r);
        return Pt.includes(u) ? n.isSaveBarVisible ? (t.preventDefault(),
          t.stopImmediatePropagation(),
          void l()) : void It(o, (t => {
            c(r, a, s) && (t.preventDefault(),
              t.stopImmediatePropagation())
          }
          )) : void 0
      }
      ), !0);
    const r = self.open;
    mt(self, "open", (function (t, e, i) {
      const o = t ? xt(t).protocol : void 0;
      if (null == t || !o || !Pt.includes(o))
        return r.call(this, t, e, i);
      if (n.isSaveBarVisible)
        return l(),
          null;
      const a = Mt(t, null != e ? e : "_blank", i);
      return a ? (a.click(),
        null) : c(t, null != e ? e : "_blank", i) ? null : r.call(this, t, e, i)
    }
    ));
    const a = {
      async pushState(n) {
        var e;
        const { navigation: i } = await t || {};
        if (!i || !n)
          return;
        const { pathname: o, search: r } = xt(n);
        await (null == (e = null == i ? void 0 : i.navigate) ? void 0 : e.call(i, `app:${o}${r}`, {
          history: "push"
        }))
      },
      async replaceState(n) {
        var e;
        const { navigation: i } = await t || {};
        if (!i || !n)
          return;
        const { pathname: o, search: r } = xt(n);
        await (null == (e = null == i ? void 0 : i.navigate) ? void 0 : e.call(i, `app:${o}${r}`, {
          history: "replace"
        }))
      }
    }
      , s = history.replaceState;
    function c(e, i, o = "") {
      const a = xt(e);
      if (!Lt.includes(i) || !Pt.includes(a.protocol))
        return !1;
      const s = `${a.pathname}${a.search}`;
      if ("shopify:" === a.protocol && !s.startsWith("/admin/"))
        throw Error(`Invalid URL: expected '/admin/*', received: '${s}'.`);
      if ("shopify:" === a.protocol && "_self" === i)
        return console.warn("Admin page cannot be opened in the same context."),
          !0;
      switch (i) {
        case "_self":
          return r.call(this, a, i, o),
            !0;
        case "_top":
        case "_parent":
          return n.isSaveBarVisible ? (l(),
            !0) : (kt((async () => {
              var n;
              const { navigation: e } = await t;
              null == (n = null == e ? void 0 : e.navigate) || n.call(e, a.toString(), "shopify:" === a.protocol ? void 0 : "_top")
            }
            )),
              !0);
        case "_blank":
          return !!/noopener/i.test(o) && (kt((async () => {
            var n;
            const { navigation: e } = await t;
            null == (n = null == e ? void 0 : e.navigate) || n.call(e, a.toString(), i)
          }
          )),
            !0)
      }
      return !1
    }
    async function l() {
      n.isSaveBarVisible && await kt((async () => {
        var n;
        const { saveBar: e } = await t || {};
        await (null == (n = null == e ? void 0 : e.leaveConfirmation) ? void 0 : n.call(e))
      }
      ))
    }
    mt(history, "pushState", (function (t, n, e) {
      s.call(history, t, n, e),
        a.pushState(e)
    }
    )),
      mt(history, "replaceState", (function (t, n, e) {
        s.call(history, t, n, e),
          a.replaceState(e)
      }
      )),
      addEventListener("beforeunload", (t => {
        n.isSaveBarVisible && (t.preventDefault(),
          t.returnValue = !0)
      }
      )),
      a.replaceState(location.href)
  }
    , Bt = ({ protocol: t, internalApiPromise: n }) => {
      const e = new AbortController
        , i = self.navigation;
      function o(n, e) {
        if (!n)
          return;
        const i = O(new URL(n, location.href))
          , o = `${i.pathname}${i.search}${i.hash}`;
        x && t.send("Navigation.history." + e, {
          path: o
        })
      }
      if (i && "navigate" in i) {
        i.navigate;
        const n = mt(i, "navigate", (function (e, i) {
          const o = s(e);
          return o ? (t.send("Navigation.redirect.admin.path", {
            path: o
          }),
          {
            committed: new Promise((() => { }
            )),
            finished: new Promise((() => { }
            ))
          }) : n.call(this, e, i)
        }
        ));
        e.signal.addEventListener("abort", (() => {
          wt(i, "navigate")
        }
        ))
      }
      if (i && "oncurrententrychange" in i)
        i.addEventListener("currententrychange", (t => {
          var n, e;
          (null == (n = t.from) ? void 0 : n.url) !== (null == (e = i.currentEntry) ? void 0 : e.url) && o(location.href, "replace")
        }
        ), {
          signal: e.signal
        });
      else {
        const t = history.pushState;
        mt(history, "pushState", (function (n, e, i) {
          const r = location.href;
          t.call(this, n, e, i),
            i && new URL(i, r).href !== r && o(i, "replace")
        }
        )),
          e.signal.addEventListener("abort", (() => {
            wt(history, "pushState")
          }
          ));
        const n = history.replaceState;
        mt(history, "replaceState", (function (t, e, i) {
          const r = location.href;
          n.call(this, t, e, i),
            i && new URL(i, r).href !== r && o(i, "replace")
        }
        )),
          e.signal.addEventListener("abort", (() => {
            wt(history, "replaceState")
          }
          )),
          addEventListener("popstate", (() => {
            o(location.href, "replace")
          }
          ), {
            signal: e.signal
          })
      }
      const r = self.open;
      mt(self, "open", (function (e, i, o) {
        if (null == e)
          return r.call(this, e, i, o);
        const a = function (t) {
          const n = new URL(t, location.href);
          return "app:" === n.protocol ? new URL(n.href.replace(/^app:\/{0,2}/, ""), location.href).href : n.href
        }(e);
        if ("extension:" === new URL(a).protocol)
          return void (async () => {
            const { navigation: t } = await n || {};
            if ("function" != typeof (null == t ? void 0 : t.navigate))
              throw Error("Missing navigation API");
            t.navigate(a)
          }
          )();
        i = (i || "") + "",
          o = (o || "") + "";
        const c = s(a);
        if (c)
          return t.send("Navigation.redirect.admin.path", {
            path: c,
            newContext: "" === i || "_blank" === i
          }),
            null;
        switch (i) {
          case "_self":
            break;
          case "_top":
          case "_parent":
            return t.send("Navigation.redirect.remote", {
              url: a
            }),
              top;
          case "_modal":
            throw Error("_modal is not yet implemented");
          case "":
          case "_blank":
            if (!/noopener/i.test(o) && !C() && !L())
              break;
            return t.send("Navigation.redirect.remote", {
              url: a,
              newContext: !0
            }),
              null
        }
        return r.call(this, a, i, o)
      }
      )),
        e.signal.addEventListener("abort", (() => {
          wt(self, "open")
        }
        )),
        addEventListener("click", (t => {
          let n = t.target;
          for (; n;) {
            if (n instanceof Element && ["A", "S-LINK", "S-BUTTON", "S-CLICKABLE"].includes(n.nodeName)) {
              const e = n.getAttribute("href");
              if (null == e) {
                n = n.parentNode;
                continue
              }
              const i = new URL(e, location.href)
                , o = i.protocol;
              if ("shopify:" === o || "app:" === o || "extension:" === o) {
                t.preventDefault();
                const o = n.getAttribute("target") || void 0
                  , r = n.getAttribute("rel") || void 0;
                if (navigator.userAgent.includes("Shopify Mobile/iOS") && navigator.userAgent.includes("Unframed")) {
                  const t = i.href.replace(/shopify:\/*admin/, "https://" + atob(shopify.config.host || ""));
                  return void open(t, o, r)
                }
                return void open(e, o, r)
              }
            }
            n = n.parentNode
          }
        }
        ), {
          signal: e.signal
        }),
        o(location.href, "replace");
      const a = /^shopify:\/*admin\//i;
      function s(t) {
        const n = O(new URL(t)).href;
        if (a.test(n))
          return n.replace(a, "/")
      }
      return () => {
        e.abort()
      }
    }
    , Ft = t => t.toString(16)
    , _t = `${Ft(Date.now())}-${Ft(1e9 * Math.random() | 0)}-`;
  let Nt = 0;
  function Ut() {
    return _t + Ft(++Nt)
  }
  const Dt = new Set(["product", "variant", "collection"])
    , jt = {
      query: "",
      selectionIds: [],
      action: "add",
      multiple: !1,
      filter: {
        hidden: !0,
        variants: !0,
        draft: void 0,
        archived: void 0,
        query: void 0
      }
    };
  var qt = (t => (t[t.ELEMENT_NODE = 1] = "ELEMENT_NODE",
    t[t.ATTRIBUTE_NODE = 2] = "ATTRIBUTE_NODE",
    t[t.TEXT_NODE = 3] = "TEXT_NODE",
    t[t.COMMENT_NODE = 8] = "COMMENT_NODE",
    t))(qt || {});
  const zt = {
    oneOf(t, { caseInsensitive: n = !0 } = {}) {
      n && (t = t.map((t => t.toLowerCase())));
      const e = new Set(t);
      return t => (n && (t = null == t ? void 0 : t.toLowerCase()),
        e.has(t))
    },
    anyString: () => t => "string" == typeof t,
    flag: () => t => null != t && 0 === t.length
  }
    , Vt = {
      anyText: {
        type: 3
      },
      anyElement: {
        type: 1
      }
    };
  function Ht(t) {
    return `<${t.localName}>`
  }
  function Wt(t, n) {
    return !(n.type && n.type !== t.nodeType || n.name && n.name !== t.localName)
  }
  function Xt(t, n) {
    var e;
    if (n.type && n.type !== t.nodeType || n.name && n.name !== t.localName)
      throw Error("Unexpected tag " + t.outerHTML);
    const { attributes: i, children: o } = n;
    if (i)
      if (1 === t.nodeType)
        n.attributes && function (t, n = {}) {
          var e, i;
          const o = Object.entries(n)
            , r = new Set(t.getAttributeNames().map((t => t.toLowerCase())));
          for (const [s, c] of o) {
            const n = s.toLowerCase();
            r.delete(n) ? c.value && (Kt(c.value)(null != (i = null == (e = t.getAttribute(n)) ? void 0 : e.toLowerCase()) ? i : null, n, t) || console.error(`Unexpected value for attribute "${n}" on ${Ht(t)}`)) : c.required && console.error(`Missing attribute "${n}" on ${Ht(t)}`)
          }
          const a = Array.from(r).filter((t => !t.startsWith("data-")));
          0 !== a.length && console.error(`Unexpected attributes on ${Ht(t)}: ${a}`)
        }(t, i);
      else if (3 === t.nodeType && (null == (e = i.data) ? void 0 : e.value) && !Kt(i.data.value)(t.data, "data", t))
        throw Error("Unexpected text");
    if (o)
      for (const r of t.childNodes) {
        if (8 === r.nodeType)
          continue;
        if (3 === r.nodeType && 0 === r.data.trim().length)
          continue;
        const n = o.find((t => Wt(r, t)));
        if (!n)
          throw Error(`Unexpected tag <${r.outerHTML}> in ${Ht(t)}`);
        Xt(r, n)
      }
  }
  function Kt(t) {
    return "function" == typeof t ? t : t instanceof RegExp ? n => (t.lastIndex = 0,
      t.test(null != n ? n : "")) : n => t === n
  }
  const Gt = {
    value: zt.anyString()
  }
    , Jt = {
      id: Gt,
      name: Gt,
      class: Gt,
      rel: Gt,
      onclick: Gt
    }
    , Yt = {
      ...Jt,
      type: Gt,
      value: Gt
    }
    , Qt = {
      ...Jt,
      active: Gt,
      href: Gt,
      target: Gt
    };
  function Zt(t) {
    const n = {
      name: t,
      attributes: {},
      children: [{
        name: "a",
        attributes: Qt,
        children: [Vt.anyText]
      }, {
        name: "s-link",
        attributes: Qt,
        children: [Vt.anyText]
      }]
    };
    return ({ protocol: e, internalApiPromise: i }) => {
      async function o() {
        const { navigation: t } = await i || {};
        return !(2 !== (null == t ? void 0 : t.version))
      }
      let r;
      function a() {
        r || (r = setTimeout(s, 0))
      }
      async function s() {
        clearTimeout(r);
        const n = Array.from(document.querySelectorAll(t)).reverse()[0]
          , { navMenu: a } = await i || {};
        if (n && "function" == typeof (null == a ? void 0 : a.set)) {
          const t = n.anchors.filter((t => !n.isHomeAnchor(t))).map((t => {
            const { pathname: n, search: e, textContent: i, rel: o } = t;
            return {
              label: null != i ? i : "",
              url: new URL(n + e, location.href).toString(),
              rel: o || void 0
            }
          }
          ));
          if (a.set(t),
            await o())
            return
        }
        const s = await c;
        if (!s)
          return void console.warn(t + " cannot be used in modal context");
        const l = document.querySelectorAll("s-app-nav, ui-nav-menu");
        l.length > 1 && console.warn(`Multiple navigation menu elements detected (${l.length} total). Only one <s-app-nav> or <ui-nav-menu> should be used per page. Found: ${Array.from(l).map((t => t.tagName.toLowerCase())).join(", ")}`);
        const u = {
          items: Array.from(document.querySelectorAll(t)).flatMap((t => t.menuItems()))
        };
        e.send(`Menu.${s}_Menu.UPDATE`, u),
          r = 0
      }
      const c = new Promise((t => {
        e.subscribe("getState", (({ features: n }) => {
          const e = (null == n ? void 0 : n.Menu) || {}
            , { Dispatch: i } = e["APP::MENU::NAVIGATION_MENU::UPDATE"] || {}
            , { Dispatch: o } = e["APP::MENU::CHANNEL_MENU::UPDATE"] || {};
          t(o ? "channel" : i ? "navigation" : void 0)
        }
        ), {
          once: !0
        })
      }
      ))
        , l = new WeakMap;
      function u(t, n) {
        if (n && n.homeAnchor === t)
          return null;
        if (!n && t.getAttribute && "home" === t.getAttribute("rel"))
          return null;
        if (!l.has(t)) {
          const n = "href" in t ? btoa(t.href) : Ut();
          l.set(t, n)
        }
        return l.get(t)
      }
      b(t, class extends g {
        get anchors() {
          const t = [];
          return Array.from(this.children).forEach((n => {
            if ("A" === n.tagName)
              t.push(n);
            else if ("S-LINK" === n.tagName) {
              const e = n
                , i = e.getAttribute("href");
              if (!i)
                return;
              const o = new URL(i, location.href)
                , r = {
                  href: o.href,
                  pathname: o.pathname,
                  search: o.search,
                  textContent: e.textContent,
                  rel: e.getAttribute("rel"),
                  protocol: o.protocol,
                  hasAttribute: t => e.hasAttribute(t),
                  getAttribute: t => e.getAttribute(t),
                  click: () => {
                    const t = new MouseEvent("click", {
                      bubbles: !0,
                      cancelable: !0
                    });
                    e.dispatchEvent(t)
                  }
                };
              t.push(r)
            }
          }
          )),
            t
        }
        get homeAnchor() {
          return this.anchors.find((t => ((t.rel || "") + "").includes("home")))
        }
        isHomeAnchor(t) {
          return ((t.rel || "") + "").includes("home")
        }
        connectedCallback() {
          this.t = new AbortController;
          const t = {
            signal: this.t.signal
          };
          kt((async () => {
            await o() || (e.subscribe("Navigation.redirect.app", (t => this.i(t)), t),
              addEventListener("popstate", (() => this.o()), t))
          }
          )),
            addEventListener("beforeunload", (() => this.l()), t),
            this.u = new MutationObserver((() => this.o())),
            this.u.observe(this, {
              childList: !0,
              subtree: !0,
              attributes: !0,
              characterData: !0
            }),
            this.o()
        }
        async i(t) {
          var n, o;
          if (!this.t)
            return;
          const { pathname: r, href: a } = O(new URL(t.path, location.href));
          if (a === O(location.href).href)
            return;
          const c = t => {
            for (const [n, e] of this.h())
              if (e.destination.path === t)
                return n
          }
            , l = this.homeAnchor
            , u = null != (o = null != (n = c(t.path)) ? n : c(r)) ? o : l;
          if (u) {
            let t = function (t) {
              n = t.defaultPrevented,
                t.preventDefault()
            };
            if ("http:" !== u.protocol && "https:" !== u.protocol || new URL("", u.href).href === new URL("", location.href).href)
              return u.click(),
                void s();
            let n = !1;
            if (addEventListener("click", t),
              u.click(),
              removeEventListener("click", t),
              n)
              return void s()
          }
          u && s();
          const { navigation: d } = await i || {};
          if ((null == d ? void 0 : d.navigate) && "function" == typeof d.navigate) {
            const n = new URL(t.path, location.href);
            d.navigate(`app:/${n.pathname}${n.search}`)
          } else {
            this.l();
            const n = `${t.path}${t.path.includes("?") ? "&=" : "?="}`;
            e.send("Navigation.redirect.app", {
              path: n
            })
          }
        }
        o() {
          Xt(this, n),
            a()
        }
        l() {
          var t, n;
          null == (t = this.t) || t.abort(),
            this.t = void 0,
            null == (n = this.u) || n.disconnect(),
            this.u = void 0
        }
        disconnectedCallback() {
          this.l(),
            a()
        }
        *h(t = !1) {
          var n;
          const e = this.anchors;
          for (const i of e) {
            const e = null != (n = i.textContent) ? n : ""
              , o = i.pathname + i.search;
            t === this.isHomeAnchor(i) && (yield [i, {
              id: u(i, this),
              destination: {
                path: o
              },
              label: e,
              redirectType: "APP::NAVIGATION::REDIRECT::APP"
            }])
          }
        }
        menuItems(t = !1) {
          return Array.from(this.h(t)).map((([, t]) => t))
        }
        selectedMenuItemId() {
          const t = this.anchors.filter((t => !this.isHomeAnchor(t)));
          let n = t.find((t => t.hasAttribute("active")));
          if (!n) {
            const e = O(location.href);
            e.hash = "",
              n = t.find((t => t.href === e.href))
          }
          return n ? u(n, this) : null
        }
      }
      )
    }
  }
  const tn = Zt("s-app-nav")
    , nn = {
      breadcrumb: ':scope > s-button[slot="breadcrumb-actions"], :scope > s-link[slot="breadcrumb-actions"]',
      primaryAction: ':scope > s-button[slot="primary-action"], :scope > s-link[slot="primary-action"]',
      secondaryActions: ':scope > s-button[slot="secondary-actions"], :scope > s-link[slot="secondary-actions"]',
      accessory: '[slot="accessory"]'
    }
    , en = Symbol("s-page-element-id");
  function on(t = {}) {
    var n;
    const { hideElements: e = !1, context: i = document } = t
      , o = i.querySelector("s-page");
    if (!o)
      return null;
    const r = {
      title: o.getAttribute("heading") || void 0
    }
      , a = o.querySelector(nn.breadcrumb);
    a && (r.breadcrumb = a,
      e && (a.style.display = "none"));
    const s = o.querySelector(nn.primaryAction);
    s && (r.primaryAction = s,
      e && (s.style.display = "none"));
    const c = Array.from(o.querySelectorAll(nn.secondaryActions));
    c.length > 0 && (r.secondaryActions = c,
      e && c.forEach((t => {
        t.style.display = "none"
      }
      )));
    const l = o.querySelector(nn.accessory);
    if (l) {
      const t = null == (n = l.textContent) ? void 0 : n.trim();
      t && (r.accessory = {
        type: "badge",
        content: t,
        tone: l.getAttribute("tone") || void 0
      },
        e && (l.style.display = "none"))
    }
    return r
  }
  function rn(t) {
    var n;
    t[en] || (t[en] = Ut());
    const e = t[en]
      , i = null != (n = t.textContent) ? n : ""
      , o = t.getAttribute("icon") || void 0
      , r = t.getAttribute("tone") || void 0;
    return {
      id: e,
      label: i,
      ...o && {
        icon: o
      },
      ...r && {
        tone: r
      },
      disabled: t.disabled || !1,
      loading: t.hasAttribute("loading")
    }
  }
  function an(t, n = {}) {
    const { hideElements: e = !1, context: i = document } = n;
    return t.map((t => {
      if ("S-BUTTON" === t.tagName) {
        const n = t.getAttribute("commandfor");
        if (n) {
          const o = i.querySelector ? i.querySelector("#" + CSS.escape(n)) : i.getElementById(n);
          if (o && "S-MENU" === o.tagName)
            return e && (o.style.display = "none"),
              function (t, n) {
                var e;
                return n[en] || (n[en] = Ut()),
                {
                  id: n[en],
                  label: null != (e = t.textContent) ? e : "Actions",
                  icon: t.getAttribute("icon") || void 0,
                  buttons: Array.from(n.querySelectorAll("s-button")).map((t => {
                    var n;
                    return t[en] || (t[en] = Ut()),
                    {
                      id: t[en],
                      label: null != (n = t.textContent) ? n : "",
                      icon: t.getAttribute("icon") || void 0,
                      disabled: t.disabled || !1,
                      loading: t.hasAttribute("loading")
                    }
                  }
                  ))
                }
              }(t, o)
        }
      }
      return rn(t)
    }
    ))
  }
  function sn(t, n) {
    return t[en] || (t[en] = n || Ut()),
      t[en]
  }
  const cn = "ui-title-bar"
    , ln = [{
      name: "button",
      attributes: {
        ...Yt,
        variant: {
          value: zt.oneOf(["breadcrumb", "primary"])
        },
        tone: {
          value: zt.oneOf(["critical", "default"])
        },
        disabled: {
          value: zt.flag()
        },
        loading: {
          value: zt.flag()
        }
      },
      children: [Vt.anyText]
    }, {
      name: "a",
      attributes: {
        ...Qt,
        variant: {
          value: zt.oneOf(["breadcrumb", "primary"])
        }
      },
      children: [Vt.anyText]
    }]
    , un = {
      name: "section",
      attributes: {
        label: Gt
      },
      children: [{
        name: "button",
        attributes: Yt,
        children: [Vt.anyText]
      }, {
        name: "a",
        attributes: Qt,
        children: [Vt.anyText]
      }]
    };
  un.children.push(un);
  const dn = {
    name: "ui-title-bar",
    attributes: {
      title: Gt
    },
    children: [...ln, un]
  }
    , fn = nn.breadcrumb
    , hn = nn.primaryAction
    , pn = nn.secondaryActions;
  function vn(t) {
    var n;
    t[en] || (t[en] = Ut());
    const e = t[en]
      , i = null != (n = t.textContent) ? n : ""
      , o = t.getAttribute("icon") || void 0
      , r = t.getAttribute("tone") || void 0;
    return {
      id: e,
      label: i,
      ...o && {
        icon: o
      },
      ...r && {
        tone: r
      },
      disabled: t.disabled,
      loading: t.hasAttribute("loading")
    }
  }
  function mn(t) {
    return null != t && (wn(t) || mn(t.parentNode))
  }
  function wn(t) {
    return "TITLE" === t.nodeName
  }
  const bn = W
    , yn = [{
      name: "button",
      attributes: {
        ...Yt,
        variant: {
          value: zt.oneOf(["primary"])
        },
        disabled: {
          value: zt.flag()
        },
        loading: {
          value: zt.flag()
        }
      },
      children: [Vt.anyText]
    }]
    , gn = {
      name: "ui-save-bar",
      attributes: {
        id: {
          value: zt.anyString()
        },
        discardConfirmation: {
          value: zt.flag()
        }
      },
      children: [...yn]
    };
  function An(t) {
    if (t)
      return {
        disabled: t.disabled,
        loading: t.hasAttribute("loading"),
        onAction() {
          t.click()
        }
      }
  }
  function En(t) {
    var n, e, i;
    const o = null == (i = null == (e = null == (n = document.documentElement) ? void 0 : n.getElementsByTagName) ? void 0 : e.call(n, bn)) ? void 0 : i[t];
    if (!o)
      throw Error(`SaveBar with ID ${t} not found`);
    return o
  }
  const kn = ["small", "base", "large", "max"];
  function Cn(t, n) {
    const e = "src" === n.contentType
      , i = "app-window" === n.variantLock
      , o = {
        id: {
          value: zt.anyString()
        },
        src: {
          value: zt.anyString()
        }
      };
    i || (o.variant = {
      value: zt.oneOf(["small", "base", "large", "max"])
    });
    const r = {
      name: t,
      attributes: o,
      children: e ? [] : [dn, gn, Vt.anyElement]
    };
    return ({ api: n, internalApiPromise: o, saveBarManager: a }) => {
      const s = {
        classic: _(),
        max: _()
      };
      function c(n) {
        var e, i, o;
        const r = null == (o = null == (i = null == (e = document.documentElement) ? void 0 : e.getElementsByTagName) ? void 0 : i.call(e, t)) ? void 0 : o[n];
        if (!r)
          throw Error(`Modal with ID ${n} not found`);
        return r
      }
      n.modal = {
        show: async t => c(t).show(),
        hide: async t => c(t).hide(),
        toggle: async t => c(t).toggle()
      },
        function (t) {
          document.addEventListener("click", (async n => {
            const e = n.target;
            if (!e)
              return;
            let i = e;
            for (; i && i !== document.body;) {
              const e = i.getAttribute("command")
                , o = i.getAttribute("commandFor");
              if (e && o) {
                const i = document.getElementById(o);
                if (i && i.tagName.toLowerCase() === t.toLowerCase()) {
                  switch (n.preventDefault(),
                  e.startsWith("--") ? e.slice(2) : e) {
                    case "show":
                      await i.show();
                      break;
                    case "hide":
                      await i.hide();
                      break;
                    case "toggle":
                      await i.toggle()
                  }
                  break
                }
              }
              i = i.parentElement
            }
          }
          ))
        }(t),
        b(t, class extends g {
          constructor() {
            super(...arguments),
              this.p = Ut(),
              this.v = !1,
              this.m = !1,
              this.A = []
          }
          static get observedAttributes() {
            return i ? ["src"] : ["variant", "src"]
          }
          get variant() {
            var t;
            if (i)
              return "app-window";
            const n = null != (t = this.getAttribute("variant")) ? t : "";
            return kn.includes(n) ? n : "base"
          }
          set variant(t) {
            i || this.setAttribute("variant", t)
          }
          get content() {
            if (!e)
              return this.src ? void 0 : this.k
          }
          set content(t) {
            var n, i, o;
            e || t !== this.k && (null == (n = this.C) || n.unobserve(),
              this.C = void 0,
              null == (i = this.P) || i.unobserve(),
              this.P = void 0,
              null == (o = this.L) || o.unobserve(),
              this.L = void 0,
              this.k = t,
              t && (this.C = function (t) {
                function n(t) {
                  let n = t.target;
                  for (; n;) {
                    if ("A" === n.nodeName && n.hasAttribute("href")) {
                      const e = n.getAttribute("href")
                        , i = n.getAttribute("target") || void 0
                        , o = n.getAttribute("rel") || void 0;
                      if (null == e) {
                        n = n.parentNode;
                        continue
                      }
                      t.preventDefault(),
                        window.open(e, i, o);
                      break
                    }
                    n = n.parentNode
                  }
                }
                return t.addEventListener("click", n),
                {
                  unobserve: () => t.removeEventListener("click", n)
                }
              }(t),
                this.P = K(t, {
                  onChange: t => {
                    "max" === this.T ? a.set({
                      maxModalFromForm: t
                    }) : a.set({
                      classicModalFromForm: t
                    })
                  }
                  ,
                  filter: () => !!this.T
                }),
                this.L = G(this, {
                  onChange: t => {
                    "max" === this.T ? a.set({
                      maxModalFromCustomElement: t
                    }) : a.set({
                      classicModalFromCustomElement: t
                    })
                  }
                  ,
                  filter: () => !!this.T
                })))
          }
          get src() {
            var t;
            return null != (t = this.getAttribute("src")) ? t : void 0
          }
          set src(t) {
            t ? this.setAttribute("src", t) : this.removeAttribute("src")
          }
          get contentWindow() {
            if (this.src)
              return this.S
          }
          get S() {
            const t = this.I;
            if (t)
              return function (t) {
                var n;
                try {
                  const e = null == (n = window.parent) ? void 0 : n.frames[t];
                  if (e.fetch)
                    return e
                } catch (e) {
                  return
                }
              }(t)
          }
          connectedCallback() {
            var t;
            this.u = new MutationObserver((() => this.o())),
              this.u.observe(this, {
                attributes: !0,
                childList: !0,
                subtree: !0
              }),
              this.o(),
              e || null == (t = this.querySelector("ui-title-bar")) || t.addEventListener("change", (() => this.o()))
          }
          disconnectedCallback() {
            var t;
            null == (t = this.u) || t.disconnect(),
              this.M()
          }
          setAttribute(t, n) {
            super.setAttribute(t, n),
              this.o()
          }
          removeAttribute(t) {
            super.removeAttribute(t),
              this.o()
          }
          async show() {
            var t, n, i, r;
            if (!this.R && (await this.o(),
              !this.R))
              return;
            if (this.T)
              return;
            const a = "max" === this.R.variant ? "max" : "classic";
            this.T = a;
            const c = s[a];
            if (c.has(this.p))
              return;
            const l = c.promise;
            if (c.add(this.p),
              await l,
              c.isResolved(this.p))
              return;
            this.v = !0;
            const u = await o;
            if (!u)
              throw Error("Cannot show modal");
            const d = this.O();
            if (!(null == (t = u.modal) ? void 0 : t.show) || "function" != typeof u.modal.show)
              throw Error("Modal API is not available");
            if (this.I = await u.modal.show(this.p),
              d(),
              this.S && (this.S.shopify = window.shopify,
                this.S.close = () => {
                  this.hide()
                }
                ,
                e)) {
              try {
                const t = this.S.document.createElement("style");
                t.textContent = '\n                s-page s-button[slot="primary-action"],\n                s-page s-button[slot="secondary-actions"] {\n                  display: none !important;\n                }\n              ',
                  this.S.document.head ? this.S.document.head.appendChild(t) : this.S.document.documentElement && this.S.document.documentElement.appendChild(t)
              } catch (f) {
                console.debug("Could not inject early styles to hide slots:", f)
              }
              setTimeout((() => {
                var t, n, e;
                "complete" === (null == (n = null == (t = this.S) ? void 0 : t.document) ? void 0 : n.readyState) ? this.$() : null == (e = this.S) || e.addEventListener("load", (() => {
                  this.$()
                }
                ), {
                  once: !0
                })
              }
              ), 100)
            }
            this.m || (this.B(),
              this.m = !0),
              this.dispatchEvent(new CustomEvent("show")),
              null == (n = this.S) || n.focus(),
              null == (i = this.P) || i.onChange(),
              null == (r = this.L) || r.onChange()
          }
          async hide() {
            var t, n, e;
            const i = this.T;
            if (!i)
              return;
            if (s[i].resolve(this.p),
              !this.v)
              return;
            this.m && (this.F(),
              this.m = !1),
              this._ && (this._.disconnect(),
                this._ = void 0);
            const r = await o;
            (null == (t = null == r ? void 0 : r.modal) ? void 0 : t.hide) && "function" == typeof r.modal.hide && await r.modal.hide(this.p),
              this.v = !1,
              this.T = void 0,
              this.I = void 0,
              this.dispatchEvent(new CustomEvent("hide")),
              null == (n = this.P) || n.onChange(),
              null == (e = this.L) || e.onChange()
          }
          async toggle() {
            this.R || await this.o(),
              this.T ? await this.hide() : await this.show()
          }
          async o() {
            var t;
            if (Xt(this, r),
              this.N(),
              !this.R)
              return;
            const n = await o;
            (null == n ? void 0 : n.modal) || location.reload(),
              (null == (t = null == n ? void 0 : n.modal) ? void 0 : t.set) && "function" == typeof n.modal.set && await n.modal.set(this.R, this.p)
          }
          O() {
            let t;
            const n = setInterval((() => {
              this.S && (clearInterval(n),
                t = setTimeout((() => {
                  console.warn("The modal src is missing App Bridge CDN script tag.")
                }
                ), 1e4))
            }
            ), 100);
            return () => {
              clearInterval(n),
                clearTimeout(t)
            }
          }
          async B() {
            const { content: t, S: n } = this;
            if (!t || !n)
              return;
            const e = Tn();
            Ln(document, n.document, [e]);
            const i = function (t, n, e = "div") {
              const i = t.querySelector("#" + n);
              if (i)
                return i;
              const o = document.createElement(e);
              return o.setAttribute("id", n),
                t.appendChild(o),
                o
            }(n.document.body, "modal-content-8885451e-38a1-4196-835b-40f3efb46c4e");
            i.replaceChildren(t);
            const o = t.querySelector("[autofocus]");
            o instanceof HTMLElement && setTimeout((() => {
              o.focus()
            }
            ), 100)
          }
          F() {
            const { content: t } = this;
            t && this.appendChild(t)
          }
          N() {
            let n, i, o = [];
            if (!e) {
              const e = Array.from(this.childNodes).filter((t => "ui-title-bar" !== t.nodeName.toLowerCase() && t.nodeName.toLowerCase() !== bn.toLowerCase() && t.nodeType === qt.ELEMENT_NODE));
              e.length > 1 && console.warn(`Only one child element is allowed inside <${t}>. The rest will be ignored.`),
                n = e.length ? e[0] : this.k,
                this.content = n || document.createElement("div"),
                [i] = Array.from(this.getElementsByTagName("ui-title-bar")),
                o = i ? Array.from(null == i ? void 0 : i.getElementsByTagName("button")) : []
            }
            const { primaryButtonElement: r, secondaryButtonElement: a } = o.reduce(((t, n) => {
              const e = n.getAttribute("variant");
              return "primary" === e ? t.primaryButtonElement = n : e || (t.secondaryButtonElement = n),
                t
            }
            ), {
              primaryButtonElement: null,
              secondaryButtonElement: null
            })
              , s = this.src ? new URL(this.src, location.href) : void 0;
            if (s && s.origin !== location.origin)
              throw Error("Invalid modal src origin");
            var c, l;
            this.R = {
              title: (null == i ? void 0 : i.getAttribute("title")) || (e ? document.title : void 0) || void 0,
              variant: (c = this.T,
                l = this.variant,
                c ? "max" === c ? "max" : "max" === l ? "base" : l : l),
              src: null == s ? void 0 : s.toString(),
              buttons: [r, a].map((t => {
                var n, e, i;
                if (t)
                  return {
                    id: Ut(),
                    label: null != (n = t.textContent) ? n : "",
                    variant: null != (e = t.getAttribute("variant")) ? e : void 0,
                    tone: null != (i = t.getAttribute("tone")) ? i : void 0,
                    disabled: t.disabled,
                    loading: t.hasAttribute("loading"),
                    onAction() {
                      t.click()
                    }
                  }
              }
              )).filter(Boolean),
              onClose: () => this.hide()
            }
          }
          async $() {
            var t;
            if (!(null == (t = this.S) ? void 0 : t.document))
              return;
            const n = async () => {
              var t;
              try {
                const n = on({
                  hideElements: !1,
                  context: this.S.document
                });
                if (n) {
                  n.title && this.R ? this.R.title = n.title : this.R && !this.R.title && (this.R.title = document.title || void 0),
                    n.accessory && this.R && (this.R.accessory = n.accessory);
                  const t = []
                    , e = (n, e) => {
                      var i, o, r;
                      t.push({
                        id: Ut(),
                        label: null != (i = n.textContent) ? i : "",
                        variant: e,
                        icon: null != (o = n.getAttribute("icon")) ? o : void 0,
                        tone: null != (r = n.getAttribute("tone")) ? r : void 0,
                        disabled: n.disabled || !1,
                        loading: n.hasAttribute("loading"),
                        onAction: () => {
                          n.click()
                        }
                      })
                    }
                    ;
                  if (this.A = [],
                    n.primaryAction && (e(n.primaryAction, "primary"),
                      this.A.push(n.primaryAction)),
                    n.secondaryActions) {
                    const i = an(n.secondaryActions, {
                      hideElements: !1,
                      context: this.S.document
                    })
                      , o = new Map;
                    n.secondaryActions.forEach((t => {
                      const n = sn(t);
                      o.set(n, t)
                    }
                    )),
                      i.forEach((n => {
                        if ("buttons" in n)
                          t.push({
                            id: n.id,
                            variant: "secondary",
                            label: n.label,
                            icon: n.icon,
                            disabled: n.disabled,
                            actions: n.buttons.map((t => ({
                              id: t.id,
                              label: t.label,
                              disabled: t.disabled,
                              loading: t.loading,
                              icon: t.icon,
                              onAction: () => {
                                const n = Array.from(this.S.document.querySelectorAll("s-menu s-button")).find((n => sn(n) === t.id));
                                null == n || n.click()
                              }
                            })))
                          });
                        else {
                          const t = o.get(n.id);
                          t && (e(t, "secondary"),
                            this.A.push(t))
                        }
                      }
                      ))
                  }
                  t.length > 0 && this.R && (this.R.buttons = t)
                } else
                  this.R && (this.R.title || (this.R.title = document.title || void 0));
                if (this.R) {
                  const n = await o;
                  (null == (t = null == n ? void 0 : n.modal) ? void 0 : t.set) && "function" == typeof n.modal.set && await n.modal.set(this.R, this.p)
                }
              } catch (n) {
                console.debug("Could not extract from s-page in iframe:", n)
              }
            }
              ;
            await n();
            try {
              const t = new MutationObserver((async () => {
                await n()
              }
              ));
              t.observe(this.S.document.body, {
                childList: !0,
                subtree: !0,
                attributes: !0,
                attributeFilter: ["heading", "variant", "tone", "disabled", "loading", "slot", "commandfor"]
              }),
                this._ = t
            } catch (e) {
              console.debug("Could not observe iframe for s-page changes:", e)
            }
          }
          async M() {
            var t;
            this._ && (this._.disconnect(),
              this._ = void 0);
            const n = await o;
            (null == (t = null == n ? void 0 : n.modal) ? void 0 : t.set) && "function" == typeof n.modal.set && await n.modal.set(null, this.p)
          }
        }
        )
    }
  }
  function Pn(t) {
    return Array.from(t.styleSheets).map((t => t.ownerNode)).filter((t => !(!t || function (t) {
      let n = t.parentNode;
      for (; n;)
        switch (n.nodeName.toLowerCase()) {
          case "svg":
            return !0;
          case "body":
            return !1;
          default:
            n = n.parentNode
        }
    }(t))))
  }
  async function Ln(t, n, e = []) {
    const i = [...Pn(t), ...e]
      , o = Pn(n);
    await Promise.all(i.filter((t => !o.find((n => n.isEqualNode(t))))).map((t => {
      const e = t.cloneNode(!0);
      return n.head.appendChild(e),
        new Promise((t => {
          e.addEventListener("load", t, !0)
        }
        )).catch((() => { }
        ))
    }
    )))
  }
  function Tn() {
    const t = document.createElement("style")
      , n = "modal-content-8885451e-38a1-4196-835b-40f3efb46c4e";
    return t.textContent = `\n    html, body {\n      min-height: auto !important;\n      height: auto !important;\n      padding: 0 !important;\n      margin: 0 !important;\n      background-color: rgba(0, 0, 0, 0) !important;\n      display: block !important;\n    }\n    body > #${n} {\n      display: flex !important;\n    }\n    body > #${n} > * {\n      width: 100%;\n    }\n  `,
      t
  }
  function Sn(t) {
    var n;
    try {
      const e = null == (n = window.parent) ? void 0 : n.frames[t];
      if (e.fetch)
        return e
    } catch (e) {
      return
    }
  }
  function In(t) {
    const n = t.nodeName.toLowerCase();
    return "ui-modal" === n || "s-frame" === n
  }
  function xn(t) {
    let n = t.parentNode;
    for (; n;) {
      if (In(n))
        return n;
      if ("body" === n.nodeName.toLowerCase())
        break;
      n = n.parentNode
    }
  }
  const Mn = Cn("s-app-window", {
    contentType: "src",
    variantLock: "app-window"
  })
    , Rn = "APP::SCANNER::OPEN::CAMERA";
  function On(t) {
    const n = (null == t ? void 0 : t.Scanner) || {}
      , { Dispatch: e } = n[Rn] || {};
    return !!e
  }
  let $n = !1;
  const Bn = [{
    keys: ["k"],
    held: ["Meta", "Control"]
  }, {
    keys: ["."],
    held: ["Meta", "Control"]
  }]
    , Fn = {
      duration: 5e3
    }
    , _n = Cn("ui-modal", {
      contentType: "inline",
      variantLock: "all"
    })
    , Nn = Zt("ui-nav-menu")
    , Un = [{
      fn: "onTTFB",
      name: "TimeToFirstByte"
    }, {
      fn: "onFCP",
      name: "FirstContentfulPaint"
    }, {
      fn: "onLCP",
      name: "LargestContentfulPaint"
    }, {
      fn: "onCLS",
      name: "CumulativeLayoutShift"
    }, {
      fn: "onFID",
      name: "FirstInputDelay"
    }, {
      fn: "onINP",
      name: "InteractionToNextPaint"
    }]
    , Dn = Object.assign({
      "./app.ts": async ({ api: t, internalApiPromise: n }) => {
        t.app = {
          extensions: async () => {
            const { app: t } = await n || {};
            if (!(null == t ? void 0 : t.extensions))
              throw Error("App API is not available");
            return await t.extensions()
          }
        }
      }
      ,
      "./client.ts": ({ api: t, internalApiPromise: n }) => {
        n.then((n => {
          var e;
          (null == (e = null == n ? void 0 : n.client) ? void 0 : e.set) && "function" == typeof n.client.set && n.client.set(t.config)
        }
        )).catch()
      }
      ,
      "./environment.ts": ({ api: t }) => {
        t.environment = {
          mobile: C(),
          embedded: top !== self || k(),
          pos: L()
        }
      }
      ,
      "./fetch.ts": bt,
      "./id-token.ts": yt,
      "./intents.ts": ({ api: t, protocol: n, internalApiPromise: e }) => {
        t.intents = {
          register(t) {
            const e = new URLSearchParams(location.search).get("step_reference") || ""
              , i = new AbortController;
            return n.subscribe("AppFrame.propertiesEvent", (({ properties: i }) => {
              const o = function (t, n, e) {
                return new At("configure", "gid://flow/stepReference/" + t, n, (() => e.send("AppFrame.navigateBack")))
              }(e, {
                properties: i
              }, n);
              t(o)
            }
            ), {
              signal: i.signal
            }),
              n.send("AppFrame.requestProperties"),
              () => i.abort()
          },
          async invoke(t, n) {
            var i;
            const o = await e;
            if (!o)
              throw Error("Cannot invoke intent");
            if (!(null == (i = o.intents) ? void 0 : i.invoke) || "function" != typeof o.intents.invoke)
              throw Error("Intents are not supported");
            return new Et(o.intents.invoke(t, n))
          }
        }
      }
      ,
      "./internal-only.ts": ({ api: t, internalApiPromise: n }) => {
        const e = {
          async show(t, e) {
            var i, o;
            const r = await n;
            r && r.internalModal && await (null == (o = (i = r.internalModal).show) ? void 0 : o.call(i, t, e))
          },
          async hide(t) {
            var e, i;
            const o = await n;
            o && o.internalModal && await (null == (i = null == (e = o.internalModal) ? void 0 : e.hide) ? void 0 : i.call(e, t))
          }
        };
        t._internal = {
          modal: e
        }
      }
      ,
      "./loading.ts": ({ api: t, protocol: n, internalApiPromise: e }) => {
        let i = !1;
        t.loading = async t => {
          const { loading: o } = await e || {};
          (null == o ? void 0 : o.start) && (null == o ? void 0 : o.stop) ? t ? await o.start() : await o.stop() : t ? i || (n.send("Loading.start"),
            i = !0) : i && (n.send("Loading.stop"),
              i = !1)
        }
      }
      ,
      "./navigation.ts": t => {
        const n = Bt(t);
        t.internalApiPromise.then((e => {
          const { navigation: i } = e || {};
          if (2 === (null == i ? void 0 : i.version))
            try {
              n(),
                $t(t)
            } catch (o) {
              console.error("Failed to set up navigation: " + o)
            }
        }
        ))
      }
      ,
      "./picker.ts": ({ api: t, internalApiPromise: n }) => {
        let e;
        t.picker = async function t(i) {
          if (e)
            return e.finally((() => t(i)));
          const o = await n;
          if (!o || "function" != typeof o.picker)
            throw Error("Cannot show picker");
          if (e = o.picker(i),
            !e)
            throw Error("Cannot show picker");
          return e.finally((() => e = void 0)),
            e
        }
      }
      ,
      "./pos.ts": ({ api: t, protocol: n }) => {
        const e = new Set;
        async function i(t, i) {
          const o = Ut()
            , r = new AbortController
            , a = F();
          n.subscribe("Cart.update", (({ data: t }) => {
            r.abort(),
              a.resolve(t)
          }
          ), {
            signal: r.signal,
            id: o
          }),
            n.send("Cart." + t, {
              ...i,
              id: o
            });
          const s = await a.promise;
          e.forEach((t => t(s)))
        }
        const o = {
          cart: {
            async fetch() {
              const t = Ut()
                , e = new AbortController
                , i = F();
              return n.subscribe("Cart.update", (({ data: t }) => {
                var n;
                e.abort();
                const { noteAttributes: o, lineItems: r, ...a } = t
                  , s = {
                    ...a,
                    properties: null != (n = null == o ? void 0 : o.reduce(((t, { name: n, value: e }) => (t[n] = e,
                      t)), {})) ? n : {},
                    lineItems: r ? r.map(((t, n) => ({
                      ...t,
                      uuid: "" + n
                    }))) : []
                  };
                i.resolve(s)
              }
              ), {
                signal: e.signal,
                id: t
              }),
                n.send("Cart.fetch", {
                  id: t
                }),
                i.promise
            },
            subscribe: t => (e.add(t),
              () => {
                e.delete(t)
              }
            ),
            async clear() {
              await i("clear", {})
            },
            async setCustomer(t) {
              await i("setCustomer", {
                data: t
              })
            },
            async removeCustomer() {
              await i("removeCustomer", {})
            },
            async addAddress(t) {
              await i("addCustomerAddress", {
                data: t
              })
            },
            async updateAddress(t, n) {
              await i("updateCustomerAddress", {
                index: t,
                data: n
              })
            },
            async applyCartDiscount(t, n, e) {
              await i("setDiscount", {
                data: {
                  type: "FixedAmount" === t ? "flat" : "percent",
                  amount: parseFloat(e) || 0,
                  discountDescription: n
                }
              })
            },
            async applyCartCodeDiscount(t) {
              await i("setCodeDiscount", {
                data: {
                  discountCode: t
                }
              })
            },
            async removeCartDiscount() {
              await i("removeDiscount", {})
            },
            async removeAllDiscounts(t) {
              await i("removeAllDiscounts", {
                data: {
                  disableAutomaticDiscounts: t
                }
              })
            },
            async addCartProperties(t) {
              await i("setProperties", {
                data: t
              })
            },
            async removeCartProperties(t) {
              await i("removeProperties", {
                data: t
              })
            },
            async addCustomSale(t) {
              await i("addLineItem", {
                data: {
                  price: t.price,
                  quantity: t.quantity,
                  title: t.title,
                  taxable: t.taxable
                }
              })
            },
            async addLineItem(t, n) {
              await i("addLineItem", {
                data: {
                  variantId: t,
                  quantity: n
                }
              })
            },
            async updateLineItem(t, n) {
              const e = parseInt(t);
              await i("updateLineItem", {
                index: e,
                data: {
                  quantity: n
                }
              })
            },
            async removeLineItem(t) {
              const n = parseInt(t);
              await i("removeLineItem", {
                index: n
              })
            },
            async setLineItemDiscount(t, n, e, o) {
              const r = parseInt(t);
              await i("setLineItemDiscount", {
                index: r,
                data: {
                  type: "FixedAmount" === n ? "flat" : "percent",
                  discountDescription: e,
                  amount: parseFloat(o) || 0
                }
              })
            },
            async removeLineItemDiscount(t) {
              const n = parseInt(t);
              await i("removeLineItemDiscount", {
                index: n
              })
            },
            async addLineItemProperties(t, n) {
              const e = parseInt(t);
              await i("setLineItemProperties", {
                index: e,
                data: n
              })
            },
            async removeLineItemProperties(t, n) {
              const e = parseInt(t);
              await i("removeLineItemProperties", {
                index: e,
                data: n
              })
            }
          },
          async close() {
            n.send("Pos.close")
          },
          async device() {
            const t = F();
            return n.subscribe("getState", (({ pos: n }) => {
              const e = (n || {}).device
                , i = {
                  name: e.name,
                  serialNumber: e.serialNumber
                };
              t.resolve(i)
            }
            ), {
              once: !0
            }),
              t.promise
          },
          async location() {
            const t = F();
            return n.subscribe("getState", (({ pos: n }) => {
              const e = (n || {}).location
                , i = {
                  id: e.id,
                  active: e.active,
                  name: e.name,
                  locationType: e.locationType,
                  address1: e.address1,
                  address2: e.address2,
                  zip: e.zip,
                  city: e.city,
                  province: e.province,
                  countryCode: e.countryCode,
                  countryName: e.countryName,
                  phone: e.phone
                };
              t.resolve(i)
            }
            ), {
              once: !0
            }),
              t.promise
          }
        };
        t.pos = o
      }
      ,
      "./print.ts": ({ protocol: t, internalApiPromise: n }) => {
        (C() || L()) && mt(self, "print", (function () {
          var e;
          const i = (null == (e = document.scrollingElement) ? void 0 : e.scrollHeight) || document.body.offsetHeight;
          kt((async () => {
            const { print: e } = await n || {};
            e ? await e({
              height: i
            }) : t.send("Print.app", {
              height: i
            })
          }
          ))
        }
        ))
      }
      ,
      "./resource-picker.ts": ({ api: t, protocol: n, internalApiPromise: e }) => {
        let i;
        t.resourcePicker = async function t(o) {
          if (i)
            return i.finally((() => t(o)));
          const r = await e
            , a = new Promise(((t, e) => {
              const a = Ut()
                , { type: s, query: c, selectionIds: l, action: u, multiple: d } = Object.assign({}, jt, o)
                , f = Object.assign({}, jt.filter, o.filter);
              if (!Dt.has(s))
                return e(Error("The 'type' option for resourcePicker must be one of " + Array.from(Dt).join(", ")));
              const h = new AbortController
                , { signal: p } = h;
              function v() {
                h.abort(),
                  i = void 0
              }
              const { resourcePicker: m } = r || {};
              m ? m({
                type: s,
                query: c,
                selectionIds: l,
                action: u,
                multiple: d,
                filter: f
              }).then((n => {
                t(n)
              }
              )).catch((t => {
                e(Error("ResourcePicker error", {
                  cause: t
                }))
              }
              )).finally((() => {
                v()
              }
              )) : (n.subscribe("Resource_Picker.select", (n => {
                v();
                const e = n.selection;
                Object.defineProperty(e, "selection", {
                  value: e
                }),
                  t(e)
              }
              ), {
                id: a,
                signal: p
              }),
                n.subscribe("Resource_Picker.cancel", (() => {
                  v(),
                    t(void 0)
                }
                ), {
                  id: a,
                  signal: p
                }),
                B(n, (t => {
                  v(),
                    e(Error("ResourcePicker error", {
                      cause: t
                    }))
                }
                ), {
                  id: a,
                  signal: p
                }),
                n.send("Resource_Picker.open", {
                  id: a,
                  resourceType: s,
                  initialQuery: c,
                  filterQuery: null == f ? void 0 : f.query,
                  initialSelectionIds: l,
                  actionVerb: null == u ? void 0 : u.toLowerCase(),
                  selectMultiple: d,
                  showHidden: null == f ? void 0 : f.hidden,
                  showVariants: null == f ? void 0 : f.variants,
                  showDraft: !1 !== (null == f ? void 0 : f.draft),
                  showArchived: !1 !== (null == f ? void 0 : f.archived),
                  showDraftBadge: [!0, void 0].includes(null == f ? void 0 : f.draft),
                  showArchivedBadge: void 0 === (null == f ? void 0 : f.archived)
                }))
            }
            ));
          return i = a,
            a
        }
      }
      ,
      "./reviews.ts": ({ api: t, internalApiPromise: n }) => {
        t.reviews = {
          request: async () => {
            const { reviews: t } = await n || {}
              , e = null == t ? void 0 : t.request;
            if (!e || "function" != typeof e)
              throw Error("Cannot request review");
            return await e()
          }
        }
      }
      ,
      "./s-app-nav.ts": tn,
      "./s-app-window.ts": Mn,
      "./save-bar.ts": ({ api: t, saveBarManager: n, internalApiPromise: e }) => {
        x && (t.saveBar = {
          show: async t => En(t).show(),
          hide: async t => En(t).hide(),
          toggle: async t => En(t).toggle(),
          async leaveConfirmation() {
            if (!n.isSaveBarVisible)
              return;
            const t = await e;
            if (!t)
              return;
            const { saveBar: i } = t;
            i && "function" == typeof i.leaveConfirmation && await i.leaveConfirmation();
            const o = document.querySelectorAll(bn);
            await Promise.all(Array.from(o).map((t => t.hide())));
            const r = document.querySelectorAll("form");
            await Promise.all(Array.from(r).filter(Y).map((t => t.reset())))
          }
        },
          K(document, {
            onChange(t) {
              n.set({
                mainAppFromForm: t
              })
            },
            filter: t => !xn(t)
          }),
          G(document, {
            onChange(t) {
              n.set({
                mainAppFromCustomElement: t
              })
            },
            filter: t => !xn(t)
          }),
          b(bn, class extends g {
            constructor() {
              super(...arguments),
                this.v = !1
            }
            static get observedAttributes() {
              return ["discardConfirmation"]
            }
            get discardConfirmation() {
              return this.hasAttribute("discardConfirmation")
            }
            set discardConfirmation(t) {
              t ? this.setAttribute("discardConfirmation", "") : this.removeAttribute("discardConfirmation")
            }
            get showing() {
              return this.v
            }
            get saveButton() {
              return this.U
            }
            get discardButton() {
              return this.D
            }
            connectedCallback() {
              this.u = new MutationObserver((() => this.o())),
                this.u.observe(this, {
                  childList: !0,
                  subtree: !0,
                  attributes: !0,
                  characterData: !0
                }),
                this.o()
            }
            disconnectedCallback() {
              var t;
              this.hide(),
                null == (t = this.u) || t.disconnect()
            }
            setAttribute(t, n) {
              super.setAttribute(t, n),
                this.o()
            }
            removeAttribute(t) {
              super.removeAttribute(t),
                this.o()
            }
            async show() {
              this.v || (this.v = !0,
                this.o(),
                this.dispatchEvent(new CustomEvent("show")))
            }
            async hide() {
              this.v && (this.v = !1,
                this.o(),
                this.dispatchEvent(new CustomEvent("hide")))
            }
            async toggle() {
              this.v ? await this.hide() : await this.show()
            }
            o() {
              Xt(this, gn),
                this.j(),
                this.dispatchEvent(new CustomEvent(X, {
                  bubbles: !0,
                  cancelable: !0
                }))
            }
            j() {
              const t = this.querySelectorAll(":scope > [variant=primary]")
                , n = this.querySelectorAll(":scope > :not([variant=primary])");
              this.U = An(t[t.length - 1]),
                this.D = An(n[n.length - 1])
            }
          }
          ))
      }
      ,
      "./scanner.ts": ({ api: t, protocol: n, internalApiPromise: e }) => {
        t.scanner = {
          capture: async () => {
            const { scanner: t } = await e || {};
            return (null == t ? void 0 : t.capture) ? t.capture() : new Promise(((t, e) => {
              const i = Ut()
                , o = new AbortController
                , { signal: r } = o;
              function a(t) {
                o.abort(),
                  e(Error("Scanner error", {
                    cause: t
                  }))
              }
              function s() {
                B(n, a, {
                  signal: r,
                  id: i
                }),
                  n.subscribe("Scanner.capture", (({ data: n }) => {
                    o.abort(),
                      n && n.scanData ? t({
                        data: n.scanData
                      }) : e(Error("No scanner data"))
                  }
                  ), {
                    id: i,
                    signal: r
                  }),
                  n.send("Scanner.open.camera", {
                    id: i
                  })
              }
              n.subscribe("getState", (({ features: t }) => {
                On(t) ? s() : function () {
                  const t = Ut()
                    , e = new AbortController;
                  o.signal.addEventListener("abort", (() => e.abort())),
                    B(n, (t => {
                      e.abort(),
                        a(t)
                    }
                    ), {
                      signal: e.signal,
                      id: t
                    }),
                    n.subscribe("Features.update", (({ features: t }) => {
                      On(t) && (e.abort(),
                        s())
                    }
                    ), {
                      signal: e.signal,
                      id: t
                    }),
                    n.send("Features.request", {
                      id: t,
                      feature: "Scanner",
                      action: Rn
                    })
                }()
              }
              ), {
                once: !0,
                signal: r
              })
            }
            ))
          }
        }
      }
      ,
      "./scopes.ts": async ({ api: t, internalApiPromise: n }) => {
        const e = {
          query: async () => {
            const { scopes: t } = await n || {};
            if (!t || "function" != typeof t.query)
              throw Error("Scopes API is not available");
            return t.query()
          }
          ,
          request: async t => {
            const { scopes: e } = await n || {};
            if (!e || "function" != typeof e.request)
              throw Error("Scopes API is not available");
            return e.request(t)
          }
          ,
          revoke: async t => {
            const { scopes: e } = await n || {};
            if (!e || "function" != typeof e.revoke)
              throw Error("Scopes API is not available");
            return e.revoke(t)
          }
        };
        t.scopes = e
      }
      ,
      "./share.ts": ({ protocol: t, internalApiPromise: n }) => {
        if (!C() && !L())
          return;
        const e = navigator.share;
        mt(navigator, "share", (async function (i) {
          if (!i)
            return e.call(navigator, i);
          const { share: o } = await n || {}
            , { title: r, text: a, url: s } = i;
          if (!o)
            return new Promise(((n, e) => {
              const i = Ut()
                , o = new AbortController
                , { signal: c } = o;
              function l(t) {
                o.abort(),
                  e(Error("Share error", {
                    cause: t
                  }))
              }
              B(t, l, {
                signal: c,
                id: i
              }),
                t.subscribe("Share.close", (t => {
                  const { success: e } = t;
                  e ? (o.abort(),
                    n()) : l("Share is dismissed")
                }
                ), {
                  signal: c,
                  id: i
                }),
                t.send("Share.show", {
                  id: i,
                  text: null != a ? a : r,
                  url: s
                })
            }
            ));
          await o({
            text: null != a ? a : r,
            url: s
          })
        }
        ))
      }
      ,
      "./shortcut.ts": ({ protocol: t, internalApiPromise: n }) => {
        $n || ($n = !0,
          Bn.forEach((e => {
            N({
              ...e,
              handler: async () => {
                const { shortcut: i } = await n || {};
                i ? await i(e) : t.send("Shortcut.invoke", e)
              }
            })
          }
          )))
      }
      ,
      "./sidekick.ts": ({ api: t, internalApiPromise: n, rpcEventTarget: e }) => {
        const i = async () => {
          const { sidekick: t } = await n || {};
          if (!t || "function" != typeof t.isOpen)
            throw Error("Sidekick API is not available");
          return t.isOpen()
        }
          , o = async () => {
            const { sidekick: t } = await n || {};
            if (!t || "function" != typeof t.open)
              throw Error("Sidekick API is not available");
            return t.open()
          }
          , r = async () => {
            const { sidekick: t } = await n || {};
            if (!t || "function" != typeof t.close)
              throw Error("Sidekick API is not available");
            return t.close()
          }
          ;
        n.then((t => {
          t && t.sidekick && e.addEventListener("shopify:sidekick:visibilitychange", (t => {
            globalThis.dispatchEvent(new CustomEvent("shopify:sidekick:visibilitychange", {
              detail: t.detail
            }))
          }
          ))
        }
        ));
        const a = {
          isOpen: i,
          open: o,
          close: r,
          toggle: async () => {
            const { sidekick: t } = await n || {};
            if (!t || "function" != typeof t.launch)
              throw Error("Sidekick API is not available");
            return await i() ? r() : o()
          }
          ,
          generate: async t => {
            const { sidekick: e } = await n || {};
            if (!e || "function" != typeof e.generate)
              throw Error("Sidekick API is not available");
            let i;
            const o = new ReadableStream({
              start(t) {
                i = t
              }
            })
              , r = await e.generate({
                ...t,
                onStreamEvent: n => {
                  var e;
                  "message" === n.event && i.enqueue(n.data),
                    null == (e = t.onStreamEvent) || e.call(t, n)
                }
              });
            return r.done().finally((() => {
              i.close()
            }
            )),
              c(r),
            {
              ...r,
              content: o
            }
          }
          ,
          launch: async t => {
            const { sidekick: e } = await n || {};
            if (!e || "function" != typeof e.launch)
              throw Error("Sidekick API is not available");
            return e.launch(t)
          }
          ,
          addHint: async t => {
            const { sidekick: e } = await n || {};
            if (!e || "function" != typeof e.addHint)
              throw Error("Sidekick API is not available");
            return e.addHint(t)
          }
          ,
          addSelectionNode: async t => {
            const { sidekick: e } = await n || {};
            if (!e || "function" != typeof e.addSelectionNode)
              throw Error("Sidekick API is not available");
            e.addSelectionNode(t)
          }
          ,
          removeSelectionNode: async () => {
            const { sidekick: t } = await n || {};
            if (!t || "function" != typeof t.removeSelectionNode)
              throw Error("Sidekick API is not available");
            t.removeSelectionNode()
          }
          ,
          registerToolHandler: t => {
            let e, i = !1;
            function o() {
              i = !0,
                null == e || e(),
                u(e),
                e = void 0
            }
            return kt((async () => {
              const { sidekick: r } = await n || {};
              if (!r || "function" != typeof r.registerToolHandler)
                throw Error("Sidekick API is not available");
              e = await r.registerToolHandler(t),
                c(e),
                i && o()
            }
            )),
              o
          }
          ,
          registerContextCallback: async t => {
            let e, i = !1;
            function o() {
              i = !0,
                null == e || e(),
                u(e),
                e = void 0
            }
            return kt((async () => {
              const { sidekick: r } = await n || {};
              if (!r || "function" != typeof r.registerContextCallback)
                throw Error("Sidekick API is not available");
              e = await r.registerContextCallback(t),
                c(e),
                i && o()
            }
            )),
              o
          }
        };
        t.sidekick = a
      }
      ,
      "./support.ts": ({ api: t, internalApiPromise: n, rpcEventTarget: e }) => {
        let i = null;
        t.support = {
          registerHandler: async t => {
            const { support: e } = await n || {};
            i = t,
              (null == e ? void 0 : e.callbackRegistered) && "function" == typeof e.callbackRegistered && e.callbackRegistered()
          }
        },
          e.addEventListener("supportRequested", (async t => {
            await (null == i ? void 0 : i())
          }
          ))
      }
      ,
      "./telemetry.ts": async ({ internalApiPromise: t }) => {
        "undefined" != typeof window && window.addEventListener("_PreactCustomElement:connected", (async n => {
          const e = n.target
            , i = e.tagName.toLowerCase()
            , o = function (t) {
              const n = [];
              for (let e = 0; e < t.attributes.length; e++) {
                const i = t.attributes[e];
                n.push(i.name)
              }
              return n
            }(e)
            , r = JSON.stringify(o)
            , a = await t;
          a && a.telemetry && "function" == typeof a.telemetry.increment && a.telemetry.increment("ui-component", {
            component: i,
            attributes: r
          })
        }
        ))
      }
      ,
      "./title-bar.ts": ({ protocol: t, internalApiPromise: n }) => {
        let e;
        const i = new Promise((n => {
          t.subscribe("getState", (({ features: t }) => {
            const e = (null == t ? void 0 : t.MarketingExternalActivityTopBar) || {}
              , { Dispatch: i } = e["APP::MARKETINGEXTERNALACTIVITYTOPBAR::UPDATE"] || {};
            n(i)
          }
          ), {
            once: !0
          })
        }
        ));
        function o() {
          var t;
          if (e)
            return null != (t = e.getAttribute("title")) ? t : document.title
        }
        function r(t) {
          var n;
          const i = document.querySelector("s-page");
          if (i) {
            const n = `${fn}, ${hn}, ${pn}`
              , e = Array.from(i.querySelectorAll(n)).find((n => n[en] == t));
            if (e)
              return void e.click();
            const o = Array.from(document.querySelectorAll("s-menu"));
            for (const i of o) {
              const n = Array.from(i.querySelectorAll("s-button")).find((n => n[en] == t));
              if (n)
                return void n.click()
            }
          }
          const o = Array.from(null != (n = null == e ? void 0 : e.querySelectorAll("button, a")) ? n : []).find((n => n[en] == t));
          null == o || o.click()
        }
        function a(t) {
          const { id: n, label: e, icon: i, tone: o, disabled: a, loading: s } = t;
          return {
            label: e,
            ...i && {
              icon: i
            },
            ...o && {
              tone: o
            },
            disabled: a,
            loading: s,
            onAction: () => null == r ? void 0 : r(n)
          }
        }
        async function s() {
          var r, s, c, l, u, d, f;
          let h;
          if (function () {
            var t, n;
            const i = null == (n = null == (t = document.documentElement) ? void 0 : t.getElementsByTagName) ? void 0 : n.call(t, cn);
            if (i && i.length) {
              for (const o of i)
                if (!xn(o)) {
                  e = o;
                  break
                }
            } else
              e = void 0
          }(),
            e) {
            const { primaryButton: t, secondaryButtons: n, breadcrumb: i } = null != (r = e.buttons()) ? r : {};
            h = {
              title: o()
            },
              t && (h.buttons = Object.assign(null != (s = h.buttons) ? s : {}, {
                primary: t
              })),
              n && (h.buttons = Object.assign(null != (c = h.buttons) ? c : {}, {
                secondary: n
              })),
              i && (h.breadcrumbs = {
                id: "breadcrumb",
                label: i
              })
          } else {
            const t = on({
              hideElements: !0,
              context: document
            });
            if (t) {
              if (h = {
                title: t.title || o()
              },
                t.breadcrumb && (t.breadcrumb[en] = "breadcrumb",
                  h.breadcrumbs = rn(t.breadcrumb)),
                t.primaryAction) {
                const n = rn(t.primaryAction);
                h.buttons = Object.assign(null != (l = h.buttons) ? l : {}, {
                  primary: n
                })
              }
              if (t.secondaryActions) {
                const n = an(t.secondaryActions, {
                  hideElements: !0,
                  context: document
                });
                h.buttons = Object.assign(null != (u = h.buttons) ? u : {}, {
                  secondary: n
                })
              }
              t.accessory && (h.accessory = t.accessory)
            } else
              h = {
                title: void 0
              }
          }
          if (await i)
            t.send("MarketingExternalActivityTopBar.update", h);
          else {
            const { titleBar: e } = await n || {};
            if (null == e ? void 0 : e.set) {
              const t = {
                title: h.title
              };
              h.breadcrumbs && (t.breadcrumbs = a(h.breadcrumbs)),
                (null == (d = h.buttons) ? void 0 : d.primary) && (t.primaryAction = a(h.buttons.primary)),
                (null == (f = h.buttons) ? void 0 : f.secondary) && (t.secondaryActions = h.buttons.secondary.map((t => "buttons" in t ? function (t) {
                  const { label: n, icon: e, disabled: i, buttons: o } = t;
                  return {
                    label: n,
                    ...e && {
                      icon: e
                    },
                    disabled: i,
                    actions: o.map(a)
                  }
                }(t) : a(t)))),
                e.set(t)
            } else
              t.send("TitleBar.update", h)
          }
        }
        const c = Object.getOwnPropertyDescriptor(Document.prototype, "title");
        Object.defineProperty(document, "title", {
          ...c,
          set(t) {
            c.set.call(this, t),
              s()
          }
        }),
          new MutationObserver((t => {
            for (let n of t) {
              if (mn(n.target) || [].some.call(n.addedNodes, wn) || [].some.call(n.removedNodes, wn))
                return s();
              if ("S-PAGE" === n.target.nodeName || [].some.call(n.addedNodes, (t => "S-PAGE" === t.nodeName)) || [].some.call(n.removedNodes, (t => "S-PAGE" === t.nodeName)) || n.target instanceof Element && n.target.closest("s-page"))
                return s()
            }
          }
          )).observe(document, {
            subtree: !0,
            childList: !0,
            characterData: !0,
            attributes: !0
          }),
          t.subscribe("TitleBar.buttons.button.click", (t => null == r ? void 0 : r(t.id))),
          t.subscribe("TitleBar.breadcrumbs.button.click", (t => null == r ? void 0 : r(t.id))),
          t.subscribe("MarketingExternalActivityTopBar.buttons.button.click", (t => null == r ? void 0 : r(t.id))),
          b(cn, class extends g {
            static get observedAttributes() {
              return ["title"]
            }
            connectedCallback() {
              this.u = new MutationObserver((() => {
                xn(this) || this.o(),
                  this.q()
              }
              )),
                this.u.observe(this, {
                  childList: !0,
                  subtree: !0,
                  attributes: !0,
                  characterData: !0
                }),
                this.o()
            }
            V() {
              const t = this.querySelector(":scope > [variant=breadcrumb]");
              return t && (t[en] = "breadcrumb"),
                t
            }
            q() {
              this.dispatchEvent(new Event("change"))
            }
            o() {
              Xt(this, dn),
                s()
            }
            disconnectedCallback() {
              var t;
              this.o(),
                null == (t = this.u) || t.disconnect()
            }
            attributeChangedCallback() {
              this.o()
            }
            buttons() {
              const t = this.V()
                , n = this.querySelector(":scope > [variant=primary]")
                , e = Array.from(this.querySelectorAll(":scope > :not([variant=primary]):not([variant=breadcrumb]), :scope > section")).map((t => "SECTION" !== t.nodeName ? vn(t) : function (t) {
                  var n;
                  t[en] || (t[en] = Ut());
                  const e = t[en]
                    , i = null != (n = t.getAttribute("label")) ? n : "Actions"
                    , o = t.getAttribute("icon") || void 0;
                  return {
                    id: e,
                    label: i,
                    ...o && {
                      icon: o
                    },
                    buttons: Array.from(t.querySelectorAll("button, a")).map(vn)
                  }
                }(t)));
              return {
                ...t ? {
                  breadcrumb: t.textContent
                } : {},
                ...n ? {
                  primaryButton: vn(n)
                } : {},
                secondaryButtons: e
              }
            }
          }
          ),
          s()
      }
      ,
      "./toast.ts": ({ api: t, protocol: n, internalApiPromise: e }) => {
        t.toast = {
          show(t, i = {}) {
            const o = Ut();
            return kt((async () => {
              const { toast: r } = await e || {};
              if (null == r ? void 0 : r.show)
                await r.show(t, {
                  ...Fn,
                  ...i,
                  id: o
                });
              else {
                const e = new AbortController
                  , { action: r, duration: a, isError: s, onAction: c, onDismiss: l } = Object.assign({}, Fn, i);
                n.subscribe("Toast.action", (() => null == c ? void 0 : c()), {
                  id: o,
                  signal: e.signal
                }),
                  n.subscribe("Toast.clear", (() => {
                    e.abort(),
                      null == l || l()
                  }
                  ), {
                    id: o,
                    signal: e.signal
                  }),
                  n.send("Toast.show", {
                    id: o,
                    message: t,
                    isError: s,
                    duration: a,
                    action: r ? {
                      content: r
                    } : void 0
                  })
              }
            }
            )),
              o
          },
          hide(t) {
            kt((async () => {
              const { toast: i } = await e || {};
              (null == i ? void 0 : i.hide) ? await i.hide(t) : n.send("Toast.clear", {
                id: t
              })
            }
            ))
          }
        }
      }
      ,
      "./ui-modal.ts": _n,
      "./ui-nav-menu.ts": Nn,
      "./user.ts": ({ api: t, protocol: n, internalApiPromise: e }) => {
        t.user = async function () {
          const { user: t } = await e || {};
          return t ? await t() : new Promise((t => {
            n.subscribe("getState", (({ staffMember: n, pos: e }) => {
              const i = {
                ...n,
                ...(e || {}).user
              }
                , o = {
                  id: i.id,
                  name: i.name || i.firstName,
                  firstName: i.firstName,
                  lastName: i.lastName,
                  email: i.email,
                  accountAccess: i.accountAccess,
                  accountType: i.accountType || i.userType
                };
              t(o)
            }
            ), {
              once: !0
            })
          }
          ))
        }
      }
      ,
      "./visibility.ts": ({ rpcEventTarget: t }) => {
        const n = {
          client: document.visibilityState,
          host: document.visibilityState
        };
        t.addEventListener("visibilitychange", (t => {
          n.host = t.detail.visibilityState,
            globalThis.document.dispatchEvent(new Event("visibilitychange"))
        }
        )),
          document.addEventListener("visibilitychange", (t => {
            t.isTrusted && (n.client = "visible" === n.client ? "hidden" : "visible")
          }
          )),
          Object.defineProperty(globalThis.document, "hidden", {
            configurable: !0,
            enumerable: !0,
            get: () => "hidden" === globalThis.document.visibilityState
          }),
          Object.defineProperty(globalThis.document, "visibilityState", {
            configurable: !0,
            enumerable: !0,
            get() {
              const { client: t, host: e } = n;
              return "visible" === e && "visible" === t ? "visible" : "hidden"
            }
          })
      }
      ,
      "./web-vitals.ts": async ({ api: t, protocol: n, internalApiPromise: e, rpcEventTarget: i }) => {
        if ("undefined" == typeof window || window.__is_web_vitals_initialized__ || L() || C() && !P())
          return;
        window.__is_web_vitals_initialized__ = !0;
        let o = null;
        t.webVitals = {
          onReport: async t => {
            o = t;
            const n = await e || {};
            n && n.telemetry && "function" == typeof n.telemetry.increment && n.telemetry.increment("web-vitals-report-listener-added")
          }
        };
        const r = await Promise.resolve().then((() => Ue))
          , { config: a } = await t || {}
          , { webVitals: s } = await e || {}
          , c = !!s
          , l = {
            reportAllChanges: c
          };
        let u = !0;
        Un.forEach((({ fn: t, name: i }) => {
          r[t]((t => async i => {
            var o;
            if (c && "function" == typeof (null == s ? void 0 : s.report) ? s.report({
              id: i.id,
              name: i.name,
              value: i.value
            }) : n.send("WebVitals." + t, {
              id: i.id,
              metricName: i.name,
              value: i.value
            }),
              u && "LCP" === i.name) {
              u = !1;
              const { perceivedPerformance: t } = await e || {};
              (null == t ? void 0 : t.appIsReady) && "function" == typeof t.appIsReady && t.appIsReady()
            }
            (null == (o = a.debug) ? void 0 : o.webVitals) && console.debug(i)
          }
          )(i), l)
        }
        )),
          i.addEventListener("webVitalsReport", (async t => {
            await (null == o ? void 0 : o({
              metrics: "metrics" in t.detail && Array.isArray(t.detail.metrics) ? t.detail.metrics : []
            }))
          }
          ))
      }
    });
  !function () {
    var t, n, e;
    try {
      if ("then" in ((null == (t = self.shopify) ? void 0 : t.ready) || {}))
        return
    } catch (g) { }
    if (!function () {
      try {
        if (!document.currentScript)
          return console.error('The script tag loading App Bridge has `type="module"`'),
            !1;
        const t = document.currentScript;
        return t.async ? (console.error("The script tag loading App Bridge has `async`"),
          !1) : t.defer ? (console.error("The script tag loading App Bridge has `defer`."),
            !1) : t.src ? new URL(t.src).hostname != ct ? (console.error("The script tag loading App Bridge is not loading App Bridge from the Shopify CDN."),
              !1) : (0 !== [...document.scripts].filter((t => function (t) {
                return !!t.src && !t.defer && !t.async && "module" !== t.type && !t.dataset.appBridgeCompatible && /^ *(|(text|application)\/(x-)?(java|ecma)script) *$/i.test(t.type)
              }(t))).indexOf(t) && console.warn("The script tag loading App Bridge should be the first script tag in the document. Loading other blocking scripts first can cause unexpected behavior."),
                !0) : (console.error("The script tag loading App Bridge is not loading App Bridge from the Shopify CDN."),
                  !1)
      } catch (t) {
        return console.error("App Bridge failed to self-validate", t),
          !1
      }
    }())
      throw Error("Shopify’s App Bridge must be included as the first <script> tag and must link to Shopify’s CDN. Do not use async, defer or type=module. Aborting.");
    null == (n = document.currentScript) || n.src;
    const { config: i, params: o } = function () {
      var t, n;
      const e = new URLSearchParams(location.search)
        , i = st;
      w(i, function () {
        try {
          const n = sessionStorage.getItem("app-bridge-config");
          if (n)
            try {
              return JSON.parse(n)
            } catch (t) { }
          return {}
        } catch (g) {
          return {}
        }
      }()),
        w(i, null != (n = null == (t = window.shopify) ? void 0 : t.config) ? n : {}),
        w(i, function () {
          var t;
          const n = Array.from(document.getElementsByTagName("script"));
          document.currentScript && n.unshift(document.currentScript);
          const e = {};
          for (const o of n)
            if (o.src)
              try {
                const t = new URL(o.src);
                t.hostname === ct && it.test(t.pathname) && (t.searchParams.forEach(((t, n) => {
                  t && (e[n] = t)
                }
                )),
                  w(e, o.dataset))
              } catch (i) { }
            else if ("shopify/config" === o.type)
              try {
                w(e, JSON.parse(null != (t = o.textContent) ? t : "{}"))
              } catch (g) {
                console.warn("App Bridge Next: failed to parse configuration. " + g)
              }
          return e
        }()),
        w(i, function () {
          var t;
          const n = Array.from(document.querySelectorAll('meta[name^="shopify-"i]'))
            , e = {};
          for (const i of n) {
            if (!i.hasAttribute("name"))
              continue;
            const n = i.getAttribute("name").replace(/shopify-/i, "").toLowerCase().replace(/-+(.)/g, ((t, n) => n.toUpperCase()));
            e[n] = lt(n, null != (t = i.getAttribute("content")) ? t : void 0)
          }
          return e
        }()),
        w(i, function (t) {
          return {
            shop: t.get("shop"),
            host: t.get("host"),
            locale: t.get("locale")
          }
        }(e));
      const o = function (t) {
        const n = ut.filter((n => !(n in t)));
        if (0 !== n.length)
          throw Error("App Bridge Next: missing required configuration fields: " + n);
        return t
      }(i);
      return {
        config: o,
        params: e
      }
    }();
    Object.freeze(i),
      function (t) {
        try {
          sessionStorage.setItem("app-bridge-config", JSON.stringify(t))
        } catch (n) { }
      }(i);
    const r = i.host ? atob(i.host) : i.shop
      , s = new URL("https://" + r).origin
      , l = function (t, n) {
        let e = "";
        const i = {
          name: "app-bridge-cdn",
          version: "1"
        };
        function o(o, r) {
          "dispatch" === o && (r.clientInterface = i,
            r.version = i.version);
          const a = {
            type: o,
            payload: r,
            source: n
          };
          t.postMessage(a, e || "*")
        }
        function r(n, i, { signal: o } = {}) {
          (null == o ? void 0 : o.aborted) || t.addEventListener("message", (function (t) {
            if (e) {
              if (t.origin !== e)
                return
            } else {
              if (!(dt.test(new URL(t.origin).hostname) && t.origin !== location.origin || k() && t.origin === location.origin))
                return;
              e = t.origin
            }
            const o = t.data;
            if (null != o && "object" == typeof o && o.payload && o.type)
              switch (o.type) {
                case "getState":
                  "getState" === n && i(o.payload, o);
                  break;
                case "dispatch":
                  ("function" == typeof n ? n(o.payload.type) : n === o.payload.type) && i(o.payload.payload, o)
              }
          }
          ), {
            signal: o
          })
        }
        return {
          send: function (t, n) {
            "getState" !== t ? o("dispatch", ht(t, n)) : o("getState", {})
          },
          subscribe: function (t, n, e = {}) {
            var i;
            if ("getState" === t)
              return r("getState", n, e),
                o("getState", {}),
                () => { }
                ;
            const a = new AbortController;
            null == (i = null == e ? void 0 : e.signal) || i.addEventListener("abort", (() => a.abort()));
            const s = ht(t, e.id ? {
              id: e.id
            } : void 0);
            a.signal.addEventListener("abort", (() => {
              o("unsubscribe", s)
            }
            )),
              r(s.type, ((t, i) => {
                (function (t, n) {
                  return void 0 === t || (null == n ? void 0 : n.id) === t
                }
                )(e.id, t) && (n(t, i),
                  !0 === e.once && a.abort())
              }
              ), {
                signal: a.signal
              }),
              o("subscribe", s),
              r(ht("Client.initialize").type, (() => {
                o("unsubscribe", s),
                  o("subscribe", s)
              }
              ), {
                signal: a.signal
              })
          }
        }
      }((null == (e = globalThis.shopify) ? void 0 : e.transport) || (k() && window === window.top ? {
        addEventListener: globalThis.addEventListener.bind(globalThis),
        removeEventListener: globalThis.removeEventListener.bind(globalThis),
        postMessage(t) {
          const n = JSON.stringify({
            id: "unframed://fromClient",
            origin: new URL(location.toString()).origin,
            data: t
          });
          window.MobileWebView.postMessage(n)
        }
      } : {
        addEventListener: globalThis.addEventListener.bind(globalThis),
        removeEventListener: globalThis.removeEventListener.bind(globalThis),
        postMessage: globalThis.parent.postMessage.bind(globalThis.parent)
      }), i)
      , u = {
        config: i,
        protocol: l,
        origin: s
      };
    Object.defineProperty(self, "shopify", {
      configurable: !0,
      writable: !0,
      value: u
    });
    const d = new et
      , f = F()
      , h = f.promise.then((t => null == t ? void 0 : t.internal))
      , m = C() && !P() && window === top;
    if (top === window && !k() && !(null == (b = u.config.disabledFeatures) ? void 0 : b.includes("auto-redirect")) || m)
      return function (t, n) {
        const e = new URL(location.pathname, location.origin);
        t.forEach(((t, n) => {
          "host" !== n && "shop" !== n && (e.searchParams.get(n) || e.searchParams.set(n, t))
        }
        ));
        const i = e.pathname + e.search
          , { host: o, shop: r } = n.config
          , a = `${"https://" + (o ? atob(o) : r + "/admin")}/apps/${n.config.apiKey}${i}`;
        return location.assign(a)
      }(o, u);
    var b;
    if (o.get("shopify-reload") && !o.get("id_token"))
      return f.resolve(void 0),
        y({
          idToken: yt,
          fetch: bt
        }, []),
        async function (t) {
          const n = new URL(t, location.origin);
          if (n.origin !== location.origin)
            throw Error(`?shopify-reload must be same-origin (${n.origin} !== ${location.origin})`);
          document.removeChild(document.documentElement),
            n.searchParams.delete("shopify-reload"),
            history.replaceState(null, "", n.href);
          const e = await fetch(n.href, {
            mode: "same-origin",
            headers: {
              accept: "text/html",
              "X-Shopify-Bounce": "1"
            },
            window: null
          })
            , i = (e.headers.get("content-type") || "").trim();
          if (i && !/^text\/html(\s*;|$)/i.test(i))
            throw Error("Refusing to redirect to non-html mimetype");
          const o = e.body.pipeThrough(new TextDecoderStream).getReader();
          for (; ;) {
            const { value: t, done: n } = await o.read();
            if (n)
              break;
            let e = t;
            document.write(e)
          }
          document.close()
        }(o.get("shopify-reload"));
    if (M)
      return f.resolve(void 0),
        void async function () {
          const t = window.name.endsWith("/src")
            , n = Sn(`frame:${I.apiKey}/main`) || Sn(T);
          if (n) {
            window.opener = n,
              window.fetch = n.fetch,
              window.shopify = n.shopify;
            const t = window.open;
            mt(self, "open", (function (n, e, i) {
              return null != n && "https:" !== xt(n).protocol ? window.opener.open(n, e, i) : t.call(this, n, e, i)
            }
            ))
          }
          function e() {
            var t;
            document.head.appendChild(Tn());
            const n = U();
            null == (t = window.top) || t.postMessage({
              type: "load"
            }, n),
              function (t) {
                let n, e = -1;
                new ResizeObserver((function (i) {
                  n && window.clearTimeout(n),
                    n = window.setTimeout((() => {
                      !function (n) {
                        var i;
                        n !== e && (e = n,
                          null == (i = window.top) || i.postMessage({
                            type: "resize",
                            height: n
                          }, t))
                      }(i[0].contentRect.height)
                    }
                    ), 16)
                }
                )).observe(document.body)
              }(n),
              function (t) {
                [{
                  keys: ["Escape"]
                }, {
                  keys: ["k"],
                  held: ["Meta", "Control"]
                }, {
                  keys: ["."],
                  held: ["Meta", "Control"]
                }].forEach((n => {
                  N({
                    ...n,
                    handler: () => {
                      var e;
                      null == (e = window.top) || e.postMessage({
                        type: "keyboard",
                        payload: n
                      }, t)
                    }
                  })
                }
                ))
              }(n),
              window.addEventListener("beforeunload", (() => {
                var t;
                const n = U();
                null == (t = window.top) || t.postMessage({
                  type: "unload"
                }, n)
              }
              ))
          }
          t ? (await async function () {
            return new Promise((t => {
              const n = new AbortController;
              "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", (function () {
                n.abort(),
                  t()
              }
              ), {
                signal: n.signal
              }) : t()
            }
            ))
          }(),
            e()) : (await async function () {
              document.removeChild(document.documentElement);
              const t = document.createElement("html");
              t.appendChild(document.createElement("head")),
                t.appendChild(document.createElement("body")),
                document.append(t),
                document.close(),
                n && await Ln(n.document, document)
            }(),
              e())
        }();
    function y(t, n = []) {
      const e = Object.entries(t).filter((([t]) => !function (t, n) {
        const e = A(t.split("/").pop().split(".")[0] || "");
        return n.map(A).includes(e)
      }(t, n)))
        , i = function (t) {
          const n = {};
          return {
            async set(e) {
              var i, o, r, a;
              const s = await t;
              if (!s)
                return;
              Object.assign(n, e);
              const { mainAppFromForm: c, mainAppFromCustomElement: l, maxModalFromForm: u, maxModalFromCustomElement: d, classicModalFromForm: f, classicModalFromCustomElement: h } = n
                , p = null != (r = null != (o = null != (i = null != l ? l : c) ? i : h) ? o : f) ? r : null
                , v = null != (a = null != d ? d : u) ? a : null;
              s.saveBar && "function" == typeof s.saveBar.set && (await s.saveBar.set(p, "main-app"),
                await s.saveBar.set(v, "max-modal"))
            },
            get isSaveBarVisible() {
              return Object.values(n).filter(Boolean).length > 0
            }
          }
        }(h);
      e.map((async ([t, n]) => {
        try {
          n({
            api: u,
            protocol: l,
            internalApiPromise: h,
            saveBarManager: i,
            rpcEventTarget: d
          })
        } catch (e) {
          console.error(`Initializing ${t} failed: ${null == e ? void 0 : e.message}\n${e.stack}`)
        }
      }
      ))
    }
    l.send("Client.initialize"),
      (async () => {
        const t = await async function (t, n) {
          const e = new Promise(((e, i) => {
            const o = new AbortController;
            t.subscribe("Client.initialize", (() => {
              setTimeout((() => {
                o.signal.aborted || (o.abort(),
                  i(Error("Host did not expose RPC")))
              }
              ), 100)
            }
            ), {
              signal: o.signal
            }),
              t.subscribe("Client.rpc", (({ port: t }) => {
                const i = function (t, { uuid: n = v, createEncoder: e = p, callable: i } = {}) {
                  let o = !1
                    , r = t;
                  const s = new Map
                    , c = new Map
                    , l = function (t, n) {
                      let e;
                      if (null == n) {
                        if ("function" != typeof Proxy)
                          throw Error("You must pass an array of callable methods in environments without Proxies.");
                        const n = new Map;
                        e = new Proxy({}, {
                          get(e, i) {
                            if (n.has(i))
                              return n.get(i);
                            const o = t(i);
                            return n.set(i, o),
                              o
                          }
                        })
                      } else {
                        e = {};
                        for (const i of n)
                          Object.defineProperty(e, i, {
                            value: t(i),
                            writable: !1,
                            configurable: !0,
                            enumerable: !0
                          })
                      }
                      return e
                    }(h, i)
                    , u = e({
                      uuid: n,
                      release(t) {
                        d(3, [t])
                      },
                      call(t, e, i) {
                        const o = n()
                          , r = m(o, i)
                          , [a, s] = u.encode(e);
                        return d(5, [o, t, a], s),
                          r
                      }
                    });
                  return r.addEventListener("message", f),
                  {
                    call: l,
                    replace(t) {
                      const n = r;
                      r = t,
                        n.removeEventListener("message", f),
                        t.addEventListener("message", f)
                    },
                    expose(t) {
                      for (const n of Object.keys(t)) {
                        const e = t[n];
                        "function" == typeof e ? s.set(n, e) : s.delete(n)
                      }
                    },
                    callable(...t) {
                      if (null != i)
                        for (const n of t)
                          Object.defineProperty(l, n, {
                            value: h(n),
                            writable: !1,
                            configurable: !0,
                            enumerable: !0
                          })
                    },
                    terminate() {
                      d(2, void 0),
                        w(),
                        r.terminate && r.terminate()
                    }
                  };
                  function d(t, n, e) {
                    o || r.postMessage(n ? [t, n] : [t], e)
                  }
                  async function f(t) {
                    const { data: n } = t;
                    if (null != n && Array.isArray(n))
                      switch (n[0]) {
                        case 2:
                          w();
                          break;
                        case 0:
                          {
                            const t = new a
                              , [i, o, r] = n[1]
                              , c = s.get(o);
                            try {
                              if (null == c)
                                throw Error(`No '${o}' method is exposed on this endpoint`);
                              const [n, e] = u.encode(await c(...u.decode(r, [t])));
                              d(1, [i, void 0, n], e)
                            } catch (e) {
                              const { name: t, message: n, stack: o } = e;
                              throw d(1, [i, {
                                name: t,
                                message: n,
                                stack: o
                              }]),
                              e
                            } finally {
                              t.release()
                            }
                            break
                          }
                        case 1:
                          {
                            const [t] = n[1];
                            c.get(t)(...n[1]),
                              c.delete(t);
                            break
                          }
                        case 3:
                          {
                            const [t] = n[1];
                            u.release(t);
                            break
                          }
                        case 6:
                          {
                            const [t] = n[1];
                            c.get(t)(...n[1]),
                              c.delete(t);
                            break
                          }
                        case 5:
                          {
                            const [t, i, o] = n[1];
                            try {
                              const n = await u.call(i, o)
                                , [e, r] = u.encode(n);
                              d(6, [t, void 0, e], r)
                            } catch (e) {
                              const { name: n, message: i, stack: o } = e;
                              throw d(6, [t, {
                                name: n,
                                message: i,
                                stack: o
                              }]),
                              e
                            }
                            break
                          }
                      }
                  }
                  function h(t) {
                    return (...e) => {
                      if (o)
                        return Promise.reject(Error("You attempted to call a function on a terminated web worker."));
                      if ("string" != typeof t && "number" != typeof t)
                        return Promise.reject(Error("Can’t call a symbol method on a remote endpoint: " + t.toString()));
                      const i = n()
                        , r = m(i)
                        , [a, s] = u.encode(e);
                      return d(0, [i, t, a], s),
                        r
                    }
                  }
                  function m(t, n) {
                    return new Promise(((e, i) => {
                      c.set(t, ((t, o, r) => {
                        if (null == o)
                          e(r && u.decode(r, n));
                        else {
                          const t = Error();
                          Object.assign(t, o),
                            i(t)
                        }
                      }
                      ))
                    }
                    ))
                  }
                  function w() {
                    var t;
                    o = !0,
                      s.clear(),
                      c.clear(),
                      null === (t = u.terminate) || void 0 === t || t.call(u),
                      r.removeEventListener("message", f)
                  }
                }((r = t,
                {
                  postMessage: (...t) => r.postMessage(...t),
                  addEventListener: (...t) => r.addEventListener(...t),
                  removeEventListener: (...t) => r.removeEventListener(...t),
                  terminate() {
                    r.close()
                  }
                }));
                var r;
                t.start(),
                  o.abort(),
                  i.expose({
                    dispatchEvent: n.dispatchEvent.bind(n)
                  }),
                  e(i.call.getApi()),
                  i.call.onClientReady()
              }
              ), {
                signal: o.signal
              })
          }
          ));
          try {
            const t = await e;
            return c(t),
              t
          } catch (g) {
            console.error(g)
          }
        }(l, d);
        f.resolve(t)
      }
      )(),
      y(Dn, i.disabledFeatures),
      l.send("Loading.stop"),
      u.ready = Promise.resolve()
  }();
  var jn, qn, zn, Vn, Hn, Wn = -1, Xn = function (t) {
    addEventListener("pageshow", (function (n) {
      n.persisted && (Wn = n.timeStamp,
        t(n))
    }
    ), !0)
  }, Kn = function () {
    return window.performance && performance.getEntriesByType && performance.getEntriesByType("navigation")[0]
  }, Gn = function () {
    var t = Kn();
    return t && t.activationStart || 0
  }, Jn = function (t, n) {
    var e = Kn()
      , i = "navigate";
    return Wn >= 0 ? i = "back-forward-cache" : e && (document.prerendering || Gn() > 0 ? i = "prerender" : document.wasDiscarded ? i = "restore" : e.type && (i = e.type.replace(/_/g, "-"))),
    {
      name: t,
      value: void 0 === n ? -1 : n,
      rating: "good",
      delta: 0,
      entries: [],
      id: "v3-".concat(Date.now(), "-").concat(Math.floor(8999999999999 * Math.random()) + 1e12),
      navigationType: i
    }
  }, Yn = function (t, n, e) {
    try {
      if (PerformanceObserver.supportedEntryTypes.includes(t)) {
        var i = new PerformanceObserver((function (t) {
          Promise.resolve().then((function () {
            n(t.getEntries())
          }
          ))
        }
        ));
        return i.observe(Object.assign({
          type: t,
          buffered: !0
        }, e || {})),
          i
      }
    } catch (o) { }
  }, Qn = function (t, n, e, i) {
    var o, r;
    return function (a) {
      var s, c;
      n.value >= 0 && (a || i) && ((r = n.value - (o || 0)) || void 0 === o) && (o = n.value,
        n.delta = r,
        n.rating = (s = n.value) > (c = e)[1] ? "poor" : s > c[0] ? "needs-improvement" : "good",
        t(n))
    }
  }, Zn = function (t) {
    requestAnimationFrame((function () {
      return requestAnimationFrame((function () {
        return t()
      }
      ))
    }
    ))
  }, te = function (t) {
    var n = function (n) {
      "pagehide" !== n.type && "hidden" !== document.visibilityState || t(n)
    };
    addEventListener("visibilitychange", n, !0),
      addEventListener("pagehide", n, !0)
  }, ne = function (t) {
    var n = !1;
    return function (e) {
      n || (t(e),
        n = !0)
    }
  }, ee = -1, ie = function () {
    return "hidden" !== document.visibilityState || document.prerendering ? 1 / 0 : 0
  }, oe = function (t) {
    "hidden" === document.visibilityState && ee > -1 && (ee = "visibilitychange" === t.type ? t.timeStamp : 0,
      ae())
  }, re = function () {
    addEventListener("visibilitychange", oe, !0),
      addEventListener("prerenderingchange", oe, !0)
  }, ae = function () {
    removeEventListener("visibilitychange", oe, !0),
      removeEventListener("prerenderingchange", oe, !0)
  }, se = function () {
    return ee < 0 && (ee = ie(),
      re(),
      Xn((function () {
        setTimeout((function () {
          ee = ie(),
            re()
        }
        ), 0)
      }
      ))),
    {
      get firstHiddenTime() {
        return ee
      }
    }
  }, ce = function (t) {
    document.prerendering ? addEventListener("prerenderingchange", (function () {
      return t()
    }
    ), !0) : t()
  }, le = [1800, 3e3], ue = function (t, n) {
    n = n || {},
      ce((function () {
        var e, i = se(), o = Jn("FCP"), r = Yn("paint", (function (t) {
          t.forEach((function (t) {
            "first-contentful-paint" === t.name && (r.disconnect(),
              t.startTime < i.firstHiddenTime && (o.value = Math.max(t.startTime - Gn(), 0),
                o.entries.push(t),
                e(!0)))
          }
          ))
        }
        ));
        r && (e = Qn(t, o, le, n.reportAllChanges),
          Xn((function (i) {
            o = Jn("FCP"),
              e = Qn(t, o, le, n.reportAllChanges),
              Zn((function () {
                o.value = performance.now() - i.timeStamp,
                  e(!0)
              }
              ))
          }
          )))
      }
      ))
  }, de = [.1, .25], fe = function (t, n) {
    n = n || {},
      ue(ne((function () {
        var e, i = Jn("CLS", 0), o = 0, r = [], a = function (t) {
          t.forEach((function (t) {
            if (!t.hadRecentInput) {
              var n = r[0]
                , e = r[r.length - 1];
              o && t.startTime - e.startTime < 1e3 && t.startTime - n.startTime < 5e3 ? (o += t.value,
                r.push(t)) : (o = t.value,
                  r = [t])
            }
          }
          )),
            o > i.value && (i.value = o,
              i.entries = r,
              e())
        }, s = Yn("layout-shift", a);
        s && (e = Qn(t, i, de, n.reportAllChanges),
          te((function () {
            a(s.takeRecords()),
              e(!0)
          }
          )),
          Xn((function () {
            o = 0,
              i = Jn("CLS", 0),
              e = Qn(t, i, de, n.reportAllChanges),
              Zn((function () {
                return e()
              }
              ))
          }
          )),
          setTimeout(e, 0))
      }
      )))
  }, he = {
    passive: !0,
    capture: !0
  }, pe = new Date, ve = function (t, n) {
    jn || (jn = n,
      qn = t,
      zn = new Date,
      be(removeEventListener),
      me())
  }, me = function () {
    if (qn >= 0 && qn < zn - pe) {
      var t = {
        entryType: "first-input",
        name: jn.type,
        target: jn.target,
        cancelable: jn.cancelable,
        startTime: jn.timeStamp,
        processingStart: jn.timeStamp + qn
      };
      Vn.forEach((function (n) {
        n(t)
      }
      )),
        Vn = []
    }
  }, we = function (t) {
    if (t.cancelable) {
      var n = (t.timeStamp > 1e12 ? new Date : performance.now()) - t.timeStamp;
      "pointerdown" == t.type ? (e = n,
        i = t,
        o = function () {
          ve(e, i),
            a()
        }
        ,
        r = function () {
          a()
        }
        ,
        a = function () {
          removeEventListener("pointerup", o, he),
            removeEventListener("pointercancel", r, he)
        }
        ,
        addEventListener("pointerup", o, he),
        addEventListener("pointercancel", r, he)) : ve(n, t)
    }
    var e, i, o, r, a
  }, be = function (t) {
    ["mousedown", "keydown", "touchstart", "pointerdown"].forEach((function (n) {
      return t(n, we, he)
    }
    ))
  }, ye = [100, 300], ge = function (t, n) {
    n = n || {},
      ce((function () {
        var e, i = se(), o = Jn("FID"), r = function (t) {
          t.startTime < i.firstHiddenTime && (o.value = t.processingStart - t.startTime,
            o.entries.push(t),
            e(!0))
        }, a = function (t) {
          t.forEach(r)
        }, s = Yn("first-input", a);
        e = Qn(t, o, ye, n.reportAllChanges),
          s && te(ne((function () {
            a(s.takeRecords()),
              s.disconnect()
          }
          ))),
          s && Xn((function () {
            var i;
            o = Jn("FID"),
              e = Qn(t, o, ye, n.reportAllChanges),
              Vn = [],
              qn = -1,
              jn = null,
              be(addEventListener),
              i = r,
              Vn.push(i),
              me()
          }
          ))
      }
      ))
  }, Ae = 0, Ee = 1 / 0, ke = 0, Ce = function (t) {
    t.forEach((function (t) {
      t.interactionId && (Ee = Math.min(Ee, t.interactionId),
        ke = Math.max(ke, t.interactionId),
        Ae = ke ? (ke - Ee) / 7 + 1 : 0)
    }
    ))
  }, Pe = function () {
    return Hn ? Ae : performance.interactionCount || 0
  }, Le = [200, 500], Te = 0, Se = function () {
    return Pe() - Te
  }, Ie = [], xe = {}, Me = function (t) {
    var n = Ie[Ie.length - 1]
      , e = xe[t.interactionId];
    if (e || Ie.length < 10 || t.duration > n.latency) {
      if (e)
        e.entries.push(t),
          e.latency = Math.max(e.latency, t.duration);
      else {
        var i = {
          id: t.interactionId,
          latency: t.duration,
          entries: [t]
        };
        xe[i.id] = i,
          Ie.push(i)
      }
      Ie.sort((function (t, n) {
        return n.latency - t.latency
      }
      )),
        Ie.splice(10).forEach((function (t) {
          delete xe[t.id]
        }
        ))
    }
  }, Re = function (t, n) {
    n = n || {},
      ce((function () {
        var e;
        "interactionCount" in performance || Hn || (Hn = Yn("event", Ce, {
          type: "event",
          buffered: !0,
          durationThreshold: 0
        }));
        var i, o = Jn("INP"), r = function (t) {
          t.forEach((function (t) {
            t.interactionId && Me(t),
              "first-input" === t.entryType && !Ie.some((function (n) {
                return n.entries.some((function (n) {
                  return t.duration === n.duration && t.startTime === n.startTime
                }
                ))
              }
              )) && Me(t)
          }
          ));
          var n, e = (n = Math.min(Ie.length - 1, Math.floor(Se() / 50)),
            Ie[n]);
          e && e.latency !== o.value && (o.value = e.latency,
            o.entries = e.entries,
            i())
        }, a = Yn("event", r, {
          durationThreshold: null !== (e = n.durationThreshold) && void 0 !== e ? e : 40
        });
        i = Qn(t, o, Le, n.reportAllChanges),
          a && ("PerformanceEventTiming" in window && "interactionId" in PerformanceEventTiming.prototype && a.observe({
            type: "first-input",
            buffered: !0
          }),
            te((function () {
              r(a.takeRecords()),
                o.value < 0 && Se() > 0 && (o.value = 0,
                  o.entries = []),
                i(!0)
            }
            )),
            Xn((function () {
              Ie = [],
                Te = Pe(),
                o = Jn("INP"),
                i = Qn(t, o, Le, n.reportAllChanges)
            }
            )))
      }
      ))
  }, Oe = [2500, 4e3], $e = {}, Be = function (t, n) {
    n = n || {},
      ce((function () {
        var e, i = se(), o = Jn("LCP"), r = function (t) {
          var n = t[t.length - 1];
          n && n.startTime < i.firstHiddenTime && (o.value = Math.max(n.startTime - Gn(), 0),
            o.entries = [n],
            e())
        }, a = Yn("largest-contentful-paint", r);
        if (a) {
          e = Qn(t, o, Oe, n.reportAllChanges);
          var s = ne((function () {
            $e[o.id] || (r(a.takeRecords()),
              a.disconnect(),
              $e[o.id] = !0,
              e(!0))
          }
          ));
          ["keydown", "click"].forEach((function (t) {
            addEventListener(t, (function () {
              return setTimeout(s, 0)
            }
            ), !0)
          }
          )),
            te(s),
            Xn((function (i) {
              o = Jn("LCP"),
                e = Qn(t, o, Oe, n.reportAllChanges),
                Zn((function () {
                  o.value = performance.now() - i.timeStamp,
                    $e[o.id] = !0,
                    e(!0)
                }
                ))
            }
            ))
        }
      }
      ))
  }, Fe = [800, 1800], _e = function t(n) {
    document.prerendering ? ce((function () {
      return t(n)
    }
    )) : "complete" !== document.readyState ? addEventListener("load", (function () {
      return t(n)
    }
    ), !0) : setTimeout(n, 0)
  }, Ne = function (t, n) {
    n = n || {};
    var e = Jn("TTFB")
      , i = Qn(t, e, Fe, n.reportAllChanges);
    _e((function () {
      var o = Kn();
      if (o) {
        var r = o.responseStart;
        if (r <= 0 || r > performance.now())
          return;
        e.value = Math.max(r - Gn(), 0),
          e.entries = [o],
          i(!0),
          Xn((function () {
            e = Jn("TTFB", 0),
              (i = Qn(t, e, Fe, n.reportAllChanges))(!0)
          }
          ))
      }
    }
    ))
  };
  const Ue = {
    __proto__: null,
    CLSThresholds: de,
    FCPThresholds: le,
    FIDThresholds: ye,
    INPThresholds: Le,
    LCPThresholds: Oe,
    TTFBThresholds: Fe,
    getCLS: fe,
    getFCP: ue,
    getFID: ge,
    getINP: Re,
    getLCP: Be,
    getTTFB: Ne,
    onCLS: fe,
    onFCP: ue,
    onFID: ge,
    onINP: Re,
    onLCP: Be,
    onTTFB: Ne
  }
}();
