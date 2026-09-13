(function (root) {
  const KEY = "mido-pet-v2";
  function clean(value) {
    const next = JSON.parse(JSON.stringify(value));
    for (const day of Object.values(next.homework?.days || {}))
      for (const task of day.tasks || []) task.photo = null;
    return next;
  }
  function valid(value) {
    try {
      return (
        PetModel.validState(value) &&
        (!root.Collection || Collection.valid(value)) &&
        (!value.homework || HomeworkModel.valid(value.homework))
      );
    } catch {
      return false;
    }
  }
  root.LocalGame = { clean, valid };
  // Remove legacy evidence references; no photo is part of a single-player save.
  try {
    const old = JSON.parse(localStorage.getItem(KEY));
    if (valid(old)) localStorage.setItem(KEY, JSON.stringify(clean(old)));
  } catch {}
  try {
    indexedDB.deleteDatabase("mido-homework-evidence");
  } catch {}
  document.addEventListener("DOMContentLoaded", () => {
    const dialog = document.querySelector("#local-dialog"),
      note = document.querySelector("#local-status");
    document.querySelector("#local-button").onclick = () => dialog.showModal();
    document.querySelector("#local-close").onclick = () => dialog.close();
    document.querySelector("#export-save").onclick = async () => {
      try {
        const state = JSON.parse(localStorage.getItem(KEY));
        if (!valid(state))
          throw new Error("还没有可导出的存档，先选择领养方式吧。");
        const data = JSON.stringify(
          {
            format: "mido-offline-v1",
            createdAt: new Date().toISOString(),
            state: clean(state),
          },
          null,
          2,
        );
        document.querySelector("#backup-text").value = data;
        document.querySelector("#backup-fallback").hidden = false;
        const file = new File([data], "星光伙伴存档.json", {
          type: "application/json",
        });
        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: "保存星光伙伴存档" });
          } catch (e) {
            note.textContent =
              e.name === "AbortError"
                ? "已取消分享。也可下载文件，或复制下面的完整存档。"
                : "浏览器不允许系统分享。请点击下载文件，或复制下面的完整存档保存到备忘录。";
            return;
          }
        } else {
          const url = URL.createObjectURL(file),
            a = document.createElement("a");
          a.href = url;
          a.download = file.name;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
        note.textContent = "请把存档保存到“文件”中。存档不包含照片或家长PIN。";
      } catch (e) {
        if (e.name !== "AbortError") note.textContent = e.message;
      }
    };
    document.querySelector("#download-backup").onclick = () => {
      const value = document.querySelector("#backup-text").value;
      if (!value) return;
      const url = URL.createObjectURL(
          new Blob([value], { type: "application/json" }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = "星光伙伴存档.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      note.textContent =
        "已请求下载。请确认文件已保存；如果没有下载，请复制完整存档。";
    };
    document.querySelector("#copy-backup").onclick = async () => {
      const text = document.querySelector("#backup-text");
      text.focus();
      text.select();
      try {
        await navigator.clipboard.writeText(text.value);
        note.textContent = "已复制完整存档，请粘贴到备忘录并保存。";
      } catch {
        note.textContent = "已选中存档，请长按文本选择“复制”，再保存到备忘录。";
      }
    };
    async function restore(raw) {
      if (new Blob([raw]).size > 2 * 1024 * 1024)
        throw new Error("请选择2MB以内的星光伙伴存档。");
      let archive;
      try {
        archive = JSON.parse(raw);
      } catch {
        throw new Error("存档不完整或格式不正确，请复制完整内容。");
      }
      if (
        !["mido-offline-v1", "mido-family-backup-v1"].includes(
          archive?.format,
        ) ||
        !valid(archive.state)
      )
        throw new Error("这不是有效的星光伙伴存档。");
      const next = clean(archive.state);
      if (
        !confirm(
          `恢复“${next.name || "小伙伴"}”的存档？这会替换本机当前进度。建议先导出当前存档。`,
        )
      )
        return;
      const run = () => localStorage.setItem(KEY, JSON.stringify(next));
      if (navigator.locks) await navigator.locks.request("mido-homework", run);
      else run();
      location.reload();
    }
    document.querySelector("#restore-text").onclick = async () => {
      try {
        await restore(document.querySelector("#restore-input").value);
      } catch (e) {
        note.textContent = e.message || "恢复失败，当前存档没有改变。";
      }
    };
    document.querySelector("#import-save").onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        if (file.size > 2 * 1024 * 1024)
          throw new Error("请选择2MB以内的星光伙伴存档。");
        await restore(await file.text());
      } catch (e) {
        note.textContent = e.message || "存档无法读取，当前进度没有改变。";
      } finally {
        event.target.value = "";
      }
    };
    document.querySelector("#request-persistence").onclick = async () => {
      const granted = await navigator.storage?.persist?.().catch(() => false);
      note.textContent = granted
        ? "浏览器已允许持久保存，仍建议定期导出备份。"
        : "浏览器未确认持久保存。请定期导出备份，清理网站数据会删除存档。";
    };
  });
})(globalThis);
