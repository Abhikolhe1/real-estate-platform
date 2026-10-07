# Shared-package cleanup evidence

This follow-up organizes shared libraries and historical diagnostics without removing application business behavior. The three frontends remain Admin, Builder and Web; the common backend is API. The private Python service supports the requested CAD workflow.

- `ui`: existing shared React components; `PremiumButton.tsx` unchanged.
- `twin-schema`: runtime/declarations in `src`, generated contract in `schema`; public app imports unchanged.
- Ajv dependency resolution: pinned existing 6.12.6 at root, full installed dependency tree valid, no package-local dependency folder needed. Build tools that need Ajv 8 keep their own version.
- Five unreferenced old diagnostics/drawing files: archived unchanged under `tools/legacy`.
- Generated dependency/build/cache folders: ignored by Git and hidden in the workspace editor.

See [checks.json](checks.json) for this follow-up's executed verification and [dependency-resolution.json](dependency-resolution.json) for the package placement changes. The application workspace dependency manifests did not change during this repair. Existing canonical evidence contains the full build logs and schema/scene results.

Builds compile/type-check the applications; the existing isolated build configuration skips repository-wide lint. API/browser integration suites from the preceding implementation were not rerun for this path/metadata cleanup. This is not a malware scan of every installed third-party file.
