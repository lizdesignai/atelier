import { Resend } from 'resend';

export const STUDIO_VERONNA_FROM = 'Studio Veronna <sistema@lizdesign.com.br>';

const FAKE_DOMAINS = ['teste.com', 'example.com', 'atelier.local'];

export function isValidRealEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes('@') || !trimmed.includes('.')) return false;
  const domain = trimmed.split('@')[1];
  return Boolean(domain && !FAKE_DOMAINS.includes(domain));
}

export function formatAbsoluteUrl(link?: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    'https://atelier.lizdesign.com.br';
  if (!link) return baseUrl;
  if (link.startsWith('http://') || link.startsWith('https://')) {
    return link.replace('https://seu-dominio.com', baseUrl.replace(/\/$/, ''));
  }
  return `${baseUrl.replace(/\/$/, '')}/${link.replace(/^\//, '')}`;
}

export async function sendEmailSafely(
  resend: Resend,
  to: string | string[],
  subject: string,
  html: string,
  context: string
) {
  const recipients = (Array.isArray(to) ? to : [to])
    .map((e) => (typeof e === 'string' ? e.trim() : ''))
    .filter(isValidRealEmail);

  if (recipients.length === 0) {
    console.warn(`[Resend Warning] in ${context}: Nenhum destinatário válido (${JSON.stringify(to)}).`);
    return { data: null, error: null, skipped: true };
  }

  try {
    const result = await resend.emails.send({
      from: STUDIO_VERONNA_FROM,
      to: recipients,
      subject,
      html,
    });

    if (result.error) {
      console.error(`[Resend Error] in ${context}:`, result.error);
      throw new Error(result.error.message || 'Erro ao enviar e-mail via Resend.');
    }

    return result;
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
  ctaLink: string,
  badgeText: string = 'ATELIER'
) {
  const absoluteLink = formatAbsoluteUrl(ctaLink);
  const sanitizedContent =
    typeof content === 'string'
      ? content.replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g, '[Imagem Ocultada no E-mail]')
      : '';

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} — Studio Veronna</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #faf9f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #18181b;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #faf9f6; padding: 48px 20px;">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 28px; box-shadow: 0 16px 40px rgba(0,0,0,0.06); border: 1px solid #ebe8e2; overflow: hidden;">
              <tr>
                <td style="padding: 24px 32px 0; border-bottom: 1px solid #f4f2ee;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="left" style="padding-bottom: 16px;">
                        <span style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #a45037;">STUDIO VERONNA</span>
                      </td>
                      <td align="right" style="padding-bottom: 16px;">
                        <span style="font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #71717a; background-color: #f4f2ee; padding: 4px 10px; border-radius: 10px;">${badgeText}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 36px 32px 16px;">
                  <div style="display: inline-block; width: 60px; height: 60px; border-radius: 20px; background-color: #fdf5f2; border: 1px solid #f6ded5; font-size: 28px; line-height: 60px; text-align: center; margin-bottom: 18px;">
                    ${icon}
                  </div>
                  <h1 style="margin: 0; font-size: 21px; color: #18181b; font-weight: 700; letter-spacing: -0.4px; line-height: 1.3;">
                    ${title}
                  </h1>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 0 32px 28px;">
                  <div style="margin: 0; font-size: 14.5px; line-height: 1.65; color: #52525b; text-align: left;">
                    ${sanitizedContent}
                  </div>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 0 32px 36px;">
                  <a href="${absoluteLink}" style="display: inline-block; width: 100%; box-sizing: border-box; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 16px 24px; border-radius: 16px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; text-align: center; box-shadow: 0 4px 14px rgba(0,0,0,0.12);">
                    ${ctaText} &rarr;
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 20px 32px; background-color: #fcfbfa; border-top: 1px solid #f4f2ee;">
                  <p style="margin: 0; font-size: 11px; color: #a1a1aa; line-height: 1.5;">
                    Comunicação oficial da central de operações Atelier.<br/>
                    <strong style="color: #71717a;">Studio Veronna</strong> &bull; Design Estratégico &amp; Identidade
                  </p>
                </td>
              </tr>
            </table>
            <p style="margin-top: 24px; font-size: 11px; color: #a1a1aa;">
              Acesse a plataforma em <a href="https://atelier.lizdesign.com.br" style="color: #71717a; text-decoration: underline;">atelier.lizdesign.com.br</a>
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
