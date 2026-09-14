(function (root) {
  const games = {
    race: "林间赛跑",
    hide: "花园捉迷藏",
    disc: "彩虹飞盘",
    words: "单词寻宝",
    memory: "魔法翻翻乐",
    stars: "星星采集",
    lily: "月光跳荷叶",
    butterfly: "花谷追蝴蝶",
    fruit: "果园接果果",
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
