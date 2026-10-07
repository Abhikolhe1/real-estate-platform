# Shared libraries

These folders support the existing applications. They do not create another website, dashboard, account or service.

| Application | Product role | Shared libraries used |
| --- | --- | --- |
| `apps/admin` | Main platform Admin: builder accounts and platform administration | `ui` |
| `apps/builder` | Builder's dashboard: projects, website content, inventory and DXF review | `ui`, `twin-schema` |
| `apps/web` | Public website engine, rendering the selected builder's content and projects | `ui`, `twin-schema` |
| `apps/api` | Common backend for users, tenants, content, projects and revisions | `twin-schema` |
| `apps/ai-service` | Private Python CAD helper for the requested DXF feature | Exports the shared JSON Schema |

Multiple builder websites are tenant data served by the public website application. A new builder account does not require a copy of the source folders. Separating common code here lets one fix reach all consumers without duplicating the same validator or button in each application.

## Source layout

```text
packages/
  ui/
    package.json             shared React dependency metadata
    README.md
    src/
      index.ts               public exports
      components/
        PremiumButton.tsx    used by all three frontend wrappers
  twin-schema/
    package.json             shared validation dependency metadata
    README.md
    src/
      index.js               validation and geometry helpers
      index.d.ts             shared TypeScript declarations
    schema/
      canonical.schema.json  contract exported from the Python models
```

Import `@aether/ui` or `@aether/twin-schema` from an app. Do not reach into another app's private source. The existing package names and app imports remain unchanged.

## Installed dependencies

`node_modules` contains npm-installed third-party library files. It is generated, ignored by Git and hidden by the workspace editor settings. These files are not extra business projects, and their presence is not evidence of malware. A malware assessment would require separate inspection; this cleanup checked the local shared source and dependency resolution, not every third-party file.

The cleanup deduplicated the shared validator into the root dependency folder and removed the now-empty `twin-schema/node_modules` directory. npm may still create nested dependency folders for build tools that require different versions. `twin-schema` pins Ajv 6.12.6 for its draft-07 contract; existing build tools also require other Ajv versions. Do not manually delete a required installed version or merge folders by hand. The root development dependency pins the same Ajv version for older tooling, fixing an existing peer-version mismatch. Install from the root using `npm ci`; npm recreates the placement from `package-lock.json`. Removing all installed dependencies is appropriate when performing a deliberate reinstall, not while assuming the app will keep running.

Keep `package.json`, the root lockfile, source files, declarations and the schema. Generated dependency/build folders are not maintained application source. Historical standalone experiments are archived in `tools/legacy`; current checks remain in `tools/canonical` and `tools/3d`.
