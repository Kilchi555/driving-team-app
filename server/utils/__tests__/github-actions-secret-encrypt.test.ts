import { describe, expect, it } from 'vitest'
import sodium from 'libsodium-wrappers'
import {
  assertGithubSecretName,
  encryptGithubActionsSecret,
} from '../github-actions-secret-encrypt'

describe('github actions secret encrypt', () => {
  it('rejects names that could break a URL or a shell', () => {
    expect(() => assertGithubSecretName(`FOO'; rm -rf /`)).toThrow('invalid_secret_name')
    expect(() => assertGithubSecretName('../secrets')).toThrow('invalid_secret_name')
    expect(assertGithubSecretName('CRON_SECRET')).toBe('CRON_SECRET')
  })

  it('round-trips values that would break the old python -c interpolation', async () => {
    await sodium.ready
    const kp = sodium.crypto_box_keypair()
    const pub = sodium.to_base64(kp.publicKey, sodium.base64_variants.ORIGINAL)
    const secret = `'; rm -rf /; echo '$(whoami)"\nline`
    const enc = await encryptGithubActionsSecret(pub, secret)
    const opened = sodium.crypto_box_seal_open(
      sodium.from_base64(enc, sodium.base64_variants.ORIGINAL),
      kp.publicKey,
      kp.privateKey,
    )
    expect(sodium.to_string(opened)).toBe(secret)
  })
})
