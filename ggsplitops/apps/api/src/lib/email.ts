import { createTransport } from "nodemailer";

import { env } from "../env.ts";

interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
}

const smtpTransport = env.SMTP_URL ? createTransport(env.SMTP_URL) : null;

export async function sendEmail({ to, subject, text }: OutboundEmail) {
  if (env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, text }),
    });

    if (!response.ok) {
      throw new Error(`Resend email request failed (${response.status}): ${await response.text()}`);
    }
    return;
  }

  if (smtpTransport) {
    await smtpTransport.sendMail({ from: env.EMAIL_FROM, to, subject, text });
    return;
  }

  throw new Error("Email delivery is not configured. Set RESEND_API_KEY or SMTP_URL.");
}