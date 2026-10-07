import {CanActivate,Injectable,NotFoundException} from '@nestjs/common';
@Injectable()
export class LegacyDemoGuard implements CanActivate {
  canActivate(){if(process.env.ENABLE_LEGACY_CAD_DEMOS!=='true')throw new NotFoundException('Legacy demonstration is disabled');return true;}
}
