/**
 * Host-based entry points. Some custom domains open a specific surface of the
 * app rather than the general home hub.
 */

/** Domains that serve as the consolidated web admin portal for all games. */
export const ADMIN_HOSTS = new Set(["game.cambobia.com"]);

export function isAdminHost(): boolean {
  return (
    typeof window !== "undefined" && ADMIN_HOSTS.has(window.location.hostname)
  );
}
