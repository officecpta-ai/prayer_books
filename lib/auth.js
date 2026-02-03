/**
 * 從 request 取得身份（line_uid）
 * - Header: Authorization: Bearer <JWT> 或 Query/Body: code=<短碼>
 * - JWT payload 含 line_uid；短碼則查 Ragic 驗證碼表取得 line_uid 後回傳
 */

import { getSheet, getFieldId } from './ragic.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const VERIFICATION_SHEET = process.env.RAGIC_SHEET_VERIFICATION || '';

/**
 * 從 Vercel serverless 的 req 取得 line_uid
 * @param {object} req - Vercel 的 req（含 headers, query, body）
 * @returns {Promise<{ line_uid: string } | null>} 成功回傳 { line_uid }，否則 null
 */
export async function getIdentity(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (token) {
    try {
      const payload = await verifyJWT(token);
      if (payload?.line_uid) return { line_uid: payload.line_uid };
    } catch (_) {}
  }

  const code = req.query?.code || req.body?.code || (typeof req.body === 'object' ? req.body?.code : undefined);
  if (code && VERIFICATION_SHEET) {
    const lineUid = await getLineUidByCode(code);
    if (lineUid) return { line_uid: lineUid };
  }

  return null;
}

/**
 * 驗證 JWT（HS256）
 */
async function verifyJWT(token) {
  const { jose } = await import('jose');
  const secret = new TextEncoder().encode(JWT_SECRET);
  const { payload } = await jose.jwtVerify(token, secret);
  return payload;
}

/**
 * 用短碼查驗證碼表，取得 line_uid；若存在且未過期未使用則回傳 line_uid
 * 注意：不在此處標記已使用，由 verify/check API 負責標記
 */
async function getLineUidByCode(code) {
  const rows = await getSheet(VERIFICATION_SHEET);
  const codeFieldId = getFieldId('VERIFICATION', 'CODE') || 'code';
  const lineUidFieldId = getFieldId('VERIFICATION', 'LINE_UID') || 'line_uid';
  const usedFieldId = getFieldId('VERIFICATION', 'USED') || 'used';
  const expiresAtFieldId = getFieldId('VERIFICATION', 'EXPIRES_AT') || 'expires_at';
  const row = Array.isArray(rows) ? rows.find((r) => (r[codeFieldId] ?? r.code) === code) : null;
  if (!row) return null;
  const lineUid = row[lineUidFieldId] ?? row.line_uid;
  const used = row[usedFieldId] ?? row.used;
  const expiresAt = row[expiresAtFieldId] ?? row.expires_at;
  if (used) return null;
  if (expiresAt && new Date(expiresAt) < new Date()) return null;
  return lineUid || null;
}

/**
 * 簽發短期 JWT（含 line_uid），供 LIFF 或 GPTs 後續帶入
 */
export async function signJWT(payload, expiresIn = '1h') {
  const { jose } = await import('jose');
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresIn)
    .sign(secret);
}
