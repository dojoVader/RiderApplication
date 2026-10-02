// The service account JSON as stored by Firebase (snake_case keys).
type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

// What firebase-admin's credential.cert() expects.
export type ServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

export const FIREBASE_SERVICE_ACCOUNT = 'FIREBASE_SERVICE_ACCOUNT';

/**
 * Decodes FIREBASE_SERVICE_ACCOUNT: the service account key file, base64
 * encoded so it fits in one environment variable (`base64 -w0 key.json`).
 * Keeps the key out of git, the image and the filesystem.
 */
export function decodeServiceAccount(encoded: string): ServiceAccount {
  let json: ServiceAccountJson;
  try {
    json = JSON.parse(Buffer.from(encoded.trim(), 'base64').toString('utf8'));
  } catch {
    throw new Error(`${FIREBASE_SERVICE_ACCOUNT} is not base64-encoded JSON`);
  }
  if (!json.project_id || !json.client_email || !json.private_key) {
    throw new Error(
      `${FIREBASE_SERVICE_ACCOUNT} is missing project_id, client_email or private_key`,
    );
  }
  return {
    projectId: json.project_id,
    clientEmail: json.client_email,
    privateKey: json.private_key,
  };
}
