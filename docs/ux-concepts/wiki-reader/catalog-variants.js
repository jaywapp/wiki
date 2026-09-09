const mobileNavigation = document.createElement('nav');
mobileNavigation.className = 'mobile-navigation';
mobileNavigation.setAttribute('aria-label', '모바일 문서 이동');
mobileNavigation.innerHTML = '<button type="button" aria-pressed="true">문서 탐색</button><button type="button" aria-pressed="false">본문 읽기</button>';
document.body.append(mobileNavigation);
const [browseButton, readButton] = mobileNavigation.querySelectorAll('button');
function setReading(reading) {
  browseButton.setAttribute('aria-pressed', String(!reading));
  readButton.setAttribute('aria-pressed', String(reading));
}
browseButton.addEventListener('click', () => {
  setReading(false);
  document.querySelector('.collection').scrollIntoView({behavior:'instant', block:'start'});
  document.getElementById('search').focus({preventScroll:true});
});
readButton.addEventListener('click', () => {
  setReading(true);
  document.getElementById('reader').scrollIntoView({behavior:'instant', block:'start'});
  document.getElementById('reader').focus({preventScroll:true});
});
document.getElementById('results').addEventListener('click', event => {
  if(event.target.closest('.result')) setReading(true);
});
const readerObserver = new IntersectionObserver(entries => {
  if (matchMedia('(max-width:800px)').matches) setReading(entries[0].isIntersecting);
}, {rootMargin:'0px 0px -65% 0px', threshold:0});
readerObserver.observe(document.getElementById('reader'));
