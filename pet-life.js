/* Pet voices are original synthesized chirps, not animal recordings. */
(function () {
  let ctx, timer, sleepTimer;
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
  function wake() {
    clearTimeout(timer);
    clearTimeout(sleepTimer);
    $("#pet").classList.remove("dozing", "snuggle");
    $("#sleep-mask")?.remove();
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
          const mask = document.createElement("span");
          mask.id = "sleep-mask";
          mask.innerHTML =
            '<span class="sleep-lids">⌣ ⌣</span><small>z Z z</small>';
          mask.setAttribute("aria-hidden", "true");
          $("#pet").append(mask);
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
  const scenes = ["月光湖畔", "晨雾花谷", "暮色星丘"];
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
