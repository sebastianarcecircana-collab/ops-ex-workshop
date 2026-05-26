# Gate 1 Redesign — Discussion

## Diagnosis: what's actually redundant

The current 3-step chain (`Gate1Page.tsx:14–34`, mission YAML `monaco-syndicate.yaml:41–47`) makes participants do **the same cognitive move three times**:

> *write a meta-prompt → paste AI-generated prompt into Copilot → paste output back.*

The thing that changes between steps is the **target** of the prompt (identity → backstory → vulnerability), not the **technique**. So a participant finishes Gate 1 having practiced meta-prompting deeply but having never tried chain-of-thought or self-critique at all.

Three specific friction points in the UI/copy:

- **Three identical "Meta-Prompt" textareas** with identical visual treatment teaches participants that meta-prompting IS the lesson. They never see the move named differently.
- **Step labels — "Seed Context / Deepen Profile / Stress Test"** describe what the *chain is producing*, not what *technique is being practiced*. Participants finish without vocabulary for what they did.
- **Step 3's "Stress Test" is the closest thing to self-critique** the gate has — but it's framed as "write a meta-prompt that asks the AI to write a probe prompt." The self-critique technique is buried under two layers of meta-prompting. The user is told to "challenge the cover" but their *mechanism* for doing so is the same meta-prompt-and-run move from steps 1 and 2.

Net: the gate teaches one technique three times, not three techniques once each.

## Option A — Composed Techniques (recommended)

Each step practices a different technique, and each step builds on the prior step's output. The cover gets stronger *because* the techniques compose.

| Step | Technique | What the participant does | Output |
|---|---|---|---|
| 01 | **Meta-prompt** | Writes a meta-prompt asking the AI to produce a cover-identity prompt. Runs it. | Cover-identity draft |
| 02 | **Chain-of-thought** | Takes step 01's output. Writes (themselves, no meta layer) a CoT prompt that forces the AI to reason step-by-step through operational details before producing a final dossier section. | Deepened cover with backstory, pretext, daily-life specifics |
| 03 | **Self-critique** | Takes step 02's output. Writes a prompt where the AI plays an adversary (suspicious concierge with 20 years experience), identifies the three weakest claims, then repairs them. | Hardened final cover |

**Why this lands the pedagogy:**
- All three techniques get practiced exactly once.
- The composition mirrors how a thoughtful practitioner actually uses AI: bootstrap → deepen → harden.
- The narrative reads cleanly: "Let the AI write your prompt → make it think out loud → use it against itself." That's a real arc.
- The "chain" in "prompt chaining" stops being just a workflow chain (output-of-N feeds input-of-N+1) and becomes a *technique* chain.


## UI / copy changes implied

**Step labels** (replacing "Seed Context / Deepen Profile / Stress Test"):

- `Step 01 — META-PROMPT · Bootstrap the cover`
- `Step 02 — CHAIN-OF-THOUGHT · Make the AI reason out loud`
- `Step 03 — SELF-CRITIQUE · Attack and repair`

These name the technique first, the task second. Participants leave the gate with vocabulary.

**Per-step field structure** (the big visible change):

- Step 01: three textareas — `Meta-Prompt` / `Generated Prompt` / `AI Output` (unchanged shape).
- Step 02: **two** textareas — `Chain-of-Thought Prompt` / `AI Output`. No meta layer. The participant writes the prompt themselves; the lesson is that explicit reasoning instructions improve output.
- Step 03: **two** textareas — `Critique Prompt` / `AI Output`. Plus a small tooltip near the field: *"Strong critique prompts assign the AI a specific adversarial role with specific expertise. Generic 'find problems' produces generic problems."*

Visually: do not force a uniform triplet. The page already collapses steps to "Sealed / Active / Complete" — extend that so the body of each step renders whatever fields its technique needs.

**Briefing copy** (`monaco-syndicate.yaml`, current line 33–39):

> Current: *"Use meta-prompting to write the prompts. Chain the outputs."*
>
> Proposed: *"Three techniques. Bootstrap with meta-prompting. Deepen by forcing the AI to reason. Harden by turning it against your own work. By the end I want a cover that survives a concierge."*

**Instruction list** (currently six lines, three of them "Write a meta-prompt that…"):

Collapse to three lines, one per technique. Each line names the technique and gives the operational instruction. Drop "Run that generated prompt through Copilot" as a separate instruction — that's mechanic, not pedagogy.

**Rubric changes:**

- `chain_quality` (current weight 1.5) splits into:
  - `technique_distinction` (weight 1.0) — did each step use a meaningfully different technique, or did the participant smuggle meta-prompting into all three?
  - `composition_quality` (weight 1.0) — did each step take the prior step's output as real input, or did the chain run in parallel disguised as sequential?
- Add `critique_depth` (weight 0.75) — does the step 03 critique find *named, specific* weaknesses and *specific* fixes, or is it generic?

**Validation (`canSubmit`):**

Currently a single boolean. Should become a per-step checklist surfaced as the readiness-pill row from Recommendation #2 of the earlier review:

`◐ Step 01 (meta-prompt + generated + output)  ·  ○ Step 02 (CoT prompt + output)  ·  ○ Step 03 (critique + output)  ·  ○ Cover dossier`

**Cover dossier section:**

Today it's a separate block at the bottom requiring re-typing. After the redesign, step 03's output *is* the final hardened cover. Add a `Pull fields from step 03 output →` button that uses a small Claude call to extract `cover_name`, `employer`, `pretext`, etc., into the dossier fields as a starting point. Editable. Saves 5–10 minutes of re-keying and demonstrates a fourth small technique (extraction) without making it the focus.

**"Lock Step & Continue":**

Rename to `Continue to Step 02 →` (matching review recommendation #5 — the lock metaphor reads as destructive when nothing is actually locked).

---
