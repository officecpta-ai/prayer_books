/**
 * GET /api/reading/progress — 取得上次閱讀進度（書索引、書名、類型、天數 + 該段完整內容）
 * POST /api/reading/progress — 更新閱讀進度（Body: book_id, 類型?, 天數）；僅允許已購買的書
 */

import { getIdentity } from '../../lib/auth.js';
import { getSheet, createRecord, updateRecord, getFieldId, toRagicRecord } from '../../lib/ragic.js';

const PURCHASES_SHEET = process.env.RAGIC_SHEET_PURCHASES || '';
const PROGRESS_SHEET = process.env.RAGIC_SHEET_PROGRESS || '';
const CONTENT_SHEET = process.env.RAGIC_SHEET_CONTENT || '';
const BOOKS_SHEET = process.env.RAGIC_SHEET_BOOKS || '';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const identity = await getIdentity(req);
  if (!identity) {
    return res.status(401).json({ error: '請先完成驗證' });
  }

  try {
    const purchases = await getSheet(PURCHASES_SHEET);
    const bookIdKey = getFieldId('PURCHASES', '書索引') || '書索引';
    const statusKey = getFieldId('PURCHASES', 'STATUS') || 'status';
    const lineUidKey = process.env.RAGIC_FIELD_PURCHASES_LINE_UID || 'line_uid';
    const myBookIds = new Set(
      (Array.isArray(purchases) ? purchases : [])
        .filter((r) => (r[lineUidKey] ?? r.line_uid) === identity.line_uid && (r[statusKey] ?? r.status) === 'active')
        .map((r) => r[bookIdKey] ?? r.書索引)
        .filter(Boolean)
    );

    if (req.method === 'GET') {
      const progressRows = await getSheet(PROGRESS_SHEET);
      const progressLineKey = getFieldId('PROGRESS', 'LINE_UID') || 'line_uid';
      const progressBookKey = getFieldId('PROGRESS', '書索引') || '書索引';
      const progressDayKey = getFieldId('PROGRESS', '天數') || '天數';
      const progressTypeKey = getFieldId('PROGRESS', '類型') || '類型';
      const myProgress = (Array.isArray(progressRows) ? progressRows : []).filter(
        (r) => (r[progressLineKey] ?? r.line_uid) === identity.line_uid && myBookIds.has(r[progressBookKey] ?? r.書索引)
      );
      const latest = myProgress.sort((a, b) => new Date(b.updated_at || b[getFieldId('PROGRESS', 'UPDATED_AT')] || 0) - new Date(a.updated_at || a[getFieldId('PROGRESS', 'UPDATED_AT')] || 0))[0];
      if (!latest) {
        return res.status(200).json({ progress: null, content: null, message: '尚無閱讀進度' });
      }
      const bookId = latest[progressBookKey] ?? latest.書索引;
      const day = latest[progressDayKey] ?? latest.天數;
      const contents = await getSheet(CONTENT_SHEET);
      const contentBookIdKey = getFieldId('CONTENT', '書索引') || '書索引';
      const contentDayKey = getFieldId('CONTENT', '天數') || '天數';
      const contentKey = getFieldId('CONTENT', '內容') || '內容';
      const contentTitleKey = getFieldId('CONTENT', 'TITLE') || process.env.RAGIC_FIELD_CONTENT_TITLE || '標題';
      const contentRow = Array.isArray(contents) ? contents.find(
        (r) => (r[contentBookIdKey] ?? r.書索引) === bookId && (String(r[contentDayKey] ?? r.天數) === String(day) || r[contentDayKey] === Number(day))
      ) : null;
      const books = await getSheet(BOOKS_SHEET);
      const bookNameKey = getFieldId('BOOKS', '書名') || '書名';
      const typeKey = getFieldId('BOOKS', '類型') || '類型';
      const bookRow = Array.isArray(books) ? books.find((b) => (b[getFieldId('BOOKS', '書索引')] ?? b.書索引) === bookId) : null;
      const content = contentRow ? (contentRow[contentKey] ?? contentRow.內容) : null;
      const title = contentRow ? (contentRow[contentTitleKey] ?? contentRow.標題 ?? '') : '';
      return res.status(200).json({
        progress: { book_id: bookId, book_name: bookRow?.[bookNameKey] ?? bookRow?.書名, type: latest[progressTypeKey] ?? latest.類型, day },
        content,
        title: title || undefined,
      });
    }

    const body = typeof req.body === 'object' ? req.body : {};
    const bookId = body.book_id || body.書索引;
    const day = body.天數 != null ? body.天數 : body.day;
    const type = body.類型 || body.type;
    if (!bookId) {
      return res.status(400).json({ error: 'book_id required' });
    }
    if (!myBookIds.has(bookId)) {
      return res.status(403).json({ error: '尚未購買本書' });
    }

    const progressRows = await getSheet(PROGRESS_SHEET);
    const progressLineKey = getFieldId('PROGRESS', 'LINE_UID') || 'line_uid';
    const progressBookKey = getFieldId('PROGRESS', '書索引') || '書索引';
    const existing = Array.isArray(progressRows) ? progressRows.find(
      (r) => (r[progressLineKey] ?? r.line_uid) === identity.line_uid && (r[progressBookKey] ?? r.書索引) === bookId
    ) : null;
    const updatedAt = new Date().toISOString();
    let record = toRagicRecord('PROGRESS', { line_uid: identity.line_uid, 書索引: bookId, 類型: type, 天數: day, updated_at: updatedAt });
    if (Object.keys(record).length === 0) {
      record = { line_uid: identity.line_uid, 書索引: bookId, 類型: type, 天數: day, updated_at: updatedAt };
    }
    if (existing && (existing._id ?? existing.id ?? existing['--id']) != null) {
      await updateRecord(PROGRESS_SHEET, existing._id ?? existing.id ?? existing['--id'], record);
    } else {
      await createRecord(PROGRESS_SHEET, record);
    }
    return res.status(200).json({ ok: true, book_id: bookId, day, updated_at: updatedAt });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
}
