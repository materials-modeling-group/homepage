// Contact フォーム: 名前 / メールアドレス / 件名 / 内容 を mailto: 経由で出村さん宛に送る
// 宛先アドレスは HTML には書かず JS で組み立てて bot によるスクレイピングを回避する。
(function () {
  'use strict';

  var RECIPIENT_USER = 'DEMURA.Masahiko';
  var RECIPIENT_DOMAIN = 'nims.go.jp';

  var LANG = document.documentElement.lang === 'en' ? 'en' : 'ja';
  var LABEL = LANG === 'en'
    ? { name: 'Name', email: 'Email', subject: 'Subject', message: 'Message' }
    : { name: 'お名前', email: 'メールアドレス', subject: '件名', message: 'お問い合わせ内容' };

  var FIELDS = ['name', 'email', 'subject', 'message'];

  // 一般的なメールアドレス形式チェック（過度に厳密にしない）
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function $(id) { return document.getElementById(id); }

  function showError(id, show) {
    var input = $(id);
    var err = $(id + '-error');
    if (!input || !err) return;
    if (show) {
      input.classList.add('error');
      err.classList.remove('hidden');
    } else {
      input.classList.remove('error');
      err.classList.add('hidden');
    }
  }

  function validate() {
    var values = {};
    var valid = true;

    FIELDS.forEach(function (id) {
      values[id] = ($(id).value || '').trim();
    });

    // name / subject: 必須（空文字NG）
    ['name', 'subject'].forEach(function (id) {
      var ok = values[id].length > 0;
      showError(id, !ok);
      if (!ok) valid = false;
    });

    // email: 形式チェック
    var emailOk = EMAIL_RE.test(values.email);
    showError('email', !emailOk);
    if (!emailOk) valid = false;

    // message: 10文字以上
    var msgOk = values.message.length >= 10;
    showError('message', !msgOk);
    if (!msgOk) valid = false;

    return valid ? values : null;
  }

  window.handleSubmit = function (event) {
    event.preventDefault();
    var v = validate();
    if (!v) return false;

    var recipient = RECIPIENT_USER + '@' + RECIPIENT_DOMAIN;
    var body =
      LABEL.name + ': ' + v.name + '\n' +
      LABEL.email + ': ' + v.email + '\n\n' +
      v.message;

    var mailto = 'mailto:' + recipient +
      '?subject=' + encodeURIComponent(v.subject) +
      '&body=' + encodeURIComponent(body);
    window.location.href = mailto;

    $('form-container').classList.add('hidden');
    $('success-container').classList.remove('hidden');
    return false;
  };

  window.resetForm = function () {
    $('contact-form').reset();
    $('form-container').classList.remove('hidden');
    $('success-container').classList.add('hidden');
    FIELDS.forEach(function (id) { showError(id, false); });
  };
})();
