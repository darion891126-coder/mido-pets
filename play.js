const artSheets = [
  "pets-gallery-baby",
  "pets-gallery-juvenile",
  "pets-gallery-grown",
  "pets-gallery-ultimate",
];
const finalDetails = [
  "彩虹羽翼 · 星辉独角",
  "水晶翼冠 · 云海守护",
  "月光斗篷 · 梦境旅人",
  "星光尾饰 · 森林精灵",
  "魔法飞毯 · 星空漫游",
  "太阳徽章 · 冒险披风",
];
function portrait(species, index = 0, framed = false) {
  const stage = ["baby", "juvenile", "grown", "ultimate"][index];
  const sheet = framed ? "pets-gallery-" + stage : artSheets[index];
  return `<span class="gallery-art ${framed ? "gallery-framed" : ""}" data-species="${species}" data-stage="${index}" style="background-image:url('assets/${sheet}.png');background-position:${M.pets[species].pos}" role="img" aria-label="${safe(M.pets[species].species)}"></span>`;
}
function gallery() {
  const owned = [
    ...(state.companions || []).filter((p) => p.id !== state.activePetId),
    { id: state.activePetId, pet: state },
  ];
  $("#gallery-content").innerHTML =
    `<span class="dialog-eyebrow">星光森林 · 伙伴图鉴</span><h2>每一种相遇，都有惊喜</h2><p>看看六位伙伴从幼年到最终形态的变化。</p><div class="gallery-tabs">${M.stages.map((s, i) => `<button data-gallery-stage="${i}" aria-pressed="${i === 0}">${s.day}日 · ${s.title}</button>`).join("")}</div><div id="species-grid" class="species-grid"></div><h3>我的伙伴</h3><p>每位伙伴累计30个成长日后，可邀请一位新伙伴。切换不会丢失进度；当天打卡只让当前伙伴成长，奖励背包共用。</p><div class="owned-list">${owned.map((p) => `<button data-switch-pet="${safe(p.id || "")}" ${p.id === state.activePetId ? "disabled" : ""}>${p.pet.species === null ? "🥚" : M.pets[p.pet.species].species} · ${safe(p.pet.name || "等待取名")} · ${p.pet.completedDates.length}日${p.id === state.activePetId ? "（当前）" : ""}</button>`).join("")}</div><button class="primary" id="another-pet" ${state.phase !== "pet" || state.completedDates.length < 30 || state.adoptionUsed ? "disabled" : ""}>邀请一位新伙伴</button><p id="gallery-note" role="status"></p>`;
  const show = (index) => {
    $("#species-grid").innerHTML = M.pets
      .map(
        (pet, i) =>
          `<article>${portrait(i, index, true)}<h3>${pet.species}</h3><p>${index === 3 ? finalDetails[i] : pet.trait}</p></article>`,
      )
      .join("");
    document
      .querySelectorAll("[data-gallery-stage]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          Number(b.dataset.galleryStage) === index,
        ),
      );
  };
  document
    .querySelectorAll("[data-gallery-stage]")
    .forEach((b) => (b.onclick = () => show(Number(b.dataset.galleryStage))));
  document.querySelectorAll("[data-switch-pet]").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          await changeHomework((s) => {
            Collection.ensure(s, crypto.randomUUID());
            Collection.select(s, b.dataset.switchPet);
          });
          gallery();
        } catch (e) {
          $("#gallery-note").textContent = e.message;
        }
      }),
  );
  $("#another-pet").onclick = async () => {
    try {
      await changeHomework((s) => {
        Collection.ensure(s, crypto.randomUUID());
        Collection.adopt(s, crypto.randomUUID());
      });
      questionIndex = 0;
      render();
      $("#gallery-dialog").close();
    } catch (e) {
      $("#gallery-note").textContent = e.message;
    }
  };
  show(0);
  $("#gallery-dialog").showModal();
}
$("#gallery-button").onclick = gallery;
let stopGame = () => {};
const gameNames = DailyPlay.games;
const BUDGET_KEY = "mido-play-minutes-v1";
function budgetLeft() {
  try {
    return DailyPlay.remaining(
      JSON.parse(localStorage.getItem(BUDGET_KEY)),
      M.chinaDate(),
    );
  } catch {
    return 0;
  }
}
function reserveSecond() {
  const date = M.chinaDate(),
    left = budgetLeft();
  if (left <= 0) return false;
  try {
    localStorage.setItem(
      BUDGET_KEY,
      JSON.stringify({ date, used: 601 - left }),
    );
    return true;
  } catch {
    return false;
  }
}
function clockText() {
  const left = Math.floor(budgetLeft());
  return (
    String(Math.floor(left / 60)).padStart(2, "0") +
    ":" +
    String(left % 60).padStart(2, "0")
  );
}
function unlockedGames() {
  const day = state.homework?.days[M.chinaDate()];
  return day?.credited && state.phase === "pet"
    ? DailyPlay.daily(M.chinaDate())
    : [];
}
function playground() {
  stopGame();
  const unlocked = unlockedGames();
  $("#games-content").innerHTML =
    `<span class="dialog-eyebrow">今天的相伴时光</span><h2>和${safe(petName())}一起玩</h2><p>${unlocked.length ? `今天随机开放 3 个小游戏，合计最多玩 10 分钟。` : "完成今天全部约定后，随机开放 3 个小游戏。"}</p><p class="game-clock">今天剩余 ${clockText()}</p><div class="game-menu">${Object.entries(
      gameNames,
    )
      .map(
        ([key, name]) =>
          `<button class="primary" data-game="${key}" ${unlocked.includes(key) && budgetLeft() > 0 ? "" : "disabled"}>${{ race: "🏁", hide: "🌿", disc: "🥏", words: "🔤", memory: "🪄", stars: "🌟", lily: "🪷", butterfly: "🦋", fruit: "🍎" }[key]} ${name}${state.playHistory?.[M.chinaDate()]?.includes(key) ? " · 玩过啦" : ""}</button>`,
      )
      .join(
        "",
      )}</div><p class="quiz-note">小游戏只奖励快乐，不增加成长日，也不消耗背包。</p>`;
  document
    .querySelectorAll("[data-game]")
    .forEach((b) => (b.onclick = () => startGame(b.dataset.game)));
  $("#games-dialog").showModal();
}
$("#games-button").onclick = playground;
$("#games-dialog").addEventListener("close", () => stopGame());
async function finishGame(kind, date) {
  stopGame();
  try {
    await changeHomework((s) => {
      s.playHistory ??= {};
      const done = (s.playHistory[date] ??= []);
      if (!done.includes(kind)) done.push(kind);
      const keys = Object.keys(s.playHistory).sort();
      while (keys.length > 90) delete s.playHistory[keys.shift()];
    });
  } catch (error) {
    $("#games-content").innerHTML =
      '<h2>回忆暂时没能保存</h2><p>请先导出存档，检查设备储存空间后再试。</p><button id="back-games" class="primary">回到游乐场</button>';
    $("#back-games").onclick = playground;
    return;
  }
  $("#games-content").innerHTML =
    `<span class="dialog-eyebrow">今天又多了一个小回忆</span>${portrait(state.species, M.growth(state.completedDates.length).index)}<h2>${safe(petName())}开心地扑向你！</h2><p>一起玩的时光，才是最棒的礼物。</p><button id="back-games" class="primary">再挑一个游戏</button>`;
  $("#back-games").onclick = playground;
  burst("♡");
  tone("adopt");
}
function startGame(kind) {
  if (!unlockedGames().includes(kind) || budgetLeft() <= 0) return;
  stopGame();
  let frame = 0,
    alive = true;
  const date = M.chinaDate();
  let clockTimer;
  stopGame = () => {
    alive = false;
    clearInterval(clockTimer);
    cancelAnimationFrame(frame);
  };
  const content = $("#games-content");
  content.innerHTML = `<span class="dialog-eyebrow">${gameNames[kind]}</span><h2>${safe(petName())}准备好啦</h2><p class="game-clock" id="game-clock"></p><div class="game-buddy">${portrait(state.species, M.growth(state.completedDates.length).index)}</div><div id="game-arena"></div><p id="game-note" role="status"></p><button class="text-button" id="quit-game">回到游乐场</button>`;
  $("#quit-game").onclick = playground;
  const clockTick = () => {
    if (!alive) return;
    if (document.hidden || M.chinaDate() !== date || !reserveSecond()) {
      stopGame();
      playground();
      return;
    }
    $("#game-clock").textContent =
      "今天剩余 " + clockText() + " · 每日共10分钟";
  };
  clockTick();
  if (!alive) return;
  clockTimer = setInterval(clockTick, 1000);
  const cheer = () => {
    window.PetLife?.voice("play");
    const buddy = $(".game-buddy");
    buddy?.classList.remove("cheer");
    requestAnimationFrame(() => buddy?.classList.add("cheer"));
  };
  if (["lily", "butterfly", "fruit"].includes(kind)) {
    $(".game-buddy").hidden = true;
    startAdventure(
      kind,
      () => alive,
      () => finishGame(kind, date),
      cheer,
    );
    return;
  }
  if (["words", "memory", "stars"].includes(kind)) {
    startExtraGame(
      kind,
      () => alive,
      () => finishGame(kind, date),
      cheer,
    );
    return;
  }
  if (kind === "race") {
    let progress = 0;
    $("#game-arena").innerHTML =
      `<div class="race-track"><div id="race-runner">${portrait(state.species, 0)}</div><span class="race-finish">🏁</span></div><button class="primary" id="race-step">轻点，为小伙伴加油</button>`;
    $("#game-note").textContent = "一起跑过12段小路，慢慢来；计入今日10分钟。";
    $("#race-step").onclick = () => {
      if (!alive) return;
      progress++;
      cheer();
      $("#race-runner").style.left = (progress / 12) * 70 + "%";
      $("#game-note").textContent = `已经跑过 ${progress} / 12 段小路`;
      tone();
      if (progress === 12) finishGame(kind, date);
    };
  } else if (kind === "hide") {
    const secret = crypto.getRandomValues(new Uint8Array(1))[0] % 9;
    let tries = 0;
    $("#game-arena").innerHTML =
      `<div class="hiding-grid">${Array.from({ length: 9 }, (_, i) => `<button data-bush="${i}" aria-label="查看第${i + 1}处花丛">🌿</button>`).join("")}</div>`;
    $("#game-note").textContent = "小伙伴躲进了花丛，点一点找找它。";
    document.querySelectorAll("[data-bush]").forEach(
      (b) =>
        (b.onclick = () => {
          if (!alive) return;
          tries++;
          b.disabled = true;
          if (Number(b.dataset.bush) === secret) {
            cheer();
            b.innerHTML = portrait(state.species, 0);
            $("#game-note").textContent = "找到啦！它正等着给你一个拥抱。";
            const done = document.createElement("button");
            done.className = "primary";
            done.textContent = "抱抱小伙伴";
            done.onclick = () => finishGame(kind, date);
            $("#game-arena").append(done);
          } else {
            b.textContent = "🌸";
            $("#game-note").textContent =
              tries > 4
                ? "它悄悄探出了头，再找找剩下的花丛。"
                : "这里藏着一朵小花，再看看旁边。";
          }
        }),
    );
  } else {
    let position = 0.5,
      hits = 0,
      misses = 0;
    const began = performance.now();
    $("#game-arena").innerHTML =
      `${portrait(state.species, 0)}<div class="disc-track"><span class="catch-zone"></span><span id="flying-disc">🥏</span></div><button class="primary" id="throw-disc">接住飞盘！</button>`;
    $("#game-note").textContent =
      "飞盘进入中间亮区时点一下，和小伙伴完成3次传接。";
    const tick = (now) => {
      if (!alive) return;
      position = reduced.matches
        ? 0.5
        : (Math.sin((now - began) / 1000) + 1) / 2;
      $("#flying-disc").style.left = position * 90 + "%";
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    $("#throw-disc").onclick = () => {
      if (!alive) return;
      if (Math.abs(position - 0.5) < 0.22 || misses >= 3) {
        hits++;
        cheer();
        misses = 0;
        tone("adopt");
        $("#game-note").textContent = `接住啦！已经传接 ${hits} / 3 次`;
        if (hits === 3) finishGame(kind, date);
      } else {
        misses++;
        $("#game-note").textContent = "飞盘轻轻落在草地上，慢慢来，再试一次。";
      }
    };
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopGame();
  else if ($("#games-dialog").open) playground();
});
function startExtraGame(kind, alive, done, cheer) {
  const arena = $("#game-arena"),
    note = $("#game-note");
  if (kind === "words") {
    let round = 0;
    const words = DailyPlay.shuffle(
      Vocabulary.words(),
      M.chinaDate() + "words",
    ).slice(0, 12);
    function show() {
      const group = words.slice(round * 4, round * 4 + 4),
        target = group[0];
      arena.innerHTML =
        '<p class="word-target">' +
        target.icon +
        " 找到「" +
        safe(target.chinese) +
        '」</p><div class="word-choices">' +
        DailyPlay.shuffle(group, String(round) + M.chinaDate())
          .map(
            (w) =>
              '<button data-word="' + w.id + '">' + safe(w.word) + "</button>",
          )
          .join("") +
        "</div>";
      note.textContent = "第 " + (round + 1) + " / 3 轮 · 帮小伙伴找到单词宝藏";
      arena.querySelectorAll("[data-word]").forEach(
        (b) =>
          (b.onclick = () => {
            if (!alive()) return;
            if (b.dataset.word !== target.id) {
              b.disabled = true;
              note.textContent = "再想想，小伙伴陪你慢慢找。";
              return;
            }
            cheer();
            round++;
            if (round === 3) done();
            else show();
          }),
      );
    }
    show();
  } else if (kind === "memory") {
    const cards = DailyPlay.shuffle(
      ["🌙", "🌙", "🍎", "🍎", "🌸", "🌸"],
      M.chinaDate() + "memory",
    );
    let first = null,
      busy = false,
      matches = 0;
    arena.innerHTML =
      '<div class="memory-grid">' +
      cards
        .map(
          (c, i) =>
            '<button data-card="' +
            i +
            '" aria-label="翻开第' +
            (i + 1) +
            '张卡">✧</button>',
        )
        .join("") +
      "</div>";
    note.textContent = "翻出相同的两张卡，收集三对小宝物。";
    arena.querySelectorAll("[data-card]").forEach(
      (b) =>
        (b.onclick = () => {
          if (!alive() || busy || b === first || b.disabled) return;
          b.textContent = cards[Number(b.dataset.card)];
          if (!first) {
            first = b;
            return;
          }
          const a = first;
          first = null;
          if (a.textContent === b.textContent) {
            a.disabled = b.disabled = true;
            a.classList.add("matched");
            b.classList.add("matched");
            matches++;
            cheer();
            if (matches === 3) done();
          } else {
            busy = true;
            note.textContent = "记住它们的位置，再试试。";
            setTimeout(() => {
              if (!alive()) return;
              a.textContent = b.textContent = "✧";
              busy = false;
            }, 800);
          }
        }),
    );
  } else {
    let count = 0;
    arena.innerHTML =
      '<div class="star-field">' +
      Array.from(
        { length: 6 },
        (_, i) =>
          '<button data-star="' +
          i +
          '" style="left:' +
          (8 + (i % 3) * 30) +
          "%;top:" +
          (10 + Math.floor(i / 3) * 95) +
          'px" aria-label="采集第' +
          (i + 1) +
          '颗星星">⭐</button>',
      ).join("") +
      "</div>";
    note.textContent = "轻点六颗星星，和小伙伴装满星光口袋。";
    arena.querySelectorAll("[data-star]").forEach(
      (b) =>
        (b.onclick = () => {
          if (!alive() || b.disabled) return;
          b.disabled = true;
          b.textContent = "✨";
          b.style.opacity = ".3";
          count++;
          cheer();
          note.textContent = "收集到了 " + count + " / 6 颗星星";
          if (count === 6) done();
        }),
    );
  }
}
