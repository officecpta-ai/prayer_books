/**
 * GET /api/books/available
 * 需身份：Query code= 或 Authorization Bearer <token>
 * 回傳還沒購買的書（書索引、書名、類型、簡介、購買頁連結）
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
    const myBookIds = new Set(
      (Array.isArray(purchases) ? purchases : [])
        .filter(
          (r) =>
            (r.line_uid ?? r[process.env.RAGIC_FIELD_PURCHASES_LINE_UID]) === identity.line_uid &&
            (r[statusKey] ?? r.status) === 'active'
        )
        .map((r) => r[bookIdKey] ?? r.書索引)
        .filter(Boolean)
    );

    const books = await getSheet(BOOKS_SHEET);
    const bookIndexKey = getFieldId('BOOKS', '書索引') || '書索引';
    const bookNameKey = getFieldId('BOOKS', '書名') || '書名';
    const typeKey = getFieldId('BOOKS', '類型') || '類型';
    const descKey = getFieldId('BOOKS', '簡介') || '簡介';
    const linkKey = getFieldId('BOOKS', '購買頁連結') || '購買頁連結';
    const allBooks = Array.isArray(books) ? books : [];
    const available = allBooks
      .filter((b) => !myBookIds.has(b[bookIndexKey] ?? b.書索引))
      .map((b) => {
        const bookId = b[bookIndexKey] ?? b.書索引;
        const link = b[linkKey] ?? b.購買頁連結 || (BUY_BASE ? `${BUY_BASE}?book_id=${encodeURIComponent(bookId)}` : '');
        return {
          book_id: bookId,
          book_name: b[bookNameKey] ?? b.書名,
          type: b[typeKey] ?? b.類型,
          description: b[descKey] ?? b.簡介,
          purchase_link: link,
        };
      });

    return res.status(200).json({ books: available });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
}
