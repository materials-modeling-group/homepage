(function () {
  'use strict';

  var GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/materials-modeling-group/homepage/main/';
  var DATA_URL = GITHUB_RAW_BASE + 'data/publications.json';

  function detectLang() {
    return location.pathname.includes('-en.html') ? 'en' : 'ja';
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : s;
    return d.innerHTML;
  }

  // 現在の状態
  var state = {
    lang: 'ja',
    data: null,           // {sections: [...]}
    sectionIndex: 0,      // 現在選択中のセクション（sections配列のindex）
    yearByIndex: {},      // sectionIndex → 現在選択中の年 (string)、'ALL' で全年表示
  };

  function currentSection() {
    return state.data.sections[state.sectionIndex];
  }

  function renderSectionTabs() {
    var el = document.getElementById('pub-section-tabs');
    if (!el) return;
    el.innerHTML = '';
    state.data.sections.forEach(function (sec, i) {
      var tab = document.createElement('span');
      tab.className = 'pub-section-tab' + (i === state.sectionIndex ? ' active' : '');
      var count = sec.years.reduce(function (n, y) { return n + y.entries.length; }, 0);
      tab.innerHTML = escapeHtml(sec.label) + ' <span class="pub-section-count">(' + count + ')</span>';
      tab.addEventListener('click', function () {
        state.sectionIndex = i;
        render();
      });
      el.appendChild(tab);
    });
  }

  function renderYearTabs() {
    var el = document.getElementById('pub-year-tabs');
    if (!el) return;
    el.innerHTML = '';
    var sec = currentSection();
    if (!sec.years.length) return;

    var current = state.yearByIndex[state.sectionIndex];
    if (current === undefined) {
      // 初回はデフォルト「すべて」
      current = 'ALL';
      state.yearByIndex[state.sectionIndex] = current;
    }

    // 「すべて」タブ
    var totalCount = sec.years.reduce(function (n, y) { return n + y.entries.length; }, 0);
    var allTab = document.createElement('span');
    allTab.className = 'pub-year-tab' + (current === 'ALL' ? ' active' : '');
    allTab.textContent = (state.lang === 'en' ? 'All' : 'すべて') + ' (' + totalCount + ')';
    allTab.addEventListener('click', function () {
      state.yearByIndex[state.sectionIndex] = 'ALL';
      render();
    });
    el.appendChild(allTab);

    sec.years.forEach(function (y) {
      var tab = document.createElement('span');
      tab.className = 'pub-year-tab' + (y.year === current ? ' active' : '');
      tab.textContent = y.year + ' (' + y.entries.length + ')';
      tab.addEventListener('click', function () {
        state.yearByIndex[state.sectionIndex] = y.year;
        render();
      });
      el.appendChild(tab);
    });
  }

  function renderList() {
    var list = document.getElementById('pub-list');
    if (!list) return;
    list.innerHTML = '';
    var sec = currentSection();
    if (!sec.years.length) {
      list.innerHTML = '<p class="pub-empty">' + (state.lang === 'en' ? 'No entries.' : '該当する業績がありません。') + '</p>';
      return;
    }

    var selected = state.yearByIndex[state.sectionIndex];
    var yearsToShow = selected === 'ALL'
      ? sec.years
      : sec.years.filter(function (y) { return y.year === selected; });

    yearsToShow.forEach(function (y) {
      var yearHeader = document.createElement('div');
      yearHeader.className = 'pub-year-header';
      yearHeader.textContent = y.year;
      list.appendChild(yearHeader);

      var ul = document.createElement('ul');
      ul.className = 'pub-entries';
      y.entries.forEach(function (entryHtml) {
        var li = document.createElement('li');
        li.className = 'pub-entry';
        // publications.json のエントリは事前にサニタイズ済みのHTML断片（<a>と<span class="open_access">のみ許可）
        li.innerHTML = entryHtml;
        ul.appendChild(li);
      });
      list.appendChild(ul);
    });
  }

  function renderUpdated() {
    var el = document.getElementById('pub-updated');
    if (!el || !state.data.fetched_at) return;
    var d = state.data.fetched_at;
    var label = state.lang === 'en' ? 'Last synced: ' : '最終同期: ';
    el.textContent = label + d;
  }

  function render() {
    renderSectionTabs();
    renderYearTabs();
    renderList();
  }

  document.addEventListener('DOMContentLoaded', function () {
    state.lang = detectLang();
    fetch(DATA_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load publications.json: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        state.data = {
          sections: (data[state.lang] || {}).sections || [],
          fetched_at: data.fetched_at || '',
        };
        if (!state.data.sections.length) {
          document.getElementById('pub-list').innerHTML =
            '<p class="pub-empty">' + (state.lang === 'en' ? 'No publications available.' : '業績データがありません。') + '</p>';
          return;
        }
        render();
        renderUpdated();
      })
      .catch(function (err) {
        console.error(err);
        var el = document.getElementById('pub-list');
        if (el) el.innerHTML = '<p class="pub-empty">' + (state.lang === 'en' ? 'Failed to load publications.' : '業績の読み込みに失敗しました。') + '</p>';
      });
  });
})();
