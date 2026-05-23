// ============================================================================
// PASSWORD HASHING (bcrypt)
// ============================================================================
// WHAT:  Turn plain password → hash on register; compare on login.
// WHY:   If DB is stolen, attacker still doesn't get real passwords.
// SKIP:  Storing plain text = instant account compromise. SHA256 alone = too fast to crack.
// HOW:   bcrypt.hash (slow + salt) and bcrypt.compare on login.
// ============================================================================

import bcrypt from "bcryptjs";

// Higher number = safer but slower login. 10 is a common default.
const SALT_ROUNDS = 10;

export const hashPassword = async (plainPassword: string): Promise<string> =>
  bcrypt.hash(plainPassword, SALT_ROUNDS);

export const verifyPassword = async (
  plainPassword: string,
  passwordHash: string,
): Promise<boolean> => bcrypt.compare(plainPassword, passwordHash);
