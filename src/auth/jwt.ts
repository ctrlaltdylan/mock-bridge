/**
 * HS256 session tokens using WebCrypto, so they work in Node, browsers and
 * test DOMs alike (unlike `TokenGenerator`, which needs Node's crypto).
 */

export interface SessionTokenPayload {
  iss: string;  // Shop's admin domain
  dest: string; // Shop's domain
  aud: string;  // Client ID
  sub: string;  // User ID
  exp: number;  // Expiration time
  nbf: number;  // Not before time
  iat: number;  // Issued at time
  jti: string;  // JWT ID
  sid: string;  // Session ID
  sig: string;  // Shopify signature
}

export interface TokenGeneratorOptions {
  shop: string;
  clientId: string;
  clientSecret: string;
  userId?: string;
  sessionId?: string;
  expiresInSeconds?: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
}

function hmacKey(secret: string, usage: 'sign' | 'verify') {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

export async function signJwt(payload: object, secret: string): Promise<string> {
  const data = [{ alg: 'HS256', typ: 'JWT' }, payload]
    .map(part => base64UrlEncode(encoder.encode(JSON.stringify(part))))
    .join('.');
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret, 'sign'), encoder.encode(data));
  return `${data}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/** Decodes a JWT's payload without verifying it. */
export function decodeJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    return JSON.parse(decoder.decode(base64UrlDecode(token.split('.')[1])));
  } catch {
    return null;
  }
}

/** Verifies an HS256 JWT's signature and its `exp`/`nbf` claims, like `jsonwebtoken.verify`. */
export async function verifyJwt<T = Record<string, unknown>>(token: string, secret: string): Promise<T> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('jwt malformed');

  const [header, payload, signature] = parts;
  let decodedHeader: { alg?: string };
  let decodedPayload: { exp?: number; nbf?: number };
  try {
    decodedHeader = JSON.parse(decoder.decode(base64UrlDecode(header)));
    decodedPayload = JSON.parse(decoder.decode(base64UrlDecode(payload)));
  } catch {
    throw new Error('jwt malformed');
  }
  if (decodedHeader.alg !== 'HS256') throw new Error('invalid algorithm');

  const valid = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(secret, 'verify'),
    base64UrlDecode(signature),
    encoder.encode(`${header}.${payload}`),
  );
  if (!valid) throw new Error('invalid signature');

  const now = Math.floor(Date.now() / 1000);
  if (typeof decodedPayload.nbf === 'number' && decodedPayload.nbf > now) throw new Error('jwt not active');
  if (typeof decodedPayload.exp === 'number' && decodedPayload.exp <= now) throw new Error('jwt expired');

  return decodedPayload as T;
}

/** Signs a mock Shopify session token (id token) with the same claims `TokenGenerator` produces. */
export async function signSessionToken(options: TokenGeneratorOptions): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionTokenPayload = {
    iss: `https://${options.shop}/admin`,
    dest: `https://${options.shop}`,
    aud: options.clientId,
    sub: options.userId ?? '123456789',
    exp: now + (options.expiresInSeconds ?? 60),
    nbf: now,
    iat: now,
    jti: crypto.randomUUID(),
    sid: options.sessionId ?? randomHex(32),
    sig: randomHex(32),
  };
  return signJwt(payload, options.clientSecret);
}

/** Verifies a session token like `TokenGenerator.verifySessionToken`, including the iss/dest domain check. */
export async function verifySessionToken(token: string, clientSecret: string): Promise<SessionTokenPayload> {
  try {
    const payload = await verifyJwt<SessionTokenPayload>(token, clientSecret);
    const domain = (url: string) => new URL(url).hostname.split('.').slice(-2).join('.');
    if (domain(payload.iss) !== domain(payload.dest)) throw new Error('Token iss and dest domains do not match');
    return payload;
  } catch (error) {
    throw new Error(`Invalid session token: ${error instanceof Error ? error.message : String(error)}`);
  }
}
