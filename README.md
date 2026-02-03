# 禱告手冊小幫手

Line Pay 購買、Line UID 驗證、Ragic 資料庫、GPTs 前台的禱告手冊閱讀與訂閱系統。

## 功能摘要

- **驗證**：使用者點連結 → Line 登入 → 取得短碼（可複製）→ 貼回 GPTs 完成驗證
- **書單**：已購買的書、還沒購買的書（未買的書提供 Line Pay 購買連結）
- **閱讀**：僅能閱讀已購買的書；可從上次進度、指定天數、或選書後讀；內容完整顯示後提三個問題
- **購買**：LIFF 購買頁帶 `book_id`，Line Pay 付款成功後寫入購買紀錄與 Ragic 收據（對帳欄位一併寫入）

## 技術棧

- **後端**：Node.js、Vercel Serverless Functions
- **前端**：Line LIFF（驗證頁、購買頁）
- **資料庫**：Ragic（訂閱者、驗證碼、書目、購買紀錄、禱告手冊內容、閱讀進度、收據）
- **金流**：Line Pay
- **身份**：Line Login（Line UID）

## 專案結構

```
api/           # Vercel API
  verify/       # 驗證短碼 request、check
  line-pay/     # Line Pay request、confirm（含收據自動填入）
  books/        # purchased、available、info
  reading/      # content、progress
liff/           # LIFF 靜態頁
  verify/       # 驗證頁（短碼 + 複製按鈕）
  buy/          # 購買頁（?book_id=）
lib/            # ragic、line、auth
docs/           # RAGIC_SCHEMA、GPTs Instructions、OpenAPI
```

## 環境變數

複製 `.env.example` 為 `.env`，並填寫：

- **Line Login**：`LINE_CHANNEL_ID`、`LINE_CHANNEL_SECRET`
- **Line Pay**：`LINE_PAY_CHANNEL_ID`、`LINE_PAY_CHANNEL_SECRET`、`LINE_PAY_API`
- **Ragic**：`RAGIC_API_KEY`、`RAGIC_BASE_URL`、各 `RAGIC_SHEET_*`、收據表欄位 `RAGIC_FIELD_RECEIPTS_*`
- **網址**：`NEXT_PUBLIC_VERIFY_URL`、`NEXT_PUBLIC_BUY_BASE`、`API_BASE`
- **JWT**：`JWT_SECRET`（若使用 Bearer token 身份）

Ragic 表結構與欄位對應見 `docs/RAGIC_SCHEMA.md`；收據表已存在時，僅需在該文件與 `.env` 填寫欄位 ID 對應。

## 部署

1. 安裝依賴：`npm install`
2. 本地測試：`npm run dev`（需 Vercel CLI）
3. 部署：`npm run deploy` 或 Vercel 連動 Git 部署
4. 在 Vercel 專案設定中填入上述環境變數
5. LIFF：在 Line Developers 建立 LIFF App，Endpoint URL 指向 `https://你的網域/liff/verify` 與 `/liff/buy`；在 `liff/verify/index.html`、`liff/buy/index.html` 中設定 `window.LIFF_ID`（或由後端注入）

## GPTs 設定

1. 將 `docs/GPTs_INSTRUCTIONS.md` 中的 Instructions 文案貼到 ChatGPT 建立 GPTs 的 Instructions，並替換驗證頁、購買頁連結
2. 在 GPTs 的 Actions 中匯入 `docs/GPTs_ACTIONS_OPENAPI.yaml`（或手動填寫相同端點），並將 `servers[0].url` 改為你的 Vercel 網址
3. 需身份之 API（書單、閱讀）請依約定帶入驗證碼（Query `code=`）或 Authorization Bearer token

## Line Pay 對帳與收據

- 購買紀錄表儲存 `order_id`、`transaction_id`、`amount`、`currency`、`status`，供與 Line Pay 後台對帳
- 付款確認成功後會自動在 Ragic 收據表新增一筆，欄位對應見 `docs/RAGIC_SCHEMA.md` 與 `.env` 的 `RAGIC_FIELD_RECEIPTS_*`

## 授權與用途

本專案供福音機構／教會內部使用；請依實際需求調整 Ragic 表單與環境變數。
