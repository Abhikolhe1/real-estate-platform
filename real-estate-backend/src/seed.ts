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
import * as bcrypt from 'bcryptjs';

async function bootstrap() {
  console.log('--- DB SEEDING STARTED ---');
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

  // Clear existing tables in correct order using a cascading truncate raw query
  console.log('Cleaning old records...');
  await dataSource.query('TRUNCATE TABLE pages, leads, flats, floors, towers, projects, users, builders CASCADE;');

  console.log('Seeding Builders...');
  // 1. Aethelgard Builder
  const aethelgard = new Builder();
  aethelgard.id = 'b0d39e2a-1cbe-4c28-bbbe-e6e788e99aa2';
  aethelgard.name = 'Aethelgard Luxury Residences';
  aethelgard.slug = 'aethelgard';
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
  superAdmin.tenantId = undefined;
  await userRepo.save(superAdmin);

  // Aethelgard Admin
  const aethelgardAdmin = new User();
  aethelgardAdmin.email = 'admin@aethelgard.com';
  aethelgardAdmin.passwordHash = passwordHash;
  aethelgardAdmin.firstName = 'Aethelgard';
  aethelgardAdmin.lastName = 'Admin';
  aethelgardAdmin.role = 'BUILDER_ADMIN';
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
  lead1.status = 'WARM';
  lead1.notes = 'Interested in the 3BHK flat on Floor 2. Needs a callback tomorrow.';
  await leadRepo.save(lead1);

  const lead2 = new Lead();
  lead2.tenantId = savedAethelgard.id;
  lead2.name = 'Rohan Sharma';
  lead2.email = 'rohan@sharma.in';
  lead2.phone = '+91 9123456789';
  lead2.projectId = savedAethelgardProj.id;
  lead2.project = savedAethelgardProj;
  lead2.status = 'HOT';
  lead2.notes = 'Visited the sky virtual tour. Ready to book the Sapphire Penthouse.';
  await leadRepo.save(lead2);

  console.log('Seeding Website Layout Sections...');
  const page = new Page();
  page.tenantId = savedAethelgard.id;
  page.slug = 'home';
  page.title = 'Aethelgard Luxury Home Page';
  page.isActive = true;
  page.sections = [
    { id: 'hero', name: 'Cinematic Hero', isActive: true, content: { title: 'The Peak of Luxury Living', subtitle: 'Aethelgard Sky Penthouses' } },
    { id: 'concept', name: 'Luxury Concept', isActive: true },
    { id: 'gallery', name: 'Cinematic Gallery', isActive: true },
    { id: 'amenities', name: 'Amenities', isActive: true },
    { id: 'location', name: 'Location Map', isActive: true },
    { id: 'contact', name: 'Booking Form', isActive: true },
  ];
  await pageRepo.save(page);

  console.log('--- DB SEEDING COMPLETED SUCCESS ---');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('Seeding script failed:', err);
});
