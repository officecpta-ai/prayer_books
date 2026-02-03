(function () {
  // 請替換為你的 LIFF ID（或由後端 / 建置時注入）
  var LIFF_ID = window.LIFF_ID || '';
  var API_BASE = window.API_BASE || '';

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
