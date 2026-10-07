import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CanonicalTwinService } from "../services/canonical-twin.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Tower } from "../entities/tower.entity";
import { Floor } from "../entities/floor.entity";
import { Flat } from "../entities/flat.entity";
import { Lead } from "../entities/lead.entity";
import { AnalyticsEvent } from "../entities/analytics-event.entity";
import { GeneratedStructure } from "../entities/generated-structure.entity";
import { FloorPlan } from "../entities/floorplan.entity";
import { Project } from "../entities/project.entity";

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Tower)
    private readonly towerRepo: Repository<Tower>,
    @InjectRepository(Floor)
    private readonly floorRepo: Repository<Floor>,
    @InjectRepository(Flat)
    private readonly flatRepo: Repository<Flat>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsRepo: Repository<AnalyticsEvent>,
    @InjectRepository(GeneratedStructure)
    private readonly generatedStructureRepo: Repository<GeneratedStructure>,
    private readonly canonicalTwins: CanonicalTwinService,
  ) {}

  // Get Towers
  async getTowers(tenantId: string, projectId?: string) {
    const query = { tenantId } as any;
    if (projectId) {
      query.projectId = projectId;
    }
    return this.towerRepo.find({
      where: query,
      relations: ["project", "floors", "floors.flats"],
      order: { name: "ASC" },
    });
  }

  // Create Tower

  async createTower(
    tenantId: string,
    body: {
      name: string;
      projectId: string;
      description?: string;
      floorsCount?: number;
    },
  ) {
    if (
      !(await this.towerRepo.manager.findOneBy(Project, {
        id: body.projectId,
        tenantId,
      }))
    )
      throw new NotFoundException("Project not found");
    if (
      body.floorsCount !== undefined &&
      (!Number.isInteger(body.floorsCount) ||
        body.floorsCount < 0 ||
        body.floorsCount > 200)
    )
      throw new NotFoundException("Invalid floor count");
    const tower = new Tower();
    tower.tenantId = tenantId;
    tower.projectId = body.projectId;
    tower.name = body.name;
    tower.description = body.description;
    const savedTower = await this.towerRepo.save(tower);

    // If floors count specified, auto-seed floors and flats
    const seededFloors: Floor[] = [];
    if (body.floorsCount && body.floorsCount > 0) {
      for (let f = 1; f <= body.floorsCount; f++) {
        const floor = new Floor();
        floor.tenantId = tenantId;
        floor.towerId = savedTower.id;
        floor.floorNumber = f;
        floor.description = `Floor level ${f}`;
        const savedFloor = await this.floorRepo.save(floor);
        seededFloors.push(savedFloor);

        // Seed 2 default flats per floor
        for (let unit = 1; unit <= 2; unit++) {
          const flat = new Flat();
          flat.tenantId = tenantId;
          flat.floorId = savedFloor.id;
          flat.flatNumber = `${f}0${unit}`;
          flat.status = "AVAILABLE";
          flat.sizeSqFt = 1200 + unit * 200;
          flat.price = 12000000 + unit * 3000000;
          flat.type = "2BHK";
          await this.flatRepo.save(flat);
        }
      }
    }

    return {
      success: true,
      tower: savedTower,
      floorsCount: seededFloors.length,
    };
  }

  // Get flats list (highly useful for both inventory lists and public visual maps)
  async getFlats(tenantId: string, towerId?: string) {
    if (towerId) {
      return this.flatRepo.find({
        where: { tenantId, floor: { towerId } } as any,
        relations: ["floor", "floor.tower"],
        order: {
          floor: { floorNumber: "DESC" },
          flatNumber: "ASC",
        } as any,
      });
    }

    return this.flatRepo.find({
      where: { tenantId },
      relations: ["floor", "floor.tower"],
      order: { flatNumber: "ASC" },
    });
  }
  async getFlat(tenantId: string, id: string) {
    const flat = await this.flatRepo.findOne({
      where: { id, tenantId },
      relations: ["floor", "floor.tower"],
    });

    if (!flat) {
      throw new NotFoundException(
        "Flat unit not found under this tenant context",
      );
    }

    return flat;
  }

  // Update Flat Status (Book flat, change price, orientation)

  async updateFlat(
    tenantId: string,
    id: string,
    body: {
      status?: "AVAILABLE" | "BOOKED" | "HOLD";
      price?: number;
      sizeSqFt?: number;
      orientation?: string;
    },
  ) {
    const flat = await this.flatRepo.findOne({ where: { id, tenantId } });
    if (!flat) {
      return {
        success: false,
        message: "Flat unit not found under this tenant context",
      };
    }

    if (body.status) flat.status = body.status;
    if (body.price !== undefined) flat.price = body.price;
    if (body.sizeSqFt) flat.sizeSqFt = body.sizeSqFt;
    if (body.orientation) flat.orientation = body.orientation;

    const saved = await this.flatRepo.save(flat);
    return { success: true, flat: saved };
  }

  // ===================== FLOORS CRUD =====================

  // Get floors for a specific tower
  async getFloors(tenantId: string, towerId?: string) {
    const query: any = { tenantId };
    if (towerId) query.towerId = towerId;
    return this.floorRepo.find({
      where: query,
      relations: ["flats"],
      order: { floorNumber: "ASC" },
    });
  }

  // Create individual floor under a tower

  async createFloor(
    tenantId: string,
    body: {
      towerId: string;
      floorNumber: number;
      description?: string;
      flatsCount?: number;
      floorHeight?: number;
      floorplanId?: string;
      flatType?: string;
      unitsPerFloor?: number;
    },
  ) {
    const tower = await this.towerRepo.findOneBy({
      id: body.towerId,
      tenantId,
    });
    if (!tower) throw new NotFoundException("Tower not found");
    if (
      body.floorplanId &&
      !(await this.floorRepo.manager.findOneBy(FloorPlan, {
        id: body.floorplanId,
        tenantId,
        projectId: tower.projectId,
      }))
    )
      throw new NotFoundException("Floorplan not found");
    const count = body.flatsCount ?? body.unitsPerFloor ?? 0;
    if (!Number.isInteger(count) || count < 0 || count > 200)
      throw new BadRequestException("Flat count must be between 0 and 200");
    const floor = new Floor();
    floor.tenantId = tenantId;
    floor.towerId = body.towerId;
    floor.floorNumber = body.floorNumber;
    floor.description = body.description || `Floor level ${body.floorNumber}`;
    floor.floorHeight = body.floorHeight !== undefined ? body.floorHeight : 3.0;
    if (body.floorplanId) floor.floorplanId = body.floorplanId;
    if (body.flatType) floor.flatType = body.flatType;
    if (body.unitsPerFloor !== undefined)
      floor.unitsPerFloor = body.unitsPerFloor;
    const savedFloor = await this.floorRepo.save(floor);

    // Auto-seed flats if flatsCount specified
    const seededFlats: Flat[] = [];
    if (count > 0) {
      for (let unit = 1; unit <= count; unit++) {
        const flat = new Flat();
        flat.tenantId = tenantId;
        flat.floorId = savedFloor.id;
        flat.flatNumber = `${body.floorNumber}0${unit}`;
        flat.status = "AVAILABLE";
        flat.sizeSqFt = 1200 + unit * 200;
        flat.price = 12000000 + unit * 3000000;
        flat.type = (body.flatType as any) || "2BHK";
        const savedFlat = await this.flatRepo.save(flat);
        seededFlats.push(savedFlat);
      }
    }

    return {
      success: true,
      floor: savedFloor,
      flatsSeeded: seededFlats.length,
    };
  }

  // Update floor description and geometry/plan associations

  async updateFloor(
    tenantId: string,
    id: string,
    body: {
      description?: string;
      floorNumber?: number;
      floorHeight?: number;
      floorplanId?: string | null;
      flatType?: string;
      unitsPerFloor?: number;
    },
  ) {
    const floor = await this.floorRepo.findOne({ where: { id, tenantId } });
    if (!floor) return { success: false, message: "Floor not found" };
    if (body.description !== undefined) floor.description = body.description;
    if (body.floorNumber !== undefined) floor.floorNumber = body.floorNumber;
    if (body.floorHeight !== undefined) floor.floorHeight = body.floorHeight;
    const tower = await this.towerRepo.findOneBy({
      id: floor.towerId,
      tenantId,
    });
    if (!tower) throw new NotFoundException("Tower not found");
    if (
      body.floorplanId &&
      !(await this.floorRepo.manager.findOneBy(FloorPlan, {
        id: body.floorplanId,
        tenantId,
        projectId: tower.projectId,
      }))
    )
      throw new NotFoundException("Floorplan not found");
    if (body.floorplanId !== undefined)
      floor.floorplanId = body.floorplanId === null ? null : body.floorplanId;
    if (body.flatType !== undefined) floor.flatType = body.flatType;
    if (body.unitsPerFloor !== undefined)
      floor.unitsPerFloor = body.unitsPerFloor;
    const saved = await this.floorRepo.save(floor);
    return { success: true, floor: saved };
  }

  // Delete floor (cascade deletes flats)

  async deleteFloor(tenantId: string, id: string) {
    const floor = await this.floorRepo.findOne({ where: { id, tenantId } });
    if (!floor) return { success: false, message: "Floor not found" };
    await this.floorRepo.remove(floor);
    return { success: true };
  }

  // Get floors of a tower with their corresponding structureJson

  async getTowerFloors(tenantId: string, id: string) {
    const tower = await this.towerRepo.findOneBy({ id, tenantId });
    if (!tower) throw new NotFoundException("Tower not found");
    const floors = await this.floorRepo.find({
      where: { tenantId, towerId: id },
      relations: ["floorplan", "flats"],
      order: { floorNumber: "ASC" },
    });

    if (
      floors.some(
        (f) =>
          f.floorplan &&
          (f.floorplan.tenantId !== tenantId ||
            f.floorplan.projectId !== tower.projectId),
      )
    )
      throw new NotFoundException(
        "Floorplan association is outside this project",
      );
    const floorplanIds = floors
      .filter((f) => !f.floorplan?.canonicalSourceAssetId)
      .map((f) => f.floorplanId)
      .filter((fpId): fpId is string => !!fpId);

    let structures: GeneratedStructure[] = [];
    if (floorplanIds.length > 0) {
      structures = await this.generatedStructureRepo.find({
        where: { tenantId, floorplanId: In(floorplanIds) },
      });
    }

    const structureMap = new Map<string, any>();
    for (const struct of structures) {
      if (struct.floorplanId) {
        structureMap.set(struct.floorplanId, struct.structureJson);
      }
    }

    return Promise.all(
      floors.map(async (floor) => {
        if (floor.floorplan?.canonicalSourceAssetId) {
          const revision = floor.floorplan.approvedCanonicalRevisionId
            ? await this.canonicalTwins.approved({
                tenantId,
                projectId: floor.floorplan.projectId,
                floorplanId: floor.floorplanId!,
              })
            : null;
          return {
            ...floor,
            structureJson: null,
            floorHeight: revision
              ? revision.canonical.floors[0].heightM
              : floor.floorHeight,
            canonicalRevisionId: revision?.id || null,
            canonicalTwin: revision?.canonical || null,
          };
        }
        return {
          ...floor,
          structureJson: floor.floorplanId
            ? structureMap.get(floor.floorplanId) || null
            : null,
        };
      }),
    );
  }

  // ===================== TOWERS UPDATE/DELETE =====================

  // Update Tower

  async updateTower(
    tenantId: string,
    id: string,
    body: { name?: string; description?: string },
  ) {
    const tower = await this.towerRepo.findOne({ where: { id, tenantId } });
    if (!tower) return { success: false, message: "Tower not found" };
    if (body.name) tower.name = body.name;
    if (body.description !== undefined) tower.description = body.description;
    const saved = await this.towerRepo.save(tower);
    return { success: true, tower: saved };
  }

  // Delete Tower (cascade deletes floors + flats)

  async deleteTower(tenantId: string, id: string) {
    const tower = await this.towerRepo.findOne({ where: { id, tenantId } });
    if (!tower) return { success: false, message: "Tower not found" };
    await this.towerRepo.remove(tower);
    return { success: true };
  }

  // ===================== ADD FLAT =====================

  // Create individual flat under a floor

  async createFlat(
    tenantId: string,
    body: {
      floorId: string;
      flatNumber: string;
      type?: "1BHK" | "2BHK" | "3BHK" | "PENTHOUSE";
      sizeSqFt?: number;
      price?: number;
      orientation?: string;
      description?: string;
    },
  ) {
    if (!(await this.floorRepo.findOneBy({ id: body.floorId, tenantId })))
      throw new NotFoundException("Floor not found");
    const flat = new Flat();
    flat.tenantId = tenantId;
    flat.floorId = body.floorId;
    flat.flatNumber = body.flatNumber;
    flat.status = "AVAILABLE";
    flat.type = body.type || "2BHK";
    flat.sizeSqFt = body.sizeSqFt || 1200;
    flat.price = body.price || 12000000;
    if (body.orientation) flat.orientation = body.orientation;
    if (body.description) flat.description = body.description;
    const saved = await this.flatRepo.save(flat);
    return { success: true, flat: saved };
  }

  // Delete flat unit

  async deleteFlat(tenantId: string, id: string) {
    const flat = await this.flatRepo.findOne({ where: { id, tenantId } });
    if (!flat) return { success: false, message: "Flat not found" };
    await this.flatRepo.remove(flat);
    return { success: true };
  }

  // ===================== DASHBOARD ANALYTICS =====================

  // Builder dashboard stats summary
  async getDashboardStats(tenantId: string) {
    const [
      totalFlats,
      bookedFlats,
      heldFlats,
      totalTowers,
      totalLeads,
      hotLeads,
      walkthroughVisits,
    ] = await Promise.all([
      this.flatRepo.count({ where: { tenantId } }),
      this.flatRepo.count({ where: { tenantId, status: "BOOKED" } }),
      this.flatRepo.count({ where: { tenantId, status: "HOLD" } }),
      this.towerRepo.count({ where: { tenantId } }),
      this.leadRepo.count({ where: { tenantId } }),
      this.leadRepo.count({ where: { tenantId, status: "HOT" } }),
      this.analyticsRepo.count({
        where: { tenantId, eventName: "viewer_opened" },
      }),
    ]);

    const availableFlats = totalFlats - bookedFlats - heldFlats;
    const inventoryAllocationPct =
      totalFlats > 0
        ? Math.round(((bookedFlats + heldFlats) / totalFlats) * 100)
        : 0;

    // Estimate revenue from booked flats (using avg price calculation)
    const bookedFlatsData = await this.flatRepo.find({
      where: { tenantId, status: "BOOKED" },
    });
    const totalRevenue = bookedFlatsData.reduce(
      (sum, f) => sum + Number(f.price),
      0,
    );

    return {
      totalFlats,
      availableFlats,
      bookedFlats,
      heldFlats,
      totalTowers,
      inventoryAllocationPct,
      totalLeads,
      hotLeads,
      estimatedRevenue: totalRevenue,
      walkthroughVisits,
    };
  }
}
