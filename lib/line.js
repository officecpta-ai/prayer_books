/**
 * Line Login：驗證 id_token，取得 Line UID（sub）
 * Line Pay：發起付款 request、確認 confirm
 */

const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID || '';
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const LINE_PAY_CHANNEL_ID = process.env.LINE_PAY_CHANNEL_ID || '';
const LINE_PAY_CHANNEL_SECRET = process.env.LINE_PAY_CHANNEL_SECRET || '';
const LINE_PAY_API = process.env.LINE_PAY_API || 'https://api-pay.line.me';

/**
 * 驗證 Line id_token，回傳 payload（含 sub = Line UID）
 * @param {string} idToken - LIFF 取得的 id_token
 * @returns {Promise<{ sub: string, name?: string }>}
 */
export async function verifyLineIdToken(idToken) {
  const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: LINE_CHANNEL_ID,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Line verify failed: ${res.status} ${text}`);
  }
  const payload = await res.json();
  return { sub: payload.sub, name: payload.name };
}

/**
 * Line Pay：發起付款 Request API
 * @param {object} params - { orderId, amount, currency, productName, bookId, confirmUrl, cancelUrl }
 * @returns {Promise<{ paymentUrl: string, transactionId: string }>}
 */
export async function linePayRequest(params) {
  const { orderId, amount, currency = 'TWD', productName, bookId, confirmUrl, cancelUrl } = params;
  const body = {
    amount,
    currency,
    orderId,
    packages: [
      {
        id: 'prayer-handbook',
        amount,
        name: productName || '禱告手冊',
        products: [{ name: productName || '禱告手冊', quantity: 1, price: amount }],
      },
    ],
    redirectUrls: { confirmUrl, cancelUrl },
  };
  const res = await fetch(`${LINE_PAY_API}/v3/payments/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-LINE-ChannelId': LINE_PAY_CHANNEL_ID,
      'X-LINE-ChannelSecret': LINE_PAY_CHANNEL_SECRET,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Line Pay request failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return {
    paymentUrl: data.info?.paymentUrl?.web,
    transactionId: data.info?.transactionId,
  };
}

/**
 * Line Pay：確認付款 Confirm API（使用者從 Line Pay 導回後呼叫）
 * @param {object} params - { transactionId, amount, currency }
 * @returns {Promise<{ transactionId: string, orderId: string }>}
 */
export async function linePayConfirm(params) {
  const { transactionId, amount, currency = 'TWD' } = params;
  const res = await fetch(`${LINE_PAY_API}/v3/payments/${transactionId}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-LINE-ChannelId': LINE_PAY_CHANNEL_ID,
      'X-LINE-ChannelSecret': LINE_PAY_CHANNEL_SECRET,
    },
    body: JSON.stringify({ amount, currency }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Line Pay confirm failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return {
    transactionId: data.info?.transactionId,
    orderId: data.info?.orderId,
  };
}
