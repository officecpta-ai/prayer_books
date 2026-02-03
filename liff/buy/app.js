(function () {
  var LIFF_ID = window.LIFF_ID || '';
  var API_BASE = window.API_BASE || '';

  function getQuery(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return m ? decodeURIComponent(m[1]) : '';
  }

  function showError(msg) {
    document.getElementById('status').style.display = 'none';
    document.getElementById('book').style.display = 'none';
    var el = document.getElementById('error');
    el.textContent = msg || '發生錯誤';
    el.style.display = 'block';
  }

  function showBook(name, price, bookId) {
    document.getElementById('status').style.display = 'none';
    document.getElementById('bookName').textContent = name || '禱告手冊';
    document.getElementById('price').textContent = price ? 'NT$ ' + price : '—';
    document.getElementById('book').style.display = 'block';
    document.getElementById('payBtn').dataset.bookId = bookId;
  }

  function showSuccess() {
    document.getElementById('status').style.display = 'none';
    document.getElementById('book').style.display = 'none';
    document.getElementById('success').style.display = 'block';
  }

  if (getQuery('status') === 'success') {
    showSuccess();
    return;
  }

  var bookId = getQuery('book_id');
  if (!bookId) {
    showError('請從 GPTs 或書單點選購買連結進入。');
    return;
  }

  if (!LIFF_ID) {
    showError('尚未設定 LIFF ID。');
    return;
  }

  var base = API_BASE;
  fetch(base + '/books/info?book_id=' + encodeURIComponent(bookId))
    .then(function (r) { return r.json(); })
    .then(function (info) {
      if (info.book_name) showBook(info.book_name, info.price, bookId);
      else document.getElementById('status').textContent = '請點擊下方按鈕以 Line Pay 付款。';
    })
    .catch(function () {
      showBook('禱告手冊', null, bookId);
    });

  document.getElementById('payBtn').addEventListener('click', function () {
    liff.init({ liffId: LIFF_ID }).then(function () {
      if (!liff.isLoggedIn()) {
        liff.login();
        return;
      }
      return liff.getIDToken().then(function (idToken) {
        var receiptTitle = document.getElementById('receiptTitle').value.trim();
        var buyerEmail = document.getElementById('buyerEmail').value.trim();
        var taxId = document.getElementById('taxId').value.trim();
        if (!receiptTitle) return Promise.reject(new Error('請填寫收據抬頭（姓名或法人組織名稱）'));
        if (!buyerEmail) return Promise.reject(new Error('請填寫 Email'));
        return fetch(base + '/line-pay/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_token: idToken,
            book_id: bookId,
            receipt_title: receiptTitle,
            email: buyerEmail,
            tax_id: taxId
          })
        });
      });
    }).then(function (res) {
      if (!res) return;
      return res.json();
    }).then(function (data) {
      if (!data) return;
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }
      showError(data.message || data.error || '無法取得付款連結');
    }).catch(function (err) {
      console.error(err);
      showError(err.message || '付款失敗');
    });
  });
})();
