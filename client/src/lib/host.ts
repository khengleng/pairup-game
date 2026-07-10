/**
 * Host-based entry points. Some custom domains open a specific surface of the
 * app rather than the general home hub.
 */

/** Domains that serve as the scratch-game admin portal. */
export const SCRATCH_ADMIN_HOSTS = new Set(["pickme.cambobia.com"]);

export function isScratchAdminHost(): boolean {
  return (
    typeof window !== "undefined" &&
    SCRATCH_ADMIN_HOSTS.has(window.location.hostname)
  );
}
