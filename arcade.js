/* All games live inside the existing homework gate and daily play timer. */
function startArcade(kind, alive, done, cheer) {
  const A = ArcadeModel,
    arena = document.querySelector("#game-arena"),
    note = document.querySelector("#game-note");
  const saved = state.arcade?.[kind] || {},
    level = Math.max(1, Number(saved.level) || 1);
  let mode = saved.mode === 1 ? 1 : 0,
    disposed = false,
    won = false,
    intervals = [],
    later = [];
  const active = () => alive() && !disposed && !won;
  const say = (text) => (note.textContent = text);
  const prop = (i, text = "") =>
    `<span class="food-prop" aria-hidden="true" style="background-position:${(i % 3) * 50}% ${Math.floor(i / 3) * 50}%">${text}</span>`;
  const delay = (fn, ms) => {
    const id = setTimeout(() => {
      if (active()) fn();
    }, ms);
    later.push(id);
  };
  const repeat = (fn, ms) => {
    const id = setInterval(() => {
      if (active()) fn();
    }, ms);
    intervals.push(id);
  };
  const cleanup = () => {
    disposed = true;
    intervals.forEach(clearInterval);
    later.forEach(clearTimeout);
  };
  const button = (label, fn, cls = "arcade-action") => {
    const b = document.createElement("button");
    b.className = cls;
    b.textContent = label;
    b.onclick = () => {
      if (active()) fn(b);
    };
    return b;
  };
  function win(message) {
    if (!active()) return;
    won = true;
    intervals.forEach(clearInterval);
    cheer();
    say(message || "太棒了，伙伴为你鼓掌！");
    arena.classList.add("arcade-won");
    changeHomework((s) => {
      s.arcade ??= {};
      s.arcade[kind] = { level: Math.min(9999, level + 1), mode };
    })
      .then(() => {
        if (alive() && !disposed) done();
      })
      .catch(() => {
        won = false;
        say("进度未保存，请检查设备空间后再试。");
      });
  }
  function shell(instruction) {
    arena.className = "arcade-arena arcade-" + kind;
    arena.innerHTML = `<div class="arcade-level">第 ${level} 关 · ${mode ? "进阶挑战" : "轻松探索"}</div><p class="arcade-instruction"></p><div class="arcade-board" tabindex="0"></div><div class="arcade-tools"></div>`;
    arena.querySelector(".arcade-instruction").textContent = instruction;
    return [
      arena.querySelector(".arcade-board"),
      arena.querySelector(".arcade-tools"),
    ];
  }
  function start() {
    if (!active()) return;
    say("每过一关都会保存进度；退出后从本关重新开始。");
    const random = A.rng(DailyPlay.seed(kind + level + mode));
    if (kind === "water") {
      let { board, cap } = A.water(level, mode),
        selected = -1,
        undo = [];
      const colors = A.shuffle(
          ["#f39caf", "#91cfc1", "#a8a4e5", "#f2c970"],
          random,
        ),
        symbols = ["♥", "✦", "☾", "●"];
      const [area, tools] = shell(
        "先点一瓶，再点另一瓶。只能倒入空瓶或同色药水；把每瓶装成一种颜色。",
      );
      area.classList.add("potion-rack");
      function draw() {
        area.replaceChildren();
        board.forEach((tube, i) => {
          const b = button(
            "",
            () => {
              if (selected < 0) {
                selected = tube.length ? i : -1;
                draw();
                return;
              }
              const next = A.pour(board, selected, i, cap);
              if (next) {
                undo.push(board);
                board = next;
                selected = -1;
                cheer();
                draw();
                area.children[i].classList.add("potion-pour");
                if (A.waterSolved(board, cap))
                  delay(() => win("药水全部分好啦！"), 550);
              } else {
                selected = i === selected ? -1 : i;
                say("试试空瓶，或最上层颜色相同的瓶子。");
                draw();
              }
            },
            "potion-bottle",
          );
          b.setAttribute(
            "aria-label",
            `第${i + 1}瓶，${tube.map((v) => symbols[v]).join("、") || "空瓶"}`,
          );
          b.setAttribute("aria-pressed", String(i === selected));
          b.innerHTML = `<span class="bottle-neck"></span><span class="potion-liquid">${Array.from(
            { length: cap },
            (_, j) => {
              const c = tube[cap - 1 - j];
              return `<span style="background:${c === undefined ? "transparent" : colors[c]}">${c === undefined ? "" : symbols[c]}</span>`;
            },
          ).join("")}</span><small>${i + 1}</small>`;
          area.append(b);
        });
      }
      tools.append(
        button("↶ 撤销一步", () => {
          if (undo.length) {
            board = undo.pop();
            selected = -1;
            draw();
          }
        }),
        button("重新调配", () => {
          board = A.water(level, mode).board;
          undo = [];
          selected = -1;
          draw();
        }),
      );
      draw();
    } else if (kind === "puzzle") {
      const n = mode ? 4 : level < 3 ? 2 : 3,
        total = n * n;
      let pieces = A.shuffle(
          Array.from({ length: total }, (_, i) => i),
          random,
        ),
        selected = -1;
      if (pieces.every((v, i) => v === i))
        [pieces[0], pieces[1]] = [pieces[1], pieces[0]];
      const [area, tools] = shell(
        "点两块碎片交换位置，也可以拖动交换。对照完整风景，把画面拼回来。",
      );
      const image = [
        "assets/forest.png",
        "assets/scene-flower-valley.png",
        "assets/scene-moonlake.png",
      ][(level - 1) % 3];
      area.classList.add("picture-puzzle");
      area.style.setProperty("--cols", n);
      let drag = null,
        ignoreClickUntil = 0;
      const swap = (a, b) => {
        if (a === b) return;
        [pieces[a], pieces[b]] = [pieces[b], pieces[a]];
        selected = -1;
        cheer();
        draw();
        if (pieces.every((v, i) => v === i))
          delay(() => win("童话风景回来了！"), 600);
      };
      function draw() {
        area.replaceChildren();
        pieces.forEach((v, i) => {
          const b = button(
            "",
            () => {
              if (Date.now() < ignoreClickUntil) return;
              if (selected < 0) {
                selected = i;
                draw();
              } else if (selected === i) {
                selected = -1;
                draw();
              } else swap(selected, i);
            },
            "puzzle-piece",
          );
          b.setAttribute("aria-label", `位置${i + 1}，第${v + 1}块`);
          b.setAttribute("aria-pressed", String(selected === i));
          b.style.backgroundImage = `url('${image}')`;
          b.style.backgroundSize = `${n * 100}% ${n * 100}%`;
          b.style.backgroundPosition = `${((v % n) / (n - 1)) * 100}% ${(Math.floor(v / n) / (n - 1)) * 100}%`;
          b.innerHTML = `<small>${v + 1}</small>`;
          b.dataset.piece = i;
          b.onpointerdown = (e) => {
            drag = { i, x: e.clientX, y: e.clientY };
          };
          area.append(b);
        });
      }
      area.onpointerup = (e) => {
        if (!active() || !drag) return;
        const target = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest("[data-piece]");
        if (target && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 12) {
          e.preventDefault();
          ignoreClickUntil = Date.now() + 350;
          swap(drag.i, Number(target.dataset.piece));
        }
        drag = null;
      };
      area.onpointercancel = () => (drag = null);
      const preview = document.createElement("img");
      preview.src = image;
      preview.alt = "完整拼图参考";
      preview.className = "puzzle-preview";
      preview.hidden = true;
      tools.append(
        button("看看完整图", () => (preview.hidden = !preview.hidden)),
        preview,
      );
      draw();
    } else if (kind === "sum") {
      const target = mode ? 20 + (level % 3) * 5 : level < 4 ? 10 : 20;
      let values = Array.from(
        { length: 6 },
        () => 1 + Math.floor(random() * (target - 1)),
      ).flatMap((v) => [v, target - v]);
      values = A.shuffle(values, random);
      let selected = -1,
        matched = 0,
        busy = false;
      const [area] = shell(
        `每次选两颗星糖，让它们相加等于 ${target}。清空全部星糖就过关！`,
      );
      area.classList.add("number-candies");
      function draw() {
        area.replaceChildren();
        values.forEach((v, i) => {
          const b = button(
            v === null ? "✧" : String(v),
            () => {
              if (busy || v === null) return;
              if (selected === i) {
                selected = -1;
                draw();
                return;
              }
              if (selected < 0) {
                selected = i;
                draw();
                return;
              }
              if (values[selected] + v === target) {
                values[selected] = values[i] = null;
                selected = -1;
                matched++;
                cheer();
                draw();
                say(`找到 ${matched} / 6 对星糖！`);
                if (matched === 6) delay(() => win(), 450);
              } else {
                busy = true;
                say(`${values[selected]} + ${v} 还不是 ${target}，再想一想。`);
                b.classList.add("gentle-shake");
                delay(() => {
                  selected = -1;
                  busy = false;
                  draw();
                }, 650);
              }
            },
            "number-candy",
          );
          b.disabled = v === null;
          b.setAttribute("aria-pressed", String(selected === i));
          area.append(b);
        });
      }
      draw();
    } else if (kind === "sudoku") {
      let { n, answer, board, given } = A.sudoku(level, mode),
        selected = board.findIndex((v) => !v);
      const [area, tools] = shell(
        `填入 1–${n}：每行、每列和每个 2×${n / 2} 小宫都不能重复。点空格，再选数字。`,
      );
      area.classList.add("sudoku-board");
      area.style.setProperty("--cols", n);
      function draw() {
        area.replaceChildren();
        board.forEach((v, i) => {
          const b = button(
            v || "·",
            () => {
              if (!given[i]) {
                selected = i;
                draw();
              }
            },
            "sudoku-cell",
          );
          b.disabled = given[i];
          b.setAttribute(
            "aria-label",
            `第${Math.floor(i / n) + 1}行第${(i % n) + 1}列，${v || "空格"}`,
          );
          b.setAttribute("aria-pressed", String(i === selected));
          if (i % n === n / 2 - 1) b.classList.add("box-right");
          if (Math.floor(i / n) % 2 === 1 && Math.floor(i / n) < n - 1)
            b.classList.add("box-bottom");
          area.append(b);
        });
      }
      for (let v = 1; v <= n; v++)
        tools.append(
          button(String(v), () => {
            if (selected < 0) return;
            const b = [...board];
            b[selected] = 0;
            if (!A.choices(b, n, selected).includes(v)) {
              say("这一行、列或小宫已经有这个数字了。");
              return;
            }
            board[selected] = v;
            cheer();
            draw();
            if (board.every(Boolean)) win("每个数字都找到了自己的家！");
          }),
        );
      tools.append(
        button("擦除", () => {
          if (selected >= 0 && !given[selected]) board[selected] = 0;
          draw();
        }),
        button("提示一个", () => {
          if (selected >= 0 && !given[selected]) {
            board = board.map((v, i) => (v && v !== answer[i] ? 0 : v));
            board[selected] = answer[selected];
            say("提示已填入，并清除了不正确的尝试。");
            draw();
            if (board.every(Boolean) && board.every((v, i) => v === answer[i]))
              win();
          }
        }),
      );
      draw();
    } else if (kind === "merge") {
      let board = A.addTile(A.addTile(Array(16).fill(0), random), random),
        score = 0,
        previous = null;
      const goal = mode ? 2048 : level < 3 ? 128 : 512;
      const [area, tools] = shell(
        `滑动或按方向键，合并相同星石。先试着合成 ${goal}！每次移动只合并一次。`,
      );
      area.classList.add("merge-board");
      const tally = document.createElement("strong");
      tools.append(tally);
      function draw() {
        area.innerHTML = board
          .map(
            (v) =>
              `<span class="merge-tile" style="--tile-hue:${v ? 44 + Math.log2(v) * 19 : 140}">${v || ""}</span>`,
          )
          .join("");
        tally.textContent = `星光积分 ${score}`;
      }
      function move(dir) {
        if (!active()) return;
        const result = A.merge(board, dir);
        if (!result.changed) return;
        previous = { board, score };
        board = A.addTile(result.board, random);
        score += result.score;
        draw();
        if (result.score) cheer();
        if (board.some((v) => v >= goal))
          delay(() => win(`点亮了 ${goal} 星石！`), 500);
        else if (!A.canMerge(board))
          say("星石暂时挤满了，可以撤销或重新开始。");
      }
      for (const [label, d] of [
        ["←", "left"],
        ["↑", "up"],
        ["↓", "down"],
        ["→", "right"],
      ])
        tools.append(button(label, () => move(d)));
      tools.append(
        button("撤销", () => {
          if (previous) {
            board = previous.board;
            score = previous.score;
            previous = null;
            draw();
          }
        }),
        button("重开", () => {
          board = A.addTile(A.addTile(Array(16).fill(0), random), random);
          score = 0;
          previous = null;
          draw();
        }),
      );
      area.onkeydown = (e) => {
        const d = {
          ArrowLeft: "left",
          ArrowRight: "right",
          ArrowUp: "up",
          ArrowDown: "down",
        }[e.key];
        if (d) {
          e.preventDefault();
          move(d);
        }
      };
      let startPoint;
      area.onpointerdown = (e) => {
        startPoint = [e.clientX, e.clientY];
        area.setPointerCapture?.(e.pointerId);
      };
      area.onpointerup = (e) => {
        if (!startPoint) return;
        const x = e.clientX - startPoint[0],
          y = e.clientY - startPoint[1];
        startPoint = null;
        if (Math.max(Math.abs(x), Math.abs(y)) > 20)
          move(
            Math.abs(x) > Math.abs(y)
              ? x > 0
                ? "right"
                : "left"
              : y > 0
                ? "down"
                : "up",
          );
      };
      area.onpointercancel = () => (startPoint = null);
      draw();
    } else if (kind === "kitchen") {
      const foods = [
        ["🥬", "生菜"],
        ["🧀", "芝士"],
        ["🍅", "番茄"],
        ["🥒", "黄瓜"],
        ["🍳", "煎蛋"],
        ["🍄", "蘑菇"],
      ];
      let order = [],
        plate = [],
        served = 0,
        peek = true;
      const [area, tools] = shell(
        "伙伴点了一个汉堡！按订单从左到右放配料，再把汉堡端给它。",
      );
      area.classList.add("kitchen-board");
      function draw() {
        area.innerHTML = `<div class="customer-order"><span>第 ${served + 1} / 3 位客人</span><strong>${peek ? order.map((i) => prop(i, foods[i][0])).join(" → ") : "记住了吗？ ✧ ✧ ✧"}</strong></div><div class="burger-plate"><span class="bun">${prop(6)}</span><div>${plate.map((i) => `<span class="ingredient-pop">${prop(i, foods[i][0])}</span>`).join("") || "<small>等你加入美味配料</small>"}</div><span class="bun">${prop(6)}</span></div>`;
      }
      function next() {
        order = A.shuffle([0, 1, 2, 3, 4, 5], random).slice(0, mode ? 5 : 3);
        plate = [];
        peek = true;
        draw();
        if (mode)
          delay(() => {
            peek = false;
            draw();
          }, 3500);
      }
      foods.forEach(([icon, name], i) => {
        const b = button(icon + " " + name, () => {
          if (plate.length < order.length) {
            plate.push(i);
            draw();
          }
        });
        b.innerHTML = prop(i, icon) + " " + name;
        tools.append(b);
      });
      tools.append(
        button("撤回一层", () => {
          plate.pop();
          draw();
        }),
        button("再看订单", () => {
          peek = true;
          draw();
          if (mode)
            delay(() => {
              peek = false;
              draw();
            }, 2500);
        }),
        button("端给伙伴 ♡", () => {
          if (
            plate.length === order.length &&
            plate.every((v, i) => v === order[i])
          ) {
            served++;
            cheer();
            if (served === 3) win("三位伙伴都吃得心满意足！");
            else next();
          } else say("再看看配料和顺序，不着急，撤回后还能重做。");
        }),
      );
      next();
    } else if (kind === "mole") {
      const [area, tools] = shell(
        "点探头的小伙伴得星星，睡着的月亮不要碰。轻松模式单人，进阶模式双人同屏合作。",
      );
      area.classList.add("mole-garden");
      let hits = [0, 0],
        targets = [-1, -1],
        sleep = [-1, -1],
        round = 0;
      const sides = mode ? 2 : 1,
        target = mode ? 8 : 15;
      function draw() {
        area.innerHTML = "";
        for (let side = 0; side < sides; side++) {
          const garden = document.createElement("section");
          garden.innerHTML = `<strong>${mode ? (side ? "月亮队" : "太阳队") : "收集星星"} ${hits[side]} / ${target}</strong>`;
          const holes = document.createElement("div");
          holes.className = "mole-holes";
          for (let i = 0; i < 6; i++) {
            const b = button(
              i === targets[side] ? "🐹" : i === sleep[side] ? "🌙" : "",
              () => {
                if (i === targets[side]) {
                  hits[side]++;
                  targets[side] = -1;
                  cheer();
                  draw();
                  if (hits.slice(0, sides).every((v) => v >= target))
                    win("一起收集了满满的快乐！");
                } else if (i === sleep[side])
                  say("嘘，让睡星好好休息，找另一只小伙伴。");
              },
              "mole-hole",
            );
            b.setAttribute(
              "aria-label",
              `${side ? "月亮" : "太阳"}花园第${i + 1}个洞，${i === targets[side] ? "小伙伴" : i === sleep[side] ? "睡星" : "空"}`,
            );
            if (i === targets[side] || i === sleep[side])
              b.innerHTML = prop(i === targets[side] ? 7 : 8);
            holes.append(b);
          }
          garden.append(holes);
          area.append(garden);
        }
      }
      function emerge() {
        round++;
        for (let side = 0; side < sides; side++) {
          targets[side] = Math.floor(random() * 6);
          sleep[side] = (targets[side] + 1 + Math.floor(random() * 5)) % 6;
        }
        draw();
      }
      emerge();
      repeat(emerge, mode ? 1500 : 1900);
    } else if (kind === "gomoku") {
      const [area, tools] = shell(
        mode
          ? "双人轮流落子：太阳先手，月亮后手。横、竖、斜连成五颗获胜。"
          : "你执太阳棋先走，伙伴执月亮棋。横、竖、斜连成五颗获胜。",
      );
      let board = Array(81).fill(0),
        turn = 1,
        busy = false,
        ended = false,
        history = [];
      area.classList.add("gomoku-board");
      function draw() {
        area.replaceChildren();
        board.forEach((v, i) => {
          const b = button(
            v ? (v === 1 ? "●" : "○") : "",
            () => {
              if (busy || ended || board[i]) return;
              history.push([...board]);
              place(i);
              if (!mode && !ended && turn === 2 && active()) {
                busy = true;
                delay(() => {
                  place(A.gomokuMove(board));
                  busy = false;
                }, 500);
              }
            },
            "gomoku-point",
          );
          b.dataset.stone = v;
          b.setAttribute(
            "aria-label",
            `${Math.floor(i / 9) + 1}行${(i % 9) + 1}列 ${v === 1 ? "太阳棋" : v === 2 ? "月亮棋" : "空位"}`,
          );
          area.append(b);
        });
        say(`${turn === 1 ? "太阳" : "月亮"}落子`);
      }
      function place(i) {
        if (i === undefined) return;
        board[i] = turn;
        if (A.five(board, i)) {
          ended = true;
          draw();
          if (mode || turn === 1)
            win(`${turn === 1 ? "太阳" : "月亮"}连成五子！`);
          else {
            busy = true;
            say("伙伴这次赢啦！可以点重新开局，再试一次。");
          }
          return;
        }
        turn = 3 - turn;
        draw();
        if (board.every(Boolean)) {
          ended = true;
          busy = true;
          say("平局！势均力敌，再开一局吧。");
        }
      }
      tools.append(
        button("悔棋", () => {
          if (history.length && !busy) {
            board = history.pop();
            turn = mode ? 3 - turn : 1;
            draw();
          }
        }),
        button("重新开局", () => {
          later.forEach(clearTimeout);
          board = Array(81).fill(0);
          turn = 1;
          busy = false;
          ended = false;
          history = [];
          draw();
        }),
      );
      draw();
    } else if (kind === "twentyfour") {
      const sets = mode
        ? [
            [3, 3, 8, 8],
            [1, 5, 5, 5],
            [4, 4, 7, 7],
          ]
        : [
            [1, 2, 3, 4],
            [2, 3, 4, 6],
            [2, 2, 4, 8],
            [1, 2, 4, 8],
          ];
      let cards = sets[(level - 1) % sets.length].map((v) => ({
          v,
          text: String(v),
        })),
        selected = [],
        op = "+",
        history = [];
      const [area, tools] = shell(
        "依次点两个数字，再用加减乘除把它们合成一个。四个数全部用完，结果等于 24 就成功。",
      );
      area.classList.add("twentyfour-cards");
      function draw() {
        area.replaceChildren();
        cards.forEach((c, i) => {
          const b = button(
            c.text,
            () => {
              selected = selected.includes(i)
                ? selected.filter((x) => x !== i)
                : [...selected, i].slice(-2);
              draw();
            },
            "number-candy",
          );
          b.setAttribute("aria-pressed", String(selected.includes(i)));
          area.append(b);
        });
      }
      for (const [symbol, value] of [
        ["＋", "+"],
        ["−", "-"],
        ["×", "*"],
        ["÷", "/"],
      ])
        tools.append(
          button(
            symbol,
            (b) => {
              op = value;
              tools
                .querySelectorAll("[data-operation]")
                .forEach((e) =>
                  e.setAttribute("aria-pressed", String(e === b)),
                );
            },
            "math-operation",
          ),
        );
      [...tools.children].forEach((b, i) => {
        b.dataset.operation = i;
        b.setAttribute("aria-pressed", String(i === 0));
      });
      tools.append(
        button("施展魔法", () => {
          if (selected.length !== 2) {
            say("先按顺序选择两个数字。");
            return;
          }
          const [i, j] = selected,
            a = cards[i],
            b = cards[j];
          if (op === "/" && Math.abs(b.v) < 1e-8) {
            say("不能除以 0，换一种算法。");
            return;
          }
          history.push(cards.map((c) => ({ ...c })));
          const value =
            op === "+"
              ? a.v + b.v
              : op === "-"
                ? a.v - b.v
                : op === "*"
                  ? a.v * b.v
                  : a.v / b.v;
          cards = cards
            .filter((_, k) => k !== i && k !== j)
            .concat({
              v: value,
              text: `(${a.text}${{ "*": "×", "/": "÷" }[op] || op}${b.text})`,
            });
          selected = [];
          draw();
          if (cards.length === 1) {
            if (Math.abs(value - 24) < 1e-8) win("四个数字变成了 24！");
            else
              say(
                `现在是 ${Math.round(value * 100) / 100}，撤销后再换个办法。`,
              );
          }
        }),
        button("撤销", () => {
          if (history.length) {
            cards = history.pop();
            selected = [];
            draw();
          }
        }),
      );
      draw();
    } else if (kind === "blocks") {
      const [area, tools] = shell(
        "左右移动，旋转宝石；填满一行就会消除。消除 3 行过关。也支持方向键。",
      );
      area.classList.add("falling-board");
      let board = Array(160).fill(0),
        piece,
        x,
        y,
        color,
        lines = 0,
        over = false;
      function spawn() {
        const id = Math.floor(random() * A.shapes.length);
        piece = A.shapes[id].map((r) => [...r]);
        color = id + 1;
        x = 3;
        y = 0;
        if (!A.fits(board, piece, x, y)) {
          over = true;
          say("宝石堆到屋顶了，点重新开始再试试。");
        }
      }
      function draw() {
        const visible = [...board];
        if (!over)
          piece.forEach((r, dy) =>
            r.forEach((v, dx) => {
              if (v && y + dy >= 0 && y + dy < 16)
                visible[(y + dy) * 10 + x + dx] = color;
            }),
          );
        area.innerHTML = visible
          .map(
            (v) =>
              `<span class="block-cell ${v ? "filled" : ""}" style="--gem:${v * 43}"></span>`,
          )
          .join("");
        if (!over) say(`已消除 ${lines} / 3 行`);
      }
      function step() {
        if (over || !active()) return;
        if (A.fits(board, piece, x, y + 1)) y++;
        else {
          const result = A.lock(board, piece, x, y, color);
          board = result.board;
          lines += result.lines;
          if (result.lines) cheer();
          if (lines >= 3) {
            win("宝石小屋整理好啦！");
            return;
          }
          spawn();
        }
        draw();
      }
      function move(dx) {
        if (!over && A.fits(board, piece, x + dx, y)) {
          x += dx;
          draw();
        }
      }
      function spin() {
        const p = A.rotate(piece);
        for (const shift of [0, -1, 1, -2, 2])
          if (!over && A.fits(board, p, x + shift, y)) {
            piece = p;
            x += shift;
            draw();
            break;
          }
      }
      tools.append(
        button("←", () => move(-1)),
        button("旋转 ↻", spin),
        button("→", () => move(1)),
        button("落下 ↓", () => {
          if (over) return;
          while (A.fits(board, piece, x, y + 1)) y++;
          step();
        }),
        button("重新开始", () => {
          board = Array(160).fill(0);
          lines = 0;
          over = false;
          spawn();
          draw();
        }),
      );
      area.onkeydown = (e) => {
        if (!active()) return;
        const fn = {
          ArrowLeft: () => move(-1),
          ArrowRight: () => move(1),
          ArrowUp: spin,
          ArrowDown: step,
          " ": () => {
            while (!over && A.fits(board, piece, x, y + 1)) y++;
            step();
          },
        }[e.key];
        if (fn) {
          e.preventDefault();
          fn();
        }
      };
      spawn();
      draw();
      repeat(step, mode ? 550 : 950);
    }
  }
  arena.className = "arcade-lobby";
  arena.innerHTML = `<div class="arcade-emblem">${A.catalog[kind].icon}</div><h3>${A.catalog[kind].name}</h3><p>${A.catalog[kind].hint}</p><p>从第 ${level} 关继续 · 过关进度自动保存</p><div class="difficulty-options"></div>`;
  const options = arena.querySelector(".difficulty-options");
  for (const [i, label] of ["轻松探索", "进阶挑战"].entries()) {
    const b = button(label, () => {
      mode = i;
      options
        .querySelectorAll("button")
        .forEach((e, j) => e.setAttribute("aria-pressed", String(j === i)));
    });
    b.setAttribute("aria-pressed", String(mode === i));
    options.append(b);
  }
  arena.append(button("和伙伴一起出发 →", start, "primary arcade-start"));
  return cleanup;
}
