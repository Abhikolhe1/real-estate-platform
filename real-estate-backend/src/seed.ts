import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { Builder } from './entities/builder.entity';
import { User } from './entities/user.entity';
import { Project } from './entities/project.entity';
import { Tower } from './entities/tower.entity';
import { Floor } from './entities/floor.entity';
import { Flat } from './entities/flat.entity';
import { Lead } from './entities/lead.entity';
import { Page } from './entities/page.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import * as bcrypt from 'bcryptjs';

async function bootstrap() {
  console.log('--- DB SEEDING STARTED (PHASE 1) ---');
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const builderRepo = dataSource.getRepository(Builder);
  const userRepo = dataSource.getRepository(User);
  const projectRepo = dataSource.getRepository(Project);
  const towerRepo = dataSource.getRepository(Tower);
  const floorRepo = dataSource.getRepository(Floor);
  const flatRepo = dataSource.getRepository(Flat);
  const leadRepo = dataSource.getRepository(Lead);
  const pageRepo = dataSource.getRepository(Page);
  const permRepo = dataSource.getRepository(Permission);
  const roleRepo = dataSource.getRepository(Role);

  // Clear existing tables in correct order using a cascading truncate raw query
  console.log('Cleaning old records...');
  await dataSource.query('TRUNCATE TABLE pages, leads, flats, floors, towers, projects, users, builders, role_permissions, user_roles, roles, permissions CASCADE;');

  console.log('Seeding Permissions...');
  const permissionsList = [
    { name: 'create_builder', module: 'builders' },
    { name: 'edit_builder', module: 'builders' },
    { name: 'suspend_builder', module: 'builders' },
    { name: 'delete_builder', module: 'builders' },
    { name: 'manage_plans', module: 'plans' },
    { name: 'manage_revenue', module: 'revenue' },
    { name: 'view_analytics', module: 'analytics' },
    
    { name: 'manage_projects', module: 'projects' },
    { name: 'manage_users', module: 'users' },
    { name: 'manage_website', module: 'website' },
    { name: 'manage_leads', module: 'leads' },
    { name: 'manage_themes', module: 'themes' },
    
    { name: 'manage_inventory', module: 'inventory' },
    { name: 'manage_content', module: 'content' },
    { name: 'manage_media', module: 'media' },
    
    { name: 'view_leads', module: 'leads' },
    { name: 'add_lead_notes', module: 'leads' },
    { name: 'update_lead_status', module: 'leads' },
  ];

  const dbPermissions: Record<string, Permission> = {};
  for (const p of permissionsList) {
    const perm = new Permission();
    perm.name = p.name;
    perm.module = p.module;
    dbPermissions[p.name] = await permRepo.save(perm);
  }

  console.log('Seeding Roles...');
  const superAdminRole = new Role();
  superAdminRole.name = 'SUPER_ADMIN';
  superAdminRole.description = 'Platform Super Administrator';
  superAdminRole.permissions = [
    dbPermissions['create_builder'],
    dbPermissions['edit_builder'],
    dbPermissions['suspend_builder'],
    dbPermissions['delete_builder'],
    dbPermissions['manage_plans'],
    dbPermissions['manage_revenue'],
    dbPermissions['view_analytics'],
  ];
  await roleRepo.save(superAdminRole);

  const builderAdminRole = new Role();
  builderAdminRole.name = 'BUILDER_ADMIN';
  builderAdminRole.description = 'Builder Administrator';
  builderAdminRole.permissions = [
    dbPermissions['manage_projects'],
    dbPermissions['manage_users'],
    dbPermissions['manage_website'],
    dbPermissions['manage_leads'],
    dbPermissions['manage_themes'],
  ];
  await roleRepo.save(builderAdminRole);

  const builderStaffRole = new Role();
  builderStaffRole.name = 'BUILDER_STAFF';
  builderStaffRole.description = 'Builder Staff Member';
  builderStaffRole.permissions = [
    dbPermissions['manage_inventory'],
    dbPermissions['manage_content'],
    dbPermissions['manage_media'],
  ];
  await roleRepo.save(builderStaffRole);

  const salesUserRole = new Role();
  salesUserRole.name = 'SALES_USER';
  salesUserRole.description = 'Builder Sales Agent';
  salesUserRole.permissions = [
    dbPermissions['view_leads'],
    dbPermissions['add_lead_notes'],
    dbPermissions['update_lead_status'],
  ];
  await roleRepo.save(salesUserRole);

  console.log('Seeding Builders...');
  // 1. Aethelgard Builder
  const aethelgard = new Builder();
  aethelgard.id = 'b0d39e2a-1cbe-4c28-bbbe-e6e788e99aa2';
  aethelgard.name = 'Aethelgard Luxury Residences';
  aethelgard.slug = 'aethelgard';
  aethelgard.email = 'info@aethelgard.com';
  aethelgard.phone = '+91 9999999999';
  aethelgard.logo = '/assets/aethelgard_logo.png';
  aethelgard.status = 'ACTIVE';
  aethelgard.planId = 'growth';
  aethelgard.themeSettings = {
    logo: 'AETHELGARD',
    primaryColor: '#d4af37',
    secondaryColor: '#131313',
    fontHeader: 'Bodoni Moda',
    fontBody: 'Hanken Grotesk',
  };
  aethelgard.isActive = true;
  const savedAethelgard = await builderRepo.save(aethelgard);

  // 2. OmniEstate Builder
  const omniestate = new Builder();
  omniestate.name = 'OmniEstate Developers';
  omniestate.slug = 'omniestate';
  omniestate.email = 'contact@omniestate.com';
  omniestate.phone = '+91 8888888888';
  omniestate.logo = '/assets/omniestate_logo.png';
  omniestate.status = 'ACTIVE';
  omniestate.planId = 'free';
  omniestate.themeSettings = {
    logo: 'OMNIESTATE',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e293b',
    fontHeader: 'Outfit',
    fontBody: 'Inter',
  };
  omniestate.isActive = true;
  const savedOmniestate = await builderRepo.save(omniestate);

  console.log('Seeding Users...');
  const passwordHash = bcrypt.hashSync('password', 10);

  // Platform Super Admin
  const superAdmin = new User();
  superAdmin.email = 'admin@platform.com';
  superAdmin.passwordHash = passwordHash;
  superAdmin.firstName = 'Super';
  superAdmin.lastName = 'Admin';
  superAdmin.role = 'SUPER_ADMIN';
  superAdmin.roles = [superAdminRole];
  superAdmin.tenantId = undefined;
  await userRepo.save(superAdmin);

  // Aethelgard Admin
  const aethelgardAdmin = new User();
  aethelgardAdmin.email = 'admin@aethelgard.com';
  aethelgardAdmin.passwordHash = passwordHash;
  aethelgardAdmin.firstName = 'Aethelgard';
  aethelgardAdmin.lastName = 'Admin';
  aethelgardAdmin.role = 'BUILDER_ADMIN';
  aethelgardAdmin.roles = [builderAdminRole];
  aethelgardAdmin.tenantId = savedAethelgard.id;
  aethelgardAdmin.builder = savedAethelgard;
  await userRepo.save(aethelgardAdmin);

  // OmniEstate Admin
  const omniestateAdmin = new User();
  omniestateAdmin.email = 'admin@omniestate.com';
  omniestateAdmin.passwordHash = passwordHash;
  omniestateAdmin.firstName = 'OmniEstate';
  omniestateAdmin.lastName = 'Admin';
  omniestateAdmin.role = 'BUILDER_ADMIN';
  omniestateAdmin.roles = [builderAdminRole];
  omniestateAdmin.tenantId = savedOmniestate.id;
  omniestateAdmin.builder = savedOmniestate;
  await userRepo.save(omniestateAdmin);

  console.log('Seeding Projects...');
  // Aethelgard Project
  const aethelgardProj = new Project();
  aethelgardProj.tenantId = savedAethelgard.id;
  aethelgardProj.builder = savedAethelgard;
  aethelgardProj.name = 'Aethelgard Sky Penthouses';
  aethelgardProj.slug = 'sky-penthouses';
  aethelgardProj.description = 'Cinematic sky-high luxury penthouses with private infinity pools and 360 view.';
  aethelgardProj.location = 'Bandra Kurla Complex, Mumbai';
  aethelgardProj.status = 'UNDER_CONSTRUCTION';
  const savedAethelgardProj = await projectRepo.save(aethelgardProj);

  // OmniEstate Project
  const omniProj = new Project();
  omniProj.tenantId = savedOmniestate.id;
  omniProj.builder = savedOmniestate;
  omniProj.name = 'OmniEstate Seafront Villas';
  omniProj.slug = 'seafront-villas';
  omniProj.description = 'Beautiful signature seaside villas with access to private yachts and luxury clubhouse.';
  omniProj.location = 'Marine Drive, Mumbai';
  omniProj.status = 'PLANNING';
  const savedOmniProj = await projectRepo.save(omniProj);

  console.log('Seeding Towers, Floors, and Flats...');
  // Tower A - Sapphire
  const tower = new Tower();
  tower.tenantId = savedAethelgard.id;
  tower.projectId = savedAethelgardProj.id;
  tower.project = savedAethelgardProj;
  tower.name = 'Tower A - Sapphire';
  tower.description = 'Premier luxury tower containing super penthouses.';
  const savedTower = await towerRepo.save(tower);

  // Seed Floors 1 to 3
  for (let f = 1; f <= 3; f++) {
    const floor = new Floor();
    floor.tenantId = savedAethelgard.id;
    floor.towerId = savedTower.id;
    floor.tower = savedTower;
    floor.floorNumber = f;
    floor.description = `Exclusive Floor level ${f}`;
    const savedFloor = await floorRepo.save(floor);

    // Seed 3 Flats per Floor
    for (let flatNum = 1; flatNum <= 3; flatNum++) {
      const flat = new Flat();
      flat.tenantId = savedAethelgard.id;
      flat.floorId = savedFloor.id;
      flat.floor = savedFloor;
      flat.flatNumber = `${f}0${flatNum}`;
      flat.status = flatNum === 2 ? 'BOOKED' : flatNum === 3 ? 'HOLD' : 'AVAILABLE';
      flat.sizeSqFt = flatNum === 3 ? 4200 : 2200 + flatNum * 200;
      flat.price = flatNum === 3 ? 85000000 : (20000000 + flatNum * 5000000);
      flat.type = flatNum === 3 ? 'PENTHOUSE' : flatNum === 2 ? '3BHK' : '2BHK';
      flat.orientation = flatNum === 1 ? 'East Facing' : 'West Facing';
      flat.description = `Luxury flat ${flat.flatNumber} with elegant views.`;
      await flatRepo.save(flat);
    }
  }

  console.log('Seeding CRM Leads...');
  const lead1 = new Lead();
  lead1.tenantId = savedAethelgard.id;
  lead1.name = 'Abhishek Kumar';
  lead1.email = 'abhishek@gmail.com';
  lead1.phone = '+91 9876543210';
  lead1.projectId = savedAethelgardProj.id;
  lead1.project = savedAethelgardProj;
  lead1.status = 'NEW';
  lead1.notes = 'Interested in the 3BHK flat on Floor 2. Needs a callback tomorrow.';
  await leadRepo.save(lead1);

  const lead2 = new Lead();
  lead2.tenantId = savedAethelgard.id;
  lead2.name = 'Rohan Sharma';
  lead2.email = 'rohan@sharma.in';
  lead2.phone = '+91 9123456789';
  lead2.projectId = savedAethelgardProj.id;
  lead2.project = savedAethelgardProj;
  lead2.status = 'CONTACTED';
  lead2.notes = 'Visited the sky virtual tour. Ready to book the Sapphire Penthouse.';
  await leadRepo.save(lead2);

  console.log('--- DB SEEDING COMPLETED SUCCESS (PHASE 1) ---');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('Seeding script failed:', err);
});
