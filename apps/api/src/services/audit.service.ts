import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async logAction(params: {
    tenantId?: string;
    userId?: string;
    action: string;
    module: string;
    oldValue?: any;
    newValue?: any;
  }) {
    const log = new AuditLog();
    log.tenantId = params.tenantId;
    log.userId = params.userId;
    log.action = params.action;
    log.module = params.module;
    log.oldValue = params.oldValue;
    log.newValue = params.newValue;
    return this.auditLogRepo.save(log);
  }
}
