/* Small deterministic puzzle rules. No network, telemetry or external engines. */
(function (root) {
  const catalog = {
    water: {
      name: "彩虹药水坊",
      icon: "⚗",
      tag: "规划 · 分类",
      hint: "把同色药水收进同一瓶",
    },
    puzzle: {
      name: "森林拼图",
      icon: "▧",
      tag: "观察 · 空间",
      hint: "拼回一幅童话风景",
    },
    sum: {
      name: "星糖加加乐",
      icon: "＋",
      tag: "口算 · 配对",
      hint: "找到两颗能凑成目标的星糖",
    },
    sudoku: {
      name: "精灵数独",
      icon: "▦",
      tag: "逻辑 · 推理",
      hint: "让每行、每列、每宫都不重复",
    },
    merge: {
      name: "星光 2048",
      icon: "✦",
      tag: "数字 · 规划",
      hint: "滑动合并，点亮更大的星石",
    },
    kitchen: {
      name: "宠物美食屋",
      icon: "♨",
      tag: "记忆 · 顺序",
      hint: "记住伙伴点的美味汉堡",
    },
    mole: {
      name: "花园躲猫猫",
      icon: "❀",
      tag: "反应 · 双人",
      hint: "找出探头的小伙伴，别碰睡星",
    },
    gomoku: {
      name: "月光五子棋",
      icon: "●",
      tag: "策略 · 亲子",
      hint: "和伙伴或家人连成五颗棋子",
    },
    twentyfour: {
      name: "魔法 24 点",
      icon: "24",
      tag: "计算 · 思维",
      hint: "四个数字，一起变成 24",
    },
    blocks: {
      name: "宝石方块",
      icon: "▥",
      tag: "空间 · 规划",
      hint: "旋转下落的宝石，填满一整行",
    },
  };
  function rng(seed) {
    let n = seed >>> 0;
    return () => {
      n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
      return n / 4294967296;
    };
  }
  function shuffle(a, random) {
    a = [...a];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function pour(board, from, to, cap) {
    if (
      from === to ||
      !board[from]?.length ||
      !board[to] ||
      board[to].length === cap
    )
      return null;
    const a = board[from],
      b = board[to],
      color = a.at(-1);
    if (b.length && b.at(-1) !== color) return null;
    let count = 0;
    for (let i = a.length - 1; i >= 0 && a[i] === color; i--) count++;
    count = Math.min(count, cap - b.length);
    const next = board.map((t) => [...t]);
    next[from].splice(a.length - count, count);
    next[to].push(...Array(count).fill(color));
    return next;
  }
  const waterSolved = (b, cap) =>
    b.every(
      (t) => !t.length || (t.length === cap && t.every((v) => v === t[0])),
    );
  function water(level, mode) {
    const cap = mode ? 4 : 3,
      n = mode ? 4 : Math.min(3, 2 + Math.floor(level / 3));
    return {
      cap,
      board: Array.from({ length: n }, (_, i) =>
        Array.from({ length: cap }, (_, j) => (i + j) % n),
      ).concat([[], []]),
    };
  }
  function merge(board, dir) {
    const out = Array(16).fill(0);
    let score = 0;
    for (let row = 0; row < 4; row++) {
      const ids = Array.from({ length: 4 }, (_, i) =>
        dir === "left"
          ? row * 4 + i
          : dir === "right"
            ? row * 4 + 3 - i
            : dir === "up"
              ? i * 4 + row
              : (3 - i) * 4 + row,
      );
      const a = ids.map((i) => board[i]).filter(Boolean),
        line = [];
      for (let i = 0; i < a.length; i++) {
        if (a[i] === a[i + 1]) {
          line.push(a[i] * 2);
          score += a[i] * 2;
          i++;
        } else line.push(a[i]);
      }
      ids.forEach((id, i) => (out[id] = line[i] || 0));
    }
    return { board: out, score, changed: out.some((v, i) => v !== board[i]) };
  }
  const canMerge = (b) =>
    ["left", "right", "up", "down"].some((d) => merge(b, d).changed);
  function addTile(b, random) {
    const next = [...b],
      empty = next.map((v, i) => (v ? null : i)).filter((i) => i !== null);
    if (empty.length)
      next[empty[Math.floor(random() * empty.length)]] = random() < 0.9 ? 2 : 4;
    return next;
  }
  function choices(b, n, i) {
    const r = Math.floor(i / n),
      c = i % n,
      w = n === 6 ? 3 : 2,
      h = 2;
    return Array.from({ length: n }, (_, j) => j + 1).filter(
      (v) =>
        !b.some(
          (x, k) =>
            x === v &&
            (Math.floor(k / n) === r ||
              k % n === c ||
              (Math.floor(Math.floor(k / n) / h) === Math.floor(r / h) &&
                Math.floor((k % n) / w) === Math.floor(c / w))),
        ),
    );
  }
  function solutions(board, n, limit = 2) {
    let count = 0;
    const b = [...board];
    function visit() {
      let best = -1,
        opts = [];
      for (let i = 0; i < b.length; i++)
        if (!b[i]) {
          const a = choices(b, n, i);
          if (!a.length) return;
          if (best < 0 || a.length < opts.length) {
            best = i;
            opts = a;
          }
        }
      if (best < 0) {
        count++;
        return;
      }
      for (const v of opts) {
        b[best] = v;
        visit();
        if (count >= limit) break;
      }
      b[best] = 0;
    }
    visit();
    return count;
  }
  function sudoku(level, mode) {
    const n = mode ? 6 : 4,
      w = n / 2,
      random = rng(level + 31),
      digits = shuffle(
        Array.from({ length: n }, (_, i) => i + 1),
        random,
      );
    const answer = Array.from(
      { length: n * n },
      (_, i) =>
        digits[
          (Math.floor(i / n) * w +
            Math.floor(Math.floor(i / n) / 2) +
            (i % n)) %
            n
        ],
    );
    const board = [...answer];
    let holes = 0;
    for (const i of shuffle(
      Array.from({ length: n * n }, (_, i) => i),
      random,
    )) {
      const old = board[i];
      board[i] = 0;
      if (solutions(board, n) !== 1) board[i] = old;
      else holes++;
      if (holes >= Math.floor(n * n * 0.55)) break;
    }
    return { n, answer, board, given: board.map(Boolean) };
  }
  function five(b, index, n = 9) {
    const who = b[index];
    if (!who) return false;
    const r = Math.floor(index / n),
      c = index % n;
    return [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ].some(([dr, dc]) => {
      let count = 1;
      for (const sign of [-1, 1])
        for (let t = 1; t < 5; t++) {
          const y = r + dr * t * sign,
            x = c + dc * t * sign;
          if (y < 0 || x < 0 || y >= n || x >= n || b[y * n + x] !== who) break;
          count++;
        }
      return count >= 5;
    });
  }
  function gomokuMove(b) {
    const empty = b.map((x, i) => (x ? null : i)).filter((i) => i !== null);
    for (const who of [2, 1])
      for (const i of empty) {
        const next = [...b];
        next[i] = who;
        if (five(next, i)) return i;
      }
    let best = empty[0],
      score = -Infinity;
    for (const i of empty) {
      const r = Math.floor(i / 9),
        c = i % 9;
      let s = -Math.abs(r - 4) - Math.abs(c - 4);
      b.forEach((v, j) => {
        if (
          v &&
          Math.max(Math.abs(Math.floor(j / 9) - r), Math.abs((j % 9) - c)) === 1
        )
          s += v === 2 ? 4 : 3;
      });
      if (s > score) {
        score = s;
        best = i;
      }
    }
    return best;
  }
  const shapes = [
    [[1, 1, 1, 1]],
    [
      [1, 1],
      [1, 1],
    ],
    [
      [0, 1, 0],
      [1, 1, 1],
    ],
    [
      [1, 0],
      [1, 0],
      [1, 1],
    ],
    [
      [0, 1],
      [0, 1],
      [1, 1],
    ],
    [
      [0, 1, 1],
      [1, 1, 0],
    ],
    [
      [1, 1, 0],
      [0, 1, 1],
    ],
  ];
  const rotate = (a) => a[0].map((_, x) => a.map((row) => row[x]).reverse());
  const fits = (b, p, x, y) =>
    p.every((row, dy) =>
      row.every(
        (v, dx) =>
          !v ||
          (x + dx >= 0 &&
            x + dx < 10 &&
            y + dy >= 0 &&
            y + dy < 16 &&
            !b[(y + dy) * 10 + x + dx]),
      ),
    );
  function lock(b, p, x, y, color) {
    let next = [...b];
    p.forEach((row, dy) =>
      row.forEach((v, dx) => {
        if (v) next[(y + dy) * 10 + x + dx] = color;
      }),
    );
    let rows = Array.from({ length: 16 }, (_, i) =>
      next.slice(i * 10, i * 10 + 10),
    ).filter((row) => row.some((v) => !v));
    const lines = 16 - rows.length;
    while (rows.length < 16) rows.unshift(Array(10).fill(0));
    return { board: rows.flat(), lines };
  }
  const api = {
    catalog,
    rng,
    shuffle,
    pour,
    water,
    waterSolved,
    merge,
    canMerge,
    addTile,
    sudoku,
    choices,
    solutions,
    five,
    gomokuMove,
    shapes,
    rotate,
    fits,
    lock,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ArcadeModel = api;
})(globalThis);
