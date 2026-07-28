// news.js と同じ方式: GitHub raw から members.json を fetch して #members-root に描画する。
// これにより NIMS サーバー等にホストしても、GitHub 更新が即座に反映される。
// members.html と members-en.html は同じ枠を使い、URL で日/英を判定して切り替える。

var GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/materials-modeling-group/homepage/main/';
var MEMBERS_DATA_URL = GITHUB_RAW_BASE + 'data/members.json';
var SAMURAI_BASE = 'https://samurai.nims.go.jp/profiles/';

function detectLang() {
  return location.pathname.indexOf('-en.html') >= 0 ? 'en' : 'ja';
}

function escapeHtml(s) {
  var d = document.createElement('div');
  d.textContent = s == null ? '' : s;
  return d.innerHTML;
}

// _en が空なら _ja にフォールバック（翻訳漏れがあっても表示は崩れない）
function pick(item, key, lang) {
  if (lang === 'en') {
    return item[key + '_en'] || item[key + '_ja'] || '';
  }
  return item[key + '_ja'] || '';
}

// title / additional_roles などは JSON に <br> を含むため escape しない。
// 名前・キーワード等の平文フィールドは escapeHtml で扱う。
function buildButtons(item) {
  var buttons = [];
  if (item.samurai_id) {
    buttons.push(
      '<a href="' + SAMURAI_BASE + encodeURIComponent(item.samurai_id) +
      '" class="samurai-btn" target="_blank">SAMURAI</a>'
    );
  }
  if (item.personal_page_url) {
    buttons.push(
      '<a href="' + escapeHtml(item.personal_page_url) +
      '" class="personal-page-btn" target="_blank">Personal Page</a>'
    );
  }
  if (!buttons.length) return '';
  return '<div class="member-buttons">' + buttons.join('') + '</div>';
}

// Researcher グリッド: photo-area にメール表示、詳細情報あり
function buildResearcherCard(item, lang) {
  var name = escapeHtml(pick(item, 'name', lang));
  var photoBlock;
  if (item.email) {
    photoBlock =
      '<div class="member-photo-area">' +
        '<img class="member-photo" src="' + escapeHtml(item.photo) + '" alt="' + name + '">' +
        '<p class="email"><a href="mailto:' + escapeHtml(item.email) + '">' + escapeHtml(item.email) + '</a></p>' +
      '</div>';
  } else {
    photoBlock = '<img class="member-photo" src="' + escapeHtml(item.photo) + '" alt="' + name + '">';
  }

  var infoParts = ['<h3 class="member-name">' + name + '</h3>'];
  var titleHtml = pick(item, 'title', lang);
  if (titleHtml) infoParts.push('<p class="member-title-label">' + titleHtml + '</p>');
  var rolesHtml = pick(item, 'additional_roles', lang);
  if (rolesHtml) infoParts.push('<p class="member-additional-roles">' + rolesHtml + '</p>');
  var researchTitle = pick(item, 'research_title', lang);
  if (researchTitle) infoParts.push('<p class="research-title">' + escapeHtml(researchTitle) + '</p>');
  var keywords = pick(item, 'keywords', lang);
  if (keywords) infoParts.push('<p class="keywords">' + escapeHtml(keywords) + '</p>');
  infoParts.push(buildButtons(item));

  return '<div class="member-entry">' +
    photoBlock +
    '<div class="member-info">' + infoParts.join('') + '</div>' +
  '</div>';
}

// 3col グリッド: シンプルな写真+タイトル。trainee は所属/期間も表示。
function buildSimpleCard(item, lang) {
  var name = escapeHtml(pick(item, 'name', lang));
  var titleParts = [];
  var titleHtml = pick(item, 'title', lang);
  if (titleHtml) titleParts.push(titleHtml);
  var affiliation = pick(item, 'affiliation', lang);
  if (affiliation) titleParts.push(escapeHtml(affiliation));
  var period = pick(item, 'period', lang);
  if (period) titleParts.push(escapeHtml(period));

  var infoParts = ['<h3 class="member-name">' + name + '</h3>'];
  if (titleParts.length) {
    infoParts.push('<p class="member-title-label">' + titleParts.join('<br>') + '</p>');
  }
  infoParts.push(buildButtons(item));

  return '<div class="member-entry">' +
    '<img class="member-photo" src="' + escapeHtml(item.photo) + '" alt="' + name + '">' +
    '<div class="member-info">' + infoParts.join('') + '</div>' +
  '</div>';
}

// Alumni: bullet list
function buildAlumniItem(item, lang) {
  return '<li>' + escapeHtml(pick(item, 'text', lang)) + '</li>';
}

// セクション単位でグループ化された HTML を組み立てる。
// section-title と subsection-title の親子関係は「section が現れるまでを一群」と扱う。
function renderMembers(data, lang) {
  var root = document.getElementById('members-root');
  if (!root) return;

  var sections = data.sections || [];
  var membersBySection = {};
  (data.members || []).forEach(function (m) {
    if (!membersBySection[m.section]) membersBySection[m.section] = [];
    membersBySection[m.section].push(m);
  });

  var html = [];
  var currentSectionOpen = false;

  sections.forEach(function (sec) {
    var title = lang === 'en' ? sec.title_en : sec.title_ja;
    var list = membersBySection[sec.id] || [];

    if (sec.level === 'section') {
      // 前のセクションを閉じる
      if (currentSectionOpen) html.push('</div>');
      html.push('<div class="member-section fade-in-up">');
      html.push('<h2 class="member-section-title">' + escapeHtml(title) + '</h2>');
      currentSectionOpen = true;
    } else if (sec.level === 'subsection') {
      html.push('<h3 class="member-subsection-title">' + escapeHtml(title) + '</h3>');
    }

    if (sec.grid === 'researcher') {
      html.push('<div class="member-grid-researcher">');
      list.forEach(function (m) { html.push(buildResearcherCard(m, lang)); });
      html.push('</div>');
    } else if (sec.grid === '3col') {
      html.push('<div class="member-grid-3col">');
      list.forEach(function (m) { html.push(buildSimpleCard(m, lang)); });
      html.push('</div>');
    } else if (sec.grid === 'alumni') {
      html.push('<ul class="member-bullet-list">');
      list.forEach(function (m) { html.push(buildAlumniItem(m, lang)); });
      html.push('</ul>');
    }
    // grid === 'none' は見出しのみ（Student セクションなど）
  });

  if (currentSectionOpen) html.push('</div>');
  root.innerHTML = html.join('');
}

function renderIntro(data, lang) {
  var el = document.getElementById('members-intro');
  if (!el) return;
  el.textContent = lang === 'en' ? (data.intro_en || data.intro_ja || '') : (data.intro_ja || '');
}

document.addEventListener('DOMContentLoaded', function () {
  var lang = detectLang();
  fetch(MEMBERS_DATA_URL)
    .then(function (res) {
      if (!res.ok) throw new Error('Failed to load members.json: ' + res.status);
      return res.json();
    })
    .then(function (data) {
      renderIntro(data, lang);
      renderMembers(data, lang);
    })
    .catch(function (err) {
      console.error(err);
      var root = document.getElementById('members-root');
      if (root) {
        root.innerHTML = lang === 'en'
          ? '<p>Failed to load members data.</p>'
          : '<p>メンバー情報の読み込みに失敗しました。</p>';
      }
    });
});
