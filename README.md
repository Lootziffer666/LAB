# LAB — Legacy Adventure Bridge

LAB is the canonical coordination layer for reconstructing an authorized legacy adventure as an inspectable, evidence-driven pipeline.

```text
authorized source
→ DECOMPILE evidence
→ TRIVIUM semantic reconstruction
→ WIZARD asset resolution
→ SWIFT actor realization
→ SHADED scene runtime
```

LAB owns the shared request, bundle, plan and handoff contracts. It does **not** absorb the specialist tools. Each specialist repository keeps a thin adapter and remains responsible for its own domain.

## Responsibilities

| Repository | Owns |
|---|---|
| LAB | request normalization, bundle construction, shared invariants, handoff contracts, BELLOWS client |
| DECOMPILE | source probes, deterministic extraction, evidence envelopes, uncertainty |
| TRIVIUM | semantic reconstruction, World IR, loss/gain ledger, realization contracts |
| WIZARD | catalog matching, missing-asset lists, production brief inputs |
| SWIFT | video/model/sheet realization and local preprocessing |
| SHADED | scene realization, material classification and runtime state |
| ANVIL | future execution, fan-out, retries, evidence collection and completion |

## Boundaries

- **BELLOWS** is the only gateway for model/provider calls, including OpenAI-compatible vision content parts.
- Local deterministic runtimes such as `rembg` and ONNX remain local and are not routed through BELLOWS.
- Original game data, ROMs, save files, extracted proprietary assets and inline image data must never be committed here.
- Inline vision bytes may be created only during a request and must never be persisted in LAB bundles.
- SWIFT actors remain presentation-only in SHADED; they never mutate material truth.

## Use

```bash
npm run check
node bin/lab.js examples/lab-request.example.json --out lab-out/example --json
```

The command writes:

```text
lab-bundle.json
plan.json
handoffs/decompile.request.json
handoffs/trivium.request.json
handoffs/wizard.request.json
handoffs/swift.request.json
handoffs/shaded.request.json
```

## BELLOWS environment

```text
BELLOWS_BASE_URL
BELLOWS_API_KEY
BELLOWS_MODEL
```

Text messages remain strings. Vision messages use OpenAI-compatible `text` and `image_url` content parts. Local PNG, JPEG, WebP or GIF files may be converted to data URLs at execution time.

## Current scope

LAB v0.4 provides the planner, bundle writer, standalone plan validation, text/vision BELLOWS client and cross-repository handoff contracts. It is not yet the ANVIL executor that runs every handoff end to end.
