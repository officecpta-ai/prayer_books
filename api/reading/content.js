/**
 * GET /api/reading/content?book_id=&day=
 * 需身份。先查購買紀錄（line_uid + 書索引）；未買則回傳 allowed: false + purchase_link；已買則自禱告手冊內容取該段完整內容回傳 allowed: true + content
 */

import { getIdentity } from '../../lib/auth.js';
import { getSheet, getFieldId } from '../../lib/ragic.js';

const PURCHASES_SHEET = process.env.RAGIC_SHEET_PURCHASES || '';
const CONTENT_SHEET = process.env.RAGIC_SHEET_CONTENT || '';
const BOOKS_SHEET = process.env.RAGIC_SHEET_BOOKS || '';
const BUY_BASE = process.env.NEXT_PUBLIC_BUY_BASE || '';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const identity = await getIdentity(req);
  if (!identity) {
    return res.status(401).json({ allowed: false, message: '請先完成驗證' });
  }

  const bookId = req.query?.book_id || req.query?.bookId;
  const day = req.query?.day != null ? String(req.query.day) : '';
  if (!bookId || day === '') {
    return res.status(400).json({ error: 'book_id and day required' });
  }

  try {
    const purchases = await getSheet(PURCHASES_SHEET);
    const bookIdKey = getFieldId('PURCHASES', '書索引') || '書索引';
    const statusKey = getFieldId('PURCHASES', 'STATUS') || 'status';
    const lineUidKey = process.env.RAGIC_FIELD_PURCHASES_LINE_UID || 'line_uid';
    const hasPurchase = Array.isArray(purchases) && purchases.some(
      (r) => (r[lineUidKey] ?? r.line_uid) === identity.line_uid && (r[bookIdKey] ?? r.書索引) === bookId && (r[statusKey] ?? r.status) === 'active'
    );
    if (!hasPurchase) {
      const purchaseLink = BUY_BASE ? `${BUY_BASE}?book_id=${encodeURIComponent(bookId)}` : '';
      return res.status(200).json({ allowed: false, message: '您尚未購買本書', purchase_link: purchaseLink });
    }

    const contents = await getSheet(CONTENT_SHEET);
    const contentBookIdKey = getFieldId('CONTENT', '書索引') || '書索引';
    const dayKey = getFieldId('CONTENT', '天數') || '天數';
    const contentKey = getFieldId('CONTENT', '內容') || '內容';
    const row = Array.isArray(contents) ? contents.find(
      (r) => (r[contentBookIdKey] ?? r.書索引) === bookId && (String(r[dayKey] ?? r.天數) === day || r[dayKey] === Number(day))
    ) : null;
    if (!row) {
      return res.status(404).json({ allowed: true, content: null, message: '找不到該段內容' });
    }
    const content = row[contentKey] ?? row.內容 ?? '';
    return res.status(200).json({ allowed: true, content });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ allowed: false, message: '伺服器錯誤' });
  }
}
