import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WorkOrderRepository } from './work-orders.repository';
import { CreateWorkOrderInput } from './work-orders.types';
import { supabase } from '../../config/supabase';

/**
 * INTEGRATION TESTS - Requiere acceso a Supabase con service role key
 */

describe('WorkOrderRepository - Integration Tests', { timeout: 15000 }, () => {
  let repository: WorkOrderRepository;
  const testWorkOrderIds: string[] = [];
  let testCustomerId: string | null = null;
  let testTechnicianId: string | null = null;

  beforeAll(async () => {
    repository = new WorkOrderRepository();

    const { data: customer } = await supabase.from('customers').select('id').limit(1).maybeSingle();
    if (customer) testCustomerId = customer.id;

    const { data: technician } = await supabase.from('technicians').select('id').limit(1).maybeSingle();
    if (technician) testTechnicianId = technician.id;
  });

  afterAll(async () => {
    if (testWorkOrderIds.length > 0) {
      await supabase.from('work_orders').delete().in('id', testWorkOrderIds);
    }
  });

  describe('create', () => {
    it('should create a new work order', async () => {
      const input: CreateWorkOrderInput = {
        customerId: testCustomerId,
        technicianId: testTechnicianId,
        deviceBrand: 'Apple',
        deviceModel: 'iPhone 13',
        deviceSerial: `SERIAL-${Date.now()}`,
        problemDescription: 'Pantalla rota',
      };

      const guideNumber = `WO-${Date.now()}`;
      const result = await repository.create(input, guideNumber);

      expect(result.id).toBeDefined();
      expect(result.guide_number).toBe(guideNumber);
      expect(result.customer_id).toBe(testCustomerId);
      expect(result.device_brand).toBe('Apple');
      expect(result.current_status).toBe('INGRESADO');

      testWorkOrderIds.push(result.id);
    });

    it('should create work order with optional fields', async () => {
      const input: CreateWorkOrderInput = {
        deviceBrand: 'Samsung',
        deviceModel: 'Galaxy S21',
        deviceSerial: `SERIAL-${Date.now()}`,
        problemDescription: 'No enciende',
      };

      const guideNumber = `WO-${Date.now()}`;
      const result = await repository.create(input, guideNumber);

      expect(result.customer_id).toBeNull();
      expect(result.technician_id).toBeNull();
      expect(result.accessories).toBeNull();

      testWorkOrderIds.push(result.id);
    });

    it('should create initial status history entry', async () => {
      const input: CreateWorkOrderInput = {
        deviceBrand: 'Sony',
        deviceModel: 'Xperia',
        deviceSerial: `SERIAL-${Date.now()}`,
        problemDescription: 'Batería',
      };

      const guideNumber = `WO-${Date.now()}`;
      const result = await repository.create(input, guideNumber);

      testWorkOrderIds.push(result.id);

      const history = await repository.listHistory(result.id);

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].from_status).toBe('INGRESADO');
      expect(history[0].to_status).toBe('INGRESADO');
    });
  });

  describe('findById', () => {
    it('should find a work order by id', async () => {
      const input: CreateWorkOrderInput = {
        deviceBrand: 'Xiaomi',
        deviceModel: 'Redmi Note',
        deviceSerial: `SERIAL-${Date.now()}`,
        problemDescription: 'Pantalla mojada',
      };

      const guideNumber = `WO-${Date.now()}`;
      const created = await repository.create(input, guideNumber);
      testWorkOrderIds.push(created.id);

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.guide_number).toBe(guideNumber);
    });

    it('should return null when work order does not exist or id is invalid', async () => {
      const nonExistentUuidResult = await repository.findById('00000000-0000-0000-0000-000000000000');
      expect(nonExistentUuidResult).toBeNull();

      const invalidResult = await repository.findById('non-existent-' + Date.now());
      expect(invalidResult).toBeNull();
    });
  });

  describe('findByGuideNumber', () => {
    it('should find work order by guide number', async () => {
      const input: CreateWorkOrderInput = {
        deviceBrand: 'Huawei',
        deviceModel: 'P50',
        deviceSerial: `SERIAL-${Date.now()}`,
        problemDescription: 'Cámara',
      };

      const guideNumber = `WO-FIND-${Date.now()}`;
      const created = await repository.create(input, guideNumber);
      testWorkOrderIds.push(created.id);

      const found = await repository.findByGuideNumber(guideNumber);

      expect(found).toBeDefined();
      expect(found?.guide_number).toBe(guideNumber);
      expect(found?.id).toBe(created.id);
    });

    it('should return null when guide number does not exist', async () => {
      const result = await repository.findByGuideNumber('INVALID-GUIDE-' + Date.now());
      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should list work orders with pagination', async () => {
      const input: CreateWorkOrderInput = {
        deviceBrand: 'Nokia',
        deviceModel: 'Lumia',
        deviceSerial: `SERIAL-${Date.now()}`,
        problemDescription: 'Test',
      };

      const guideNumber = `WO-LIST-${Date.now()}`;
      const created = await repository.create(input, guideNumber);
      testWorkOrderIds.push(created.id);

      const result = await repository.list({ page: 1, pageSize: 10 });

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.rows.some(wo => wo.id === created.id)).toBe(true);
    });

    it('should filter by status', async () => {
      const result = await repository.list({ page: 1, pageSize: 10, status: 'INGRESADO' });

      expect(result.rows.length).toBeGreaterThanOrEqual(0);
      result.rows.forEach(wo => {
        expect(wo.current_status).toBe('INGRESADO');
      });
    });

    it('should respect page size', async () => {
      const result = await repository.list({ page: 1, pageSize: 5 });

      expect(result.rows.length).toBeLessThanOrEqual(5);
    });

    it('should order by creation date (newest first)', async () => {
      const result = await repository.list({ page: 1, pageSize: 20 });

      if (result.rows.length > 1) {
        for (let i = 0; i < result.rows.length - 1; i++) {
          const current = new Date(result.rows[i].created_at);
          const next = new Date(result.rows[i + 1].created_at);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });
  });

  describe('listHistory', () => {
    it('should list status history for a work order', async () => {
      const input: CreateWorkOrderInput = {
        deviceBrand: 'LG',
        deviceModel: 'G',
        deviceSerial: `SERIAL-${Date.now()}`,
        problemDescription: 'Historia',
      };

      const guideNumber = `WO-HIST-${Date.now()}`;
      const created = await repository.create(input, guideNumber);
      testWorkOrderIds.push(created.id);

      const history = await repository.listHistory(created.id);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should return history ordered chronologically', async () => {
      const input: CreateWorkOrderInput = {
        deviceBrand: 'Motorola',
        deviceModel: 'Razr',
        deviceSerial: `SERIAL-${Date.now()}`,
        problemDescription: 'Orden',
      };

      const guideNumber = `WO-ORDER-${Date.now()}`;
      const created = await repository.create(input, guideNumber);
      testWorkOrderIds.push(created.id);

      const history = await repository.listHistory(created.id);

      if (history.length > 1) {
        for (let i = 0; i < history.length - 1; i++) {
          const current = new Date(history[i].created_at);
          const next = new Date(history[i + 1].created_at);
          expect(current.getTime()).toBeLessThanOrEqual(next.getTime());
        }
      }
    });
  });

  describe('listHistoryByGuide', () => {
    it('should list history by guide number', async () => {
      const input: CreateWorkOrderInput = {
        deviceBrand: 'OnePlus',
        deviceModel: '9',
        deviceSerial: `SERIAL-${Date.now()}`,
        problemDescription: 'Historia por Guía',
      };

      const guideNumber = `WO-GUIDE-${Date.now()}`;
      const created = await repository.create(input, guideNumber);
      testWorkOrderIds.push(created.id);

      const history = await repository.listHistoryByGuide(guideNumber);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-existent guide', async () => {
      const result = await repository.listHistoryByGuide('INVALID-' + Date.now());
      expect(result).toEqual([]);
    });
  });

  describe('addPhoto', () => {
    it('should add a photo to work order', async () => {
      const input: CreateWorkOrderInput = {
        deviceBrand: 'Google',
        deviceModel: 'Pixel',
        deviceSerial: `SERIAL-${Date.now()}`,
        problemDescription: 'Foto',
      };

      const guideNumber = `WO-PHOTO-${Date.now()}`;
      const created = await repository.create(input, guideNumber);
      testWorkOrderIds.push(created.id);

      const storagePath = `photos/wo-${created.id}/initial.jpg`;

      await expect(repository.addPhoto(created.id, storagePath, 'inicial')).resolves.not.toThrow();
    });

    it('should add initial and final photos', async () => {
      const input: CreateWorkOrderInput = {
        deviceBrand: 'Vivo',
        deviceModel: 'X',
        deviceSerial: `SERIAL-${Date.now()}`,
        problemDescription: 'Fotos',
      };

      const guideNumber = `WO-PHOTOS-${Date.now()}`;
      const created = await repository.create(input, guideNumber);
      testWorkOrderIds.push(created.id);

      const initialPath = `photos/wo-${created.id}/initial.jpg`;
      const finalPath = `photos/wo-${created.id}/final.jpg`;

      await repository.addPhoto(created.id, initialPath, 'inicial');
      await repository.addPhoto(created.id, finalPath, 'final');

      expect(true).toBe(true); // Ambas llamadas exitosas
    });
  });

  describe('registerExit', () => {
    it('should register exit data for work order', async () => {
      const input: CreateWorkOrderInput = {
        deviceBrand: 'Oppo',
        deviceModel: 'A',
        deviceSerial: `SERIAL-${Date.now()}`,
        problemDescription: 'Salida',
      };

      const guideNumber = `WO-EXIT-${Date.now()}`;
      const created = await repository.create(input, guideNumber);
      testWorkOrderIds.push(created.id);

      const exitData = {
        finalState: 'Funcionando correctamente',
        repairsPerformed: 'Cambio de pantalla',
        partsUsed: 'Pantalla LCD',
        observations: 'Prueba exitosa',
      };

      const result = await repository.registerExit(created.id, exitData);

      expect(result.id).toBe(created.id);
      expect(result.exit_final_state).toBe(exitData.finalState);
      expect(result.exit_repairs_performed).toBe(exitData.repairsPerformed);
    });

    it('should register exit without optional fields', async () => {
      const input: CreateWorkOrderInput = {
        deviceBrand: 'Realme',
        deviceModel: 'C',
        deviceSerial: `SERIAL-${Date.now()}`,
        problemDescription: 'Salida mínima',
      };

      const guideNumber = `WO-EXIT-MIN-${Date.now()}`;
      const created = await repository.create(input, guideNumber);
      testWorkOrderIds.push(created.id);

      const exitData = {
        finalState: 'Reparado',
        repairsPerformed: 'Reparación completa',
      };

      const result = await repository.registerExit(created.id, exitData);

      expect(result.exit_final_state).toBe(exitData.finalState);
      expect(result.exit_repairs_performed).toBe(exitData.repairsPerformed);
      expect(result.exit_parts_used).toBeNull();
      expect(result.exit_observations).toBeNull();
    });
  });
});
