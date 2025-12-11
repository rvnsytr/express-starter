import { capitalize, formatDate } from "../utils";

export const messages = {
  empty: "Tidak ada hasil yang ditemukan.",
  error: "Terjadi kesalahan. Silakan coba lagi nanti.",
  notAuthorized: "Anda tidak memiliki izin untuk melakukan tindakan ini.",

  noChanges: (thing: string) => `Tidak ada perubahan pada ${thing}.`,
  thingNotMatch: (thing: string) =>
    `${capitalize(thing, "first")} tidak cocok - silakan periksa kembali.`,

  // -- Validation
  invalid: (field: string) => `${capitalize(field, "first")} tidak valid.`,

  required: (field: string) => `${capitalize(field, "first")} wajib diisi.`,
  requiredInvalidType: (field: string, fieldType: string) =>
    `${capitalize(field, "first")} wajib diisi dan harus berupa ${fieldType} yang valid.`,

  outOfRange: (field: string, min: number, max: number, thing = "karakter") =>
    `${capitalize(field, "first")} harus antara ${min} hingga ${max} ${thing}.`.trim(),

  string: {
    tooShort: (field: string, min: number) =>
      `${capitalize(field, "first")} harus terdiri dari minimal ${min} karakter.`,
    tooLong: (field: string, max: number) =>
      `${capitalize(field, "first")} tidak boleh melebihi ${max} karakter.`,
  },

  number: {
    tooSmall: (field: string, min: number) =>
      `${capitalize(field, "first")} tidak boleh kurang dari ${min}.`,
    tooLarge: (field: string, max: number) =>
      `${capitalize(field, "first")} tidak boleh lebih dari ${max}.`,
  },

  date: {
    tooEarly: (field: string, min: Date) =>
      `${capitalize(field, "first")} tidak boleh lebih awal dari ${formatDate(min, "PPP")}.`,
    tooLate: (field: string, max: Date) =>
      `${capitalize(field, "first")} tidak boleh lebih lambat dari ${formatDate(max, "PPP")}.`,
    tooFew: (field: string, min: number) =>
      `${capitalize(field, "first")} harus terdiri dari minimal ${min} tanggal.`,
    tooMany: (field: string, max: number) =>
      `${capitalize(field, "first")} tidak boleh melebihi ${max} tanggal.`,
  },

  files: {
    mimeInvalid: (field: string) => `Tipe ${field} tidak valid.`,
    tooFew: (field: string, min: number) =>
      `Silakan unggah minimal ${min} ${field}.`,
    tooMany: (field: string, max: number) =>
      `Anda hanya dapat mengunggah hingga ${max} ${field}.`,
    tooLarge: (field: string, sizeInMb: string | number) =>
      `${capitalize(field, "first")} melebihi batas ukuran maksimum ${sizeInMb} MB.`,
  },

  password: {
    lowercase: "Kata sandi harus mengandung huruf kapital (A-Z).",
    uppercase: "Kata sandi harus mengandung huruf kecil (a-z).",
    number: "Kata sandi harus mengandung angka (0-9).",
    character: "Kata sandi harus mengandung karakter khusus.",
  },
};
