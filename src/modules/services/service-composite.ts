/**
 * ============================================================================
 * PATRÓN DE DISEÑO ESTRUCTURAL: COMPOSITE (Componente / Hoja / Compuesto)
 * Dominio: TecnoTaller - Servicios y Paquetes de Reparación
 * ============================================================================
 * Propósito: Permite estructurar servicios simples (hojas) y paquetes/combos de
 * servicios (compuestos) en una jerarquía de árbol uniforme, permitiendo al
 * cliente calcular precios totales, tiempos estimados y desgloses de cotización
 * sin distinguir si trata con un servicio atómico o con un paquete anidado.
 */

export interface ServiceDetailNode {
  name: string;
  description: string;
  price: number;
  estimatedDurationMinutes: number;
  type: 'leaf' | 'composite' | 'decorator';
  discountPercentage?: number;
  children?: ServiceDetailNode[];
}

/**
 * Componente Base (Component)
 * Define las operaciones comunes tanto para hojas simples como para agregados compuestos.
 */
export abstract class ServiceComponent {
  abstract getName(): string;
  abstract getDescription(): string;
  abstract getPrice(): number;
  abstract getEstimatedDurationMinutes(): number;

  /**
   * Genera un desglose jerárquico en texto legible (ideal para tickets o presupuestos).
   */
  abstract getBreakdown(indent?: number): string[];

  /**
   * Serializa la jerarquía a un árbol de datos estructurado en formato JSON.
   */
  abstract toStructure(): ServiceDetailNode;

  isComposite(): boolean {
    return false;
  }

  add(_component: ServiceComponent): void {
    throw new Error('Operación add() no soportada en este componente.');
  }

  remove(_component: ServiceComponent): void {
    throw new Error('Operación remove() no soportada en este componente.');
  }

  getChild(_index: number): ServiceComponent | null {
    return null;
  }
}

/**
 * Hoja (Leaf)
 * Representa un servicio atómico e indivisible de reparación o mantenimiento.
 * No posee hijos.
 */
export class SimpleServiceLeaf extends ServiceComponent {
  constructor(
    private readonly name: string,
    private readonly description: string,
    private readonly price: number,
    private readonly estimatedDurationMinutes: number,
  ) {
    super();
    if (price < 0) {
      throw new Error('El precio del servicio no puede ser negativo.');
    }
    if (estimatedDurationMinutes < 0) {
      throw new Error('La duración estimada no puede ser negativa.');
    }
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getPrice(): number {
    return this.price;
  }

  getEstimatedDurationMinutes(): number {
    return this.estimatedDurationMinutes;
  }

  getBreakdown(indent: number = 0): string[] {
    const spaces = ' '.repeat(indent);
    return [`${spaces}• ${this.name}: $${this.getPrice().toFixed(2)} (${this.estimatedDurationMinutes} min)`];
  }

  toStructure(): ServiceDetailNode {
    return {
      name: this.name,
      description: this.description,
      price: this.getPrice(),
      estimatedDurationMinutes: this.estimatedDurationMinutes,
      type: 'leaf',
    };
  }
}

/**
 * Compuesto (Composite)
 * Representa un combo, paquete o plan de servicios que agrupa otros ServiceComponents.
 * Puede contener tanto hojas simples (SimpleServiceLeaf) como otros combos anidados (ServiceBundleComposite).
 */
export class ServiceBundleComposite extends ServiceComponent {
  private readonly children: ServiceComponent[] = [];

  constructor(
    private readonly name: string,
    private readonly description: string,
    private readonly discountPercentage: number = 0,
  ) {
    super();
    if (discountPercentage < 0 || discountPercentage > 100) {
      throw new Error('El porcentaje de descuento del paquete debe estar entre 0 y 100.');
    }
  }

  isComposite(): boolean {
    return true;
  }

  add(component: ServiceComponent): void {
    this.children.push(component);
  }

  remove(component: ServiceComponent): void {
    const index = this.children.indexOf(component);
    if (index !== -1) {
      this.children.splice(index, 1);
    }
  }

  getChild(index: number): ServiceComponent | null {
    return this.children[index] ?? null;
  }

  getChildren(): ServiceComponent[] {
    return [...this.children];
  }

  getDiscountPercentage(): number {
    return this.discountPercentage;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  /**
   * Calcula el precio total sumando recursivamente todos los hijos
   * y aplicando el descuento del paquete (si aplica).
   */
  getPrice(): number {
    const subtotal = this.children.reduce((total, child) => total + child.getPrice(), 0);
    const discount = (subtotal * this.discountPercentage) / 100;
    return Math.round((subtotal - discount) * 100) / 100;
  }

  /**
   * Suma la duración estimada de todos los servicios incluidos en el paquete.
   */
  getEstimatedDurationMinutes(): number {
    return this.children.reduce((total, child) => total + child.getEstimatedDurationMinutes(), 0);
  }

  getBreakdown(indent: number = 0): string[] {
    const spaces = ' '.repeat(indent);
    const discountLabel =
      this.discountPercentage > 0 ? ` [Descuento de combo: -${this.discountPercentage}%]` : '';
    const header = `${spaces}📦 PAQUETE: ${this.name} - Total: $${this.getPrice().toFixed(2)} (${this.getEstimatedDurationMinutes()} min)${discountLabel}`;

    const lines: string[] = [header];
    for (const child of this.children) {
      lines.push(...child.getBreakdown(indent + 2));
    }
    return lines;
  }

  toStructure(): ServiceDetailNode {
    return {
      name: this.name,
      description: this.description,
      price: this.getPrice(),
      estimatedDurationMinutes: this.getEstimatedDurationMinutes(),
      discountPercentage: this.discountPercentage,
      type: 'composite',
      children: this.children.map((child) => child.toStructure()),
    };
  }
}
