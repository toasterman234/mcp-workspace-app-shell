/**
 * Auth scaffold for future ChatGPT App private data access.
 *
 * TODO (future):
 * - Add OAuth challenge handling via `_meta["mcp/www_authenticate"]`.
 * - Validate incoming bearer tokens from host-specific auth layers.
 * - Map host subject/session metadata to internal tenancy.
 */
export interface AuthContext {
  isAuthenticated: boolean
  subject?: string
}

export function resolveAuthContext(): AuthContext {
  // Read-only/public-first scaffold.
  return { isAuthenticated: false }
}
