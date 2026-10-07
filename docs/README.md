# Documentation

Start with the [application and package guide](../packages/README.md), [architecture](ARCHITECTURE.md), [development and verification](DEVELOPMENT.md), and the [cleanup record](CODE_CLEANUP.md).

Current canonical DXF records:

- [Implementation](../CANONICAL_DXF_IMPLEMENTATION.md)
- [Executed tests](../CANONICAL_DXF_TEST_REPORT.md)
- [Automatic and reviewed accuracy](../CANONICAL_DXF_ACCURACY_REPORT.md)
- [Security and resource limits](../CANONICAL_DXF_SECURITY_REPORT.md)

`MD/` contains historical requirements and phased plans; planned features are not evidence of completed behavior. `3d/` contains earlier viewer audits. Root `evidence/canonical/` holds current executable-test results and screenshots.

CAD source bytes for the canonical workflow are private immutable database assets. Do not place tenant DXF sources in a frontend `public` directory. Public sample GLB/textures retain their own attribution; a canonical source is traced by its asset identity and SHA-256 rather than the sample model's license.
