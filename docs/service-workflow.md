# Service workflow between kernel and app

`ptspace-app` uses one lifecycle for Memory, Knowledge, Worker, Renderer and Review. Capabilities decide which concrete operations are allowed; the service type alone never authorizes execution.

## Boundary

The app owns teacher-facing state and approval. The Pedagogical Thinking Space kernel owns pedagogical roles, orchestration rules and service contracts.

The app uses camelCase internally. At the kernel boundary it maps explicitly to the kernel's snake_case contract:

| App | Kernel |
| --- | --- |
| `capability` | `task` |
| `expectedOutput` | `expected_output` |
| `returnTo` | `return_to` |
| `requiresApproval` | `requires_approval` |

This translation must remain covered by contract tests.

## Shared lifecycle

1. The Critical Friend identifies a meaningful next step.
2. The app checks that an approved Capability exists for the requested service and mode.
3. The teacher sees a pedagogically worded proposal.
4. Explicit approval changes the request from `proposed` to `approved`.
5. The backend executes only the approved Capability inside the planning-room workspace.
6. The result receives status `returned`; it is not teacher-facing yet.
7. Review checks the result against the current Learning Design and Capability contract.
8. A reviewed result is shown as a draft. The teacher decides about revision or classroom release.

## First reference capability

`create_student_instruction` is the first complete reference path:

```text
worker/draft → teacher approval → execution → returned → review → draft material
```

It deliberately produces a draft rather than a classroom-ready artefact.

## Extension to other services

- **Knowledge:** requires source metadata, verification status, uncertainty and a Knowledge Proposal gate.
- **Memory:** requires an invitation before retrieval and explicit confirmation before storage.
- **Renderer:** requires a stable Learning Design and approved rendering specification.
- **Review:** always returns findings to the Critical Friend and never changes pedagogical direction.
- **Capabilities:** define allowed inputs, outputs, constraints, review rules and fallbacks. Unknown capabilities fail closed.

These services should extend the same lifecycle rather than adding parallel orchestration paths.
