import { describe, it, expect } from 'vitest';
import { SupabaseClientManager } from '../config/supabase';
import {
  NotificationFactoryProvider,
  EmailNotificationFactory,
  SmsNotificationFactory,
  WhatsAppNotificationFactory,
  ConsoleNotificationFactory,
} from '../modules/notifications/notification.factory';
import { ConsoleNotifier, SmsNotifier, WhatsAppNotifier } from '../modules/notifications/notifiers';
import {
  InfrastructureProducer,
  ProductionInfrastructureFactory,
  LocalDevInfrastructureFactory,
  LocalDiskStorageService,
  LocalConsoleNotifierService,
  SupabaseStorageService,
  EdgeFunctionEmailService,
} from './infra/infrastructure.factory';
import { WorkOrderBuilder, WorkOrderDirector } from '../modules/work-orders/work-orders.builder';
import { BadRequestError } from './errors/app-error';

describe('Patrones de Diseño Creacionales en TecnoTaller', () => {
  // ==========================================================================
  // 1. SINGLETON
  // ==========================================================================
  describe('1. Patrón Singleton (SupabaseClientManager)', () => {
    it('debe devolver siempre la misma instancia única en memoria (referential equality)', () => {
      const instance1 = SupabaseClientManager.getInstance();
      const instance2 = SupabaseClientManager.getInstance();

      expect(instance1).toBeDefined();
      expect(instance2).toBeDefined();
      expect(instance1).toBe(instance2);
    });

    it('debe proveer un cliente de base de datos operativo a través del Singleton', () => {
      const client = SupabaseClientManager.getInstance().getClient();
      expect(client).toBeDefined();
      expect(typeof client.from).toBe('function');
    });
  });

  // ==========================================================================
  // 2. FACTORY METHOD
  // ==========================================================================
  describe('2. Patrón Factory Method (NotificationFactory)', () => {
    it('debe instanciar la factoría correcta según el canal especificado', () => {
      const emailFactory = NotificationFactoryProvider.getFactory('EMAIL');
      const smsFactory = NotificationFactoryProvider.getFactory('SMS');
      const whatsappFactory = NotificationFactoryProvider.getFactory('WHATSAPP');
      const consoleFactory = NotificationFactoryProvider.getFactory('CONSOLE');

      expect(emailFactory).toBeInstanceOf(EmailNotificationFactory);
      expect(smsFactory).toBeInstanceOf(SmsNotificationFactory);
      expect(whatsappFactory).toBeInstanceOf(WhatsAppNotificationFactory);
      expect(consoleFactory).toBeInstanceOf(ConsoleNotificationFactory);
    });

    it('cada factoría concreta debe fabricar su producto correspondiente', () => {
      const smsFactory = new SmsNotificationFactory();
      const notifier = smsFactory.createNotifier();

      expect(notifier).toBeInstanceOf(SmsNotifier);
      expect(typeof notifier.send).toBe('function');

      const whatsappFactory = new WhatsAppNotificationFactory();
      expect(whatsappFactory.createNotifier()).toBeInstanceOf(WhatsAppNotifier);

      const consoleFactory = new ConsoleNotificationFactory();
      expect(consoleFactory.createNotifier()).toBeInstanceOf(ConsoleNotifier);
    });

    it('debe ejecutar el método plantilla notify usando el producto creado', async () => {
      const consoleFactory = new ConsoleNotificationFactory();
      const message = {
        toEmail: 'cliente@ejemplo.com',
        subject: 'Equipo Listo',
        body: 'Tu reparación ha finalizado exitosamente.',
      };

      await expect(consoleFactory.notify(message)).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // 3. ABSTRACT FACTORY
  // ==========================================================================
  describe('3. Patrón Abstract Factory (InfrastructureFactory)', () => {
    it('debe resolver la factoría de producción cuando el entorno es production', () => {
      const factory = InfrastructureProducer.getFactory('production');
      expect(factory).toBeInstanceOf(ProductionInfrastructureFactory);

      const storage = factory.createStorage();
      const notifier = factory.createNotifier();

      expect(storage).toBeInstanceOf(SupabaseStorageService);
      expect(notifier).toBeInstanceOf(EdgeFunctionEmailService);
    });

    it('debe resolver la factoría de desarrollo local cuando el entorno es development o test', () => {
      const factory = InfrastructureProducer.getFactory('development');
      expect(factory).toBeInstanceOf(LocalDevInfrastructureFactory);

      const storage = factory.createStorage();
      const notifier = factory.createNotifier();

      expect(storage).toBeInstanceOf(LocalDiskStorageService);
      expect(notifier).toBeInstanceOf(LocalConsoleNotifierService);
    });

    it('la familia de desarrollo local debe funcionar de forma coherente en memoria', async () => {
      const factory = InfrastructureProducer.getFactory('development');
      const storage = factory.createStorage();
      const notifier = factory.createNotifier();

      const testBuffer = Buffer.from('contenido-de-prueba-foto');
      const path = await storage.uploadPhoto('work-order-photos', 'test-order-1.jpg', testBuffer);

      expect(path).toContain('work-order-photos/test-order-1.jpg');
      expect(storage.getPublicUrl('work-order-photos', 'test-order-1.jpg')).toContain('http://localhost:3000');

      await expect(
        notifier.sendAlert('admin@tecnotaller.com', 'Alerta Local', 'Mensaje de prueba'),
      ).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // 4. BUILDER
  // ==========================================================================
  describe('4. Patrón Builder (WorkOrderBuilder y WorkOrderDirector)', () => {
    it('debe rechazar la construcción si faltan datos obligatorios del dispositivo', () => {
      const builder = new WorkOrderBuilder();
      builder.setProblem('No enciende');

      expect(() => builder.build()).toThrow(BadRequestError);
      expect(() => builder.build()).toThrow('El dispositivo debe incluir marca, modelo y número de serie.');
    });

    it('debe rechazar la construcción si no se incluye la descripción del problema', () => {
      const builder = new WorkOrderBuilder();
      builder.setDevice('Apple', 'iPhone 14', 'SERIAL-999');

      expect(() => builder.build()).toThrow(BadRequestError);
      expect(() => builder.build()).toThrow('Debe especificar la descripción del problema');
    });

    it('debe construir exitosamente una orden mediante interfaz fluida (method chaining)', () => {
      const orderData = new WorkOrderBuilder()
        .setDevice('Samsung', 'Galaxy S23', 'IMEI-456789')
        .setProblem('Cambio de batería y revisión de puerto de carga')
        .setSecurity('Patrón Z')
        .setAccessories('Cargador rápido y funda transparente')
        .build();

      expect(orderData.deviceBrand).toBe('Samsung');
      expect(orderData.deviceModel).toBe('Galaxy S23');
      expect(orderData.deviceSerial).toBe('IMEI-456789');
      expect(orderData.problemDescription).toBe('Cambio de batería y revisión de puerto de carga');
      expect(orderData.devicePassword).toBe('Patrón Z');
      expect(orderData.accessories).toBe('Cargador rápido y funda transparente');
    });

    it('el Director debe construir una recepción rápida estándar (Express Checkin)', () => {
      const builder = new WorkOrderBuilder();
      const order = WorkOrderDirector.constructExpressCheckin(
        builder,
        'Xiaomi',
        'Redmi Note 12',
        'SN-XIAOMI-101',
        'Vidrio templado roto',
      );

      expect(order.deviceBrand).toBe('Xiaomi');
      expect(order.deviceModel).toBe('Redmi Note 12');
      expect(order.deviceSerial).toBe('SN-XIAOMI-101');
      expect(order.problemDescription).toBe('Vidrio templado roto');
      expect(order.customerId).toBeNull();
    });

    it('el Director debe construir una recepción completa con cita y accesorios', () => {
      const builder = new WorkOrderBuilder();
      const customerUuid = '11111111-1111-4111-8111-111111111111';
      const order = WorkOrderDirector.constructFullReception(builder, {
        customerId: customerUuid,
        brand: 'Sony',
        model: 'PlayStation 5',
        serial: 'PS5-SERIAL-2024',
        issue: 'Sobrecalentamiento y apagado repentino',
        accessories: 'Cable HDMI y cable de poder',
        password: 'Sin contraseña',
        scheduledTime: '2026-10-15T10:00:00.000Z',
      });

      expect(order.customerId).toBe(customerUuid);
      expect(order.deviceBrand).toBe('Sony');
      expect(order.accessories).toBe('Cable HDMI y cable de poder');
      expect(order.scheduledTime).toBe('2026-10-15T10:00:00.000Z');
    });
  });
});
