/**
 * POST /api/verify/check
 * Body: { code: string }（使用者貼上的短碼）
 * 查驗證碼表：存在、未過期、未使用 → 標記已使用 → 回傳 { verified: true }
 */

import { getSheet, updateRecord, getFieldId } from '../../lib/ragic.js';

const VERIFICATION_SHEET = process.env.RAGIC_SHEET_VERIFICATION || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'object' ? req.body : {};
    const code = (body.code || '').toString().trim();
    if (!code) {
      return res.status(200).json({ verified: false, message: '請輸入驗證碼' });
    }

    const rows = await getSheet(VERIFICATION_SHEET);
    const codeFieldId = getFieldId('VERIFICATION', 'CODE') || 'code';
    const usedFieldId = getFieldId('VERIFICATION', 'USED') || 'used';
    const expiresAtFieldId = getFieldId('VERIFICATION', 'EXPIRES_AT') || 'expires_at';
    const row = Array.isArray(rows) ? rows.find((r) => (r[codeFieldId] ?? r.code) === code) : null;
    if (!row) {
      return res.status(200).json({ verified: false, message: '驗證碼無效' });
    }

    const rowId = row._id ?? row.id ?? row['--id'];
    const used = row[usedFieldId] ?? row.used;
    const expiresAt = row[expiresAtFieldId] ?? row.expires_at;
    if (used) {
      return res.status(200).json({ verified: false, message: '驗證碼已使用過' });
    }
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return res.status(200).json({ verified: false, message: '驗證碼已過期' });
    }

    if (rowId != null) {
      const updatePayload = usedFieldId ? { [usedFieldId]: true } : { used: true };
      await updateRecord(VERIFICATION_SHEET, rowId, updatePayload);
    }

    return res.status(200).json({ verified: true, message: '驗證成功' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ verified: false, message: '伺服器錯誤' });
  }
}
