import sodium from 'libsodium-wrappers'

const GITHUB_SECRET_NAME = /^[A-Za-z0-9_]+$/

export function assertGithubSecretName(name: string): string {
  const trimmed = name.trim()
  if (!GITHUB_SECRET_NAME.test(trimmed) || trimmed.length > 100) {
    throw new Error('invalid_secret_name')
  }
  return trimmed
}

/** libsodium sealed box, as required by the GitHub Actions secrets API. */
export async function encryptGithubActionsSecret(
  publicKeyBase64: string,
  secretValue: string,
): Promise<string> {
  if (!publicKeyBase64 || !secretValue) {
    throw new Error('missing_encrypt_inputs')
  }
  await sodium.ready
  const publicKey = sodium.from_base64(publicKeyBase64, sodium.base64_variants.ORIGINAL)
  const ciphertext = sodium.crypto_box_seal(secretValue, publicKey)
  return sodium.to_base64(ciphertext, sodium.base64_variants.ORIGINAL)
}
