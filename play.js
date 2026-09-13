const artSheets = [
  "pets-baby",
  "pets-toddler",
  "pets-juvenile",
  "pets-grown",
  "pets-ultimate",
];
const finalDetails = [
  "彩虹羽翼 · 星辉独角",
  "水晶翼冠 · 云海守护",
  "月光斗篷 · 梦境旅人",
  "星光尾饰 · 森林精灵",
  "魔法飞毯 · 星空漫游",
  "太阳徽章 · 冒险披风",
];
function portrait(species, index = 0) {
  return `<span class="gallery-art" style="background-image:url('assets/${artSheets[index]}.png');background-position:${M.pets[species].pos}" role="img" aria-label="${safe(M.pets[species].species)}"></span>`;
}
function gallery() {
  const owned = [
    ...(state.companions || []).filter((p) => p.id !== state.activePetId),
    { id: state.activePetId, pet: state },
  ];
  $("#gallery-content").innerHTML =
    `<span class="dialog-eyebrow">星光森林 · 伙伴图鉴</span><h2>每一种相遇，都有惊喜</h2><p>看看六位伙伴从幼年到最终形态的变化。</p><div class="gallery-tabs">${M.stages.map((s, i) => `<button data-gallery-stage="${i}" aria-pressed="${i === 0}">${s.day}日 · ${s.title}</button>`).join("")}</div><div id="species-grid" class="species-grid"></div><h3>我的伙伴</h3><p>每位伙伴累计60个成长日后，可邀请一位新伙伴。切换不会丢失进度；当天打卡只让当前伙伴成长，奖励背包共用。</p><div class="owned-list">${owned.map((p) => `<button data-switch-pet="${safe(p.id || "")}" ${p.id === state.activePetId ? "disabled" : ""}>${p.pet.species === null ? "🥚" : M.pets[p.pet.species].species} · ${safe(p.pet.name || "等待取名")} · ${p.pet.completedDates.length}日${p.id === state.activePetId ? "（当前）" : ""}</button>`).join("")}</div><button class="primary" id="another-pet" ${state.phase !== "pet" || state.completedDates.length < 60 || state.adoptionUsed ? "disabled" : ""}>邀请一位新伙伴</button><p id="gallery-note" role="status"></p>`;
  const show = (index) => {
    $("#species-grid").innerHTML = M.pets
      .map(
        (pet, i) =>
          `<article>${portrait(i, index)}<h3>${pet.species}</h3><p>${index === 4 ? finalDetails[i] : pet.trait}</p></article>`,
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
const gameNames = { race: "林间赛跑", hide: "花园捉迷藏", disc: "彩虹飞盘" };
function unlockedGames() {
  const day = state.homework?.days[M.chinaDate()];
  if (!day?.credited || state.phase !== "pet") return [];
  const names = Object.keys(gameNames),
    offset = Number(M.chinaDate().replaceAll("-", "")) % 3;
  return Array.from(
    { length: Math.min(3, day.tasks.length) },
    (_, i) => names[(i + offset) % 3],
  );
}
function playground() {
  stopGame();
  const unlocked = unlockedGames();
  $("#games-content").innerHTML =
    `<span class="dialog-eyebrow">今天的相伴时光</span><h2>和${safe(petName())}一起玩</h2><p>${unlocked.length ? `今天已开放 ${unlocked.length} 个小游戏，可以反复玩。` : "完成今天所有作业打卡，就会开放1—3个小游戏；任务越多，开放越多。"}</p><div class="game-menu">${Object.entries(
      gameNames,
    )
      .map(
        ([key, name]) =>
          `<button class="primary" data-game="${key}" ${unlocked.includes(key) ? "" : "disabled"}>${{ race: "🏁", hide: "🌿", disc: "🥏" }[key]} ${name}${state.playHistory?.[M.chinaDate()]?.includes(key) ? " · 玩过啦" : ""}</button>`,
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
  } catch {}
  $("#games-content").innerHTML =
    `<span class="dialog-eyebrow">今天又多了一个小回忆</span>${portrait(state.species, M.growth(state.completedDates.length).index)}<h2>${safe(petName())}开心地扑向你！</h2><p>一起玩的时光，才是最棒的礼物。</p><button id="back-games" class="primary">再挑一个游戏</button>`;
  $("#back-games").onclick = playground;
  burst("♡");
  tone("adopt");
}
function startGame(kind) {
  if (!unlockedGames().includes(kind)) return;
  stopGame();
  let frame = 0,
    alive = true;
  const date = M.chinaDate();
  stopGame = () => {
    alive = false;
    cancelAnimationFrame(frame);
  };
  const content = $("#games-content");
  content.innerHTML = `<span class="dialog-eyebrow">${gameNames[kind]}</span><h2>${safe(petName())}准备好啦</h2><div id="game-arena"></div><p id="game-note" role="status"></p><button class="text-button" id="quit-game">回到游乐场</button>`;
  $("#quit-game").onclick = playground;
  if (kind === "race") {
    let progress = 0;
    $("#game-arena").innerHTML =
      `<div class="race-track"><div id="race-runner">${portrait(state.species, 0)}</div><span class="race-finish">🏁</span></div><button class="primary" id="race-step">轻点，为小伙伴加油</button>`;
    $("#game-note").textContent = "一起跑过12段小路，没有时间限制。";
    $("#race-step").onclick = () => {
      if (!alive) return;
      progress++;
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
