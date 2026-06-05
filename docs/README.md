# Real Estate Platform - Asset & Document Storage (`/docs`)

This directory serves as the storage location for design assets, documents, and 3D files related to the platform's floor plans and virtual experiences.

## 📂 Suggested Directory Structure

You can organize your files as follows:

*   `/docs/cad/` - For 2D CAD designs (DWG, DXF, PDF).
*   `/docs/glb/` - For 3D binary glTF assets (GLB) used in Three.js/WebGL virtual tours.
*   `/docs/textures/` - For floor and wall texture images (wood, tile, concrete).
*   `/docs/manuals/` - For project user manuals and API documentation.

## 🔗 Serving assets
In production:
* For local development, assets placed inside the frontend portals' `/public` folders can be served statically.
* For scalable multi-tenant production, upload these assets to a Cloud Object Storage bucket (like AWS S3 or Google Cloud Storage) and save their URL in the database.
