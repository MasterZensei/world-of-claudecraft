const DEFAULT_ALLOWED_ORIGINS = [
  'app://worldofclaudecraft',
  'https://worldofclaudecraft.com',
  'https://dev.worldofclaudecraft.com',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
];

function configuredOrigins(): string[] {
  return (process.env.ALLOWED_CLIENT_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function apiCorsHeaders(origin: string | undefined): Record<string, string> {
  if (!origin || !configuredOrigins().includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}
