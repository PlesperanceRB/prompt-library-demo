# Prompt Library Demo (Static Web App)

A no-build-step prompt library demo using only HTML, CSS, and vanilla JavaScript.

## Run

Open `index.html` directly in your browser.

## Features

- Left sidebar navigation between:
  - **Chat**
  - **Prompt Library**
- Prompt library persisted in `localStorage`
- Seeded with 3 example prompts on first load
- Prompt CRUD in a modal:
  - Fields: handle, title, instructions, tags
  - Handle normalization (`letters`, `numbers`, `_`, lowercased)
  - Handle uniqueness validation
- Prompt table with handle/title/updatedAt/tags + edit/delete actions
- Delete confirmation prompt
- Chat composer with `@` autocomplete:
  - Filter by handle/title
  - Insert selected `@handle` at cursor
- Send flow:
  - Appends user message to message list
  - Updates preview panel with:
    - Applied prompts from detected `@handles`
    - Concatenated injected instructions
    - Raw user message
- Export prompts as JSON download
- Import prompts from JSON (merge by handle, imported prompts overwrite existing)
- Hover on applied `@handle` chips in Preview shows full instructions popover

## Data model

Prompts are stored as an array under localStorage key:

- `promptLibrary.prompts.v1`

Each prompt object shape:

```json
{
  "handle": "writing_assistant",
  "title": "Writing Assistant",
  "instructions": "Improve grammar and style...",
  "tags": ["writing", "editing"],
  "updatedAt": "2026-01-01T12:00:00.000Z"
}
```
