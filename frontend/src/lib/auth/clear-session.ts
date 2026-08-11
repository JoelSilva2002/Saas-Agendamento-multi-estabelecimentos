import { clearSessionContext } from "./session-context";
import { clearTokens } from "./token-storage";

/** Everything that needs wiping when a session ends, whether by explicit logout or because
 * silent token refresh failed (see @/lib/api/client.ts). */
export function clearSession(): void {
  clearTokens();
  clearSessionContext();
}
