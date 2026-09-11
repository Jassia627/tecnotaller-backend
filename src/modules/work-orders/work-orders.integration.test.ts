import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '../../config/supabase';
import { WorkOrderRepository } from './work-orders.repository';
import { WorkOrderService } from './work-orders.service';
import { CreateWorkOrderInput, OrderStatus } from './work-orders.types';
import { guidGenerator } from '../../shared/utils/guid';
import { NotFoundError, ForbiddenError } from '../../shared/errors/app-error';

describe('WorkOrderService - Integration Tests', () => {
  let repository: WorkOrderRepository;
  let service: WorkOrderService;
  let testWorkOrderId: string;
  let testGuideNumber: string;

  beforeAll(() => {
    repository = new WorkOrderRepository();
    service = new WorkOrderService(repository, guidGenerator);
  });

  describe('CREATE - Crear orden de servicio', () => {
    it('✅ Debe crear una orden válida con todos los campos', async () => {
      const input: CreateWorkOrderInput = {
        customerId: null,
        technicianId: null,
        deviceBrand: 'Apple',
        deviceModel: 'iPhone 15 Pro',
        deviceSerial: 'ABC123DEF456',
        problemDescription: 'Pantalla rota y no enciende',
        accessories: 'Cable USB-C, Caja original',
      };

      const order = await service.create(input);

      expect(order).toBeDefined();
      expect(order.id).toBeDefined();
      expect(order.guideNumber).toBeDefined();
      expect(order.deviceBrand).toBe('Apple');
      expect(order.deviceModel).toBe('iPhone 15 Pro');
      expect(order.currentStatus).toBe('INGRESADO');
      expect(order.createdAt).toBeDefined();

      testWorkOrderId = order.id;
      testGuideNumber = order.guideNumber;
    });

    it('✅ Debe generar guide_number único', async () => {
      const input: CreateWorkOrderInput = {
        deviceBrand: 'Samsung',
        deviceModel: 'Galaxy S24',
        deviceSerial: 'XYZ789',
        problemDescription: 'Batería no carga',
      };

      const order1 = await service.create(input);
      const order2 = await service.create(input);

      expect(order1.guideNumber).not.toBe(order2.guideNumber);
      expect(order1.guideNumber).toMatch(/^[A-Z0-9]{8}$/);
      expect(order2.guideNumber).toMatch(/^[A-Z0-9]{8}$/);

      // Cleanup
      await supabase.from('work_orders').delete().eq('id', order1.id);
      await supabase.from('work_orders').delete().eq('id', order2.id);
    });
  });

  describe('READ - Obtener órdenes', () => {
    it('✅ Debe obtener orden por ID', async () => {
      const order = await service.getById(testWorkOrderId);

      expect(order).toBeDefined();
      expect(order.id).toBe(testWorkOrderId);
      expect(order.guideNumber).toBe(testGuideNumber);
    });

    it('❌ Debe retornar NotFoundError si ID no existe', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(service.getById(fakeId)).rejects.toThrow(NotFoundError);
    });

    it('✅ Debe listar órdenes con paginación', async () => {
      const result = await service.list({
        page: 1,
        pageSize: 10,
        userRole: 'administrador',
      });

      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('✅ Debe filtrar órdenes por status', async () => {
      const result = await service.list({
        status: 'INGRESADO',
        page: 1,
        pageSize: 10,
        userRole: 'administrador',
      });

      expect(result.items).toBeDefined();
      // Al menos la orden que creamos debe estar aquí
      expect(result.items.some(o => o.id === testWorkOrderId)).toBe(true);
    });

    it('✅ Técnico debe ver solo sus órdenes', async () => {
      const technicianId = '00000000-0000-0000-0000-000000000001';

      const result = await service.list({
        page: 1,
        pageSize: 10,
        userRole: 'tecnico',
        userTechnicianId: technicianId,
      });

      // Si el técnico tiene órdenes, todas deben ser suyas
      result.items.forEach(order => {
        // La orden sin técnico asignado no debería aparecer
        if (order.technicianId === null) {
          expect(order.technicianId).not.toBeNull();
        }
      });
    });
  });

  describe('STATE TRANSITIONS - Máquina de estados', () => {
    it('✅ Debe transicionar de INGRESADO a EN_REVISION', async () => {
      const userId = '00000000-0000-0000-0000-000000000002';

      const updated = await service.transitionStatus(testWorkOrderId, 'EN_REVISION', userId);

      expect(updated.currentStatus).toBe('EN_REVISION');
    });

    it('✅ Debe transicionar de EN_REVISION a EN_REPARACION', async () => {
      const userId = '00000000-0000-0000-0000-000000000002';

      const updated = await service.transitionStatus(testWorkOrderId, 'EN_REPARACION', userId);

      expect(updated.currentStatus).toBe('EN_REPARACION');
    });

    it('❌ Debe rechazar transición inválida', async () => {
      const userId = '00000000-0000-0000-0000-000000000002';

      // EN_REPARACION no puede ir a EN_REVISION
      await expect(
        service.transitionStatus(testWorkOrderId, 'EN_REVISION', userId)
      ).rejects.toThrow(ForbiddenError);
    });

    it('✅ Debe registrar historial de transiciones', async () => {
      const history = await service.getHistory(testWorkOrderId);

      expect(history).toBeInstanceOf(Array);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty('fromStatus');
      expect(history[0]).toHaveProperty('toStatus');
      expect(history[0]).toHaveProperty('userId');
    });
  });

  describe('TRACK - Rastreo por guía', () => {
    it('✅ Debe rastrear orden por guideNumber', async () => {
      const result = await service.trackByGuide(testGuideNumber);

      expect(result).toBeDefined();
      expect(result.order).toBeDefined();
      expect(result.order.guideNumber).toBe(testGuideNumber);
      expect(result.history).toBeInstanceOf(Array);
    });

    it('❌ Debe retornar NotFoundError si guideNumber no existe', async () => {
      const fakeGuide = 'XXXXXXXX';

      await expect(service.trackByGuide(fakeGuide)).rejects.toThrow(NotFoundError);
    });

    it('❌ Cliente debe ver solo sus órdenes', async () => {
      const customerId = '00000000-0000-0000-0000-000000000003';

      // Cliente intenta rastrear orden que no es suya
      await expect(service.trackByGuide(testGuideNumber, customerId)).rejects.toThrow(
        ForbiddenError
      );
    });
  });

  describe('EXIT REGISTER - Registro de salida', () => {
    it('❌ No debe registrar salida si status != LISTO_PARA_ENTREGA', async () => {
      // Orden está en EN_REPARACION, no LISTO_PARA_ENTREGA
      const input = {
        finalState: 'Reparado',
        repairsPerformed: 'Pantalla reemplazada',
      };

      await expect(service.registerExit(testWorkOrderId, input)).rejects.toThrow(
        ForbiddenError
      );
    });

    it('✅ Debe registrar salida si status == LISTO_PARA_ENTREGA', async () => {
      const userId = '00000000-0000-0000-0000-000000000002';

      // Transicionar a REPARADO
      await service.transitionStatus(testWorkOrderId, 'REPARADO', userId);

      // Transicionar a LISTO_PARA_ENTREGA
      await service.transitionStatus(testWorkOrderId, 'LISTO_PARA_ENTREGA', userId);

      // Ahora sí registrar salida
      const input = {
        finalState: 'Dispositivo funcionando correctamente',
        repairsPerformed: 'Pantalla reemplazada, batería reemplazada',
        partsUsed: 'Pantalla OLED, Batería Li-Po',
        observations: 'Se realizó prueba de funcionamiento',
      };

      const updated = await service.registerExit(testWorkOrderId, input);

      expect(updated).toBeDefined();
      expect(updated.id).toBe(testWorkOrderId);
    });
  });

  describe('PHOTOS - Fotos de la orden', () => {
    it('✅ Debe agregar foto a orden', async () => {
      const storagePath = 'work-orders/initial/test-photo.jpg';

      await service.addPhoto(testWorkOrderId, storagePath, 'inicial');

      // Verificar que se insertó
      const photos = await supabase
        .from('order_photos')
        .select('*')
        .eq('work_order_id', testWorkOrderId);

      expect(photos.data).toBeDefined();
      expect(photos.data?.length).toBeGreaterThan(0);
    });
  });

  describe('DATA INTEGRITY - Integridad de datos', () => {
    it('✅ Todos los campos requeridos están presentes', async () => {
      const order = await service.getById(testWorkOrderId);

      expect(order.id).toBeDefined();
      expect(order.guideNumber).toBeDefined();
      expect(order.deviceBrand).toBeDefined();
      expect(order.deviceModel).toBeDefined();
      expect(order.deviceSerial).toBeDefined();
      expect(order.problemDescription).toBeDefined();
      expect(order.currentStatus).toBeDefined();
      expect(order.createdAt).toBeDefined();
    });

    it('✅ camelCase mapping funciona correctamente', async () => {
      const order = await service.getById(testWorkOrderId);

      // Verificar que la respuesta usa camelCase
      expect(order).toHaveProperty('customerId');
      expect(order).toHaveProperty('technicianId');
      expect(order).toHaveProperty('deviceBrand');
      expect(order).toHaveProperty('deviceModel');
      expect(order).toHaveProperty('deviceSerial');
      expect(order).toHaveProperty('problemDescription');
      expect(order).toHaveProperty('currentStatus');
      expect(order).toHaveProperty('createdAt');

      // No debería tener snake_case
      expect(order).not.toHaveProperty('customer_id');
      expect(order).not.toHaveProperty('technician_id');
      expect(order).not.toHaveProperty('device_brand');
    });
  });

  afterAll(async () => {
    // Cleanup: eliminar la orden de prueba
    if (testWorkOrderId) {
      await supabase.from('work_orders').delete().eq('id', testWorkOrderId);
    }
  });
});
