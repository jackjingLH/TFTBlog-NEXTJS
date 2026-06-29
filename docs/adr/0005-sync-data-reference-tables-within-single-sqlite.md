# Sync Data Reference Tables Within Single SQLite

The site keeps one production SQLite database for both guide content and data references, but synchronizes them with different ownership rules: guide tables are production-owned through the guide publishing flow, while data-reference tables are replaced from a local staging copy. We chose table-level synchronization over splitting into two databases because the data volume is small, the existing runtime already reads one SQLite file, and replacing only `sources`, `champions`, `traits`, `items`, `augments`, and `trait_champions` avoids overwriting production guide content.

