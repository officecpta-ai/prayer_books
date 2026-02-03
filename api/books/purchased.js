/**
 * GET /api/books/purchased
 * 需身份：Query code= 或 Authorization Bearer <token>
 * 回傳已購買的書（書索引、書名、類型、簡介）
 */

import { getIdentity } from '../../lib/auth.js';
import { getSheet, getFieldId } from '../../lib/ragic.js';

const PURCHASES_SHEET = process.env.RAGIC_SHEET_PURCHASES || '';
const BOOKS_SHEET = process.env.RAGIC_SHEET_BOOKS || '';
const BUY_BASE = process.env.NEXT_PUBLIC_BUY_BASE || '';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const identity = await getIdentity(req);
  if (!identity) {
    return res.status(401).json({ error: 'unauthorized', message: '請先完成驗證' });
  }

  try {
    const purchases = await getSheet(PURCHASES_SHEET);
    const bookIdKey = getFieldId('PURCHASES', '書索引') || '書索引';
    const statusKey = getFieldId('PURCHASES', 'STATUS') || 'status';
    const myPurchases = Array.isArray(purchases)
      ? purchases.filter(
          (r) =>
            (r.line_uid ?? r[process.env.RAGIC_FIELD_PURCHASES_LINE_UID]) === identity.line_uid &&
            (r[statusKey] ?? r.status) === 'active'
        )
      : [];
    const bookIds = [...new Set(myPurchases.map((r) => r[bookIdKey] ?? r.書索引).filter(Boolean))];
    if (bookIds.length === 0) {
      return res.status(200).json({ books: [] });
    }

    const books = await getSheet(BOOKS_SHEET);
    const bookIndexKey = getFieldId('BOOKS', '書索引') || '書索引';
    const bookNameKey = getFieldId('BOOKS', '書名') || '書名';
    const typeKey = getFieldId('BOOKS', '類型') || '類型';
    const descKey = getFieldId('BOOKS', '簡介') || '簡介';
    const list = (Array.isArray(books) ? books : []).filter((b) => bookIds.includes(b[bookIndexKey] ?? b.書索引));
    const result = list.map((b) => ({
      book_id: b[bookIndexKey] ?? b.書索引,
      book_name: b[bookNameKey] ?? b.書名,
      type: b[typeKey] ?? b.類型,
      description: b[descKey] ?? b.簡介,
    }));

    return res.status(200).json({ books: result });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
}
