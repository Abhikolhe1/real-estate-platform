import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { TenantId } from "../interceptors/tenant.decorator";
import { JwtAuthGuard } from "../guards/auth.guard";
import { TwinAccessGuard } from "../guards/twin-access.guard";
import { InventoryService } from "../services/inventory.service";

@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  // Get Towers
  @Get("towers")
  async getTowers(
    @TenantId() tenantId: string,
    @Query("projectId") projectId?: string,
  ) {
    return this.inventory.getTowers(tenantId, projectId);
  }

  // Create Tower
  @Post("towers")
  @UseGuards(JwtAuthGuard, TwinAccessGuard)
  async createTower(
    @TenantId() tenantId: string,
    @Body()
    body: {
      name: string;
      projectId: string;
      description?: string;
      floorsCount?: number;
    },
  ) {
    return this.inventory.createTower(tenantId, body);
  }

  // Get flats list (highly useful for both inventory lists and public visual maps)
  @Get("flats")
  async getFlats(
    @TenantId() tenantId: string,
    @Query("towerId") towerId?: string,
  ) {
    return this.inventory.getFlats(tenantId, towerId);
  }

  @Get("flats/:id")
  async getFlat(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.inventory.getFlat(tenantId, id);
  }

  // Update Flat Status (Book flat, change price, orientation)
  @Put("flats/:id")
  @UseGuards(JwtAuthGuard, TwinAccessGuard)
  async updateFlat(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body()
    body: {
      status?: "AVAILABLE" | "BOOKED" | "HOLD";
      price?: number;
      sizeSqFt?: number;
      orientation?: string;
    },
  ) {
    return this.inventory.updateFlat(tenantId, id, body);
  }

  // ===================== FLOORS CRUD =====================

  // Get floors for a specific tower
  @Get("floors")
  async getFloors(
    @TenantId() tenantId: string,
    @Query("towerId") towerId?: string,
  ) {
    return this.inventory.getFloors(tenantId, towerId);
  }

  // Create individual floor under a tower
  @Post("floors")
  @UseGuards(JwtAuthGuard, TwinAccessGuard)
  async createFloor(
    @TenantId() tenantId: string,
    @Body()
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
    return this.inventory.createFloor(tenantId, body);
  }

  // Update floor description and geometry/plan associations
  @Put("floors/:id")
  @UseGuards(JwtAuthGuard, TwinAccessGuard)
  async updateFloor(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body()
    body: {
      description?: string;
      floorNumber?: number;
      floorHeight?: number;
      floorplanId?: string | null;
      flatType?: string;
      unitsPerFloor?: number;
    },
  ) {
    return this.inventory.updateFloor(tenantId, id, body);
  }

  // Delete floor (cascade deletes flats)
  @Delete("floors/:id")
  @UseGuards(JwtAuthGuard, TwinAccessGuard)
  async deleteFloor(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.inventory.deleteFloor(tenantId, id);
  }

  // Get floors of a tower with their corresponding structureJson
  @Get("towers/:id/floors")
  @UseGuards(JwtAuthGuard, TwinAccessGuard)
  async getTowerFloors(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.inventory.getTowerFloors(tenantId, id);
  }

  // ===================== TOWERS UPDATE/DELETE =====================

  // Update Tower
  @Put("towers/:id")
  @UseGuards(JwtAuthGuard, TwinAccessGuard)
  async updateTower(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() body: { name?: string; description?: string },
  ) {
    return this.inventory.updateTower(tenantId, id, body);
  }

  // Delete Tower (cascade deletes floors + flats)
  @Delete("towers/:id")
  @UseGuards(JwtAuthGuard, TwinAccessGuard)
  async deleteTower(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.inventory.deleteTower(tenantId, id);
  }

  // ===================== ADD FLAT =====================

  // Create individual flat under a floor
  @Post("flats")
  @UseGuards(JwtAuthGuard, TwinAccessGuard)
  async createFlat(
    @TenantId() tenantId: string,
    @Body()
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
    return this.inventory.createFlat(tenantId, body);
  }

  // Delete flat unit
  @Delete("flats/:id")
  @UseGuards(JwtAuthGuard, TwinAccessGuard)
  async deleteFlat(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.inventory.deleteFlat(tenantId, id);
  }

  // ===================== DASHBOARD ANALYTICS =====================

  // Builder dashboard stats summary
  @Get("stats")
  async getDashboardStats(@TenantId() tenantId: string) {
    return this.inventory.getDashboardStats(tenantId);
  }
}
