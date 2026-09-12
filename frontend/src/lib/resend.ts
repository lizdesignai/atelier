import { Resend } from 'resend';

export async function sendEmailSafely(
  resend: Resend,
  to: string,
  subject: string,
  html: string,
  context: string
) {
  try {
    const data = await resend.emails.send({
      from: 'Atelier <no-reply@atelier.com>',
      to,
      subject,
      html,
    });
    return data;
  } catch (error) {
    console.error('[Resend Error] in ' + context + ':', error);
    throw error;
  }
}

export function buildAppLikeEmail(
  icon: string,
  title: string,
  content: string,
  ctaText: string,
  ctaLink: string
) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #333;">${icon} ${title}</h2>
      <div style="color: #555; line-height: 1.5;">${content}</div>
      <div style="margin-top: 30px;">
        <a href="${ctaLink}" style="background-color: #333; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-weight: bold;">${ctaText}</a>
      </div>
    </div>
  `;
}
