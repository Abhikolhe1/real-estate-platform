# Historical standalone experiments

Archived from the repository root to distinguish older manual diagnostics from maintained application code:

- `verify_render.js` and `verify_render.ts`: recordings of the superseded Builder generation wizard.
- `verify_web_render.js`: an older manual public walkthrough recording.
- `generate_test_dxf.py` and `test_tower_10_floors.dxf`: an authored synthetic prototype drawing and its generator.

No application or npm script imports these files. They are preserved for reference and are not current acceptance checks. Old selectors/output paths may require adaptation before manual reuse; they were not executed during cleanup. The synthetic drawing is not a genuine licensed architectural fixture.

Current checks are in `tools/canonical` and `tools/3d`; follow `docs/DEVELOPMENT.md`. Run diagnostic tools from the repository root unless their instructions say otherwise.
