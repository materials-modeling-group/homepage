// news.js と同じ方式: GitHub raw から MD を fetch して #research-content に描画する。
// これにより NIMS サーバー等にホストしても、GitHub 更新が即座に反映される。
var GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/materials-modeling-group/homepage/main/';

function detectResearchLang() {
  return location.pathname.indexOf('-en.html') >= 0 ? 'en' : 'ja';
}

document.addEventListener('DOMContentLoaded', function () {
  var target = document.getElementById('research-content');
  if (!target) return;
  var lang = detectResearchLang();
  var mdUrl = GITHUB_RAW_BASE + (lang === 'en' ? 'data/research-en.md' : 'data/research.md');
  var errorText = lang === 'en' ? 'Failed to load content' : 'コンテンツの読み込みに失敗しました';

  fetch(mdUrl)
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    })
    .then(function (md) {
      var html = window.marked ? window.marked.parse(md) : md;
      target.innerHTML = html;
    })
    .catch(function () {
      target.innerHTML = '<p class="research-loading">' + errorText + '</p>';
    });
});
