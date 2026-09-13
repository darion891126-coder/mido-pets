(function (root) {
  const core =
    root.CORE_VOCABULARY ||
    (typeof require === "function" ? require("./wordpacks/core.json") : null);
  const KEY = "mido-wordpacks-v1";
  const PACK_CACHE = "mido-wordpack-audio-v1";
  let packs = [];
  function validate(pack) {
    if (
      !pack ||
      !/^[a-z0-9-]+$/.test(pack.id) ||
      !Number.isInteger(pack.version) ||
      pack.version < 1 ||
      !Array.isArray(pack.words) ||
      !pack.words.length ||
      pack.words.length > 600 ||
      pack.words.length % 3
    )
      throw new Error("词包格式不正确");
    const ids = new Set();
    for (const w of pack.words) {
      if (
        !w ||
        !/^[a-z]+$/.test(w.id) ||
        w.word !== w.id ||
        typeof w.chinese !== "string" ||
        !w.chinese.length ||
        w.chinese.length > 20 ||
        typeof w.icon !== "string" ||
        w.icon.length > 20 ||
        w.audio !== "audio/" + w.id + ".mp3" ||
        ids.has(w.id)
      )
        throw new Error("词包内容不正确");
      ids.add(w.id);
    }
    for (let i = 0; i < pack.words.length; i += 3)
      if (new Set(pack.words.slice(i, i + 3).map((w) => w.icon)).size !== 3)
        throw new Error("图片选项重复");
    return pack;
  }
  try {
    packs = JSON.parse(localStorage.getItem(KEY) || "[]").map(validate);
  } catch {
    packs = [];
  }
  function words() {
    return [...core.words, ...packs.flatMap((p) => p.words)].filter(
      (w, i, all) => all.findIndex((x) => x.id === w.id) === i,
    );
  }
  function lesson(day, ids) {
    const all = words();
    const group =
      ids?.length === 3
        ? ids.map((id) => all.find((w) => w.id === id))
        : all.slice(
            (day % (all.length / 3)) * 3,
            (day % (all.length / 3)) * 3 + 3,
          );
    if (group.some((w) => !w)) return lesson(day);
    return group.map((w, i) => ({
      ...w,
      alternatives: [
        group[(i + 1) % 3].icon,
        group[i].icon,
        group[(i + 2) % 3].icon,
      ].sort((a, b) => a.localeCompare(b)),
    }));
  }
  async function checkedFetch(url) {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok || response.redirected)
      throw new Error("下载未完成，请联网后重试");
    return response;
  }
  async function update(progress = () => {}) {
    if (!root.caches)
      throw new Error("当前浏览器不支持离线词包，请使用 HTTPS 或本机预览");
    const manifest = await (
      await checkedFetch("wordpacks/manifest.json")
    ).json();
    if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.packs))
      throw new Error("更新目录格式不正确");
    let added = 0;
    for (const entry of manifest.packs) {
      if (packs.some((p) => p.id === entry.id && p.version >= entry.version))
        continue;
      if (!/^wordpacks\/[a-z0-9-]+\.json$/.test(entry.url))
        throw new Error("词包地址不正确");
      const pack = validate(await (await checkedFetch(entry.url)).json());
      if (pack.id !== entry.id || pack.version !== entry.version)
        throw new Error("词包版本不匹配");
      const others = [core, ...packs.filter((p) => p.id !== pack.id)].flatMap(
        (p) => p.words,
      );
      if (pack.words.some((w) => others.some((x) => x.id === w.id)))
        throw new Error("新词包与已有词汇重复");
      const old = packs.find((p) => p.id === pack.id);
      if (
        old &&
        old.words.some(
          (w) => !pack.words.some((n) => n.id === w.id && n.audio === w.audio),
        )
      )
        throw new Error("新版本不能删除正在学习的词汇");
      const cache = await caches.open(PACK_CACHE);
      const responses = [];
      for (let i = 0; i < pack.words.length; i++) {
        progress(`正在保存扩展语音 ${i + 1} / ${pack.words.length}`);
        const response = await checkedFetch(pack.words[i].audio);
        if (!(response.headers.get("content-type") || "").includes("audio/"))
          throw new Error("语音文件格式不正确");
        responses.push(response);
      }
      for (let i = 0; i < pack.words.length; i++)
        await cache.put(pack.words[i].audio, responses[i]);
      const next = [...packs.filter((p) => p.id !== pack.id), pack];
      localStorage.setItem(KEY, JSON.stringify(next));
      packs = next;
      added += pack.words.length - (old?.words.length || 0);
    }
    return added;
  }
  const api = { words, lesson, validate, update, core, PACK_CACHE };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Vocabulary = api;
})(globalThis);
