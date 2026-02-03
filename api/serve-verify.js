/**
 * GET /api/serve-verify — 備援：直接回傳驗證頁 HTML（當 /liff/verify/ 靜態檔 404 時使用）
 * LIFF Endpoint URL 與 GPTs 驗證連結可改為 https://你的網域/api/serve-verify
 */

const LIFF_ID = process.env.LIFF_ID_VERIFY || '2009037947-gMrzQYWv';

const INLINE_SCRIPT = `
(function () {
  var LIFF_ID = window.LIFF_ID || '';
  var API_BASE = window.API_BASE || (window.location.origin + '/api');
  function showError(msg) {
    document.getElementById('status').style.display = 'none';
    var el = document.getElementById('error');
    el.textContent = msg || '驗證失敗，請稍後再試。';
    el.style.display = 'block';
  }
  function showCode(code) {
    document.getElementById('status').style.display = 'none';
    document.getElementById('codeDisplay').textContent = code;
    document.getElementById('result').style.display = 'block';
    var copyBtn = document.getElementById('copyBtn');
    copyBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(code).then(function () {
        copyBtn.textContent = '已複製';
        copyBtn.disabled = true;
        setTimeout(function () {
          copyBtn.textContent = '複製驗證碼';
          copyBtn.disabled = false;
        }, 2000);
      }).catch(function () {
        copyBtn.textContent = '請手動複製上方驗證碼';
      });
    });
  }
  function main() {
    if (!LIFF_ID) {
      showError('尚未設定 LIFF ID，請聯絡管理員。');
      return;
    }
    liff.init({ liffId: LIFF_ID }).then(function () {
      if (!liff.isLoggedIn()) {
        liff.login();
        return;
      }
      return liff.getIDToken();
    }).then(function (idToken) {
      if (!idToken) return;
      var base = API_BASE || (window.location.origin + '/api');
      return fetch(base + '/verify/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken })
      });
    }).then(function (res) {
      if (!res) return;
      return res.json().then(function (data) {
        if (!res.ok) {
          showError(data.message || data.error || '驗證失敗');
          return;
        }
        if (data.code) {
          showCode(data.code);
        } else {
          showError('未取得驗證碼');
        }
      });
    }).catch(function (err) {
      console.error(err);
      showError(err.message || '驗證失敗');
    });
  }
  main();
})();
`;

const HTML = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>禱告手冊小幫手 — 驗證</title>
  <script charset="utf-8" src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
  <style>
    body { font-family: sans-serif; max-width: 360px; margin: 2rem auto; padding: 1rem; text-align: center; }
    h1 { font-size: 1.25rem; }
    .code { font-size: 2rem; letter-spacing: 0.5rem; margin: 1rem 0; padding: 0.75rem; background: #f0f0f0; border-radius: 8px; }
    button { padding: 0.75rem 1.5rem; font-size: 1rem; background: #06c755; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .hint { color: #666; font-size: 0.9rem; margin-top: 1rem; }
    .error { color: #c00; margin: 1rem 0; }
    #status { margin: 1rem 0; }
  </style>
</head>
<body>
  <h1>禱告手冊小幫手</h1>
  <p id="status">正在驗證身份…</p>
  <div id="result" style="display: none;">
    <p>驗證成功，請將以下驗證碼帶回 GPTs 完成驗證：</p>
    <div class="code" id="codeDisplay">----</div>
    <button type="button" id="copyBtn">複製驗證碼</button>
    <p class="hint">請回到 GPTs，貼上驗證碼完成驗證。</p>
  </div>
  <div id="error" class="error" style="display: none;"></div>
  <script>
    window.API_BASE = window.location.origin + '/api';
    window.LIFF_ID = '${LIFF_ID.replace(/'/g, "\\'")}';
  </script>
  <script>${INLINE_SCRIPT}</script>
</body>
</html>`;

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method Not Allowed');
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).send(HTML);
}
