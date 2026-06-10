const state = {
  money: 120,
  subs: 0,
  research: 0,
  labLevel: 1,
  videos: 0,
  auto: false,
  boostUntil: 0,
  currentGenre: "trivia",
  upload: 0,
  lastTick: Date.now(),
  nodes: [
    { id: "source", icon: "S", name: "素材収集", level: 1, baseCost: 80, speed: 1.15, quality: 5, risk: 0 },
    { id: "script", icon: "T", name: "台本AI", level: 1, baseCost: 110, speed: 0.95, quality: 12, risk: -2 },
    { id: "visual", icon: "V", name: "映像生成", level: 1, baseCost: 140, speed: 0.75, quality: 18, risk: 2 },
    { id: "voice", icon: "A", name: "音声合成", level: 1, baseCost: 125, speed: 0.85, quality: 10, risk: -1 },
    { id: "upload", icon: "U", name: "アップロード", level: 1, baseCost: 160, speed: 0.7, quality: 4, risk: 0 },
  ],
  skills: [
    { id: "script", name: "台本力", value: 12 },
    { id: "visual", name: "映像力", value: 10 },
    { id: "trend", name: "トレンド理解", value: 8 },
    { id: "safety", name: "炎上回避", value: 10 },
  ],
  researches: [
    { id: "thumbnail", name: "サムネ生成AI", cost: 18, done: false, text: "クリック率とバズ率を少し上げる" },
    { id: "safety", name: "炎上チェック", cost: 32, done: false, text: "リスクを下げ、高単価動画を安定させる" },
    { id: "translate", name: "多言語展開", cost: 55, done: false, text: "登録者増加と収益倍率を上げる" },
    { id: "agent", name: "自律投稿エージェント", cost: 90, done: false, text: "自動化時の生成速度を上げる" },
  ],
};

const genres = [
  { id: "trivia", name: "雑学ショート", unlock: 1, quality: 0, viral: 8, risk: 5, text: "低コストで回転が早い。序盤向け。" },
  { id: "pets", name: "癒しペット", unlock: 1, quality: -2, viral: 11, risk: 2, text: "安定して伸びる。登録者が増えやすい。" },
  { id: "urban", name: "都市伝説", unlock: 2, quality: 6, viral: 17, risk: 14, text: "バズりやすいが炎上チェックが必要。" },
  { id: "product", name: "商品紹介", unlock: 3, quality: 10, viral: 8, risk: 10, text: "収益単価が高い。サムネ品質が重要。" },
  { id: "drama", name: "AIショートドラマ", unlock: 4, quality: 18, viral: 14, risk: 12, text: "制作は重いが長期収益が強い。" },
];

const els = {
  money: document.querySelector("#money"),
  subs: document.querySelector("#subs"),
  research: document.querySelector("#research"),
  labLevel: document.querySelector("#lab-level"),
  board: document.querySelector("#pipeline-board"),
  uploadFill: document.querySelector("#upload-fill"),
  currentGenre: document.querySelector("#current-genre"),
  videoStatus: document.querySelector("#video-status"),
  quality: document.querySelector("#quality"),
  viral: document.querySelector("#viral"),
  risk: document.querySelector("#risk"),
  researchList: document.querySelector("#research-list"),
  skillList: document.querySelector("#skill-list"),
  genreList: document.querySelector("#genre-list"),
  eventLog: document.querySelector("#event-log"),
  autoButton: document.querySelector("#auto-button"),
  aiRank: document.querySelector("#ai-rank"),
};

document.querySelector("#make-video-button").addEventListener("click", () => startUpload(32));
document.querySelector("#auto-button").addEventListener("click", () => {
  state.auto = !state.auto;
  addLog(state.auto ? "自動化ラインを起動しました。" : "自動化ラインを停止しました。");
  render();
});
document.querySelector("#boost-button").addEventListener("click", () => {
  if (state.money < 80) {
    addLog("ブーストには80収益が必要です。");
    return;
  }
  state.money -= 80;
  state.boostUntil = Date.now() + 20000;
  addLog("20秒間、全ノードの処理速度が上がります。");
  render();
});
document.querySelector("#train-button").addEventListener("click", trainAI);

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`#screen-${button.dataset.screen}`).classList.add("active");
  });
});

function startUpload(amount) {
  state.upload += amount * speedMultiplier();
  if (state.upload >= 100) completeVideo();
  else addLog("動画データを生成ラインに流しました。");
  render();
}

function completeVideo() {
  state.upload = 0;
  state.videos += 1;
  const result = calculateOutput();
  state.money += result.money;
  state.subs += result.subs;
  state.research += result.research;
  state.labLevel = 1 + Math.floor(state.videos / 5);
  addLog(`${result.genre.name}を投稿。収益+${format(result.money)} / 登録者+${format(result.subs)}`);
  if (Math.random() < result.viral / 130) {
    const bonus = Math.round(result.money * 1.7);
    state.money += bonus;
    addLog(`トレンドに乗りました。追加収益+${format(bonus)}`);
  }
}

function calculateOutput() {
  const genre = currentGenre();
  const nodeQuality = state.nodes.reduce((sum, node) => sum + node.quality * node.level, 0);
  const aiQuality = state.skills.reduce((sum, skill) => sum + skill.value, 0) * 0.5;
  const safety = state.researches.find((item) => item.id === "safety").done ? 10 : 0;
  const thumbnail = state.researches.find((item) => item.id === "thumbnail").done ? 8 : 0;
  const translate = state.researches.find((item) => item.id === "translate").done ? 1.25 : 1;
  const quality = Math.min(100, 20 + nodeQuality + aiQuality + genre.quality);
  const viral = Math.min(95, 8 + genre.viral + state.skills[2].value * 0.6 + thumbnail);
  const risk = Math.max(0, genre.risk + state.nodes.reduce((sum, node) => sum + node.risk, 0) - state.skills[3].value * 0.25 - safety);
  const money = Math.round((35 + quality * 2.2 + viral * 2.8 - risk) * translate);
  const subs = Math.round((4 + viral * 0.7 + quality * 0.18) * translate);
  const research = Math.max(2, Math.round(quality / 22 + state.labLevel));
  return { genre, quality, viral, risk, money, subs, research };
}

function speedMultiplier() {
  const nodeSpeed = state.nodes.reduce((sum, node) => sum + node.speed * node.level, 0) / state.nodes.length;
  const boost = Date.now() < state.boostUntil ? 1.7 : 1;
  const agent = state.researches.find((item) => item.id === "agent").done ? 1.25 : 1;
  return nodeSpeed * boost * agent;
}

function upgradeNode(id) {
  const node = state.nodes.find((item) => item.id === id);
  const cost = nodeCost(node);
  if (state.money < cost) {
    addLog(`${node.name}の強化には${format(cost)}収益が必要です。`);
    return;
  }
  state.money -= cost;
  node.level += 1;
  addLog(`${node.name}をLv.${node.level}に強化しました。`);
  render();
}

function buyResearch(id) {
  const item = state.researches.find((research) => research.id === id);
  if (item.done) return;
  if (state.research < item.cost) {
    addLog(`${item.name}には研究${item.cost}が必要です。`);
    return;
  }
  state.research -= item.cost;
  item.done = true;
  addLog(`${item.name}を解放しました。`);
  render();
}

function trainAI() {
  const cost = 40 + state.skills.reduce((sum, skill) => sum + skill.value, 0);
  if (state.money < cost) {
    addLog(`AI学習には${format(cost)}収益が必要です。`);
    return;
  }
  state.money -= cost;
  const target = state.skills[Math.floor(Math.random() * state.skills.length)];
  target.value = Math.min(100, target.value + 5 + Math.floor(Math.random() * 6));
  addLog(`${target.name}が成長しました。`);
  render();
}

function selectGenre(id) {
  const genre = genres.find((item) => item.id === id);
  if (state.labLevel < genre.unlock) {
    addLog(`${genre.name}はラボLv.${genre.unlock}で解放されます。`);
    return;
  }
  state.currentGenre = id;
  addLog(`${genre.name}向けに生成ラインを調整しました。`);
  render();
}

function tick() {
  const now = Date.now();
  const seconds = (now - state.lastTick) / 1000;
  state.lastTick = now;
  if (state.auto) {
    state.upload += seconds * 4.2 * speedMultiplier();
    while (state.upload >= 100) completeVideo();
    render();
  }
  requestAnimationFrame(tick);
}

function render() {
  const result = calculateOutput();
  els.money.textContent = format(state.money);
  els.subs.textContent = format(state.subs);
  els.research.textContent = format(state.research);
  els.labLevel.textContent = `Lv.${state.labLevel}`;
  els.uploadFill.style.width = `${Math.min(100, state.upload)}%`;
  els.currentGenre.textContent = result.genre.name;
  els.videoStatus.textContent = state.auto ? "自動生成中" : state.upload > 0 ? "生成中" : "素材待機中";
  els.quality.textContent = `${Math.round(result.quality)}%`;
  els.viral.textContent = `${Math.round(result.viral)}%`;
  els.risk.textContent = `${Math.round(result.risk)}%`;
  els.autoButton.classList.toggle("active", state.auto);
  els.autoButton.textContent = state.auto ? "稼働中" : "自動化";
  els.aiRank.textContent = `AI-${Math.floor(state.skills.reduce((sum, skill) => sum + skill.value, 0) / 22)}`;
  renderNodes();
  renderResearch();
  renderSkills();
  renderGenres();
}

function renderNodes() {
  els.board.innerHTML = state.nodes.map((node) => {
    const cost = nodeCost(node);
    const canBuy = state.money >= cost;
    return `
      <article class="node-card">
        <div class="node-port">${node.icon}</div>
        <div class="node-meta">
          <span>Lv.${node.level}</span>
          <strong>${node.name}</strong>
          <div class="node-meter"><i style="width:${Math.min(100, node.level * 18)}%"></i></div>
        </div>
        <button class="upgrade-button" type="button" data-upgrade="${node.id}" ${canBuy ? "" : "disabled"}>${format(cost)}</button>
      </article>
    `;
  }).join("");
  document.querySelectorAll("[data-upgrade]").forEach((button) => {
    button.addEventListener("click", () => upgradeNode(button.dataset.upgrade));
  });
}

function renderResearch() {
  els.researchList.innerHTML = state.researches.map((item) => `
    <article class="research-card ${item.done ? "locked" : ""}">
      <div>
        <span>${item.done ? "解放済み" : `研究 ${item.cost}`}</span>
        <strong>${item.name}</strong>
        <p>${item.text}</p>
      </div>
      <button class="upgrade-button" type="button" data-research="${item.id}" ${item.done ? "disabled" : ""}>${item.done ? "OK" : "解放"}</button>
    </article>
  `).join("");
  document.querySelectorAll("[data-research]").forEach((button) => {
    button.addEventListener("click", () => buyResearch(button.dataset.research));
  });
}

function renderSkills() {
  els.skillList.innerHTML = state.skills.map((skill) => `
    <article class="skill-row">
      <div>
        <strong>${skill.name}</strong>
        <div class="skill-bar"><i style="width:${skill.value}%"></i></div>
      </div>
      <span>${skill.value}</span>
    </article>
  `).join("");
}

function renderGenres() {
  els.genreList.innerHTML = genres.map((genre) => {
    const locked = state.labLevel < genre.unlock;
    const selected = state.currentGenre === genre.id;
    return `
      <article class="genre-card ${locked ? "locked" : ""}">
        <div>
          <span>${locked ? `Lv.${genre.unlock}で解放` : selected ? "選択中" : "利用可能"}</span>
          <strong>${genre.name}</strong>
          <p>${genre.text}</p>
        </div>
        <button class="upgrade-button" type="button" data-genre="${genre.id}">${selected ? "ON" : "選択"}</button>
      </article>
    `;
  }).join("");
  document.querySelectorAll("[data-genre]").forEach((button) => {
    button.addEventListener("click", () => selectGenre(button.dataset.genre));
  });
}

function currentGenre() {
  return genres.find((genre) => genre.id === state.currentGenre);
}

function nodeCost(node) {
  return Math.round(node.baseCost * Math.pow(1.55, node.level - 1));
}

function addLog(message) {
  const item = document.createElement("li");
  item.textContent = message;
  els.eventLog.prepend(item);
  while (els.eventLog.children.length > 8) els.eventLog.lastElementChild.remove();
}

function format(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(Math.round(value));
}

addLog("ラボを起動しました。まずは動画を生成してください。");
render();
requestAnimationFrame(tick);
