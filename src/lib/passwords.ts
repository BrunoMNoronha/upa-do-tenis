import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

export function hashPassword(senha: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(senha, salt, KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(senha: string, senhaHash: string): boolean {
  const [algoritmo, salt, hash] = senhaHash.split(":");

  if (algoritmo !== "scrypt" || !salt || !hash) {
    return false;
  }

  const derivado = scryptSync(senha, salt, KEY_LENGTH);
  const armazenado = Buffer.from(hash, "hex");

  if (derivado.length !== armazenado.length) {
    return false;
  }

  return timingSafeEqual(derivado, armazenado);
}
