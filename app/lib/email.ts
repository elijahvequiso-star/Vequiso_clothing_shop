import "server-only";

import nodemailer from "nodemailer";

type StoreEmail = { to: string; subject: string; text: string; html: string };
export type EmailDelivery = "sent" | "not_configured" | "failed";

export async function sendStoreEmail(message: StoreEmail): Promise<EmailDelivery> {
  const user = process.env.GMAIL_USER?.trim();
  const password = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT);
  if (!user || !password || host !== "smtp.gmail.com" || ![465, 587].includes(port) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)) return "not_configured";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
    tls: { minVersion: "TLSv1.2" },
  });
  try {
    await transporter.sendMail({ from: { name: "Elijah ClothingShop", address: user }, ...message });
    return "sent";
  } catch {
    return "failed";
  } finally {
    transporter.close();
  }
}
