# 部署檢查清單

部署到 Vercel 後，請依此清單檢查設定是否完整。

---

## 分工摘要

| 項目 | 誰做 |
|------|------|
| 本機 .env 網址三項、JWT_SECRET、GPTs 文案預填網址 | **AI 已完成** |
| Vercel 後台：環境變數 Import / 填寫、Redeploy | **您需完成** |
| Line Developers：建立 LIFF、取得 LIFF ID、設定 Endpoint URL | **您需完成** |
| 專案：在 liff/verify、liff/buy 的 index.html 填入 LIFF ID | **您需完成** |
| ChatGPT：建立 GPTs、貼 Instructions、設定 Actions Server URL | **您需完成** |

---

## 一、Vercel 環境變數

在 **Vercel 專案 → Settings → Environment Variables** 確認以下變數已設定（可從本機 `.env` Import 或手動填寫）。

### 必填（若未填會影響功能）

| 變數 | 說明 | 部署後填寫範例 |
|------|------|----------------|
| `NEXT_PUBLIC_VERIFY_URL` | 驗證頁完整網址（給 GPTs 顯示給使用者） | `https://prayer-books.vercel.app/liff/verify/` |
| `NEXT_PUBLIC_BUY_BASE` | 購買頁基底網址（付款成功導回、購買連結） | `https://prayer-books.vercel.app/liff/buy/` |
| `API_BASE` | API 基底網址（Line Pay 等後端用） | `https://prayer-books.vercel.app` |
| `JWT_SECRET` | 驗證碼簽發用密鑰（建議隨機字串） | 終端機執行：`openssl rand -hex 32` 產生的字串 |

### 已在本機 .env 填寫的（請確認 Vercel 也有）

- Line：`LINE_CHANNEL_ID`、`LINE_CHANNEL_SECRET`
- Line Pay：`LINE_PAY_CHANNEL_ID`、`LINE_PAY_CHANNEL_SECRET`、`LINE_PAY_API`
- Ragic：`RAGIC_API_KEY`、`RAGIC_BASE_URL`、各 `RAGIC_SHEET_*`、`RAGIC_FIELD_*`

### 選填

- `RECEIPT_DEFAULT_EMAIL`：購買者未填 email 時，收據使用的備用信箱。

**注意**：若在 Vercel 新增或修改環境變數，需重新部署才會生效（可到 Deployments 點 Redeploy）。

---

## 二、LIFF ID（Line 前端）

LIFF 驗證頁與購買頁需要 **LIFF ID**，目前程式從 `window.LIFF_ID` 讀取。

### 做法一：在 HTML 直接寫入（建議）

1. 到 [Line Developers Console](https://developers.line.biz/) → 你的 Provider → Channel → LIFF 分頁。
2. 建立兩個 LIFF App（或使用現有）：
   - 驗證用：Endpoint URL 設為 `https://你的Vercel網域/liff/verify/`
   - 購買用：Endpoint URL 設為 `https://你的Vercel網域/liff/buy/`
3. 取得兩個 LIFF ID（數字字串）。
4. 在專案中設定：
   - `liff/verify/index.html` 裡將 `window.LIFF_ID = window.LIFF_ID || '';` 改為 `window.LIFF_ID = '你的驗證用LIFF_ID';`
   - `liff/buy/index.html` 裡將 `window.LIFF_ID = window.LIFF_ID || '';` 改為 `window.LIFF_ID = '你的購買用LIFF_ID';`

### 做法二：由後端或建置時注入

若你之後改為由 API 或建置腳本注入 `window.LIFF_ID`，可維持 HTML 為空，由注入處設定。

**檢查**：若 LIFF ID 未設定，開啟驗證頁或購買頁時會顯示「尚未設定 LIFF ID」。

---

## 三、Line Developers Console

- **LIFF Endpoint URL**：必須指向你部署後的網址，例如：
  - 驗證：`https://prayer-books.vercel.app/liff/verify/`
  - 購買：`https://prayer-books.vercel.app/liff/buy/`
- 若使用沙盒 Line Pay，請確認 Channel 與 LIFF 皆為同一環境（開發/正式）。

---

## 四、GPTs Instructions

在 ChatGPT 建立 GPTs 時，貼上 `docs/GPTs_INSTRUCTIONS.md` 的 Instructions 前，請先替換：

- **{驗證頁連結}** → 實際驗證頁網址，例如：`https://prayer-books.vercel.app/liff/verify/`
- **{購買頁基底連結}** → 實際購買頁基底，例如：`https://prayer-books.vercel.app/liff/buy/`

GPTs Actions 的 OpenAPI 若使用自訂伺服器，**Server URL** 請填：`https://你的Vercel網域`（與 `API_BASE` 相同）。

---

## 五、快速對照

| 項目 | 本機 .env / 程式 | Vercel / 外部 |
|------|------------------|----------------|
| 網址三項 | `NEXT_PUBLIC_VERIFY_URL`、`NEXT_PUBLIC_BUY_BASE`、`API_BASE` 目前為空 | 部署後在 Vercel 環境變數填上 Vercel 網址 |
| JWT | `JWT_SECRET` 為空（程式有 fallback，正式建議必填） | 在 Vercel 填隨機字串 |
| LIFF | `liff/verify/index.html`、`liff/buy/index.html` 中 `window.LIFF_ID` 為空 | 在 HTML 填入 LIFF ID，並在 Line Console 設定 Endpoint URL |
| GPTs | Instructions 內為 `{驗證頁連結}`、`{購買頁基底連結}` | 貼到 GPTs 前替換為實際網址；Actions Server URL 填 API_BASE |

完成以上項目後，驗證流程、購買流程與 GPTs 串接即可正常運作。
