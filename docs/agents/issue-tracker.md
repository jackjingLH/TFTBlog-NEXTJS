# Issue Tracker: Local Markdown

Issues for this repository are tracked as markdown files under `.scratch/<feature>/` in the repository itself.

## File Structure

```
.scratch/
├── feature-name-1/
│   └── issue.md
├── feature-name-2/
│   └── issue.md
└── bug-fix-3/
    └── issue.md
```

Each issue lives in its own subdirectory under `.scratch/`. The directory name is a slugified version of the issue title or feature name.

## Issue File Format

Each `issue.md` file contains frontmatter with metadata and a markdown body with the description:

```markdown
---
title: Add user authentication
status: needs-triage
labels:
  - enhancement
created: 2024-06-22
updated: 2024-06-22
---

## Description

We need to add user authentication to allow users to save their favorite guides.

## Acceptance Criteria

- [ ] Users can sign up with email/password
- [ ] Users can log in
- [ ] Session persists across page refreshes
```

## Metadata Fields

- `title` (required): Issue title
- `status` (required): One of: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`, `closed`
- `labels` (optional): Array of label strings (e.g., `bug`, `enhancement`, `documentation`)
- `created` (required): ISO date string (YYYY-MM-DD)
- `updated` (required): ISO date string (YYYY-MM-DD)
- `assignee` (optional): Username or identifier
- `reporter` (optional): Who reported the issue

## Workflow

### Creating an Issue

1. Create a new directory under `.scratch/` with a descriptive slug
2. Create `issue.md` inside with frontmatter and description
3. Set initial `status: needs-triage`

### Moving Through States

The triage skill and other engineering skills will update the `status` field in frontmatter as the issue progresses:

- `needs-triage` → maintainer evaluates and decides next action
- `needs-info` → waiting on reporter to provide more details
- `ready-for-agent` → fully specified, can be picked up by an autonomous agent
- `ready-for-human` → needs human implementation
- `wontfix` → will not be actioned
- `closed` → completed or resolved

### Updating an Issue

Edit the `issue.md` file directly. Update the `updated` field to the current date.

### Closing an Issue

Set `status: closed` in the frontmatter. Optionally add a resolution comment in the body.

## Benefits of Local Markdown

- No external service dependency
- Full version control via git
- Works offline
- Easy to search and edit with standard tools
- Issue history tracked through git commits
