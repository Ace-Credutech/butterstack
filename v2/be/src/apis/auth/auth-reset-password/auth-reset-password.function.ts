import { Transaction, Op } from 'sequelize';
import { createHash } from 'crypto';
import { Error_Interface } from '@config/interfaces/error.interface';
import { User } from '@models/user.model';
import { PasswordResetToken } from '@models/password-reset-token.model';
import { kc_set_password } from '@setup/keycloak-rest';
import { auth_reset_password_function_params, auth_reset_password_function_return } from './auth-reset-password.interface';

const hash_token = (raw: string): string => createHash('sha256').update(raw).digest('hex');

const find_active_token = (hash: string, transaction: Transaction) => PasswordResetToken.findOne({
  where: { token_hash: hash, used_at: null, expires_at: { [Op.gt]: new Date() } } as any,
  transaction,
});

const mark_token_used = async (token: PasswordResetToken, transaction: Transaction): Promise<void> => {
  await token.update({ used_at: new Date() }, { transaction });
};

const auth_reset_password_function = async (data: auth_reset_password_function_params, transaction: Transaction): Promise<auth_reset_password_function_return | Error_Interface> => {
  const hash  = hash_token(data.token);
  const token = await find_active_token(hash, transaction);
  if (!token) return { code: 400, message: 'Reset link is invalid or has expired. Please request a new one.' };

  const user  = await User.findByPk(token.user_id, { transaction });
  if (!user || !user.is_active) return { code: 400, message: 'Account is unavailable.' };

  await kc_set_password(user.keycloak_sub, data.new_password);
  await mark_token_used(token, transaction);

  return { code: 200, message: 'Password reset successful. You can now sign in.', data: { ok: true } };
};

export default auth_reset_password_function;
