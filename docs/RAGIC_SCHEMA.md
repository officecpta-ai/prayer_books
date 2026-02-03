# Ragic 表結構與欄位對應

頁籤：**新禱告手冊**。以下為實際表單網址、API 網址與欄位編號，供 `lib/ragic.js` 與環境變數對照。

## 一、訂閱者（Subscribers）

- **表單網址**：https://ap13.ragic.com/asiahope/new-prayer-book/2  
- **API 網址**：https://ap13.ragic.com/asiahope/new-prayer-book/2?api=true  
- **Sheet ID**：`2`

| 邏輯欄位名   | 類型   | Ragic 欄位編號 |
|-------------|--------|----------------|
| line_uid    | 文字   | 1011671        |
| display_name| 文字   | 1011672        |
| status      | 選項   | 1011673        |
| expires_at  | 日期   | 1011674        |
| created_at  | 日期   | 1011675        |
| updated_at  | 日期   | 1011676        |

---

## 二、驗證碼（Verification Codes）

- **表單網址**：https://ap13.ragic.com/asiahope/new-prayer-book/3  
- **API 網址**：https://ap13.ragic.com/asiahope/new-prayer-book/3?api=true  
- **Sheet ID**：`3`

| 邏輯欄位名 | 類型 | Ragic 欄位編號 |
|------------|------|----------------|
| code       | 文字 | 1011678        |
| line_uid   | 文字 | 1011679        |
| expires_at | 日期 | 1011680        |
| used       | 選項 | 1011681        |

---

## 三、書目（Books）

- **表單網址**：https://ap13.ragic.com/asiahope/new-prayer-book/4  
- **API 網址**：https://ap13.ragic.com/asiahope/new-prayer-book/4?api=true  
- **Sheet ID**：`4`

| 邏輯欄位名   | 類型 | Ragic 欄位編號 |
|-------------|------|----------------|
| 書索引      | 文字 | 1011683        |
| 書名        | 文字 | 1011684        |
| 類型        | 選項 | 1011685        |
| 簡介        | 文字 | 1011686        |
| 價格        | 數字 | 1011687        |
| 購買頁連結  | 文字 | 1011688        |

---

## 四、購買紀錄（Purchases）

- **表單網址**：https://ap13.ragic.com/asiahope/new-prayer-book/5  
- **API 網址**：https://ap13.ragic.com/asiahope/new-prayer-book/5?api=true  
- **Sheet ID**：`5`

| 邏輯欄位名    | 類型 | Ragic 欄位編號 | 說明 |
|--------------|------|----------------|------|
| line_uid     | 文字 | 1011690        | |
| display_name | 文字 | 1011755        | Line 顯示名稱（選填） |
| 收據抬頭     | 文字 | 1011752        | 姓名或法人組織名稱，購買畫面填寫 |
| 統一編號     | 文字 | 1011753        | 選填，法人可填 |
| email        | 文字 | 1011754        | 購買者 email |
| 書索引       | 文字 | 1011691        | |
| purchased_at | 日期 | 1011692        | |
| status       | 選項 | 1011693        | |
| order_id     | 文字 | 1011694        | |
| transaction_id| 文字 | 1011695       | |
| amount       | 數字 | 1011696        | |
| currency     | 文字 | 1011697        | |

---

## 五、禱告手冊內容（Content）

- **表單網址**：https://ap13.ragic.com/asiahope/new-prayer-book/6  
- **API 網址**：https://ap13.ragic.com/asiahope/new-prayer-book/6?api=true  
- **Sheet ID**：`6`

| 邏輯欄位名 | 類型 | Ragic 欄位編號 |
|------------|------|----------------|
| 書索引    | 文字 | 1011699        |
| 書名      | 文字 | 1011700        |
| 類型      | 選項 | 1011701        |
| 天數      | 數字 | 1011702        |
| 內容      | 文字 | 1011703        |
| 標題      | 文字 | 1011756        |

---

## 六、閱讀進度（Reading Progress）

- **表單網址**：https://ap13.ragic.com/asiahope/new-prayer-book/7  
- **API 網址**：https://ap13.ragic.com/asiahope/new-prayer-book/7?api=true  
- **Sheet ID**：`7`

| 邏輯欄位名  | 類型 | Ragic 欄位編號 |
|------------|------|----------------|
| line_uid   | 文字 | 1011705        |
| 書索引     | 文字 | 1011706        |
| 類型       | 文字 | 1011707        |
| 天數       | 數字 | 1011708        |
| updated_at | 日期 | 1011709        |

---

## 七、收據（Receipts）

- **表單網址**：https://ap13.ragic.com/asiahope/new-prayer-book/9  
- **API 網址**：https://ap13.ragic.com/asiahope/new-prayer-book/9?api=true  
- **Sheet ID**：`9`

付款確認成功後，程式會呼叫 `createReceipt()` 自動新增一筆；以下為會寫入的欄位與對應編號，必填欄位由程式帶入預設值。

| 邏輯欄位名   | 類型 | Ragic 欄位編號 | 程式寫入說明 |
|-------------|------|----------------|--------------|
| 類別        | 選項 | 1011725        | 必填；固定「其他收入」 |
| 開立日期    | 日期 | 1011731        | 必填；付款日期 |
| 收據編號    | 文字 | 1011726        | 自動產生，可不送 |
| 姓名        | 文字 | 1011728        | 必填；Line 顯示名稱或「Line 用戶」 |
| 收據抬頭    | 文字 | 1011730        | 必填；姓名或法人組織名稱（購買畫面填寫，可含統一編號） |
| 統一編號    | 文字 | 1011729        | 選填 |
| 身分證字號  | 文字 | 1011739        | 選填 |
| email       | 文字 | 1011740        | 必填；購買者 email（購買畫面填寫） |
| 聯絡電話    | 文字 | 1011741        | 選填 |
| 地址        | 文字 | 1011742        | 選填 |
| 收款用途    | 文字 | 1011734        | 必填；書名或「禱告手冊-{書名}」 |
| 收款方式    | 選項 | 1011736        | 「Lin Pay」 |
| 幣別        | 選項 | 1011732        | 必填；TWD→「NT$」 |
| 金額        | 數字 | 1011733        | 必填 |
| 收款日期    | 日期 | 1011743        | 付款日期 |
| 收款帳號    | 文字 | 1011744        | 選填 |
| 備註        | 文字 | 1011735        | 預填 order_id |
| 收據狀態    | 選項 | 1011727        | 必填；預設「首開」 |
| 開立狀態    | 選項 | 1011724        | 預設「尚未開立」 |
| order_id    | 文字 | 1011737        | 不可重複；我方訂單編號 |
| transaction_id | 文字 | 1011751      | Line Pay 交易編號 |
