// Original 32-note theme; generated locally, no recording or remote audio.
(function () {
  let ctx,
    timer,
    enabled = false,
    next = 0,
    step = 0,
    master,
    ambient;
  const melody = [
    72, 76, 79, 81, 79, 76, 74, 67, 69, 72, 76, 79, 76, 72, 69, 67, 65, 69, 72,
    77, 76, 72, 69, 65, 67, 71, 74, 79, 77, 74, 71, 67,
  ];
  const chords = [
    [48, 52, 55],
    [45, 48, 52],
    [41, 45, 48],
    [43, 47, 50],
  ];
  function note(midi, at, duration, volume, type = "sine") {
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    osc.connect(gain);
    gain.connect(master);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.start(at);
    osc.stop(at + duration + 0.02);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
  function schedule() {
    if (!enabled || document.hidden) return;
    while (next < ctx.currentTime + 0.3) {
      const bar = Math.floor(step / 8) % 4;
      const scene = window.dailyScene || 0,
        shift = [0, 5, -3][scene];
      note(melody[(step + scene * 8) % 32] + shift, next, 1.2, 0.1, "sine");
      if (step % 8 === 0) {
        if (scene === 1) {
          note(91, next, 0.16, 0.03);
          note(96, next + 0.2, 0.2, 0.025);
        } else if (scene === 0) note(84, next, 2, 0.025);
        else {
          note(98, next, 0.07, 0.012);
          note(98, next + 0.15, 0.07, 0.012);
        }
      }
      if (step % 2 === 0)
        note(
          chords[bar][(step / 2) % 3] + 12 + shift,
          next,
          1.6,
          0.06,
          "triangle",
        );
      if (step % 8 === 0)
        chords[bar].forEach((n) => note(n + shift, next, 4, 0.04));
      step++;
      next += [0.56, 0.45, 0.64][scene];
    }
  }
  async function toggle() {
    if (enabled) {
      enabled = false;
      clearInterval(timer);
      await ctx.suspend();
    } else {
      try {
        ctx ??= new (window.AudioContext || window.webkitAudioContext)();
        if (!master) {
          master = ctx.createGain();
          master.gain.value = 0.4;
          master.connect(ctx.destination);
        }
        if (!ambient) {
          const buffer = ctx.createBuffer(
              1,
              ctx.sampleRate * 3,
              ctx.sampleRate,
            ),
            data = buffer.getChannelData(0);
          let last = 0;
          for (let i = 0; i < data.length; i++) {
            last = (last + (Math.random() * 2 - 1) * 0.015) / 1.015;
            data[i] = last;
          }
          ambient = ctx.createBufferSource();
          ambient.buffer = buffer;
          ambient.loop = true;
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = [700, 1200, 450][window.dailyScene || 0];
          const breeze = ctx.createGain();
          breeze.gain.value = 0.12;
          ambient.connect(filter);
          filter.connect(breeze);
          breeze.connect(master);
          ambient.start();
        }
        await ctx.resume();
        enabled = true;
        next = ctx.currentTime + 0.05;
        schedule();
        timer = setInterval(schedule, 100);
      } catch {
        $("#music-button").textContent = "音乐暂不可用";
        return;
      }
    }
    $("#music-button").textContent = enabled ? "♫ 暂停音乐" : "♫ 开启音乐";
    $("#music-button").setAttribute("aria-pressed", String(enabled));
  }
  $("#music-button").onclick = toggle;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && enabled) toggle();
  });
})();
