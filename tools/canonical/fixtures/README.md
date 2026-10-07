# Original synthetic fixtures

These DXFs and annotations were authored for this repository at the user's request. They contain no third-party architectural source and are available as repository test data. They are **synthetic**, not genuine drawings or surveyed building records.

`partitioned-concave.dxf` has frozen bytes and SHA-256 `dafa5c6b5d81c72acc496705ef297ccc0965db30ab1afd4c1e799b455fa65d6e`. Its specification independently defines an 8 m control, 16 m? Living, 22 m? concave Kitchen, nine noded wall segments, two doors and a window in `annotations.json`. Coordinates describe centerlines. Vertical dimensions/thickness are explicit reviewed test defaults.

`courtyard.dxf` independently specifies a 10 x 10 m outer ring and 4 x 4 m void: 84 m? of supported floor. `automatic.json`, `approved.json` and `courtyard-approved.json` are generated outputs and are never used as independent accuracy truth. The approved examples use synthetic IDs and represent reviewed test assumptions; they are not persisted production revisions.

Run `npm run test:canonical` to regenerate outputs from frozen DXF bytes and compare against independent truth. Removing a DXF before regenerating changes source timestamps/UUIDs/hash; do not do that during regression comparisons. A genuine architectural fixture still requires verified permission, scale and independent annotations.
