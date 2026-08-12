import { Client, LocalAuth } from "whatsapp-web.js";
import { logger } from "@/lib/logger";

/**
 * Creates the WhatsApp client. Single process responsibility: the worker
 * guards against creating duplicate sessions.
 */
export function createWhatsAppClient(): Client {
  const sessionPath = process.env.WHATSAPP_SESSION_PATH ?? "./whatsapp-session";

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

  logger.info("creating whatsapp client", { sessionPath });

  return new Client({
    authStrategy: new LocalAuth({
      clientId: "ai-bot",
      dataPath: sessionPath,
    }),
    puppeteer: puppeteerOptions as never,
  });
}
