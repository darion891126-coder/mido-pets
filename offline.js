let spokenAudio;
async function playWord(id, note = document.querySelector("#audio-note")) {
  const word = Vocabulary.words().find((w) => w.id === id);
  if (!word) return;
  spokenAudio?.pause();
  spokenAudio = new Audio(word.audio);
  if (note) note.textContent = "♪ 美式英语 · 正在播放";
  try {
    await spokenAudio.play();
    spokenAudio.onended = () => {
      if (note) note.textContent = "可以再听一遍，轻轻跟着读。";
    };
  } catch {
    if (note)
      note.textContent = "语音还未准备好，请联网后在家长页面准备离线资源。";
  }
}
const offlineNote = document.querySelector("#offline-status");
let preparing = false;
async function prepareOffline() {
  if (preparing) return;
  if (!("serviceWorker" in navigator)) {
    offlineNote.textContent =
      "当前浏览器不支持离线保存，请使用支持的手机浏览器。";
    return;
  }
  preparing = true;
  offlineNote.textContent =
    "正在准备离线画面和 120 个单词的语音，首次下载请保持联网…";
  try {
    const registration = await navigator.serviceWorker.register("./sw.js", {
      updateViaCache: "none",
    });
    try {
      await registration.update();
    } catch {
      if (!registration.active) throw new Error("offline");
    }
    const worker =
      registration.installing || registration.waiting || registration.active;
    if (!worker) throw new Error("No worker");
    if (worker.state !== "activated")
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("timeout")), 120000);
        worker.addEventListener("statechange", () => {
          if (worker.state === "activated") {
            clearTimeout(timeout);
            resolve();
          }
          if (worker.state === "redundant") {
            clearTimeout(timeout);
            reject(new Error("install failed"));
          }
        });
      });
    await new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => {
        channel.port1.close();
        reject(new Error("timeout"));
      }, 120000);
      channel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        channel.port1.close();
        event.data.ready ? resolve() : reject(new Error("cache incomplete"));
      };
      worker.postMessage("PREPARE_OFFLINE", [channel.port2]);
    });
    offlineNote.textContent =
      "✓ 离线资源已就绪：断网后可刷新、学习和听基础单词。";
  } catch {
    offlineNote.textContent =
      "离线资源尚未全部保存。请保持联网，点击重新准备；现有学习记录不会丢失。";
  } finally {
    preparing = false;
  }
}
document.querySelector("#prepare-offline").onclick = prepareOffline;
document.querySelector("#update-vocabulary").onclick = async function () {
  const note = document.querySelector("#vocabulary-status");
  this.disabled = true;
  note.textContent = "正在检查新词包…";
  try {
    const added = await Vocabulary.update((text) => (note.textContent = text));
    note.textContent = added
      ? `已加入 ${added} 个新单词和配套语音，可以离线使用啦。`
      : "已经是最新词库。";
    renderVocabulary();
  } catch {
    note.textContent = "更新未完成，原词库仍可使用。请确认网络连接后重试。";
  } finally {
    this.disabled = false;
  }
};
function renderVocabulary() {
  document.querySelector("#vocabulary-count").textContent =
    Vocabulary.words().length;
  const list = document.querySelector("#vocabulary-list");
  list.replaceChildren();
  Vocabulary.words().forEach((w) => {
    const b = document.createElement("button");
    b.className = "vocabulary-word";
    b.textContent = `${w.icon} ${w.word} · ${w.chinese} ♪`;
    b.onclick = () =>
      playWord(w.id, document.querySelector("#vocabulary-status"));
    list.append(b);
  });
}
renderVocabulary();
if (Vocabulary.words().length > 120) {
  document.querySelector("#vocabulary-status").textContent =
    "扩展词包已保存，可离线使用；联网时可以继续检查新词包。";
}
prepareOffline();
