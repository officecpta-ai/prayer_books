/**
 * GET /api/line-pay/confirm?transactionId=xxx&orderId=yyy
 * Line Pay 付款完成後導回；確認交易 → 更新購買紀錄 status=active、transaction_id → 寫入收據 → 重導向成功頁
 */

import { linePayConfirm } from '../../lib/line.js';
import { getSheet, updateRecord, createReceipt, getFieldId } from '../../lib/ragic.js';

const PURCHASES_SHEET = process.env.RAGIC_SHEET_PURCHASES || '';
const BOOKS_SHEET = process.env.RAGIC_SHEET_BOOKS || '';
const SUCCESS_URL = process.env.NEXT_PUBLIC_BUY_BASE || '';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const transactionId = req.query?.transactionId;
  const orderId = req.query?.orderId;

  if (!transactionId || !orderId) {
    return res.redirect(302, (SUCCESS_URL || '/liff/buy/') + '?status=error&message=missing_params');
  }

  try {
    const purchases = await getSheet(PURCHASES_SHEET);
    const orderIdKey = getFieldId('PURCHASES', 'ORDER_ID') || 'order_id';
    const row = Array.isArray(purchases)
      ? purchases.find((r) => (r[orderIdKey] ?? r.order_id) === orderId)
      : null;
    if (!row) {
      return res.redirect(302, (SUCCESS_URL || '/liff/buy/') + '?status=error&message=order_not_found');
    }

    const rowId = row._id ?? row.id ?? row['--id'];
    const lineUid = row.line_uid ?? row[process.env.RAGIC_FIELD_PURCHASES_LINE_UID];
    const bookId = row.書索引 ?? row[process.env.RAGIC_FIELD_PURCHASES_書索引];
    const amountStored = Number(row.amount ?? row[process.env.RAGIC_FIELD_PURCHASES_AMOUNT]) || 0;
    const currencyStored = row.currency ?? row[process.env.RAGIC_FIELD_PURCHASES_CURRENCY] ?? 'TWD';

    const confirmResult = await linePayConfirm({
      transactionId,
      amount: amountStored,
      currency: currencyStored,
    });

    const updatePayload = {
      [getFieldId('PURCHASES', 'STATUS') || 'status']: 'active',
      [getFieldId('PURCHASES', 'TRANSACTION_ID') || 'transaction_id']: confirmResult.transactionId || transactionId,
    };
    await updateRecord(PURCHASES_SHEET, rowId, updatePayload);

    const receiptTitle = (row.收據抬頭 ?? row[process.env.RAGIC_FIELD_PURCHASES_收據抬頭] ?? '').toString().trim();
    const buyerEmail = (row.email ?? row[process.env.RAGIC_FIELD_PURCHASES_EMAIL] ?? '').toString().trim();
    const taxId = (row.統一編號 ?? row[process.env.RAGIC_FIELD_PURCHASES_統一編號] ?? '').toString().trim();

    let bookName = row.書名 || '';
    if (!bookName && BOOKS_SHEET) {
      const books = await getSheet(BOOKS_SHEET);
      const bookIndexKey = getFieldId('BOOKS', '書索引') || '書索引';
      const bookNameKey = getFieldId('BOOKS', '書名') || '書名';
      const bookRow = Array.isArray(books) ? books.find((b) => (b[bookIndexKey] ?? b.書索引) === bookId) : null;
      if (bookRow) bookName = bookRow[bookNameKey] ?? bookRow.書名 ?? '';
    }
    const paidAt = new Date();
    const paidAtRagic = `${paidAt.getFullYear()}/${String(paidAt.getMonth() + 1).padStart(2, '0')}/${String(paidAt.getDate()).padStart(2, '0')} ${String(paidAt.getHours()).padStart(2, '0')}:${String(paidAt.getMinutes()).padStart(2, '0')}:${String(paidAt.getSeconds()).padStart(2, '0')}`;
    const currencyRagic = (currencyStored || 'TWD').toUpperCase() === 'TWD' ? 'NT$' : currencyStored;
    const defaultEmail = process.env.RECEIPT_DEFAULT_EMAIL || 'noreply@example.com';

    await createReceipt({
      類別: '其他收入',
      開立日期: paidAtRagic,
      姓名: receiptTitle || 'Line 用戶',
      收據抬頭: receiptTitle || '禱告手冊購買',
      統一編號: taxId || undefined,
      email: buyerEmail || defaultEmail,
      收款用途: bookName ? `禱告手冊-${bookName}` : '禱告手冊購買',
      收款方式: 'Lin Pay',
      幣別: currencyRagic,
      金額: amountStored,
      收款日期: paidAtRagic,
      收據狀態: '首開',
      開立狀態: '尚未開立',
      order_id: orderId,
      transaction_id: confirmResult.transactionId || transactionId,
      備註: orderId,
    }).catch((err) => console.error('createReceipt failed:', err));

    const successPath = SUCCESS_URL ? `${SUCCESS_URL}?status=success&book_id=${encodeURIComponent(bookId)}` : '/liff/buy/?status=success';
    return res.redirect(302, successPath);
  } catch (e) {
    console.error(e);
    return res.redirect(302, (SUCCESS_URL || '/liff/buy/') + '?status=error&message=' + encodeURIComponent(e.message || 'confirm_failed'));
  }
}
