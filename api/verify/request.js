/**
 * POST /api/verify/request
 * Body: { id_token: string }（Line LIFF 取得的 id_token）
 * 驗證 Line 登入 → 查訂閱者有效 → 產生 4 碼短碼 → 寫入驗證碼表 → 回傳 { code }
 */

import { verifyLineIdToken } from '../../lib/line.js';
import { getSheet, createRecord, toRagicRecord } from '../../lib/ragic.js';

const SUBSCRIBERS_SHEET = process.env.RAGIC_SHEET_SUBSCRIBERS || '';
const VERIFICATION_SHEET = process.env.RAGIC_SHEET_VERIFICATION || '';

function random4Code() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'object' ? req.body : {};
    const idToken = body.id_token || body.idToken;
    if (!idToken) {
      return res.status(400).json({ error: 'id_token required' });
    }

    const payload = await verifyLineIdToken(idToken);
    const lineUid = payload.sub;

    if (SUBSCRIBERS_SHEET) {
      const rows = await getSheet(SUBSCRIBERS_SHEET);
      const found = Array.isArray(rows) && rows.some((r) => (r.line_uid || r[process.env.RAGIC_FIELD_SUBSCRIBERS_LINE_UID]) === lineUid);
      if (!found) {
        return res.status(403).json({ error: 'not_subscriber', message: '尚未成為訂閱者或用戶' });
      }
    }

    const code = random4Code();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const record = toRagicRecord('VERIFICATION', {
      code,
      line_uid: lineUid,
      expires_at: expiresAt,
      used: false,
    });
    if (Object.keys(record).length === 0) {
      record.code = code;
      record.line_uid = lineUid;
      record.expires_at = expiresAt;
      record.used = false;
    }
    await createRecord(VERIFICATION_SHEET, record);

    return res.status(200).json({ code });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error', message: e.message });
  }
}
