const form = document.getElementById("uxForm");
const output = document.getElementById("output");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");
const copyBtn = document.getElementById("copyBtn");

// Endpoint REAL del Worker (nota: josealvarez*s*work)
const API_URL = "https://broad-shadow-d8e2.josealvarezswork.workers.dev/api/generate";

function setStatus(msg) {
  if (!statusEl) return;
  statusEl.textContent = msg || "";
}

function normalizeFormData(fd) {
  const obj = {};
  for (const [k, v] of fd.entries()) {
    // Normaliza strings (evita espacios raros)
    obj[k] = typeof v === "string" ? v.trim() : v;
  }
  return obj;
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

  setStatus("");
  submitBtn.disabled = true;
  copyBtn.disabled = true;
  output.textContent = "Generando...";

  // Captura + normaliza
  const data = normalizeFormData(new FormData(form));

  // Validación extra (radios)
  if (!data.productType) {
    output.textContent = "Falta información.";
    setStatus("Selecciona un Type of Product.");
    submitBtn.disabled = false;
    return;
  }

  // (Opcional) Si quieres obligar la one-sentence:
  if (!data.oneSentence || data.oneSentence.length === 0) {
    output.textContent = "Falta información.";
    setStatus("Escribe la One-sentence Description.");
    submitBtn.disabled = false;
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const text = await res.text(); // lee una sola vez
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const json = JSON.parse(text);
    output.textContent = json.result || "(sin resultado)";
    copyBtn.disabled = false;
    setStatus("Listo.");
  } catch (err) {
    output.textContent = "Error.";
    setStatus(err?.message || "Error al generar.");
  } finally {
      submitBtn.disabled = false;
    }
  });
