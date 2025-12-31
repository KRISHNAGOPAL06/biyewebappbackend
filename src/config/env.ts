import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'postgresql://biye_db_user:lmjulKsI9BqkYk96990kqEk5vaYEufBX@dpg-d4iv1la4d50c73f1qti0-a/biye_db'),
  // DATABASE_URL: z.string().min(1, 'postgresql://postgres:postgres@localhost:5432/biye_db'),

  // REDIS_URL: z.string().min(1, 'redis://127.0.0.1:6379'),
  REDIS_URL: z.string().min(1, 'rediss://default:AaGLAAIncDIxMmU2YzVmNGVhMmE0OWY5OTAzMGMzNzAzYjFmOGRlOXAyNDEzNTU@wise-tadpole-41355.upstash.io:6379'),
  // REDIS_URL=""
  JWT_SECRET: z.string().min(32, '58038c80d42a960fe3618326f7ac0273'),
  JWT_REFRESH_SECRET: z.string().min(32, '6411c27a28bc57b0841348b5d21adb3c'),
  JWT_ACCESS_EXPIRY: z.string().default('15d'),
  JWT_REFRESH_EXPIRY: z.string().default('100d'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .default('')
    .transform(Number)
    .refine((val) => !Number.isNaN(val), {
      message: 'PORT must be a valid number',
    }),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
  ALLOWED_ORIGINS: z.string().transform((val) => val.split(',').map((origin) => origin.trim())),

  // UPLOAD_PROVIDER: z.enum(['s3', 'cloudinary']).default('s3'),
  // MAX_UPLOAD_BYTES: z.string().default('5242880').transform(Number),
  // ALLOWED_MIME_TYPES: z.string().default('image/jpeg,image/png,image/webp,image/avif').transform((val) => val.split(',').map((type) => type.trim())),
  // UPLOAD_URL_EXPIRY_SECONDS: z.string().default('300').transform(Number),

  // AWS_S3_BUCKET: z.string().optional(),
  // AWS_REGION: z.string().optional(),
  // AWS_ACCESS_KEY_ID: z.string().optional(),
  // AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // CLOUDINARY_CLOUD_NAME: z.string().optional(),
  // CLOUDINARY_API_KEY: z.string().optional(),
  // CLOUDINARY_API_SECRET: z.string().optional(),

  // MODERATION_SECRET: z.string().min(32).optional(),

  // Upload config
  UPLOAD_PROVIDER: z.enum(['local', 's3', 'cloudinary']).default('local'),
  MAX_UPLOAD_BYTES: z.coerce.number().default(5242880),
  ALLOWED_MIME_TYPES: z
    .string()
    .default('')
    .transform((v) => v.split(',')),
  UPLOAD_URL_EXPIRY_SECONDS: z.coerce.number().default(300),

  // AWS
  AWS_S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Moderation
  MODERATION_SECRET: z.string().min(32).optional(),

  // Search & Discovery
  MAX_QUERY_COST: z.coerce.number().default(30),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');
      throw new Error(`Environment validation failed:\n${missingVars}`);
    }
    throw error;
  }
}

export const env = validateEnv();
