# MANDATORY INSTRUCTIONS FOR AI CODING AGENTS

## STRICT UI IMPLEMENTATION POLICY — NO DESIGN SYSTEM BYPASSING

**Dying (`@mp/dying`) is the single source of truth for all UI architecture in this application. Agents and developers must NEVER independently implement UI styling or components when Dying already provides the required functionality.**

---

### 1. Prohibited Practices in Application Code

Unless explicitly justified and documented in a PR, **DO NOT**:

- Use raw arbitrary Tailwind utility class strings (e.g. `bg-[#1e1e22]`, `text-[#86868b]`, `border-white/[0.08]`). Always use semantic tokens (`bg-surface`, `bg-canvas`, `text-text-primary`, `text-text-secondary`, `border-border-subtle`).
- Write arbitrary CSS classes or inline styles (`style={{ ... }}`).
- Use raw HTML elements (`<button>`, `<input>`, `<textarea>`, `<select>`, `<dialog>`) when an equivalent Dying component exists.
- Define local color, typography, radius, shadow, or spacing values.
- Re-implement existing responsive behavior using one-off ad hoc media queries.
- Introduce competing UI component libraries or styling frameworks.
- Use `!important` to override design system styles.

---

### 2. Component Usage Enforcement Matrix

| Instead of | Must Use from `@mp/dying` |
| --- | --- |
| Raw `<button>` | `Button` or `IconButton` |
| Raw `<input>` | `Input` (or `FormField` + `Input`) |
| Raw `<textarea>` | `Textarea` |
| Raw `<select>` | `Select` |
| Raw `<input type="checkbox">` | `Checkbox` |
| Raw toggle div | `Switch` |
| Custom card `<div>` | `Card` or `GlassCard` or `GlassPanel` |
| Custom badge `<span>` | `Badge` |
| Custom modal/dialog | `Dialog` (`DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`) |
| Custom tooltip | `Tooltip` |
| Custom empty message | `EmptyState` |
| Custom spinner / loading | `Spinner` or `Skeleton` |
| Custom divider / `<hr>` | `Separator` |
| Custom alert banner | `Alert` |
| Custom layout wrappers | `Box`, `Stack`, `Flex`, `Grid`, `Container` |

---

### 3. Architecture & Location Reference

- **Package Location:** `packages/dying`
- **Import Specifier:** `@mp/dying`
- **Main Export:** `packages/dying/src/index.ts`
- **Tokens Specification:** `packages/dying/src/tokens/tokens.json`
- **Token Objects:** `packages/dying/src/tokens/index.ts`
- **CSS Theme Rules:** `packages/dying/theme.css`
- **Interactive Component Playground:** `frontend/app/src/app/dying/page.tsx` (Route: `/dying`)
- **Documentation:** `docs/dying/`

---

### 4. Mandatory Pre-Completion Verification Checklist

Before completing ANY frontend task, the agent must verify:

1. All newly introduced or modified UI elements consume `@mp/dying`.
2. No arbitrary hex classes (`bg-[#...]`, `text-[#...]`) were introduced.
3. Interactive elements have `:focus-visible` styling and accessible labels.
4. `pnpm typecheck` passes with zero errors across the monorepo.
5. `pnpm test` passes with zero failures.
6. `pnpm build` succeeds for production.
7. Documentation in `docs/dying/` is updated if any public component APIs changed.
8. `pnpm check:lines` passes with zero files exceeding 300 lines.

---

## 300-Line Limit Rule (MANDATORY FOR ALL FILES)

- **Every source file must be <= 300 lines**: All `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, and `.css` files across the codebase must never exceed 300 total lines (including blanks and comments).
- **Multi-layer Automated Enforcement**:
  1. Git pre-commit hook (`scripts/pre-commit.sh` via `.git/hooks/pre-commit`) blocks any staged file exceeding 300 lines.
  2. ESLint rule (`max-lines: ["error", { max: 300, skipBlankLines: false, skipComments: false }]`) enforces this in `frontend/app`.
  3. Pre-merge check script (`python3 scripts/check_file_length.py --max-lines 300` / `pnpm check:lines`) validates all files across the repository.
- **Decomposition Guidelines**: When a file approaches 250-300 lines, decompose it into modular sub-components, sub-routers, services, or helper modules.
