import { NotFoundError } from '../../shared/errors/app-error';
import { IServiceRepository } from './services.repository';
import {
  CreateServiceInput,
  QuoteServiceInput,
  TechnicalService,
  UpdateServiceInput,
} from './services.types';
import {
  ServiceComponent,
  ServiceDetailNode,
  SimpleServiceLeaf,
  ServiceBundleComposite,
} from './service-composite';
import {
  ExpressServiceDecorator,
  ExtendedWarrantyDecorator,
  HomeDeliveryDecorator,
  DataBackupDecorator,
} from './service-decorator';

export class ServiceService {
  constructor(private readonly repository: IServiceRepository) {}

  async listPublic(): Promise<TechnicalService[]> {
    const rows = await this.repository.list(false);
    return rows.map(TechnicalService.fromRow);
  }

  async listAll(): Promise<TechnicalService[]> {
    const rows = await this.repository.list(true);
    return rows.map(TechnicalService.fromRow);
  }

  async getById(id: string): Promise<TechnicalService> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundError('Servicio no encontrado');
    return TechnicalService.fromRow(row);
  }

  async create(input: CreateServiceInput): Promise<TechnicalService> {
    return TechnicalService.fromRow(await this.repository.create(input));
  }

  async update(id: string, input: UpdateServiceInput): Promise<TechnicalService> {
    await this.getById(id);
    return TechnicalService.fromRow(await this.repository.update(id, input));
  }

  async changeStatus(id: string, active: boolean): Promise<TechnicalService> {
    await this.getById(id);
    return TechnicalService.fromRow(await this.repository.setActive(id, active));
  }

  /**
   * Cotizador Inteligente de Servicios
   * Aplica el patrón Composite para paquetes/combos jerárquicos y
   * el patrón Decorator para recargos, garantías y modalidades adicionales.
   */
  async calculateQuotation(input: QuoteServiceInput): Promise<{
    summary: {
      name: string;
      description: string;
      totalPrice: number;
      estimatedDurationMinutes: number;
      isCombo: boolean;
    };
    breakdown: string[];
    structure: ServiceDetailNode;
  }> {
    const components: ServiceComponent[] = [];

    // 1. Cargar servicios persistidos desde la base de datos (Hojas)
    for (const serviceId of input.serviceIds) {
      const entity = await this.getById(serviceId);
      components.push(
        new SimpleServiceLeaf(entity.name, entity.description || entity.name, entity.price, 30),
      );
    }

    // 2. Incorporar servicios personalizados definidos por el usuario (Hojas)
    for (const custom of input.customItems) {
      components.push(
        new SimpleServiceLeaf(
          custom.name,
          custom.description || custom.name,
          custom.price,
          custom.estimatedDurationMinutes,
        ),
      );
    }

    // 3. Estructuración con PATRÓN COMPOSITE
    let rootComponent: ServiceComponent;
    if (
      components.length === 1 &&
      (!input.bundleDiscountPercentage || input.bundleDiscountPercentage === 0) &&
      !input.bundleName &&
      components[0]
    ) {
      rootComponent = components[0];
    } else {
      const bundle = new ServiceBundleComposite(
        input.bundleName || 'Paquete de Servicios',
        input.bundleDescription || 'Servicios combinados del taller',
        input.bundleDiscountPercentage || 0,
      );
      for (const comp of components) {
        bundle.add(comp);
      }
      rootComponent = bundle;
    }

    // 4. Modificación dinámica con PATRÓN DECORATOR
    if (input.modifiers) {
      if (input.modifiers.dataBackup) {
        rootComponent = new DataBackupDecorator(
          rootComponent,
          input.modifiers.dataBackup.backupFee ?? 20,
          input.modifiers.dataBackup.limitGb ?? 64,
        );
      }

      if (input.modifiers.extendedWarrantyMonths) {
        rootComponent = new ExtendedWarrantyDecorator(
          rootComponent,
          input.modifiers.extendedWarrantyMonths,
          input.modifiers.warrantyCost ?? 25,
        );
      }

      if (input.modifiers.homeDelivery) {
        rootComponent = new HomeDeliveryDecorator(
          rootComponent,
          input.modifiers.homeDelivery.deliveryFee ?? 15,
          input.modifiers.homeDelivery.address,
        );
      }

      if (input.modifiers.isExpress) {
        rootComponent = new ExpressServiceDecorator(
          rootComponent,
          input.modifiers.expressSurchargePercentage ?? 25,
        );
      }
    }

    return {
      summary: {
        name: rootComponent.getName(),
        description: rootComponent.getDescription(),
        totalPrice: rootComponent.getPrice(),
        estimatedDurationMinutes: rootComponent.getEstimatedDurationMinutes(),
        isCombo: rootComponent.isComposite(),
      },
      breakdown: rootComponent.getBreakdown(),
      structure: rootComponent.toStructure(),
    };
  }
}

