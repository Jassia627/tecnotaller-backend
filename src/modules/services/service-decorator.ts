/**
 * ============================================================================
 * PATRÓN DE DISEÑO ESTRUCTURAL: DECORATOR (Decorador)
 * Dominio: TecnoTaller - Modificadores y Adicionales de Servicio Técnico
 * ============================================================================
 * Propósito: Permite añadir responsabilidades, servicios adicionales y recargos
 * dinámicamente a cualquier ServiceComponent (sea una hoja simple o un paquete composite)
 * sin modificar su código original ni recurrir a una explosión de subclases.
 */

import { ServiceComponent, ServiceDetailNode } from './service-composite';

/**
 * Decorador Base (Decorator)
 * Mantiene una referencia privada protegida al componente envuelto (wrappee)
 * y delega por defecto todas las operaciones de la interfaz ServiceComponent.
 */
export abstract class ServiceDecorator extends ServiceComponent {
  constructor(protected readonly wrappee: ServiceComponent) {
    super();
  }

  isComposite(): boolean {
    return this.wrappee.isComposite();
  }

  getName(): string {
    return this.wrappee.getName();
  }

  getDescription(): string {
    return this.wrappee.getDescription();
  }

  getPrice(): number {
    return this.wrappee.getPrice();
  }

  getEstimatedDurationMinutes(): number {
    return this.wrappee.getEstimatedDurationMinutes();
  }

  getBreakdown(indent: number = 0): string[] {
    return this.wrappee.getBreakdown(indent);
  }

  toStructure(): ServiceDetailNode {
    return this.wrappee.toStructure();
  }

  getWrappedComponent(): ServiceComponent {
    return this.wrappee;
  }
}

/**
 * Decorador Concreto 1: Servicio Express / Urgente 
 * Aplica un recargo porcentual por atención prioritaria e inmediata en el taller,
 * y reduce el tiempo comprometido de entrega por dedicación exclusiva de un técnico.
 */
export class ExpressServiceDecorator extends ServiceDecorator {
  constructor(
    wrappee: ServiceComponent,
    private readonly surchargePercentage: number = 25,
  ) {
    super(wrappee);
    if (surchargePercentage < 0) {
      throw new Error('El porcentaje de recargo express no puede ser negativo.');
    }
  }

  getName(): string {
    return `${this.wrappee.getName()} [EXPRESS ⚡]`;
  }

  getDescription(): string {
    return `${this.wrappee.getDescription()} (Atención prioritaria inmediata de taller)`;
  }

  getPrice(): number {
    const basePrice = this.wrappee.getPrice();
    const surcharge = (basePrice * this.surchargePercentage) / 100;
    return Math.round((basePrice + surcharge) * 100) / 100;
  }

  getEstimatedDurationMinutes(): number {
    // La dedicación prioritaria reduce el tiempo total de entrega estimada a un 60%
    return Math.max(15, Math.round(this.wrappee.getEstimatedDurationMinutes() * 0.6));
  }

  getBreakdown(indent: number = 0): string[] {
    const spaces = ' '.repeat(indent);
    const surchargeAmount = (this.wrappee.getPrice() * this.surchargePercentage) / 100;
    return [
      ...this.wrappee.getBreakdown(indent),
      `${spaces}  ⚡ Recargo Atención Express (+${this.surchargePercentage}%): +$${surchargeAmount.toFixed(2)}`,
    ];
  }

  toStructure(): ServiceDetailNode {
    const base = this.wrappee.toStructure();
    return {
      ...base,
      name: this.getName(),
      description: this.getDescription(),
      price: this.getPrice(),
      estimatedDurationMinutes: this.getEstimatedDurationMinutes(),
      type: 'decorator',
    };
  }
}

/**
 * Decorador Concreto 2: Garantía Extendida Premium 
 * Adiciona una póliza de garantía extendida (por ejemplo, 6 o 12 meses adicionales)
 * por un costo fijo de protección.
 */
export class ExtendedWarrantyDecorator extends ServiceDecorator {
  constructor(
    wrappee: ServiceComponent,
    private readonly additionalMonths: number = 12,
    private readonly warrantyCost: number = 25,
  ) {
    super(wrappee);
    if (additionalMonths <= 0) {
      throw new Error('Los meses de garantía extendida deben ser mayores a 0.');
    }
    if (warrantyCost < 0) {
      throw new Error('El costo de la póliza de garantía no puede ser negativo.');
    }
  }

  getAdditionalMonths(): number {
    return this.additionalMonths;
  }

  getName(): string {
    return `${this.wrappee.getName()} [+${this.additionalMonths}M Garantía 🛡️]`;
  }

  getDescription(): string {
    return `${this.wrappee.getDescription()} (Incluye póliza de garantía extendida por ${this.additionalMonths} meses)`;
  }

  getPrice(): number {
    return Math.round((this.wrappee.getPrice() + this.warrantyCost) * 100) / 100;
  }

  getBreakdown(indent: number = 0): string[] {
    const spaces = ' '.repeat(indent);
    return [
      ...this.wrappee.getBreakdown(indent),
      `${spaces}  🛡️ Póliza de Garantía Extendida (+${this.additionalMonths} meses): +$${this.warrantyCost.toFixed(2)}`,
    ];
  }

  toStructure(): ServiceDetailNode {
    const base = this.wrappee.toStructure();
    return {
      ...base,
      name: this.getName(),
      description: this.getDescription(),
      price: this.getPrice(),
      type: 'decorator',
    };
  }
}

/**
 * Decorador Concreto 3: Servicio a Domicilio (Home Delivery / Pickup) 
 * Añade la logística de recogida y entrega del dispositivo a domicilio.
 */
export class HomeDeliveryDecorator extends ServiceDecorator {
  constructor(
    wrappee: ServiceComponent,
    private readonly deliveryFee: number = 15,
    private readonly address: string = 'Dirección del cliente',
  ) {
    super(wrappee);
    if (deliveryFee < 0) {
      throw new Error('La tarifa de delivery no puede ser negativa.');
    }
  }

  getName(): string {
    return `${this.wrappee.getName()} [Delivery]`;
  }

  getDescription(): string {
    return `${this.wrappee.getDescription()} (Recogida y entrega a domicilio en: ${this.address})`;
  }

  getPrice(): number {
    return Math.round((this.wrappee.getPrice() + this.deliveryFee) * 100) / 100;
  }

  getBreakdown(indent: number = 0): string[] {
    const spaces = ' '.repeat(indent);
    return [
      ...this.wrappee.getBreakdown(indent),
      `${spaces}  🚚 Tarifa Recogida y Entrega a Domicilio: +$${this.deliveryFee.toFixed(2)}`,
    ];
  }

  toStructure(): ServiceDetailNode {
    const base = this.wrappee.toStructure();
    return {
      ...base,
      name: this.getName(),
      description: this.getDescription(),
      price: this.getPrice(),
      type: 'decorator',
    };
  }
}

/**
 * Decorador Concreto 4: Respaldo Preventivo de Información (Data Backup) 
 * Realiza una copia de seguridad íntegra de la información del cliente
 * antes de manipular la placa o reinstalar el sistema operativo.
 */
export class DataBackupDecorator extends ServiceDecorator {
  constructor(
    wrappee: ServiceComponent,
    private readonly backupFee: number = 20,
    private readonly backupLimitGb: number = 64,
  ) {
    super(wrappee);
    if (backupFee < 0) {
      throw new Error('La tarifa de backup no puede ser negativa.');
    }
  }

  getName(): string {
    return `${this.wrappee.getName()} [Backup de Datos]`;
  }

  getDescription(): string {
    return `${this.wrappee.getDescription()} (Respaldo previo seguro de hasta ${this.backupLimitGb}GB)`;
  }

  getPrice(): number {
    return Math.round((this.wrappee.getPrice() + this.backupFee) * 100) / 100;
  }

  getEstimatedDurationMinutes(): number {
    // La copia de datos toma 30 minutos adicionales
    return this.wrappee.getEstimatedDurationMinutes() + 30;
  }

  getBreakdown(indent: number = 0): string[] {
    const spaces = ' '.repeat(indent);
    return [
      ...this.wrappee.getBreakdown(indent),
      `${spaces}  💾 Respaldo Preventivo de Datos (hasta ${this.backupLimitGb}GB): +$${this.backupFee.toFixed(2)} (+30 min)`,
    ];
  }

  toStructure(): ServiceDetailNode {
    const base = this.wrappee.toStructure();
    return {
      ...base,
      name: this.getName(),
      description: this.getDescription(),
      price: this.getPrice(),
      estimatedDurationMinutes: this.getEstimatedDurationMinutes(),
      type: 'decorator',
    };
  }
}
