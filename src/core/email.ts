import { Novu } from "@novu/api";

export const novu = new Novu({ secretKey: process.env.NOVU_API_KEY });
