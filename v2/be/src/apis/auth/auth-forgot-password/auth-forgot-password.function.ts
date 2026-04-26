import { Transaction, Op } from 'sequelize';
import { randomBytes, createHash } from 'crypto';
import { Error_Interface } from '@config/interfaces/error.interface';
import { User } from '@models/user.model';
import { PasswordResetToken } from '@models/password-reset-token.model';
import { send_password_reset_email } from '@setup/notifier/password-reset-email';
import { env } from '@src/env';
import { log } from '@setup/log';
import { auth_forgot_password_function_params, auth_forgot_password_function_return } from './auth-forgot-password.interface';

const generic_response = (): auth_forgot_password_function_return => ({
  code:    200,
  message: 'If an account exists with that email, a reset link has been sent.',
  data:    { ok: true },
});

const generate_token = (): { raw: string; hash: string } => {
  const raw  = randomBytes(32).toString('base64url');
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
};

const expiry_date = (): Date => new Date(Date.now() + env.PASSWORD_RESET_TTL_MIN * 60_000);

const invalidate_existing_tokens = async (user_id: string, transaction: Transaction): Promise<void> => {
  await PasswordResetToken.update(
    { used_at: new Date() } as any,
    { where: { user_id, used_at: null, expires_at: { [Op.gt]: new Date() } } as any, transaction },
  );
};

const persist_token = async (user_id: string, hash: string, transaction: Transaction): Promise<void> => {
  await PasswordResetToken.create({
    user_id,
    token_hash: hash,
    expires_at: expiry_date(),
    used_at:    null,
  } as any, { transaction });
};

const build_reset_link = (raw: string): string => `${env.APP_URL.replace(/\/$/, '')}/reset-password?token=${raw}`;

const auth_forgot_password_function = async (data: auth_forgot_password_function_params, transaction: Transaction): Promise<auth_forgot_password_function_return | Error_Interface> => {
  const user = await User.findOne({ where: { email: data.email } as any, transaction });
  if (!user || !user.is_active) return generic_response();

  await invalidate_existing_tokens(user.id, transaction);
  const { raw, hash } = generate_token();
  await persist_token(user.id, hash, transaction);
  const link = build_reset_link(raw);

  try { await send_password_reset_email(user.email, user.name, link); }
  catch (e: any) { log.warn('password_reset.email_send_failed', { user_id: user.id, error: String(e?.message ?? e) }); }

  return generic_response();
};

export default auth_forgot_password_function;
