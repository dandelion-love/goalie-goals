// Verify the sign-in proxy's signed identity header with google-auth-library.

import { OAuth2Client } from 'google-auth-library';

export const IDENTITY_HEADER = 'x-goog-iap-jwt-assertion';
export const IAP_ISSUER = 'https://cloud.google.com/iap';

export interface Identity {
  account: string;
  subject: string;
}

export interface IdentityVerifier {
  /** Resolve the verified identity, or throw when the token is not acceptable. */
  verify(token: string): Promise<Identity>;
}

/** Public keys by key id, as PEM strings. */
export type KeySource = () => Promise<Record<string, string>>;

/** The proxy's published keys, cached for an hour. */
export function proxyPublicKeys(client = new OAuth2Client(), ttlMs = 60 * 60 * 1000): KeySource {
  let cached: { keys: Record<string, string>; at: number } | null = null;
  return async () => {
    if (cached && Date.now() - cached.at < ttlMs) return cached.keys;
    const { pubkeys } = await client.getIapPublicKeysAsync();
    cached = { keys: pubkeys as unknown as Record<string, string>, at: Date.now() };
    return cached.keys;
  };
}

export class InvalidIdentity extends Error {}

export class ProxyJwtVerifier implements IdentityVerifier {
  private readonly client = new OAuth2Client();

  constructor(
    private readonly audience: string,
    private readonly keys: KeySource,
  ) {
    if (!audience) throw new Error('An audience is required.');
  }

  async verify(token: string): Promise<Identity> {
    let payload: Record<string, unknown> | undefined;
    try {
      const ticket = await this.client.verifySignedJwtWithCertsAsync(
        token,
        await this.keys(),
        this.audience,
        [IAP_ISSUER],
      );
      payload = ticket.getPayload() as Record<string, unknown> | undefined;
    } catch {
      // The library's messages quote the token and its payload; never pass them on.
      throw new InvalidIdentity('signed header did not verify');
    }
    const account = typeof payload?.email === 'string' ? payload.email : '';
    const subject = typeof payload?.sub === 'string' ? payload.sub : '';
    if (!account || !subject) throw new InvalidIdentity('signed header has no account');
    return { account, subject };
  }
}
