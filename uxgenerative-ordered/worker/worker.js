// ============================================================================
// CLOUDFLARE WORKER - UX GENERATIVE API (v3.0 - JSON ROBUSTNESS)
// ============================================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ========================================================================
    // ENDPOINT: /api/generate
    // ========================================================================
    if (url.pathname === "/api/generate") {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const body = await request.json();
        const prompt = buildPrompt(body);

        // Try up to 2 times to get valid JSON
        let result = null;
        let lastError = null;

        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${env.OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                  { role: "system", content: getSystemPrompt() },
                  { role: "user", content: prompt },
                ],
                max_tokens: 8000,
                temperature: attempt === 1 ? 0.5 : 0.3, // Lower temp on retry
                response_format: { type: "json_object" }, // Force JSON mode
              }),
            });

            if (!openaiRes.ok) {
              const errText = await openaiRes.text();
              throw new Error(`OpenAI error: ${errText}`);
            }

            const data = await openaiRes.json();
            let rawResult = data.choices?.[0]?.message?.content || "{}";

            // Clean and repair JSON
            rawResult = cleanJsonResponse(rawResult);
            rawResult = repairJson(rawResult);

            // Validate JSON
            JSON.parse(rawResult);
            result = rawResult;
            break; // Success, exit loop

          } catch (e) {
            lastError = e;
            console.log(`Attempt ${attempt} failed: ${e.message}`);
            if (attempt < 2) {
              await new Promise(r => setTimeout(r, 500)); // Wait before retry
            }
          }
        }

        if (!result) {
          return new Response(JSON.stringify({
            error: "Invalid JSON from AI after retries",
            details: lastError?.message || "Unknown error",
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ========================================================================
    // ENDPOINT: /api/notion
    // ========================================================================
    if (url.pathname === "/api/notion") {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const body = await request.json();

        const NOTION_TOKEN = body.notionToken || env.NOTION_TOKEN;
        const NOTION_DATABASE_ID = body.notionDatabaseId || env.NOTION_DATABASE_ID;
        const NOTION_PAGE_ID = body.notionPageId || null;

        if (!NOTION_TOKEN) {
          return new Response(JSON.stringify({
            error: "Missing Notion token",
            details: "Proporciona tu Integration Token de Notion"
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!NOTION_PAGE_ID && !NOTION_DATABASE_ID) {
          return new Response(JSON.stringify({
            error: "Missing Notion ID",
            details: "Proporciona el ID de una pagina o base de datos"
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const structuredData = body.structuredData || {};
        const blocks = buildNotionBlocks(structuredData);

        if (NOTION_PAGE_ID) {
          const notionRes = await fetch(`https://api.notion.com/v1/blocks/${NOTION_PAGE_ID}/children`, {
            method: "PATCH",
            headers: {
              "Authorization": `Bearer ${NOTION_TOKEN}`,
              "Content-Type": "application/json",
              "Notion-Version": "2022-06-28",
            },
            body: JSON.stringify({ children: blocks }),
          });

          if (!notionRes.ok) {
            const errText = await notionRes.text();
            return new Response(JSON.stringify({
              error: "Notion API error (Append)",
              details: errText
            }), {
              status: notionRes.status,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify({
            ok: true,
            message: "Blocks added to page",
            page: { id: NOTION_PAGE_ID }
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const notionRes = await fetch("https://api.notion.com/v1/pages", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${NOTION_TOKEN}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
          },
          body: JSON.stringify({
            parent: { database_id: NOTION_DATABASE_ID },
            properties: {
              Name: {
                title: [{ text: { content: structuredData.projectName || "UX Strategy Brief" } }],
              },
            },
            children: blocks,
          }),
        });

        if (!notionRes.ok) {
          const errText = await notionRes.text();
          return new Response(JSON.stringify({
            error: "Notion API error (Create Page)",
            details: errText
          }), {
            status: notionRes.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const page = await notionRes.json();
        return new Response(JSON.stringify({ ok: true, page }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  },
};

// ============================================================================
// HELPER: Limpieza robusta del JSON
// ============================================================================
function cleanJsonResponse(text) {
  // Remove markdown code blocks
  let cleaned = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  cleaned = cleaned.replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

  // Find the first { and last }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start === -1 || end === -1 || end < start) {
    return "{}";
  }

  return cleaned.slice(start, end + 1);
}

// ============================================================================
// HELPER: Repair common JSON issues
// ============================================================================
function repairJson(jsonString) {
  let repaired = jsonString;

  // Fix trailing commas before } or ]
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

  // Fix missing commas between properties (common AI mistake)
  // Pattern: "value" followed by newline and "key":
  repaired = repaired.replace(/(")\s*\n\s*(")/g, '$1,\n  $2');

  // Fix unescaped quotes in strings (basic attempt)
  // This is tricky - only do simple cases

  // Remove any trailing content after the last }
  const lastBrace = repaired.lastIndexOf('}');
  if (lastBrace !== -1 && lastBrace < repaired.length - 1) {
    repaired = repaired.slice(0, lastBrace + 1);
  }

  // Try to balance braces if unbalanced
  const openBraces = (repaired.match(/{/g) || []).length;
  const closeBraces = (repaired.match(/}/g) || []).length;

  if (openBraces > closeBraces) {
    // Add missing closing braces
    repaired += '}'.repeat(openBraces - closeBraces);
  }

  // Balance brackets
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/\]/g) || []).length;

  if (openBrackets > closeBrackets) {
    // Find position before last } and add missing ]
    const insertPos = repaired.lastIndexOf('}');
    const missingBrackets = ']'.repeat(openBrackets - closeBrackets);
    repaired = repaired.slice(0, insertPos) + missingBrackets + repaired.slice(insertPos);
  }

  return repaired;
}

// ============================================================================
// HELPER: System Prompt con reglas de copy UX
// ============================================================================
function getSystemPrompt() {
  return `You are a Senior UX Researcher and Strategist creating professional UX discovery documentation.

=== CRITICAL: OUTPUT RULES ===
1. Return ONLY valid JSON. No markdown, no code blocks, no text before or after.
2. Ensure all strings are properly escaped (use \\" for quotes inside strings).
3. Ensure all arrays and objects are properly closed.
4. Do NOT include trailing commas.
5. Keep string values under 500 characters each.

=== COPY RULES ===
1. USE ACTIVE VERBS: helps, enables, supports, reduces, clarifies, surfaces, streamlines, guides, blocks, triggers
   NEVER use: "is designed to", "aims to", "is intended for", "innovative", "seamless", "powerful", "cutting-edge", "robust", "comprehensive", "holistic", "leverage", "utilize", "empower"

2. LABEL EVERYTHING with prefixes:
   - [Fact]: Confirmed through research
   - [Assumption]: Needs validation through testing
   - [Needs validation]: Requires user analytics
   - [Frustration]: Pain point with impact
   - [Internal driver]: Personal motivation
   - [External pressure]: Outside force
   - [Main frustration]: Primary pain
   - [Secondary frustration]: Lesser pain
   - [Pain]: Journey obstacle

3. ADD CONTEXT after statements using " — " (em dash):
   - "70% struggle with structuring — directly observed in research"
   - "Reduce time by 50% — enables faster transition"
   - "Primary device: Laptop — uses for design and ideation"

4. USE SPECIFIC FORMATS:
   - Metrics: "Baseline X% → Target Y% — indicates improvement"
   - Constraints: "Technical: Description — affects feature"
   - Timeline: "Day 0", "Day 1-3", "Day 7+"
   - Feelings transitions: "Excited — triggered by X → Hopeful — after Y"

5. SHORT SENTENCES: Max 25 words. Write for iteration and editing.

6. STRUCTURE PAINS/GAINS:
   - Pains: "Fear of X blocks progress. Consequences of not solving include Y. Biggest obstacle remains Z."
   - Gains: "Success means X. Ideal state includes Y. They would feel Z if solved."`;
}

// ============================================================================
// HELPER: Build Prompt (Comprehensive UX documentation)
// ============================================================================
function buildPrompt(data) {
  return `
Generate a comprehensive UX strategy document as JSON based on this input:

PROJECT: ${data.projectName || "N/A"}
DESCRIPTION: ${data.oneSentence || "N/A"}
TYPE: ${data.productType || "N/A"}
PLATFORMS: ${Array.isArray(data.primaryPlatforms) ? data.primaryPlatforms.join(", ") : "N/A"}
CONTEXT: ${data.realWorldSituation || "N/A"}
PROBLEMS: ${data.whatGoesWrong || "N/A"}
WORKAROUNDS: ${data.currentWorkarounds || "N/A"}
TARGET USER: ${data.userRoleContext || "N/A"}
USER GOALS: ${data.tryingToAccomplish || "N/A"}
RESEARCH: ${data.researchBackingDetails || "N/A"}
DESIRED OUTCOME: ${data.desiredOutcome || "N/A"}
WHY USE THIS: ${data.whyUseThis || "N/A"}
PRODUCT GOALS: ${data.productGoals || "N/A"}
MUST-HAVE: ${data.mustHaveFeatures || "N/A"}
NICE-TO-HAVE: ${data.niceToHave || "N/A"}
OUT OF SCOPE: ${data.outOfScope || "N/A"}
TECH CONSTRAINTS: ${data.technicalPlatformConstraints || "N/A"}
BUSINESS CONSTRAINTS: ${data.businessTimelineConstraints || "N/A"}
RISKS: ${data.adoptionRisks || "N/A"}
METRICS: ${data.keyMetrics || "N/A"}
FACTS: ${data.facts || "N/A"}
ASSUMPTIONS: ${data.assumptions || "N/A"}
NEEDS VALIDATION: ${data.needsValidation || "N/A"}
PERSONA: ${data.ageOccupation || "N/A"}, Tech: ${data.techProficiency || "N/A"}
MOTIVATIONS: ${data.mainMotivations || "N/A"}
ROUTINE: ${data.dailyRoutineSnapshot || "N/A"}
JOURNEY: ${Array.isArray(data.journeyStages) ? data.journeyStages.map(s => s.nameTimeline + ": " + s.whatHappens).join(" | ") : "N/A"}
OPPORTUNITIES: ${data.opportunityAreas || "N/A"}

Return this EXACT JSON structure. Follow the format examples carefully:

{
  "projectName": "string",
  "project_overview": {
    "description": "string - 2 sentences: what it does + who it helps + key benefit. Example: 'ProductName helps [Users] quickly transform [problem] into [solution] by [method]. It reduces [friction] and supports [outcome].'",
    "target_audience": {
      "primary": "string - main users with context. Example: 'Product Designers and Builders — who need to transform vague ideas into structured artifacts'",
      "secondary": "string - secondary users. Example: 'Solo designers needing structure'"
    },
    "objectives": [
      "string - format: 'Action + metric — benefit'. Example: 'Reduce discovery time by 50% — enables faster transition to design'",
      "string - 3 total objectives with specific metrics and benefits"
    ],
    "motivation": "string - why project exists + consequence of not solving + what addressing it enables. Example: 'This project exists because [problem context]. Current solutions fail to [gap]. Addressing this helps users [benefit] and supports [outcome].'"
  },
  "outline_scope": {
    "problem_statement": "string - format: '[User] needs to [action] because [reason]. Currently, [barrier] blocks them, resulting in [consequence].'",
    "assumptions": [
      "string - format: '[Assumption] Statement — needs validation through [method]'. Example: '[Assumption] Users prefer structured guidance over free-form text — needs validation through user testing'"
    ],
    "constraints": [
      "string - format: 'Category: Description — impact'. Categories: Technical, Timeline, Budget, Platform. Example: 'Technical: Dependent on third-party AI APIs — affects artifact generation'"
    ],
    "features": {
      "must_have": [
        "string - format: 'Feature name — benefit, consequence without it'. Example: 'Guided input form with UX-focused questions — enables structured discovery, blocks launch without it'"
      ],
      "nice_to_have": [
        "string - format: 'Feature name — benefit, priority note'. Example: 'Figma export — improves design integration, consider for v1.1'"
      ],
      "out_of_scope": [
        "string - format: 'Feature name — reason excluded, future note'. Example: 'Full UI design system generation — deferred to future phase, revisit after MVP success'"
      ]
    },
    "success_metrics": {
      "behavioral": [
        "string - format: 'Metric name: Baseline X% → Target Y% — indicates [what it measures]'. Example: 'Task completion: Baseline 60% → Target 85% — indicates reduced friction'"
      ],
      "engagement": [
        "string - format: 'Metric name: Target X% — surfaces [what it measures]'. Example: 'Weekly active users: Target 40% — surfaces adoption patterns'"
      ]
    }
  },
  "user_research": {
    "research_questions": [
      "string - format: 'Question? — surfaces [what it reveals]'. Example: 'What blocks users when structuring early ideas? — surfaces friction points'"
    ],
    "research_methods": [
      "string - format: 'Method (sample size) — key finding'. Example: 'User interviews (n=10) — surfaced need for structured guidance'"
    ],
    "key_findings": [
      "string - format: '[Label] Finding — context'. Labels: [Fact], [Assumption], [Needs validation]. Example: '[Fact] 70% of users struggle with idea structuring — directly observed in research'"
    ],
    "user_needs": {
      "functional": "string - what users need to do. Example: 'Users need to structure ideas without losing time'",
      "emotional": "string - how users want to feel. Example: 'Users want to feel confident about early decisions'",
      "social": "string - social/team needs. Example: 'Users need to share structured outputs with teams'"
    },
    "frustrations_detected": [
      "string - format: '[Frustration]: Description — impact'. Example: '[Frustration]: Current tools require manual structuring — slows users down'"
    ],
    "user_quotes": [
      "string - format: 'Quote — reveals [insight]'. Example: 'I hate starting from scratch — reveals emotional weight'"
    ]
  },
  "user_persona": {
    "name": "string - realistic first name",
    "age_occupation": "string - format: 'Age / Occupation'. Example: '30 / Product Designer'",
    "location": "string - city, country. Example: 'New York, USA'",
    "bio": "string - 2 sentences: what they do + what they value + what they struggle with",
    "technology": {
      "primary_device": "string - format: 'Device — usage context'. Example: 'Laptop — uses for design and ideation'",
      "key_apps": "string - format: 'App1, App2 — indicates preference'. Example: 'Figma, Notion — indicates preference for design and organization'",
      "tech_comfort": "string - format: 'Level — affects what'. Example: 'High — affects onboarding needs'"
    },
    "routine": {
      "morning": "string - format: 'Activity — opportunity note'. Example: 'Reviews ideas related to ongoing projects — opportunity for intervention'",
      "workday": "string - format: 'Activity — friction note'. Example: 'Encounters friction when structuring ideas — peak frustration moment'",
      "evening": "string - format: 'Activity — use case note'. Example: 'Reflects on day work and plans next steps — possible use case'"
    },
    "user_objectives": [
      "string - format: 'Priority: Goal — success measure'. Example: 'Primary: Structure product ideas quickly — measures success by reduced time spent'"
    ],
    "main_motivations": [
      "string - format: '[Label]: Motivation — impact'. Labels: [Internal driver], [External pressure]. Example: '[Internal driver]: Wants to feel confident — shapes messaging'"
    ],
    "frustrations": [
      "string - format: '[Label]: Frustration'. Labels: [Main frustration], [Secondary frustration]. Example: '[Main frustration]: Starting with a blank page causes anxiety'"
    ]
  },
  "empathy_map": {
    "thinks": [
      "string - internal thoughts. Example: 'Worries about missing key aspects of the idea'"
    ],
    "feels": [
      "string - emotions. Example: 'Frustrated when starting from scratch'"
    ],
    "says": [
      "string - format: 'Context: Quote'. Example: 'Tells colleagues: I need a better way to structure ideas'"
    ],
    "does": [
      "string - observable actions. Example: 'Relies on templates when facing a blank page'"
    ],
    "pains": "string - format: 'Fear of X blocks progress. Consequences of not solving include Y. The biggest obstacle remains Z.'",
    "gains": "string - format: 'Success means X. Ideal state includes Y. They would feel Z if the solution worked.'"
  },
  "journey_map": [
    {
      "stage": "Discovery",
      "timeline": "Day 0",
      "actions": ["string - user actions in this stage"],
      "feelings": {
        "start": "string - format: 'Emotion — trigger'. Example: 'Excited — triggered by new idea'",
        "end": "string - format: 'Emotion — after what'. Example: 'Hopeful — after finding potential solutions'"
      },
      "thoughts": [
        "string - format: 'Prefix: Thought'. Prefixes: Thinks, Wonders, Asks, Compares, Evaluates. Example: 'Thinks: How do I structure this idea?'"
      ],
      "pain_points": [
        "string - format: '[Pain]: Description'. Example: '[Pain]: Lack of structure blocks progress'"
      ],
      "opportunities": [
        "string - format: 'Action by method'. Example: 'Reduce friction by providing guided input'"
      ]
    },
    {
      "stage": "Onboarding",
      "timeline": "Day 1-3",
      "actions": ["string"],
      "feelings": {
        "start": "string",
        "end": "string"
      },
      "thoughts": ["string"],
      "pain_points": ["string"],
      "opportunities": ["string"]
    },
    {
      "stage": "Regular Use",
      "timeline": "Day 7+",
      "actions": ["string"],
      "feelings": {
        "start": "string",
        "end": "string"
      },
      "thoughts": ["string"],
      "pain_points": ["string"],
      "opportunities": ["string"]
    }
  ],
  "research_synthesis": {
    "key_insights": [
      {
        "title": "string - insight statement",
        "evidence": "string - supporting data with source",
        "implication": "string - format: 'Suggests [action]. Consider [additional].' Example: 'Suggests designing guided input forms. Consider simplifying questions.'"
      }
    ],
    "how_might_we": {
      "primary": [
        "string - format: 'How might we [action] for [users]?'. Example: 'How might we reduce blank-page friction for designers?'"
      ],
      "secondary": [
        "string - edge cases and differentiation. Example: 'How might we support edge case users in unique scenarios?'"
      ]
    },
    "design_principles": [
      {
        "name": "string - short memorable name. Example: 'Guide, Don't Dictate'",
        "definition": "string - what it means. Example: 'Provide structured guidance without overwhelming users'",
        "rationale": "string - why it matters. Example: 'Addresses need for clarity and control'",
        "application": "string - when to apply. Example: 'When designing forms, offer optional prompts'"
      }
    ]
  }
}
`.trim();
}

// ============================================================================
// HELPER: Build Notion Blocks
// ============================================================================
function buildNotionBlocks(rawJson) {
  let data;
  try {
    data = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
  } catch (e) {
    return [{
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: [{ type: "text", text: { content: "Error parsing JSON. Please try again." } }] }
    }];
  }

  const blocks = [];

  const richText = (content) => [{ type: "text", text: { content: String(content || "").slice(0, 2000) } }];

  const heading2 = (content) => ({
    object: "block",
    type: "heading_2",
    heading_2: { rich_text: richText(content) }
  });

  const heading3 = (content) => ({
    object: "block",
    type: "heading_3",
    heading_3: { rich_text: richText(content) }
  });

  const paragraph = (content) => ({
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: richText(content || "[Pending]") }
  });

  const bulletItem = (content) => ({
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: { rich_text: richText(content || "[Pending]") }
  });

  const callout = (content, icon = "💡") => ({
    object: "block",
    type: "callout",
    callout: {
      rich_text: richText(content || "[Pending]"),
      icon: { emoji: icon },
      color: "gray_background"
    }
  });

  const divider = () => ({ object: "block", type: "divider", divider: {} });

  const listFromArray = (arr) => {
    const items = Array.isArray(arr) && arr.length > 0 ? arr : ["[Pending]"];
    return items.map(item => bulletItem(typeof item === 'string' ? item : JSON.stringify(item)));
  };

  // Build blocks
  blocks.push(heading2(`📋 ${data.projectName || "UX Strategy Brief"}`));
  blocks.push(divider());

  // Project Overview
  if (data.project_overview) {
    blocks.push(heading2("1. Project Overview"));
    blocks.push(heading3("📋 Description"));
    blocks.push(paragraph(data.project_overview.description));
    blocks.push(heading3("→ Target Audience"));
    if (data.project_overview.target_audience) {
      if (typeof data.project_overview.target_audience === 'object') {
        blocks.push(callout(data.project_overview.target_audience.primary || "[Pending]", "👥"));
        if (data.project_overview.target_audience.secondary) {
          blocks.push(paragraph(`Secondary: ${data.project_overview.target_audience.secondary}`));
        }
      } else {
        blocks.push(callout(data.project_overview.target_audience, "👥"));
      }
    }
    blocks.push(heading3("🎯 Objectives"));
    blocks.push(...listFromArray(data.project_overview.objectives));
    blocks.push(heading3("! Motivation"));
    blocks.push(callout(data.project_overview.motivation, "💡"));
    blocks.push(divider());
  }

  // Outline & Scope
  if (data.outline_scope) {
    blocks.push(heading2("2. Outline & Scope"));
    blocks.push(heading3("⚠️ Problem Statement"));
    blocks.push(callout(data.outline_scope.problem_statement, "⚠️"));
    blocks.push(heading3("📝 Assumptions"));
    blocks.push(...listFromArray(data.outline_scope.assumptions));
    blocks.push(heading3("🔒 Constraints"));
    blocks.push(...listFromArray(data.outline_scope.constraints));

    if (data.outline_scope.features) {
      blocks.push(heading3("✨ Features"));
      blocks.push(paragraph("Must Have:"));
      blocks.push(...listFromArray(data.outline_scope.features.must_have));
      blocks.push(paragraph("Nice to Have:"));
      blocks.push(...listFromArray(data.outline_scope.features.nice_to_have));
      blocks.push(paragraph("Out of Scope:"));
      blocks.push(...listFromArray(data.outline_scope.features.out_of_scope));
    }

    if (data.outline_scope.success_metrics) {
      blocks.push(heading3("📊 Success Metrics"));
      blocks.push(paragraph("Behavioral:"));
      blocks.push(...listFromArray(data.outline_scope.success_metrics.behavioral));
      blocks.push(paragraph("Engagement:"));
      blocks.push(...listFromArray(data.outline_scope.success_metrics.engagement));
    }
    blocks.push(divider());
  }

  // User Research
  if (data.user_research) {
    blocks.push(heading2("3. User Research"));
    blocks.push(heading3("❓ Research Questions"));
    blocks.push(...listFromArray(data.user_research.research_questions));
    blocks.push(heading3("🔬 Methods"));
    blocks.push(...listFromArray(data.user_research.research_methods));
    blocks.push(heading3("🔍 Key Findings"));
    blocks.push(...listFromArray(data.user_research.key_findings));
    blocks.push(heading3("💭 User Needs"));
    if (data.user_research.user_needs && typeof data.user_research.user_needs === 'object') {
      blocks.push(bulletItem(`Functional: ${data.user_research.user_needs.functional || "[Pending]"}`));
      blocks.push(bulletItem(`Emotional: ${data.user_research.user_needs.emotional || "[Pending]"}`));
      blocks.push(bulletItem(`Social: ${data.user_research.user_needs.social || "[Pending]"}`));
    } else {
      blocks.push(...listFromArray(data.user_research.user_needs));
    }
    blocks.push(heading3("😤 Frustrations"));
    blocks.push(...listFromArray(data.user_research.frustrations_detected));
    blocks.push(heading3("💬 User Quotes"));
    blocks.push(...listFromArray(data.user_research.user_quotes));
    blocks.push(divider());
  }

  // User Persona
  if (data.user_persona) {
    blocks.push(heading2("4. User Persona"));
    const personaHeader = `${data.user_persona.name || "User"} — ${data.user_persona.age_occupation || ""} — ${data.user_persona.location || ""}`;
    blocks.push(callout(personaHeader, "👤"));
    blocks.push(heading3("📖 Bio"));
    blocks.push(paragraph(data.user_persona.bio));
    blocks.push(heading3("💻 Technology"));
    if (data.user_persona.technology && typeof data.user_persona.technology === 'object') {
      blocks.push(bulletItem(`Primary device: ${data.user_persona.technology.primary_device || "[Pending]"}`));
      blocks.push(bulletItem(`Key apps: ${data.user_persona.technology.key_apps || "[Pending]"}`));
      blocks.push(bulletItem(`Tech comfort: ${data.user_persona.technology.tech_comfort || "[Pending]"}`));
    } else {
      blocks.push(...listFromArray(data.user_persona.technology));
    }
    blocks.push(heading3("📅 Daily Routine"));
    if (data.user_persona.routine && typeof data.user_persona.routine === 'object') {
      blocks.push(bulletItem(`Morning: ${data.user_persona.routine.morning || "[Pending]"}`));
      blocks.push(bulletItem(`Workday: ${data.user_persona.routine.workday || "[Pending]"}`));
      blocks.push(bulletItem(`Evening: ${data.user_persona.routine.evening || "[Pending]"}`));
    }
    blocks.push(heading3("🎯 Objectives"));
    blocks.push(...listFromArray(data.user_persona.user_objectives));
    blocks.push(heading3("🔥 Motivations"));
    blocks.push(...listFromArray(data.user_persona.main_motivations));
    blocks.push(heading3("😤 Frustrations"));
    blocks.push(...listFromArray(data.user_persona.frustrations));
    blocks.push(divider());
  }

  // Empathy Map
  if (data.empathy_map) {
    blocks.push(heading2("5. Empathy Map"));
    blocks.push(heading3("🧠 THINKS"));
    blocks.push(...listFromArray(data.empathy_map.thinks));
    blocks.push(heading3("❤️ FEELS"));
    blocks.push(...listFromArray(data.empathy_map.feels));
    blocks.push(heading3("💬 SAYS"));
    blocks.push(...listFromArray(data.empathy_map.says));
    blocks.push(heading3("🖐️ DOES"));
    blocks.push(...listFromArray(data.empathy_map.does));
    blocks.push(heading3("😤 PAINS"));
    blocks.push(callout(data.empathy_map.pains || "[Pending]", "😤"));
    blocks.push(heading3("🎉 GAINS"));
    blocks.push(callout(data.empathy_map.gains || "[Pending]", "🎉"));
    blocks.push(divider());
  }

  // Journey Map
  if (Array.isArray(data.journey_map)) {
    blocks.push(heading2("6. Journey Map"));
    data.journey_map.forEach((stage, i) => {
      const timeline = stage.timeline || "";
      blocks.push(heading3(`STAGE ${i + 1}: ${stage.stage || "Stage"} — ${timeline}`));
      blocks.push(paragraph("ACTIONS:"));
      blocks.push(...listFromArray(stage.actions));
      if (stage.feelings) {
        const feelStart = typeof stage.feelings === 'object' ? stage.feelings.start : stage.feelings;
        const feelEnd = typeof stage.feelings === 'object' ? stage.feelings.end : "";
        blocks.push(callout(`FEELINGS: ${feelStart} → ${feelEnd}`, "💭"));
      }
      if (stage.thoughts) {
        blocks.push(paragraph("THOUGHTS:"));
        blocks.push(...listFromArray(stage.thoughts));
      }
      if (stage.pain_points) {
        blocks.push(callout(`PAINS: ${Array.isArray(stage.pain_points) ? stage.pain_points.join(" | ") : stage.pain_points}`, "😤"));
      }
      if (stage.opportunities) {
        blocks.push(callout(`OPPORTUNITIES: ${Array.isArray(stage.opportunities) ? stage.opportunities.join(" | ") : stage.opportunities}`, "💡"));
      }
    });
    blocks.push(divider());
  }

  // Research Synthesis
  if (data.research_synthesis) {
    blocks.push(heading2("7. Research Synthesis"));

    if (Array.isArray(data.research_synthesis.key_insights)) {
      blocks.push(heading3("🔍 Key Insights"));
      data.research_synthesis.key_insights.forEach(insight => {
        blocks.push(callout(`${insight.title}`, "💡"));
        blocks.push(paragraph(`Evidence: ${insight.evidence || "[Pending]"}`));
        blocks.push(paragraph(`Implication: ${insight.implication || "[Pending]"}`));
      });
    }

    if (data.research_synthesis.how_might_we) {
      blocks.push(heading3("❓ How Might We"));
      if (data.research_synthesis.how_might_we.primary) {
        blocks.push(paragraph("Primary:"));
        blocks.push(...listFromArray(data.research_synthesis.how_might_we.primary));
      }
      if (data.research_synthesis.how_might_we.secondary) {
        blocks.push(paragraph("Secondary:"));
        blocks.push(...listFromArray(data.research_synthesis.how_might_we.secondary));
      }
    }

    if (Array.isArray(data.research_synthesis.design_principles)) {
      blocks.push(heading3("📐 Design Principles"));
      data.research_synthesis.design_principles.forEach(p => {
        blocks.push(callout(`# ${p.name}`, "📐"));
        blocks.push(paragraph(`Definition: ${p.definition || "[Pending]"}`));
        blocks.push(paragraph(`Rationale: ${p.rationale || "[Pending]"}`));
        blocks.push(paragraph(`Application: ${p.application || "[Pending]"}`));
      });
    }
  }

  return blocks;
}
