import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NavigationMenu } from '../entities/navigation-menu.entity';
import { NavigationItem } from '../entities/navigation-item.entity';
import { Builder } from '../entities/builder.entity';

@Injectable()
export class NavigationService {
  constructor(
    @InjectRepository(NavigationMenu)
    private readonly menuRepo: Repository<NavigationMenu>,
    @InjectRepository(NavigationItem)
    private readonly itemRepo: Repository<NavigationItem>,
    @InjectRepository(Builder)
    private readonly builderRepo: Repository<Builder>,
  ) {}

  // List all menus for a tenant
  async getMenus(tenantId: string): Promise<NavigationMenu[]> {
    return this.menuRepo.find({
      where: { tenantId },
      relations: ['items'],
    });
  }

  // Get menu by name (public, supports builderSlug fallback)
  async getMenuByName(headerTenantId: string, name: string, builderSlug?: string): Promise<NavigationMenu> {
    let finalTenantId = headerTenantId;

    if (builderSlug && (!finalTenantId || finalTenantId === '00000000-0000-0000-0000-000000000000')) {
      const builder = await this.builderRepo.findOne({ where: { slug: builderSlug } });
      if (builder) {
        finalTenantId = builder.id;
      }
    }

    const menu = await this.menuRepo.findOne({
      where: { name, tenantId: finalTenantId },
      relations: ['items'],
    });

    if (!menu) {
      // Return a basic fallback header/footer menu structure so the site never breaks!
      const fallbackMenu = new NavigationMenu();
      fallbackMenu.id = 'fallback-menu';
      fallbackMenu.name = name;
      fallbackMenu.tenantId = finalTenantId;
      fallbackMenu.items = [
        { id: 'item-1', menuId: 'fallback', title: 'Home', url: '/', orderNo: 1 } as NavigationItem,
        { id: 'item-2', menuId: 'fallback', title: 'Contact', url: '/contact', orderNo: 2 } as NavigationItem,
      ];
      return fallbackMenu;
    }

    // Sort items by orderNo
    menu.items = (menu.items || []).sort((a, b) => a.orderNo - b.orderNo);
    return menu;
  }

  // Create new menu
  async createMenu(tenantId: string, name: string): Promise<NavigationMenu> {
    const menu = new NavigationMenu();
    menu.tenantId = tenantId;
    menu.name = name;
    return this.menuRepo.save(menu);
  }

  // Add Item to Menu
  async addMenuItem(tenantId: string, menuId: string, body: { title: string; url: string; orderNo?: number }): Promise<NavigationItem> {
    // Verify menu belongs to tenant
    const menu = await this.menuRepo.findOne({ where: { id: menuId, tenantId } });
    if (!menu) {
      throw new NotFoundException(`Menu with ID ${menuId} not found`);
    }

    let finalOrderNo = body.orderNo;
    if (finalOrderNo === undefined) {
      const itemsCount = await this.itemRepo.count({ where: { menuId } });
      finalOrderNo = itemsCount + 1;
    }

    const item = new NavigationItem();
    item.menu = menu;
    item.menuId = menu.id;
    item.title = body.title;
    item.url = body.url;
    item.orderNo = finalOrderNo;

    return this.itemRepo.save(item);
  }

  // Update Menu Item
  async updateMenuItem(tenantId: string, itemId: string, body: { title?: string; url?: string; orderNo?: number }): Promise<NavigationItem> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['menu'],
    });

    if (!item || item.menu.tenantId !== tenantId) {
      throw new NotFoundException(`Navigation item with ID ${itemId} not found`);
    }

    if (body.title !== undefined) item.title = body.title;
    if (body.url !== undefined) item.url = body.url;
    if (body.orderNo !== undefined) item.orderNo = body.orderNo;

    return this.itemRepo.save(item);
  }

  // Delete Menu Item
  async deleteMenuItem(tenantId: string, itemId: string): Promise<boolean> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['menu'],
    });

    if (!item || item.menu.tenantId !== tenantId) {
      throw new NotFoundException(`Navigation item with ID ${itemId} not found`);
    }

    await this.itemRepo.remove(item);
    return true;
  }

  // Reorder Menu Items
  async reorderMenuItems(tenantId: string, menuId: string, itemIds: string[]): Promise<NavigationMenu> {
    const menu = await this.menuRepo.findOne({
      where: { id: menuId, tenantId },
      relations: ['items'],
    });

    if (!menu) {
      throw new NotFoundException(`Menu with ID ${menuId} not found`);
    }

    for (let index = 0; index < itemIds.length; index++) {
      const itemId = itemIds[index];
      const item = menu.items.find((i) => i.id === itemId);
      if (item) {
        item.orderNo = index + 1;
        await this.itemRepo.save(item);
      }
    }

    // Reload menu with updated items order
    const updatedMenu = await this.menuRepo.findOne({
      where: { id: menuId, tenantId },
      relations: ['items'],
    });

    if (updatedMenu) {
      updatedMenu.items = (updatedMenu.items || []).sort((a, b) => a.orderNo - b.orderNo);
      return updatedMenu;
    }
    return menu;
  }
}
