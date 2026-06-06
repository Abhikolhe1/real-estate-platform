import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Builder } from '../entities/builder.entity';
import { Subscription } from '../entities/subscription.entity';
import { Invoice } from '../entities/invoice.entity';
import { Project } from '../entities/project.entity';
import { Media } from '../entities/media.entity';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Builder)
    private readonly builderRepo: Repository<Builder>,
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
  ) {}

  // Get active subscription info
  async getSubscription(tenantId: string) {
    let sub = await this.subRepo.findOne({ where: { tenantId, status: 'ACTIVE' } });
    if (!sub) {
      // Fallback seed active sub based on builder current planId
      const builder = await this.builderRepo.findOne({ where: { id: tenantId } });
      if (builder) {
        sub = new Subscription();
        sub.tenantId = tenantId;
        sub.planId = builder.planId === 'free' ? 'Starter' : builder.planId === 'growth' ? 'Professional' : 'Enterprise';
        sub.status = 'ACTIVE';
        sub.billingCycle = 'monthly';
        sub.cycleStart = new Date();
        sub.cycleEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        sub = await this.subRepo.save(sub);
      }
    }
    return sub;
  }

  // Get historical invoices
  async getInvoices(tenantId: string) {
    return this.invoiceRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  // Upgrade or toggle subscription plans
  async changePlan(tenantId: string, planId: string) {
    const builder = await this.builderRepo.findOne({ where: { id: tenantId } });
    if (!builder) {
      throw new NotFoundException('Builder tenant not found');
    }

    // Map plan id to db conventions
    let mappedPlanId = planId;
    if (planId.toLowerCase() === 'starter') mappedPlanId = 'free';
    if (planId.toLowerCase() === 'professional') mappedPlanId = 'growth';

    // Save planId on builder
    builder.planId = mappedPlanId;
    await this.builderRepo.save(builder);

    // Cancel old active subscriptions
    await this.subRepo.update({ tenantId, status: 'ACTIVE' }, { status: 'CANCELLED' });

    // Save new active subscription
    const sub = new Subscription();
    sub.tenantId = tenantId;
    sub.planId = planId; // e.g. Starter, Professional, Enterprise
    sub.status = 'ACTIVE';
    sub.billingCycle = 'monthly';
    sub.cycleStart = new Date();
    sub.cycleEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const savedSub = await this.subRepo.save(sub);

    // Generate matching mock invoice
    const amount = planId === 'Enterprise' ? 1500000 : planId === 'Professional' ? 840000 : 420000;
    const inv = new Invoice();
    inv.tenantId = tenantId;
    inv.subscriptionId = savedSub.id;
    inv.invoiceNumber = `INV-${Date.now()}-${Math.round(Math.random() * 1000)}`;
    inv.amount = amount;
    inv.status = 'PAID';
    inv.paymentDate = new Date();
    await this.invoiceRepo.save(inv);

    return savedSub;
  }

  // Validate active constraints
  async validatePlanLimits(tenantId: string, type: 'project' | 'storage', extraBytes: number = 0): Promise<boolean> {
    const builder = await this.builderRepo.findOne({ where: { id: tenantId } });
    if (!builder) {
      throw new NotFoundException('Builder tenant not found');
    }

    const plan = builder.planId; // free (Starter), growth (Professional), enterprise (Enterprise)

    if (type === 'project') {
      const count = await this.projectRepo.count({ where: { tenantId } });
      if (plan === 'free' && count >= 1) {
        throw new ForbiddenException(
          'Starter Plan limit reached: You can only create 1 project. Please upgrade to Professional or Enterprise.',
        );
      }
      if (plan === 'growth' && count >= 10) {
        throw new ForbiddenException(
          'Professional Plan limit reached: You can only create 10 projects. Please upgrade to Enterprise.',
        );
      }
    }

    if (type === 'storage') {
      const mediaFiles = await this.mediaRepo.find({ where: { tenantId } });
      const currentBytes = mediaFiles.reduce((sum, item) => sum + item.fileSize, 0);
      const targetBytes = currentBytes + extraBytes;

      if (plan === 'free' && targetBytes > 50 * 1024 * 1024) {
        throw new ForbiddenException(
          'Starter Plan storage limit reached (Max 50MB). Please upgrade to Professional or Enterprise.',
        );
      }
      if (plan === 'growth' && targetBytes > 250 * 1024 * 1024) {
        throw new ForbiddenException(
          'Professional Plan storage limit reached (Max 250MB). Please upgrade to Enterprise.',
        );
      }
    }

    return true;
  }
}
