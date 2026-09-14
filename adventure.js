/* Scene games share the daily timer owned by play.js; no extra rewards. */
function startAdventure(kind, alive, done, cheer) {
  const arena = $("#game-arena"),
    note = $("#game-note");
  let progress = 0,
    busy = false,
    round = 0;
  const pet = () =>
    portrait(state.species, M.growth(state.completedDates.length).index);
  const prop = (name) =>
    '<span class="quest-prop prop-art-' + name + '" aria-hidden="true"></span>';
  arena.className = "adventure-arena " + kind;
  arena.innerHTML =
    '<div class="quest-landscape"><div class="quest-glimmers" aria-hidden="true"></div><div id="quest-pet">' +
    pet() +
    '</div><div id="quest-objects"></div><div class="quest-progress"><span id="quest-count">0 / 6</span></div></div><div id="quest-controls"></div>';
  const board = $("#quest-objects"),
    controls = $("#quest-controls"),
    buddy = $("#quest-pet");
  function award(message) {
    cheer();
    progress++;
    $("#quest-count").textContent = progress + " / 6";
    note.textContent = message;
    buddy.classList.remove("quest-bounce");
    void buddy.offsetWidth;
    buddy.classList.add("quest-bounce");
    if (progress >= 6) {
      busy = true;
      setTimeout(() => {
        if (alive()) done();
      }, 700);
      return true;
    }
    return false;
  }
  if (kind === "lily") {
    let position = 0;
    board.innerHTML = Array.from(
      { length: 6 },
      (_, i) =>
        '<button class="lily-pad" data-pad="' +
        i +
        '" style="left:' +
        (8 + (i % 3) * 31) +
        "%;top:" +
        (48 + Math.floor(i / 3) * 120) +
        'px" aria-label="跳到第' +
        (i + 1) +
        '片荷叶">' +
        prop("lily") +
        "<b>" +
        (i + 1) +
        "</b></button>",
    ).join("");
    note.textContent = "按亮起的荷叶顺序前进，陪小伙伴跳过月光池塘。";
    const highlight = () =>
      board.querySelectorAll("[data-pad]").forEach((b, i) => {
        b.classList.toggle("next-pad", i === position);
        b.disabled = i !== position;
      });
    highlight();
    board.querySelectorAll("[data-pad]").forEach(
      (b) =>
        (b.onclick = () => {
          if (!alive() || busy || Number(b.dataset.pad) !== position) return;
          busy = true;
          buddy.style.left = b.style.left;
          buddy.style.top = parseInt(b.style.top) - 30 + "px";
          buddy.classList.add("leaping");
          b.classList.add("visited");
          setTimeout(() => {
            if (!alive()) return;
            buddy.classList.remove("leaping");
            position++;
            if (!award("扑通一圈小涟漪！已跳过 " + position + " 片荷叶。")) {
              busy = false;
              highlight();
            }
          }, 550);
        }),
    );
  } else if (kind === "butterfly") {
    function flutter() {
      board.innerHTML = Array.from(
        { length: 3 },
        (_, i) =>
          '<button data-wing="' +
          i +
          '" class="quest-butterfly" style="left:' +
          (12 + i * 28) +
          "%;top:" +
          (45 + ((round + i) % 3) * 60) +
          "px;--delay:" +
          i * 0.3 +
          's" aria-label="' +
          (i === round % 3 ? "金色" : "蓝色") +
          '蝴蝶">' +
          prop("butterfly") +
          "</button>",
      ).join("");
      board.querySelectorAll("[data-wing]").forEach((b) => {
        const target = Number(b.dataset.wing) === round % 3;
        b.classList.toggle("gold-wing", target);
        b.onclick = () => {
          if (!alive() || busy) return;
          if (!target) {
            note.textContent = "这只是蓝色蝴蝶，找找发着金光的那一只。";
            return;
          }
          busy = true;
          buddy.style.left = b.style.left;
          buddy.classList.add("leaping");
          b.classList.add("wing-away");
          setTimeout(() => {
            if (!alive()) return;
            buddy.classList.remove("leaping");
            round++;
            if (!award("追上啦！轻轻碰一下，让蝴蝶继续飞。")) {
              busy = false;
              flutter();
            }
          }, 550);
        };
      });
    }
    note.textContent =
      "寻找发着金光的蝴蝶，带小伙伴追过去；不抓住它，只轻轻问好。";
    flutter();
  } else {
    let lane = 1,
      target = 0;
    controls.innerHTML =
      '<div class="basket-controls"><button id="basket-left" aria-label="向左移动篮子">← 向左</button><button id="basket-catch">接住果果</button><button id="basket-right" aria-label="向右移动篮子">向右 →</button></div>';
    board.innerHTML =
      '<div id="falling-fruit">' +
      prop("apple") +
      '</div><div id="fruit-basket">' +
      prop("basket") +
      "</div>";
    const basket = $("#fruit-basket"),
      fruit = $("#falling-fruit");
    const move = () => {
      basket.style.left = 12 + lane * 30 + "%";
      buddy.style.left = 12 + lane * 30 + "%";
    };
    function next() {
      target = (round * 7 + DailyPlay.seed(M.chinaDate())) % 3;
      fruit.style.left = 12 + target * 30 + "%";
      fruit.classList.remove("fruit-fall");
      note.textContent = "把篮子移到果果下面，再点“接住果果”；不催你，慢慢来。";
    }
    $("#basket-left").onclick = () => {
      if (alive() && !busy) {
        lane = Math.max(0, lane - 1);
        move();
      }
    };
    $("#basket-right").onclick = () => {
      if (alive() && !busy) {
        lane = Math.min(2, lane + 1);
        move();
      }
    };
    $("#basket-catch").onclick = () => {
      if (!alive() || busy) return;
      if (lane !== target) {
        note.textContent = "篮子还没对准哦，看看果果在哪一边。";
        return;
      }
      busy = true;
      fruit.classList.add("fruit-fall");
      setTimeout(() => {
        if (!alive()) return;
        round++;
        if (!award("接得真棒！小伙伴把果果放进了篮子。")) {
          busy = false;
          next();
        }
      }, 650);
    };
    move();
    next();
  }
}
