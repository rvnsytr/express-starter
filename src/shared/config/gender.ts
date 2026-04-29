export type Gender = (typeof allGenders)[number];
export const allGenders = ["m", "f"] as const;
export const genderConfig: Record<
  Gender,
  { displayName: string; color: string }
> = {
  m: { displayName: "Laki-laki", color: "var(--color-sky-500)" },
  f: { displayName: "Perempuan", color: "var(--color-pink-500)" },
};
