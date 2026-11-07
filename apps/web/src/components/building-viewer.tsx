"use client";
import React from "react";
import dynamic from "next/dynamic";
import { ExplorerSkeleton } from "./page-skeleton";
import type { CanonicalTwinV1 } from "@aether/twin-schema";
import type { ExternalNavigation } from "./property-viewer/PropertyExperience";

export { defaultLayoutData } from "./default-layout";

export interface DigitalTwinModel {
  id: string;
  projectId: string;
  name: string;
  modelUrl: string;
  modelType: "exterior" | "interior";
  canonical?: CanonicalTwinV1;
}

export interface Hotspot {
  id: string;
  name: string;
  type: string;
  posX: number;
  posY: number;
  posZ: number;
  contentJson?: Record<string, unknown>;
}

export interface TourRoute {
  id: string;
  name: string;
  routeJson?: Array<Record<string, unknown>>;
}

export interface BuildingViewerProps {
  activeFloor?: number;
  setActiveFloor?: (floor: number) => void;
  viewMode?: "building" | "walkthrough";
  setViewMode?: (mode: "building" | "walkthrough") => void;
  activeRoom?: string | null;
  setActiveRoom?: (roomName: string | null) => void;

  // SDK / Embed props
  isEmbedded?: boolean;
  initialModels?: DigitalTwinModel[];
  initialHotspots?: Hotspot[];
  initialTours?: TourRoute[];
  initialTenantId?: string;
  projectId?: string;
  sdkKey?: string;
  layoutData?: any;
}

const PropertyExperience = dynamic(
  () => import("./property-viewer/PropertyExperience"),
  { ssr: false, loading: ExplorerSkeleton },
);

/** Canonical BuildingViewer. Approved twins and GLB assets render through PropertyExperience. */
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

  const navigation: ExternalNavigation | undefined = React.useMemo(() => {
    if (!props.setActiveRoom) return undefined;
    return {
      viewMode: props.viewMode ?? "building",
      activeFloor: props.activeFloor ?? 0,
      activeRoom: props.activeRoom ?? null,
      setViewMode: props.setViewMode,
      setActiveFloor: props.setActiveFloor,
      setActiveRoom: props.setActiveRoom,
    };
  }, [
    props.viewMode,
    props.activeFloor,
    props.activeRoom,
    props.setViewMode,
    props.setActiveFloor,
    props.setActiveRoom,
  ]);

  return (
    <PropertyExperience
      models={models?.length ? models : undefined}
      layout={props.layoutData}
      projectId={props.projectId}
      navigation={navigation}
    />
  );
}
