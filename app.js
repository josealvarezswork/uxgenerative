// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  API_URL: "https://broad-shadow-d8e2.josealvarezswork.workers.dev/api/generate",
  AUTOSAVE_DELAY: 2000, // ms
  STORAGE_KEY: "uxFormDraft",
  EXAMPLE_DATA_KEY: "uxFormExample",
  MAX_CHAR_WARNING: 0.8, // 80% of max
};

// ============================================================================
// DOM ELEMENTS
// ============================================================================

const form = document.getElementById("uxForm");
const output = document.getElementById("output");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const loadExampleBtn = document.getElementById("loadExampleBtn");
const clearDraftBtn = document.getElementById("clearDraftBtn");
const progressBadge = document.getElementById("progressBadge");
const numStagesEl = document.getElementById("numStages");
const stagesContainer = document.getElementById("stagesContainer");
const shortcutsHint = document.getElementById("shortcutsHint");

// ============================================================================
// STATE
// ============================================================================

let autosaveTimeout = null;
let lastGeneratedOutput = "";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

function setStatus(msg, type = "") {
  if (!statusEl) return;
  statusEl.textContent = msg || "";
  statusEl.className = `status ${type}`;
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ============================================================================
// CHARACTER COUNTER
// ============================================================================

function setupCharCounters() {
  const counters = document.querySelectorAll(".char-counter");
  
  counters.forEach(counter => {
    const max = parseInt(counter.dataset.max);
    const input = counter.closest(".field").querySelector("input, textarea");
    
    if (!input) return;
    
    function updateCounter() {
      const length = input.value.length;
      counter.textContent = `${length}/${max}`;
      
      counter.classList.remove("warning", "limit");
      if (length >= max) {
        counter.classList.add("limit");
      } else if (length >= max * CONFIG.MAX_CHAR_WARNING) {
        counter.classList.add("warning");
      }
    }
    
    input.addEventListener("input", updateCounter);
    updateCounter();
  });
}

// ============================================================================
// SECTION VALIDATION & PROGRESS
// ============================================================================

function isFieldValid(field) {
  if (!field.hasAttribute("required")) return true;
  
  if (field.type === "checkbox") {
    const name = field.name;
    const checkboxes = document.querySelectorAll(`input[name="${name}"]`);
    return Array.from(checkboxes).some(cb => cb.checked);
  }
  
  return field.value.trim() !== "";
}

function isSectionComplete(sectionNum) {
  const card = document.querySelector(`.card[data-section="${sectionNum}"]`);
  if (!card) return false;
  
  const requiredFields = card.querySelectorAll("[required]");
  
  // Special handling for checkboxes
  const checkboxGroups = new Set();
  requiredFields.forEach(field => {
    if (field.type === "checkbox") {
      checkboxGroups.add(field.name);
    }
  });
  
  // Check regular fields
  for (const field of requiredFields) {
    if (field.type === "checkbox") continue; // handled separately
    if (!isFieldValid(field)) return false;
  }
  
  // Check checkbox groups
  for (const groupName of checkboxGroups) {
    const checkboxes = card.querySelectorAll(`input[name="${groupName}"]`);
    const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
    if (!anyChecked) return false;
  }
  
  return true;
}

function updateSectionStatus(sectionNum) {
  const card = document.querySelector(`.card[data-section="${sectionNum}"]`);
  if (!card) return;
  
  const isComplete = isSectionComplete(sectionNum);
  const statusIcon = card.querySelector(".section-status");
  
  if (statusIcon) {
    statusIcon.dataset.status = isComplete ? "complete" : "incomplete";
    statusIcon.textContent = isComplete ? "✓" : "○";
  }
  
  if (isComplete) {
    card.classList.add("complete");
  } else {
    card.classList.remove("complete");
  }
}

function updateProgressBadge() {
  const totalSections = 10;
  let completedSections = 0;
  
  for (let i = 1; i <= totalSections; i++) {
    if (isSectionComplete(i)) completedSections++;
  }
  
  const progressText = progressBadge.querySelector(".progress-text");
  if (progressText) {
    progressText.textContent = `${completedSections}/${totalSections} secciones`;
  }
  
  if (completedSections === totalSections) {
    progressBadge.classList.add("complete");
  } else {
    progressBadge.classList.remove("complete");
  }
}

function setupRealtimeValidation() {
  // Monitor all form changes
  form.addEventListener("input", debounce(() => {
    // Update all section statuses
    for (let i = 1; i <= 10; i++) {
      updateSectionStatus(i);
    }
    updateProgressBadge();
    scheduleAutosave();
  }, 300));
  
  form.addEventListener("change", () => {
    for (let i = 1; i <= 10; i++) {
      updateSectionStatus(i);
    }
    updateProgressBadge();
    scheduleAutosave();
  });
  
  // Initial check
  setTimeout(() => {
    for (let i = 1; i <= 10; i++) {
      updateSectionStatus(i);
    }
    updateProgressBadge();
  }, 100);
}

// ============================================================================
// JOURNEY STAGES RENDERING
// ============================================================================

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
        <label for="stage_${i}_nameTimeline">Stage ${i}: Name & Timeline</label>
        <input class="input" id="stage_${i}_nameTimeline" name="stage_${i}_nameTimeline" required placeholder="Ej: 'Diagnóstico (10–15 min)'" />
      </div>

      <div class="field">
        <label for="stage_${i}_whatHappens">What happens (actions + thoughts + emotions + pains)</label>
        <textarea id="stage_${i}_whatHappens" name="stage_${i}_whatHappens" required placeholder="Describe acciones, pensamientos, emociones y pain points."></textarea>
      </div>
    `;
    stagesContainer.appendChild(block);
  }
  
  // Re-attach event listeners for new fields
  setupRealtimeValidation();
}

// ============================================================================
// FORM DATA COLLECTION
// ============================================================================

function collectFormData() {
  const fd = new FormData(form);
  const data = {};

  // Copy single-value fields
  for (const [k, v] of fd.entries()) {
    if (!(k in data)) {
      data[k] = typeof v === "string" ? v.trim() : v;
    }
  }

  // Multi-checkbox: primaryPlatforms
  const platformCheckboxes = document.querySelectorAll('input[name="primaryPlatforms"]:checked');
  data.primaryPlatforms = Array.from(platformCheckboxes).map(cb => cb.value);

  // Multi-checkbox: researchBacking
  data.researchBacking = fd.getAll("researchBacking").map(x => String(x).trim());

  // Journey stages
  const numStages = Math.max(3, Math.min(5, Number(fd.get("numStages") || 3)));
  data.journeyStages = [];
  for (let i = 1; i <= numStages; i++) {
    const nameTimeline = String(fd.get(`stage_${i}_nameTimeline`) || "").trim();
    const whatHappens = String(fd.get(`stage_${i}_whatHappens`) || "").trim();
    data.journeyStages.push({ index: i, nameTimeline, whatHappens });
  }

  return data;
}

// ============================================================================
// AUTO-SAVE FUNCTIONALITY
// ============================================================================

function scheduleAutosave() {
  clearTimeout(autosaveTimeout);
  autosaveTimeout = setTimeout(() => {
    saveFormDraft();
  }, CONFIG.AUTOSAVE_DELAY);
}

function saveFormDraft() {
  try {
    const data = collectFormData();
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
    setStatus("Guardado automáticamente", "saving");
    setTimeout(() => {
      if (statusEl.textContent === "Guardado automáticamente") {
        setStatus("");
      }
    }, 2000);
  } catch (err) {
    console.error("Error saving draft:", err);
  }
}

function loadFormDraft() {
  try {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (!saved) return false;
    
    const data = JSON.parse(saved);
    populateForm(data);
    
    showToast("Borrador cargado", "success");
    return true;
  } catch (err) {
    console.error("Error loading draft:", err);
    return false;
  }
}

function clearFormDraft() {
  try {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    form.reset();
    renderStages(3);
    updateProgressBadge();
    showToast("Borrador eliminado", "success");
    
    // Reset all section statuses
    for (let i = 1; i <= 10; i++) {
      updateSectionStatus(i);
    }
  } catch (err) {
    console.error("Error clearing draft:", err);
  }
}

function populateForm(data) {
  // Simple fields
  for (const [key, value] of Object.entries(data)) {
    if (key === "primaryPlatforms" || key === "researchBacking" || key === "journeyStages") continue;
    
    const field = form.elements[key];
    if (field && typeof value === "string") {
      field.value = value;
    }
  }
  
  // Primary platforms (checkboxes)
  if (Array.isArray(data.primaryPlatforms)) {
    data.primaryPlatforms.forEach(value => {
      const checkbox = form.querySelector(`input[name="primaryPlatforms"][value="${value}"]`);
      if (checkbox) checkbox.checked = true;
    });
  }
  
  // Research backing (checkboxes)
  if (Array.isArray(data.researchBacking)) {
    data.researchBacking.forEach(value => {
      const checkbox = form.querySelector(`input[name="researchBacking"][value="${value}"]`);
      if (checkbox) checkbox.checked = true;
    });
  }
  
  // Journey stages
  if (Array.isArray(data.journeyStages) && data.journeyStages.length > 0) {
    const numStages = data.journeyStages.length;
    numStagesEl.value = numStages;
    renderStages(numStages);
    
    setTimeout(() => {
      data.journeyStages.forEach((stage, idx) => {
        const i = idx + 1;
        const nameField = form.elements[`stage_${i}_nameTimeline`];
        const whatField = form.elements[`stage_${i}_whatHappens`];
        if (nameField) nameField.value = stage.nameTimeline || "";
        if (whatField) whatField.value = stage.whatHappens || "";
      });
      
      // Update validation after loading
      for (let i = 1; i <= 10; i++) {
        updateSectionStatus(i);
      }
      updateProgressBadge();
    }, 100);
  }
}

// ============================================================================
// EXAMPLE DATA
// ============================================================================

function loadExampleData() {
  const exampleData = {
    projectName: "MediTrack",
    oneSentence: "App móvil para médicos que facilita el seguimiento de pacientes hospitalizados en tiempo real.",
    productType: "App",
    primaryPlatforms: ["Mobile"],
    realWorldSituation: "Los médicos hacen rondas hospitalarias visitando 15-20 pacientes diarios. Cada visita requiere revisar historias clínicas en papel o sistemas fragmentados.",
    whatGoesWrong: "Pierden 20-30 minutos por ronda buscando información. Los errores de transcripción ocurren en ~15% de casos. La comunicación entre turnos es incompleta.",
    currentWorkarounds: "Usan WhatsApp no oficial, notas en papel, y múltiples sistemas legacy que no se comunican entre sí.",
    userRoleContext: "Médicos residentes e internistas en hospitales urbanos de 200+ camas",
    tryingToAccomplish: "Acceder rápidamente al estado del paciente, resultados de laboratorio, y medicación actual durante rondas para tomar decisiones informadas.",
    researchBacking: ["User interviews"],
    researchBackingDetails: 'n=12 entrevistas. Quote: "Paso más tiempo buscando info que con el paciente" (8/12 médicos). Promedio 25min/ronda perdidos.',
    desiredOutcome: "Completar rondas en 60% menos tiempo. Cero errores de transcripción. Comunicación entre turnos < 5min.",
    whyUseThis: "Todo en un lugar. Diseñado para uso móvil durante caminata. Voz-a-texto integrado.",
    productGoals: "• Reducir tiempo de ronda de 90min a 35min\n• Eliminar errores de transcripción\n• Mejorar satisfacción del médico (NPS > 40)",
    mustHaveFeatures: "• Vista rápida de pacientes por sala\n• Escaneo QR de pulsera paciente\n• Dictado por voz\n• Alertas críticas push\n• Modo offline",
    niceToHave: "• Integración con calendario\n• Predicción de deterioro con ML",
    outOfScope: "• Facturación\n• Gestión de citas\n• Telemedicina",
    technicalPlatformConstraints: "iOS 15+, Android 11+. Integración FHIR con Epic/Cerner. Offline-first con sincronización. Cumplimiento HIPAA.",
    businessTimelineConstraints: "Presupuesto $200k. Equipo de 4 (1 PM, 2 devs, 1 designer). Beta en 4 meses. Hospital piloto ya confirmado.",
    adoptionRisks: "Resistencia de médicos >50 años. Políticas IT hospitalarias estrictas. Competencia con Epic Haiku.",
    keyMetrics: "Task completion rondas: 90min → 35min en Q1\nError rate: 15% → 0% en Q2\nDaily active users: 70% del staff médico\nNPS > 40",
    facts: "Entrevistas n=12 confirman problema. Hospital piloto firmado (Source: contrato 2024-01-15). Epic tiene API FHIR documentada.",
    assumptions: "Médicos adoptarán nueva herramienta rápido. IT hospital aprobará en < 2 semanas. Offline es deal-breaker.",
    needsValidation: "¿Dictado por voz funciona en ambiente ruidoso? ¿IT aprueba app externa? ¿Usuarios >50 años adoptan?",
    ageOccupation: "28–45, Médicos residentes e internistas",
    techProficiency: "Comfortable",
    mainMotivations: "Eficiencia, precisión clínica, evitar burnout",
    dailyRoutineSnapshot: "Llegan 7am, revisan lista de pacientes, hacen rondas 8-10am visitando cada sala, documentan mientras caminan, pasan turno 2pm.",
    numStages: 3,
    opportunityAreas: "Durante las rondas (acceso info). Pase de turno (comunicación). Después de rondas (documentación)."
  };
  
  // Add stages
  exampleData.journeyStages = [
    {
      index: 1,
      nameTimeline: "Pre-ronda (7:00-8:00am)",
      whatHappens: "Revisan lista de pacientes en papel. Buscan historias en 3 sistemas diferentes. Se frustran por info desactualizada. Pain: 30min perdidos antes de empezar."
    },
    {
      index: 2,
      nameTimeline: "Durante ronda (8:00-10:00am)",
      whatHappens: "Visitan pacientes sala por sala. Anotan en papel. Buscan labs en PC de pasillo. Se preocupan por olvidar algo crítico. Pain: Fragmentación cognitiva."
    },
    {
      index: 3,
      nameTimeline: "Pase de turno (2:00-3:00pm)",
      whatHappens: "Transcriben notas a sistema. Informan casos críticos verbalmente. Olvidan detalles menores. Pain: 30min extra + errores de memoria."
    }
  ];
  
  populateForm(exampleData);
  showToast("Ejemplo cargado", "success");
}

// ============================================================================
// API SUBMISSION
// ============================================================================

async function submitForm(e) {
  e.preventDefault();

  // Client-side validation
  const data = collectFormData();
  
  // Check required multi-select fields
  if (!Array.isArray(data.primaryPlatforms) || data.primaryPlatforms.length === 0) {
    showToast("Selecciona al menos 1 Primary Platform", "error");
    document.querySelector('input[name="primaryPlatforms"]')?.focus();
    return;
  }

  if (!Array.isArray(data.researchBacking) || data.researchBacking.length === 0) {
    showToast("Selecciona al menos 1 Research backing", "error");
    document.querySelector('input[name="researchBacking"]')?.focus();
    return;
  }
  
  // Check all required fields
  const requiredFields = form.querySelectorAll("[required]");
  for (const field of requiredFields) {
    if (!isFieldValid(field)) {
      showToast("Completa todos los campos requeridos", "error");
      field.focus();
      return;
    }
  }

  // UI feedback
  setStatus("Generando...", "");
  submitBtn.disabled = true;
  copyBtn.disabled = true;
  downloadBtn.disabled = true;
  
  const btnContent = submitBtn.querySelector(".btn-content");
  const originalText = btnContent.textContent;
  btnContent.textContent = "Generando...";
  
  // Add loading spinner
  const spinner = document.createElement("div");
  spinner.className = "loading-spinner";
  submitBtn.insertBefore(spinner, btnContent);
  submitBtn.classList.add("loading");
  
  output.className = "output loading";
  output.textContent = "Generando output estructurado...";

  try {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API Error ${res.status}: ${errorText.slice(0, 200)}`);
    }

    const json = await res.json();
    const result = json.result || "(sin resultado)";
    
    output.className = "output";
    output.textContent = result;
    lastGeneratedOutput = result;
    
    copyBtn.disabled = false;
    downloadBtn.disabled = false;
    setStatus("✓ Listo", "success");
    showToast("Output generado exitosamente", "success");
    
    // Scroll to output
    output.scrollIntoView({ behavior: "smooth", block: "start" });
    
  } catch (err) {
    console.error("Submission error:", err);
    output.className = "output";
    output.textContent = "Error al generar el output. Por favor intenta nuevamente.";
    setStatus(`Error: ${err.message}`, "error");
    showToast("Error al generar", "error");
  } finally {
    submitBtn.disabled = false;
    spinner.remove();
    submitBtn.classList.remove("loading");
    btnContent.textContent = originalText;
  }
}

// ============================================================================
// COPY & DOWNLOAD
// ============================================================================

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

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

function setupKeyboardShortcuts() {
  let shortcutHintTimeout;
  
  document.addEventListener("keydown", (e) => {
    const isMod = e.metaKey || e.ctrlKey;
    
    // Show shortcuts hint on Cmd/Ctrl press
    if ((e.key === "Meta" || e.key === "Control") && shortcutsHint) {
      clearTimeout(shortcutHintTimeout);
      shortcutsHint.classList.add("show");
    }
    
    // Cmd/Ctrl + Enter = Submit
    if (isMod && e.key === "Enter") {
      e.preventDefault();
      if (!submitBtn.disabled) {
        submitBtn.click();
      }
    }
    
    // Cmd/Ctrl + K = Copy
    if (isMod && e.key === "k") {
      e.preventDefault();
      if (!copyBtn.disabled) {
        copyBtn.click();
      }
    }
  });
  
  document.addEventListener("keyup", (e) => {
    if ((e.key === "Meta" || e.key === "Control") && shortcutsHint) {
      shortcutHintTimeout = setTimeout(() => {
        shortcutsHint.classList.remove("show");
      }, 1000);
    }
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
  // Setup stages
  renderStages(numStagesEl?.value || 3);
  numStagesEl?.addEventListener("change", (e) => renderStages(e.target.value));
  numStagesEl?.addEventListener("input", (e) => renderStages(e.target.value));
  
  // Setup character counters
  setupCharCounters();
  
  // Setup realtime validation
  setupRealtimeValidation();
  
  // Setup keyboard shortcuts
  setupKeyboardShortcuts();
  
  // Load draft if exists
  const draftLoaded = loadFormDraft();
  
  // Event listeners
  form.addEventListener("submit", submitForm);
  copyBtn.addEventListener("click", copyToClipboard);
  downloadBtn.addEventListener("click", downloadOutput);
  loadExampleBtn?.addEventListener("click", loadExampleData);
  clearDraftBtn?.addEventListener("click", () => {
    if (confirm("¿Seguro que quieres limpiar el borrador guardado?")) {
      clearFormDraft();
    }
  });
  
  // Save on page unload
  window.addEventListener("beforeunload", () => {
    saveFormDraft();
  });
  
  console.log("UX Output Form initialized successfully");
  console.log(`Draft ${draftLoaded ? "loaded" : "not found"}`);
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}