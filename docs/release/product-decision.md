# Product decision — evidence reviewed October18

**Proceed with ReceiptLab as a bounded verification and diagnosis workbench. Public release remains no-go until owner, hosting and judge-access gates are met.** Real NVIDIA diagnosis works on observed cases, but neither autonomous completion superiority nor general diagnostic safety is established.

## Measured basis

| Evidence | Actual outcome | Interpretation |
|---|---|---|
| Competent DOM comparison | All positive v2 form tasks completable by DOM policy | No demonstrated autonomous completion-rate advantage |
| G: alternate Nano |1POST; exact-model HTTP200/stop; failed JSON/action preflight; $0.00004842 known estimate | No accepted diagnosis; no retry |
| H: alternate Super |2POST; preflight passed, first diagnosis HTTP500; $0.00018120 known preflight estimate, diagnosis usage unknown | Full $0.05 account envelope remains conservatively charged; cost is incomplete |
| I: Lightning v2 |16/16valid diagnoses,17POST including preflight, $0.01149318 estimate; raw diagnosis12/16, action12/16, pair10/16, joint diagnosis/action/required-citation agreement10/16 | Two high-confidence diagnosis errors, zero scored consequential action disagreements; no truncation on this run |
| Independent telemetry comparator on I | Diagnosis12/16, action10/16, pair8/16, joint diagnosis/action/required-citation agreement3/16 | Practical structured-telemetry comparator; model does not improve diagnosis count; mechanical citations are a separate measure |
| I with original gate |12accepted,4abstained; displayed pair7/16; two high-confidence diagnosis errors remain | Original gate did not solve semantic correctness |
| Post-hoc review gate on SAME I outputs |9accepted,4abstained,3review-required; displayed pair6/16; zero of the two observed high-confidence diagnosis errors remain accepted | Safety/coverage tradeoff on consumed outputs; zero new inference and no fresh validation |
| J: remaining v1 traces |9/9valid diagnoses,10POST, $0.00710286 estimate; raw diagnosis5/9, action7/9, pair5/9; three high-confidence diagnosis errors | Consumed/public regression evidence; do not stitch into a uniform rerun with earlier campaignD |
| Earlier real UI campaignF | Actual transient diagnosis, explicitly approved synthetic retry and verified receipt; incorrect high-confidence negative-case retry blocked | Demonstrates integration and the need for independent action/outcome checks |

Artifacts: [I](../../results/rc-I-lightning-v2-outcome.json), [J](../../results/rc-J-v1-remaining-outcome.json), [review amendment](../../results/rc-semantic-review-amendment.json), [RC chronology](rc-sprint.md). G/H failures and original gate results remain retained. K private HTTPS capture stopped after a successful preflight and before diagnoses because the capture helper waited for the old form response prefix. Its failure and $0.00014946 estimate are preserved; no successful K product journey is claimed.

The v2 dataset author/reviewer lacked implementation access; the comparator author lacked dataset/model/prompt access. The coordinator heard two label details after policy implementation but before the sampling-only freeze; this leakage is disclosed. Labels-visible AI review is not external human expert validation. Cases become consumed regression material after inference. Citation coverage checks IDs, not explanation truth. Sampling compatibility improved on the observed run; different suites and stochastic outputs prevent a controlled causal claim about temperature.

## Architecture and remaining gates

Retain separate boundaries: model suggestion, conservative semantic review, explicit approval, private current-state action permission, and independent task/run/unique-commit/signed-receipt verification. The post-hoc review rule requires independent telemetry agreement for high-confidence advice unless actual private state independently permits the proposed recovery. Common model/comparator mistakes remain possible; the gate is not semantic certification.

Canonical single-origin HTTPS, Secure sessions, session-owned forms, atomic retained SQLite/key/session/approval state and an exclusive crash-safe lease passed a private actual-Caddy rehearsal and backend restart with zero model calls. Budget history must be retained and imported before public inference. A deferred-provider shutdown regression verifies that complete diagnosis transactions finish before the store closes. These checks establish local behavior, not public DNS, hosting/volume entitlement, public certificates, installed systemd behavior or availability.

Before submission obtain external expert/user review, owner approval of contribution ownership and the proposed MIT license, eligibility/track/media signoff, separately authorized no-charge public test-build hosting and a credible judge operating/budget plan. Preserve the $50 judge reserve. No public deployment, uploaded video or Devpost submission has occurred; inference authority does not grant those permissions.

Submission deadline: October30 2026 at22:30India time (17:00UTC). Judge access through December16 at01:30India time (December15 20:00UTC). A video does not replace a functioning test build. If those gates cannot be met, retain the verifier/QA work without presenting it as a release-ready autonomous agent.
