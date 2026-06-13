import { describe, expect, it } from 'vitest';
import { apiCorsHeaders } from '../server/cors';

describe('api CORS', () => {
  it('allows the packaged Electron app origin', () => {
    expect(apiCorsHeaders('app://worldofclaudecraft')).toMatchObject({
      'Access-Control-Allow-Origin': 'app://worldofclaudecraft',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
  });

  it('allows hosted web origins used by desktop online builds', () => {
    expect(apiCorsHeaders('https://dev.worldofclaudecraft.com')['Access-Control-Allow-Origin']).toBe('https://dev.worldofclaudecraft.com');
    expect(apiCorsHeaders('https://worldofclaudecraft.com')['Access-Control-Allow-Origin']).toBe('https://worldofclaudecraft.com');
  });

  it('allows local Vite origins for Electron dev testing', () => {
    expect(apiCorsHeaders('http://127.0.0.1:5173')['Access-Control-Allow-Origin']).toBe('http://127.0.0.1:5173');
    expect(apiCorsHeaders('http://localhost:5173')['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
  });

  it('does not allow arbitrary web origins', () => {
    expect(apiCorsHeaders('https://evil.example')).toEqual({});
  });
});
