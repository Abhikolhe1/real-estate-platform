import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media } from '../entities/media.entity';
import { BillingService } from './billing.service';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
    private readonly billingService: BillingService,
  ) {}

  async getMedia(tenantId: string) {
    return this.mediaRepo.find({ where: { tenantId } });
  }

  async createMedia(tenantId: string, file: Express.Multer.File, hostUrl: string) {
    // Enforce billing plan storage limits
    try {
      await this.billingService.validatePlanLimits(tenantId, 'storage', file.size);
    } catch (err) {
      // Clean up uploaded file from persistent path if validation fails
      const filePath = join('c:/xampp/htdocs/real-estate-platform/shared-uploads', file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw err;
    }

    const media = new Media();
    media.tenantId = tenantId;
    media.fileName = file.filename;
    media.fileType = file.mimetype;
    media.fileSize = file.size;
    media.url = `${hostUrl}/uploads/${file.filename}`;
    return this.mediaRepo.save(media);
  }

  async deleteMedia(tenantId: string, id: string) {
    const media = await this.mediaRepo.findOne({ where: { id, tenantId } });
    if (!media) {
      throw new NotFoundException(`Media file with ID ${id} not found`);
    }

    // Try to delete local file
    const filePath = join('c:/xampp/htdocs/real-estate-platform/shared-uploads', media.fileName);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`Failed to delete local file at ${filePath}:`, err);
      }
    }

    await this.mediaRepo.remove(media);
    return { success: true };
  }
}
