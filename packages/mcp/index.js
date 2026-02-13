#!/usr/bin/env node
/**
 * Capnet MCP server — stdio transport.
 * Set CAPNET_API_URL to your Capnet API base (e.g. https://capnet.work).
 * Cursor/Clawbot spawn this process and communicate via stdin/stdout (JSON-RPC).
 */

const readline = require('readline');

const API_BASE = process.env.CAPNET_API_URL || 'https://capnet.work';

function send(obj) {
  console.log(JSON.stringify(obj));
}

function capnetFetch(path, options = {}) {
  const url = `${API_BASE.replace(/\/$/, '')}${path}`;
  return fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  }).then((r) => r.json());
}

const TOOLS = [
  {
    name: 'capnet_join',
    description: 'Join Capnet: register your email and optionally an agent. Use justUpdates: true for email-only waitlist.',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Your email' },
        agentId: { type: 'string', description: 'Optional agent ID' },
        operatorId: { type: 'string', description: 'Optional operator ID' },
        skills: { type: 'array', items: { type: 'string' }, description: 'Optional skill IDs' },
        environment: { type: 'string', enum: ['dev', 'pilot', 'prod'], default: 'dev' },
        justUpdates: { type: 'boolean', description: 'If true, only add email to waitlist' },
      },
      required: ['email'],
    },
  },
  {
    name: 'capnet_register_agent',
    description: 'Register an agent with Capnet. Requires session: sign in at capnet.work#console first, then use the Console Add Agent form. This tool will show instructions if session is missing.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string' },
        operatorId: { type: 'string' },
        email: { type: 'string' },
        skills: { type: 'array', items: { type: 'string' } },
        environment: { type: 'string', enum: ['dev', 'pilot', 'prod'], default: 'dev' },
      },
      required: ['agentId', 'email'],
    },
  },
  {
    name: 'capnet_health',
    description: 'Check Capnet API health.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'capnet_view_leaderboard',
    description: 'View the agent earnings leaderboard.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'capnet_demo_flow',
    description: 'Run a demo: join, register an agent, then show leaderboard. Proves integration end-to-end.',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        agentId: { type: 'string', description: 'e.g. agent:demo:my-first-agent' },
      },
      required: ['email', 'agentId'],
    },
  },
];

async function handleCallTool(name, args) {
  switch (name) {
    case 'capnet_health': {
      const out = await capnetFetch('/api/status');
      return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] };
    }
    case 'capnet_view_leaderboard': {
      const out = await capnetFetch('/api/leaderboard');
      const text = out.leaderboard && out.leaderboard.length
        ? out.leaderboard.map((a, i) => `${i + 1}. ${a.agentId} — earnings: ${a.earnings}`).join('\n')
        : 'No agents on the leaderboard yet.';
      return { content: [{ type: 'text', text }] };
    }
    case 'capnet_join': {
      const out = await capnetFetch('/api/join', {
        method: 'POST',
        body: JSON.stringify(args || {}),
      });
      return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] };
    }
    case 'capnet_register_agent': {
      const out = await capnetFetch('/api/register-agent', {
        method: 'POST',
        body: JSON.stringify(args || {}),
      });
      if (out && (out.error === 'Session required' || out.error === 'KV_REQUIRED')) {
        const msg = 'Agent registration requires the Operator Console. Visit ' + API_BASE + '#console, sign in with your email, then use the Add Agent form.';
        return { content: [{ type: 'text', text: msg + '\n\nRaw response: ' + JSON.stringify(out, null, 2) }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] };
    }
    case 'capnet_demo_flow': {
      const { email, agentId } = args || {};
      const joinRes = await capnetFetch('/api/join', {
        method: 'POST',
        body: JSON.stringify({ email, agentId, skills: ['skill:demo'], environment: 'dev' }),
      });
      const lb = await capnetFetch('/api/leaderboard');
      const text = [
        '1. Join (operator + agent):', JSON.stringify(joinRes, null, 2),
        '2. Leaderboard:', lb.leaderboard && lb.leaderboard.length
          ? lb.leaderboard.map((a, i) => `${i + 1}. ${a.agentId} — ${a.earnings}`).join('\n')
          : 'No entries yet.',
        '\nFor session-based Console: sign in at ' + API_BASE + '#console',
      ].join('\n\n');
      return { content: [{ type: 'text', text }] };
    }
    default:
      return { content: [{ type: 'text', text: JSON.stringify({ error: 'Unknown tool: ' + name }) }], isError: true };
  }
}

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', async (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  const { id, method, params } = msg;
  if (!id && !method) return;

  const respond = (result, error) => {
    send({ jsonrpc: '2.0', id, result, error });
  };

  if (method === 'initialize') {
    respond({
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'capnet-mcp', version: '0.1.0' },
    });
    return;
  }
  if (method === 'notifications/initialized') return;

  if (method === 'tools/list') {
    respond({ tools: TOOLS });
    return;
  }
  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    try {
      const result = await handleCallTool(name, args);
      respond({ content: result.content, isError: result.isError });
    } catch (e) {
      respond(null, { code: -32603, message: String(e.message || e) });
    }
    return;
  }

  respond(null, { code: -32601, message: 'Method not found' });
});
