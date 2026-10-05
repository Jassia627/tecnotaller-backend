import { CreateWorkOrderInput, createWorkOrderSchema } from './work-orders.types';
import { BadRequestError } from '../../shared/errors/app-error';

/**
 * Patrón Creacional: Builder
 * 
 * Separa la construcción paso a paso de una orden de trabajo (WorkOrder)
 * de su representación final, eliminando el antipatrón del constructor telescópico
 * y validando las invariantes de negocio antes de retornar el objeto listo.
 */
export interface IWorkOrderBuilder {
  setCustomer(customerId: string | null): IWorkOrderBuilder;
  setTechnician(technicianId: string | null): IWorkOrderBuilder;
  setDevice(brand: string, model: string, serial: string): IWorkOrderBuilder;
  setProblem(description: string): IWorkOrderBuilder;
  setSecurity(passwordOrPattern?: string): IWorkOrderBuilder;
  setAccessories(accessories?: string): IWorkOrderBuilder;
  setSchedule(scheduledTime?: string | null): IWorkOrderBuilder;
  reset(): IWorkOrderBuilder;
  build(): CreateWorkOrderInput;
}

export class WorkOrderBuilder implements IWorkOrderBuilder {
  private data: Partial<CreateWorkOrderInput> = {};

  constructor() {
    this.reset();
  }

  reset(): IWorkOrderBuilder {
    this.data = {
      customerId: null,
      technicianId: null,
      deviceBrand: '',
      deviceModel: '',
      deviceSerial: '',
      problemDescription: '',
      devicePassword: '',
      accessories: '',
      scheduledTime: null,
    };
    return this;
  }

  setCustomer(customerId: string | null): IWorkOrderBuilder {
    this.data.customerId = customerId;
    return this;
  }

  setTechnician(technicianId: string | null): IWorkOrderBuilder {
    this.data.technicianId = technicianId;
    return this;
  }

  setDevice(brand: string, model: string, serial: string): IWorkOrderBuilder {
    this.data.deviceBrand = brand?.trim();
    this.data.deviceModel = model?.trim();
    this.data.deviceSerial = serial?.trim();
    return this;
  }

  setProblem(description: string): IWorkOrderBuilder {
    this.data.problemDescription = description?.trim();
    return this;
  }

  setSecurity(passwordOrPattern?: string): IWorkOrderBuilder {
    this.data.devicePassword = passwordOrPattern?.trim();
    return this;
  }

  setAccessories(accessories?: string): IWorkOrderBuilder {
    this.data.accessories = accessories?.trim();
    return this;
  }

  setSchedule(scheduledTime?: string | null): IWorkOrderBuilder {
    this.data.scheduledTime = scheduledTime ?? null;
    return this;
  }

  build(): CreateWorkOrderInput {
    // Validar invariantes obligatorias antes de construir
    if (!this.data.deviceBrand || !this.data.deviceModel || !this.data.deviceSerial) {
      throw new BadRequestError('El dispositivo debe incluir marca, modelo y número de serie.');
    }

    if (!this.data.problemDescription) {
      throw new BadRequestError('Debe especificar la descripción del problema o falla reportada.');
    }

    // Validar contra el esquema Zod de la aplicación
    const validationResult = createWorkOrderSchema.safeParse(this.data);
    if (!validationResult.success) {
      const issues = validationResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new BadRequestError(`Datos de orden inválidos: ${issues}`);
    }

    return validationResult.data;
  }
}

/**
 * Director del Builder (Opcional pero recomendado en el patrón formal)
 * Define secuencias estandarizadas de construcción para el taller.
 */
export class WorkOrderDirector {
  /**
   * Construye una orden de diagnóstico exprés (solo datos mínimos del equipo y falla)
   */
  static constructExpressCheckin(
    builder: IWorkOrderBuilder,
    brand: string,
    model: string,
    serial: string,
    issue: string,
    customerId?: string | null,
  ): CreateWorkOrderInput {
    return builder
      .reset()
      .setCustomer(customerId ?? null)
      .setDevice(brand, model, serial)
      .setProblem(issue)
      .build();
  }

  /**
   * Construye una recepción formal completa con accesorios, clave y cita técnica
   */
  static constructFullReception(
    builder: IWorkOrderBuilder,
    params: {
      customerId: string;
      technicianId?: string | null;
      brand: string;
      model: string;
      serial: string;
      issue: string;
      password?: string;
      accessories: string;
      scheduledTime?: string | null;
    },
  ): CreateWorkOrderInput {
    return builder
      .reset()
      .setCustomer(params.customerId)
      .setTechnician(params.technicianId ?? null)
      .setDevice(params.brand, params.model, params.serial)
      .setProblem(params.issue)
      .setSecurity(params.password)
      .setAccessories(params.accessories)
      .setSchedule(params.scheduledTime)
      .build();
  }
}
