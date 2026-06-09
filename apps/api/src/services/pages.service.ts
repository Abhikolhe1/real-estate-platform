import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Page } from '../entities/page.entity';
import { WebsiteSection } from '../entities/website-section.entity';
import { Builder } from '../entities/builder.entity';
import { PageRevision } from '../entities/page-revision.entity';

@Injectable()
export class PagesService {
  constructor(
    @InjectRepository(Page)
    private readonly pageRepo: Repository<Page>,
    @InjectRepository(WebsiteSection)
    private readonly sectionRepo: Repository<WebsiteSection>,
    @InjectRepository(Builder)
    private readonly builderRepo: Repository<Builder>,
    @InjectRepository(PageRevision)
    private readonly revisionRepo: Repository<PageRevision>,
  ) {}

  // List all pages
  async getPages(tenantId: string): Promise<Page[]> {
    return this.pageRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  // Get single page by ID
  async getPageById(tenantId: string, id: string): Promise<Page> {
    const page = await this.pageRepo.findOne({
      where: { id, tenantId },
      relations: ['websiteSections'],
    });

    if (!page) {
      throw new NotFoundException(`Page with ID ${id} not found`);
    }

    // Sort sections in memory by orderNo
    page.websiteSections = (page.websiteSections || []).sort((a, b) => a.orderNo - b.orderNo);
    return page;
  }

  // Get single page by slug
  async getPageBySlug(headerTenantId: string, slug: string, builderSlug?: string): Promise<any> {
    let finalTenantId = headerTenantId;

    // Fallback: If no tenant header is provided but builderSlug query is present, lookup builder
    if (builderSlug && (!finalTenantId || finalTenantId === '00000000-0000-0000-0000-000000000000')) {
      const builder = await this.builderRepo.findOne({ where: { slug: builderSlug } });
      if (builder) {
        finalTenantId = builder.id;
      }
    }

    const page = await this.pageRepo.findOne({
      where: { slug, tenantId: finalTenantId },
      relations: ['websiteSections'],
    });

    if (!page) {
      // Return systemic default layout so the client page never crashes
      return {
        id: 'boilerplate',
        slug,
        title: 'Boilerplate Layout',
        status: 'published',
        seoTitle: 'Luxury Real Estate',
        seoDescription: 'Premium highrise penthouses and premium residences.',
        websiteSections: [
          {
            id: 'hero',
            type: 'hero',
            orderNo: 1,
            configJson: {
              title: 'The Peak of Luxury Living',
              subtitle: 'Premium Residences',
              buttonText: 'Book Site Visit',
              buttonUrl: '#inquiry',
              backgroundImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeasfkI_suwcpRV_6250zNvP_BR0KoVsvLqrSxx8cmogEnaRDVVenavhi_YCekm4SaL6VvvdrbJLazm7giBQmN10B0oeeJTqtjHOVhx3AaxHqBMhemyrPk_cPi0wZ2WPm3tZZ-bgCnHIc4hDHEJGP7r-4hICejzEoyn9w96UHDAsF9-a4UQ0o-iQosIaniAZ71fTzoSLh6IdeTt48bOcV261qD2msDZuAW99EkUeeFoDW3tUygEMkSn9at1VY5V3lnpb_DgeSNc9E',
              animation: 'fade-up',
              duration: 1.2,
              delay: 0.3
            }
          },
          {
            id: 'concept',
            type: 'features',
            orderNo: 2,
            configJson: {
              title: 'THE CONCEPT',
              subtitle: 'A New Paradigm of Architectural Artistry',
              description: 'Exquisite modern layouts designed for high-end comfort and sensory experiences.',
              features: [],
              animation: 'fade-left',
              duration: 1.2,
              delay: 0.3
            }
          },
          {
            id: 'contact',
            type: 'contact',
            orderNo: 3,
            configJson: {
              title: 'Schedule Private Viewing',
              subtitle: 'Submit your details to experience luxury firsthand.',
              buttonText: 'Submit Inquiry',
              animation: 'fade-up',
              duration: 1.0,
              delay: 0.1
            }
          }
        ],
      };
    }

    // Sort sections in memory by orderNo
    page.websiteSections = (page.websiteSections || []).sort((a, b) => a.orderNo - b.orderNo);
    return page;
  }

  // Create page and pre-populate sections if a template is requested
  async createPage(
    tenantId: string,
    body: { title: string; slug: string; status?: string; seoTitle?: string; seoDescription?: string; template?: string },
  ): Promise<Page> {
    // Check if slug is unique for this tenant
    const existing = await this.pageRepo.findOne({ where: { slug: body.slug, tenantId } });
    if (existing) {
      throw new BadRequestException(`A page with slug "${body.slug}" already exists`);
    }

    const page = new Page();
    page.tenantId = tenantId;
    page.title = body.title;
    page.slug = body.slug;
    page.status = body.status || 'draft';
    page.seoTitle = body.seoTitle;
    page.seoDescription = body.seoDescription;
    page.isActive = true;
    page.sections = [];

    const savedPage = await this.pageRepo.save(page);

    // Apply template pre-population if requested
    if (body.template) {
      const templateSections = this.getTemplateSections(body.template);
      let orderNo = 1;
      for (const tSec of templateSections) {
        const sec = new WebsiteSection();
        sec.page = savedPage;
        sec.pageId = savedPage.id;
        sec.type = tSec.type;
        sec.orderNo = orderNo++;
        sec.configJson = tSec.configJson;
        await this.sectionRepo.save(sec);
      }
    }

    const finalPage = await this.getPageById(tenantId, savedPage.id);
    await this.createRevision(tenantId, finalPage.id);
    return finalPage;
  }

  // Update Page details
  async updatePage(
    tenantId: string,
    id: string,
    body: { title?: string; slug?: string; status?: string; seoTitle?: string; seoDescription?: string },
  ): Promise<Page> {
    const page = await this.getPageById(tenantId, id);

    if (body.slug && body.slug !== page.slug) {
      const existing = await this.pageRepo.findOne({ where: { slug: body.slug, tenantId } });
      if (existing) {
        throw new BadRequestException(`A page with slug "${body.slug}" already exists`);
      }
      page.slug = body.slug;
    }

    if (body.title !== undefined) page.title = body.title;
    if (body.status !== undefined) page.status = body.status;
    if (body.seoTitle !== undefined) page.seoTitle = body.seoTitle;
    if (body.seoDescription !== undefined) page.seoDescription = body.seoDescription;

    await this.pageRepo.save(page);
    await this.createRevision(tenantId, id);
    return this.getPageById(tenantId, id);
  }

  // Delete Page
  async deletePage(tenantId: string, id: string): Promise<boolean> {
    const page = await this.getPageById(tenantId, id);
    await this.pageRepo.remove(page);
    return true;
  }

  // Duplicate Page
  async duplicatePage(tenantId: string, id: string): Promise<Page> {
    const page = await this.getPageById(tenantId, id);

    // Create duplicated page record
    const duplicated = new Page();
    duplicated.tenantId = tenantId;
    duplicated.title = `Copy of ${page.title}`;
    duplicated.slug = `${page.slug}-copy-${Math.floor(Math.random() * 1000)}`;
    duplicated.status = 'draft'; // Duplicate defaults to draft
    duplicated.seoTitle = page.seoTitle;
    duplicated.seoDescription = page.seoDescription;
    duplicated.isActive = true;
    duplicated.sections = [];

    const savedDuplicated = await this.pageRepo.save(duplicated);

    // Duplicate all sections
    for (const originalSec of page.websiteSections) {
      const secCopy = new WebsiteSection();
      secCopy.page = savedDuplicated;
      secCopy.pageId = savedDuplicated.id;
      secCopy.type = originalSec.type;
      secCopy.orderNo = originalSec.orderNo;
      secCopy.configJson = JSON.parse(JSON.stringify(originalSec.configJson)); // Deep clone config
      await this.sectionRepo.save(secCopy);
    }

    const duplicatedPage = await this.getPageById(tenantId, savedDuplicated.id);
    await this.createRevision(tenantId, duplicatedPage.id);
    return duplicatedPage;
  }

  // Sections Operations
  async addSection(tenantId: string, pageId: string, body: { type: string; orderNo?: number; configJson?: any }): Promise<WebsiteSection> {
    const page = await this.getPageById(tenantId, pageId);
    
    // Auto-calculate orderNo if not provided
    let finalOrderNo = body.orderNo;
    if (finalOrderNo === undefined) {
      const count = page.websiteSections.length;
      finalOrderNo = count > 0 ? page.websiteSections[count - 1].orderNo + 1 : 1;
    }

    const section = new WebsiteSection();
    section.page = page;
    section.pageId = page.id;
    section.type = body.type;
    section.orderNo = finalOrderNo;
    section.configJson = body.configJson || this.getDefaultSectionConfig(body.type);

    const savedSec = await this.sectionRepo.save(section);
    await this.createRevision(tenantId, pageId);
    return savedSec;
  }

  async updateSection(tenantId: string, pageId: string, sectionId: string, body: { type?: string; orderNo?: number; configJson?: any }): Promise<WebsiteSection> {
    // Verify page belongs to tenant
    await this.getPageById(tenantId, pageId);

    const section = await this.sectionRepo.findOne({ where: { id: sectionId, pageId } });
    if (!section) {
      throw new NotFoundException(`Section with ID ${sectionId} not found under this page`);
    }

    if (body.type !== undefined) section.type = body.type;
    if (body.orderNo !== undefined) section.orderNo = body.orderNo;
    if (body.configJson !== undefined) {
      section.configJson = {
        ...section.configJson,
        ...body.configJson,
      };
    }

    const savedSec = await this.sectionRepo.save(section);
    await this.createRevision(tenantId, pageId);
    return savedSec;
  }

  async deleteSection(tenantId: string, pageId: string, sectionId: string): Promise<boolean> {
    await this.getPageById(tenantId, pageId);

    const section = await this.sectionRepo.findOne({ where: { id: sectionId, pageId } });
    if (!section) {
      throw new NotFoundException(`Section with ID ${sectionId} not found under this page`);
    }

    await this.sectionRepo.remove(section);
    await this.createRevision(tenantId, pageId);
    return true;
  }

  // Batch update sections order
  async reorderSections(tenantId: string, pageId: string, sectionIds: string[]): Promise<Page> {
    const page = await this.getPageById(tenantId, pageId);

    for (let index = 0; index < sectionIds.length; index++) {
      const secId = sectionIds[index];
      const sec = page.websiteSections.find((s) => s.id === secId);
      if (sec) {
        sec.orderNo = index + 1;
        await this.sectionRepo.save(sec);
      }
    }

    await this.createRevision(tenantId, pageId);
    return this.getPageById(tenantId, pageId);
  }

  // Helper template definitions
  private getTemplateSections(template: string): Array<{ type: string; configJson: any }> {
    const baseHero = {
      title: 'Cinematic Dream Homes',
      subtitle: 'Built with Precision and Style',
      buttonText: 'Explore Units',
      buttonUrl: '#inventory',
      backgroundImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeasfkI_suwcpRV_6250zNvP_BR0KoVsvLqrSxx8cmogEnaRDVVenavhi_YCekm4SaL6VvvdrbJLazm7giBQmN10B0oeeJTqtjHOVhx3AaxHqBMhemyrPk_cPi0wZ2WPm3tZZ-bgCnHIc4hDHEJGP7r-4hICejzEoyn9w96UHDAsF9-a4UQ0o-iQosIaniAZ71fTzoSLh6IdeTt48bOcV261qD2msDZuAW99EkUeeFoDW3tUygEMkSn9at1VY5V3lnpb_DgeSNc9E',
      animation: 'fade-up',
      duration: 1.2,
      delay: 0.3
    };

    const baseContact = {
      title: 'Schedule a Consultation',
      subtitle: 'Submit your contact details and our relationship manager will call you shortly.',
      buttonText: 'Submit Inquiry',
      animation: 'fade-up',
      duration: 1.0,
      delay: 0.1
    };

    if (template === 'luxury') {
      return [
        { type: 'hero', configJson: baseHero },
        {
          type: 'features',
          configJson: {
            title: 'THE PARADIGM',
            subtitle: 'Redefining Highrise Living',
            description: 'Experience luxury elevated. Every marble stone, every panoramic glass panel reflects signature craftsmanship.',
            features: [
              { title: 'Private Sky Terraces', subtitle: 'Breathtaking 360 views', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuALub8tldhZ_oMsDBRNKvmeXkewkHSlaNawnWde8Xoltrq0FSdntj93gg8_tlgdCPs1sX8IUmXuDlrojoVQ9QLZjHLlaeN41Qp_MiMdpQ2C1neDNmt9MWzLGhTG6IiOVbDfeZbT8ip3VFdJ5gjtfB8mQj-9uU6Ear6AraJyfkHXMyT7S-q7BLRg0NQO3d1J_lhzuXOsyTBKlhZOKt0d2LNE5__yhPDr1aL2pU1cGStdoz1seLCZxe7JpdEIkwyWYpBxdOcVXoeUaEY' },
              { title: 'Obsidian Lounges', subtitle: 'Ultra-exclusive owners club', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAr28uHqFUXU1-6oqJKy3H8H0P8wAh2ZOivH0xSDCfso4Y_Xb1gI-e8rBONeD9EF-H27ir1ARdke5aDiY1CvNLqDuihLjYmGKq1MoFG4Gl1LCXLHboR5rnB0LWIZnjPYXI4JBBVc_mHNuqF5FaaqjudHxOFXXErQBlWNhEfyoQXA7iWevn8AMNmdzjSalTnZ775wingAAKF2urxtQ-OSe0_bBOzzpU6HnTu4efJV85W_Y0VFve4ibvEtwe5_Ts1eB1tQxMwTe3wpsY' }
            ],
            animation: 'fade-left'
          }
        },
        {
          type: 'gallery',
          configJson: {
            title: 'Visual Masterpieces',
            subtitle: 'A glance into curated spaces',
            images: [
              'https://lh3.googleusercontent.com/aida-public/AB6AXuALub8tldhZ_oMsDBRNKvmeXkewkHSlaNawnWde8Xoltrq0FSdntj93gg8_tlgdCPs1sX8IUmXuDlrojoVQ9QLZjHLlaeN41Qp_MiMdpQ2C1neDNmt9MWzLGhTG6IiOVbDfeZbT8ip3VFdJ5gjtfB8mQj-9uU6Ear6AraJyfkHXMyT7S-q7BLRg0NQO3d1J_lhzuXOsyTBKlhZOKt0d2LNE5__yhPDr1aL2pU1cGStdoz1seLCZxe7JpdEIkwyWYpBxdOcVXoeUaEY'
            ],
            animation: 'zoom'
          }
        },
        {
          type: 'amenities',
          configJson: {
            title: 'Resort Amenities',
            subtitle: 'Uncompromising wellness facilities',
            amenities: ['Skyline Infinity Pool', 'Bespoke Gym Suite', '24/7 Concierge Service', 'Private Wine Cellar'],
            animation: 'fade-right'
          }
        },
        {
          type: 'cta',
          configJson: {
            title: 'Acquire Your Sky Residence',
            subtitle: 'Seize the limited opportunity to own architectural genius.',
            buttonText: 'Request Booking details',
            buttonUrl: '#inquiry',
            animation: 'zoom'
          }
        },
        { type: 'contact', configJson: baseContact }
      ];
    } else if (template === 'commercial') {
      return [
        {
          type: 'hero',
          configJson: {
            ...baseHero,
            title: 'Modern Grade-A Office Spaces',
            subtitle: 'Futuristic Corporate Infrastructure'
          }
        },
        {
          type: 'features',
          configJson: {
            title: 'BUSINESS HUB',
            subtitle: 'Elegance Meets Technical Power',
            description: 'Equipped with fiber backbone, double-height lobbies, and intelligent green-building cooling tech.',
            features: [],
            animation: 'fade-up'
          }
        },
        {
          type: 'amenities',
          configJson: {
            title: 'Corporate Facilities',
            subtitle: 'Engineered for performance',
            amenities: ['24/7 Redundant Power Grid', '10 High-Speed Elevator Banks', 'Double-Height Grand Lobby', 'Common Cafeteria & Courtyard'],
            animation: 'fade-right'
          }
        },
        { type: 'contact', configJson: baseContact }
      ];
    } else if (template === 'township') {
      return [
        {
          type: 'hero',
          configJson: {
            ...baseHero,
            title: 'Integrated Luxury Townships',
            subtitle: 'Self-Sustaining Smart Ecosystems'
          }
        },
        {
          type: 'features',
          configJson: {
            title: 'COMMUNITY LIVING',
            subtitle: 'A Green, Connected Life',
            description: 'Enjoy walkable paths, organic grocery markets, international schools, and sports centers inside the gates.',
            features: [],
            animation: 'fade-up'
          }
        },
        { type: 'contact', configJson: baseContact }
      ];
    } else if (template === 'villa') {
      return [
        {
          type: 'hero',
          configJson: {
            ...baseHero,
            title: 'Exclusive Signature Villas',
            subtitle: 'Gated Luxury Estates'
          }
        },
        {
          type: 'features',
          configJson: {
            title: 'ESTATE RESIDENCES',
            subtitle: 'Private Lawns & Infinite Comfort',
            description: 'Every estate features a private swimming pool, home automation, solar roofing, and personal staff quarters.',
            features: [],
            animation: 'fade-up'
          }
        },
        { type: 'contact', configJson: baseContact }
      ];
    }
    return [];
  }

  private getDefaultSectionConfig(type: string): any {
    switch (type) {
      case 'hero':
        return { title: 'Heading Title', subtitle: 'Sub-text subtitle', buttonText: 'Explore', buttonUrl: '#' };
      case 'features':
        return { title: 'Features Overview', subtitle: 'Sub-text details', description: 'Description text', features: [] };
      case 'gallery':
        return { title: 'Photo Gallery', subtitle: 'View rendering mockups', images: [] };
      case 'amenities':
        return { title: 'Amenities', subtitle: 'Exclusive benefits', amenities: [] };
      case 'cta':
        return { title: 'Action Banner', subtitle: 'Engage visitors', buttonText: 'Click here', buttonUrl: '#' };
      case 'contact':
        return { title: 'Contact Us', subtitle: 'Send a message', buttonText: 'Submit' };
      case 'video':
        return { title: 'Video Tour', subtitle: 'Watch walkthrough', videoUrl: '' };
      case 'virtual-tour':
        return { title: 'Virtual 3D Tour', subtitle: 'Explore in VR', tourUrl: '' };
      default:
        return {};
    }
  }

  // Create page revision snapshot
  async createRevision(tenantId: string, pageId: string, createdById?: string): Promise<PageRevision> {
    const page = await this.getPageById(tenantId, pageId);

    // Find the current max version number
    const maxVersionRev = await this.revisionRepo.findOne({
      where: { pageId },
      order: { version: 'DESC' },
    });
    const nextVersion = maxVersionRev ? maxVersionRev.version + 1 : 1;

    const revision = new PageRevision();
    revision.pageId = page.id;
    revision.version = nextVersion;
    revision.title = page.title;
    revision.slug = page.slug;
    revision.status = page.status;
    revision.seoTitle = page.seoTitle;
    revision.seoDescription = page.seoDescription;
    
    // Map current sections to simple snapshot array
    revision.sectionsJson = (page.websiteSections || []).map((sec) => ({
      type: sec.type,
      orderNo: sec.orderNo,
      configJson: JSON.parse(JSON.stringify(sec.configJson)), // deep copy
    }));
    
    if (createdById) {
      revision.createdById = createdById;
    }

    return this.revisionRepo.save(revision);
  }

  // Get revisions for a page
  async getRevisions(tenantId: string, pageId: string): Promise<PageRevision[]> {
    // Verify page belongs to tenant
    await this.getPageById(tenantId, pageId);

    return this.revisionRepo.find({
      where: { pageId },
      order: { version: 'DESC' },
    });
  }

  // Restore page to a specific revision
  async restoreRevision(tenantId: string, pageId: string, revisionId: string, createdById?: string): Promise<Page> {
    // Verify page belongs to tenant
    const page = await this.getPageById(tenantId, pageId);

    const revision = await this.revisionRepo.findOne({
      where: { id: revisionId, pageId },
    });
    if (!revision) {
      throw new NotFoundException(`Revision with ID ${revisionId} not found under this page`);
    }

    // 1. Update page metadata
    page.title = revision.title;
    page.slug = revision.slug;
    page.status = revision.status;
    page.seoTitle = revision.seoTitle;
    page.seoDescription = revision.seoDescription;
    await this.pageRepo.save(page);

    // 2. Delete all existing sections
    const existingSections = await this.sectionRepo.find({ where: { pageId } });
    await this.sectionRepo.remove(existingSections);

    // 3. Recreate sections from snapshot
    let order = 1;
    for (const secSnap of revision.sectionsJson) {
      const sec = new WebsiteSection();
      sec.pageId = page.id;
      sec.page = page;
      sec.type = secSnap.type;
      sec.orderNo = secSnap.orderNo || order++;
      sec.configJson = secSnap.configJson;
      await this.sectionRepo.save(sec);
    }

    // 4. Save a new revision representing the restore action (so the user can restore back/forward)
    await this.createRevision(tenantId, page.id, createdById);

    return this.getPageById(tenantId, page.id);
  }
}
