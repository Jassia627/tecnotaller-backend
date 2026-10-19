import { describe, it, expect } from 'vitest';
import {
  SimpleServiceLeaf,
  ServiceBundleComposite,
  ServiceComponent,
} from '../modules/services/service-composite';
import {
  ExpressServiceDecorator,
  ExtendedWarrantyDecorator,
  HomeDeliveryDecorator,
  DataBackupDecorator,
} from '../modules/services/service-decorator';

describe('Patrones de Diseño Estructurales en TecnoTaller (Composite & Decorator)', () => {
  // ==========================================================================
  // 1. PATRÓN COMPOSITE
  // ==========================================================================
  describe('1. Patrón Composite (Servicios Simples y Paquetes de Reparación)', () => {
    it('debe crear servicios simples (Leaf) con precio y duración exacta', () => {
      const screenRepair = new SimpleServiceLeaf(
        'Cambio de Pantalla OLED',
        'Reemplazo de módulo frontal de pantalla',
        65,
        45,
      );

      expect(screenRepair.getName()).toBe('Cambio de Pantalla OLED');
      expect(screenRepair.getPrice()).toBe(65);
      expect(screenRepair.getEstimatedDurationMinutes()).toBe(45);
      expect(screenRepair.isComposite()).toBe(false);
    });

    it('debe rechazar hojas con precios o tiempos negativos', () => {
      expect(() => new SimpleServiceLeaf('Error', 'Desc', -10, 30)).toThrow(
        'El precio del servicio no puede ser negativo.',
      );
      expect(() => new SimpleServiceLeaf('Error', 'Desc', 50, -15)).toThrow(
        'La duración estimada no puede ser negativa.',
      );
    });

    it('las hojas no deben permitir agregar hijos (lanzan error controlado)', () => {
      const leaf = new SimpleServiceLeaf('Limpieza', 'Limpieza física', 20, 20);
      const other = new SimpleServiceLeaf('Pasta', 'Pasta térmica', 15, 10);

      expect(() => leaf.add(other)).toThrow('Operación add() no soportada en este componente.');
      expect(() => leaf.remove(other)).toThrow('Operación remove() no soportada en este componente.');
      expect(leaf.getChild(0)).toBeNull();
    });

    it('el Composite debe sumar los precios y duraciones de sus hijos', () => {
      const bundle = new ServiceBundleComposite(
        'Mantenimiento Preventivo Básico',
        'Limpieza ultrasónica profunda y pasta térmica de alta conductividad',
        0, // Sin descuento
      );

      const cleaning = new SimpleServiceLeaf('Limpieza Ultrasónica', 'Desoxidación de placa', 25, 30);
      const thermalPaste = new SimpleServiceLeaf('Cambio de Pasta Térmica', 'Pasta térmica Artic MX-4', 15, 20);

      bundle.add(cleaning);
      bundle.add(thermalPaste);

      expect(bundle.isComposite()).toBe(true);
      expect(bundle.getChildren().length).toBe(2);
      expect(bundle.getPrice()).toBe(40); // 25 + 15
      expect(bundle.getEstimatedDurationMinutes()).toBe(50); // 30 + 20
    });

    it('el Composite debe aplicar descuentos de paquete correctamente', () => {
      const comboBundle = new ServiceBundleComposite(
        'Combo Renueva Tu Móvil',
        'Cambio de batería + Mica de cristal templado',
        10, // 10% de descuento
      );

      const battery = new SimpleServiceLeaf('Batería Original', 'Reemplazo de celda de batería', 40, 35);
      const glass = new SimpleServiceLeaf('Mica Templada 9H', 'Instalación de protector de vidrio', 10, 10);

      comboBundle.add(battery);
      comboBundle.add(glass);

      // Subtotal: 50. Descuento 10% = 5. Total = 45
      expect(comboBundle.getPrice()).toBe(45);
      expect(comboBundle.getEstimatedDurationMinutes()).toBe(45);
    });

    it('debe permitir anidar Composites (árbol jerárquico multicapa)', () => {
      // 1. Sub-paquete de Mantenimiento
      const maintenanceBundle = new ServiceBundleComposite(
        'Paquete Mantenimiento',
        'Limpieza y pasta',
        10, // 10% de descuento en mantenimiento
      );
      maintenanceBundle.add(new SimpleServiceLeaf('Limpieza', 'Limpieza', 30, 25));
      maintenanceBundle.add(new SimpleServiceLeaf('Pasta Térmica', 'Pasta', 20, 15));
      // Subtotal = 50 - 10% = 45. Minutos = 40

      // 2. Sub-paquete de Software
      const softwareBundle = new ServiceBundleComposite(
        'Paquete Software',
        'Reinstalación de SO y optimización',
        0,
      );
      softwareBundle.add(new SimpleServiceLeaf('Reinstalación SO', 'Formateo limpio', 35, 60));
      // Subtotal = 35. Minutos = 60

      // 3. Paquete Maestro Corporativo (Composite de Composites)
      const megaCorporatePlan = new ServiceBundleComposite(
        'Puesta a Punto Integral Corporativa',
        'Hardware + Software integral',
        10, // 10% de descuento adicional sobre el total consolidado
      );

      megaCorporatePlan.add(maintenanceBundle);
      megaCorporatePlan.add(softwareBundle);

      // Subtotal hijos = 45 (maintenance) + 35 (software) = 80
      // Descuento mega plan 10% de 80 = 8. Total final = 72
      expect(megaCorporatePlan.getPrice()).toBe(72);
      expect(megaCorporatePlan.getEstimatedDurationMinutes()).toBe(100); // 40 + 60
    });

    it('debe generar el desglose jerárquico en texto (getBreakdown) y objeto (toStructure)', () => {
      const bundle = new ServiceBundleComposite('Pack Básico', 'Descripción', 0);
      bundle.add(new SimpleServiceLeaf('Servicio A', 'A', 20, 15));

      const breakdown = bundle.getBreakdown();
      expect(breakdown.length).toBeGreaterThanOrEqual(2);
      expect(breakdown[0]).toContain('PAQUETE: Pack Básico');
      expect(breakdown[1]).toContain('Servicio A');

      const structure = bundle.toStructure();
      expect(structure.type).toBe('composite');
      expect(structure.children?.length).toBe(1);
      expect(structure.children?.[0].type).toBe('leaf');
    });

    it('debe permitir remover hijos de un composite', () => {
      const bundle = new ServiceBundleComposite('Bundle', 'Desc', 0);
      const leafA = new SimpleServiceLeaf('A', 'A', 20, 15);
      const leafB = new SimpleServiceLeaf('B', 'B', 30, 20);

      bundle.add(leafA);
      bundle.add(leafB);
      expect(bundle.getChildren().length).toBe(2);

      bundle.remove(leafA);
      expect(bundle.getChildren().length).toBe(1);
      expect(bundle.getChild(0)?.getName()).toBe('B');
    });
  });

  // ==========================================================================
  // 2. PATRÓN DECORATOR
  // ==========================================================================
  describe('2. Patrón Decorator (Modificadores y Valores Agregados de Servicio)', () => {
    it('ExpressServiceDecorator debe añadir recargo porcentual y reducir tiempo de espera', () => {
      const baseRepair = new SimpleServiceLeaf('Reparación de Conector USB-C', 'Cambio de pin de carga', 40, 60);

      // 25% de recargo sobre $40 = +$10 => Total: $50
      // Tiempo al 60% de 60 min => 36 min
      const expressRepair = new ExpressServiceDecorator(baseRepair, 25);

      expect(expressRepair.getName()).toContain('[EXPRESS ⚡]');
      expect(expressRepair.getPrice()).toBe(50);
      expect(expressRepair.getEstimatedDurationMinutes()).toBe(36);
      expect(expressRepair.getWrappedComponent()).toBe(baseRepair);
    });

    it('ExtendedWarrantyDecorator debe sumar el costo fijo de la póliza', () => {
      const baseService = new SimpleServiceLeaf('Cambio de Batería iPad', 'Batería alta capacidad', 60, 45);

      // Garantía extendida de 12 meses por +$25
      const warrantiedService = new ExtendedWarrantyDecorator(baseService, 12, 25);

      expect(warrantiedService.getName()).toContain('[+12M Garantía 🛡️]');
      expect(warrantiedService.getPrice()).toBe(85); // 60 + 25
      expect(warrantiedService.getAdditionalMonths()).toBe(12);
    });

    it('HomeDeliveryDecorator debe sumar tarifa de recogida/entrega', () => {
      const base = new SimpleServiceLeaf('Mantenimiento', 'Limpieza', 30, 30);
      const withDelivery = new HomeDeliveryDecorator(base, 15, 'Calle 72 # 45-12');

      expect(withDelivery.getName()).toContain('[Delivery 🚚]');
      expect(withDelivery.getDescription()).toContain('Calle 72 # 45-12');
      expect(withDelivery.getPrice()).toBe(45); // 30 + 15
    });

    it('DataBackupDecorator debe sumar tarifa de backup y añadir tiempo adicional de copia', () => {
      const base = new SimpleServiceLeaf('Formateo y Reinstalación', 'SO Limpio', 35, 40);
      const withBackup = new DataBackupDecorator(base, 20, 128);

      expect(withBackup.getName()).toContain('[Backup de Datos 💾]');
      expect(withBackup.getPrice()).toBe(55); // 35 + 20
      expect(withBackup.getEstimatedDurationMinutes()).toBe(70); // 40 + 30 adicionales
    });

    it('debe permitir encadenar múltiples decoradores dinámicamente (Decorator Stacking)', () => {
      // Servicio Base: $50, 60 min
      const baseService: ServiceComponent = new SimpleServiceLeaf(
        'Reparación Placa Base',
        'Micro-soldadura en integrado de carga',
        100,
        90,
      );

      // 1. Aplicar Garantía Extendida (+ $30) -> $130
      const step1 = new ExtendedWarrantyDecorator(baseService, 12, 30);

      // 2. Aplicar Respaldo de Datos (+ $20, + 30 min) -> $150, 120 min
      const step2 = new DataBackupDecorator(step1, 20, 64);

      // 3. Aplicar Entrega a Domicilio (+ $15) -> $165, 120 min
      const step3 = new HomeDeliveryDecorator(step2, 15, 'Av. Principal # 100');

      // 4. Aplicar Servicio Express (+ 20% sobre $165 = $33 recargo -> $198, tiempo al 60% = 72 min)
      const fullyLoadedService = new ExpressServiceDecorator(step3, 20);

      expect(fullyLoadedService.getPrice()).toBe(198);
      expect(fullyLoadedService.getEstimatedDurationMinutes()).toBe(72);
      expect(fullyLoadedService.getName()).toContain('[EXPRESS ⚡]');
      expect(fullyLoadedService.getName()).toContain('[+12M Garantía 🛡️]');
      expect(fullyLoadedService.getName()).toContain('[Backup de Datos 💾]');
      expect(fullyLoadedService.getName()).toContain('[Delivery 🚚]');
    });
  });

  // ==========================================================================
  // 3. SINERGIA ENTRE COMPOSITE Y DECORATOR
  // ==========================================================================
  describe('3. Sinergia Total (Composite + Decorator)', () => {
    it('un Composite debe poder alojar hojas previamente decoradas', () => {
      const bundle = new ServiceBundleComposite('Servicio VIP Smartphone', 'Pantalla y Batería Premium', 0);

      // Hoja decorada con garantía extendida: $70 + $25 = $95
      const screenWithWarranty = new ExtendedWarrantyDecorator(
        new SimpleServiceLeaf('Pantalla AMOLED', 'Cambio de pantalla', 70, 50),
        6,
        25,
      );

      // Hoja decorada con backup previo: $35 + $20 = $55 (duración 30 + 30 = 60 min)
      const batteryWithBackup = new DataBackupDecorator(
        new SimpleServiceLeaf('Batería Original', 'Reemplazo de batería', 35, 30),
        20,
        32,
      );

      bundle.add(screenWithWarranty);
      bundle.add(batteryWithBackup);

      // Total paquete: 95 + 55 = 150
      expect(bundle.getPrice()).toBe(150);
      // Total duración: 50 + 60 = 110 min
      expect(bundle.getEstimatedDurationMinutes()).toBe(110);
    });

    it('debe poder decorar un Composite completo como si fuera una sola entidad', () => {
      // Creamos un paquete composite con 2 servicios
      const bundle = new ServiceBundleComposite('Paquete Reparación Total', 'Pantalla + Altavoz', 10);
      bundle.add(new SimpleServiceLeaf('Pantalla', 'Módulo pantalla', 80, 40));
      bundle.add(new SimpleServiceLeaf('Altavoz', 'Parlante inferior', 20, 20));
      // Subtotal = 100 - 10% = 90. Duración = 60 min

      // Decoramos TODO el combo con Servicio Express (25% de recargo sobre $90 = $22.50 => $112.50)
      // y con entrega a domicilio ($15 => $127.50)
      const expressBundle = new ExpressServiceDecorator(bundle, 25);
      const deliveryExpressBundle = new HomeDeliveryDecorator(expressBundle, 15, 'Cra 50 # 80-20');

      expect(deliveryExpressBundle.getPrice()).toBe(127.5);
      expect(deliveryExpressBundle.getName()).toContain('Paquete Reparación Total');
      expect(deliveryExpressBundle.getName()).toContain('[EXPRESS ⚡]');
      expect(deliveryExpressBundle.getName()).toContain('[Delivery 🚚]');

      // El desglose debe mostrar el paquete interior y los adicionales decorados
      const breakdown = deliveryExpressBundle.getBreakdown();
      const fullText = breakdown.join('\n');

      expect(fullText).toContain('PAQUETE: Paquete Reparación Total');
      expect(fullText).toContain('Pantalla');
      expect(fullText).toContain('Altavoz');
      expect(fullText).toContain('Recargo Atención Express');
      expect(fullText).toContain('Tarifa Recogida y Entrega a Domicilio');
    });

    it('el cliente polimórfico puede calcular presupuestos sin importar si es Leaf, Composite o Decorator', () => {
      // Función cliente que no sabe ni le interesa qué tipo concreto recibe
      function calculateQuotationSummary(service: ServiceComponent): {
        title: string;
        totalToPay: number;
        estimatedMinutes: number;
        isCombo: boolean;
      } {
        return {
          title: service.getName(),
          totalToPay: service.getPrice(),
          estimatedMinutes: service.getEstimatedDurationMinutes(),
          isCombo: service.isComposite(),
        };
      }

      const leaf = new SimpleServiceLeaf('Diagnóstico', 'Revisión técnica', 15, 30);
      const combo = new ServiceBundleComposite('Combo Mantenimiento', 'Limpieza y ajuste', 0);
      combo.add(leaf);
      const decorated = new ExtendedWarrantyDecorator(combo, 12, 20);

      const summary1 = calculateQuotationSummary(leaf);
      const summary2 = calculateQuotationSummary(combo);
      const summary3 = calculateQuotationSummary(decorated);

      expect(summary1.totalToPay).toBe(15);
      expect(summary2.totalToPay).toBe(15);
      expect(summary3.totalToPay).toBe(35); // 15 + 20
      expect(summary3.isCombo).toBe(true);
    });
  });
});
