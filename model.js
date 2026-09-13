(function (root) {
  const pets = [
    {
      species: "彩虹独角兽",
      trait: "温柔 · 好奇 · 喜欢贴贴",
      intro: "想和你一起，把平凡的小日子变成彩虹。",
      names: ["糖糖", "朵朵", "小彩虹"],
      pos: "0% 0%",
    },
    {
      species: "云朵小龙",
      trait: "勇敢 · 活泼 · 爱冒险",
      intro: "它会陪你勇敢试一试，也会接住你的小紧张。",
      names: ["团团", "薄荷", "云宝"],
      pos: "50% 0%",
    },
    {
      species: "月光小兔",
      trait: "细心 · 安静 · 爱听故事",
      intro: "把月光藏进耳朵，把你的故事放在心里。",
      names: ["月月", "糯米", "小月亮"],
      pos: "100% 0%",
    },
    {
      species: "星尾小狐狸",
      trait: "机灵 · 爱玩 · 喜欢惊喜",
      intro: "跟着它的星光尾巴，每天发现一个小惊喜。",
      names: ["星星", "桃桃", "小橘子"],
      pos: "0% 100%",
    },
    {
      species: "魔法猫猫",
      trait: "好奇 · 聪明 · 软软黏人",
      intro: "轻轻呼噜一下，把今天变成暖暖的魔法。",
      names: ["咪露", "布丁", "绵绵"],
      pos: "50% 100%",
    },
    {
      species: "暖阳狗狗",
      trait: "亲人 · 热情 · 温暖可靠",
      intro: "你一回来，它就会摇着尾巴向你跑来。",
      names: ["暖暖", "奶油", "可可"],
      pos: "100% 100%",
    },
  ];
  const questions = [
    {
      title: "如果有一扇魔法门，",
      line: "你想去哪里玩？",
      options: [
        {
          icon: "☁",
          title: "彩虹云朵上",
          hint: "看看天空藏着什么",
          scores: [3, 3, 0, 0, 0, 0],
        },
        {
          icon: "✧",
          title: "星光小森林",
          hint: "寻找闪闪的小秘密",
          scores: [0, 0, 3, 3, 0, 0],
        },
        {
          icon: "⌂",
          title: "暖暖的魔法屋",
          hint: "窝在一起也很快乐",
          scores: [0, 0, 0, 0, 3, 3],
        },
      ],
    },
    {
      title: "遇到一个新朋友，",
      line: "你想先做什么？",
      options: [
        {
          icon: "♡",
          title: "给它一个抱抱",
          hint: "我们慢慢熟悉吧",
          scores: [3, 0, 2, 0, 0, 3],
        },
        {
          icon: "↗",
          title: "一起出去探险",
          hint: "出发，去看看！",
          scores: [0, 3, 0, 3, 1, 0],
        },
        {
          icon: "☾",
          title: "分享一个小秘密",
          hint: "只说给你听哦",
          scores: [1, 0, 3, 0, 3, 0],
        },
      ],
    },
    {
      title: "你捡到一颗小星星，",
      line: "想用它做什么？",
      options: [
        {
          icon: "✦",
          title: "变一个小魔法",
          hint: "猜猜会发生什么",
          scores: [2, 0, 0, 1, 4, 0],
        },
        {
          icon: "☼",
          title: "照亮朋友的小窝",
          hint: "让它暖暖的",
          scores: [1, 0, 3, 0, 0, 4],
        },
        {
          icon: "➶",
          title: "画一张寻宝地图",
          hint: "一起找到宝藏",
          scores: [0, 4, 0, 3, 0, 0],
        },
      ],
    },
    {
      title: "一起度过的一天，",
      line: "你最喜欢哪一刻？",
      options: [
        {
          icon: "❀",
          title: "发现一朵漂亮的花",
          hint: "小小的美好也要记住",
          scores: [4, 0, 2, 0, 0, 0],
        },
        {
          icon: "✧",
          title: "玩一个新游戏",
          hint: "笑得停不下来",
          scores: [0, 2, 0, 4, 1, 1],
        },
        {
          icon: "♡",
          title: "靠在一起说晚安",
          hint: "明天也要见面哦",
          scores: [0, 0, 2, 0, 3, 3],
        },
      ],
    },
  ];
  const stages = [
    {
      day: 1,
      title: "初生宝宝",
      detail: "小小一团，第一次认识你",
      scale: 0.76,
      adult: false,
    },
    {
      day: 7,
      title: "好奇幼年",
      detail: "长大一点，探索身边的世界",
      scale: 0.85,
      adult: false,
    },
    {
      day: 14,
      title: "活力少年",
      detail: "身姿渐渐舒展，魔法开始发光",
      scale: 0.96,
      adult: false,
    },
    {
      day: 30,
      title: "美丽成长期",
      detail: "换上成熟身姿，毛发更加华美",
      scale: 0.97,
      adult: true,
    },
    {
      day: 60,
      title: "闪耀伙伴",
      detail: "专属装饰绽放，可以邀请下一位伙伴",
      scale: 1.07,
      adult: true,
    },
  ];
  function chinaDate(date = new Date()) {
    const p = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const value = (type) => p.find((part) => part.type === type).value;
    return `${value("year")}-${value("month")}-${value("day")}`;
  }
  function matchPet(answers, surpriseSeed) {
    if (
      answers.length !== questions.length ||
      answers.some((a) => !Number.isInteger(a) || a < 0 || a > 2)
    )
      throw new Error("Complete all four questions");
    const scores = pets.map(() => 0);
    answers.forEach((a, q) =>
      questions[q].options[a].scores.forEach(
        (score, i) => (scores[i] += score),
      ),
    );
    const max = Math.max(...scores),
      tied = scores.map((s, i) => (s === max ? i : -1)).filter((i) => i >= 0);
    const seed =
      surpriseSeed === undefined
        ? answers.reduce((n, a) => n * 3 + a, 0)
        : surpriseSeed;
    return tied[seed % tied.length];
  }
  function growth(days) {
    const index = stages.reduce(
      (found, stage, i) => (days >= stage.day ? i : found),
      0,
    );
    const current = stages[index],
      next = stages[index + 1];
    const fraction = next
      ? Math.max(
          0,
          Math.min(1, (days - current.day) / (next.day - current.day)),
        )
      : 1;
    return {
      ...current,
      index,
      next,
      scale:
        next && current.adult === next.adult
          ? current.scale + (next.scale - current.scale) * fraction
          : current.scale,
      remaining: next ? Math.max(0, next.day - days) : 0,
    };
  }
  function freshState() {
    return {
      version: 2,
      adoptionMode: null,
      answers: [],
      species: null,
      phase: "quiz",
      name: "",
      matchedAt: null,
      hatchedAt: null,
      completedDates: [],
      task: null,
    };
  }
  function validState(s) {
    if (
      !s ||
      s.version !== 2 ||
      !["quiz", "egg", "pet"].includes(s.phase) ||
      !Array.isArray(s.answers) ||
      s.answers.length > 4 ||
      s.answers.some((a) => !Number.isInteger(a) || a < 0 || a > 2)
    )
      return false;
    if (![undefined, null, "quiz", "direct"].includes(s.adoptionMode))
      return false;
    if (
      s.matchSeed !== undefined &&
      (!Number.isInteger(s.matchSeed) ||
        s.matchSeed < 0 ||
        s.matchSeed > 4294967295)
    )
      return false;
    if (s.phase !== "quiz") {
      if (s.adoptionMode === "direct") {
        if (
          !Number.isInteger(s.species) ||
          s.species < 0 ||
          s.species >= pets.length
        )
          return false;
      } else if (
        s.answers.length !== 4 ||
        s.species !== matchPet(s.answers, s.matchSeed)
      )
        return false;
    }
    if (
      typeof s.name !== "string" ||
      s.name.length > 12 ||
      !Array.isArray(s.completedDates) ||
      s.completedDates.some(
        (d) => typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d),
      ) ||
      new Set(s.completedDates).size !== s.completedDates.length
    )
      return false;
    if (
      s.phase === "pet" &&
      (!s.completedDates.length || !Number.isFinite(Date.parse(s.hatchedAt)))
    )
      return false;
    if (s.phase !== "pet" && s.completedDates.length) return false;
    for (const ids of [s.task?.wordIds, s.lastWordIds]) {
      if (
        ids !== undefined &&
        (!Array.isArray(ids) ||
          ids.length !== 3 ||
          ids.some((id) => typeof id !== "string" || !/^[a-z]+$/.test(id)))
      )
        return false;
    }
    if (
      s.task &&
      (typeof s.task.date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(s.task.date) ||
        !Number.isInteger(s.task.step) ||
        s.task.step < 0 ||
        s.task.step > 3)
    )
      return false;
    return true;
  }
  const api = {
    pets,
    questions,
    stages,
    chinaDate,
    matchPet,
    growth,
    freshState,
    validState,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PetModel = api;
})(globalThis);
