// Signup password policy (per the mockup: MORE than 8 chars => min 9, plus lower/upper/special).
// Shared by the backend Zod schema and the client form so both enforce identically.
export function validatePassword(password: string): string | null {
  if (password.length < 9) return "Password must be more than 8 characters.";
  if (!/[a-z]/.test(password)) return "Include at least one lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Include at least one uppercase letter.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Include at least one special character.";
  return null;
}
