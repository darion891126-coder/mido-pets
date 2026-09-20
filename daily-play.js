(function (root) {
  const games = {
    water: "彩虹药水坊",
    puzzle: "森林拼图",
    sum: "星糖加加乐",
    sudoku: "精灵数独",
    merge: "星光 2048",
    kitchen: "宠物美食屋",
    mole: "花园躲猫猫",
    gomoku: "月光五子棋",
    twentyfour: "魔法 24 点",
    blocks: "宝石方块",
  };
  function seed(text) {
    let n = 2166136261;
    for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
    return n >>> 0;
  }
  function shuffle(items, key) {
    const a = [...items];
    let n = seed(key);
    for (let i = a.length - 1; i > 0; i--) {
      n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
      const j = n % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function daily(date) {
    return shuffle(Object.keys(games), date).slice(0, 3);
  }
  function remaining(record, date) {
    return Math.max(
      0,
      600 - (record?.date === date ? Math.max(0, Number(record.used) || 0) : 0),
    );
  }
  const api = { games, seed, shuffle, daily, remaining };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DailyPlay = api;
})(globalThis);
