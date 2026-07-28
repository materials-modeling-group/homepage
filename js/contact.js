// Contact フォーム: 件名 / 名前 / ご連絡先 / 内容 を mailto: 経由で出村さん宛に送る
// 宛先アドレスは HTML には書かず JS で組み立てて bot によるスクレイピングを回避する。
(function () {
  'use strict';

  var RECIPIENT_USER = 'DEMURA.Masahiko';
  var RECIPIENT_DOMAIN = 'nims.go.jp';

  var LANG = document.documentElement.lang === 'en' ? 'en' : 'ja';
  var LABEL = LANG === 'en'
    ? { subject: 'Subject', name: 'Name', contact: 'Contact', message: 'Message' }
    : { subject: '件名', name: 'お名前', contact: 'ご連絡先', message: 'お問い合わせ内容' };

  var FIELDS = ['subject', 'name', 'contact', 'message'];

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

    // subject / name / contact: 必須（空文字NG）
    ['subject', 'name', 'contact'].forEach(function (id) {
      var ok = values[id].length > 0;
      showError(id, !ok);
      if (!ok) valid = false;
    });

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
      LABEL.contact + ': ' + v.contact + '\n\n' +
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
