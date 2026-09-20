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
function gameCard(key, name, unlocked) {
  const item = window.ArcadeModel?.catalog[key];
  const open = unlocked.includes(key) && budgetLeft() > 0;
  const icon =
    item?.icon ||
    {
      race: "🏁",
      hide: "🌿",
      disc: "🥏",
      words: "🔤",
      memory: "🪄",
      stars: "🌟",
      lily: "🪷",
      butterfly: "🦋",
      fruit: "🍎",
    }[key];
  return (
    '<button class="game-card" data-game="' +
    key +
    '" ' +
    (open ? "" : "disabled") +
    '><span class="game-card-icon">' +
    icon +
    "</span><strong>" +
    name +
    "</strong><small>" +
    (item?.tag || "轻松陪伴 · 互动") +
    '</small><em class="' +
    (open ? "game-open" : "") +
    '">' +
    (open ? "今日开放" : unlocked.length ? "改天再相遇" : "完成约定后开放") +
    "</em>" +
    (item
      ? "<small>第 " + (state.arcade?.[key]?.level || 1) + " 关</small>"
      : "") +
    "</button>"
  );
}
function playground() {
  stopGame();
  const unlocked = unlockedGames();
  $("#games-content").innerHTML =
    `<span class="dialog-eyebrow">今天的相伴时光</span><h2>和${safe(petName())}一起玩</h2><p>${unlocked.length ? `今天随机开放 3 个小游戏，合计最多玩 10 分钟。` : "完成今天全部约定后，随机开放 3 个小游戏。"}</p><p class="game-clock">今天剩余 ${clockText()}</p><div class="game-menu">${Object.entries(
      gameNames,
    )
      .sort(
        ([a], [b]) =>
          Number(unlocked.includes(b)) - Number(unlocked.includes(a)),
      )
      .map(([key, name]) => gameCard(key, name, unlocked))
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
  if (!Object.hasOwn(gameNames, kind) || !unlockedGames().includes(kind) || budgetLeft() <= 0) return;
  stopGame();
  let frame = 0,
    alive = true;
  let disposeArcade = () => {};
  const date = M.chinaDate();
  let clockTimer;
  stopGame = () => {
    alive = false;
    clearInterval(clockTimer);
    cancelAnimationFrame(frame);
    disposeArcade();
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
  if (window.ArcadeModel?.catalog[kind]) {
    disposeArcade = startArcade(
      kind,
      () => alive,
      () => finishGame(kind, date),
      cheer,
    );
    return;
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopGame();
  else if ($("#games-dialog").open) playground();
});
