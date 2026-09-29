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
  if (!isNaN(savedTime)) audio.currentTime = savedTime;

  function persist() {
    localStorage.setItem(TIME_KEY, audio.currentTime);
    localStorage.setItem(PLAYING_KEY, audio.paused ? '0' : '1');
  }

  audio.addEventListener('timeupdate', persist);
  window.addEventListener('pagehide', persist);

  function tryPlay() {
    audio.play().then(function () {
      persist();
      document.removeEventListener('click', tryPlay);
      document.removeEventListener('keydown', tryPlay);
      document.removeEventListener('touchstart', tryPlay);
    }).catch(function () {});
  }

  var wasPlaying = localStorage.getItem(PLAYING_KEY);
  if (wasPlaying === '1' || wasPlaying === null) {
    tryPlay();
    document.addEventListener('click', tryPlay);
    document.addEventListener('keydown', tryPlay);
    document.addEventListener('touchstart', tryPlay);
  }
})();
