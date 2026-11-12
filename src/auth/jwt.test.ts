import jwt from 'jsonwebtoken';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeJwt, signJwt, signSessionToken, verifyJwt, verifySessionToken } from './jwt';
import { TokenGenerator } from './token-generator';
import { validateSessionToken } from './validateSessionToken';

const secret = 'test-secret';
const options = { shop: 'test-shop.myshopify.com', clientId: 'client-id', clientSecret: secret, userId: '42' };

describe('jwt', () => {
  afterEach(() => vi.useRealTimers());

  it('signs session tokens with the claims TokenGenerator produces', async () => {
    const token = await signSessionToken(options);
    const payload = await verifySessionToken(token, secret);

    expect(payload).toMatchObject({
      iss: 'https://test-shop.myshopify.com/admin',
      dest: 'https://test-shop.myshopify.com',
      aud: 'client-id',
      sub: '42',
    });
    expect(payload.exp - payload.iat).toBe(60);
    expect(Object.keys(payload).sort()).toEqual(Object.keys(jwt.decode(new TokenGenerator(secret).generateSessionToken(options)) as object).sort());
  });

  it('interoperates with jsonwebtoken in both directions', async () => {
    const ours = await signSessionToken(options);
    expect(jwt.verify(ours, secret, { algorithms: ['HS256'] })).toMatchObject({ aud: 'client-id' });

    const theirs = new TokenGenerator(secret).generateSessionToken(options);
    await expect(verifyJwt(theirs, secret)).resolves.toMatchObject({ aud: 'client-id' });
  });

  it('rejects a wrong secret, a tampered payload and a non-HS256 header', async () => {
    const token = await signJwt({ sub: '1' }, secret);
    const [header, , signature] = token.split('.');
    const tampered = `${header}.${Buffer.from(JSON.stringify({ sub: '2' })).toString('base64url')}.${signature}`;
    const none = `${Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')}.${token.split('.')[1]}.`;

    await expect(verifyJwt(token, 'other')).rejects.toThrow('invalid signature');
    await expect(verifyJwt(tampered, secret)).rejects.toThrow('invalid signature');
    await expect(verifyJwt(none, secret)).rejects.toThrow('invalid algorithm');
    await expect(verifyJwt('nope', secret)).rejects.toThrow('jwt malformed');
  });

  it('checks exp and nbf', async () => {
    const token = await signSessionToken({ ...options, expiresInSeconds: 60 });
    vi.useFakeTimers({ now: Date.now() + 61_000 });
    await expect(verifySessionToken(token, secret)).rejects.toThrow('Invalid session token: jwt expired');

    const future = await signJwt({ nbf: Math.floor(Date.now() / 1000) + 30 }, secret);
    await expect(verifyJwt(future, secret)).rejects.toThrow('jwt not active');
  });

  it('decodes without verifying', async () => {
    expect(decodeJwt(await signJwt({ sub: '1' }, 'any'))).toEqual({ sub: '1' });
    expect(decodeJwt('garbage')).toBeNull();
  });

  it('validateSessionToken tells mock tokens from real ones', async () => {
    const mock = await signSessionToken({ ...options, clientSecret: 'mock-secret' });
    const real = await signSessionToken(options);
    const validate = (token: string) =>
      validateSessionToken(token, { shopifySecret: secret, mockSecret: 'mock-secret', developmentOnly: false });

    await expect(validate(mock)).resolves.toMatchObject({ isMock: true, shopName: 'test-shop.myshopify.com', userId: '42' });
    await expect(validate(real)).resolves.toMatchObject({ isMock: false });
    await expect(validate(await signSessionToken({ ...options, clientSecret: 'unknown' }))).resolves.toBe(false);
  });
});
