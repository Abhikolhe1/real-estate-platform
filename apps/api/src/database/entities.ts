import { Builder } from "../entities/builder.entity";
import { User } from "../entities/user.entity";
import { Project } from "../entities/project.entity";
import { Tower } from "../entities/tower.entity";
import { Floor } from "../entities/floor.entity";
import { Flat } from "../entities/flat.entity";
import { Lead } from "../entities/lead.entity";
import { Page } from "../entities/page.entity";
import { FloorPlan } from "../entities/floorplan.entity";
import { Role } from "../entities/role.entity";
import { Permission } from "../entities/permission.entity";
import { Theme } from "../entities/theme.entity";
import { Media } from "../entities/media.entity";
import { AuditLog } from "../entities/audit-log.entity";
import { WebsiteSection } from "../entities/website-section.entity";
import { Component } from "../entities/component.entity";
import { NavigationMenu } from "../entities/navigation-menu.entity";
import { NavigationItem } from "../entities/navigation-item.entity";
import { AnimationPreset } from "../entities/animation-preset.entity";
import { PageRevision } from "../entities/page-revision.entity";
import { DigitalTwinModel } from "../entities/digital-twin-model.entity";
import { CameraPoint } from "../entities/camera-point.entity";
import { Hotspot } from "../entities/hotspot.entity";
import { TourRoute } from "../entities/tour-route.entity";
import { SdkKey } from "../entities/sdk-key.entity";
import { EmbedConfig } from "../entities/embed-config.entity";
import { AnalyticsEvent } from "../entities/analytics-event.entity";
import { Subscription } from "../entities/subscription.entity";
import { Invoice } from "../entities/invoice.entity";
import { SsoProvider } from "../entities/sso-provider.entity";
import { Translation } from "../entities/translation.entity";
import { Currency } from "../entities/currency.entity";
import { GeneratedStructure } from "../entities/generated-structure.entity";
import { StructuralAperture } from "../entities/structural-aperture.entity";
import { Amenity } from "../entities/amenity.entity";
import {
  TwinSourceAsset,
  TwinRevision,
  TwinReconstructionJob,
} from "../entities/canonical-twin.entity";

export const databaseEntities = [
  Builder,
  User,
  Project,
  Tower,
  Floor,
  Flat,
  Lead,
  Page,
  FloorPlan,
  Role,
  Permission,
  Theme,
  Media,
  AuditLog,
  WebsiteSection,
  Component,
  NavigationMenu,
  NavigationItem,
  AnimationPreset,
  PageRevision,
  DigitalTwinModel,
  CameraPoint,
  Hotspot,
  TourRoute,
  SdkKey,
  EmbedConfig,
  AnalyticsEvent,
  Subscription,
  Invoice,
  SsoProvider,
  Translation,
  Currency,
  GeneratedStructure,
  StructuralAperture,
  Amenity,
  TwinSourceAsset,
  TwinRevision,
  TwinReconstructionJob,
];
