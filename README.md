# UX Strategy Generator

Herramienta completa para generar documentación UX estructurada mediante IA. Incluye webapp para demos y plugin de Figma para workflow directo.

---

## Arquitectura

```
uxgenerative-main/
├── webapp/              # Web app para demos y uso independiente
│   ├── index.html       # Landing page
│   ├── app.html         # El form principal
│   ├── styles.css
│   └── app.js
├── figma-plugin/        # Plugin de Figma con form integrado
│   ├── manifest.json
│   ├── ui.html
│   └── code.js
├── worker/              # Cloudflare Worker (API backend)
│   └── worker.js
└── README.md
```

---

## Componentes

### 1. Webapp (`/webapp`)

Web app standalone para generar UX briefs. Ideal para demos, onboarding, o uso sin Figma.

**Características:**
- Form de 10 secciones con navegación por tabs
- Auto-guardado en localStorage cada 2 segundos
- Progress tracking en tiempo real
- Output panel lateral siempre visible
- Exportar a Markdown, copiar JSON para Figma
- Integración con Notion (opcional)
- Shortcuts: `Cmd+Enter` (generar), `Cmd+K` (copiar)

**Uso:**
```bash
# Opción 1: Abrir directamente
open webapp/index.html

# Opción 2: Servidor local (recomendado)
cd webapp
npx serve .
# Abre http://localhost:3000
```

---

### 2. Figma Plugin (`/figma-plugin`)

Plugin completo con el form integrado. Genera frames directamente en Figma sin copiar/pegar.

**Características:**
- Form completo de 10 secciones dentro de Figma
- Llama a la API directamente
- Genera frames con auto-layout
- 3 temas: Dark, Light, Notion
- Shortcut `Cmd+E` para cargar ejemplo

**Instalación:**

1. Abre **Figma Desktop** (no funciona en web)
2. Ve a `Plugins` > `Development` > `Import plugin from manifest...`
3. Selecciona: `figma-plugin/manifest.json`
4. El plugin aparece en `Plugins` > `Development` > `UX Strategy Generator`

**Archivos:**

| Archivo | Descripción |
|---------|-------------|
| `manifest.json` | Configuración del plugin (nombre, permisos, dominios) |
| `ui.html` | Interfaz del plugin (form completo + estilos inline) |
| `code.js` | Lógica de Figma (genera frames, textos, auto-layout) |

---

### 3. Worker (`/worker`)

Cloudflare Worker que actúa como proxy a OpenAI. Procesa el brief y genera documentación estructurada.

**Características:**
- Proxy seguro a OpenAI (API key no expuesta)
- Retry automático (2 intentos)
- Reparación de JSON malformado
- `response_format: { type: "json_object" }` para respuestas válidas
- CORS habilitado

**Despliegue en Cloudflare:**

1. Ve a [dash.cloudflare.com](https://dash.cloudflare.com)
2. `Workers & Pages` > Tu worker (`broad-shadow-d8e2`)
3. `Quick Edit` o `Edit Code`
4. Reemplaza todo el código con el contenido de `worker/worker.js`
5. Click `Deploy`

**Variables de entorno requeridas:**
```
OPENAI_API_KEY = sk-...
```

Configurar en: `Settings` > `Variables` > `Add variable`

---

## Flujo de Datos

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Webapp    │     │   Worker    │     │   OpenAI    │
│  or Plugin  │────>│ (Cloudflare)│────>│   GPT-4o    │
│             │<────│             │<────│             │
└─────────────┘     └─────────────┘     └─────────────┘
      │
      │ (Plugin only)
      v
┌─────────────┐
│   Figma     │
│   Frames    │
└─────────────┘
```

1. Usuario llena el form (webapp o plugin)
2. Form envía JSON al Worker
3. Worker construye prompt y llama a OpenAI
4. OpenAI devuelve documentación estructurada
5. Webapp muestra resultado / Plugin genera frames en Figma

---

## Estructura del JSON Generado

El Worker devuelve un JSON con esta estructura:

```json
{
  "projectName": "Good Manual",
  "project_overview": {
    "description": "...",
    "target_audience": "...",
    "objectives": ["...", "..."],
    "motivation": "..."
  },
  "outline_scope": {
    "problem_statement": "...",
    "assumptions": ["..."],
    "constraints": ["..."],
    "features": {
      "must_have": ["..."],
      "nice_to_have": ["..."],
      "out_of_scope": ["..."]
    },
    "success_metrics": {
      "behavioral": ["..."],
      "engagement": ["..."]
    }
  },
  "user_research": {
    "research_questions": ["..."],
    "research_methods": ["..."],
    "key_findings": ["..."],
    "user_needs": ["..."],
    "frustrations_detected": ["..."],
    "user_quotes": ["..."]
  },
  "user_persona": {
    "name": "...",
    "age_occupation": "...",
    "location": "...",
    "bio": "...",
    "technology": ["..."],
    "routine": {
      "morning": "...",
      "workday": "...",
      "evening": "..."
    },
    "user_objectives": ["..."],
    "main_motivations": ["..."],
    "frustrations": ["..."]
  },
  "empathy_map": {
    "thinks": ["..."],
    "feels": ["..."],
    "says": ["..."],
    "does": ["..."],
    "pains": "...",
    "gains": "..."
  },
  "journey_map": [
    {
      "stage": "...",
      "timeline": "...",
      "actions": ["..."],
      "thoughts": ["..."],
      "feelings": { "start": "...", "end": "..." },
      "pain_points": ["..."],
      "opportunities": ["..."]
    }
  ],
  "research_synthesis": {
    "key_insights": [
      { "title": "...", "evidence": "...", "implication": "..." }
    ],
    "how_might_we": {
      "primary": ["..."],
      "secondary": ["..."]
    },
    "design_principles": [
      { "name": "...", "definition": "...", "rationale": "...", "application": "..." }
    ]
  }
}
```

---

## Configuración

### API URL

Ambos (webapp y plugin) apuntan al mismo Worker:

```javascript
// webapp/app.js
const API_URL = 'https://broad-shadow-d8e2.josealvarezswork.workers.dev';

// figma-plugin/ui.html
const API_URL = 'https://broad-shadow-d8e2.josealvarezswork.workers.dev';
```

### Manifest del Plugin

```json
{
  "name": "UX Strategy Generator",
  "id": "ux-strategy-generator-2024",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "editorType": ["figma"],
  "networkAccess": {
    "allowedDomains": [
      "https://broad-shadow-d8e2.josealvarezswork.workers.dev"
    ]
  }
}
```

---

## Temas del Plugin

El plugin genera frames con 3 opciones de tema:

| Tema | Background | Cards | Texto |
|------|------------|-------|-------|
| **Dark** | `#070a0f` | `#0c121c` | `#e9eef7` |
| **Light** | `#ffffff` | `#f9f9fb` | `#1a1a1a` |
| **Notion** | `#ffffff` | `#f7f7f6` | `#252525` |

---

## Secciones del Form

| # | Sección | Campos principales |
|---|---------|-------------------|
| 1 | Project Identity | Nombre, descripción, tipo, plataformas |
| 2 | Problem & Context | Situación actual, problemas, workarounds |
| 3 | User Evidence | Rol de usuario, objetivos, research |
| 4 | Value Hypothesis | Outcome deseado, propuesta de valor, goals |
| 5 | Scope | Must-have, nice-to-have, out of scope |
| 6 | Constraints | Técnicas, negocio, riesgos de adopción |
| 7 | Success Metrics | KPIs principales (2-4) |
| 8 | Assumptions Check | Hechos, suposiciones, validaciones |
| 9 | Persona Essentials | Edad, tech proficiency, motivaciones, rutina |
| 10 | Journey Stages | 3-5 stages con acciones y emociones |

---

## Shortcuts

### Webapp
| Shortcut | Acción |
|----------|--------|
| `Cmd/Ctrl + Enter` | Generar output |
| `Cmd/Ctrl + K` | Copiar resultado |

### Plugin
| Shortcut | Acción |
|----------|--------|
| `Cmd/Ctrl + E` | Cargar ejemplo |

---

## Troubleshooting

### Error 500 del Worker

**Causa:** OpenAI devuelve JSON malformado.

**Solución:** Asegúrate de desplegar el `worker/worker.js` actualizado que incluye:
- Retry logic (2 intentos)
- `response_format: { type: "json_object" }`
- Función `repairJson()` para casos edge

### Plugin no aparece en Figma

**Causa:** Usas Figma web en lugar de Desktop.

**Solución:** Los plugins en desarrollo solo funcionan en Figma Desktop.

### Frames no se generan

**Causa:** La fuente Inter no está disponible.

**Solución:** El plugin carga Inter automáticamente. Si falla, asegúrate de tener conexión a internet.

### CORS Error

**Causa:** El dominio no está en `allowedDomains` del manifest.

**Solución:** Verifica que `manifest.json` incluya tu URL de Worker.

---

## Desarrollo

### Modificar el Form

1. Edita `webapp/index.html` para la webapp
2. Edita `figma-plugin/ui.html` para el plugin
3. Mantén ambos sincronizados manualmente

### Modificar los Frames Generados

1. Edita `figma-plugin/code.js`
2. Las funciones principales son:
   - `generateProjectOverview()`
   - `generateOutlineScope()`
   - `generateUserResearch()`
   - `generateUserPersona()`
   - `generateEmpathyMap()`
   - `generateJourneyMap()`
   - `generateResearchSynthesis()`

### Modificar el Prompt de IA

1. Edita `worker/worker.js`
2. Busca la sección `messages` en el fetch a OpenAI
3. Modifica el system prompt o la estructura esperada

---

## Stack Tecnológico

- **Frontend:** Vanilla JS, CSS custom properties
- **Backend:** Cloudflare Workers
- **IA:** OpenAI GPT-4o
- **Plugin:** Figma Plugin API
- **Sin dependencias externas**

---

## Créditos

**Diseño y desarrollo:** Jose Alvarez
**IA Assistant:** Claude Opus 4.5
**Version:** 2.0 (Febrero 2025)

---

## Changelog

### v2.0 (Feb 2025)
- Arquitectura reorganizada (webapp/plugin/worker)
- Plugin de Figma con form completo integrado
- Worker mejorado con retry y JSON repair
- Eliminado workflow de copiar/pegar JSON

### v1.0 (Ene 2025)
- Webapp inicial con form de 10 secciones
- Auto-save, progress tracking
- Integración con Notion
- Export a Markdown

---

**Happy building!**
