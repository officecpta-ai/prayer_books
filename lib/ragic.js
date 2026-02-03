/**
 * Ragic API 客戶端
 * - 認證：HTTP Basic Auth，username = RAGIC_API_KEY，無密碼
 * - 讀取：GET /{sheetId}?api
 * - 新增：POST /{sheetId}，Body 為 JSON，key 為 Ragic 欄位 ID
 * 欄位 ID 請在 Ragic 表單設計頁查詢，並於 .env 設定 RAGIC_FIELD_{表名}_{欄位} 或於呼叫端傳入已對應之物件
 */

const RAGIC_BASE = process.env.RAGIC_BASE_URL || '';
const RAGIC_API_KEY = process.env.RAGIC_API_KEY || '';

function getAuthHeader() {
  const encoded = Buffer.from(`${RAGIC_API_KEY}:`).toString('base64');
  return `Basic ${encoded}`;
}

/**
 * 取得單一 sheet 的資料（GET）
 * @param {string|number} sheetId - RAGIC_SHEET_* 的值
 * @param {object} params - 查詢參數，如 q（篩選）、limit、offset 等
 * @returns {Promise<Array>} 筆數陣列
 */
export async function getSheet(sheetId, params = {}) {
  const url = new URL(`${RAGIC_BASE}/${sheetId}`);
  url.searchParams.set('api', '');
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: getAuthHeader(),
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ragic getSheet ${sheetId} failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [data];
}

/**
 * 新增一筆資料（POST）
 * @param {string|number} sheetId - RAGIC_SHEET_* 的值
 * @param {object} record - 一筆資料，key 為 Ragic 欄位 ID（字串），value 為欄位值
 * @returns {Promise<object>} Ragic 回傳之新增筆數
 */
export async function createRecord(sheetId, record) {
  const url = `${RAGIC_BASE}/${sheetId}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(record),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ragic createRecord ${sheetId} failed: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * 更新一筆資料（POST 到該筆 URL，Ragic 文件為 Modifying an Entry）
 * @param {string|number} sheetId - sheet ID
 * @param {string|number} recordId - 該筆的 row id
 * @param {object} record - 要更新的欄位，key 為 Ragic 欄位 ID
 */
export async function updateRecord(sheetId, recordId, record) {
  const url = `${RAGIC_BASE}/${sheetId}/${recordId}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(record),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ragic updateRecord ${sheetId}/${recordId} failed: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * 從 env 取得欄位 ID：RAGIC_FIELD_{SHEET}_{FIELD}
 * 例如 RAGIC_FIELD_VERIFICATION_CODE => 驗證碼表的 code 欄位 ID
 */
export function getFieldId(sheetKey, fieldKey) {
  const key = `RAGIC_FIELD_${sheetKey}_${fieldKey}`.toUpperCase();
  return process.env[key] || '';
}

/**
 * 將邏輯欄位物件轉成 Ragic 用物件（key 為欄位 ID）
 * @param {string} sheetKey - 表名，如 VERIFICATION, RECEIPTS
 * @param {object} data - 邏輯欄位名 => 值
 * @returns {object} Ragic 欄位 ID => 值
 */
export function toRagicRecord(sheetKey, data) {
  const out = {};
  for (const [fieldKey, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    const fieldId = getFieldId(sheetKey, fieldKey);
    if (fieldId) out[fieldId] = value;
  }
  return out;
}

/**
 * 收據表自動填入：付款成功後新增一筆收據
 * 欄位對應請在 .env 設定 RAGIC_FIELD_RECEIPTS_* 並與 RAGIC_SCHEMA.md 對照
 */
export async function createReceipt(fields) {
  const sheetId = process.env.RAGIC_SHEET_RECEIPTS;
  if (!sheetId) throw new Error('RAGIC_SHEET_RECEIPTS not set');
  const record = toRagicRecord('RECEIPTS', fields);
  if (Object.keys(record).length === 0) throw new Error('No receipt fields mapped');
  return createRecord(sheetId, record);
}
