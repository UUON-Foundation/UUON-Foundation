import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email()
});

export const BuyCreditSchema = z.object({
  user_id: z.string().uuid(),
  package_id: z.string().uuid()
});

export const TransferCreditsSchema = z.object({
  from_user_id: z.string().uuid(),
  to_user_id: z.string().uuid(),
  amount: z.number().int().positive()
});

export const UseCreditsSchema = z.object({
  user_id: z.string().uuid(),
  amount: z.number().int().positive(),
  description: z.string().optional()
});

export const PaginationSchema = z.object({
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0)
});
