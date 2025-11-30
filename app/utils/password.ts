
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const ITERATIONS = 310_000;
const HASH_ALGORITHM = "SHA-512";
const encoder = new TextEncoder();

function getCrypto(): Crypto {
  if (!globalThis.crypto) {
    throw new Error("Web Crypto API is not available in this environment.");
  }

  return globalThis.crypto;
}

function toHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0) {
    return null;
  }

  const result = new Uint8Array(hex.length / 2);

  for (let i = 0; i < result.length; i += 1) {
    const byte = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);

    if (Number.isNaN(byte)) {
      return null;
    }

    result[i] = byte;
  }

  return result;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const crypto = getCrypto();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    {
      name: "PBKDF2",
    },
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    keyMaterial,
    KEY_LENGTH * 8,
  );

  return new Uint8Array(bits);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a[i]! ^ b[i]!;
  }

  return result === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const crypto = getCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const derivedKey = await deriveKey(password, salt);

  return `${toHex(salt)}:${toHex(derivedKey)}`;
}

  export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) {
    return false;
  }

  const salt = fromHex(saltHex);
  const storedKey = fromHex(keyHex);

  if (!salt || !storedKey) {
    return false;
  }
  
  const derivedKey = await deriveKey(password, salt);

  return timingSafeEqual(derivedKey, storedKey);
}