/* 首頁首屏作品輪播：自動輪播、滑過暫停、鍵盤與觸控操作；尊重「減少動態」設定 */
(function () {
  var root = document.getElementById('heroCarousel');
  if (!root) return;
  var track = document.getElementById('heroTrack');
  var slides = Array.prototype.slice.call(track.children);
  var dotsEl = document.getElementById('heroDots');
  var count = document.getElementById('heroCount');
  var DUR = 5500;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var i = 0, timer = null;
  root.style.setProperty('--hc-dur', DUR + 'ms');
  if (reduce) root.classList.add('is-static');

  var dots = slides.map(function (s, n) {
    var d = document.createElement('button');
    d.type = 'button';
    d.className = 'hero-carousel__dot';
    d.setAttribute('aria-label', '第 ' + (n + 1) + ' 個作品');
    d.addEventListener('click', function () { go(n); restart(); });
    dotsEl.appendChild(d);
    return d;
  });
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function go(n) {
    i = (n + slides.length) % slides.length;
    track.style.transform = 'translateX(' + (-100 * i) + '%)';
    dots.forEach(function (d, k) { d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    slides.forEach(function (s, k) {
      s.tabIndex = k === i ? 0 : -1;
      s.setAttribute('aria-hidden', k === i ? 'false' : 'true');
    });
    count.textContent = pad(i + 1) + ' / ' + pad(slides.length);
  }
  function restart() {
    clearTimeout(timer);
    var d = dots[i];
    d.classList.add('is-reset'); void d.offsetWidth; d.classList.remove('is-reset');
    if (reduce || root.classList.contains('is-paused')) return;
    timer = setTimeout(function () { go(i + 1); restart(); }, DUR);
  }
  function pause() { root.classList.add('is-paused'); clearTimeout(timer); }
  function resume() { root.classList.remove('is-paused'); restart(); }

  document.getElementById('heroNext').addEventListener('click', function () { go(i + 1); restart(); });
  document.getElementById('heroPrev').addEventListener('click', function () { go(i - 1); restart(); });
  root.addEventListener('mouseenter', pause);
  root.addEventListener('mouseleave', resume);
  root.addEventListener('focusin', pause);
  root.addEventListener('focusout', resume);
  root.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { go(i + 1); restart(); }
    if (e.key === 'ArrowLeft') { go(i - 1); restart(); }
  });

  var x0 = null;
  track.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; pause(); }, { passive: true });
  track.addEventListener('touchend', function (e) {
    if (x0 !== null) {
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
    }
    x0 = null; resume();
  });
  document.addEventListener('visibilitychange', function () { document.hidden ? pause() : resume(); });

  go(0); restart();
})();
