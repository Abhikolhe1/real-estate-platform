import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SsoProvider } from '../entities/sso-provider.entity';
import { Translation } from '../entities/translation.entity';
import { Currency } from '../entities/currency.entity';

@Injectable()
export class EnterpriseService {
  constructor(
    @InjectRepository(SsoProvider)
    private readonly ssoRepo: Repository<SsoProvider>,
    @InjectRepository(Translation)
    private readonly transRepo: Repository<Translation>,
    @InjectRepository(Currency)
    private readonly currencyRepo: Repository<Currency>,
  ) {}

  // SSO Settings
  async getSsoSettings(tenantId: string) {
    return this.ssoRepo.find({ where: { tenantId } });
  }

  async saveSsoSettings(tenantId: string, providerType: string, configJson: any) {
    let sso = await this.ssoRepo.findOne({ where: { tenantId, providerType } });
    if (!sso) {
      sso = new SsoProvider();
      sso.tenantId = tenantId;
      sso.providerType = providerType;
    }
    sso.configJson = configJson;
    sso.isActive = true;
    return this.ssoRepo.save(sso);
  }

  // Translation Localizations
  async getTranslations(tenantId: string, langCode: string) {
    return this.transRepo.find({ where: { tenantId, langCode } });
  }

  async saveTranslation(tenantId: string, langCode: string, key: string, val: string) {
    let t = await this.transRepo.findOne({ where: { tenantId, langCode, translationKey: key } });
    if (!t) {
      t = new Translation();
      t.tenantId = tenantId;
      t.langCode = langCode;
      t.translationKey = key;
    }
    t.translationValue = val;
    return this.transRepo.save(t);
  }

  async deleteTranslation(tenantId: string, id: string) {
    const t = await this.transRepo.findOne({ where: { id, tenantId } });
    if (!t) {
      throw new NotFoundException(`Translation entry not found.`);
    }
    await this.transRepo.remove(t);
    return { success: true };
  }

  // Currency Conversions
  async getCurrencies() {
    return this.currencyRepo.find({ order: { currencyCode: 'ASC' } });
  }

  async saveCurrency(currencyCode: string, symbol: string, rateToINR: number) {
    let c = await this.currencyRepo.findOne({ where: { currencyCode } });
    if (!c) {
      c = new Currency();
      c.currencyCode = currencyCode;
    }
    c.symbol = symbol;
    c.rateToINR = rateToINR;
    c.isActive = true;
    return this.currencyRepo.save(c);
  }
}
