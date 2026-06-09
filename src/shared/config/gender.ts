export type Gender = (typeof allGenders)[number];
export const allGenders = ["m", "f"] as const;
export const genderConfig: Record<Gender, { label: string; color: string }> = {
  m: { label: "Laki-laki", color: "var(--color-sky-500)" },
  f: { label: "Perempuan", color: "var(--color-pink-500)" },
};
