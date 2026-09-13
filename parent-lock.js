(function (root) {
  const KEY = "mido-parent-pin-v1";
  async function derive(pin, salt) {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(pin),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: new TextEncoder().encode(salt),
        iterations: 100000,
        hash: "SHA-256",
      },
      key,
      256,
    );
    return Array.from(new Uint8Array(bits), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  }
  function read() {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  }
  async function setup(pin, confirmation) {
    if (read()) throw new Error("已设置家长PIN，请输入原PIN。");
    if (!/^\d{6}$/.test(pin) || pin !== confirmation)
      throw new Error("请输入两次相同的6位数字。");
    const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    const hash = await derive(pin, salt);
    if (read()) throw new Error("另一页面已经设置了PIN，请重新进入。");
    localStorage.setItem(
      KEY,
      JSON.stringify({ salt, hash, failures: 0, blockedUntil: 0 }),
    );
    return hash;
  }
  async function verify(pin) {
    const record = read();
    if (!record) throw new Error("请先设置家长PIN。");
    if (record.blockedUntil > Date.now())
      throw new Error("输错次数较多，请稍等一分钟再试。");
    if (
      !/^\d{6}$/.test(pin) ||
      (await derive(pin, record.salt)) !== record.hash
    ) {
      record.failures++;
      if (record.failures >= 5) {
        record.blockedUntil = Date.now() + 60000;
        record.failures = 0;
      }
      localStorage.setItem(KEY, JSON.stringify(record));
      throw new Error("PIN不正确，请家长再试一次。");
    }
    record.failures = 0;
    record.blockedUntil = 0;
    localStorage.setItem(KEY, JSON.stringify(record));
    return record.hash;
  }
  root.ParentLock = { read, setup, verify };
})(globalThis);
