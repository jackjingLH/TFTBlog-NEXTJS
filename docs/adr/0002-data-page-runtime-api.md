# Serve Data References Through Runtime API

The `/data` page will fetch champion, trait, and item references through a runtime API instead of reading SQLite directly in the page. This keeps the data page compatible with the production static-shell deployment, where HTML is prebuilt and dynamic SQLite reads must happen in the lightweight Node runtime server.

**Considered Options**

- Direct SQLite reads in the Next page: simpler locally, but does not match the static deployment model.
- Runtime API reads from SQLite: more code, but consistent with the existing guide API and production architecture.
