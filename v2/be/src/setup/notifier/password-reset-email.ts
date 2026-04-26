import { send_email } from './email';
import { env } from '@src/env';

export const send_password_reset_email = async (to: string, name: string | undefined, reset_link: string): Promise<void> => {
  const display = name?.trim() || to.split('@')[0];
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; color: #0f172a; max-width: 480px; margin: auto;">
      <div style="display: flex; align-items: center; gap: 8px; padding: 24px 0;">
        <div style="width: 28px; height: 28px; background: #16a34a; border-radius: 8px;"></div>
        <strong style="font-size: 14px;">butterstack</strong>
      </div>
      <h1 style="font-size: 22px; line-height: 1.3; margin: 0 0 12px 0;">Reset your password</h1>
      <p style="font-size: 14px; color: #475569; margin: 0 0 16px 0;">Hi ${display}, we received a request to reset your Butterstack password. Click the button below to set a new one. This link expires in ${env.PASSWORD_RESET_TTL_MIN} minutes.</p>
      <p style="margin: 24px 0;">
        <a href="${reset_link}" style="display: inline-block; padding: 10px 18px; background: #16a34a; color: #fff; font-weight: 600; text-decoration: none; border-radius: 8px;">Reset password</a>
      </p>
      <p style="font-size: 12px; color: #94a3b8; margin: 0 0 8px 0;">Or paste this URL into your browser:</p>
      <p style="font-size: 12px; color: #475569; word-break: break-all; margin: 0 0 24px 0;">${reset_link}</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;
  const text = `Reset your password\n\nHi ${display}, we received a request to reset your Butterstack password.\n\nReset link (expires in ${env.PASSWORD_RESET_TTL_MIN} minutes):\n${reset_link}\n\nIf you didn't request this, ignore this email.`;
  await send_email({ to, to_name: display, subject: 'Reset your Butterstack password', html, text });
};
