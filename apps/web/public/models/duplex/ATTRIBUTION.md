# Duplex Apartment

BSI (2020) "Duplex Apartment Test Files," buildingSMART International.

Source: https://github.com/buildingsmart-community/Community-Sample-Test-Files/tree/main/IFC%202.3.0.1%20(IFC%202x3)/Duplex%20Apartment

License: Creative Commons Attribution 4.0 International, https://creativecommons.org/licenses/by/4.0/

The upstream README is preserved in SOURCE.md. It describes earlier publication in Germany, delivery to the US Construction Engineering Research Laboratory, and hosting by NIBS. The IFC header does not name an individual author; none is invented here.

Original: Duplex_A_20110907.ifc, 2,380,763 bytes, SHA-256 b347a2c8aa8fff6db896a4417a9c50c22ac0ccd7c5cfc22b99b8d29336c606ed.

Changes: tessellated using IfcOpenShell 0.8.5; exported with trimesh to GLB; metres retained; IFC Z-up changed to glTF Y-up by [X,Y,Z] -> [X,Z,-Y]; opening/space volumes omitted from visible export; source GUIDs and surface styles retained. Sharp architectural normals exported. Live-roof green is muted for presentation, transparent glazing opacity is at least 0.22, and opaque window frames stay opaque. No textures were supplied by the original IFC. Room/storey metadata is extracted into manifest.json; unit A/B associations are explicitly mapped from the IFC space codes. Stairs are visible but automatic level transitions are disabled.

Regenerate using tools/3d/prepare_duplex.py. This GLB is a derivative sample for evaluation, not a representation of a listed property.
