// User-provided local recording, cached for offline playback.
(function () {
  const button = document.querySelector('#music-button');
  const music = new Audio('audio/background-music.mp3');
  music.id = 'background-music';
  music.hidden = true;
  document.body.append(music);
  music.loop = true;
  music.preload = 'none';
  music.volume = 0.35;
  let enabled = false;
  let attempt = 0;
  function display(message) {
    button.textContent = message || (enabled ? '♫ 暂停音乐' : '♫ 开启音乐');
    button.setAttribute('aria-pressed', String(enabled));
  }
  function stop() {
    attempt++;
    enabled = false;
    music.pause();
    display();
  }
  button.onclick = async () => {
    if (enabled) return stop();
    enabled = true;
    const current = ++attempt;
    display();
    try {
      // Start directly from a tap to support iPhone/iPad playback permission.
      await music.play();
      if (!enabled || document.hidden) music.pause();
    } catch {
      if (current !== attempt) return;
      enabled = false;
      display('♫ 播放失败，点此重试');
    }
  };
  music.addEventListener('error', () => {
    if (!enabled) return;
    stop();
    display('♫ 播放失败，点此重试');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
  });
  window.addEventListener('pagehide', stop);
  display();
})();
