(function (root) {
  const items = {
    cookie: { icon: "🍪", name: "星星饼干", action: "喂给小伙伴" },
    fruit: { icon: "🍎", name: "暖阳果果", action: "喂给小伙伴" },
    feather: { icon: "🪶", name: "星光羽毛", action: "放一场星光雨" },
    toy: { icon: "🧶", name: "彩虹线球", action: "陪小伙伴玩" },
  };
  const kinds = {
    writing: { name: "书面作业", icon: "✏️", item: "cookie", amount: 2 },
    reading: { name: "阅读背诵", icon: "📖", item: "feather", amount: 1 },
    practice: { name: "练琴运动", icon: "🎵", item: "toy", amount: 1 },
    life: { name: "生活小事", icon: "🌱", item: "fruit", amount: 2 },
  };
  function ensure(s) {
    s.homework ??= {
      days: {},
      repeats: [],
      inventory: { cookie: 0, fruit: 0, feather: 0, toy: 0 },
    };
    return s.homework;
  }
  function validReward(reward) {
    return (
      reward &&
      Object.hasOwn(items, reward.item) &&
      Number.isInteger(reward.amount) &&
      reward.amount >= 1 &&
      reward.amount <= 5
    );
  }
  function rewardFor(task) {
    return task.reward || kinds[task.kind];
  }
  function day(s, date) {
    const h = ensure(s);
    if (!h.days[date]) {
      const weekday = new Date(date + "T12:00:00+08:00").getUTCDay();
      h.days[date] = {
        tasks: h.repeats
          .filter(
            (r) =>
              r.active &&
              (!r.startDate || date >= r.startDate) &&
              (r.repeat === "daily" || (weekday >= 1 && weekday <= 5)),
          )
          .map((r) => ({
            id: r.id + "-" + date,
            title: r.title,
            kind: r.kind,
            reward: r.reward,
            status: "todo",
            note: "",
            minutes: 0,
            photo: null,
            feedback: "",
          })),
        credited: false,
      };
    }
    return h.days[date];
  }
  function add(s, date, { id, title, kind, repeat = "once", reward }) {
    const d = day(s, date);
    if (d.credited || d.tasks.some((t) => t.status !== "todo"))
      throw new Error("已有提交记录，今天的约定已锁定。明天可以安排新的任务。");
    title = String(title || "").trim();
    if (reward !== undefined && !validReward(reward))
      throw new Error("请选择有效奖励，数量1到5。");
    if (
      !title ||
      title.length > 60 ||
      !Object.hasOwn(kinds, kind) ||
      !["once", "daily", "weekdays"].includes(repeat) ||
      d.tasks.length >= 12 ||
      d.tasks.some((t) => t.id === id)
    )
      throw new Error("请填写60字以内的任务，每天最多12项。");
    if (
      repeat !== "once" &&
      ensure(s).repeats.filter((r) => r.active).length >= 12
    )
      throw new Error("最多设置12项重复约定。");
    d.tasks.push({
      id,
      title,
      kind,
      reward,
      status: "todo",
      note: "",
      minutes: 0,
      photo: null,
      feedback: "",
    });
    if (repeat !== "once")
      ensure(s).repeats.push({
        id,
        title,
        kind,
        reward,
        repeat,
        startDate: date,
        active: true,
      });
  }
  function remove(s, date, id) {
    const d = day(s, date);
    if (d.credited || d.tasks.some((t) => t.status !== "todo"))
      throw new Error("提交后不能移除今天的约定。");
    d.tasks = d.tasks.filter((t) => t.id !== id);
  }
  function submit(s, date, id, { note = "", minutes = 0, photo = null }) {
    if (s.phase === "quiz") throw new Error("先让星光找到你的小伙伴吧。");
    const t = day(s, date).tasks.find((t) => t.id === id);
    if (!t || !["todo", "returned", "submitted"].includes(t.status))
      throw new Error("这项任务已经提交过啦。");
    if (t.kind === "writing" && (typeof photo !== "string" || !photo.trim()))
      throw new Error("书面作业需要拍一张照片，才能开始打卡。");
    if (
      typeof note !== "string" ||
      note.length > 240 ||
      !Number.isInteger(minutes) ||
      minutes < 0 ||
      minutes > 600 ||
      (photo !== null && typeof photo !== "string")
    )
      throw new Error("请检查完成记录。");
    Object.assign(t, {
      note: note.trim(),
      minutes,
      photo,
      status: "submitted",
      submittedAt: new Date().toISOString(),
    });
  }
  function review(s, date, id, approved, feedback = "", mode = "parent") {
    const d = day(s, date),
      t = d.tasks.find((t) => t.id === id);
    if (!t || t.status !== "submitted")
      throw new Error("这项任务已经处理过了。");
    if (typeof feedback !== "string" || feedback.length > 120)
      throw new Error("提醒请控制在120字以内。");
    if (!approved) {
      t.status = "returned";
      t.feedback = feedback.trim() || "再检查一下，完成后重新提交就好。";
      return { reward: null, grown: false, hatched: false };
    }
    if (t.kind === "writing" && !t.photo)
      throw new Error("请先补充这项作业的照片。");
    const reward = rewardFor(t),
      h = ensure(s);
    t.status = "approved";
    t.reviewMode = mode;
    t.reviewedAt = new Date().toISOString();
    t.feedback = "";
    h.inventory[reward.item] += reward.amount;
    const result = { reward: { ...reward }, grown: false, hatched: false };
    if (
      !d.credited &&
      d.tasks.length &&
      d.tasks.every((t) => t.status === "approved")
    ) {
      d.credited = true;
      if (!s.completedDates.includes(date)) {
        s.completedDates.push(date);
        s.completedDates.sort();
        result.grown = true;
      }
      if (s.phase === "egg") {
        s.phase = "pet";
        s.hatchedAt = new Date().toISOString();
        result.hatched = true;
      }
    }
    return result;
  }
  function completeRitual(s, date, id, evidence) {
    submit(s, date, id, evidence);
    return review(s, date, id, true, "", "ritual");
  }
  function use(s, key) {
    const h = ensure(s);
    if (s.phase !== "pet" || !Object.hasOwn(items, key) || h.inventory[key] < 1)
      throw new Error("背包里还没有这件物品。");
    h.inventory[key]--;
    return items[key];
  }
  function valid(h) {
    if (
      !h ||
      typeof h.days !== "object" ||
      !h.days ||
      !Array.isArray(h.repeats) ||
      !h.inventory
    )
      return false;
    if (
      !Object.keys(items).every(
        (k) => Number.isSafeInteger(h.inventory[k]) && h.inventory[k] >= 0,
      )
    )
      return false;
    const goodTask = (t) =>
      t &&
      typeof t.id === "string" &&
      /^[a-zA-Z0-9-]+$/.test(t.id) &&
      typeof t.title === "string" &&
      t.title.length <= 60 &&
      Object.hasOwn(kinds, t.kind) &&
      (t.reward === undefined || validReward(t.reward));
    if (
      !h.repeats.every(
        (r) =>
          goodTask(r) &&
          ["daily", "weekdays"].includes(r.repeat) &&
          typeof r.active === "boolean",
      )
    )
      return false;
    return Object.entries(h.days).every(
      ([date, d]) =>
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        d &&
        typeof d.credited === "boolean" &&
        Array.isArray(d.tasks) &&
        d.tasks.length <= 12 &&
        new Set(d.tasks.map((t) => t.id)).size === d.tasks.length &&
        d.tasks.every(
          (t) =>
            goodTask(t) &&
            ["todo", "submitted", "returned", "approved"].includes(t.status) &&
            typeof t.note === "string" &&
            t.note.length <= 240 &&
            typeof t.feedback === "string" &&
            t.feedback.length <= 120 &&
            Number.isInteger(t.minutes) &&
            t.minutes >= 0 &&
            t.minutes <= 600 &&
            (t.photo === null || typeof t.photo === "string"),
        ),
    );
  }
  const api = {
    rewardFor,
    items,
    kinds,
    ensure,
    day,
    add,
    remove,
    submit,
    review,
    completeRitual,
    use,
    valid,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HomeworkModel = api;
})(globalThis);
