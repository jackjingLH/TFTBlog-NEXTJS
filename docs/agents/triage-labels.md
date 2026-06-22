# Triage Labels

This project uses the default label vocabulary for issue triage. These labels are stored in the `status` field of issue frontmatter for local markdown issues.

## Label Mapping

| Role | Label String | Description |
|------|-------------|-------------|
| Needs Triage | `needs-triage` | Maintainer needs to evaluate the issue |
| Needs Info | `needs-info` | Waiting on reporter to provide more information |
| Ready for Agent | `ready-for-agent` | Fully specified, can be picked up by an autonomous agent with no human context |
| Ready for Human | `ready-for-human` | Needs human implementation or decision |
| Won't Fix | `wontfix` | Will not be actioned |

## Usage in Local Markdown Issues

For local markdown issues (`.scratch/*/issue.md`), these labels appear as the `status` value in frontmatter:

```yaml
---
title: Add dark mode support
status: ready-for-agent
labels:
  - enhancement
  - ui
---
```

The `status` field controls which state the issue is in. Additional categorization can be added via the `labels` array.

## State Transitions

```
[Created]
    ↓
needs-triage ──→ wontfix (closed)
    ↓
needs-info ←─────┐
    ↓            │
ready-for-agent  │
    ↓            │
ready-for-human  │
    ↓            │
closed ←─────────┘
```

## Customization

If you need to use different label strings in the future (e.g., `triage-needed` instead of `needs-triage`), update this mapping file and the triage skill will use the new strings.
