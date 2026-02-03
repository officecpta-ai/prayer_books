/**
 * GET /api/books/info?book_id=
 * 回傳單本書的書名、價格（供購買頁顯示，不需身份）
 */

import { getSheet, getFieldId } from '../../lib/ragic.js';

const BOOKS_SHEET = process.env.RAGIC_SHEET_BOOKS || '';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const bookId = req.query?.book_id || req.query?.bookId;
  if (!bookId) {
    return res.status(400).json({ error: 'book_id required' });
  }

  try {
    const books = await getSheet(BOOKS_SHEET);
    const bookIndexKey = getFieldId('BOOKS', '書索引') || '書索引';
    const bookNameKey = getFieldId('BOOKS', '書名') || '書名';
    const typeKey = getFieldId('BOOKS', '類型') || '類型';
    const priceKey = getFieldId('BOOKS', '價格') || '價格';
    const book = Array.isArray(books) ? books.find((b) => (b[bookIndexKey] ?? b.書索引) === bookId) : null;
    if (!book) {
      return res.status(404).json({ error: 'book_not_found' });
    }
    return res.status(200).json({
      book_id: bookId,
      book_name: book[bookNameKey] ?? book.書名,
      type: book[typeKey] ?? book.類型,
      price: Number(book[priceKey] ?? book.價格) || 0,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
}
