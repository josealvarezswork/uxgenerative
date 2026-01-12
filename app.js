const form = document.getElementById("uxForm");
const output = document.getElementById("output");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");
const copyBtn = document.getElementById("copyBtn");

const API_URL = "https://broad-shadow-d8e2.josealvarezswork.workers.dev/api/generate";

const numStagesEl = document.getElementById("numStages");
const stagesContainer = document.getElementById("stagesContainer");

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg || "";
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Render stages (3–5)
function renderStages(n) {
  const count = Math.max(3, Math.min(5, Number(n || 3)));
  stagesContainer.innerHTML = "";

  for (let i = 1; i <= count; i++) {
    const block = document.createElement("div");
    block.className = "card";
    block.style.marginTop = "14px";

    block.innerHTML = `
      <div class="card-title">
        <h2>Stage ${i}</h2>
        <span class="req">Required</span>
      </div>

      <div class="field">
        <label>Stage ${i}: Name & Timeline</label>
        <input class="input" name="stage_${i}_nameTimeline" required placeholder="Ej: 'Diagnóstico (10–15 min)'" />
      </div>

      <div class="field">
        <label>What happens (actions + thoughts + emotions + pains)</label>
        <textarea name="stage_${i}_whatHappens" required placeholder="Describe acciones, pensamientos, emociones y pain points."></textarea>
      </div>
    `;
    stagesContainer.appendChild(block);
  }
}

renderStages(numStagesEl?.value || 3);
numStagesEl?.addEventListener("change", (e) => renderStages(e.target.value));
numStagesEl?.addEventListener("input", (e) => renderStages(e.target.value));

// Collect form values (handles multi-select + repeated checkbox names)
function collectFormData() {
  const fd = new FormData(form);
  const data = {};

  // 1) Copy single-value fields
  for (const [k, v] of fd.entries()) {
    // ignore repeated keys here; handle later
    if (!(k in data)) data[k] = typeof v === "string" ? v.trim() : v;
  }

  // 2) Multi-select: primaryPlatforms
  const platformsSel = document.getElementById("primaryPlatforms");
  data.primaryPlatforms = platformsSel
    ? Array.from(platformsSel.selectedOptions).map(o => o.value)
    : [];

  // 3) Checkboxes: researchBacking can repeat
  data.researchBacking = fd.getAll("researchBacking").map(x => String(x).trim());

  // 4) Journey stages: build array from stage_* fields
  const numStages = Math.max(3, Math.min(5, Number(fd.get("numStages") || 3)));
  data.journeyStages = [];
  for (let i = 1; i <= numStages; i++) {
    const nameTimeline = String(fd.get(`stage_${i}_nameTimeline`) || "").trim();
    const whatHappens = String(fd.get(`stage_${i}_whatHappens`) || "").trim();
    data.journeyStages.push({ index: i, nameTimeline, whatHappens });
  }

  return data;
}

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(output.textContent);
    setStatus("Copiado al portapapeles.");
  } catch {
    setStatus("No se pudo copiar (permisos del navegador).");
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // UX validation: show native required messages
  if (!form.checkValidity()) {
    form.reportValidity();
    setStatus("Completa los campos requeridos.");
    return;
  }

  setStatus("");
  submitBtn.disabled = true;
  copyBtn.disabled = true;
  output.textContent = "Generando...";

  const data = collectFormData();

  // Additional strict checks (multi-select + checkboxes)
  if (!Array.isArray(data.primaryPlatforms) || data.primaryPlatforms.length === 0) {
    output.textContent = "Falta información.";
    setStatus("Selecciona al menos 1 Primary Platform.");
    submitBtn.disabled = false;
    return;
  }

  if (!Array.isArray(data.researchBacking) || data.researchBacking.length === 0) {
    output.textContent = "Falta información.";
    setStatus("Selecciona Research backing (al menos 1 opción).");
    submitBtn.disabled = false;
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const json = JSON.parse(text);
    output.textContent = json.result || "(sin resultado)";
    copyBtn.disabled = false;
    setStatus("Listo.");
  } catch (err) {
    console.error(err);
    output.textContent = "Error.";
    setStatus(err?.message || "Error al generar.");
  } finally {
    submitBtn.disabled = false;
  }
});
