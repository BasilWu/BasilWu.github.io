/* MosStack 轉換追蹤：LINE / WhatsApp / Email / 電話 / 表單 / Demo 點擊，全部送到 GA4。
   在 GA4 後台把 generate_lead 標為「關鍵事件」即可在報表看到詢問數。 */
(function () {
  function send(name, params) {
    if (typeof window.gtag !== 'function') return;
    params = params || {};
    params.page_path = location.pathname;
    params.transport_type = 'beacon';
    window.gtag('event', name, params);
  }
  window.mosTrack = send;

  function where(a) {
    if (a.closest('nav.nav, .nav')) return 'nav';
    if (a.closest('.float-contact')) return 'float';
    if (a.closest('footer')) return 'footer';
    if (a.closest('.hero')) return 'hero';
    if (a.closest('.blog-cta')) return 'blog_cta';
    if (a.closest('.contact')) return 'cta';
    return 'content';
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var h = a.getAttribute('href') || '';
    var loc = where(a);
    var method = null;
    if (h.indexOf('lin.ee') > -1 || h.indexOf('line.me') > -1) method = 'line';
    else if (h.indexOf('wa.me') > -1) method = 'whatsapp';
    else if (h.indexOf('mailto:') === 0) method = 'email';
    else if (h.indexOf('tel:') === 0) method = 'phone';

    if (method) {
      send('generate_lead', { method: method, cta_location: loc, link_url: a.href });
    } else if (/(^|\/\/)demo-(brand|booking|shop)\.mosstack\.studio/.test(h)) {
      send('click_demo', { demo: (h.match(/demo-(brand|booking|shop)/) || [])[0], cta_location: loc });
    } else if (/^\/?contact(\.html)?$/.test(h) || h === '/contact') {
      send('click_contact_page', { cta_location: loc });
    }
  }, true);
})();
