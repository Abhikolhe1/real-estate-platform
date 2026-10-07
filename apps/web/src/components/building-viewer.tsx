"use client";
import React from "react";
import dynamic from "next/dynamic";
import PropertyExperience from "./property-viewer/PropertyExperience";
import type { BuildingViewerProps } from "./legacy/LegacyBuildingViewer";
export { defaultLayoutData } from "./default-layout";
export type { BuildingViewerProps } from "./legacy/LegacyBuildingViewer";
const LegacyBuildingViewer = dynamic(
  () => import("./legacy/LegacyBuildingViewer"),
  { ssr: false },
);

/** Stable public API. Approved twins and GLB assets share the existing Runtime/Surface. */
export default function BuildingViewer(props: BuildingViewerProps) {
  const models = React.useMemo(
    () =>
      props.initialModels?.filter(
        (m) =>
          m.canonical?.revision.state === "approved" ||
          /\.(glb|gltf)(?:[?#]|$)/i.test(m.modelUrl),
      ),
    [props.initialModels],
  );
  if (models?.length)
    return (
      <PropertyExperience
        models={models}
        layout={props.layoutData}
        projectId={props.projectId}
        navigation={props}
      />
    );
  return <LegacyBuildingViewer {...props} />;
}
