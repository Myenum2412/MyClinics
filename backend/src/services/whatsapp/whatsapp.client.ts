import wpp from "whatsapp-web.js";
import type { Client } from "whatsapp-web.js";
import { logger } from "@/lib/logger";

const { Client: WhatsAppClient, LocalAuth } = wpp;

export interface WhatsAppClientOptions {
  /** LocalAuth clientId — also becomes the session folder name prefix. */
  clientId: string;
  /** Root folder where this client's LocalAuth data is persisted. */
  dataPath: string;
}

/**
 * Creates a WhatsApp Web client bound to its own persistent session.
 * Each clinic gets its own clientId/dataPath pair so multiple numbers can be
 * connected at once without sharing auth state.
 */
export function createWhatsAppClient(options: WhatsAppClientOptions): Client {
  const puppeteerOptions: Record<string, unknown> = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  };
  if (process.env.WHATSAPP_CHROME_PATH) {
    puppeteerOptions.executablePath = process.env.WHATSAPP_CHROME_PATH;
  }

  logger.info("creating whatsapp client", {
    clientId: options.clientId,
    dataPath: options.dataPath,
  });

  return new WhatsAppClient({
    authStrategy: new LocalAuth({
      clientId: options.clientId,
      dataPath: options.dataPath,
    }),
    puppeteer: puppeteerOptions as never,
  });
}
