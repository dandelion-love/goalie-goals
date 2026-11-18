// Local development and tests: sign identity headers shaped like the proxy's with a key made
// in memory at startup. Nothing here is a real key, and it is never written to disk.

import { generateKeyPairSync, randomUUID, sign, type KeyObject } from 'node:crypto';
import { IAP_ISSUER, type KeySource } from './identity.js';

export const DEV_AUDIENCE = '/dev/local/goalie-goals';

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export interface TokenClaims {
  account: string;
  audience?: string;
  issuer?: string;
  /** Seconds from now until expiry; negative makes an expired token. */
  expiresIn?: number;
}

export class TestSigner {
  readonly keyId = `dev-${randomUUID()}`;
  private readonly privateKey: KeyObject;
  private readonly publicPem: string;

  constructor() {
    const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    this.privateKey = privateKey;
    this.publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  }

  keys: KeySource = async () => ({ [this.keyId]: this.publicPem });

  sign({ account, audience = DEV_AUDIENCE, issuer = IAP_ISSUER, expiresIn = 600 }: TokenClaims): string {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'ES256', typ: 'JWT', kid: this.keyId };
    const payload = {
      iss: issuer,
      aud: audience,
      sub: `accounts.example:${account}`,
      email: account,
      iat: now - 5,
      exp: now + expiresIn,
    };
    const signed = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
    const signature = sign('sha256', Buffer.from(signed), {
      key: this.privateKey,
      dsaEncoding: 'ieee-p1363',
    });
    return `${signed}.${b64url(signature)}`;
  }
}
