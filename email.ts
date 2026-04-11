import nodemailer from 'nodemailer';

/**
 * sendEmail sends an email using the SMTP configuration defined in
 * environment variables. It returns a promise that resolves when the
 * message has been sent. If any of the required environment variables
 * are missing it will throw an error. Consumers of this function should
 * catch and handle errors accordingly.
 *
 * @param to Recipient email address
 * @param subject Subject line of the email
 * @param html HTML content for the email body
 */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string; }) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;
  if (!host || !port || !user || !pass || !from) {
    throw new Error('Faltan variables de configuración de correo (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM)');
  }
  const transporter = nodemailer.createTransport({
    host,
    port,
    auth: { user, pass },
    secure: port === 465,
  });
  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
}

/**
 * generateRandomPassword returns a random alphanumeric string of a given length.
 * This is used when creating users with a temporary password. You may
 * customise the length or character set as needed. The default length
 * is eight characters.
 *
 * @param length Length of the generated password
 */
export function generateRandomPassword(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}