const H = HomeworkModel;
let parentSession = null;
let photoUrls = [];
let selectedSubmission = null;
let ritualBusy = false;
let ritualOutcome = null;
let ritualPreviewUrl = null;

// Save the reward, review result and growth date together. A failed write awards nothing.
async function changeHomework(operation) {
  const run = async () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const latest = stored ? JSON.parse(stored) : state;
    if (
      !M.validState(latest) ||
      (window.Collection && !Collection.valid(latest)) ||
      (latest.homework && !H.valid(latest.homework))
    )
      throw new Error("记录暂时无法读取，请重新打开页面。");
    const next = structuredClone(latest);
    H.ensure(next);
    const result = operation(next);
    for (const day of Object.values(next.homework.days))
      for (const task of day.tasks) task.photo = null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    state = next;
    if (!result?.hatched) render();
    return result;
  };
  return navigator.locks
    ? navigator.locks.request("mido-homework", run)
    : run();
}
function requireParent() {
  if (
    !parentSession ||
    parentSession.until < Date.now() ||
    ParentLock.read()?.hash !== parentSession.hash
  ) {
    parentSession = null;
    throw new Error("家长确认已锁定，请关闭后重新输入PIN。");
  }
  parentSession.until = Date.now() + 180000;
}
function closePhotos() {
  photoUrls.forEach(URL.revokeObjectURL);
  photoUrls = [];
}
async function storePhoto(file) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    !file.size ||
    file.size > 5 * 1024 * 1024
  )
    throw new Error("请选择5MB以内的JPG、PNG或WebP照片。");
  return "temporary-ritual";
}
async function showPhoto(id, container) {
  if (id && container.isConnected) container.textContent = "单机版不保留照片。";
}
function rewardText(kind) {
  const reward = typeof kind === "string" ? H.kinds[kind] : H.rewardFor(kind),
    item = H.items[reward.item];
  return item.icon + " " + item.name + " ×" + reward.amount;
}
function statusText(status) {
  return {
    todo: "待完成",
    submitted: "待完成照片打卡",
    returned: "再检查一下",
    approved: "已通过 · 礼物已到账",
  }[status];
}
function openHomework() {
  renderHomework();
  $("#homework-dialog").showModal();
}
function renderHomework() {
  const date = M.chinaDate(),
    d = H.day(state, date),
    count = d.tasks.filter((t) => t.status === "approved").length;
  $("#homework-content").innerHTML =
    `<span class="dialog-eyebrow">${date} · 我与小伙伴的约定</span><h2>今天的小约定</h2><p>做完自己的作业，带一份礼物回家。</p><div class="promise-path"><span>📷 上传照片</span><i>→</i><span>✧ 体验审核</span><i>→</i><span>🎁 收到礼物</span></div><p class="ritual-disclosure">体验审核只是一场庆祝仪式，暂不检查作业内容。</p><div class="promise-count">${d.tasks.length ? `已打卡 ${count} / ${d.tasks.length} 项` : "今天还没有写下约定"}<span>${d.credited ? "✦ 今日成长已记下" : ""}</span></div><div class="promise-list">${d.tasks.map((t) => `<article class="promise-card ${t.status}"><div class="promise-heading"><span class="promise-icon">${H.kinds[t.kind].icon}</span><div><h3>${safe(t.title)}</h3><small>${statusText(t.status)}</small></div></div><p class="promise-reward">${rewardText(t)}</p>${t.feedback ? `<p class="parent-feedback">家长的小提醒：${safe(t.feedback)}</p>` : ""}${["todo", "returned", "submitted"].includes(t.status) ? `<button class="primary" data-submit="${t.id}">${t.status === "returned" ? "检查好啦，重新提交" : "拍张照片，完成打卡"}</button>` : `<p class="promise-status">${t.status === "submitted" ? "已经送出，等家长看看你的努力。" : "✓ 礼物已经放进背包啦。"}</p>`}</article>`).join("")}</div>${!d.tasks.length ? '<div class="empty-promise"><span>📜</span><p>请家长写下真实的作业，<br>比如“数学练习第12页”或“读书15分钟”。</p></div>' : ""}<button id="homework-parent" class="text-button">🔑 请家长来安排作业</button><p class="quiz-note">${state.phase === "egg" ? "今天所有作业照片打卡后，魔法蛋就会孵化。" : "每天全部照片打卡，记一个成长日。漏一天也不倒退。"}</p>`;
  document
    .querySelectorAll("[data-submit]")
    .forEach((b) => (b.onclick = () => openSubmission(date, b.dataset.submit)));
  $("#homework-parent").onclick = () => {
    $("#homework-dialog").close();
    openParentWorkshop();
  };
}
function openSubmission(date, id) {
  const task = H.day(state, date).tasks.find((t) => t.id === id);
  selectedSubmission = { date, id, photo: task.photo };
  $("#submission-title").textContent = task.title;
  $("#submission-note").value = task.note;
  $("#submission-minutes").value = task.minutes || "";
  $("#submission-photo").value = "";
  $("#submission-error").textContent = "";
  $("#submission-photo").required = true;
  $("#photo-preview").classList.add("hidden");
  $("#photo-file-name").textContent = "每一项作业，都留下一张努力的照片。";
  $("#submission-dialog").showModal();
}
function ritualStep(step) {
  const titles = [
    "照片正在送往星光小屋",
    "小精灵正在盖上星光印章",
    "审核通过，礼物到啦！",
  ];
  const lines = [
    "正在准备这张努力的照片，照片不会保存…",
    "这是体验仪式，不会检查作业答案。",
    "这份小礼物，送给认真完成约定的你。",
  ];
  $("#ritual-dialog").dataset.step = String(step);
  $("#ritual-title").textContent = titles[step];
  $("#ritual-description").textContent = lines[step];
  document.querySelectorAll("[data-ritual-step]").forEach((el, i) => {
    el.classList.toggle("active", i === step);
    el.classList.toggle("complete", i < step);
    el.setAttribute("aria-current", i === step ? "step" : "false");
  });
}
function ritualDelay() {
  return new Promise((resolve) =>
    setTimeout(
      resolve,
      reduced.matches || $("#world").classList.contains("paused") ? 20 : 1000,
    ),
  );
}
$("#submission-photo").onchange = () => {
  const file = $("#submission-photo").files[0];
  if (ritualPreviewUrl) URL.revokeObjectURL(ritualPreviewUrl);
  ritualPreviewUrl = null;
  $("#photo-preview").classList.add("hidden");
  if (!file) {
    $("#photo-file-name").textContent = "每一项作业，都留下一张努力的照片。";
    return;
  }
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    !file.size ||
    file.size > 5 * 1024 * 1024
  ) {
    $("#submission-error").textContent = "请选择5MB以内的JPG、PNG或WebP照片。";
    return;
  }
  ritualPreviewUrl = URL.createObjectURL(file);
  $("#photo-preview").src = ritualPreviewUrl;
  $("#photo-preview").classList.remove("hidden");
  $("#photo-file-name").textContent = file.name;
  $("#submission-error").textContent = "";
};
$("#submission-form").onsubmit = async (e) => {
  e.preventDefault();
  if (ritualBusy) return;
  const file = $("#submission-photo").files[0];
  if (!file) {
    $("#submission-error").textContent =
      "先拍一张这项作业的照片，再开始打卡吧。";
    return;
  }
  const submission = { ...selectedSubmission };
  const evidence = {
    note: $("#submission-note").value,
    minutes: Number($("#submission-minutes").value || 0),
  };
  if (submission.date !== M.chinaDate()) {
    $("#submission-error").textContent =
      "已经是新的一天，请重新打开今天的约定。";
    return;
  }
  ritualBusy = true;
  ritualOutcome = null;
  $("#submit-homework").disabled = true;
  $("#ritual-claim").classList.add("hidden");
  $("#ritual-error").classList.add("hidden");
  $("#ritual-reward").textContent = "";
  if (!ritualPreviewUrl) ritualPreviewUrl = URL.createObjectURL(file);
  $("#ritual-photo").src = ritualPreviewUrl;
  ritualStep(0);
  $("#ritual-dialog").showModal();
  try {
    const [photo] = await Promise.all([storePhoto(file), ritualDelay()]);
    ritualStep(1);
    await ritualDelay();
    const before = M.growth(state.completedDates.length).index;
    const result = await changeHomework((s) => {
      if (submission.date !== M.chinaDate())
        throw new Error("日期已经变化，请回到今天的约定重新拍照打卡。");
      return H.completeRitual(s, submission.date, submission.id, {
        ...evidence,
        photo,
      });
    });
    ritualOutcome = { ...result, before };
    ritualStep(2);
    const item = H.items[result.reward.item];
    $("#ritual-reward").textContent =
      item.icon + " " + item.name + " ×" + result.reward.amount;
    $("#ritual-claim").textContent = result.hatched
      ? "收下礼物，迎接小伙伴 ♡"
      : "收下这份小礼物 ♡";
    $("#ritual-claim").classList.remove("hidden");
    tone("adopt");
  } catch (error) {
    $("#ritual-title").textContent = "照片还没有送达";
    $("#ritual-description").textContent = error.message;
    $("#ritual-error").classList.remove("hidden");
  } finally {
    ritualBusy = false;
    $("#submit-homework").disabled = false;
  }
};
$("#ritual-dialog").addEventListener("cancel", (e) => e.preventDefault());
$("#ritual-error").onclick = () => $("#ritual-dialog").close();
$("#ritual-claim").onclick = () => {
  if (!ritualOutcome || ritualBusy) return;
  const result = ritualOutcome;
  ritualOutcome = null;
  $("#ritual-dialog").close();
  $("#submission-dialog").close();
  $("#homework-dialog").close();
  if (result.hatched || result.grown)
    celebrateGrowth(result.hatched, result.before);
  else {
    render();
    burst(H.items[result.reward.item].icon, 14);
    say("照片打卡完成！礼物已经放进背包啦。");
  }
};
$("#submission-dialog").addEventListener("close", () => {
  $("#submission-photo").value = "";
  $("#ritual-photo").removeAttribute("src");
  $("#photo-preview").removeAttribute("src");
  if (ritualPreviewUrl) URL.revokeObjectURL(ritualPreviewUrl);
  ritualPreviewUrl = null;
});
function openParentWorkshop() {
  parentSession = null;
  try {
    const exists = !!ParentLock.read();
    $("#pin-title").textContent = exists
      ? "请家长输入PIN"
      : "请家长设置专属PIN";
    $("#pin-copy").textContent = exists
      ? "确认作业和安排任务，需要家长来操作。"
      : "设置6位数字，防止孩子误点确认。请由家长亲自设置并记住。";
    $("#pin-confirm-label").classList.toggle("hidden", exists);
    $("#parent-pin-confirm").required = !exists;
    $("#parent-pin").value = "";
    $("#parent-pin-confirm").value = "";
    $("#pin-error").textContent = "";
    $("#pin-dialog").showModal();
  } catch {
    say("家长记录暂时无法读取，请检查浏览器是否允许保存数据。");
  }
}
$("#pin-form").onsubmit = async (e) => {
  e.preventDefault();
  const button = $("#unlock-parent");
  button.disabled = true;
  try {
    const pin = $("#parent-pin").value;
    const hash = ParentLock.read()
      ? await ParentLock.verify(pin)
      : await ParentLock.setup(pin, $("#parent-pin-confirm").value);
    parentSession = { hash, until: Date.now() + 180000 };
    $("#parent-pin").value = "";
    $("#parent-pin-confirm").value = "";
    $("#pin-dialog").close();
    renderParentWorkshop();
    $("#workshop-dialog").showModal();
  } catch (error) {
    $("#pin-error").textContent = error.message;
  } finally {
    button.disabled = false;
  }
};
function renderParentWorkshop() {
  closePhotos();
  const date = M.chinaDate(),
    d = H.day(state, date),
    h = H.ensure(state);
  const locked = d.credited || d.tasks.some((t) => t.status !== "todo");
  $("#workshop-content").innerHTML =
    `<span class="dialog-eyebrow">家长的小书桌</span><h2>把今天的努力，看在眼里</h2><p>当前为照片打卡体验：拍照后播放仪式动画并自动发奖，不判断作业内容；真实审核后续再开放。</p><div class="parent-tabs"><button class="text-button" id="parent-info">成长规则与离线词库</button><button class="text-button" id="lock-parent">🔒 锁定并交给孩子</button></div><p id="workshop-note" class="parent-note" role="status"></p><h3>以往待确认的记录</h3><div id="review-list"></div><h3>安排今天 · ${date}</h3><div class="parent-tasks">${d.tasks.map((t) => `<div><span>${H.kinds[t.kind].icon} ${safe(t.title)}<small>${statusText(t.status)} · ${rewardText(t)}</small></span>${!locked ? `<button class="text-button" data-remove-task="${t.id}" aria-label="移除${safe(t.title)}">移除</button>` : ""}</div>`).join("") || "<p>从孩子今天真正要完成的事情开始。</p>"}</div>${
      locked
        ? '<p class="parent-note">今天已有提交，任务清单已锁定。需要调整的任务可退回后重新提交；新的安排明天再添加。</p>'
        : `<form id="add-homework-form"><label for="homework-title">作业或约定</label><input id="homework-title" maxlength="60" required placeholder="例如：数学练习第12页"><div class="homework-form-row"><label>任务类型<select id="homework-kind">${Object.entries(
            H.kinds,
          )
            .map(([key, k]) => `<option value="${key}">${k.name}</option>`)
            .join(
              "",
            )}</select></label><label>重复安排<select id="homework-repeat"><option value="once">仅今天</option><option value="daily">每天</option><option value="weekdays">每周一至周五</option></select></label></div><div class="homework-form-row"><label>完成奖励<select id="homework-reward"><option value="cookie">🍪 星星饼干 · 食物</option><option value="fruit">🍎 暖阳果果 · 食物</option><option value="toy">🧶 彩虹线球 · 互动玩具</option><option value="feather">🪶 星光羽毛 · 魔法道具</option></select></label><label>数量<select id="homework-amount"><option>1</option><option selected>2</option><option>3</option><option>4</option><option>5</option></select></label></div><p id="new-task-reward" class="parent-note">照片打卡后获得：${rewardText("writing")}</p><button class="primary" type="submit">写进今天的小约定 ＋</button></form>`
    }<h3>重复的小约定</h3><div class="parent-tasks">${
      h.repeats
        .filter((r) => r.active)
        .map(
          (r) =>
            `<div><span>${safe(r.title)}<small>${r.repeat === "daily" ? "每天" : "每周一至周五"}</small></span><button class="text-button" data-stop-repeat="${r.id}">停止重复</button></div>`,
        )
        .join("") || '<p class="parent-note">还没有重复安排。</p>'
    }</div><p class="parent-note">重复安排从下一天开始自动加入；停止重复不改变已经生成的任务。照片只用于当次仪式，不上传、不留存。当前体验审核不检查作业内容。</p>`;
  const pending = Object.entries(h.days).flatMap(([date, d]) =>
    d.tasks.filter((t) => t.status === "submitted").map((t) => ({ date, t })),
  );
  const list = $("#review-list");
  if (!pending.length)
    list.innerHTML =
      '<div class="empty-review">☕ 还没有待确认的作业，等孩子送来好消息。</div>';
  pending.forEach(({ date, t }) => {
    const article = document.createElement("article");
    article.className = "review-card";
    article.innerHTML = `<small>${date} · ${H.kinds[t.kind].name}</small><h3>${safe(t.title)}</h3><p>${t.note ? safe(t.note) : "孩子已提交完成，请当面看看作业。"}</p>${t.minutes ? `<p>记录用时：${t.minutes} 分钟</p>` : ""}<div class="evidence-photo"></div><p class="promise-reward">${rewardText(t)}</p><label>给孩子的小提醒（退回时可填写）<input class="review-feedback" maxlength="120" placeholder="例如：再看看第二题，慢慢来"></label><div class="review-actions"><button class="text-button" data-return>再检查一下</button><button class="primary" data-approve>确认完成，送出礼物</button></div>`;
    list.append(article);
    showPhoto(t.photo, article.querySelector(".evidence-photo"));
    const review = async (approved) => {
      article.querySelectorAll("button").forEach((b) => (b.disabled = true));
      try {
        requireParent();
        const before = M.growth(state.completedDates.length).index;
        const result = await changeHomework((s) => {
          requireParent();
          return H.review(
            s,
            date,
            t.id,
            approved,
            article.querySelector(".review-feedback").value,
          );
        });
        if (result.hatched || result.grown) {
          $("#workshop-dialog").close();
          celebrateGrowth(result.hatched, before);
        } else {
          renderParentWorkshop();
          $("#workshop-note").textContent = approved
            ? "✓ 礼物已经放进孩子的背包。"
            : "小提醒已送达，孩子可以检查后重新提交。";
        }
        if (approved) {
          tone("adopt");
          burst(H.items[H.rewardFor(t).item].icon, 10);
        }
      } catch (error) {
        $("#workshop-note").textContent = error.message;
        article.querySelectorAll("button").forEach((b) => (b.disabled = false));
      }
    };
    article.querySelector("[data-approve]").onclick = () => review(true);
    article.querySelector("[data-return]").onclick = () => review(false);
  });
  const receipts = Object.entries(h.days)
    .flatMap(([date, d]) =>
      d.tasks
        .filter((t) => t.status === "approved" && t.photo)
        .map((t) => ({ date, t })),
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);
  if (receipts.length) {
    const section = document.createElement("section");
    section.innerHTML =
      '<h3>最近的照片打卡</h3><p class="parent-note">展示最近12项；体验通过不代表作业内容已验证。</p>';
    receipts.forEach(({ date, t }) => {
      const card = document.createElement("details");
      card.className = "receipt-card";
      card.innerHTML =
        "<summary>" +
        safe(t.title) +
        "<small>" +
        date +
        " · " +
        (t.reviewMode === "ritual" ? "体验通过" : "家长已确认") +
        '</small></summary><div class="evidence-photo"></div>';
      section.append(card);
      card.addEventListener("toggle", () => {
        if (card.open && !card.dataset.loaded) {
          card.dataset.loaded = "true";
          showPhoto(t.photo, card.querySelector(".evidence-photo"));
        }
      });
    });
    $("#workshop-content").append(section);
  }
  const perform = async (operation) => {
    try {
      requireParent();
      await changeHomework((s) => {
        requireParent();
        operation(s);
      });
      renderParentWorkshop();
    } catch (error) {
      $("#workshop-note").textContent = error.message;
    }
  };
  if (!locked) {
    const updateReward = () =>
      ($("#new-task-reward").textContent =
        "照片打卡后获得：" +
        rewardText({
          reward: {
            item: $("#homework-reward").value,
            amount: Number($("#homework-amount").value),
          },
        }));
    $("#homework-reward").onchange = updateReward;
    $("#homework-amount").onchange = updateReward;
    updateReward();
    $("#add-homework-form").onsubmit = (e) => {
      e.preventDefault();
      const input = {
        id: crypto.randomUUID(),
        title: $("#homework-title").value,
        kind: $("#homework-kind").value,
        repeat: $("#homework-repeat").value,
        reward: {
          item: $("#homework-reward").value,
          amount: Number($("#homework-amount").value),
        },
      };
      perform((s) => {
        if (date !== M.chinaDate())
          throw new Error("日期已变化，请重新进入家长页面。");
        H.add(s, date, input);
      });
    };
  }
  document
    .querySelectorAll("[data-remove-task]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          perform((s) => H.remove(s, date, b.dataset.removeTask))),
    );
  document.querySelectorAll("[data-stop-repeat]").forEach(
    (b) =>
      (b.onclick = () =>
        perform((s) => {
          const r = H.ensure(s).repeats.find(
            (r) => r.id === b.dataset.stopRepeat,
          );
          if (r) r.active = false;
        })),
  );
  $("#parent-info").onclick = () => {
    try {
      requireParent();
      openParentInfo();
    } catch (error) {
      $("#workshop-note").textContent = error.message;
    }
  };
  $("#lock-parent").onclick = () => {
    $("#workshop-dialog").close();
    render();
  };
}
function openBackpack() {
  renderBackpack();
  $("#backpack-dialog").showModal();
}
function renderBackpack() {
  const inventory = H.ensure(state).inventory;
  $("#backpack-content").innerHTML =
    `<span class="dialog-eyebrow">每一份礼物，都来自你的努力</span><h2>我的奖励背包</h2><p>${state.phase === "pet" ? "选一份礼物，和小伙伴一起享用。" : "礼物先放在这里，等小伙伴孵化后一起用。"}</p><div class="backpack-grid">${Object.entries(
      H.items,
    )
      .map(
        ([id, item]) =>
          `<article class="backpack-item"><span>${item.icon}</span><h3>${item.name}</h3><strong>× ${inventory[id]}</strong><button class="text-button" data-use-item="${id}" ${!inventory[id] || state.phase !== "pet" ? "disabled" : ""}>${item.action}</button></article>`,
      )
      .join(
        "",
      )}</div><p id="backpack-note" role="status">完成作业并拍照打卡，就能收集礼物。</p>`;
  document.querySelectorAll("[data-use-item]").forEach(
    (b) =>
      (b.onclick = async () => {
        b.disabled = true;
        try {
          const item = await changeHomework((s) => H.use(s, b.dataset.useItem));
          $("#backpack-dialog").close();
          if (["cookie", "fruit"].includes(b.dataset.useItem)) interact("feed");
          else interact("play");
          burst(item.icon, 12);
          say(item.name + "收到了！谢谢你带来的小礼物。");
        } catch (error) {
          $("#backpack-note").textContent = error.message;
          b.disabled = false;
        }
      }),
  );
}
$("#workshop-dialog").addEventListener("close", () => {
  parentSession = null;
  closePhotos();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    parentSession = null;
    if ($("#workshop-dialog").open) $("#workshop-dialog").close();
    if ($("#parent-dialog").open) $("#parent-dialog").close();
  }
});
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY || !event.newValue || hatchBusy) return;
  try {
    const next = JSON.parse(event.newValue);
    if (M.validState(next) && (!next.homework || H.valid(next.homework))) {
      state = next;
      render();
      if ($("#homework-dialog").open) renderHomework();
      if ($("#backpack-dialog").open) renderBackpack();
    }
  } catch {}
});
