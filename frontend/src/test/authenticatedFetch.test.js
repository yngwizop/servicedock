import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authenticatedFetch, clearAuthSession, setAuthSession } from '../utils/auth';

describe('authenticatedFetch (single-flight refresh)', () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    setAuthSession();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = realFetch;
    clearAuthSession();
    vi.restoreAllMocks();
  });

  it('only calls /api/refresh once for parallel 401s', async () => {
    let refreshResolve;
    const refreshPromise = new Promise((resolve) => {
      refreshResolve = resolve;
    });

    global.fetch
      // first request -> 401
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      // second request -> 401
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      // refresh (in-flight, shared)
      .mockImplementationOnce(() => refreshPromise)
      // retry #1 -> 200
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: 1 }), { status: 200 }))
      // retry #2 -> 200
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: 2 }), { status: 200 }));

    const p1 = authenticatedFetch('/api/needs-auth');
    const p2 = authenticatedFetch('/api/needs-auth');

    refreshResolve(new Response(null, { status: 200 }));

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);

    const refreshCalls = global.fetch.mock.calls.filter(([u]) => u === '/api/refresh');
    expect(refreshCalls.length).toBe(1);
  });
});

