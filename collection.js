(function (root) {
  const M = root.PetModel || require("./model.js");
  const fields = [
    "adoptionMode",
    "answers",
    "species",
    "phase",
    "name",
    "matchedAt",
    "hatchedAt",
    "completedDates",
    "task",
    "matchSeed",
    "directChoice",
    "adoptionUsed",
  ];
  function snapshot(s) {
    const p = { version: 2 };
    for (const key of fields)
      if (s[key] !== undefined) p[key] = JSON.parse(JSON.stringify(s[key]));
    return p;
  }
  function ensure(s, id) {
    s.companions ??= [];
    s.activePetId ??= id;
  }
  function stash(s) {
    const record = { id: s.activePetId, pet: snapshot(s) },
      index = s.companions.findIndex((p) => p.id === s.activePetId);
    if (index < 0) s.companions.push(record);
    else s.companions[index] = record;
  }
  function select(s, id) {
    const target = s.companions.find((p) => p.id === id);
    if (!target) throw new Error("这位伙伴还没来到森林。");
    const pet = JSON.parse(JSON.stringify(target.pet));
    stash(s);
    for (const key of fields) delete s[key];
    Object.assign(s, pet);
    s.activePetId = id;
  }
  function adopt(s, id) {
    if (s.phase !== "pet" || s.completedDates.length < 60 || s.adoptionUsed)
      throw new Error(
        "这位伙伴养满60个成长日后，可以邀请一位新伙伴。每位伙伴开放一次。",
      );
    s.adoptionUsed = true;
    stash(s);
    for (const key of fields) delete s[key];
    Object.assign(s, M.freshState());
    s.activePetId = id;
  }
  function valid(s) {
    try {
      return (
        (s.playHistory === undefined ||
          (s.playHistory &&
            Object.entries(s.playHistory).every(
              ([date, games]) =>
                /^\d{4}-\d{2}-\d{2}$/.test(date) &&
                Array.isArray(games) &&
                games.length <= 9 &&
                games.every((g) =>
                  [
                    "race",
                    "hide",
                    "disc",
                    "words",
                    "memory",
                    "stars",
                    "lily",
                    "butterfly",
                    "fruit",
                  ].includes(g),
                ),
            ))) &&
        (s.activePetId === undefined || typeof s.activePetId === "string") &&
        (s.companions === undefined ||
          (Array.isArray(s.companions) &&
            s.companions.length <= 100 &&
            new Set(s.companions.map((p) => p.id)).size ===
              s.companions.length &&
            s.companions.every(
              (p) =>
                p &&
                typeof p.id === "string" &&
                M.validState(p.pet) &&
                !p.pet.companions,
            )))
      );
    } catch {
      return false;
    }
  }
  const api = { ensure, stash, select, adopt, valid, snapshot };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Collection = api;
})(globalThis);
