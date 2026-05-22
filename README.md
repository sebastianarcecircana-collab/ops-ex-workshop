# Operation Quicksilver — Project Brief

## What this is

A self-hosted web app for running an AI fluency training exercise themed as a Mission Impossible operation. Teams complete four gated tasks ("phases"), each demonstrating a different AI/Copilot skill. They use their own Microsoft Copilot externally and paste artifacts back into the app. A handler character ("Cipher") evaluates each submission in voice and the team progresses through all four gates. At the end, an AI-driven "scenario player" generates a personalized 5-act mission outcome narrative based on the team's actual artifacts and quality signals.

**Audience:** small teams (3–6 people) running through a cohort exercise. Multiple cohorts can run in parallel. Each cohort run takes roughly 2–3 hours real time.

## The four gates

1. **Build the Legend** — *prompt chaining with meta-prompting.* Team builds a cover identity for an operative through a chain of prompts where each output feeds the next, and where each prompt is itself authored via meta-prompting (using AI to write the prompt).

2. **The Dossier** — *research with Copilot.* Team gathers intel on the venue, host, bidders, and security at a fictional Monaco gala. Parallelizable across team members.

3. **Find the Crack** — *data analysis with Copilot.* Team analyzes a provided CSV (RFID badge access logs) to surface a specific anomaly that becomes the operational window for the mission.

4. **The Plan** — *strategic synthesis with AI.* Team uses AI as a thinking partner to produce a mission plan that integrates everything from the prior three gates.

After Gate 4, the scenario player ingests all artifacts plus per-gate quality signals and generates a personalized 5-act mission outcome ("The Run") that honors strong work and lets weak work cause specific narrative consequences.

## Key architectural decisions

- **Async gate progression with AI grading.** Each artifact is evaluated by Claude (via API). Teams always pass, but evaluation produces structured quality signals that flow into the scenario player. No hard fails — weak artifacts manifest as specific failure beats in the finale.
- **External AI for player work.** Teams use Microsoft Copilot in another window and paste artifacts into this app. The app does NOT embed Copilot or any user-facing AI interface.
- **Multi-cohort tenancy from day 1.** Multiple teams across multiple cohorts run concurrently. Each cohort runs against a mission spec.
- **Containerized self-hosted deployment.** Docker compose with Postgres + app + MinIO.
- **Polling, not real-time.** No WebSockets in v1. Frontend polls every 3–5 seconds for state updates.
- **Replayability via mission spec files.** "The mission" is data, not code. A YAML spec defines all briefings, gate definitions, rubrics, datasets, and the scenario player prompt.

## Mission spec format

Lives at `missions/<id>.yaml`. Shape:

```yaml
mission:
  id: monaco-syndicate
  title: "Operation Quicksilver"
  setting: { location, antagonist, macguffin, time_pressure }
  characters:
    handler:
      name: Cipher
      voice_guide: |
        Calm, terse, slightly weary. Short sentences. No exclamation
        points. Never apologizes. Refers to team as "agents" or "team."
  opening_briefing: |
    [Cipher's mission tape briefing]
  gates:
    - id: build_the_legend
      number: 1
      name: Build the Legend
      skill_focus: "Prompt chaining + meta-prompting"
      briefing: | [Cipher's gate-specific briefing]
      instructions: [list]
      artifact_schema: { ... }
      materials: [optional, e.g. Gate 3's CSV]
      rubric:
        - dimension: <name>
          weight: <relative, not enforced to sum to 1.0>
          description: <criterion>
      quality_signal_schema:
        <signal_name>: <type>  # float (0..1), bool, or string
      feedback_style: | [how Cipher should respond]
    # ... three more gates
  scenario_player:
    prompt_template: |
      [template using {{quality_signals_json}} and {{artifacts_markdown}}]
    outcome_thresholds:
      clean_success: ">= 0.75"
      partial_success: ">= 0.50"
      failure: "< 0.50"
    staging:
      - Act 1 — Insertion
      - Act 2 — First Contact
      - Act 3 — The Window
      - Act 4 — The Take
      - Act 5 — Extraction
```

The full Operation Quicksilver spec (rubrics, briefings, signals for all 4 gates) needs to be authored into `missions/monaco-syndicate.yaml` as part of Phase 0. The design for each gate is documented in `docs/design/`.

## Quality signals (the contract with the scenario player)

Each gate's `quality_signal_schema` declares structured data extracted by the evaluator. Examples:

- Gate 1: `cover_credibility: float`, `chain_quality: float`, `cover_name: string`, `pretext: string`
- Gate 2: `dossier_specificity: float`, `dossier_completeness: float`, `exploitable_intel_found: float`, `key_venue_detail: string`, `key_host_detail: string`, `key_security_weakness: string`
- Gate 3: `finding_correct: bool`, `reasoning_quality: float`, `methodology_score: float`
- Gate 4: `plan_integration: float`, `plan_robustness: float`, `plan_specificity: float`, `ai_partnership_quality: float`, `chosen_approach: string`, `biggest_risk_named: string`

Floats are 0..1. Rubric weights are *relative*, not enforced to sum to 1.0 — they inform how prominently each signal manifests in the finale narrative.

## The scenario player

Reads all artifacts plus per-gate quality signals at the end of Gate 4. Generates a 5-act narrative (markdown) that:

- Uses the team's actual cover name, employer, pretext, dossier intel, finding, and plan
- Reflects quality signals proportionally — high signals produce competent execution, low signals manifest as specific failure beats
- Lets the team's own stated risks (Gate 4's `biggest_risk_named`) become the things that go wrong (deliberate pedagogical loop)
- Ends in clean success, partial success with cost, or failure based on weighted aggregate of signals

Output streams act-by-act to the frontend (SSE or chunked HTTP). Each act has a header and prose body in serif (NOT italic — italic is reserved for Cipher's voice).

## Architecture

**Stack:**
- Frontend: Next.js (App Router), TypeScript, vanilla CSS or CSS Modules (avoid Tailwind — design uses specific tokens and motifs)
- Backend: Next.js API routes (single-app monorepo), Node 20+
- Database: Postgres 15+, JSONB for artifact content
- Object storage: MinIO (S3-compatible) for uploaded files
- LLM: Anthropic Claude API
- Deployment: Docker compose, single VPS

**Suggested layout:**
```
apps/web/              # Next.js app (UI + API routes)
packages/evaluator/    # evaluation service
packages/player/       # scenario player service
packages/mission/      # mission spec loader + validator
missions/              # YAML spec files
db/migrations/         # SQL migrations
docs/                  # design docs, mockups, this brief
docker-compose.yml
```

**Data model (Postgres):**
```
cohort     (id, name, mission_spec_id, started_at, facilitator_id)
team       (id, cohort_id, callsign, members_jsonb, current_gate, access_code)
gate       (id, team_id, gate_number, status, submitted_at, evaluated_at)
artifact   (id, gate_id, content_jsonb, file_refs_jsonb, submitted_at)
evaluation (id, gate_id, score, feedback_md, quality_signal_jsonb, model, created_at)
scenario   (id, team_id, generated_md, generated_at, model)
```

Status enum: `locked | active | submitted | evaluated`.

## Design language

**Aesthetic:** dark-mode operations console. Clinical, terse, surveillance-grade — NOT gamified spy-movie green-on-black.

**Palette (CSS variables, see mockups for full set):**
- `--bg-0: #050507` deepest ground
- `--bg-1: #0e0e10` frame surface
- `--bg-2: #16161a` cards
- `--border: #25252c`
- `--text-1: #ececef` primary
- `--text-2: #94949f` secondary
- `--text-3: #5a5a64` tertiary
- `--accent: #d92525` signature red — used for active states and accents only
- `--green: #58c97e`, `--amber: #e0a838` status semantics

**Typography:**
- **Oswald** (300–700) — display, headings, codenames, UI labels (UPPERCASE, wide letter-spacing)
- **JetBrains Mono** (300–700) — all body UI, data, monospace fields
- **Cormorant Garamond italic** — RESERVED for Cipher's voice. The only place serif italic appears.
- **Cormorant Garamond regular** — used in narrative prose during the scenario reveal (not italic — distinct from Cipher).

**Motifs:**
- Red corner brackets framing the main canvas (surveillance feed motif)
- Thin dashed dividers
- T-minus timer at top right (client-side countdown from session start)
- Classified-strip footer on every screen
- Status pills with pulsing dots
- Typographic status indicators only: ● ◐ ○ (no emoji anywhere)

**Diction:**
- "Sealed" not "locked", "Transmit" not "submit", "Phase" not "gate" (internally we say gate; user-facing we say phase)
- Cipher: calm, terse, slightly weary. Short sentences. No exclamation points. No apologies. Refers to team as "agents" or "team."

## Reference materials in this repo

**Mockup HTML files** — drop these into `docs/mockups/` before starting. They define the visual language. Replicate the design language; don't necessarily copy literal markup.

- `gate_hub_mockup.html` — main hub screen
- `gate1_workspace_mockup.html` — prompt chain workspace
- `gate3_workspace_mockup.html` — forensic intercept workspace
- `mission_tape_mockup.html` — opening briefing
- `cipher_feedback_mockup.html` — post-gate evaluation
- `scenario_reveal_mockup.html` — staged outcome narrative

Gate 2 (parallel dossier) and Gate 4 (synthesis briefcase) workspaces have NOT been mocked yet. Their spec exists; UX needs design before those screens are built. For now, build Gates 1 and 3 from the mockups, and use the same chrome (header, timer, footer) for Gates 2 and 4 placeholders.

## Build plan

Five phases, roughly 4–5 weeks total focused dev time.

**Phase 0 — Skeleton (1–2 days) ← CURRENT TARGET**
- Monorepo init, Docker compose (Postgres + app + MinIO)
- Mission spec loader (YAML parse + schema validation)
- DB migrations for the data model
- Basic team auth (callsign + access code)
- Mission spec for Operation Quicksilver loaded at boot

**Phase 1 — Evaluation Service (3–4 days)**
- Anthropic Claude API integration
- Per-gate evaluation prompt template (rubric + voice guide injected)
- Structured output: score, feedback_md, quality_signal_jsonb
- Persistence and test harness with synthetic artifacts at strong/mid/weak quality
- Prompt iteration until output is consistent across reruns

**Phase 2 — Single-Team Frontend MVP (5–7 days)**
- All player-facing screens: check-in → mission tape → hub → gate workspace → Cipher feedback → loop
- Polling for state (3–5s interval)
- File upload/download for Gate 3 dataset
- Stubbed Run screen

**Phase 3 — Scenario Player (3–4 days)**
- Aggregator + prompt template
- Streaming reveal (SSE)
- Act-by-act frontend staging with typing cursor on active act

**Phase 4 — Multi-Cohort & Facilitator (4–5 days)**
- Enforce cohort tenancy in API
- Facilitator panel (cohort overview, team matrix, artifact viewer, force-unlock)

**Phase 5 — Polish (3–5 days)**
- Animations (incoming transmission, decryption, self-destruct, act reveals)
- LLM failure handling
- Spec validation feedback
- Container hardening

## Working style

- **Read this brief and all mockup files before writing any code.** Confirm understanding back to me first.
- **Ask before adding dependencies.** I want a lean dep list. Justify each one.
- **Prefer plain CSS or CSS Modules over Tailwind.** The design uses specific named tokens and class semantics; Tailwind would fight the aesthetic.
- **Comment intent, not mechanics.** Especially around the mission spec contract and evaluator I/O — those are interfaces.
- **Stage commits at logical milestones.** Not one mega-commit per phase, not 50 micro-commits.
- **When you hit ambiguity, ask — don't guess.** Especially around the spec format and the evaluator output schema.
- **If you propose deviations from this brief, flag them explicitly.** Don't silently change architecture.
- **Don't over-build.** Each phase should be demoable. If a feature isn't in this phase's scope, defer it.

## Your first task

1. Confirm you've read this brief and looked at the mockup HTML files. Summarize the project back to me in 4–6 sentences so I can verify alignment.
2. Propose a directory structure for the monorepo. Show me the tree.
3. Propose a Phase 0 dependency list with one-line justifications for each.
4. Wait for my approval before scaffolding.
