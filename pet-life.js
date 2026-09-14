/* Pet voices are original synthesized chirps, not animal recordings. */
(function () {
  let ctx, timer, sleepTimer, snoreTimer;
  const voices = [
    [740, 1110, 1480, "sine"],
    [220, 390, 300, "triangle"],
    [1120, 1480, 1220, "sine"],
    [680, 1020, 790, "triangle"],
    [520, 880, 420, "sine"],
    [320, 510, 340, "triangle"],
  ];
  function voice(action = "touch") {
    if (!sound) return;
    try {
      ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume();
      const v = voices[state.species] || voices[0],
        count = action === "sleep" ? 2 : 3;
      for (let i = 0; i < count; i++) {
        const o = ctx.createOscillator(),
          g = ctx.createGain(),
          t = ctx.currentTime + i * 0.17;
        o.type = v[3];
        o.frequency.setValueAtTime(v[i] * (action === "sleep" ? 0.65 : 1), t);
        o.frequency.exponentialRampToValueAtTime(
          v[(i + 1) % 3] * (action === "sleep" ? 0.45 : 1.1),
          t + 0.18,
        );
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.045, t + 0.025);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t);
        o.stop(t + 0.27);
        o.onended = () => {
          o.disconnect();
          g.disconnect();
        };
      }
    } catch {}
  }
  function snore() {
    if (!sound || document.hidden || !$("#pet").classList.contains("dozing"))
      return;
    try {
      ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume();
      const t = ctx.currentTime,
        base = [165, 95, 210, 140, 110, 85][state.species];
      const o = ctx.createOscillator(),
        g = ctx.createGain(),
        lfo = ctx.createOscillator(),
        depth = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(base, t);
      o.frequency.linearRampToValueAtTime(base * 0.75, t + 1.2);
      lfo.frequency.value = 22 + state.species * 2;
      depth.gain.value = base * 0.06;
      lfo.connect(depth);
      depth.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.023, t + 0.45);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      lfo.start(t);
      o.stop(t + 1.6);
      lfo.stop(t + 1.6);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
        lfo.disconnect();
        depth.disconnect();
      };
    } catch {}
  }
  function wake() {
    clearTimeout(timer);
    document.querySelectorAll(".pet-prop").forEach((e) => e.remove());
    clearTimeout(sleepTimer);
    clearInterval(snoreTimer);
    if (state.phase === "pet") sprite($("#main-sprite"));
    $("#pet").classList.remove("dozing", "snuggle");
    $(".sleep-breath")?.remove();
    $("#world").classList.remove("night");
    $("#pet").setAttribute("aria-label", "摸摸" + petName());
  }
  function act(action) {
    if (state.phase !== "pet") return;
    wake();
    clearTimeout(reactionTimer);
    const info = {
      cookie: ["nibble", "🍪", "咔嚓咔嚓！星星饼干香香脆脆。"],
      fruit: ["munch", "🍎", "啊呜，好甜！给你也留一口。"],
      toy: ["tumble", "🧶", "抓到线球啦！再滚给我一次嘛。"],
      feather: ["flutter", "🪶", "羽毛飘呀飘，小爪子够一够！"],
      touch: ["nuzzle", "♡", "再摸摸这里，好舒服呀。"],
      play: ["flutter", "✦", "陪我追一颗闪闪的星星吧！"],
    };
    if (action === "sleep") {
      $("#world").classList.add("night");
      $("#pet").className = "pet snuggle";
      say("先扑过来抱抱你……再乖乖回窝，晚安。");
      voice("sleep");
      burst("♡", 6);
      sleepTimer = setTimeout(
        () => {
          $("#pet").className = "pet dozing";
          const stage = ["baby", "toddler", "juvenile", "grown", "ultimate"][
            M.growth(state.completedDates.length).index
          ];
          $("#main-sprite").style.backgroundImage =
            'url("assets/pets-sleep-' + stage + '.png")';
          $("#main-sprite").classList.add("sleep-art");
          const breath = document.createElement("span");
          breath.className = "sleep-breath";
          breath.textContent = "· · ·";
          breath.setAttribute("aria-hidden", "true");
          $("#pet").append(breath);
          snore();
          snoreTimer = setInterval(snore, 4200);
          $("#pet").setAttribute(
            "aria-label",
            "正在睡觉的" + petName() + "，轻点唤醒",
          );
          say("呼……睡着啦。轻轻点我，就会醒来。");
        },
        reduced.matches ? 50 : 2200,
      );
      return;
    }
    const [motion, icon, line] = info[action] || info.touch;
    $("#pet").className = "pet " + motion;
    say(line);
    voice(action);
    burst(icon, 9);
    document.querySelectorAll(".pet-prop").forEach((e) => e.remove());
    const prop = document.createElement("span");
    prop.className = "pet-prop prop-" + action;
    prop.textContent = icon;
    prop.setAttribute("aria-hidden", "true");
    $("#pet").append(prop);
    timer = setTimeout(() => {
      prop.remove();
      $("#pet").className = "pet";
    }, 2100);
  }
  window.PetLife = { act, voice, wake };

  interact = (action) => act(action === "feed" ? "cookie" : action);
  const previous = $("#pet").onclick;
  $("#pet").onclick = () => (state.phase === "pet" ? act("touch") : previous());
  const scenes = ["月光湖畔", "暖金花谷", "翡翠森林"];
  function scene() {
    const date = M.chinaDate(),
      i = DailyPlay.seed(date) % 3;
    $("#world").dataset.scene = String(i);
    $("#scene-label").textContent = "今日小旅行 · " + scenes[i];
    window.dailyScene = i;
  }
  const label = document.createElement("p");
  label.id = "scene-label";
  label.className = "scene-label";
  $(".forest-nav").after(label);
  scene();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scene();
  });
  setInterval(scene, 60000);
})();
