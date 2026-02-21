console.log('APP.JS LOADED - START');
// ============================================================================
// CONFIGURATION & GLOBALS
// ============================================================================

const CONFIG = {
  API_URL: "https://broad-shadow-d8e2.josealvarezswork.workers.dev/api/generate",
  AUTOSAVE_DELAY: 2000,
  STORAGE_KEY: "uxFormDraft",
  MAX_CHAR_WARNING: 0.8,
};

let lastGeneratedOutput = "";
let lastStructuredData = null;
let autosaveTimer = null;
let currentSection = 1;

// ============================================================================
// DOM ELEMENTS
// ============================================================================

console.log('Getting DOM elements...'); const uxForm = document.getElementById("uxForm");
const submitBtn = document.getElementById("submitBtn");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const copyJsonBtn = document.getElementById("copyJsonBtn");
const sendNotionBtn = document.getElementById("sendNotionBtn");
const notionTokenInput = document.getElementById("notionToken");
const notionDatabaseIdInput = document.getElementById("notionDatabaseId");
const notionPageIdInput = document.getElementById("notionPageId");
const saveNotionCreds = document.getElementById("saveNotionCreds");
const output = document.getElementById("output");
const progressBadge = document.getElementById("progressBadge");
const loadExampleBtn = document.getElementById("loadExampleBtn");
const clearDraftBtn = document.getElementById("clearDraftBtn");
const shortcutsHint = document.getElementById("shortcutsHint");
const numStagesInput = document.getElementById("numStages");
const stagesContainer = document.getElementById("stagesContainer");
const sidebarNav = document.getElementById("sidebarNav"); console.log('DOM elements loaded');

// ============================================================================
// EXAMPLE DATA
// ============================================================================

const EXAMPLE_DATA = {
  projectName: "MediTrack",
  oneSentence: "App móvil para que pacientes con enfermedades crónicas registren síntomas y compartan datos con médicos en tiempo real.",
  productType: "App",
  primaryPlatforms: ["Mobile", "Web"],
  realWorldSituation: "Pacientes con diabetes, asma o hipertensión deben registrar manualmente síntomas en papel o apps fragmentadas. Médicos no tienen acceso a datos consistentes.",
  whatGoesWrong: "Datos incompletos → diagnósticos menos precisos. Pacientes olvidan registros → seguimiento inefectivo. Cambio de médico = perder historial.",
  currentWorkarounds: "WhatsApp, llamadas, Excel. Cada médico pide datos diferentes. Duplicación de esfuerzos.",
  userRoleContext: "Pacientes adultos (35-65) con enfermedades crónicas, con smartphone básico. Algunos sin mucha literacy digital.",
  tryingToAccomplish: "Tener un lugar centralizado donde registrar síntomas y compartir con médico sin perder datos.",
  researchBacking: ["User interviews"],
  researchBackingDetails: "n=12 entrevistas con pacientes diabéticos en CDMX. 83% usa WhatsApp para compartir datos con médicos. 91% pierde registros al cambiar de clínica.",
  desiredOutcome: "Paciente registra síntoma → App notifica al médico automáticamente → Médico ve tendencias → Menos visitas innecesarias.",
  whyUseThis: "Deja de ser paciente pasivo a active manager de su salud. Médico tiene datos reales, no recuerdos del paciente.",
  productGoals: "• Reducir tiempo de consulta en 30% (menos explicaciones)\n• Aumentar adherencia al tratamiento en 45% (recordatorios + datos\n• Mejorar precision diagnóstica (datos vs intuición)",
  mustHaveFeatures: "• Dashboard con síntomas últimos 30 días\n• Exportar PDF para llevar a médico\n• Recordatorios diarios automáticos\n• Historial completo (búsqueda por fecha/síntoma)",
  niceToHave: "• Gráficos de tendencias\n• Compartir acceso a familiares",
  outOfScope: "• Diagnóstico automático\n• Integración con historiales de hospitales",
  technicalPlatformConstraints: "iOS 12+, Android 8+. Sin requiere acceso a red (almacenamiento local). Storage máximo 50MB.",
  businessTimelineConstraints: "MVP en 4 meses. Equipo: 2 devs, 1 designer, 1 PM. Budget: $80k.",
  adoptionRisks: "Regulación médica (telemedicina requiere aprobación). Competencia: existe Google Health pero no para crónicas. Desconfianza de pacientes en apps de salud.",
  keyMetrics: "Tasa de uso semanal: Target 70%\nPromedio registros/semana: Target 4+",
  facts: "n=12 entrevistas confirmó 'paciente necesita lugar centralizado' - Fuente: Research Desk 2025\nExisten 2M diabéticos en México - Fuente: IMSS",
  assumptions: "Pacientes usarán app si hay recordatorios\nMédicos adoptarán app si les ahorra 10+ min/consulta",
  needsValidation: "¿Médicos realmente abren la app durante consulta?",
  ageOccupation: "35–65, Pacientes con enfermedades crónicas (diabetes, asma, hipertensión)",
  techProficiency: "Basic",
  mainMotivations: "Salud, organización, no perder información, confianza en médico",
  dailyRoutineSnapshot: "7am: Despierta, toma medicinas. 12pm: Registra cómo se siente. 6pm: Revisa si tiene recordatorio de seguimiento. Si no se siente bien, abre app para datos históricos antes de llamar al médico.",
  status: "Draft",
  journeyStages: [
    {
      index: 1,
      nameTimeline: "Pre-diagnosis",
      whatHappens: "Paciente siente síntomas pero no sabe si es 'normal'. Busca en Google, asusta."
    },
    {
      index: 2,
      nameTimeline: "Initial Visit",
      whatHappens: "Médico hace preguntas, paciente no recuerda bien cuándo empezó. Receta medicinas pero sin plan claro."
    },
    {
      index: 3,
      nameTimeline: "Ongoing Management",
      whatHappens: "Paciente toma medicinas irregularmente. Olvida síntomas para siguiente cita. Médico no tiene baseline para ajustar."
    }
  ],
  opportunityAreas: "Registrar síntomas ANTES de ir al médico (no durante)\nCompartir automáticamente histórico (no 'explique cómo se sintió')\nRecordatorios para no olvidar tomar medicinas",
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  generateStageInputs();
  // Load saved Notion creds (optional, localStorage)
  try {
    const savedToken = localStorage.getItem("notion_token");
    const savedDb = localStorage.getItem("notion_database_id");
    const savedPage = localStorage.getItem("notion_page_id");
    if (savedToken) notionTokenInput.value = savedToken;
    if (savedDb) notionDatabaseIdInput.value = savedDb;
    if (savedPage) notionPageIdInput.value = savedPage;
    if (savedToken || savedDb || savedPage) saveNotionCreds.checked = true;
  } catch (e) {
    // ignore storage errors
  }

  loadDraft();
  setupEventListeners();
  updateProgressBadge();
  updateTabsCompletion();
  setupCharCounters();
});

// ============================================================================
// LOAD & SAVE DRAFT
// ============================================================================

function loadDraft() {
  const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      populateForm(data);
      showStatus("✓ Borrador cargado", "success");
    } catch (err) {
      console.error("Error loading draft:", err);
    }
  }
}

function saveDraft() {
  const formData = new FormData(uxForm);
  const data = Object.fromEntries(formData);

  // Handle checkboxes manually
  data.primaryPlatforms = Array.from(
    uxForm.querySelectorAll('input[name="primaryPlatforms"]:checked')
  ).map(el => el.value);

  data.researchBacking = Array.from(
    uxForm.querySelectorAll('input[name="researchBacking"]:checked')
  ).map(el => el.value);

  // Handle journey stages
  data.journeyStages = Array.from(stagesContainer.querySelectorAll('.journey-stage')).map((stage, idx) => ({
    index: idx + 1,
    nameTimeline: stage.querySelector('[name*="stageName"]').value,
    whatHappens: stage.querySelector('[name*="stageWhat"]').value,
  }));

  localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
  showStatus("✓ Guardado automáticamente", "success");
}

function populateForm(data) {
  // If the data includes journeyStages, ensure inputs match the length first
  if (Array.isArray(data.journeyStages)) {
    const n = data.journeyStages.length;
    if (!isNaN(n) && n > 0) {
      numStagesInput.value = n;
      generateStageInputs();
    }
  }

  Object.entries(data).forEach(([key, value]) => {
    // Handle checkbox groups (e.g., primaryPlatforms, researchBacking)
    const checkboxes = uxForm.querySelectorAll(`input[name="${key}"][type="checkbox"]`);
    if (checkboxes.length > 0) {
      checkboxes.forEach(cb => {
        cb.checked = Array.isArray(value) ? value.includes(cb.value) : cb.value === value;
      });
      return;
    }

    // Handle radio groups
    const radios = uxForm.querySelectorAll(`input[name="${key}"][type="radio"]`);
    if (radios.length > 0) {
      radios.forEach(r => {
        r.checked = String(r.value) === String(value);
      });
      return;
    }

    // Handle select elements (including multiple selects)
    const select = uxForm.querySelector(`select[name="${key}"]`);
    if (select) {
      if (select.multiple && Array.isArray(value)) {
        Array.from(select.options).forEach(opt => {
          opt.selected = value.includes(opt.value);
        });
      } else {
        select.value = value || "";
      }
      return;
    }

    // Fallback for single inputs/textareas
    const field = uxForm.elements[key];
    if (field) {
      try {
        field.value = value || "";
      } catch (e) {
        // Ignore elements without value
      }
    }
  });

  // Explicitly populate journey stage inputs if present
  if (Array.isArray(data.journeyStages)) {
    data.journeyStages.forEach((s, idx) => {
      const nameEl = document.getElementById(`stageName${idx + 1}`);
      const whatEl = document.getElementById(`stageWhat${idx + 1}`);
      if (nameEl) nameEl.value = s.nameTimeline || "";
      if (whatEl) whatEl.value = s.whatHappens || "";
    });
  }

  updateProgressBadge();
  updateTabsCompletion();
}

// ============================================================================
// AUTO-SAVE & LIVE PREVIEW
// ============================================================================

function updateLivePreview() {
  const data = Object.fromEntries(new FormData(uxForm));

  // Basic text fields
  const fields = ['projectName', 'oneSentence', 'realWorldSituation', 'whatGoesWrong', 'currentWorkarounds',
    'userRoleContext', 'tryingToAccomplish', 'desiredOutcome', 'whyUseThis',
    'technicalPlatformConstraints', 'businessTimelineConstraints',
    'ageOccupation', 'techProficiency', 'mainMotivations', 'dailyRoutineSnapshot'];

  fields.forEach(f => {
    const el = document.getElementById('pv_' + f);
    if (el) el.textContent = data[f] || '—';
  });

  // Selects / Badges
  const typeEl = document.getElementById('pv_productType');
  if (typeEl) typeEl.textContent = data.productType || 'Type';

  const plats = Array.from(uxForm.querySelectorAll('input[name="primaryPlatforms"]:checked')).map(el => el.value);
  const platEl = document.getElementById('pv_primaryPlatforms');
  if (platEl) platEl.textContent = plats.length ? plats.join(', ') : '';

  // Textarea list -> Bullets
  const formatBullets = (text) => {
    if (!text) return '';
    return text.split('\n').filter(l => l.trim()).map(l => `<div>• ${l.replace(/^[-•]\s*/, '')}</div>`).join('');
  };

  ['productGoals', 'mustHaveFeatures', 'keyMetrics'].forEach(f => {
    const el = document.getElementById('pv_' + f);
    if (el) el.innerHTML = formatBullets(data[f]) || '—';
  });

  // Quote
  const research = Array.from(uxForm.querySelectorAll('input[name="researchBacking"]:checked')).map(el => el.value);
  let researchText = research.length ? `[${research.join(', ')}] ` : '';
  researchText += data.researchBackingDetails || '';
  const rDetails = document.getElementById('pv_researchBackingDetails');
  if (rDetails) rDetails.textContent = researchText || '—';

  // Journey Track
  let hasJourney = false;
  const jTrack = document.getElementById('pv_journeyTrack');
  if (jTrack) {
    const stages = Array.from(stagesContainer.querySelectorAll('.journey-stage')).map((stage, idx) => ({
      name: stage.querySelector('[name*="stageName"]').value,
      what: stage.querySelector('[name*="stageWhat"]').value,
    }));

    if (stages.some(s => s.name || s.what)) {
      hasJourney = true;
      jTrack.innerHTML = stages.map(s => `
        <div class="j-stage">
          <h5>${s.name || `Stage`}</h5>
          <p>${s.what || '...'}</p>
        </div>
      `).join('');
    } else {
      jTrack.innerHTML = '';
    }
  }

  // Section Visibility Logic (hide empty sections)

  const toggleSection = (id, conditions) => {
    const el = document.getElementById(id);
    if (el) {
      const hasRealContent = conditions.some(c => {
        if (typeof c === 'string') return c.trim() !== '';
        return !!c;
      });
      el.style.display = hasRealContent ? 'block' : 'none';
    }
  };

  toggleSection('pv_sec_problem', [data.realWorldSituation, data.whatGoesWrong, data.currentWorkarounds]);
  toggleSection('pv_sec_evidence', [data.userRoleContext, data.tryingToAccomplish, researchText]);
  toggleSection('pv_sec_value', [data.desiredOutcome, data.whyUseThis, data.productGoals]);

  const hasScopeOrConstraints = (data.mustHaveFeatures || data.technicalPlatformConstraints || data.businessTimelineConstraints);
  toggleSection('pv_sec_scope', [hasScopeOrConstraints]);

  toggleSection('pv_sec_metrics', [data.keyMetrics]);

  const hasPersona = (data.ageOccupation || data.techProficiency || data.mainMotivations || data.dailyRoutineSnapshot);
  toggleSection('pv_sec_persona', [hasPersona]);

  toggleSection('pv_sec_journey', [hasJourney]);

  // Header display specific
  const docHeader = document.querySelector('.doc-header');
  if (docHeader) docHeader.style.display = (data.projectName || data.oneSentence || data.productType || plats.length) ? 'block' : 'none';

  // Toggle Visibility: If any meaningful data is entered, show preview, hide empty state
  const hasData = Object.values(data).some(v => v.trim() !== '') || plats.length > 0 || hasJourney;
  const emptyState = document.querySelector('.output-empty');
  const livePreview = document.getElementById('livePreview');
  const actualOutput = document.getElementById('output');

  if (actualOutput && actualOutput.style.display !== 'none' && actualOutput.textContent.trim() !== '') {
    // If we have AI generated result, don't show either
    if (emptyState) emptyState.style.display = 'none';
    if (livePreview) livePreview.style.display = 'none';
  } else {
    if (hasData) {
      if (emptyState) emptyState.style.display = 'none';
      if (livePreview) livePreview.style.display = 'flex';
    } else {
      if (emptyState) emptyState.style.display = 'flex';
      if (livePreview) livePreview.style.display = 'none';
    }
  }
}

uxForm.addEventListener("input", () => {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveDraft, CONFIG.AUTOSAVE_DELAY);
  updateProgressBadge();
  updateTabsCompletion();
  updateLivePreview();
});

uxForm.addEventListener("change", () => {
  saveDraft();
  updateProgressBadge();
  updateTabsCompletion();
  updateLivePreview();
});

// ============================================================================
// JOURNEY STAGES DYNAMIC
// ============================================================================

function generateStageInputs() {
  const numStages = parseInt(numStagesInput.value) || 3;
  stagesContainer.innerHTML = "";

  for (let i = 1; i <= numStages; i++) {
    const stageEl = document.createElement("div");
    stageEl.className = "journey-stage";
    stageEl.innerHTML = `
      <div class="field" style="margin-top: 18px; padding: 14px; background: rgba(120,170,255,.06); border-radius: 14px;">
        <label for="stageName${i}"><strong>Stage ${i}: Name/Timeline</strong></label>
        <input class="input" id="stageName${i}" name="stageName${i}" placeholder="e.g., Awareness, Consideration..." />
        
        <label for="stageWhat${i}" style="margin-top: 10px; display: block;"><strong>What happens?</strong></label>
        <textarea id="stageWhat${i}" name="stageWhat${i}" placeholder="Describe the experience..."></textarea>
      </div>
    `;
    stagesContainer.appendChild(stageEl);
  }
}

numStagesInput.addEventListener("change", () => {
  generateStageInputs();
  saveDraft();
});

// ============================================================================
// CHARACTER COUNTER
// ============================================================================

function setupCharCounters() {
  uxForm.querySelectorAll("input[maxlength], textarea[data-max]").forEach(field => {
    const counter = field.nextElementSibling?.classList.contains("char-counter")
      ? field.nextElementSibling
      : field.parentElement?.querySelector(".char-counter");

    if (!counter) return;

    function updateCounter() {
      const max = parseInt(counter.dataset.max) || parseInt(field.maxLength);
      const current = field.value.length;
      const percent = current / max;

      counter.textContent = `${current}/${max}`;
      counter.classList.remove("warning", "limit");

      if (percent >= 1) counter.classList.add("limit");
      else if (percent >= CONFIG.MAX_CHAR_WARNING) counter.classList.add("warning");
    }

    field.addEventListener("input", updateCounter);
    updateCounter();
  });
}

// ============================================================================
// PROGRESS TRACKING
// ============================================================================

function updateProgressBadge() {
  const sections = document.querySelectorAll(".card[data-section]");
  let complete = 0;

  sections.forEach(section => {
    const sectionNum = section.dataset.section;
    if (isSectionComplete(sectionNum)) {
      complete++;
      section.classList.add("complete");
      section.querySelector(".section-status").dataset.status = "complete";
      section.querySelector(".section-status").textContent = "✓";
    } else {
      section.classList.remove("complete");
      section.querySelector(".section-status").dataset.status = "incomplete";
      section.querySelector(".section-status").textContent = "○";
    }
  });

  const totalSections = sections.length;
  const badgeEl = progressBadge.querySelector(".progress-text");
  badgeEl.textContent = `${complete}/${totalSections} secciones`;

  if (complete === totalSections) {
    progressBadge.classList.add("complete");
  } else {
    progressBadge.classList.remove("complete");
  }
}

function isSectionComplete(sectionNum) {
  const section = document.querySelector(`.card[data-section="${sectionNum}"]`);
  const inputs = section.querySelectorAll("input[required], textarea[required], select[required]");

  return Array.from(inputs).every(input => {
    if (input.type === "checkbox") {
      const group = section.querySelectorAll(`input[name="${input.name}"]`);
      return Array.from(group).some(cb => cb.checked);
    }
    return input.value.trim() !== "";
  });
}

function updateSectionStatus() {
  updateProgressBadge();
  updateTabsCompletion();
}

// ============================================================================
// FORM SUBMISSION
// ============================================================================

submitBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  // Validate form
  if (!uxForm.checkValidity()) {
    showToast("Por favor completa todos los campos requeridos", "error");
    return;
  }

  await submitForm();
});

async function submitForm() {
  try {
    submitBtn.classList.add("loading");
    submitBtn.disabled = true;
    output.classList.add("loading");

    const formData = new FormData(uxForm);
    const data = Object.fromEntries(formData);

    // Handle arrays
    data.primaryPlatforms = Array.from(
      uxForm.querySelectorAll('input[name="primaryPlatforms"]:checked')
    ).map(el => el.value);

    data.researchBacking = Array.from(
      uxForm.querySelectorAll('input[name="researchBacking"]:checked')
    ).map(el => el.value);

    data.journeyStages = Array.from(stagesContainer.querySelectorAll(".journey-stage")).map((stage, idx) => ({
      index: idx + 1,
      nameTimeline: stage.querySelector('[id*="stageName"]').value,
      whatHappens: stage.querySelector('[id*="stageWhat"]').value,
    }));

    // Form data saved for fallback
    const formDataBackup = data;

    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API Error ${res.status}: ${errorText.slice(0, 200)}`);
    }

    const result = await res.json();
    lastGeneratedOutput = result.result;

    // Parse the AI-generated JSON and store it for Notion
    try {
      let cleanJson = lastGeneratedOutput.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      lastStructuredData = JSON.parse(cleanJson);
      if (!lastStructuredData.projectName) {
        lastStructuredData.projectName = formDataBackup.projectName || 'UX Strategy Brief';
      }
      console.log('Parsed AI JSON:', lastStructuredData);
    } catch (parseErr) {
      console.warn('Could not parse AI JSON, using form data:', parseErr);
      lastStructuredData = formDataBackup;
    }

    // Display formatted output
    if (emptyState) emptyState.style.display = 'none';
    if (document.getElementById('livePreview')) document.getElementById('livePreview').style.display = 'none';
    output.style.display = 'block';

    try {
      output.textContent = JSON.stringify(lastStructuredData, null, 2);
    } catch { output.textContent = lastGeneratedOutput; }

    output.classList.remove('loading');

    copyBtn.disabled = false;
    downloadBtn.disabled = false;
    copyJsonBtn.disabled = false;
    sendNotionBtn.disabled = !lastStructuredData;
    showStatus('✓ Output generado', 'success');
    showToast('¡JSON estructurado listo!', 'success');

  } catch (err) {
    console.error("Submit error:", err);
    output.classList.remove("loading");
    showStatus(`Error: ${err.message}`, "error");
    showToast(`Error: ${err.message}`, "error");
  } finally {
    submitBtn.classList.remove("loading");
    submitBtn.disabled = false;
  }
}

// ============================================================================
// COPY & DOWNLOAD
// ============================================================================

copyBtn.addEventListener("click", copyToClipboard);
downloadBtn.addEventListener("click", downloadOutput);
copyJsonBtn.addEventListener("click", copyJsonForFigma);
sendNotionBtn.addEventListener("click", async () => {
  if (!lastStructuredData) {
    showToast("No hay datos para enviar", "error");
    return;
  }

  // Collect optional creds from UI
  const notionToken = notionTokenInput.value?.trim();
  const notionDatabaseId = notionDatabaseIdInput.value?.trim();

  // Save in localStorage if user asked
  try {
    if (saveNotionCreds.checked) {
      if (notionToken) localStorage.setItem("notion_token", notionToken);
      if (notionDatabaseId) localStorage.setItem("notion_database_id", notionDatabaseId);
      if (notionPageIdInput.value) localStorage.setItem("notion_page_id", notionPageIdInput.value);
    } else {
      localStorage.removeItem("notion_token");
      localStorage.removeItem("notion_database_id");
      localStorage.removeItem("notion_page_id");
    }
    sendNotionBtn.disabled = true;
    sendNotionBtn.classList.add("loading");

    try {
      const payload = { structuredData: lastStructuredData };
      if (notionToken) payload.notionToken = notionToken;
      if (notionDatabaseId) payload.notionDatabaseId = notionDatabaseId;
      if (notionPageIdInput.value) payload.notionPageId = notionPageIdInput.value;

      const res = await fetch("https://broad-shadow-d8e2.josealvarezswork.workers.dev/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      // Try to parse JSON body (fallback to text for error details)
      const resBody = await res.json().catch(async () => {
        const t = await res.text().catch(() => "");
        return { ok: false, raw: t };
      });

      if (!res.ok) {
        const details = resBody?.details || resBody?.raw || JSON.stringify(resBody);
        throw new Error(`Notion send failed: ${res.status} ${String(details).slice(0, 200)}`);
      }

      // Show success and open page if Notion returns a URL
      const pageUrl = resBody?.page?.url || (resBody?.page && resBody.page.id ? `https://www.notion.so/${resBody.page.id.replace(/-/g, '')}` : null);
      if (pageUrl) {
        showToast("Enviado a Notion correctamente — abriendo Notion...", "success");
        window.open(pageUrl, "_blank");
      } else {
        showToast("Enviado a Notion correctamente", "success");
      }
    } catch (err) {
      console.error("Notion send error:", err);
      showToast(`Error al enviar a Notion: ${err.message}`, "error");
    } finally {
      sendNotionBtn.disabled = false;
      sendNotionBtn.classList.remove("loading");
    }
  } catch (err) {
    console.error("Error al guardar credenciales de Notion:", err);
    showToast(`Error al guardar credenciales de Notion: ${err.message}`, "error");
    sendNotionBtn.disabled = false;
    sendNotionBtn.classList.remove("loading");
  }
});

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(output.textContent);
    setStatus("✓ Copiado", "success");
    showToast("Copiado al portapapeles", "success");
  } catch (err) {
    console.error("Copy error:", err);
    setStatus("Error al copiar", "error");
    showToast("No se pudo copiar (permisos del navegador)", "error");
  }
}

function downloadOutput() {
  try {
    const content = lastGeneratedOutput || output.textContent;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ux-output-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast("Archivo descargado", "success");
  } catch (err) {
    console.error("Download error:", err);
    showToast("Error al descargar", "error");
  }
}

async function copyJsonForFigma() {
  if (!lastStructuredData) {
    showToast("No hay datos estructurados para copiar", "error");
    return;
  }

  try {
    const jsonString = JSON.stringify(lastStructuredData, null, 2);
    await navigator.clipboard.writeText(jsonString);
    setStatus("✓ JSON copiado para Figma", "success");
    showToast("JSON copiado - Pégalo en el plugin de Figma", "success");
  } catch (err) {
    console.error("Copy JSON error:", err);
    setStatus("Error al copiar JSON", "error");
    showToast("No se pudo copiar JSON", "error");
  }
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

document.addEventListener("keydown", (e) => {
  const isMod = e.metaKey || e.ctrlKey;

  if (isMod && e.key === "Enter") {
    e.preventDefault();
    submitBtn.click();
  }

  if (isMod && e.key === "k") {
    e.preventDefault();
    copyBtn.click();
  }

  // Show shortcuts hint
  if (isMod) {
    shortcutsHint.classList.add("show");
  }
});

document.addEventListener("keyup", () => {
  shortcutsHint.classList.remove("show");
});

// ============================================================================
// LOAD EXAMPLE
// ============================================================================

if (loadExampleBtn) {
  loadExampleBtn.addEventListener("click", async () => {
    try {
      if (Array.isArray(EXAMPLE_DATA.journeyStages)) {
        const n = Math.max(1, Math.min(10, EXAMPLE_DATA.journeyStages.length));
        numStagesInput.value = n;
      }
      generateStageInputs();
      populateForm(EXAMPLE_DATA);

      // Safety: ensure the journey stage fields are filled after generation
      if (Array.isArray(EXAMPLE_DATA.journeyStages)) {
        EXAMPLE_DATA.journeyStages.forEach((s, i) => {
          const nameEl = document.getElementById(`stageName${i + 1}`);
          const whatEl = document.getElementById(`stageWhat${i + 1}`);
          if (nameEl) nameEl.value = s.nameTimeline || "";
          if (whatEl) whatEl.value = s.whatHappens || "";
        });
      }

      // Make the structured example data immediately available so users can
      // copy the JSON or send directly to Notion without first calling Generate
      lastStructuredData = JSON.parse(JSON.stringify(EXAMPLE_DATA)); // clone to avoid mutation
      copyJsonBtn.disabled = false;
      sendNotionBtn.disabled = false;

      updateLivePreview();

      showToast("Ejemplo cargado - Ahora puedes generar el output", "success");
    } catch (err) {
      console.error("Error al cargar ejemplo:", err);
      showToast("Error al cargar ejemplo", "error");
    }
  });
} else {
  console.warn("loadExampleBtn not found in DOM");
}

// ============================================================================
// CLEAR DRAFT
// ============================================================================

clearDraftBtn.addEventListener("click", () => {
  if (confirm("¿Borrar borrador guardado? Esta acción no se puede deshacer.")) {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    uxForm.reset();
    output.textContent = "Aún no hay resultado.";
    output.style.display = 'none';
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
    copyJsonBtn.disabled = true;
    generateStageInputs();
    updateProgressBadge();
    updateTabsCompletion();
    updateLivePreview();
    showToast("Borrador eliminado", "success");
  }
});

// ============================================================================
// UI HELPERS
// ============================================================================

function showStatus(message, type = "default") {
  // Implementar barra de estado si no existe
  console.log(`[${type.toUpperCase()}] ${message}`);
}

function setStatus(message, type = "default") {
  showStatus(message, type);
}

function showToast(message, type = "default") {
  // Crear toast si no existe
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// ============================================================================
// EVENT LISTENERS SETUP
// ============================================================================

function setupEventListeners() {
  // Ya configurado arriba en los event listeners individuales
}

// ============================================================================
// SIDEBAR NAVIGATION
// ============================================================================

function switchTab(sectionNum) {
  sectionNum = parseInt(sectionNum);
  if (isNaN(sectionNum) || sectionNum < 1 || sectionNum > 11) return;

  // Update cards visibility
  document.querySelectorAll('.card[data-section]').forEach(card => {
    card.classList.toggle('active', parseInt(card.dataset.section) === sectionNum);
  });

  // Update sidebar active state
  document.querySelectorAll('.sidebar-step').forEach(step => {
    const isActive = parseInt(step.dataset.section) === sectionNum;
    step.classList.toggle('active', isActive);
    if (isActive) {
      const group = step.closest('.phase-group');
      if (group) {
        document.querySelectorAll('.phase-group').forEach(g => g.classList.remove('active'));
        group.classList.add('active');
      }
    }
  });

  currentSection = sectionNum;
  localStorage.setItem('uxForm_activeTab', sectionNum);
}

function updateTabsCompletion() {
  document.querySelectorAll('.sidebar-step').forEach(step => {
    // Skip section 11 (Generate)
    if (step.dataset.section === '11') return;
    const sectionNum = step.dataset.section;
    const isComplete = isSectionComplete(sectionNum);
    step.classList.toggle('complete', isComplete);
  });
  updatePhaseScores();
}

function updatePhaseScores() {
  document.querySelectorAll('.phase-group').forEach(group => {
    const steps = group.querySelectorAll('.sidebar-step:not([data-section="11"])');
    if (steps.length === 0) return;
    let complete = 0;
    steps.forEach(s => {
      if (s.classList.contains('complete')) complete++;
    });
    const scoreEl = group.querySelector('.phase-score');
    if (scoreEl) scoreEl.textContent = `${complete}/${steps.length}`;
  });
}

// Initialize on load
function initTabs() {
  const savedTab = localStorage.getItem('uxForm_activeTab');
  switchTab(savedTab || 1);
  updateTabsCompletion();

  // Sidebar click handler
  if (sidebarNav) {
    sidebarNav.addEventListener('click', (e) => {
      const step = e.target.closest('.sidebar-step');
      if (step) {
        switchTab(step.dataset.section);
      }

      // Allow clicking phase-header to toggle group visibility optionally
      const header = e.target.closest('.phase-header');
      if (header) {
        const group = header.closest('.phase-group');
        document.querySelectorAll('.phase-group').forEach(g => g.classList.remove('active'));
        group.classList.add('active');
      }
    });
  }
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.key === 'ArrowRight') {
    e.preventDefault();
    switchTab(Math.min(11, currentSection + 1));
  }
  if (e.altKey && e.key === 'ArrowLeft') {
    e.preventDefault();
    switchTab(Math.max(1, currentSection - 1));
  }
});

// Initialize tabs when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTabs);
} else {
  initTabs();
}

// Update tabs completion when form changes
uxForm.addEventListener('input', updateTabsCompletion);
uxForm.addEventListener('change', updateTabsCompletion);

// ============================================================================
// SECTION NAVIGATION BUTTONS
// ============================================================================

uxForm.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-nav]');
  if (!btn) return;

  if (btn.dataset.nav === 'prev') {
    switchTab(Math.max(1, currentSection - 1));
  } else if (btn.dataset.nav === 'next') {
    switchTab(Math.min(11, currentSection + 1));
  }
});

function addNavigationButtons_OLD() {
  document.querySelectorAll('.card[data-section]').forEach(card => {
    const sectionNum = parseInt(card.dataset.section);

    // Skip section 10 (has its own actions) and notionConfig
    if (sectionNum === 11 || card.id === 'notionConfig') return;

    // Check if nav already exists
    if (card.querySelector('.section-nav')) return;

    const nav = document.createElement('div');
    nav.className = 'section-nav';

    if (sectionNum > 1) {
      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'btn secondary';
      prevBtn.innerHTML = '← Anterior';
      prevBtn.onclick = () => switchTab(sectionNum - 1);
      nav.appendChild(prevBtn);
    } else {
      // Spacer for alignment
      const spacer = document.createElement('div');
      nav.appendChild(spacer);
    }

    if (sectionNum < 11) {
      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'btn';
      nextBtn.innerHTML = 'Siguiente →';
      nextBtn.onclick = () => switchTab(sectionNum + 1);
      nav.appendChild(nextBtn);
    }

    card.appendChild(nav);
  });
}

// Add navigation buttons when DOM is ready
if (document.readyState === 'loading') {
  // Removed: using event delegation instead
} else {
  // Removed: using event delegation instead
}

// ============================================================================
// NOTION STATUS INDICATOR
// ============================================================================

function updateNotionStatus() {
  const status = document.getElementById('notionStatus');
  const token = notionTokenInput.value?.trim();
  const pageId = notionPageIdInput.value?.trim();

  if (token && pageId) {
    status.textContent = 'Configurado';
    status.classList.add('connected');
  } else if (token || pageId) {
    status.textContent = 'Incompleto';
    status.classList.remove('connected');
  } else {
    status.textContent = 'No configurado';
    status.classList.remove('connected');
  }
}

// Listen for changes in Notion fields
notionTokenInput.addEventListener('input', updateNotionStatus);
notionPageIdInput.addEventListener('input', updateNotionStatus);

// Check status on load
document.addEventListener('DOMContentLoaded', updateNotionStatus);

// ============================================================================
// OUTPUT SECTION UPDATE
// ============================================================================

function updateOutputSection(hasContent) {
  const outputSection = document.getElementById('outputSection');
  const meta = document.getElementById('meta');

  if (outputSection) {
    if (hasContent) {
      outputSection.classList.add('has-content');
      if (meta) meta.textContent = 'Listo para copiar / pegar';
    } else {
      outputSection.classList.remove('has-content');
      if (meta) meta.textContent = 'Genera tu brief para ver el resultado';
    }
  }
}

// Override the original output update to also update the section
const originalOutput = output;
if (originalOutput) {
  const observer = new MutationObserver(() => {
    const hasContent = originalOutput.textContent &&
      !originalOutput.textContent.includes('Haz clic en') &&
      !originalOutput.textContent.includes('Aún no hay');
    updateOutputSection(hasContent);
  });
  observer.observe(originalOutput, { childList: true, characterData: true, subtree: true });
}

// ============================================================================
// OUTPUT PANEL (Split Layout Integration)
// ============================================================================

function initOutputPanel() {
  // Get panel elements
  const outputPanel = document.getElementById("outputPanel");
  const outputEmpty = document.getElementById("outputEmpty");
  const outputPanelActions = document.getElementById("outputPanelActions");
  const outputPanelLabel = document.getElementById("outputPanelLabel");
  const copyBtnPanel = document.getElementById("copyBtnPanel");
  const downloadBtnPanel = document.getElementById("downloadBtnPanel");
  const sendNotionBtnPanel = document.getElementById("sendNotionBtnPanel");
  const meta = document.getElementById("meta");

  // If panel elements don't exist, skip (backwards compatibility)
  if (!outputPanel || !output) return;

  // Create MutationObserver to sync output with panel
  const panelObserver = new MutationObserver(() => {
    const content = output.textContent.trim();
    const isLoading = output.classList.contains('loading');

    // Show/hide empty state
    if (isLoading || content) {
      if (outputEmpty) outputEmpty.style.display = 'none';
      output.style.display = 'block';
    }

    // Update panel state when content is ready
    if (content && !isLoading) {
      outputPanel.classList.add('has-content');
      if (outputPanelActions) outputPanelActions.style.display = 'flex';
      if (outputPanelLabel) outputPanelLabel.textContent = 'Output ✓';
      if (meta) meta.textContent = 'Listo para copiar / pegar';

      // Enable panel buttons
      if (copyBtnPanel) copyBtnPanel.disabled = false;
      if (downloadBtnPanel) downloadBtnPanel.disabled = false;
      if (sendNotionBtnPanel) sendNotionBtnPanel.disabled = false;
    }
  });

  // Start observing output changes
  panelObserver.observe(output, { childList: true, subtree: true, characterData: true });

  // Panel copy button
  if (copyBtnPanel) {
    copyBtnPanel.addEventListener('click', () => {
      copyToClipboard();
    });
  }

  // Panel download button
  if (downloadBtnPanel) {
    downloadBtnPanel.addEventListener('click', () => {
      downloadOutput();
    });
  }

  // Panel Notion button
  if (sendNotionBtnPanel) {
    sendNotionBtnPanel.addEventListener('click', () => {
      if (sendNotionBtn && !sendNotionBtn.disabled) {
        sendNotionBtn.click();
      } else {
        // Scroll to Notion config in the form
        const notionConfig = document.getElementById('notionConfig');
        if (notionConfig) notionConfig.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  console.log('Output panel initialized');
}

// Initialize output panel when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOutputPanel);
} else {
  initOutputPanel();
}

// ============================================================================
// SECTION NAVIGATION FIX (Event Delegation - more reliable)
// ============================================================================

// Use event delegation on document for maximum reliability
document.addEventListener('click', function (e) {
  const btn = e.target.closest('[data-nav]');
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  const card = btn.closest('.card[data-section]');
  if (!card) return;

  const sectionNum = parseInt(card.dataset.section);
  const direction = btn.dataset.nav;

  console.log('Nav clicked:', direction, 'from section', sectionNum);

  if (direction === 'next') {
    switchTab(sectionNum + 1);
  } else if (direction === 'prev') {
    switchTab(sectionNum - 1);
  }
});

console.log('Section navigation (event delegation) ready');
