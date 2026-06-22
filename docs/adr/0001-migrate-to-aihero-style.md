# 1. Migrate to AI Hero Visual Style

Date: 2026-06-22

## Status

Accepted

## Context

The site launched with a dark, neon-purple color scheme (`#7C3AED` primary, `#0F0F23` background) inspired by gaming/esports aesthetics. This design was described as "too AI-styled" and did not align with the project's evolution toward a professional content showcase site.

The reference site [aihero.dev](https://www.aihero.dev/) demonstrates a clean, education-focused design language:
- White/light backgrounds with generous whitespace
- Modern typography with clear hierarchy
- Card-based content layout
- Professional, approachable aesthetic

The site is positioned as a game guide aggregation platform, but the content is primarily text articles, not interactive gaming interfaces. The dark gaming aesthetic created friction with the reading-focused use case.

## Decision

Migrate the entire site to AI Hero's visual style:

**Color Scheme:**
- Replace dark backgrounds (`#0F0F23`) with white/light gray
- Replace neon purple (`#7C3AED`) with more subdued accent colors
- Maintain readability for Chinese text (primary language)

**Layout:**
- Adopt card-based content grid (similar to AI Hero's article cards)
- Increase whitespace and breathing room
- Simplify hero sections with clear headlines

**Scope:**
- Full-site migration (home, guide list, guide detail, data page)
- One-time comprehensive redesign
- Use mock data for incomplete sections during development

**Typography:**
- Keep Geist Sans/Mono (already modern, works well with Chinese)
- Adjust sizing and spacing to match AI Hero's hierarchy

**Navigation:**
- Keep existing structure: Home, 攻略 (Guides), 资料 (Data), 关于 (About)
- Simplify navbar to match AI Hero's minimal approach

**Responsive Strategy:**
- Mobile-first development (primary use case)
- Responsive scaling for desktop
- AI Hero's desktop spacing adapted for mobile constraints

## Consequences

### Positive

- **Clearer content focus** — light backgrounds better support reading-heavy use case
- **Professional appearance** — aligns with "article showcase" positioning
- **Better readability** — dark mode can strain eyes for long reading sessions
- **Modern aesthetic** — AI Hero style is contemporary and proven

### Negative

- **Complete CSS rewrite** — all Tailwind theme and component styles change
- **Lost gaming identity** — previous dark/neon aesthetic had personality
- **Cover image visibility** — white backgrounds require higher-quality cover images (gaming screenshots may look poor on white)
- **No incremental path** — one-shot migration means no A/B testing

### Neutral

- **SQLite schema unchanged** — frontend-only change, no data migration
- **Image paths unchanged** — `/uploads/guides/` structure stays the same
- **Font assets unchanged** — Geist Sans/Mono retained

## Implementation Notes

**Phases:**
1. Update `tailwind.config.ts` color palette
2. Rewrite `Navbar` and `Footer` components
3. Rewrite home page shell
4. Rewrite guide list page
5. Rewrite guide detail page
6. Update `data` page for consistency

**Mock Data:**
- Use placeholder cover images where needed
- Generate sample guide excerpts
- Create temporary "featured" guide section (future: real featured logic)

**Cover Image Strategy:**
- Reserve space for cover images in card layout
- Accept current `dataTFT (N).png` screenshots temporarily
- Plan for future cover image quality improvement (separate discussion)

**Testing:**
- Verify mobile rendering (390px, 414px viewports)
- Test Chinese text rendering and line breaks
- Verify existing 5 SQLite guides render correctly

## Alternatives Considered

**Dark mode toggle:** Rejected — adds complexity, splits maintenance burden. Pick one style and commit.

**Gradual migration:** Rejected — mixing two design languages creates inconsistent UX. User chose one-shot migration.

**Hybrid style (dark with AI Hero layout):** Rejected — would lose the "professional content showcase" benefit that motivated the change.

## References

- Reference site: https://www.aihero.dev/
- Current color palette: `tailwind.config.ts` (pre-migration)
- Design system: None formal — visual matching to AI Hero reference
