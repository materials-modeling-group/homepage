// トップページ (index.html / index-en.html) のニュースタイムライン表示。
// CSP 対応で、以前は index.html 末尾のインライン <script> ブロックに書かれていた
// ロジックをこの外部ファイルに外出ししている。
(function () {
  'use strict';

  var NEWS_LIST_URL = 'https://raw.githubusercontent.com/materials-modeling-group/homepage/main/data/news.json';

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : s;
    return d.innerHTML;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var el = document.getElementById('top-news');
    if (!el) return;
    var lang = location.pathname.indexOf('-en.html') >= 0 ? 'en' : 'ja';
    var newsPage = lang === 'en' ? 'news-en.html' : 'news.html';

    fetch(NEWS_LIST_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        data.slice(0, 5).forEach(function (item) {
          var title = lang === 'en' ? (item.title_en || item.title) : item.title;
          var a = document.createElement('a');
          a.className = 'news-timeline-item';
          if (item.url) {
            a.href = item.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
          } else {
            a.href = newsPage;
          }
          a.innerHTML = '<span class="date">' + escapeHtml(item.date || '') + '</span><span class="news-title">' + escapeHtml(title) + '</span>';
          el.appendChild(a);
        });
        el.classList.add('visible');
      });
  });
})();
