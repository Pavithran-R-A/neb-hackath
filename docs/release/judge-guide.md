# Judge walkthrough — ReceiptLab

No account or personal data is needed. Use the fictional task values shown in the workbench. Allow about three minutes once the service has started. No public deployment is implied by these instructions.

1. **0:00–0:45 — Create evidence of a failure.** Choose **Start positive case** (`grant-transient`), then **Open fictional form**. Enter the supplied name, email and telephone, choose Next, enter `Community garden`, choose Next, consent to the fictional application and submit once. A temporary submission error is intentional. Return to the workbench tab.
2. **0:45–1:30 — Separate diagnosis from proof.** Choose **Check server state**: there is no verified receipt yet. If the page says NVIDIA is enabled, choose **Ask NVIDIA Nemotron** once and wait. It sends a real, bounded server-side request; there is no automatic retry. Read the cited trace sources, semantic safety check and actual usage. A suggestion alone never establishes completion. If NVIDIA is inactive, use **Diagnose with local rules**; describe this honestly as an offline receipt demonstration, not live NVIDIA inference.
3. **1:30–2:00 — Recover only with approval.** For an accepted, executable retry, tick **I approve this synthetic recovery action**, choose **Apply approved recovery**, then **Check server state**. The private verifier checks the task/run, unique server commit and signed receipt. **Export evidence JSON** preserves the verdict, provenance and usage. The export is a review record, not a publicly verifiable signature certificate.
4. **2:00–3:00 — Challenge a success claim.** Choose **Start negative case** (`workshop-false-success`). Complete the fictional form with the displayed values and `Morning session`. The interface displays success. Return, tick **The agent or interface claims completion**, and choose **Check server state**: the claim is rejected because no receipt was committed. Ask for a diagnosis if authorized. Unsupported retry advice must be rejected and recovery unavailable. A rejected high-confidence raw model recommendation is a **model error and guard success**, not a correct model diagnosis. Raw output is retained only inside warned review details.

Source tags distinguish browser observations from private server state. Expand **Inspect all retained trace events** to compare a model citation with the original event. Actual provider tokens, latency and estimated token cost are shown only for model requests; simulated tests say “Simulated” and local rules state that no inference cost occurred.

## When something fails

- A cold service or dropped connection gives a visible error. Use **Retry connection** during initial connection failure; otherwise retry the intended action deliberately after the service recovers. No model request occurs on page load.
- Model failure never implies a receipt or recovery. Use local rules to inspect the synthetic workflow, or stop and preserve the failure for review. Do not describe local rules as NVIDIA output.
- Expired sessions offer **Start a fresh session**. In-memory sessions expire after 30 minutes and restart clears their state; durable-mode details, when configured, are operator-specific. Export evidence before expiry. Never imply that an expired run was recovered.
- The workbench supports keyboard navigation, a skip link, visible focus, live loading/error announcements, and 320-pixel viewports. The fictional form opens in a new tab; return to the workbench for diagnosis and verification.

## Evidence honesty

The historical live campaign F contains a real positive NVIDIA recovery and an incorrect high-confidence negative recommendation blocked by the action guard. Preserve both. A fresh walkthrough is new evidence only when it actually ran, and an inactive model is not a live demonstration. Synthetic forms do not establish performance on arbitrary websites, completion-rate superiority, external expert validation, or security certification.
