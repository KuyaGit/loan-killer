/**
 * update.ts — version-check service (no React).
 *
 * Fetches the latest GitHub release for this repo and compares its tag
 * against the installed app version.  Returns null (never throws) on any
 * failure so callers never need to handle errors.
 */

const RELEASES_URL =
  'https://api.github.com/repos/KuyaGit/loan-killer/releases/latest';
const APK_ASSET_NAME = 'app-release.apk';
const FETCH_TIMEOUT_MS = 5000;

export interface UpdateInfo {
  /** Normalized remote version, e.g. "1.2.0" */
  version: string;
  /** Direct download URL for the loan-killer.apk asset */
  downloadUrl: string;
}

/**
 * Strip a leading "v" and validate the "X.Y.Z" shape.
 * Returns the normalized version string or null if malformed.
 */
function parseVersion(tag: string): string | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(tag);
  if (!match) return null;
  return `${match[1]}.${match[2]}.${match[3]}`;
}

/**
 * Compare two "X.Y.Z" strings numerically.
 * Returns true only when remote is STRICTLY greater than installed.
 */
export function isNewerVersion(remote: string, installed: string): boolean {
  const r = remote.split('.').map(Number);
  const i = installed.split('.').map(Number);
  for (let idx = 0; idx < 3; idx++) {
    if (r[idx] > i[idx]) return true;
    if (r[idx] < i[idx]) return false;
  }
  return false;
}

/**
 * Check whether a newer release is available.
 *
 * Returns an UpdateInfo when ALL of the following hold:
 *  - The request completes within 5 s
 *  - The response is HTTP 2xx
 *  - tag_name parses to a valid X.Y.Z version
 *  - An asset named "loan-killer.apk" with a download URL exists
 *  - The remote version is strictly greater than installedVersion
 *
 * Returns null in ALL other cases (network error, timeout, 403/404,
 * malformed tag, missing asset, not newer).  Never throws.
 */
export async function checkForUpdate(
  installedVersion: string,
): Promise<UpdateInfo | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(RELEASES_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json' },
    });

    if (!res.ok) return null;

    const data = await res.json();

    const remoteVersion = parseVersion(data?.tag_name ?? '');
    if (!remoteVersion) return null;

    if (!isNewerVersion(remoteVersion, installedVersion)) return null;

    const downloadUrl: string | undefined = (data.assets ?? []).find(
      (a: { name: string; browser_download_url: string }) =>
        a.name === APK_ASSET_NAME,
    )?.browser_download_url;

    if (!downloadUrl) return null;

    return { version: remoteVersion, downloadUrl };
  } catch {
    // AbortError, network failure, JSON parse error — all silently return null
    return null;
  } finally {
    clearTimeout(timer);
  }
}
