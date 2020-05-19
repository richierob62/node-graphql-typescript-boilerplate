import { ResolverMap } from '../../utils/server/resolver_types';
import { User } from '../../entity/User';
import { createForgotPasswordEmailLink } from '../../utils/auth/create_forgot_password_email_link';
import { formatYupError } from '../../utils/validation/format_yup_error';
import { lockAccountOnForgotPassword } from '../../utils/auth/lock_account_on_forgot_password';
import { passwordValidation } from '../../utils/validation/yup_schemas';

export const resolvers: ResolverMap = {
  Query: {
    dummy5: () => 'ignore',
  },
  Mutation: {
    sendForgotPasswordEmail: async (_, { email }, { redis }) => {
      const user = await User.findOne({ where: { email } });
      if (!user)
        return [
          {
            path: 'reset_password',
            message: 'Email not found',
          },
        ];

      await lockAccountOnForgotPassword(user.id, redis);

      const url = await createForgotPasswordEmailLink(
        process.env.FRONT_END_DOMAIN as string,
        user.id,
        redis
      );
      // @todo: send email here

      console.log(url);

      return null;
    },
    resetPassword: async (_, { newPassword, key }, { redis }) => {
      const userId = await redis.get(`p_reset:${key}`);

      if (!userId)
        return [
          {
            path: 'reset_password',
            message: 'password link has expired',
          },
        ];

      try {
        await passwordValidation.validate(
          { password: newPassword },
          {
            abortEarly: false,
          }
        );
      } catch (e) {
        return formatYupError(e);
      }

      await User.update(
        { id: parseInt(userId) },
        { account_locked: false, password: newPassword }
      );

      await redis.del(`p_reset:${key}`);

      return null;
    },
  },
};

// QueryBuilder
// https://typeorm.io/#/select-query-builder