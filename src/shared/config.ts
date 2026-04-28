import { CorsOptions } from "cors";

export const appConfig = {
  name: process.env.APP_NAME ?? "Express Starter",
  defaultLanguage: "id",

  baseUrl: "http://localhost:8000",
  defaultFilesDirectory: "tmp",

  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  } satisfies CorsOptions,
};

export type Gender = (typeof allGenders)[number];
export const allGenders = ["m", "f"] as const;
export const genderConfig: Record<
  Gender,
  { displayName: string; color: string }
> = {
  m: { displayName: "Laki-laki", color: "var(--color-sky-500)" },
  f: { displayName: "Perempuan", color: "var(--color-pink-500)" },
};

export type Language = (typeof allLanguages)[number];
export const allLanguages = ["en", "id", "es", "fr", "de", "ar"] as const;
export const languageConfig: Record<
  Language,
  { locale: string; currency: string; decimal: number; symbol: string }
> = {
  en: { locale: "en-US", currency: "USD", decimal: 2, symbol: "$" },
  id: { locale: "id-ID", currency: "IDR", decimal: 0, symbol: "Rp" },
  de: { locale: "de-DE", currency: "EUR", decimal: 2, symbol: "€" },
  es: { locale: "es-ES", currency: "EUR", decimal: 2, symbol: "€" },
  fr: { locale: "fr-FR", currency: "EUR", decimal: 2, symbol: "€" },
  ar: { locale: "ar-SA", currency: "SAR", decimal: 2, symbol: "ر.س" },
};
