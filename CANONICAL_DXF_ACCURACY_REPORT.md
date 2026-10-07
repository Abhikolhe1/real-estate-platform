# Canonical DXF accuracy

Date: 2026-10-07. **Synthetic exact geometry: PASS. Genuine architectural acceptance: BLOCKED.**

## Fixture provenance

The user had no licensed floorplan and authorized creating drawings. `tools/canonical/fixtures/partitioned-concave.dxf` is original synthetic repository data, with no third-party source. Frozen SHA-256: `dafa5c6b5d81c72acc496705ef297ccc0965db30ab1afd4c1e799b455fa65d6e`. It contains one dimensioned centreline floor, two rooms, a concave boundary, a partition, two explicit door spans, a window and native labels. A separate authored courtyard fixture verifies holes.

`annotations.json` was defined from the independent dimensioned specification, not reconstruction output: Living 16 m?, Kitchen 22 m?, nine noded walls, three hosted openings and an 8 m scale control. These are authored repository tests, not proof of genuine architectural accuracy or licensing.

A public [jscad DXF sample directory](https://github.com/jscad/sample-files/tree/master/dxf/dxf-parser) was inspected as a candidate. Its floorplan has double-face walls and opening symbols, a millimetre header conflicting with imperial dimension text, no verified original architectural provenance/license and no independent annotations. Download SHA-256: `6d761ecb1ab59664425eb1dcc6837a12611536c8e03e3f7855951a76786d159c`. It remains ignored local research data, not redistributed or scored. A repository-level sample license does not establish permission for the original drawing. No genuine fixture qualifies.

## Automatic results

Actual raw measurements: [accuracy.json](evidence/canonical/accuracy.json). Matching uses known room names and the independent specification, before review commands.

| Metric | Result |
| --- | --- |
| Rooms | 2 predicted / 2 expected; 0 false positives, 0 false negatives |
| Room areas | 16 m? and 22 m?; relative error 0 |
| Room polygon IoU | 1.0 for both |
| Room boundary Hausdorff distance | 0 m for both |
| Noded walls | 9 predicted / 9 expected; precision/recall 1.0; 0 false positives/negatives |
| Maximum wall boundary error | 0 m |
| Openings | 3 predicted / 3 expected; 0 false positives/negatives |
| Opening span/width errors | 0 m for all three |
| Opening hosts/room adjacency | Correct for all three |
| Valid interior spawns | 2 / 2 |
| Rendered concave floor triangle area | 38 m? |
| Rendered courtyard triangle area | 84 m?, no support in the hole |

Parser `ezdxf-1.4.4/aether-1`; algorithm `single-floor-1.0.0`. Exactness applies to these simple authored fixtures. Truth concerns centerlines, not surveyed finish-face/net usable area. Wall thickness, ceiling height, opening height and sill defaults are not measured accuracy. Known `$INSUNITS` still requires explicit calibration review.

## Reviewed result and effort

The authored acceptance output applies `AcceptDefaults` and `ConfirmCalibration`, with reasons. No geometric corrections are necessary, so geometric scores stay unchanged. These acknowledge synthetic assumptions; they do not establish real architectural dimensions.

The browser workflow additionally saves a rename, previews/undoes a vertex drag, reviews dimensions/calibration, saves an immutable revision, validates and approves. Separate correction/API tests exercise boundary movement, split/merge, opening edits, restart persistence and incompatible rebase conflicts. Reviewed output is never counted as automatic accuracy.

Effort is recorded as commands and interactions. **Actual human review time and independent architectural reviewer agreement are UNVERIFIED.** Browser automation is not a timed human study. No genuine automatic or reviewed score is available.

## Timing and limits

The 25-run timing distribution and machine identity are in `accuracy.json`. Its final run overlapped production builds; throughput is not a capacity benchmark. Browser frame/load/resource samples are in `browser-tests.json`. Software SwiftShader, startup/shader work and background load make those unsuitable as hardware FPS acceptance. Resource counts were checked across repeated reloads, not inferred from screenshots.

Next acceptance work: obtain one legally usable supported architectural DXF, verify units against dimensions, independently annotate it, and measure automatic/reviewed results separately. Genuine acceptance remains **BLOCKED**; Phase 2's full architectural acceptance must not be called complete.
