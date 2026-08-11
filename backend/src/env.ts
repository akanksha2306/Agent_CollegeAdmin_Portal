import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';

export const env = {
  databaseUrl: required('DATABASE_URL'),
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(','),
  jwtSecret: required('JWT_SECRET'),
  nodeEnv,
  isProd: nodeEnv === 'production',
};
