# Vercel NOT_FOUND (404) 除錯指南

當 Vercel 回傳 `NOT_FOUND`（HTTP 404）時，代表「請求的資源找不到」。本文件說明常見原因、修正方式與正確心智模型，方便日後自行排查。

---

## 一、建議修正（已套用於本專案）

### 1. `vercel.json` 已加入的設定

- **API 路徑尾端斜線正規化**  
  `source: "/api/(.*)/"` → `destination: "/api/$1"`  
  若 GPTs、LIFF 或任何客戶端呼叫的是 `/api/verify/check/`（多一個 `/`），Vercel 會改寫為 `/api/verify/check`，避免因路徑不完全一致而 404。
- **根路徑導向**  
  `source: "/"` → `destination: "/liff/verify/index.html"`  
  直接造訪 `https://你的網域/` 時不再 404，而是顯示驗證頁。

### 2. 若仍出現 NOT_FOUND，請依序檢查

| 項目 | 說明 |
|------|------|
| **實際請求的 URL** | 在瀏覽器 / GPTs / LIFF 中確認打的是否為正確網域與路徑（例如 `https://你的網域/api/verify/check`，不是 `/api/book/available` 等錯字）。 |
| **OpenAPI / GPTs Server URL** | `docs/GPTs_ACTIONS_OPENAPI.yaml` 的 `servers.url` 與 GPTs Actions 的 Server URL 需與實際 Vercel 部署網域一致（例如 `https://prayer-books.vercel.app` 或你的自訂網域）。 |
| **Vercel 環境變數** | `API_BASE`、`NEXT_PUBLIC_VERIFY_URL`、`NEXT_PUBLIC_BUY_BASE` 等若指向錯誤網域，會導致前端呼叫到錯誤的基底網址，進而 404。 |
| **部署與權限** | Vercel 專案 → Deployments 確認該部署存在且成功；若有 Deployment Protection，需有權限或登入才能存取。 |

---

## 二、根本原因說明

### 程式實際在做什麼 vs 應該要做什麼

- **實際**：Vercel 依「請求的 URL 路徑」決定要執行哪一個 serverless 函式或要回傳哪個靜態檔。路徑必須與 `api/` 下的檔案路徑或 `rewrites` 的 `source` 一致，才會命中。
- **應該**：客戶端（GPTs、LIFF、瀏覽器）請求的 URL 必須對應到已部署的 API 路徑或已設定的 rewrite 目標；否則 Vercel 找不到對應資源，回傳 NOT_FOUND。

### 什麼情況會觸發 NOT_FOUND

1. **路徑不存在**：請求 `/api/xxx`，但專案裡沒有對應的 `api/xxx.js` 或沒有 rewrite 到既有 API。
2. **尾端斜線不一致**：例如只有 `api/verify/check.js`（對應 `/api/verify/check`），但請求的是 `/api/verify/check/`，在未正規化前可能被視為不同路徑而 404。
3. **根路徑沒有對應**：沒有為 `/` 設定 rewrite 或靜態檔時，造訪首頁會 404。
4. **靜態檔路徑錯誤**：LIFF 的 rewrite 指向 `/liff/verify/index.html`，若專案中沒有該檔案或輸出目錄設定錯誤，該路徑也會 404。
5. **網域/專案不一致**：請求打到錯誤的 Vercel 網域或已刪除的部署，也會得到 404（或連線錯誤）。

### 常見疏忽

- 以為「本機 `vercel dev` 能跑，部署就一定會一樣」— 部署時只會打包並執行 `builds` 與實際上傳的檔案，路徑、rewrite、輸出目錄都需與生產環境一致。
- 忽略客戶端（尤其是 GPTs、外部服務）是否帶尾端斜線或使用錯誤的 base URL。
- 文件或 OpenAPI 的 Server URL 與實際 Vercel 網域不一致。

---

## 三、概念：為什麼會有 NOT_FOUND、它在保護什麼？

- **為什麼存在**：NOT_FOUND 是 HTTP 標準的 404，代表「此 URL 在伺服器上沒有對應的資源」。Vercel 依路徑做路由，找不到就回 404，避免誤把請求導到錯誤的程式碼。
- **正確心智模型**：  
  - 每個請求 = 一個 URL。  
  - Vercel 先看 `rewrites` 的 `source`，再對應到 `api/**/*.js` 的檔案路徑或靜態檔。  
  - 路徑要「完全對上」（含是否尾端斜線、大小寫、網域）才會命中。
- **在整體架構中的位置**：路徑解析發生在 Edge / 閘道層，在執行你的 Node 函式之前。所以 404 常代表「根本沒進到你的 handler」，而是路由階段就沒匹配到。

---

## 四、日後可注意的警訊與類似情境

### 可能再次導致 NOT_FOUND 的狀況

- 新增了 API 路徑（例如 `api/new-feature.js`）但 GPTs / 前端仍打舊路徑或錯字。
- 改了 `vercel.json` 的 `rewrites` 或 `builds`，但沒重新部署。
- 把 API 檔案移動或改名，但文件或客戶端沒同步更新。
- 使用「其他框架」或自訂 build 時，Output Directory 設錯，導致上傳的檔案結構與預期不同，路徑對不上。

### 類似錯誤

- **405 Method Not Allowed**：路徑對、但 HTTP 方法不對（例如對 GET-only 的 API 送 POST）。
- **403 / 401**：路徑存在，但被權限或 Deployment Protection 擋下。
- **502 / 函式執行錯誤**：路徑有命中，但 handler 內拋錯或逾時。

### 可視為警訊的程式氣味

- 文件或 OpenAPI 的 URL 與程式裡 `API_BASE`、`NEXT_PUBLIC_*` 不一致。
- 多個環境（本機 / preview / production）用同一份 URL 設定，沒有依環境區分。
- 客戶端用字串拼接 URL，容易多一個或少一個 `/` 或 path segment。

---

## 五、其他可行做法與取捨

| 做法 | 優點 | 取捨 |
|------|------|------|
| **在 vercel.json 用 rewrites 正規化 API 尾端斜線**（目前做法） | 不改客戶端，集中在一處處理。 | 規則要與實際 API 路徑一致，新增 API 時不用特別改 rewrites（正則已涵蓋）。 |
| **客戶端一律不帶尾端斜線** | 路由規則簡單。 | 需約束所有呼叫方（GPTs、LIFF、第三方）都遵守，較難完全掌控。 |
| **根路徑 `/` 導向 LIFF 驗證頁**（目前做法） | 使用者造訪首頁有明確入口。 | 若日後首頁要改為其他內容，需改 rewrite。 |
| **根路徑回傳 404 或簡單靜態頁** | 不誤導使用者。 | 需自備 404 頁或靜態檔。 |
| **自訂 404 頁**（Vercel 支援 `404.html` 等） | 404 時可顯示友善頁面。 | 不解決「API 路徑錯誤」本身，只改善使用者看到的畫面。 |

若 NOT_FOUND 發生在**特定 API 路徑**，優先檢查該路徑是否在 `api/` 下存在、rewrite 是否涵蓋、以及實際請求 URL 與網域是否正確；若發生在**首頁或 LIFF 路徑**，則檢查根路徑與 LIFF 的 rewrites 及靜態檔是否存在。
