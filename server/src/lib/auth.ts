const encoder = new TextEncoder()

let cachedKey: { secret: string; key: CryptoKey } | null = null

async function getKey(secret: string): Promise<CryptoKey> {
  if (cachedKey?.secret === secret) return cachedKey.key
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  cachedKey = { secret, key }
  return key
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0) return null
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
    if (!Number.isFinite(byte)) return null
    out[i] = byte
  }
  return out
}

export function extractSignature(header: string | null): string | null {
  if (!header) return null
  const trimmed = header.trim().replace(/^0x/i, '')
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return trimmed.toLowerCase()
  return null
}

export function extractTimestamp(header: string | null): string | null {
  if (!header) return null
  const trimmed = header.trim()
  if (/^[0-9]{1,20}$/.test(trimmed)) return trimmed
  return null
}

export async function verifySignature(
  secret: string | undefined,
  body: ArrayBuffer,
  signature: string | null,
  timestamp: string | null
): Promise<boolean> {
  if (!secret) return false

  const ts = extractTimestamp(timestamp)
  if (!ts) return false

  const sigHex = extractSignature(signature)
  if (!sigHex) return false

  const sigBytes = hexToBytes(sigHex)
  if (!sigBytes) return false

  const key = await getKey(secret)
  const tsBytes = encoder.encode(ts + '\n')
  const bodyBytes = new Uint8Array(body)
  const signedData = new Uint8Array(tsBytes.length + bodyBytes.length)
  signedData.set(tsBytes, 0)
  signedData.set(bodyBytes, tsBytes.length)

  const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, signedData))
  return timingSafeEqual(expected, sigBytes)
}
