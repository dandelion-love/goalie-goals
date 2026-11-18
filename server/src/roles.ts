// Map a verified account to its role in the app. The role lives in the app's own data,
// never in the sign-in proxy's allowlist.

export type Role = 'keeper' | 'parent';

const ROLES: ReadonlySet<string> = new Set<Role>(['keeper', 'parent']);

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && ROLES.has(value);
}

export function normaliseAccount(account: string): string {
  return account.trim().toLowerCase();
}

export interface RoleStore {
  /** The account's role, or null when the account is not set up. */
  roleFor(account: string): Promise<Role | null>;
}

/**
 * Parse `account=role` pairs separated by `,` or `;`. Unknown roles are rejected so a typo
 * fails at startup instead of silently locking someone out. Errors never echo accounts.
 */
export function parseRoleSeed(seed: string): Map<string, Role> {
  const roles = new Map<string, Role>();
  const pairs = seed.split(/[,;]/).map((p) => p.trim()).filter(Boolean);
  pairs.forEach((pair, i) => {
    const eq = pair.lastIndexOf('=');
    const account = eq > 0 ? normaliseAccount(pair.slice(0, eq)) : '';
    const role = eq > 0 ? pair.slice(eq + 1).trim() : '';
    if (!account || !isRole(role)) {
      throw new Error(`Role seed entry ${i + 1} is not account=keeper or account=parent.`);
    }
    roles.set(account, role);
  });
  return roles;
}

export class MemoryRoleStore implements RoleStore {
  private readonly roles: Map<string, Role>;

  constructor(roles: Map<string, Role> = new Map()) {
    this.roles = roles;
  }

  static fromSeed(seed: string): MemoryRoleStore {
    return new MemoryRoleStore(parseRoleSeed(seed));
  }

  async roleFor(account: string): Promise<Role | null> {
    return this.roles.get(normaliseAccount(account)) ?? null;
  }
}

/**
 * The slice of the Firestore client this adapter uses. The real `Firestore` class from
 * `@google-cloud/firestore` satisfies it; tests pass a fake. Not wired into the server yet:
 * the walking skeleton runs on the in-memory store.
 */
export interface DocumentReader {
  collection(path: string): {
    doc(id: string): { get(): Promise<{ exists: boolean; get(field: string): unknown }> };
  };
}

/** Roles held as documents `members/{account}` with a `role` field. */
export class FirestoreRoleStore implements RoleStore {
  constructor(
    private readonly db: DocumentReader,
    private readonly collection = 'members',
  ) {}

  async roleFor(account: string): Promise<Role | null> {
    const snap = await this.db.collection(this.collection).doc(normaliseAccount(account)).get();
    if (!snap.exists) return null;
    const role = snap.get('role');
    return isRole(role) ? role : null;
  }
}
