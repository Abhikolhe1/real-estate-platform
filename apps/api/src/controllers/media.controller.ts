import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { MediaService } from '../services/media.service';
import { TenantId } from '../interceptors/tenant.decorator';
import { JwtAuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';
import { Request } from 'express';
import { ApiTags, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  async getMedia(@TenantId() tenantId: string) {
    return this.mediaService.getMedia(tenantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN', 'BUILDER_STAFF')
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: 'c:/xampp/htdocs/real-estate-platform/shared-uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname).toLowerCase();
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB absolute max
      },
      fileFilter: (req, file, callback) => {
        const allowedExtensions = ['.dwg', '.dxf', '.glb', '.png', '.jpg', '.jpeg', '.pdf'];
        const ext = extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          return callback(
            new BadRequestException(
              `Invalid file extension. Allowed extensions are: dwg, dxf, glb, png, jpg, jpeg, pdf`,
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadFile(
    @TenantId() tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() request: Request,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded or file exceeded size limit.');
    }

    // Specific limit validation: Images must be under 5MB
    const ext = extname(file.originalname).toLowerCase();
    const isImage = ['.png', '.jpg', '.jpeg'].includes(ext);
    if (isImage && file.size > 5 * 1024 * 1024) {
      // Delete uploaded file if it exceeds constraint
      const fs = require('fs');
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new BadRequestException('Image files must not exceed 5MB in size.');
    }

    const hostUrl = `${request.protocol}://${request.get('host')}`;
    return this.mediaService.createMedia(tenantId, file, hostUrl);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUILDER_ADMIN', 'BUILDER_STAFF')
  @Delete(':id')
  async deleteMedia(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.mediaService.deleteMedia(tenantId, id);
  }
}
