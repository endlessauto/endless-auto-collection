(function () {
  var SRC = '/audio/innerbloom.mp3';
  var TIME_KEY = 'eac.music.time';
  var PLAYING_KEY = 'eac.music.playing';

  var audio = document.createElement('audio');
  audio.id = 'bg-music';
  audio.src = SRC;
  audio.loop = true;
  audio.preload = 'auto';
  document.body.appendChild(audio);

  var savedTime = parseFloat(localStorage.getItem(TIME_KEY));
  if (!isNaN(savedTime)) {
    audio.addEventListener('loadedmetadata', function () {
      audio.currentTime = savedTime;
    }, { once: true });
  }

  var btn = document.createElement('button');
  btn.id = 'bg-music-toggle';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Toggle background music');
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;width:44px;height:44px;border-radius:9999px;background:rgba(10,10,10,.75);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .2s';
  var ICON_ON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f0c869" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>';
  var ICON_OFF = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';

  function render() {
    btn.innerHTML = audio.paused ? ICON_OFF : ICON_ON;
  }

  function persist() {
    localStorage.setItem(TIME_KEY, audio.currentTime);
    localStorage.setItem(PLAYING_KEY, audio.paused ? '0' : '1');
    render();
  }

  audio.addEventListener('timeupdate', persist);
  audio.addEventListener('play', persist);
  audio.addEventListener('pause', persist);
  window.addEventListener('pagehide', persist);

  btn.addEventListener('click', function () {
    if (audio.paused) {
      audio.play().catch(function () {});
    } else {
      audio.pause();
    }
  });

  document.body.appendChild(btn);
  render();

  function tryAutoPlay() {
    audio.play().then(function () {
      document.removeEventListener('click', tryAutoPlay);
      document.removeEventListener('keydown', tryAutoPlay);
      document.removeEventListener('touchstart', tryAutoPlay);
    }).catch(function () {});
  }

  var wasPlaying = localStorage.getItem(PLAYING_KEY);
  if (wasPlaying === '1' || wasPlaying === null) {
    tryAutoPlay();
    document.addEventListener('click', tryAutoPlay);
    document.addEventListener('keydown', tryAutoPlay);
    document.addEventListener('touchstart', tryAutoPlay);
  }
})();
