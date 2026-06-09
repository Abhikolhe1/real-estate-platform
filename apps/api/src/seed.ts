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
import { Theme } from './entities/theme.entity';
import { WebsiteSection } from './entities/website-section.entity';
import { Component } from './entities/component.entity';
import { NavigationMenu } from './entities/navigation-menu.entity';
import { NavigationItem } from './entities/navigation-item.entity';
import { AnimationPreset } from './entities/animation-preset.entity';
import { DigitalTwinModel } from './entities/digital-twin-model.entity';
import { CameraPoint } from './entities/camera-point.entity';
import { Hotspot } from './entities/hotspot.entity';
import { TourRoute } from './entities/tour-route.entity';
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
  const permRepo = dataSource.getRepository(Permission);
  const roleRepo = dataSource.getRepository(Role);
  const themeRepo = dataSource.getRepository(Theme);
  const sectionRepo = dataSource.getRepository(WebsiteSection);
  const componentRepo = dataSource.getRepository(Component);
  const menuRepo = dataSource.getRepository(NavigationMenu);
  const itemRepo = dataSource.getRepository(NavigationItem);
  const presetRepo = dataSource.getRepository(AnimationPreset);
  const modelRepo = dataSource.getRepository(DigitalTwinModel);
  const pointRepo = dataSource.getRepository(CameraPoint);
  const hotspotRepo = dataSource.getRepository(Hotspot);
  const tourRepo = dataSource.getRepository(TourRoute);

  // Clear existing tables in correct order using a cascading truncate raw query
  console.log('Cleaning old records...');
  await dataSource.query('TRUNCATE TABLE pages, leads, flats, floors, towers, projects, users, builders, role_permissions, user_roles, roles, permissions, themes, media, audit_logs, website_sections, components, navigation_menus, navigation_items, animation_presets, digital_twin_models, camera_points, hotspots, tour_routes, sdk_keys, embed_configs, analytics_events CASCADE;');

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

  console.log('Seeding Themes...');
  // Aethelgard Theme
  const aethelgardTheme = new Theme();
  aethelgardTheme.tenantId = savedAethelgard.id;
  aethelgardTheme.builder = savedAethelgard;
  aethelgardTheme.name = 'Luxury Gold & Obsidian';
  aethelgardTheme.primaryColor = '#d4af37';
  aethelgardTheme.secondaryColor = '#131313';
  aethelgardTheme.fontHeader = 'Bodoni Moda';
  aethelgardTheme.fontBody = 'Hanken Grotesk';
  aethelgardTheme.buttonStyle = 'square';
  aethelgardTheme.cardStyle = 'glass';
  await themeRepo.save(aethelgardTheme);

  // OmniEstate Theme
  const omniTheme = new Theme();
  omniTheme.tenantId = savedOmniestate.id;
  omniTheme.builder = savedOmniestate;
  omniTheme.name = 'Clean Modern Corporate';
  omniTheme.primaryColor = '#3b82f6';
  omniTheme.secondaryColor = '#1e293b';
  omniTheme.fontHeader = 'Outfit';
  omniTheme.fontBody = 'Inter';
  omniTheme.buttonStyle = 'rounded';
  omniTheme.cardStyle = 'shadow';
  await themeRepo.save(omniTheme);

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

  console.log('Seeding Animation Presets...');
  const presets = [
    { name: 'Smooth Fade Up', type: 'fade-up', duration: 1.2, delay: 0.3, easing: 'power3.out' },
    { name: 'Smooth Fade Down', type: 'fade-down', duration: 1.2, delay: 0.3, easing: 'power3.out' },
    { name: 'Smooth Fade Left', type: 'fade-left', duration: 1.2, delay: 0.3, easing: 'power3.out' },
    { name: 'Smooth Fade Right', type: 'fade-right', duration: 1.2, delay: 0.3, easing: 'power3.out' },
    { name: 'Zoom In', type: 'zoom', duration: 1.5, delay: 0.2, easing: 'power2.inOut' },
    { name: 'Scale Accent', type: 'scale', duration: 1.0, delay: 0.1, easing: 'back.out(1.7)' },
    { name: 'Slow Rotate', type: 'rotate', duration: 2.0, delay: 0.1, easing: 'power1.out' },
    { name: 'Parallax Effect', type: 'parallax', duration: 1.0, delay: 0.0, easing: 'none' },
  ];
  for (const p of presets) {
    const preset = new AnimationPreset();
    preset.name = p.name;
    preset.type = p.type;
    preset.duration = p.duration;
    preset.delay = p.delay;
    preset.easing = p.easing;
    await presetRepo.save(preset);
  }

  console.log('Seeding Navigation Menus...');
  // Aethelgard Menus
  const aethelgardHeader = new NavigationMenu();
  aethelgardHeader.tenantId = savedAethelgard.id;
  aethelgardHeader.name = 'Header';
  const savedAethelgardHeader = await menuRepo.save(aethelgardHeader);

  const aethelgardFooter = new NavigationMenu();
  aethelgardFooter.tenantId = savedAethelgard.id;
  aethelgardFooter.name = 'Footer';
  const savedAethelgardFooter = await menuRepo.save(aethelgardFooter);

  // Aethelgard Menu Items
  const aethelgardHeaderItems = [
    { title: 'Home', url: '/', orderNo: 1 },
    { title: 'About', url: '/about', orderNo: 2 },
    { title: 'Amenities', url: '/amenities', orderNo: 3 },
    { title: 'Gallery', url: '/gallery', orderNo: 4 },
    { title: 'Contact', url: '/contact', orderNo: 5 },
    { title: 'Virtual Tour', url: '/virtual-tour', orderNo: 6 },
  ];
  for (const itemData of aethelgardHeaderItems) {
    const item = new NavigationItem();
    item.menu = savedAethelgardHeader;
    item.menuId = savedAethelgardHeader.id;
    item.title = itemData.title;
    item.url = itemData.url;
    item.orderNo = itemData.orderNo;
    await itemRepo.save(item);
  }

  const aethelgardFooterItems = [
    { title: 'Privacy Policy', url: '/privacy', orderNo: 1 },
    { title: 'Terms of Service', url: '/terms', orderNo: 2 },
    { title: 'Contact Us', url: '/contact', orderNo: 3 },
  ];
  for (const itemData of aethelgardFooterItems) {
    const item = new NavigationItem();
    item.menu = savedAethelgardFooter;
    item.menuId = savedAethelgardFooter.id;
    item.title = itemData.title;
    item.url = itemData.url;
    item.orderNo = itemData.orderNo;
    await itemRepo.save(item);
  }

  // OmniEstate Menus
  const omniHeader = new NavigationMenu();
  omniHeader.tenantId = savedOmniestate.id;
  omniHeader.name = 'Header';
  const savedOmniHeader = await menuRepo.save(omniHeader);

  const omniHeaderItems = [
    { title: 'Home', url: '/', orderNo: 1 },
    { title: 'Amenities', url: '/amenities', orderNo: 2 },
    { title: 'Contact', url: '/contact', orderNo: 3 },
  ];
  for (const itemData of omniHeaderItems) {
    const item = new NavigationItem();
    item.menu = savedOmniHeader;
    item.menuId = savedOmniHeader.id;
    item.title = itemData.title;
    item.url = itemData.url;
    item.orderNo = itemData.orderNo;
    await itemRepo.save(item);
  }

  console.log('Seeding Website Layout Sections...');
  // Aethelgard Pages
  const aethelgardPages = [
    {
      slug: 'home',
      title: 'Aethelgard Luxury Home Page',
      seoTitle: 'Aethelgard Luxury Residences | Sky Penthouses',
      seoDescription: 'Experience the pinnacle of luxury penthouse living at Aethelgard. Book a private showing.',
      sections: [
        {
          type: 'hero',
          orderNo: 1,
          configJson: {
            title: 'The Peak of Luxury Living',
            subtitle: 'Aethelgard Sky Penthouses',
            buttonText: 'Book Site Visit',
            buttonUrl: '#inquiry',
            backgroundImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeasfkI_suwcpRV_6250zNvP_BR0KoVsvLqrSxx8cmogEnaRDVVenavhi_YCekm4SaL6VvvdrbJLazm7giBQmN10B0oeeJTqtjHOVhx3AaxHqBMhemyrPk_cPi0wZ2WPm3tZZ-bgCnHIc4hDHEJGP7r-4hICejzEoyn9w96UHDAsF9-a4UQ0o-iQosIaniAZ71fTzoSLh6IdeTt48bOcV261qD2msDZuAW99EkUeeFoDW3tUygEMkSn9at1VY5V3lnpb_DgeSNc9E',
            animation: 'fade-up',
            duration: 1.2,
            delay: 0.3
          }
        },
        {
          type: 'features',
          orderNo: 2,
          configJson: {
            title: 'THE CONCEPT',
            subtitle: 'A New Paradigm of Architectural Artistry',
            description: 'Designed by the visionaries at Aethelgard, this residence is more than a home; it is a meticulously crafted gallery for life. Every slab of marble, every brushed brass fitting, and every panoramic glass pane is curated to provide a sensory experience.',
            features: [
              {
                title: 'Private Terraces',
                subtitle: 'Luxury Sky Suites',
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuALub8tldhZ_oMsDBRNKvmeXkewkHSlaNawnWde8Xoltrq0FSdntj93gg8_tlgdCPs1sX8IUmXuDlrojoVQ9QLZjHLlaeN41Qp_MiMdpQ2C1neDNmt9MWzLGhTG6IiOVbDfeZbT8ip3VFdJ5gjtfB8mQj-9uU6Ear6AraJyfkHXMyT7S-q7BLRg0NQO3d1J_lhzuXOsyTBKlhZOKt0d2LNE5__yhPDr1aL2pU1cGStdoz1seLCZxe7JpdEIkwyWYpBxdOcVXoeUaEY'
              },
              {
                title: 'Infinity Oasis',
                subtitle: 'Panoramic Rooftop Pool',
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAr28uHqFUXU1-6oqJKy3H8H0P8wAh2ZOivH0xSDCfso4Y_Xb1gI-e8rBONeD9EF-H27ir1ARdke5aDiY1CvNLqDuihLjYmGKq1MoFG4Gl1LCXLHboR5rnB0LWIZnjPYXI4JBBVc_mHNuqF5FaaqjudHxOFXXErQBlWNhEfyoQXA7iWevn8AMNmdzjSalTnZ775wingAAKF2urxtQ-OSe0_bBOzzpU6HnTu4efJV85W_Y0VFve4ibvEtwe5_Ts1eB1tQxMwTe3wpsY'
              }
            ],
            animation: 'fade-left',
            duration: 1.2,
            delay: 0.3
          }
        },
        {
          type: 'gallery',
          orderNo: 3,
          configJson: {
            title: 'Cinematic Gallery',
            subtitle: 'A Visual Walkthrough of Elegance',
            images: [
              'https://lh3.googleusercontent.com/aida-public/AB6AXuALub8tldhZ_oMsDBRNKvmeXkewkHSlaNawnWde8Xoltrq0FSdntj93gg8_tlgdCPs1sX8IUmXuDlrojoVQ9QLZjHLlaeN41Qp_MiMdpQ2C1neDNmt9MWzLGhTG6IiOVbDfeZbT8ip3VFdJ5gjtfB8mQj-9uU6Ear6AraJyfkHXMyT7S-q7BLRg0NQO3d1J_lhzuXOsyTBKlhZOKt0d2LNE5__yhPDr1aL2pU1cGStdoz1seLCZxe7JpdEIkwyWYpBxdOcVXoeUaEY',
              'https://lh3.googleusercontent.com/aida-public/AB6AXuAr28uHqFUXU1-6oqJKy3H8H0P8wAh2ZOivH0xSDCfso4Y_Xb1gI-e8rBONeD9EF-H27ir1ARdke5aDiY1CvNLqDuihLjYmGKq1MoFG4Gl1LCXLHboR5rnB0LWIZnjPYXI4JBBVc_mHNuqF5FaaqjudHxOFXXErQBlWNhEfyoQXA7iWevn8AMNmdzjSalTnZ775wingAAKF2urxtQ-OSe0_bBOzzpU6HnTu4efJV85W_Y0VFve4ibvEtwe5_Ts1eB1tQxMwTe3wpsY'
            ],
            animation: 'zoom',
            duration: 1.5,
            delay: 0.2
          }
        },
        {
          type: 'amenities',
          orderNo: 4,
          configJson: {
            title: 'World-Class Amenities',
            subtitle: 'Everything you need for a premium life',
            amenities: [
              'Rooftop Infinity Pool',
              'Private Wine Cellar',
              '24/7 Premium Concierge',
              'State-of-the-Art Gymnasium',
              'Private Mini Theatre',
              'Wellness Spa & Sauna'
            ],
            animation: 'fade-right',
            duration: 1.2,
            delay: 0.2
          }
        },
        {
          type: 'cta',
          orderNo: 5,
          configJson: {
            title: 'Experience Aethelgard Sky Penthouses',
            subtitle: 'Book a virtual or in-person walk-through of our premium residences.',
            buttonText: 'Schedule a Showing',
            buttonUrl: '#inquiry',
            animation: 'zoom',
            duration: 1.0,
            delay: 0.1
          }
        },
        {
          type: 'contact',
          orderNo: 6,
          configJson: {
            title: 'Schedule Private Viewing',
            subtitle: 'Submit your details to experience Aethelgard firsthand.',
            buttonText: 'Submit Inquiry',
            animation: 'fade-up',
            duration: 1.0,
            delay: 0.1
          }
        }
      ]
    },
    {
      slug: 'about',
      title: 'About Aethelgard',
      seoTitle: 'About Us | Aethelgard Luxury Residences',
      seoDescription: 'Learn about Aethelgard history, vision, and architectural accomplishments.',
      sections: [
        {
          type: 'hero',
          orderNo: 1,
          configJson: {
            title: 'Crafting Architectural Icons',
            subtitle: 'About Aethelgard Residences',
            backgroundImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeasfkI_suwcpRV_6250zNvP_BR0KoVsvLqrSxx8cmogEnaRDVVenavhi_YCekm4SaL6VvvdrbJLazm7giBQmN10B0oeeJTqtjHOVhx3AaxHqBMhemyrPk_cPi0wZ2WPm3tZZ-bgCnHIc4hDHEJGP7r-4hICejzEoyn9w96UHDAsF9-a4UQ0o-iQosIaniAZ71fTzoSLh6IdeTt48bOcV261qD2msDZuAW99EkUeeFoDW3tUygEMkSn9at1VY5V3lnpb_DgeSNc9E',
            animation: 'fade-up',
            duration: 1.2,
            delay: 0.1
          }
        },
        {
          type: 'features',
          orderNo: 2,
          configJson: {
            title: 'OUR HISTORY',
            subtitle: 'Over Two Decades of Uncompromising Quality',
            description: 'Founded with a simple vision to bridge the gap between structure and art, Aethelgard has completed over 15 iconic super-luxury highrises. We continue to redefine urban skylines globally.',
            features: [],
            animation: 'fade-up',
            duration: 1.0,
            delay: 0.2
          }
        }
      ]
    },
    {
      slug: 'amenities',
      title: 'Amenities',
      seoTitle: 'Amenities & Facilities | Aethelgard',
      seoDescription: 'Explore the full list of rooftop pools, lounges, clubhouses, and wellness facilities.',
      sections: [
        {
          type: 'hero',
          orderNo: 1,
          configJson: {
            title: 'A Private Sanctuary of Leisure',
            subtitle: 'Aethelgard Premium Amenities',
            backgroundImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAr28uHqFUXU1-6oqJKy3H8H0P8wAh2ZOivH0xSDCfso4Y_Xb1gI-e8rBONeD9EF-H27ir1ARdke5aDiY1CvNLqDuihLjYmGKq1MoFG4Gl1LCXLHboR5rnB0LWIZnjPYXI4JBBVc_mHNuqF5FaaqjudHxOFXXErQBlWNhEfyoQXA7iWevn8AMNmdzjSalTnZ775wingAAKF2urxtQ-OSe0_bBOzzpU6HnTu4efJV85W_Y0VFve4ibvEtwe5_Ts1eB1tQxMwTe3wpsY',
            animation: 'fade-up',
            duration: 1.2,
            delay: 0.1
          }
        },
        {
          type: 'amenities',
          orderNo: 2,
          configJson: {
            title: 'Premium Club Facilities',
            subtitle: 'Exclusively accessible for Aethelgard owners',
            amenities: ['Skyline Infinity Pool', 'Bespoke Fitness Center', 'Private Spa Suite', 'Cigar and Whiskey Lounge', 'Executive Boardroom', 'Valet Parking & EV Charging Stations'],
            animation: 'fade-up',
            duration: 1.0,
            delay: 0.2
          }
        }
      ]
    },
    {
      slug: 'contact',
      title: 'Contact Us',
      seoTitle: 'Contact Our Executives | Aethelgard',
      seoDescription: 'Schedule a private consultation or tour of our model penthouse.',
      sections: [
        {
          type: 'hero',
          orderNo: 1,
          configJson: {
            title: 'Experience personalized consultations',
            subtitle: 'Get in Touch',
            backgroundImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeasfkI_suwcpRV_6250zNvP_BR0KoVsvLqrSxx8cmogEnaRDVVenavhi_YCekm4SaL6VvvdrbJLazm7giBQmN10B0oeeJTqtjHOVhx3AaxHqBMhemyrPk_cPi0wZ2WPm3tZZ-bgCnHIc4hDHEJGP7r-4hICejzEoyn9w96UHDAsF9-a4UQ0o-iQosIaniAZ71fTzoSLh6IdeTt48bOcV261qD2msDZuAW99EkUeeFoDW3tUygEMkSn9at1VY5V3lnpb_DgeSNc9E',
            animation: 'fade-up',
            duration: 1.0,
            delay: 0.1
          }
        },
        {
          type: 'contact',
          orderNo: 2,
          configJson: {
            title: 'Request Site Visit',
            subtitle: 'Fill out the form below to lock in your showing window.',
            buttonText: 'Submit Inquiry',
            animation: 'fade-up',
            duration: 1.0,
            delay: 0.2
          }
        }
      ]
    },
    {
      slug: 'virtual-tour',
      title: 'Virtual Tour',
      seoTitle: '3D Virtual VR Tour | Aethelgard',
      seoDescription: 'Step inside Aethelgard virtual reality and explore our penthouses in 3D.',
      sections: [
        {
          type: 'hero',
          orderNo: 1,
          configJson: {
            title: 'Step inside Aethelgard virtual reality',
            subtitle: 'Interactive Experience',
            backgroundImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeasfkI_suwcpRV_6250zNvP_BR0KoVsvLqrSxx8cmogEnaRDVVenavhi_YCekm4SaL6VvvdrbJLazm7giBQmN10B0oeeJTqtjHOVhx3AaxHqBMhemyrPk_cPi0wZ2WPm3tZZ-bgCnHIc4hDHEJGP7r-4hICejzEoyn9w96UHDAsF9-a4UQ0o-iQosIaniAZ71fTzoSLh6IdeTt48bOcV261qD2msDZuAW99EkUeeFoDW3tUygEMkSn9at1VY5V3lnpb_DgeSNc9E',
            animation: 'fade-up',
            duration: 1.2,
            delay: 0.1
          }
        },
        {
          type: 'video',
          orderNo: 2,
          configJson: {
            title: 'Virtual Walkthrough Video',
            subtitle: 'A cinematic aerial capture of our skyscraper',
            videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-luxury-home-with-swimming-pool-and-palm-trees-43224-large.mp4',
            animation: 'fade-up',
            duration: 1.2,
            delay: 0.3
          }
        }
      ]
    }
  ];

  for (const pageData of aethelgardPages) {
    const page = new Page();
    page.tenantId = savedAethelgard.id;
    page.slug = pageData.slug;
    page.title = pageData.title;
    page.seoTitle = pageData.seoTitle;
    page.seoDescription = pageData.seoDescription;
    page.isActive = true;
    page.status = 'published';
    const savedPage = await pageRepo.save(page);

    for (const secData of pageData.sections) {
      const section = new WebsiteSection();
      section.page = savedPage;
      section.pageId = savedPage.id;
      section.type = secData.type;
      section.orderNo = secData.orderNo;
      section.configJson = secData.configJson;
      await sectionRepo.save(section);
    }
  }

  // OmniEstate Pages
  const omniPages = [
    {
      slug: 'home',
      title: 'OmniEstate Home Page',
      seoTitle: 'OmniEstate Developers | Oceanfront Suites',
      seoDescription: 'Find beautiful signature seafront villas with access to private clubhouses.',
      sections: [
        {
          type: 'hero',
          orderNo: 1,
          configJson: {
            title: 'Oceanfront Luxury Living',
            subtitle: 'OmniEstate Seafront Villas',
            buttonText: 'Request Brochure',
            buttonUrl: '#inquiry',
            backgroundImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeasfkI_suwcpRV_6250zNvP_BR0KoVsvLqrSxx8cmogEnaRDVVenavhi_YCekm4SaL6VvvdrbJLazm7giBQmN10B0oeeJTqtjHOVhx3AaxHqBMhemyrPk_cPi0wZ2WPm3tZZ-bgCnHIc4hDHEJGP7r-4hICejzEoyn9w96UHDAsF9-a4UQ0o-iQosIaniAZ71fTzoSLh6IdeTt48bOcV261qD2msDZuAW99EkUeeFoDW3tUygEMkSn9at1VY5V3lnpb_DgeSNc9E',
            animation: 'fade-up',
            duration: 1.0,
            delay: 0.1
          }
        },
        {
          type: 'features',
          orderNo: 2,
          configJson: {
            title: 'Premium Features',
            subtitle: 'Crafted with premium materials',
            description: 'All seafront villas come standard with high-speed private elevators, smart climate control systems, and panoramic double-glazed noise-dampening glass.',
            features: [],
            animation: 'fade-up',
            duration: 1.0,
            delay: 0.2
          }
        },
        {
          type: 'contact',
          orderNo: 3,
          configJson: {
            title: 'Submit Inquiry',
            subtitle: 'Our sales executives will reply within 12 hours.',
            buttonText: 'Send Message',
            animation: 'fade-up',
            duration: 1.0,
            delay: 0.3
          }
        }
      ]
    }
  ];

  for (const pageData of omniPages) {
    const page = new Page();
    page.tenantId = savedOmniestate.id;
    page.slug = pageData.slug;
    page.title = pageData.title;
    page.seoTitle = pageData.seoTitle;
    page.seoDescription = pageData.seoDescription;
    page.isActive = true;
    page.status = 'published';
    const savedPage = await pageRepo.save(page);

    for (const secData of pageData.sections) {
      const section = new WebsiteSection();
      section.page = savedPage;
      section.pageId = savedPage.id;
      section.type = secData.type;
      section.orderNo = secData.orderNo;
      section.configJson = secData.configJson;
      await sectionRepo.save(section);
    }
  }

  console.log('Seeding Digital Twin Models, Camera Points, Hotspots, and Tour Routes...');
  // 1. Seed Exterior Twin Model
  const exteriorTwin = new DigitalTwinModel();
  exteriorTwin.tenantId = savedAethelgard.id;
  exteriorTwin.projectId = savedAethelgardProj.id;
  exteriorTwin.name = 'Aethelgard Sky Tower Exterior';
  exteriorTwin.modelUrl = '/building.glb';
  exteriorTwin.modelType = 'exterior';
  exteriorTwin.fileSize = 257516;
  exteriorTwin.status = 'active';
  const savedExtModel = await modelRepo.save(exteriorTwin);

  // 2. Seed Interior Walkthrough Model
  const interiorWalkthrough = new DigitalTwinModel();
  interiorWalkthrough.tenantId = savedAethelgard.id;
  interiorWalkthrough.projectId = savedAethelgardProj.id;
  interiorWalkthrough.name = 'Luxury Corridor & Suites';
  interiorWalkthrough.modelUrl = '/floor_walkthrough.glb';
  interiorWalkthrough.modelType = 'interior';
  interiorWalkthrough.fileSize = 267956;
  interiorWalkthrough.status = 'active';
  const savedIntModel = await modelRepo.save(interiorWalkthrough);

  // 3. Seed Camera Points for Walkthrough Model
  const cameraPointsData = [
    { name: 'Lobby Entrance', posX: 0, posY: 1.6, posZ: 4.0, targetX: 0, targetY: 1.6, targetZ: 4.05 },
    { name: 'Corridor Center', posX: 0, posY: 1.6, posZ: 2.0, targetX: 0, targetY: 1.6, targetZ: 2.05 },
    { name: 'Flat A Living Room', posX: -5.5, posY: 1.6, posZ: 4.0, targetX: -5.55, targetY: 1.6, targetZ: 4.0 },
    { name: 'Flat B Living Room', posX: 5.5, posY: 1.6, posZ: 4.0, targetX: 5.55, targetY: 1.6, targetZ: 4.0 },
    { name: 'Flat C Master Suite', posX: 0, posY: 1.6, posZ: 7.5, targetX: 0, targetY: 1.6, targetZ: 7.55 }
  ];
  for (const pt of cameraPointsData) {
    const point = new CameraPoint();
    point.tenantId = savedAethelgard.id;
    point.modelId = savedIntModel.id;
    point.name = pt.name;
    point.posX = pt.posX;
    point.posY = pt.posY;
    point.posZ = pt.posZ;
    point.targetX = pt.targetX;
    point.targetY = pt.targetY;
    point.targetZ = pt.targetZ;
    await pointRepo.save(point);
  }

  // 4. Seed Hotspots
  // Exterior hotspots
  const extHotspot1 = new Hotspot();
  extHotspot1.tenantId = savedAethelgard.id;
  extHotspot1.modelId = savedExtModel.id;
  extHotspot1.name = 'Penthouse Zone';
  extHotspot1.type = 'info';
  extHotspot1.posX = 0;
  extHotspot1.posY = 26.5;
  extHotspot1.posZ = 3.5;
  extHotspot1.contentJson = {
    title: 'Signature Sky Penthouses',
    description: 'Ultra-exclusive residential units on the top floors featuring private infinity pools, panoramic terraces, and double-height living spaces.'
  };
  await hotspotRepo.save(extHotspot1);

  const extHotspot2 = new Hotspot();
  extHotspot2.tenantId = savedAethelgard.id;
  extHotspot2.modelId = savedExtModel.id;
  extHotspot2.name = 'Rooftop Amenities';
  extHotspot2.type = 'brochure';
  extHotspot2.posX = -1.5;
  extHotspot2.posY = 13.2;
  extHotspot2.posZ = -4.0;
  extHotspot2.contentJson = {
    title: 'Amenities Oasis & Club',
    description: 'Equipped with a wellness center, glass-walled gym, heated infinity pool, and sky lounge. Explore the brochure layout.',
    linkUrl: '/amenities'
  };
  await hotspotRepo.save(extHotspot2);

  // Interior hotspots
  const intHotspot1 = new Hotspot();
  intHotspot1.tenantId = savedAethelgard.id;
  intHotspot1.modelId = savedIntModel.id;
  intHotspot1.name = 'Flat A Pricing';
  intHotspot1.type = 'pricing';
  intHotspot1.posX = -5.0;
  intHotspot1.posY = 1.5;
  intHotspot1.posZ = 3.5;
  intHotspot1.contentJson = {
    title: 'Suite A - East Wing Luxury',
    description: 'An elegantly proportioned 2BHK flat featuring open view balconies and modular kitchen integrations.',
    price: 30000000,
    flatNumber: '101'
  };
  await hotspotRepo.save(intHotspot1);

  const intHotspot2 = new Hotspot();
  intHotspot2.tenantId = savedAethelgard.id;
  intHotspot2.modelId = savedIntModel.id;
  intHotspot2.name = 'Tour Guide Video';
  intHotspot2.type = 'video';
  intHotspot2.posX = 1.5;
  intHotspot2.posY = 1.6;
  intHotspot2.posZ = 3.0;
  intHotspot2.contentJson = {
    title: 'Reception Lobby Walkthrough',
    description: 'View the cinematic guided description detailing the architectural highlights of our designer reception lobby.',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-luxury-home-with-swimming-pool-and-palm-trees-43224-large.mp4'
  };
  await hotspotRepo.save(intHotspot2);

  const intHotspot3 = new Hotspot();
  intHotspot3.tenantId = savedAethelgard.id;
  intHotspot3.modelId = savedIntModel.id;
  intHotspot3.name = 'Book Site Visit CTA';
  intHotspot3.type = 'cta';
  intHotspot3.posX = 0;
  intHotspot3.posY = 1.6;
  intHotspot3.posZ = 8.0;
  intHotspot3.contentJson = {
    title: 'Schedule Private Showing',
    description: 'Ready to visit our model apartments in person? Connect directly with a dedicated Relationship Manager.',
    buttonText: 'Request Site Visit'
  };
  await hotspotRepo.save(intHotspot3);

  // 5. Seed Tour Route
  const tourRoute = new TourRoute();
  tourRoute.tenantId = savedAethelgard.id;
  tourRoute.modelId = savedIntModel.id;
  tourRoute.routeName = 'Standard Guided Walkthrough';
  tourRoute.routeJson = cameraPointsData;
  await tourRepo.save(tourRoute);

  console.log('--- DB SEEDING COMPLETED SUCCESS ---');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('Seeding script failed:', err);
});
