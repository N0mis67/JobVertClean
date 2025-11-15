import { randomBytes, scrypt as callbackScrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(callbackScrypt);
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const storedKey = Buffer.from(keyHex, "hex");
  const derivedKey = (await scrypt(password, salt, storedKey.length)) as Buffer;

  if (derivedKey.length !== storedKey.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, storedKey);
}