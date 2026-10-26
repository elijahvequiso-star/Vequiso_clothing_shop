import "server-only";

import { createHmac, randomBytes, randomInt } from "node:crypto";
import nodemailer from "nodemailer";

export const OTP_EXPIRY_MINUTES = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_SENDS_PER_DAY = 5;

export type OtpDeliveryStage = "configuration" | "authorization" | "quota" | "provider" | "network";

export class OtpDeliveryError extends Error {
  constructor(
    readonly stage: OtpDeliveryStage,
    readonly code: string,
    readonly status: number,
    readonly missingVariables: string[] = [],
    readonly providerCode?: string,
  ) {
    super("OTP email delivery failed.");
    this.name = "OtpDeliveryError";
  }
}

const SMTP_ENVIRONMENT_VARIABLES = [
  "GMAIL_USER",
  "GMAIL_APP_PASSWORD",
  "SMTP_HOST",
  "SMTP_PORT",
] as const;

export function validateSmtpEnvironment() {
  const invalidVariables: string[] = SMTP_ENVIRONMENT_VARIABLES.filter((name) => {
    const value = process.env[name]?.trim();
    return !value || /^(YOUR_|your[-_]|replace[-_]|placeholder)/i.test(value);
  });

  const appPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
  if (appPassword && !/^[a-z0-9]{16}$/i.test(appPassword)) {
    invalidVariables.push("GMAIL_APP_PASSWORD");
  }

  if (process.env.SMTP_HOST?.trim().toLowerCase() !== "smtp.gmail.com") {
    invalidVariables.push("SMTP_HOST");
  }
  const port = Number(process.env.SMTP_PORT);
  if (process.env.SMTP_PORT?.trim() && port !== 465 && port !== 587) {
    invalidVariables.push("SMTP_PORT");
  }

  if (!process.env.OTP_PEPPER || process.env.OTP_PEPPER.length < 32 || /^(YOUR_|your[-_]|replace[-_]|placeholder)/i.test(process.env.OTP_PEPPER)) {
    invalidVariables.push("OTP_PEPPER");
  }

  const uniqueInvalidVariables = [...new Set(invalidVariables)];
  return { valid: uniqueInvalidVariables.length === 0, invalidVariables: uniqueInvalidVariables };
}

function getOtpPepper() {
  const secret = process.env.OTP_PEPPER;
  if (!secret || secret.length < 32) {
    throw new Error("OTP_PEPPER must be configured with at least 32 characters.");
  }
  return secret;
}

export function generateOtp() {
  return randomInt(100000, 1000000).toString();
}

export function hashOtp(otp: string) {
  return createHmac("sha256", getOtpPepper()).update(otp).digest("hex");
}

export function generateRegistrationToken() {
  return randomBytes(32).toString("hex");
}

export function hashRegistrationToken(token: string) {
  return createHmac("sha256", getOtpPepper()).update(token).digest("hex");
}

export async function sendOtpEmail(email: string, otp: string) {
  const user = process.env.GMAIL_USER?.trim();
  const appPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT);

  const configuration = validateSmtpEnvironment();
  if (!configuration.valid || !user || !appPassword || !host || ![465, 587].includes(port)) {
    throw new OtpDeliveryError("configuration", "invalid_smtp_configuration", 503, configuration.invalidVariables);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)) {
    throw new OtpDeliveryError("configuration", "invalid_sender_address", 503);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: appPassword },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
    dnsTimeout: 10_000,
    tls: { minVersion: "TLSv1.2" },
  });

  const subject = "Your Elijah ClothingShop verification code";
  const text = `Your verification code is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes. If you did not request this, you can ignore this email. Do not share this code with anyone.`;
  const html = `<div style="font-family:Arial,sans-serif;color:#241a17;max-width:560px;margin:0 auto;padding:24px"><p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#76625d">Elijah ClothingShop</p><h1 style="font-size:24px">Verify your email address</h1><p>Enter this six-digit code to finish creating your account:</p><p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:24px 0">${otp}</p><p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p><p style="font-size:13px;color:#76625d">If you did not request this code, you can ignore this email. Do not share this code with anyone.</p></div>`;
  try {
    await transporter.sendMail({
      from: { name: "Elijah ClothingShop", address: user },
      to: email,
      subject,
      text,
      html,
    });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
      ? error.code.toUpperCase()
      : "SMTP_SEND_FAILED";
    if (code === "EAUTH" || code === "ERELEASE" || code === "535") {
      throw new OtpDeliveryError("authorization", "smtp_auth_failed", 502, [], code);
    }
    if (
      code.includes("TIMEOUT") ||
      ["EDNS", "EAI_AGAIN", "EHOSTUNREACH", "ENETUNREACH", "ECONNECTION", "ECONNRESET", "ECONNREFUSED", "ECONNABORTED", "EPIPE", "ENOTFOUND"].includes(code)
    ) {
      throw new OtpDeliveryError("network", "smtp_network_error", 502, [], code);
    }
    throw new OtpDeliveryError("provider", "smtp_send_failed", 502, [], code);
  } finally {
    transporter.close();
  }
}
