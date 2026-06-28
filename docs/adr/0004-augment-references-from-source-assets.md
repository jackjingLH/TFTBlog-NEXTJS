# Augment references flow through source assets

Augment references are imported through the same offline source database used by champion, trait, and item references. The source database owns a first-class `augments` table for normalized lookup fields and also stores the original official simulator payload in `raw_payloads` with `payload_type=augment`.

This keeps the data reference pipeline uniform:

Official simulator `urlBuffData` / `hex.js`
-> source `tft_assets.db`
-> TFTBlog import
-> runtime SQLite
-> `/api/data?type=augments`
-> `/data`

The alternative was to let TFTBlog fetch `hex.js` directly during import. That would have made augments the only data reference type with a live website-side fetch, weakening offline repeatability and making version mismatches harder to diagnose.

The first implementation targets the official simulator's normal S17 mode only. Other enabled simulator modes have their own buff data URLs, but mixing them into the same data page would require a separate mode-selection model.
