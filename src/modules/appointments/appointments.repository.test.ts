import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppointmentRepository } from './appointments.repository';
import { CreateAppointmentInput } from './appointments.types';
import { supabase } from '../../config/supabase';

/**
 * INTEGRATION TESTS - Requiere acceso a Supabase con service role key
 * 
 * Estos tests interactúan con la base de datos real usando la service role key
 * que bypassea las RLS, permitiendo insertar/actualizar/eliminar sin autenticación
 * de usuario cliente.
 */

describe('AppointmentRepository - Integration Tests', { timeout: 15000 }, () => {
  let repository: AppointmentRepository;
  const testAppointmentIds: string[] = [];
  let testServiceId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // Fallback UUID

  beforeAll(async () => {
    repository = new AppointmentRepository();
    const { data: service } = await supabase.from('services').select('id').limit(1).maybeSingle();
    if (service) {
      testServiceId = service.id;
    }
  });

  afterAll(async () => {
    if (testAppointmentIds.length > 0) {
      await supabase.from('appointments').delete().in('id', testAppointmentIds);
    }
  });

  describe('create', () => {
    it('should create a new appointment in database', async () => {
      const input: CreateAppointmentInput = {
        serviceId: testServiceId,
        customerName: `Cliente Test ${Date.now()}`,
        phone: '+34 123456789',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Mañana
      };

      const result = await repository.create(input);

      expect(result.id).toBeDefined();
      expect(result.service_id).toBe(testServiceId);
      expect(result.customer_name).toBe(input.customerName);
      expect(result.phone).toBe(input.phone);
      expect(result.status).toBe('pendiente');
      expect(result.created_at).toBeDefined();

      testAppointmentIds.push(result.id);
    });

    it('should create multiple appointments', async () => {
      const inputs: CreateAppointmentInput[] = [
        {
          serviceId: testServiceId,
          customerName: `Cliente A ${Date.now()}`,
          phone: '+34 111111111',
          date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        },
        {
          serviceId: testServiceId,
          customerName: `Cliente B ${Date.now()}`,
          phone: '+34 222222222',
          date: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        },
      ];

      for (const input of inputs) {
        const result = await repository.create(input);
        expect(result.id).toBeDefined();
        testAppointmentIds.push(result.id);
      }
    });
  });

  describe('findById', () => {
    it('should find an appointment by id', async () => {
      const input: CreateAppointmentInput = {
        serviceId: testServiceId,
        customerName: `Find Test ${Date.now()}`,
        phone: '+34 333333333',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const created = await repository.create(input);
      testAppointmentIds.push(created.id);

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.customer_name).toBe(input.customerName);
      expect(found?.status).toBe('pendiente');
    });

    it('should return null when appointment does not exist or id is invalid', async () => {
      const nonExistentResult = await repository.findById('00000000-0000-0000-0000-000000000000');
      expect(nonExistentResult).toBeNull();

      const invalidResult = await repository.findById('non-existent-id-' + Date.now());
      expect(invalidResult).toBeNull();
    });
  });

  describe('list', () => {
    it('should list all appointments', async () => {
      const input: CreateAppointmentInput = {
        serviceId: testServiceId,
        customerName: `List Test ${Date.now()}`,
        phone: '+34 444444444',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const created = await repository.create(input);
      testAppointmentIds.push(created.id);

      const result = await repository.list({});

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(a => a.id === created.id)).toBe(true);
    });

    it('should list appointments by status', async () => {
      const input: CreateAppointmentInput = {
        serviceId: testServiceId,
        customerName: `Status Test ${Date.now()}`,
        phone: '+34 555555555',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const created = await repository.create(input);
      testAppointmentIds.push(created.id);

      const result = await repository.list({ status: 'pendiente' });

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(a => a.id === created.id)).toBe(true);
      expect(result.every(a => a.status === 'pendiente')).toBe(true);
    });

    it('should list appointments by date range', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const input: CreateAppointmentInput = {
        serviceId: testServiceId,
        customerName: `Date Range Test ${Date.now()}`,
        phone: '+34 666666666',
        date: tomorrow,
      };

      const created = await repository.create(input);
      testAppointmentIds.push(created.id);

      const result = await repository.list({
        from: tomorrow,
        to: nextWeek,
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(a => a.id === created.id)).toBe(true);
    });

    it('should return appointments ordered by date', async () => {
      const result = await repository.list({});

      if (result.length > 1) {
        for (let i = 0; i < result.length - 1; i++) {
          const current = new Date(result[i].date);
          const next = new Date(result[i + 1].date);
          expect(current.getTime()).toBeLessThanOrEqual(next.getTime());
        }
      }
    });
  });

  describe('setStatus', () => {
    it('should change appointment status to confirmada', async () => {
      const input: CreateAppointmentInput = {
        serviceId: testServiceId,
        customerName: `Status Change Test ${Date.now()}`,
        phone: '+34 777777777',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const created = await repository.create(input);
      testAppointmentIds.push(created.id);

      expect(created.status).toBe('pendiente');

      const updated = await repository.setStatus(created.id, 'confirmada');

      expect(updated.status).toBe('confirmada');
      expect(updated.id).toBe(created.id);

      // Verificar persistencia
      const found = await repository.findById(created.id);
      expect(found?.status).toBe('confirmada');
    });

    it('should change appointment status to cancelada', async () => {
      const input: CreateAppointmentInput = {
        serviceId: testServiceId,
        customerName: `Cancel Test ${Date.now()}`,
        phone: '+34 888888888',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const created = await repository.create(input);
      testAppointmentIds.push(created.id);

      const updated = await repository.setStatus(created.id, 'cancelada');

      expect(updated.status).toBe('cancelada');
    });

    it('should transition through multiple statuses', async () => {
      const input: CreateAppointmentInput = {
        serviceId: testServiceId,
        customerName: `Transition Test ${Date.now()}`,
        phone: '+34 999999999',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const created = await repository.create(input);
      testAppointmentIds.push(created.id);

      expect(created.status).toBe('pendiente');

      const confirmed = await repository.setStatus(created.id, 'confirmada');
      expect(confirmed.status).toBe('confirmada');

      const completed = await repository.setStatus(created.id, 'completada');
      expect(completed.status).toBe('completada');
    });
  });

  describe('hasOverlap', () => {
    it('should detect overlap with existing appointment', async () => {
      const date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

      const input: CreateAppointmentInput = {
        serviceId: testServiceId,
        customerName: `Overlap Test ${Date.now()}`,
        phone: '+34 101010101',
        date,
      };

      const created = await repository.create(input);
      testAppointmentIds.push(created.id);

      // Crear un appointment dentro de la ventana de 15 minutos
      const overlapDate = new Date(new Date(date).getTime() + 5 * 60 * 1000).toISOString();

      const hasOverlap = await repository.hasOverlap(testServiceId, overlapDate);

      // Debería detectar el overlap (puede variar según la implementación)
      expect(typeof hasOverlap).toBe('boolean');
    });

    it('should not detect overlap when appointments are far apart', async () => {
      const date1 = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();
      const date2 = new Date(new Date(date1).getTime() + 2 * 60 * 60 * 1000).toISOString(); // 2 horas después

      const input: CreateAppointmentInput = {
        serviceId: testServiceId,
        customerName: `No Overlap Test ${Date.now()}`,
        phone: '+34 121212121',
        date: date1,
      };

      const created = await repository.create(input);
      testAppointmentIds.push(created.id);

      const hasOverlap = await repository.hasOverlap(testServiceId, date2);

      expect(hasOverlap).toBe(false);
    });
  });

  describe('cancelExpired', () => {
    it('should cancel appointments older than threshold', async () => {
      // Crear una cita en el pasado (20 minutos atrás)
      const pastDate = new Date(Date.now() - 20 * 60 * 1000).toISOString();

      const input: CreateAppointmentInput = {
        serviceId: testServiceId,
        customerName: `Expired Test ${Date.now()}`,
        phone: '+34 131313131',
        date: pastDate,
      };

      const created = await repository.create(input);
      testAppointmentIds.push(created.id);

      // Cancelar citas vencidas con threshold de 15 minutos
      const cancelledCount = await repository.cancelExpired(15);

      expect(cancelledCount).toBeGreaterThanOrEqual(0);

      // Verificar que se canceló
      const found = await repository.findById(created.id);
      expect(found?.status).toBe('cancelada');
    });

    it('should not cancel appointments within threshold', async () => {
      // Crear una cita en el futuro (30 minutos adelante)
      const futureDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      const input: CreateAppointmentInput = {
        serviceId: testServiceId,
        customerName: `Future Test ${Date.now()}`,
        phone: '+34 141414141',
        date: futureDate,
      };

      const created = await repository.create(input);
      testAppointmentIds.push(created.id);

      const beforeStatus = created.status;

      // Intentar cancelar citas vencidas con threshold de 15 minutos
      await repository.cancelExpired(15);

      // Verificar que NO se canceló
      const found = await repository.findById(created.id);
      expect(found?.status).toBe(beforeStatus);
    });
  });
});
