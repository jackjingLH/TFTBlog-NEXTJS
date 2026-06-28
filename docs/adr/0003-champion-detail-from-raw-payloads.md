# Champion detail enriched from raw_payloads, without recommended items

Champion detail (ability text, combat stats, role) is parsed from the offline `source_assets.raw_payloads` champion payload during `import-tft-assets-db.mjs`, reusing the same enrichment pattern already used for trait and item detail — not fetched live from the official CDN. This keeps the import offline-stable and consistent with the existing source-db → import pipeline, at the cost of being pinned to whatever version the source db was last synced to.

Recommended items (官方 `recEquip`) are deliberately excluded: the field is empty for all 83 champions in the source payload and the official simulator surfaces no recommended-item data, so there is nothing factual to show. This is recorded because the feature was explicitly requested — a future reader will otherwise wonder why champion detail omits it.
