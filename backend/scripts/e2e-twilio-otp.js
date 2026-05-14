#!/usr/bin/env node
/**
 * Production-style E2E: Twilio SMS + HTTP auth + Postgres OTP state.
 *
 * Modes:
 *   A) Server already running — set E2E_API_BASE_URL (default http://127.0.0.1:5000).
 *      Server MUST be started with E2E_INCLUDE_TWILIO_SID=1 so responses include
 *      twilioMessageSid (OTP is never returned; script fetches message body via Twilio API).
 *   B) Spawn server — E2E_SPAWN_SERVER=1 (sets PORT from E2E_SERVER_PORT or 5997, injects E2E_INCLUDE_TWILIO_SID=1).
 *
 * Required env:
 *   POSTGRES_URI or DATABASE_URL (script loads Sequelize for DB snapshots)
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 *   E2E_TEST_PHONE — real E.164 that receives SMS (multiple messages in one run)
 *
 * Optional:
 *   E2E_NON_INTERACTIVE=1 — fail if Twilio SID not in register/send-otp responses (no stdin prompts)
 *   E2E_RUN_EXPENSIVE_SMS=1 + E2E_TEST_PHONE_2 — second handset for resend 429 ladder (3 SMS)
 *   E2E_SKIP_TWILIO_INVALID_PROBE=1 — skip direct Twilio +15005550001 probe
 *
 * Usage (from backend/):
 *   E2E_SPAWN_SERVER=1 E2E_NON_INTERACTIVE=1 E2E_TEST_PHONE=+1xxxxxxxxxx node scripts/e2e-twilio-otp.js
 */

'use strict';

const path = require('path');
const { spawn, spawnSync } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const axios = require('axios');
const twilio = require('twilio');
const jwt = require('jsonwebtoken');

const SPAWN_SERVER = ['1', 'true', 'yes'].includes(String(process.env.E2E_SPAWN_SERVER || '').toLowerCase());
const SERVER_PORT = Number(process.env.E2E_SERVER_PORT) || 5997;
let API_BASE = (process.env.E2E_API_BASE_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
const TEST_PHONE = process.env.E2E_TEST_PHONE ? String(process.env.E2E_TEST_PHONE).trim() : '';
const TEST_PHONE_2 = process.env.E2E_TEST_PHONE_2 ? String(process.env.E2E_TEST_PHONE_2).trim() : '';
const RUN_EXPENSIVE = ['1', 'true', 'yes'].includes(String(process.env.E2E_RUN_EXPENSIVE_SMS || '').toLowerCase());
const NON_INTERACTIVE = ['1', 'true', 'yes'].includes(String(process.env.E2E_NON_INTERACTIVE || '').toLowerCase());
const SKIP_INVALID_PROBE = ['1', 'true', 'yes'].includes(String(process.env.E2E_SKIP_TWILIO_INVALID_PROBE || '').toLowerCase());

const report = {
  startedAt: new Date().toISOString(),
  apiBase: API_BASE,
  steps: [],
  twilioFetchLog: [],
  twilioMessages: [],
  dbSnapshots: [],
  errors: [],
};

let serverChild = null;

function logStep(name, detail = {}) {
  report.steps.push({ t: new Date().toISOString(), name, ...detail });
  console.log(`\n[STEP] ${name}`, Object.keys(detail).length ? JSON.stringify(detail) : '');
}

function fail(msg) {
  report.errors.push(msg);
  console.error(`\n[FATAL] ${msg}`);
  printReport();
  cleanupServer();
  process.exit(1);
}

function printReport() {
  console.log('\n========== E2E REPORT (JSON) ==========');
  console.log(JSON.stringify(report, null, 2));
}

function cleanupServer() {
  if (serverChild && !serverChild.killed) {
    try {
      serverChild.kill('SIGTERM');
    } catch (_) {
      /* ignore */
    }
  }
}

async function spawnApiServer() {
  const backendRoot = path.join(__dirname, '..');
  const env = {
    ...process.env,
    PORT: String(SERVER_PORT),
    E2E_INCLUDE_TWILIO_SID: '1',
    HOST: process.env.HOST || '127.0.0.1',
  };
  if (['1', 'true', 'yes'].includes(String(process.env.E2E_MIRROR_SERVER_LOG || '').toLowerCase())) {
    env.AUTH_VERBOSE_ERRORS = '1';
  }
  logStep('spawn_server', { port: SERVER_PORT, cwd: backendRoot });
  serverChild = spawn(process.execPath, ['server.js'], {
    cwd: backendRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stderrChunks = [];
  serverChild.stderr.on('data', (d) => {
    const s = d.toString();
    stderrChunks.push(s);
    if (['1', 'true', 'yes'].includes(String(process.env.E2E_MIRROR_SERVER_LOG || '').toLowerCase())) {
      process.stderr.write(s);
    }
  });
  serverChild.stdout.on('data', (d) => {
    const s = d.toString();
    stderrChunks.push(s);
    if (['1', 'true', 'yes'].includes(String(process.env.E2E_MIRROR_SERVER_LOG || '').toLowerCase())) {
      process.stdout.write(s);
    }
  });
  for (let i = 0; i < 240; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      await axios.get(`http://127.0.0.1:${SERVER_PORT}/`, { timeout: 2000 });
      API_BASE = `http://127.0.0.1:${SERVER_PORT}`;
      report.apiBase = API_BASE;
      return;
    } catch (_) {
      /* retry */
    }
  }
  const tail = stderrChunks.join('').slice(-4000);
  try {
    serverChild.kill('SIGTERM');
  } catch (_) {
    /* ignore */
  }
  throw new Error(`Server did not become ready on port ${SERVER_PORT}. Log tail:\n${tail}`);
}

async function fetchUserRowByEmail(email) {
  const { sequelize } = require('../config/db');
  if (!sequelize) fail('POSTGRES_URI / DATABASE_URL not set — cannot validate DB state.');
  const [rows] = await sequelize.query(
    `SELECT id, email, "phoneNumber", "phoneVerified", "otpHash", "otpExpiresAt", "otpAttempts",
            "otpResendCount", "otpLastSentAt", "otpLockedUntil"
     FROM users WHERE email = :email LIMIT 1`,
    { replacements: { email } }
  );
  return rows[0] || null;
}

function sanitizeUserRow(row) {
  if (!row) return null;
  const h = row.otpHash;
  return {
    id: row.id,
    email: row.email,
    phoneNumber: row.phoneNumber,
    phoneVerified: row.phoneVerified,
    otpHashPresent: Boolean(h),
    otpHashPrefix: h ? `${String(h).slice(0, 12)}…(len=${String(h).length})` : null,
    otpExpiresAt: row.otpExpiresAt,
    otpAttempts: row.otpAttempts,
    otpResendCount: row.otpResendCount,
    otpLastSentAt: row.otpLastSentAt,
    otpLockedUntil: row.otpLockedUntil,
  };
}

function twilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) fail('TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN missing.');
  return twilio(sid, token);
}

/**
 * Fetches outbound message by SID until body contains a 6-digit OTP (Twilio may lag on body).
 */
async function fetchOtpFromMessageSid(messageSid, label) {
  const client = twilioClient();
  const log = { label, messageSid, attempts: [] };
  for (let i = 0; i < 20; i++) {
    const m = await client.messages(messageSid).fetch();
    const body = m.body || '';
    const six = body.match(/\b(\d{6})\b/);
    log.attempts.push({
      i,
      status: m.status,
      errorCode: m.errorCode,
      errorMessage: m.errorMessage,
      bodyLength: body.length,
      hasSixDigit: Boolean(six),
    });
    if (six) {
      log.resolvedOtpRedacted = '******';
      report.twilioFetchLog.push(log);
      return { otp: six[1], twilio: { sid: m.sid, status: m.status, errorCode: m.errorCode } };
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  report.twilioFetchLog.push(log);
  throw new Error(`No 6-digit code in Twilio message body for SID ${messageSid} (${label})`);
}

async function twilioRecentTo(phone) {
  const client = twilioClient();
  const list = await client.messages.list({ to: phone, limit: 8 });
  return Promise.all(
    list.map(async (m) => {
      try {
        const full = await client.messages(m.sid).fetch();
        return {
          sid: full.sid,
          status: full.status,
          direction: full.direction,
          dateSent: full.dateSent,
          errorCode: full.errorCode,
          errorMessage: full.errorMessage,
        };
      } catch (e) {
        return { sid: m.sid, status: m.status, fetchError: e.message };
      }
    })
  );
}

function testFailFastMissingTwilio() {
  logStep('fail_fast_missing_twilio_env');
  const res = spawnSync(
    process.execPath,
    ['-e', "process.env.TWILIO_ACCOUNT_SID='';require('../config/twilioEnv').assertTwilioConfigured();"],
    {
      cwd: __dirname,
      encoding: 'utf8',
      env: { ...process.env, TWILIO_ACCOUNT_SID: '' },
    }
  );
  const stderr = res.stderr || '';
  const ok = res.status === 1 && stderr.includes('Twilio configuration missing');
  if (!ok) {
    report.errors.push(`Expected exit 1 and stderr message; got status=${res.status} stderr=${stderr.slice(0, 200)}`);
  }
  report.steps.push({ name: 'fail_fast_result', exitCode: res.status, stderrTail: stderr.slice(-120) });
}

async function httpHealth() {
  logStep('api_health', { API_BASE });
  try {
    const { data, status } = await axios.get(`${API_BASE}/`, { timeout: 8000 });
    report.steps.push({ name: 'api_health_ok', status, snippet: String(data).slice(0, 80) });
  } catch (e) {
    fail(`API not reachable at ${API_BASE}: ${e.message}. Use E2E_SPAWN_SERVER=1 or start the server.`);
  }
}

function randomTag() {
  return `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

async function twilioInvalidNumberProbe() {
  if (SKIP_INVALID_PROBE) {
    report.twilioInvalidNumberProbe = { skipped: true };
    return;
  }
  logStep('twilio_magic_invalid_number (+15005550001)');
  const client = twilioClient();
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    report.twilioInvalidNumberProbe = { skipped: true };
    return;
  }
  try {
    await client.messages.create({
      from,
      to: '+15005550001',
      body: 'MedWaste E2E invalid-number probe',
    });
    report.errors.push('Twilio should reject magic invalid number +15005550001');
  } catch (e) {
    report.twilioInvalidNumberProbe = {
      code: e.code,
      status: e.status,
      message: e.message,
    };
  }
}

async function resolveOtp(httpJson, label) {
  const sid = httpJson?.twilioMessageSid;
  if (sid) {
    logStep('resolve_otp_via_twilio_fetch', { label, twilioMessageSid: sid, twilioMessageStatus: httpJson.twilioMessageStatus });
    const r = await fetchOtpFromMessageSid(sid, label);
    console.log(`[Twilio] ${label}: sid=${r.twilio.sid} status=${r.twilio.status} (OTP not printed)`);
    return r.otp;
  }
  if (NON_INTERACTIVE) {
    fail(
      'E2E_NON_INTERACTIVE=1 requires twilioMessageSid on API responses. Start API with E2E_INCLUDE_TWILIO_SID=1 (E2E_SPAWN_SERVER=1 sets this automatically).'
    );
  }
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans = await new Promise((resolve) => {
    rl.question(`\n>>> ${label}: enter 6-digit code from SMS: `, (a) => {
      rl.close();
      resolve(String(a || '').trim());
    });
  });
  if (!/^\d{6}$/.test(ans)) fail(`${label}: OTP must be 6 digits.`);
  return ans;
}

async function main() {
  console.log('MedWaste Twilio OTP E2E harness (HTTP + Twilio API + DB)');
  console.log(`SPAWN_SERVER=${SPAWN_SERVER} NON_INTERACTIVE=${NON_INTERACTIVE} RUN_EXPENSIVE_SMS=${RUN_EXPENSIVE}`);

  if (SPAWN_SERVER) {
    await spawnApiServer();
  }

  testFailFastMissingTwilio();
  await httpHealth();

  if (!/^\+[1-9]\d{7,14}$/.test(TEST_PHONE)) {
    fail('Set E2E_TEST_PHONE to a real E.164 number that can receive SMS.');
  }

  if (!NON_INTERACTIVE && !SPAWN_SERVER) {
    console.warn(
      '\n[WARN] For automated OTP extraction, use E2E_NON_INTERACTIVE=1 and start the API with E2E_INCLUDE_TWILIO_SID=1, or E2E_SPAWN_SERVER=1.\n'
    );
  }

  const tag = randomTag();
  const email = `e2e_otp_${tag}@example.test`;
  const username = `e2e_${tag}`.slice(0, 30);
  const password = 'e2ePass1a';
  const fullName = 'E2E Twilio';

  logStep('register_user', { email, username, phone: TEST_PHONE });
  const reg = await axios.post(
    `${API_BASE}/api/auth/register`,
    {
      fullName,
      username,
      email,
      phoneNumber: TEST_PHONE,
      password,
      role: 'personnel',
    },
    { timeout: 120000, validateStatus: () => true }
  );
  report.registerHttp = { status: reg.status, data: { ...reg.data, token: reg.data?.token ? '[redacted]' : undefined } };
  if (reg.status !== 201) {
    if (reg.status === 503) {
      fail(
        `POST /api/auth/register returned 503 (Twilio send failed after user rollback). Fix TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER. Body: ${JSON.stringify(reg.data)}`
      );
    }
    fail(`POST /api/auth/register expected 201, got ${reg.status}: ${JSON.stringify(reg.data)}`);
  }
  if (reg.data?.twilioMessageSid) {
    report.registerTwilioSid = reg.data.twilioMessageSid;
  }

  await new Promise((r) => setTimeout(r, 2000));
  logStep('twilio_list_messages_to_phone');
  try {
    const msgs = await twilioRecentTo(TEST_PHONE);
    report.twilioMessages = msgs;
    console.log('Twilio recent messages (to test phone, metadata only):');
    console.table(msgs);
  } catch (e) {
    report.errors.push(`Twilio list/fetch failed: ${e.message}`);
    console.error('[WARN] Twilio list:', e.message);
  }

  await twilioInvalidNumberProbe();

  let row = sanitizeUserRow(await fetchUserRowByEmail(email));
  report.dbSnapshots.push({ phase: 'after_register', row });
  logStep('db_after_register', row);
  if (!row?.otpHashPresent) fail('DB: otpHash missing after register (must be bcrypt hash, not plaintext).');
  if (row.phoneVerified !== false) fail('DB: phoneVerified must be false before verify.');
  if (!row.otpExpiresAt) fail('DB: otpExpiresAt missing.');

  logStep('verify_wrong_otp');
  const wrong = await axios.post(
    `${API_BASE}/api/auth/verify-otp`,
    { email, code: '000000' },
    { timeout: 15000, validateStatus: () => true }
  );
  report.wrongOtpHttp = { status: wrong.status, body: wrong.data };
  if (wrong.status !== 401) {
    fail(`Wrong OTP expected 401, got ${wrong.status}: ${JSON.stringify(wrong.data)}`);
  }
  row = sanitizeUserRow(await fetchUserRowByEmail(email));
  report.dbSnapshots.push({ phase: 'after_wrong_otp', row });
  if ((row.otpAttempts || 0) < 1) {
    fail(`DB: otpAttempts should increment after wrong code; got ${row.otpAttempts}`);
  }

  const otp1 = await resolveOtp(reg.data, 'SMS #1 (registration)');

  logStep('expire_otp_in_db');
  const { sequelize } = require('../config/db');
  await sequelize.query(`UPDATE users SET "otpExpiresAt" = :past WHERE email = :email`, {
    replacements: { past: new Date(Date.now() - 120000), email },
  });

  logStep('verify_expired_otp');
  const exp = await axios.post(
    `${API_BASE}/api/auth/verify-otp`,
    { email, code: otp1 },
    { timeout: 15000, validateStatus: () => true }
  );
  report.expiredOtpHttp = { status: exp.status, body: exp.data };
  if (exp.status !== 400 || !String(exp.data?.error || '').toLowerCase().includes('expired')) {
    fail(`Expired OTP expected 400 + expired message; got ${exp.status} ${JSON.stringify(exp.data)}`);
  }

  logStep('send_otp_refresh');
  const snd = await axios.post(`${API_BASE}/api/auth/send-otp`, { email }, { timeout: 120000, validateStatus: () => true });
  report.sendOtpHttp = { status: snd.status, data: { ...snd.data, token: undefined } };
  if (snd.status !== 200) {
    fail(`send-otp after expire expected 200, got ${snd.status}: ${JSON.stringify(snd.data)}`);
  }

  await new Promise((r) => setTimeout(r, 2000));
  try {
    report.twilioMessagesAfterResend = await twilioRecentTo(TEST_PHONE);
    console.log('Twilio messages after send-otp:');
    console.table(report.twilioMessagesAfterResend);
  } catch (e) {
    report.errors.push(`Twilio list after resend: ${e.message}`);
  }

  const otp2 = await resolveOtp(snd.data, 'SMS #2 (send-otp)');

  logStep('verify_correct_otp');
  const ok = await axios.post(
    `${API_BASE}/api/auth/verify-otp`,
    { email, code: otp2 },
    { timeout: 15000, validateStatus: () => true }
  );
  report.verifySuccessHttp = { status: ok.status, hasToken: Boolean(ok.data?.token) };
  if (ok.status !== 200 || !ok.data?.token) {
    fail(`Verify success expected 200 + token; got ${ok.status}: ${JSON.stringify(ok.data)}`);
  }
  try {
    report.jwtPayload = jwt.decode(ok.data.token);
  } catch {
    report.jwtPayload = null;
  }

  row = sanitizeUserRow(await fetchUserRowByEmail(email));
  report.dbSnapshots.push({ phase: 'after_success_verify', row });
  if (!row.phoneVerified) {
    fail('DB: phoneVerified must be true after verify (isPhoneVerified in spec).');
  }
  if (row.otpHashPresent) fail('DB: otpHash must be cleared after verify.');
  if ((row.otpAttempts || 0) !== 0) {
    report.errors.push(`Expected otpAttempts reset to 0 after success; got ${row.otpAttempts}`);
  }

  logStep('login_after_verify');
  const loginRes = await axios.post(
    `${API_BASE}/api/auth/login`,
    { email, password },
    { timeout: 15000, validateStatus: () => true }
  );
  report.loginHttp = { status: loginRes.status, hasToken: Boolean(loginRes.data?.token) };
  if (loginRes.status !== 200 || !loginRes.data?.token) {
    fail(`Login expected 200 + token; got ${loginRes.status}: ${JSON.stringify(loginRes.data)}`);
  }

  logStep('invalid_phone_register (non-E164)');
  const bad = await axios.post(
    `${API_BASE}/api/auth/register`,
    {
      fullName,
      username: `badph_${tag}`.slice(0, 30),
      email: `bad_${tag}@example.test`,
      phoneNumber: 'not-e164',
      password,
    },
    { validateStatus: () => true }
  );
  report.invalidPhoneRegisterStatus = bad.status;
  if (bad.status !== 400) {
    report.errors.push(`Invalid phone expected 400; got ${bad.status}`);
  }

  logStep('twilio_reject_register (+15005550001 magic invalid)');
  const magic = await axios.post(
    `${API_BASE}/api/auth/register`,
    {
      fullName,
      username: `magic_${tag}`.slice(0, 30),
      email: `magic_${tag}@example.test`,
      phoneNumber: '+15005550001',
      password,
      role: 'personnel',
    },
    { timeout: 120000, validateStatus: () => true }
  );
  report.magicInvalidRegister = { status: magic.status, data: magic.data };
  if (magic.status !== 503 && magic.status !== 400) {
    report.errors.push(`Magic invalid Twilio number: expected 503 (SMS fail) or 400; got ${magic.status}`);
  }

  if (RUN_EXPENSIVE) {
    logStep('resend_rate_limit_429 (E2E_RUN_EXPENSIVE_SMS)');
    if (!/^\+[1-9]\d{7,14}$/.test(TEST_PHONE_2)) {
      report.errors.push('E2E_RUN_EXPENSIVE_SMS=1 requires E2E_TEST_PHONE_2 (+E.164).');
    } else {
      const tag3 = randomTag();
      const email3 = `e2e_rs_${tag3}@example.test`;
      const username3 = `e2ers_${tag3}`.slice(0, 30);
      const reg3 = await axios.post(
        `${API_BASE}/api/auth/register`,
        {
          fullName: 'E2E Resend',
          username: username3,
          email: email3,
          phoneNumber: TEST_PHONE_2,
          password,
          role: 'personnel',
        },
        { timeout: 120000, validateStatus: () => true }
      );
      if (reg3.status !== 201) {
        report.errors.push(`Resend ladder register failed: ${reg3.status} ${JSON.stringify(reg3.data)}`);
      } else {
        const s1 = await axios.post(`${API_BASE}/api/auth/send-otp`, { email: email3 }, { validateStatus: () => true });
        const s2 = await axios.post(`${API_BASE}/api/auth/send-otp`, { email: email3 }, { validateStatus: () => true });
        const s3 = await axios.post(`${API_BASE}/api/auth/send-otp`, { email: email3 }, { validateStatus: () => true });
        report.resendSequence = [
          { status: s1.status, twilioSid: s1.data?.twilioMessageSid },
          { status: s2.status, twilioSid: s2.data?.twilioMessageSid },
          { status: s3.status, body: s3.data },
        ];
        if (s3.status !== 429) {
          report.errors.push(`Expected 429 on 3rd send-otp; got ${s3.status} ${JSON.stringify(s3.data)}`);
        }
      }
    }
  } else {
    report.steps.push({
      name: 'skip_resend_spam_ladder',
      reason: 'Set E2E_RUN_EXPENSIVE_SMS=1 and E2E_TEST_PHONE_2 to run (sends 3 extra SMS).',
    });
  }

  logStep('done');
  if (report.errors.length) {
    console.error('\n[E2E] Completed with failures (report.errors).');
    printReport();
    cleanupServer();
    process.exit(2);
  }
  console.log('\n[E2E] All checks passed. JSON report includes Twilio SIDs, fetch attempts, and DB snapshots (no OTP values).');
  printReport();
  cleanupServer();
}

main().catch((e) => {
  report.errors.push(e.stack || e.message);
  printReport();
  cleanupServer();
  process.exit(1);
});
