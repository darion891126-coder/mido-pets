const M = PetModel;
const $ = (selector) => document.querySelector(selector);
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let state = M.freshState(),
  questionIndex = 0,
  sound = false,
  audioCtx,
  reactionTimer,
  feedCount = 0,
  englishTask = null,
  englishLesson = [],
  lessonMode = "learn",
  hatchBusy = false;
const STORAGE_KEY = "mido-pet-v2";
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (
    M.validState(saved) &&
    (!window.Collection || Collection.valid(saved)) &&
    (!saved.homework || HomeworkModel.valid(saved.homework))
  )
    state = saved;
} catch {
  /* The journey remains usable if storage is unavailable. */
}
questionIndex = Math.min(state.answers.length, M.questions.length - 1);

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $("#storage-notice").classList.add("hidden");
  } catch {
    $("#storage-notice").classList.remove("hidden");
  }
}
function safe(text) {
  const el = document.createElement("span");
  el.textContent = text;
  return el.innerHTML.replace(/"/g, "&quot;");
}
function petName() {
  return state.name || "小伙伴";
}
function tone(kind = "touch") {
  if (!sound) return;
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
    let notes = [659, 880];
    if (kind === "adopt") notes = [523, 659, 784, 1047];
    if (kind === "sleep") notes = [659, 523, 392];
    notes.forEach((f, i) => {
      const oscillator = audioCtx.createOscillator(),
        gain = audioCtx.createGain(),
        t = audioCtx.currentTime + i * 0.12;
      oscillator.type = "sine";
      oscillator.frequency.value = f;
      oscillator.connect(gain);
      gain.connect(audioCtx.destination);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.06, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      oscillator.start(t);
      oscillator.stop(t + 0.51);
    });
  } catch {
    sound = false;
    updateSound();
  }
}
function updateSound() {
  $("#sound").setAttribute("aria-label", sound ? "关闭声音" : "开启声音");
  $("#sound").title = sound ? "关闭声音" : "开启声音";
  $(".sound-off").style.display = sound ? "none" : "block";
}
function say(text) {
  $("#speech").textContent = text;
}
function burst(symbol = "✦", count = 12) {
  if (reduced.matches || $("#world").classList.contains("paused")) return;
  for (let i = 0; i < count; i++) {
    const e = document.createElement("span");
    e.className = "spark";
    e.textContent = i % 3 === 0 ? "✧" : symbol;
    e.style.setProperty(
      "--x",
      String(Math.sin((i / count) * Math.PI * 2) * (65 + Math.random() * 100)) +
        "px",
    );
    e.style.setProperty("--y", String(-60 - Math.random() * 150) + "px");
    e.style.setProperty("--r", String(Math.random() * 70 - 35) + "deg");
    e.style.animationDelay = String(Math.random() * 0.15) + "s";
    $("#effects").append(e);
    setTimeout(() => e.remove(), 1500);
  }
}
function animate(kind = "happy") {
  clearTimeout(reactionTimer);
  $("#pet").className = "pet " + kind;
  if (kind !== "sleeping" && kind !== "hatching")
    reactionTimer = setTimeout(() => ($("#pet").className = "pet"), 1500);
}
function sprite(el, days = state.completedDates.length) {
  const stage = M.growth(days);
  el.className = "sprite";
  el.style.backgroundImage =
    "url('assets/" +
    [
      "pets-baby",
      "pets-juvenile",
      "pets-grown",
      "pets-ultimate",
    ][stage.index] +
    ".png')";
  el.style.backgroundSize = "300% 200%";
  el.style.backgroundPosition = M.pets[state.species].pos;
  el.style.setProperty("--pet-scale", stage.scale);
  el.classList.toggle("legendary", stage.index === 3);
  el.classList.toggle("youth-glow", stage.index === 1);
  el.classList.toggle("mature-art", stage.index >= 1);
}
function renderArtwork() {
  const art = $("#main-sprite");
  if (state.phase !== "pet") {
    art.className = "sprite egg-art";
    art.style.removeProperty("background-image");
    art.style.removeProperty("background-position");
    art.style.removeProperty("background-size");
    art.style.setProperty("--pet-scale", 1);
    $("#pet").setAttribute("aria-label", "轻轻碰一碰魔法蛋");
    return;
  }
  sprite(art);
  $("#pet").setAttribute("aria-label", "摸摸" + petName());
  document.querySelectorAll(".mini-pet").forEach((el) => sprite(el));
}
function heading(chapter, title, subtitle) {
  $("#chapter").textContent = chapter;
  $("#title").textContent = title;
  $("#subtitle").textContent = subtitle;
}
function render() {
  $("#world").dataset.phase = state.phase;
  renderArtwork();
  if (state.phase === "quiz") renderAdoption();
  else if (state.phase === "egg") renderEgg();
  else renderHome();
}
function renderQuiz() {
  heading(
    "初见 · 森林的小来信",
    "你的魔法伙伴，会是谁呢？",
    "四个小问题，让星光找到与你合拍的它。",
  );
  say("先保密哦，见面那天再告诉你。");
  const q = M.questions[questionIndex],
    chosen = state.answers[questionIndex];
  $("#content").innerHTML =
    '<div class="quiz-card"><div class="quiz-meta"><span>星光小问卷</span><span>' +
    (questionIndex + 1) +
    ' / 4</span></div><div class="quiz-progress">' +
    M.questions
      .map(
        (_, i) => '<i class="' + (i <= questionIndex ? "lit" : "") + '"></i>',
      )
      .join("") +
    "</div><h2>" +
    q.title +
    "<br>" +
    q.line +
    '</h2><div class="quiz-options" role="group" aria-label="' +
    q.title +
    q.line +
    '">' +
    q.options
      .map(
        (o, i) =>
          '<button class="quiz-option" data-answer="' +
          i +
          '" aria-pressed="' +
          (i === chosen) +
          '"><span class="option-icon">' +
          o.icon +
          "</span><span><strong>" +
          o.title +
          "</strong><small>" +
          o.hint +
          '</small></span><span class="option-check">' +
          (i === chosen ? "✓" : "○") +
          "</span></button>",
      )
      .join("") +
    '</div><div class="quiz-navigation"><button class="text-button" id="previous" ' +
    (questionIndex === 0 ? "disabled" : "") +
    '>上一个</button><button class="primary" id="next" ' +
    (chosen === undefined ? "disabled" : "") +
    ">" +
    (questionIndex === 3 ? "让星光为我寻找" : "下一个小问题") +
    ' <span>✧</span></button></div><p class="quiz-note">选你喜欢的就好，没有标准答案。</p></div>';
  document.querySelectorAll("[data-answer]").forEach(
    (b) =>
      (b.onclick = () => {
        state.answers[questionIndex] = Number(b.dataset.answer);
        save();
        renderQuiz();
        tone();
      }),
  );
  $("#previous").onclick = () => {
    questionIndex--;
    renderQuiz();
  };
  $("#next").onclick = () => {
    if (state.answers[questionIndex] === undefined) return;
    if (questionIndex < 3) {
      questionIndex++;
      renderQuiz();
    } else {
      state.adoptionMode = "quiz";
      state.matchSeed = crypto.getRandomValues(new Uint32Array(1))[0];
      state.species = M.matchPet(state.answers, state.matchSeed);
      state.phase = "egg";
      state.matchedAt = new Date().toISOString();
      save();
      render();
      animate();
      burst("✦", 20);
      tone("adopt");
    }
  };
  const back = document.createElement("button");
  back.className = "text-button adoption-back";
  back.textContent = "← 换一种相遇方式";
  back.onclick = () => {
    state.adoptionMode = null;
    state.answers = [];
    questionIndex = 0;
    save();
    render();
  };
  $("#content .quiz-card").append(back);
}
function renderAdoption() {
  const mode = state.adoptionMode || (state.answers.length ? "quiz" : null);
  if (mode === "quiz") {
    renderQuiz();
    return;
  }
  if (mode === "direct") {
    renderPetChoice();
    return;
  }
  heading(
    "初见 · 两种相遇，都很美好",
    "你想怎样遇见小伙伴？",
    "自己挑一个喜欢的，或把惊喜交给星光。",
  );
  say("你的第一位魔法伙伴，正在等你。");
  $("#content").innerHTML =
    '<div class="adoption-card"><button class="adoption-option" id="choose-direct"><span class="adoption-symbol">♡</span><strong>我想自己挑</strong><small>看看六位小伙伴的照片<br>选一个最喜欢的</small><span class="adoption-arrow">看图挑选 ↗</span></button><button class="adoption-option surprise" id="choose-quiz"><span class="adoption-symbol">✧</span><strong>让星光帮我选</strong><small>回答四个小问题<br>收下一份神秘惊喜</small><span class="adoption-arrow">问卷随机相遇 ↗</span></button><p class="quiz-note">两种方式都会得到一颗魔法蛋，完成首日约定后孵化。</p></div>';
  $("#choose-direct").onclick = () => {
    state.adoptionMode = "direct";
    state.answers = [];
    save();
    render();
  };
  $("#choose-quiz").onclick = () => {
    state.adoptionMode = "quiz";
    questionIndex = 0;
    save();
    render();
  };
}
function renderPetChoice() {
  heading(
    "初见 · 选一位心动的小伙伴",
    "哪一只，让你想抱抱？",
    "先看一看幼年模样，再带它的魔法蛋回家。",
  );
  say("喜欢谁，就轻轻点一下它。");
  const chosen = Number.isInteger(state.directChoice)
    ? state.directChoice
    : null;
  $("#content").innerHTML =
    '<div class="pet-choice-card"><div class="pet-choice-grid">' +
    M.pets
      .map(
        (p, i) =>
          '<button class="pet-choice" data-pet-choice="' +
          i +
          '" aria-pressed="' +
          (chosen === i) +
          '"><span class="choice-art" style="background-position:' +
          p.pos +
          '" role="img" aria-label="' +
          p.species +
          '幼年照片"></span><strong>' +
          p.species +
          "</strong><small>" +
          p.trait +
          '</small><span class="choice-check">' +
          (chosen === i ? "✓" : "♡") +
          "</span></button>",
      )
      .join("") +
    '</div><button id="confirm-pet-choice" class="primary" ' +
    (chosen === null ? "disabled" : "") +
    '>带它的魔法蛋回家 ♡</button><button id="choice-back" class="text-button adoption-back">← 换一种相遇方式</button></div>';
  document.querySelectorAll("[data-pet-choice]").forEach(
    (b) =>
      (b.onclick = () => {
        state.directChoice = Number(b.dataset.petChoice);
        save();
        renderPetChoice();
        tone();
      }),
  );
  $("#choice-back").onclick = () => {
    state.adoptionMode = null;
    state.answers = [];
    save();
    render();
  };
  $("#confirm-pet-choice").onclick = () => {
    if (chosen === null) return;
    state.species = chosen;
    state.adoptionMode = "direct";
    state.phase = "egg";
    state.matchedAt = new Date().toISOString();
    save();
    render();
    animate();
    burst("♡", 18);
    tone("adopt");
  };
}
function dailySummary() {
  const d = HomeworkModel.day(state, M.chinaDate());
  if (!d.tasks.length) return "请家长一起写下今天的小约定";
  const count = d.tasks.filter((t) => t.status === "approved").length;
  return d.credited
    ? "今天的约定都完成啦 ✓"
    : "今天的小约定 · " + count + " / " + d.tasks.length;
}
function renderEgg() {
  heading(
    "相遇 · 一颗属于你的魔法蛋",
    "用今天的努力，唤醒它",
    "完成自己的约定，打卡后就能见面。",
  );
  say("咚、咚……我在等你的好消息。");
  $("#touch-hint").textContent = "♡ 轻轻碰一碰，蛋宝宝会回应";
  $("#content").innerHTML =
    '<div class="egg-card"><span class="dialog-eyebrow">今天的小约定</span><h2>把努力，变成一份魔法</h2><div class="task-stars">✦ ♡ ✦</div><p>完成自己的约定，仅书面作业需要照片。<br>完成星光审核仪式，收下食物和道具。</p><button class="primary" id="daily">' +
    dailySummary() +
    ' <span>↗</span></button><p class="quiz-note">首日约定全部打卡，小伙伴当天孵化。</p><div class="home-links"><button id="bag" class="text-button">🎒 我的奖励背包</button><button id="english" class="text-button">♪ 英语小角落 · 自由玩</button></div></div>';
  bindDaily();
}
function bindDaily() {
  $("#daily").onclick = () => openHomework();
  $("#bag").onclick = () => openBackpack();
  $("#english").onclick = openLesson;
}
function renderHome() {
  const p = M.pets[state.species],
    days = state.completedDates.length,
    g = M.growth(days);
  heading(
    "相伴 · 我们的小窝",
    petName() + "的小小世界",
    "做完自己的小约定，带一份礼物回家。",
  );
  say("你回来啦！" + petName() + "想你了。");
  $("#touch-hint").textContent = "♡ 摸摸我，我会很开心";
  const bag = HomeworkModel.ensure(state).inventory;
  const total = Object.values(bag).reduce((a, b) => a + b, 0);
  $("#content").innerHTML =
    '<div class="home-card"><span class="dialog-eyebrow">' +
    p.species +
    " · " +
    g.title +
    "</span><h2>" +
    safe(petName()) +
    "</h2><p>" +
    p.intro +
    '</p><div class="growth-summary"><span>一起成长 <strong>' +
    days +
    "</strong> 天</span><span>" +
    (g.next
      ? "再 " + g.remaining + " 天，迎来" + g.next.title
      : "我们的魔法，闪闪发光") +
    '</span></div><div class="growth-bar"><i style="transform:scaleX(' +
    Math.min(days / 30, 1) +
    ')"></i></div><button id="daily" class="primary">' +
    dailySummary() +
    ' <span>✧</span></button><div class="home-actions"><button id="bag"><span>🎒</span>背包 · ' +
    total +
    '</button><button data-action="play"><span>✧</span>追星星</button><button data-action="sleep"><span>☾</span>说晚安</button></div><div class="home-links"><button id="rename" class="text-button">' +
    (state.name ? "修改名字" : "给它取个名字") +
    '</button><button id="certificate" class="text-button">初见纪念卡</button><button id="english" class="text-button">♪ 英语小角落 · 自由玩</button></div></div>';
  bindDaily();
  $("#rename").onclick = openNaming;
  $("#certificate").onclick = openCertificate;
  document
    .querySelectorAll("[data-action]")
    .forEach((b) => (b.onclick = () => interact(b.dataset.action)));
}
function interact(action) {
  $("#world").classList.toggle("night", action === "sleep");
  if (action === "feed") {
    feedCount++;
    say(
      feedCount > 3
        ? "肚子圆滚滚啦，我们一起玩吧。"
        : "啊呜！这一口有甜甜的味道。",
    );
    animate();
    burst("♡");
    tone();
  }
  if (action === "play") {
    say("快看！星星跟着我们跑呢！");
    animate("playing");
    burst("✦", 20);
    tone("adopt");
  }
  if (action === "sleep") {
    say("晚安，我们明天见。");
    animate("sleeping");
    burst("☾", 6);
    tone("sleep");
  }
}
function openLesson() {
  englishTask = { step: 0 };
  englishLesson = Vocabulary.lesson(state.englishIndex || 0);
  lessonMode = "learn";
  renderLesson();
  $("#lesson-dialog").showModal();
}
function renderLesson() {
  if (!englishTask) return;
  const step = englishTask.step;
  if (step === 3) {
    $("#lesson-content").innerHTML =
      '<span class="dialog-eyebrow">英语小角落 · 自由探索</span><div class="task-stars all-lit">✦ ✦ ✦</div><h2>又认识了三个单词！</h2><p>喜欢的话，下次再来玩。<br>这里不打卡，也不影响作业奖励和成长。</p><button id="finish-english" class="primary">回到小伙伴身边 ♡</button>';
    $("#finish-english").onclick = async () => {
      try {
        await changeHomework((s) => {
          s.englishIndex = (s.englishIndex || 0) + 1;
        });
        $("#lesson-dialog").close();
      } catch {
        $("#lesson-content p").textContent = "暂时无法保存，请稍后再试。";
      }
    };
    return;
  }
  const lesson = englishLesson;
  const word = lesson[step];
  const labels = Object.fromEntries(lesson.map((w) => [w.icon, w.chinese]));
  const learn =
    '<div class="word-picture">' +
    safe(word.icon) +
    '</div><h2 class="english-word" lang="en">' +
    word.word +
    "</h2><p>" +
    safe(word.chinese) +
    '</p><button id="pronounce" class="text-button">♪ 听听怎么读</button><p id="audio-note" class="quiz-note" role="status"></p><button id="practice" class="primary">记住啦，找一找 <span>↗</span></button>';
  const question =
    '<h2>哪一个是 <span lang="en">' +
    word.word +
    '</span>？</h2><p>选一选，看看自己记住了吗。</p><div class="word-answers">' +
    word.alternatives
      .map(
        (icon, i) =>
          '<button data-word-answer="' +
          i +
          '" aria-label="' +
          safe(labels[icon] || "选项") +
          '">' +
          safe(icon) +
          "</button>",
      )
      .join("") +
    '</div><p id="answer-note" class="answer-note" role="status">慢慢想，你一定能找到。</p><button id="relearn" class="text-button">再看一眼</button>';
  $("#lesson-content").innerHTML =
    '<span class="dialog-eyebrow">第 ' +
    (step + 1) +
    " / 3 · " +
    (lessonMode === "learn" ? "认识一个新朋友" : "小小找一找") +
    '</span><div class="lesson-progress">' +
    [0, 1, 2]
      .map((i) => '<span class="' + (i < step ? "lit" : "") + '">✦</span>')
      .join("") +
    "</div>" +
    (lessonMode === "learn" ? learn : question);
  if (lessonMode === "learn") {
    $("#practice").onclick = () => {
      lessonMode = "question";
      renderLesson();
    };
    $("#pronounce").onclick = () => pronounce(word.word);
  } else {
    document.querySelectorAll("[data-word-answer]").forEach(
      (b) =>
        (b.onclick = () => {
          if (word.icon === word.alternatives[Number(b.dataset.wordAnswer)]) {
            englishTask.step++;
            tone("adopt");
            lessonMode = "learn";
            renderLesson();
          } else {
            $("#answer-note").textContent =
              "还差一点点，再试试，或者再看一眼。";
            b.classList.add("try-again");
          }
        }),
    );
    $("#relearn").onclick = () => {
      lessonMode = "learn";
      renderLesson();
    };
  }
}
function pronounce(word) {
  playWord(word);
}
function celebrateGrowth(wasEgg, before) {
  if (hatchBusy) return;
  if (wasEgg) {
    hatchBusy = true;
    $("#pet").disabled = true;
    $("#world").inert = true;
    animate("hatching");
    $("#hatch-overlay").classList.remove("hidden");
    tone("adopt");
    burst("✦", 28);
    setTimeout(
      () => {
        render();
        animate("enter");
        say("你好呀！我是你的" + M.pets[state.species].species + "。");
        burst("♡", 24);
        $("#hatch-overlay").classList.add("hidden");
        $("#world").inert = false;
        $("#pet").disabled = false;
        hatchBusy = false;
        setTimeout(
          () => {
            if (!document.querySelector("dialog[open]")) openNaming();
          },
          reduced.matches ? 100 : 1400,
        );
      },
      reduced.matches || $("#world").classList.contains("paused") ? 100 : 2200,
    );
  } else {
    render();
    animate();
    burst("✦", 20);
    tone("adopt");
    say(
      M.growth(state.completedDates.length).index > before
        ? "你看！我又长大一点啦！"
        : "今天的小星星，我会好好收藏。",
    );
  }
}
function openNaming() {
  if (state.phase !== "pet") return;
  renderArtwork();
  $(".suggestions").replaceChildren();
  M.pets[state.species].names.forEach((name) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = name;
    b.onclick = () => ($("#pet-name").value = name);
    $(".suggestions").append(b);
  });
  $("#pet-name").value = state.name || M.pets[state.species].names[0];
  $("#name-error").textContent = "";
  $("#name-intro").textContent =
    "原来是可爱的" + M.pets[state.species].species + "，它想知道自己的名字。";
  $("#naming").showModal();
}
function openCertificate() {
  renderArtwork();
  $("#certificate-name").textContent = petName();
  $("#certificate-species").textContent = M.pets[state.species].species;
  $("#certificate-date").textContent = new Date(
    state.hatchedAt,
  ).toLocaleDateString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  $("#memory").showModal();
}
function previewGrowth(index) {
  const stage = M.stages[index];
  sprite($("#preview-sprite"), stage.day);
  $("#preview-label").textContent =
    "第 " + stage.day + " 个成长日 · " + stage.title + " · " + stage.detail;
  document
    .querySelectorAll("[data-preview]")
    .forEach((b, i) => b.setAttribute("aria-pressed", i === index));
}
$("#name-form").onsubmit = (e) => {
  e.preventDefault();
  const name = $("#pet-name").value.trim();
  if (!name || name.length > 12) {
    $("#name-error").textContent = "取一个1到12字的名字吧。";
    return;
  }
  state.name = name;
  save();
  $("#naming").close();
  render();
  say("我叫" + name + "啦！以后就这样叫我吧。");
  burst("♡");
  tone("adopt");
};
$("#pet").onclick = () => {
  if (hatchBusy) return;
  if (state.phase !== "pet") {
    animate("egg-wiggle");
    burst("✦", 6);
    say(
      state.phase === "quiz"
        ? "你的心愿，我都悄悄记住啦。"
        : "咚咚！我在里面等着你哦。",
    );
  } else {
    $("#world").classList.remove("night");
    animate();
    burst("♡");
    say(petName() + "最喜欢和你待在一起啦。");
  }
  tone();
};
function openParentInfo() {
  $("#growth-list").innerHTML = M.stages
    .map(
      (s) =>
        "<div><strong>第 " +
        s.day +
        " 天</strong><span>" +
        s.title +
        "<small>" +
        s.detail +
        "</small></span></div>",
    )
    .join("");
  $("#growth-preview").classList.toggle("hidden", state.phase !== "pet");
  if (state.phase === "pet") {
    $(".preview-buttons").innerHTML = M.stages
      .map(
        (s, i) =>
          '<button data-preview="' +
          i +
          '" aria-pressed="false">' +
          s.day +
          "天</button>",
      )
      .join("");
    document
      .querySelectorAll("[data-preview]")
      .forEach(
        (b) => (b.onclick = () => previewGrowth(Number(b.dataset.preview))),
      );
    previewGrowth(M.growth(state.completedDates.length).index);
  }
  $("#parent-dialog").showModal();
}
$("#parent").onclick = () => openParentWorkshop();
document
  .querySelectorAll("dialog .close")
  .forEach((b) => (b.onclick = () => b.closest("dialog").close()));
$("#close-certificate").onclick = () => $("#memory").close();
$("#sound").onclick = () => {
  sound = !sound;
  updateSound();
  tone();
};
$("#motion").onclick = () => {
  const paused = $("#world").classList.toggle("paused");
  $("#motion").setAttribute("aria-label", paused ? "恢复动态" : "暂停动态");
  $("#motion").title = paused ? "恢复动态" : "暂停动态";
  $("#motion").textContent = paused ? "▷" : "✦";
};
document.addEventListener("visibilitychange", () => {
  document.body.classList.toggle("inactive", document.hidden);
  if (!document.hidden && !hatchBusy && !document.querySelector("dialog[open]"))
    render();
});
for (let i = 0; i < 28; i++) {
  const e = document.createElement("i");
  e.className = "firefly";
  e.style.left = String(Math.random() * 100) + "%";
  e.style.top = String(15 + Math.random() * 70) + "%";
  e.style.setProperty("--duration", String(5 + Math.random() * 6) + "s");
  e.style.setProperty("--delay", String(-Math.random() * 12) + "s");
  $("#fireflies").append(e);
}
render();
