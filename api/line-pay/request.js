/**
 * POST /api/line-pay/request
 * Body: { id_token? (LIFF), line_uid?, book_id, amount?, currency?, receipt_title?, email?, tax_id?, confirmUrl?, cancelUrl? }
 * 若有 id_token 則驗證取得 line_uid；若未傳 amount 則依 book_id 查書目表取得價格。發起 Line Pay 後寫入購買紀錄 status=pending，回傳 paymentUrl。
 */

import { verifyLineIdToken } from '../../lib/line.js';
import { linePayRequest } from '../../lib/line.js';
import { getSheet, createRecord, toRagicRecord, getFieldId } from '../../lib/ragic.js';

const BOOKS_SHEET = process.env.RAGIC_SHEET_BOOKS || '';
const PURCHASES_SHEET = process.env.RAGIC_SHEET_PURCHASES || '';
const API_BASE = process.env.API_BASE || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'object' ? req.body : {};
    let lineUid = body.line_uid;
    let displayName = body.display_name || body.displayName || '';
    if (!lineUid && body.id_token) {
      const payload = await verifyLineIdToken(body.id_token);
      lineUid = payload.sub;
      if (payload.name) displayName = payload.name;
    }
    const bookId = body.book_id || body.書索引;
    let amount = Number(body.amount) || 0;
    const currency = body.currency || 'TWD';
    let productName = body.product_name || body.productName;
    if (!lineUid || !bookId) {
      return res.status(400).json({ error: 'line_uid or id_token, and book_id required' });
    }
    if (amount <= 0 && BOOKS_SHEET) {
      const books = await getSheet(BOOKS_SHEET);
      const bookIndexKey = getFieldId('BOOKS', '書索引') || '書索引';
      const bookNameKey = getFieldId('BOOKS', '書名') || '書名';
      const priceKey = getFieldId('BOOKS', '價格') || '價格';
      const book = Array.isArray(books) ? books.find((b) => (b[bookIndexKey] ?? b.書索引) === bookId) : null;
      if (book) {
        if (amount <= 0) amount = Number(book[priceKey] ?? book.價格) || 0;
        if (!productName) productName = book[bookNameKey] ?? book.書名;
      }
    }
    if (amount <= 0) amount = 1;
    if (!productName) productName = '禱告手冊';

    const orderId = `ph_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const base = API_BASE || (req.headers.origin || req.headers.referer || '').replace(/\/$/, '');
    const confirmUrl = body.confirm_url || `${base}/api/line-pay/confirm?orderId=${encodeURIComponent(orderId)}`;
    const cancelUrl = body.cancel_url || (base + '/liff/buy/');

    const { paymentUrl, transactionId } = await linePayRequest({
      orderId,
      amount,
      currency,
      productName,
      bookId,
      confirmUrl,
      cancelUrl,
    });

    const purchasePayload = {
      line_uid: lineUid,
      書索引: bookId,
      order_id: orderId,
      transaction_id: transactionId || '',
      amount,
      currency,
      status: 'pending',
      purchased_at: new Date().toISOString(),
    };
    const receiptTitle = (body.receipt_title || body.收據抬頭 || '').toString().trim();
    const buyerEmail = (body.email || '').toString().trim();
    const taxId = (body.tax_id || body.統一編號 || '').toString().trim();
    if (displayName) purchasePayload.display_name = displayName;
    if (receiptTitle) purchasePayload.收據抬頭 = receiptTitle;
    if (buyerEmail) purchasePayload.email = buyerEmail;
    if (taxId) purchasePayload.統一編號 = taxId;
    const purchaseRecord = toRagicRecord('PURCHASES', purchasePayload);
    if (Object.keys(purchaseRecord).length === 0) {
      Object.assign(purchaseRecord, {
        line_uid: lineUid,
        書索引: bookId,
        order_id: orderId,
        transaction_id: transactionId || '',
        amount,
        currency,
        status: 'pending',
        purchased_at: new Date().toISOString(),
      });
    }
    await createRecord(PURCHASES_SHEET, purchaseRecord);

    return res.status(200).json({ paymentUrl, orderId, transactionId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error', message: e.message });
  }
}
