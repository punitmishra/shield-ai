/**
 * Shield AI Mock API Server
 * For testing mobile app without the full Rust backend
 */

const http = require('http');

const PORT = 8080;

// Mock data
const mockUser = {
  id: 'user-123',
  email: 'test@shieldai.dev',
  tier: 'pro',
  email_verified: true,
  created_at: new Date().toISOString(),
};

const mockStats = {
  total_queries: 15420,
  blocked_queries: 1847,
  cache_hits: 12500,
  cache_misses: 2920,
  cache_hit_rate: 0.81,
  block_rate: 0.12,
  avg_response_time_ms: 0.8,
  uptime_seconds: 86400,
};

const mockProfiles = [
  {
    id: 'profile-1',
    name: 'Dad',
    avatar: '👨',
    type: 'adult',
    devices: 2,
    settings: { safeSearch: false, adultContentFilter: false },
  },
  {
    id: 'profile-2',
    name: 'Mom',
    avatar: '👩',
    type: 'adult',
    devices: 1,
    settings: { safeSearch: false, adultContentFilter: false },
  },
  {
    id: 'profile-3',
    name: 'Alex',
    avatar: '👦',
    type: 'child',
    devices: 1,
    settings: {
      safeSearch: true,
      adultContentFilter: true,
      gamblingFilter: true,
      socialMediaFilter: true,
      gamingFilter: false,
      screenTimeLimit: 120,
      bedtime: { start: '21:00', end: '07:00' },
    },
  },
];

const mockQueryHistory = Array.from({ length: 20 }, (_, i) => ({
  id: `query-${i}`,
  domain: ['google.com', 'facebook.com', 'ads.tracker.com', 'malware.bad.com', 'example.com'][i % 5],
  type: 'A',
  status: i % 4 === 0 ? 'blocked' : 'allowed',
  category: i % 4 === 0 ? ['Ads', 'Trackers', 'Malware'][i % 3] : null,
  latency: Math.floor(Math.random() * 10) + 1,
  timestamp: new Date(Date.now() - i * 60000).toISOString(),
}));

const mockTrackerCategories = [
  { name: 'Ads', count: 523 },
  { name: 'Trackers', count: 412 },
  { name: 'Malware', count: 89 },
  { name: 'Phishing', count: 23 },
];

// JWT mock
let accessToken = 'mock-access-token-' + Date.now();
let refreshToken = 'mock-refresh-token-' + Date.now();

const routes = {
  'GET /health': () => ({ status: 'healthy', version: '1.0.0' }),
  'GET /api/stats': () => mockStats,
  'GET /api/history': () => mockQueryHistory,
  'GET /api/profiles': () => mockProfiles,
  'GET /api/analytics': () => ({
    totalQueries: mockStats.total_queries,
    blockedQueries: mockStats.blocked_queries,
    cacheHitRate: mockStats.cache_hit_rate,
    blockRate: mockStats.block_rate,
    topBlockedDomains: [
      { domain: 'ads.tracker.com', count: 234 },
      { domain: 'analytics.evil.com', count: 189 },
      { domain: 'malware.bad.com', count: 89 },
    ],
  }),
  'GET /api/tracker-categories': () => mockTrackerCategories,
  'GET /api/auth/me': () => mockUser,
  'POST /api/auth/login': (body) => {
    if (body.email && body.password) {
      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        token_type: 'Bearer',
        user: mockUser,
      };
    }
    return { error: 'Invalid credentials' };
  },
  'POST /api/auth/register': (body) => {
    if (body.email && body.password) {
      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        token_type: 'Bearer',
        user: { ...mockUser, email: body.email },
      };
    }
    return { error: 'Invalid data' };
  },
  'POST /api/auth/refresh': () => ({
    access_token: 'mock-access-token-' + Date.now(),
    expires_in: 3600,
    token_type: 'Bearer',
  }),
  'POST /api/auth/logout': () => ({ success: true }),
  'GET /api/devices': () => [
    { device_id: 'device-1', device_name: 'iPhone 15 Pro', platform: 'ios', last_seen: new Date().toISOString() },
  ],
  'POST /api/auth/devices/register': () => ({
    device_id: 'device-' + Date.now(),
    registered: true,
  }),
};

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const routeKey = `${req.method} ${req.url.split('?')[0]}`;
  console.log(`[${new Date().toISOString()}] ${routeKey}`);

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const handler = routes[routeKey];

    if (handler) {
      try {
        const parsedBody = body ? JSON.parse(body) : {};
        const result = handler(parsedBody);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    } else {
      // Default 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found', path: req.url }));
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🛡️  Shield AI Mock Server running on http://localhost:${PORT}`);
  console.log(`\nAvailable endpoints:`);
  Object.keys(routes).forEach(route => console.log(`  ${route}`));
  console.log(`\nPress Ctrl+C to stop\n`);
});
