const state = {
  platform: "x",
  imageUrl: "",
};

const categoryNames = {
  general: "通常",
  medical: "医療・健康",
  beauty: "美容",
  finance: "金融・投資",
  career: "転職",
  sidejob: "副業",
};

const rules = [
  {
    id: "attack",
    pattern: /(バカ|無能|クズ|詐欺師|消えろ|死ね|気持ち悪い|情弱|頭が悪い|最低な人)/i,
    title: "攻撃的に受け取られる表現",
    detail: "個人や属性への強い否定は、誹謗中傷や炎上につながる可能性があります。",
    risk: { fire: 34, compliance: 22, misunderstanding: 16 },
  },
  {
    id: "discrimination",
    pattern: /(女のくせに|男のくせに|日本人は|外国人は|老人は|若者は|障害者は|デブ|ブス)/i,
    title: "属性をひとまとめにする表現",
    detail: "性別・年代・国籍・外見などへの一般化は、差別的だと受け取られる可能性があります。",
    risk: { fire: 38, compliance: 25, misunderstanding: 20 },
  },
  {
    id: "absolute",
    pattern: /(絶対に|必ず|100[%％]|確実に|間違いなく|誰でも|例外なく|完全に)/i,
    title: "強い断定・絶対表現",
    detail: "条件や個人差を省いた断定は、誤解や表示上のリスクがある可能性があります。",
    risk: { fire: 14, compliance: 24, misunderstanding: 28 },
  },
  {
    id: "ranking",
    pattern: /(No\.?\s*1|ナンバーワン|業界初|日本一|世界一|顧客満足度1位)/i,
    title: "根拠の確認が必要な優位表現",
    detail: "No.1や業界初などは、調査条件や客観的な根拠を確認した方がよい表現です。",
    risk: { fire: 12, compliance: 32, misunderstanding: 22 },
  },
  {
    id: "guarantee",
    pattern: /(治る|完治|痩せる|若返る|儲かる|稼げる|年収が上がる|成功できる|元本保証|損しない)/i,
    title: "効果・利益を保証するような表現",
    detail: "結果を保証するように見えるため、条件・根拠・個人差を確認した方がよい表現です。",
    risk: { fire: 18, compliance: 35, misunderstanding: 30 },
  },
  {
    id: "unclear-source",
    pattern: /(みんな言ってる|常識です|科学的に証明|専門家も認めた|話題沸騰|利用者の\d+[%％])/i,
    title: "根拠が読み取れない表現",
    detail: "出典が示されていない場合、誇張や根拠不明と受け取られる可能性があります。",
    risk: { fire: 12, compliance: 25, misunderstanding: 25 },
  },
  {
    id: "pressure",
    pattern: /(今すぐ|知らないと損|やらない人は|買わない理由がない|人生終わる|一生後悔)/i,
    title: "過度に不安をあおる表現",
    detail: "読み手に強い圧力を与え、反発や不信感につながる可能性があります。",
    risk: { fire: 18, compliance: 15, misunderstanding: 15 },
  },
];

const els = {
  postText: document.querySelector("#post-text"),
  category: document.querySelector("#category"),
  characterCount: document.querySelector("#character-count"),
  characterLimit: document.querySelector("#character-limit"),
  imageInput: document.querySelector("#image-input"),
  imagePreviewWrap: document.querySelector("#image-preview-wrap"),
  imagePreview: document.querySelector("#image-preview"),
  readImageButton: document.querySelector("#read-image-button"),
  ocrStatus: document.querySelector("#ocr-status"),
  resultSection: document.querySelector("#result-section"),
  scoreGrid: document.querySelector("#score-grid"),
  findingsList: document.querySelector("#findings-list"),
  rewriteText: document.querySelector("#rewrite-text"),
  overallLabel: document.querySelector("#overall-label"),
};

document.querySelectorAll("[data-platform]").forEach((button) => {
  button.addEventListener("click", () => {
    state.platform = button.dataset.platform;
    document.querySelectorAll("[data-platform]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    els.characterLimit.textContent = state.platform === "x" ? "280" : "2,200";
  });
});

els.postText.addEventListener("input", updateCharacterCount);
els.imageInput.addEventListener("change", previewImage);
els.readImageButton.addEventListener("click", readImage);
document.querySelector("#diagnose-button").addEventListener("click", diagnose);
document.querySelector("#copy-button").addEventListener("click", copyRewrite);

function updateCharacterCount() {
  els.characterCount.textContent = els.postText.value.length;
}

function previewImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (state.imageUrl) URL.revokeObjectURL(state.imageUrl);
  state.imageUrl = URL.createObjectURL(file);
  els.imagePreview.src = state.imageUrl;
  els.imagePreviewWrap.hidden = false;
  els.ocrStatus.textContent = "";
}

async function readImage() {
  const file = els.imageInput.files?.[0];
  if (!file) return;

  els.readImageButton.disabled = true;
  els.ocrStatus.textContent = "OCRを準備しています…";

  try {
    await loadOcrLibrary();
    els.ocrStatus.textContent = "画像内の文字を読み取っています…";
    const result = await window.Tesseract.recognize(file, "jpn+eng", {
      logger(message) {
        if (message.status === "recognizing text") {
          els.ocrStatus.textContent = `読み取り中 ${Math.round(message.progress * 100)}%`;
        }
      },
    });
    const text = normalizeText(result.data.text);
    els.postText.value = text;
    updateCharacterCount();
    els.ocrStatus.textContent = text ? "読み取りが完了しました。内容を確認してください。" : "文字を認識できませんでした。";
  } catch {
    els.ocrStatus.textContent = "読み取りに失敗しました。画像を変えてお試しください。";
  } finally {
    els.readImageButton.disabled = false;
  }
}

function loadOcrLibrary() {
  if (window.Tesseract) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function diagnose() {
  const text = normalizeText(els.postText.value);
  if (!text) {
    els.postText.focus();
    els.postText.setAttribute("aria-invalid", "true");
    return;
  }
  els.postText.removeAttribute("aria-invalid");

  const result = analyze(text, els.category.value, state.platform);
  renderResult(result);
  els.resultSection.hidden = false;
  els.resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function analyze(text, category, platform) {
  const matched = rules.filter((rule) => rule.pattern.test(text));
  const base = { fire: 8, compliance: 7, misunderstanding: 10 };

  matched.forEach((rule) => {
    base.fire += rule.risk.fire;
    base.compliance += rule.risk.compliance;
    base.misunderstanding += rule.risk.misunderstanding;
  });

  const sensitive = ["medical", "beauty", "finance", "career"].includes(category);
  const hasClaim = matched.some((rule) => ["absolute", "ranking", "guarantee", "unclear-source"].includes(rule.id));
  if (sensitive && hasClaim) {
    base.compliance += 14;
    base.misunderstanding += 10;
  }
  if (category === "sidejob" && hasClaim) {
    base.compliance += 7;
    base.misunderstanding += 5;
  }

  const sentences = text.split(/[。！？\n]/).filter(Boolean);
  const longSentenceCount = sentences.filter((sentence) => sentence.length > 70).length;
  const readability = clamp(94 - longSentenceCount * 13 - Math.max(0, text.length - 300) / 15);
  const engagement = engagementScore(text, platform);

  const scores = {
    fire: clamp(base.fire),
    compliance: clamp(base.compliance),
    misunderstanding: clamp(base.misunderstanding),
    readability,
    engagement,
  };

  if (!matched.length) {
    matched.push({
      title: "大きな注意表現は見つかりませんでした",
      detail: "文脈や事実関係によって受け取られ方は変わるため、固有名詞や数値の根拠は投稿前に確認してください。",
    });
  }

  return {
    scores,
    findings: matched,
    rewrite: buildRewrite(text, category, platform, matched),
    category,
  };
}

function engagementScore(text, platform) {
  let score = 48;
  if (/[？?]/.test(text)) score += 8;
  if (/\n/.test(text)) score += 6;
  if (/[0-9０-９]/.test(text)) score += 5;
  if (platform === "x" && text.length >= 45 && text.length <= 220) score += 12;
  if (platform === "instagram" && text.length >= 80 && text.length <= 700) score += 12;
  if (/(絶対|必ず|知らないと損|炎上覚悟)/.test(text)) score -= 10;
  return clamp(score);
}

function buildRewrite(text, category, platform, findings) {
  const ids = findings.map((item) => item.id);
  let rewrite = text
    .replace(/絶対に|必ず|確実に|間違いなく|誰でも|例外なく|完全に/g, "場合があります")
    .replace(/100[%％]/g, "多く")
    .replace(/No\.?\s*1|ナンバーワン|日本一|世界一/g, "高い評価")
    .replace(/治る|完治する/g, "改善を感じる場合がある")
    .replace(/痩せる/g, "体づくりを支える可能性がある")
    .replace(/儲かる|稼げる/g, "収入につながる可能性がある")
    .replace(/年収が上がる/g, "年収が上がる場合がある")
    .replace(/損しない/g, "損失を抑えられる場合がある")
    .replace(/知らないと損/g, "知っておくと参考になる")
    .replace(/今すぐ/g, "興味がある方は");

  if (ids.includes("attack") || ids.includes("discrimination")) {
    rewrite = "私はこの内容に疑問を感じました。事実関係や背景を確認したうえで、異なる意見も含めて冷静に考えたいと思います。";
  } else if (["medical", "beauty"].includes(category) && ids.some((id) => ["absolute", "guarantee"].includes(id))) {
    rewrite = `個人の感想として、${stripStrongClaims(text)}と感じました。効果や感じ方には個人差があります。気になる症状がある場合は、医療機関などの専門家へご相談ください。`;
  } else if (category === "finance" && ids.some((id) => ["absolute", "guarantee"].includes(id))) {
    rewrite = `${stripStrongClaims(text)}と考えています。ただし、投資には元本割れを含むリスクがあります。判断前に条件や最新情報をご確認ください。`;
  } else if (category === "career" && ids.some((id) => ["absolute", "guarantee"].includes(id))) {
    rewrite = `${stripStrongClaims(text)}という選択肢もあります。結果は経験や求人状況によって異なるため、条件を確認したうえで検討してください。`;
  } else if (category === "sidejob" && ids.some((id) => ["absolute", "guarantee"].includes(id))) {
    rewrite = `${stripStrongClaims(text)}という方法があります。収益や成果には個人差があり、作業量や条件によって結果は異なります。`;
  }

  rewrite = normalizeText(rewrite);
  if (platform === "instagram" && !/#/.test(rewrite)) {
    rewrite += "\n\n#投稿前チェック #SNS運用";
  }
  return rewrite;
}

function stripStrongClaims(text) {
  return text
    .replace(/絶対に|必ず|確実に|間違いなく|誰でも|100[%％]/g, "")
    .replace(/[！!]{2,}/g, "。")
    .trim();
}

function renderResult(result) {
  const items = [
    ["炎上リスク", result.scores.fire, true],
    ["コンプラリスク", result.scores.compliance, true],
    ["誤解リスク", result.scores.misunderstanding, true],
    ["読みやすさ", result.scores.readability, false],
    ["伸びやすさ", result.scores.engagement, false],
  ];

  els.scoreGrid.innerHTML = items.map(([label, score, inverse]) => {
    const tone = scoreTone(score, inverse);
    return `
      <article class="score-card ${tone}">
        <span>${label}</span>
        <strong>${Math.round(score)}</strong>
        <div class="score-bar"><i style="width:${score}%"></i></div>
      </article>
    `;
  }).join("");

  els.findingsList.innerHTML = result.findings.map((finding) => `
    <article class="finding">
      <strong>${finding.title}</strong>
      <p>${finding.detail}</p>
    </article>
  `).join("");

  els.rewriteText.value = result.rewrite;
  const highestRisk = Math.max(result.scores.fire, result.scores.compliance, result.scores.misunderstanding);
  els.overallLabel.textContent = highestRisk >= 65 ? "要修正" : highestRisk >= 35 ? "要確認" : "低め";
  els.overallLabel.className = `overall-label ${highestRisk >= 65 ? "high" : highestRisk >= 35 ? "medium" : "low"}`;
}

function scoreTone(score, inverse) {
  const effective = inverse ? score : 100 - score;
  if (effective >= 65) return "danger";
  if (effective >= 35) return "caution";
  return "safe";
}

async function copyRewrite() {
  try {
    await navigator.clipboard.writeText(els.rewriteText.value);
    document.querySelector("#copy-button").textContent = "コピー済み";
    setTimeout(() => {
      document.querySelector("#copy-button").textContent = "コピー";
    }, 1600);
  } catch {
    els.rewriteText.select();
  }
}

function normalizeText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

updateCharacterCount();
