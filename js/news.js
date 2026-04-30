let newsData = [];

function detectLang() {
  return location.pathname.includes('-en.html') ? 'en' : 'ja';
}

// HTMLエスケープ
function escapeHtml(s) {
  var d = document.createElement('div');
  d.textContent = s == null ? '' : s;
  return d.innerHTML;
}

// urlが指定されていればタイトルをリンクで囲む
function buildTitleHtml(item, title) {
  var safeTitle = escapeHtml(title);
  if (item.url) {
    return '<a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener">' + safeTitle + '</a>';
  }
  return safeTitle;
}

// paper_titleがあれば本文の先頭に表示する。doiが指定されていればDOIリンクになる。
function buildBodyHtml(item, body) {
  if (!item.paper_title) return body || '';
  var safePaperTitle = escapeHtml(item.paper_title);
  var paperTitleHtml;
  if (item.doi) {
    var safeDoi = escapeHtml(item.doi);
    paperTitleHtml = '<a href="https://doi.org/' + safeDoi + '" target="_blank" rel="noopener">' + safePaperTitle + '</a>';
  } else {
    paperTitleHtml = safePaperTitle;
  }
  return '<strong>' + paperTitleHtml + '</strong>' + (body ? '<br>' + body : '');
}

// item.images（画像パスの配列）からサムネイル列のHTMLを組み立てる
function buildImagesHtml(item, sizeClass) {
  if (!item.images || !item.images.length) return '';
  return '<div class="' + sizeClass + '">' +
    item.images.map(function (p) {
      return '<img src="' + escapeHtml(p) + '" alt="" loading="lazy">';
    }).join('') + '</div>';
}

var currentYear = '';

function buildYearTabs(data, lang) {
  var tabsEl = document.getElementById('news-year-tabs');
  if (!tabsEl) return;

  // 年を収集（降順）
  var yearsSet = {};
  data.forEach(function (item) {
    var y = (item.date || '').substring(0, 4);
    if (y) yearsSet[y] = true;
  });
  var years = Object.keys(yearsSet).sort().reverse();
  if (!years.length) return;

  // デフォルトは最新年
  if (!currentYear || !yearsSet[currentYear]) currentYear = years[0];

  tabsEl.innerHTML = '';
  years.forEach(function (y) {
    var tab = document.createElement('span');
    tab.className = 'news-year-tab' + (y === currentYear ? ' active' : '');
    tab.textContent = y;
    tab.addEventListener('click', function () {
      currentYear = y;
      buildYearTabs(data, lang);
      renderNews(data, lang);
    });
    tabsEl.appendChild(tab);
  });
}

function renderNews(data, lang) {
  const list = document.getElementById('news-list');
  if (!list) return;
  list.innerHTML = '';

  data.forEach(function (item, index) {
    // 年フィルタ
    var y = (item.date || '').substring(0, 4);
    if (currentYear && y !== currentYear) return;

    const category = lang === 'en' ? (item.category_en || item.category) : item.category;
    const title = lang === 'en' ? (item.title_en || item.title) : item.title;
    const body = lang === 'en' ? (item.body_en || item.body) : item.body;

    const card = document.createElement('div');
    card.className = 'news-card fade-in-up';
    card.innerHTML =
      '<div class="news-header">' +
        '<span class="category">' + category + '</span>' +
        '<span class="date">' + item.date + '</span>' +
      '</div>' +
      '<h2>' + buildTitleHtml(item, title) + '</h2>' +
      '<p class="preview">' + buildBodyHtml(item, body) + '</p>' +
      buildImagesHtml(item, 'news-thumbs');
    card.style.cursor = 'pointer';
    card.addEventListener('click', function () { openModal(index, lang); });
    // カード内のリンククリックではモーダルを開かない
    card.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function (e) { e.stopPropagation(); });
    });
    list.appendChild(card);
    // fade-in-upのアニメーションを発火させる
    requestAnimationFrame(function () { card.classList.add('visible'); });
  });
}

function openModal(index, lang) {
  var item = newsData[index];
  if (!item) return;
  var category = lang === 'en' ? (item.category_en || item.category) : item.category;
  var title = lang === 'en' ? (item.title_en || item.title) : item.title;
  var body = lang === 'en' ? (item.body_en || item.body) : item.body;

  document.getElementById('modal-category').textContent = category;
  document.getElementById('modal-title').innerHTML = buildTitleHtml(item, title);
  document.getElementById('modal-date').textContent = item.date;
  document.getElementById('modal-content').innerHTML = buildBodyHtml(item, body) + buildImagesHtml(item, 'news-images-large');
  document.getElementById('modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(event) {
  if (!event || event.target === event.currentTarget) {
    document.getElementById('modal').classList.add('hidden');
    document.body.style.overflow = '';
  }
}

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
    closeModal();
  }
});

// GitHub上の news.json を直接読みに行く。これにより、NIMSサーバー等にホストしても
// ニュース更新（Admin → GAS → GitHub repo）の結果が即座に公開ページに反映される。
// （ホスト先を問わず常に GitHub の最新を参照する）
var NEWS_DATA_URL = 'https://raw.githubusercontent.com/materials-modeling-group/homepage/main/data/news.json';

document.addEventListener('DOMContentLoaded', function () {
  var lang = detectLang();
  fetch(NEWS_DATA_URL)
    .then(function (res) {
      if (!res.ok) throw new Error('Failed to load news.json: ' + res.status);
      return res.json();
    })
    .then(function (data) {
      newsData = data;
      buildYearTabs(data, lang);
      renderNews(data, lang);
    })
    .catch(function (err) {
      console.error(err);
      document.getElementById('news-list').innerHTML = '<p>ニュースの読み込みに失敗しました。</p>';
    });
});