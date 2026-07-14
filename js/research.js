(function () {
  var target = document.getElementById('research-content');
  if (!target) return;
  var source = target.getAttribute('data-source') || 'data/research.md';
  var errorText = target.getAttribute('data-error') || 'Load failed';

  fetch(source + '?t=' + Date.now())
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    })
    .then(function (md) {
      var html = window.marked ? window.marked.parse(md) : md;
      while (target.firstChild) target.removeChild(target.firstChild);
      target.insertAdjacentHTML('beforeend', html);
    })
    .catch(function () {
      while (target.firstChild) target.removeChild(target.firstChild);
      var p = document.createElement('p');
      p.className = 'research-loading';
      p.textContent = errorText;
      target.appendChild(p);
    });
})();
