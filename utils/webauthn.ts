/**
 * WebAuthn Utilities for FIDO2/Passkey Registration and Authentication
 */

// Types
export interface PublicKeyCredentialCreationOptionsJSON {
  challenge: string
  rp: {
    name: string
    id?: string
  }
  user: {
    id: string
    name: string
    displayName: string
  }
  pubKeyCredParams: Array<{
    type: 'public-key'
    alg: number
  }>
  timeout?: number
  attestation?: 'none' | 'indirect' | 'direct'
  extensions?: Record<string, unknown>
}

export interface PublicKeyCredentialRequestOptionsJSON {
  challenge: string
  timeout?: number
  rpId?: string
  userVerification?: 'required' | 'preferred' | 'discouraged'
  extensions?: Record<string, unknown>
}

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert Base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Check if WebAuthn is supported by the browser
 */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    navigator.credentials !== undefined
  )
}

/**
 * Check if platform authenticator is available (biometric on device)
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false
  
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch (err) {
    console.error('Error checking platform authenticator:', err)
    return false
  }
}

/**
 * Start WebAuthn registration (setup passkey)
 */
export async function startRegistration(
  options: PublicKeyCredentialCreationOptionsJSON
): Promise<{
  id: string
  rawId: string
  response: {
    clientDataJSON: string
    attestationObject: string
  }
  type: string
}> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser')
  }

  // Convert challenge from base64 to ArrayBuffer
  const decodedChallenge = base64ToArrayBuffer(options.challenge)

  const credentialCreationOptions: CredentialCreationOptions = {
    publicKey: {
      challenge: new Uint8Array(decodedChallenge),
      rp: {
        name: options.rp.name,
        id: options.rp.id
      },
      user: {
        id: new TextEncoder().encode(options.user.id),
        name: options.user.name,
        displayName: options.user.displayName
      },
      pubKeyCredParams: options.pubKeyCredParams,
      timeout: options.timeout || 60000,
      attestation: options.attestation || 'none',
      userVerification: 'preferred' // Allow biometric
    }
  }

  const credential = (await navigator.credentials.create(
    credentialCreationOptions
  )) as PublicKeyCredential | null

  if (!credential) {
    throw new Error('Failed to create credential')
  }

  const attestationResponse = credential.response as AuthenticatorAttestationResponse

  return {
    id: credential.id,
    rawId: arrayBufferToBase64(credential.rawId),
    response: {
      clientDataJSON: arrayBufferToBase64(attestationResponse.clientDataJSON),
      attestationObject: arrayBufferToBase64(attestationResponse.attestationObject)
    },
    type: credential.type
  }
}

/**
 * Start WebAuthn authentication (login with passkey)
 */
export async function startAuthentication(
  options: PublicKeyCredentialRequestOptionsJSON
): Promise<{
  id: string
  rawId: string
  response: {
    clientDataJSON: string
    authenticatorData: string
    signature: string
    userHandle: string | null
  }
  type: string
}> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser')
  }

  // Convert challenge from base64 to ArrayBuffer
  const decodedChallenge = base64ToArrayBuffer(options.challenge)

  const credentialRequestOptions: CredentialRequestOptions = {
    publicKey: {
      challenge: new Uint8Array(decodedChallenge),
      timeout: options.timeout || 60000,
      rpId: options.rpId,
      userVerification: options.userVerification || 'preferred'
    }
  }

  const assertion = (await navigator.credentials.get(
    credentialRequestOptions
  )) as PublicKeyCredential | null

  if (!assertion) {
    throw new Error('Failed to get credential')
  }

  const assertionResponse = assertion.response as AuthenticatorAssertionResponse

  return {
    id: assertion.id,
    rawId: arrayBufferToBase64(assertion.rawId),
    response: {
      clientDataJSON: arrayBufferToBase64(assertionResponse.clientDataJSON),
      authenticatorData: arrayBufferToBase64(assertionResponse.authenticatorData),
      signature: arrayBufferToBase64(assertionResponse.signature),
      userHandle: assertionResponse.userHandle
        ? arrayBufferToBase64(assertionResponse.userHandle)
        : null
    },
    type: assertion.type
  }
}

/**
 * Get a human-readable device name from transports
 */
export function getDeviceNameFromTransports(
  transports?: string[],
  userAgent?: string
): string {
  if (!transports || transports.length === 0) {
    return 'Security Key'
  }

  if (transports.includes('internal')) {
    // Check user agent to determine device type
    if (userAgent?.includes('iPhone') || userAgent?.includes('iPad')) {
      return 'iPhone/iPad Biometric'
    }
    if (userAgent?.includes('Android')) {
      return 'Android Biometric'
    }
    if (userAgent?.includes('Windows')) {
      return 'Windows Hello'
    }
    if (userAgent?.includes('Mac')) {
      return 'MacBook Biometric'
    }
    return 'Device Biometric'
  }

  const deviceTypes: Record<string, string> = {
    usb: 'USB Security Key',
    ble: 'Bluetooth Security Key',
    nfc: 'NFC Security Key'
  }

  for (const transport of transports) {
    if (deviceTypes[transport]) {
      return deviceTypes[transport]
    }
  }

  return 'Security Key'
}

