import nodemailer from "nodemailer";
import { logger } from "./logger.js";

function getTransporter() {
  const user = process.env["ADMIN_SMTP_USER"];
  const password = process.env["ADMIN_SMTP_APP_PASSWORD"];
  if (!user || !password) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: password },
  });
}

export function isAdminEmailConfigured() {
  return Boolean(process.env["ADMIN_SMTP_USER"] && process.env["ADMIN_SMTP_APP_PASSWORD"]);
}

export async function sendUserPasswordResetCode(recipient: string, code: string) {
  const transporter = getTransporter();
  const sender = process.env["ADMIN_SMTP_USER"];
  if (!transporter || !sender) return false;

  try {
    await transporter.sendMail({
      from: sender,
      to: recipient,
      subject: "CampusNav password reset code",
      text: `Your CampusNav password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    });
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to send user password reset code");
    return false;
  }
}

export async function sendAdminNotification(subject: string, text: string, recipient: string) {
  const transporter = getTransporter();
  const sender = process.env["ADMIN_SMTP_USER"];
  if (!transporter || !sender) {
    logger.warn("Admin email notifications are disabled; configure ADMIN_SMTP_USER and ADMIN_SMTP_APP_PASSWORD.");
    return;
  }

  try {
    await transporter.sendMail({ from: sender, to: recipient, subject, text });
  } catch (err) {
    logger.error({ err }, "Failed to send admin email notification");
  }
}
