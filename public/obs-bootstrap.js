/* Set transparency before the application loads; allowed by script-src 'self'. */
(() => {
  if (['/raffle', '/director'].includes(location.pathname)) return;
  const query = new URLSearchParams(location.search);
  const obs = ['/obs', '/obs-tournament', '/obs-raffle', '/obs-live'].includes(location.pathname)
    || ['obs', 'obs-tournament', 'obs-raffle'].some(key => query.get(key) === '1');
  if (obs) document.documentElement.dataset.presentation = 'obs';
})();

