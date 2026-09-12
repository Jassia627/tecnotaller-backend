import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DiagnosticRepository } from './diagnostics.repository';
import { CreateDiagnosticInput } from './diagnostics.types';
import { supabase } from '../../config/supabase';

/**
 * INTEGRATION TESTS - Requiere acceso a Supabase con service role key
 */

describe('DiagnosticRepository - Integration Tests', { timeout: 15000 }, () => {
  let repository: DiagnosticRepository;
  const testDiagnosticIds: string[] = [];
  let testWorkOrderId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // Fallback
  let testTechnicianId: string | null = null;

  beforeAll(async () => {
    repository = new DiagnosticRepository();
    const { data: order } = await supabase.from('work_orders').select('id').limit(1).maybeSingle();
    if (order) {
      testWorkOrderId = order.id;
    }
  });

  afterAll(async () => {
    if (testDiagnosticIds.length > 0) {
      await supabase.from('diagnostics').delete().in('id', testDiagnosticIds);
    }
  });

  describe('create', () => {
    it('should create a new diagnostic', async () => {
      const input: CreateDiagnosticInput = {
        observations: 'Dispositivo con daño visible en pantalla',
        faults: 'Pantalla LCD rota',
        recommendedActions: 'Reemplazar pantalla',
      };

      const result = await repository.create(testWorkOrderId, testTechnicianId, input);

      expect(result.id).toBeDefined();
      expect(result.work_order_id).toBe(testWorkOrderId);
      expect(result.technician_id).toBe(testTechnicianId);
      expect(result.observations).toBe(input.observations);
      expect(result.faults).toBe(input.faults);
      expect(result.recommended_actions).toBe(input.recommendedActions);
      expect(result.created_at).toBeDefined();

      testDiagnosticIds.push(result.id);
    });

    it('should create diagnostic with different content', async () => {
      const input: CreateDiagnosticInput = {
        observations: 'Batería no carga',
        faults: 'Batería defectuosa - no sostiene carga',
        recommendedActions: 'Cambiar batería',
      };

      const result = await repository.create(testWorkOrderId, testTechnicianId, input);

      expect(result.faults).toBe(input.faults);
      expect(result.recommended_actions).toBe(input.recommendedActions);

      testDiagnosticIds.push(result.id);
    });

    it('should create multiple diagnostics for same work order', async () => {
      const inputs: CreateDiagnosticInput[] = [
        {
          observations: 'Revisión inicial',
          faults: 'Múltiples fallos detectados',
          recommendedActions: 'Diagnóstico completo',
        },
        {
          observations: 'Revisión profunda',
          faults: 'Componente X dañado',
          recommendedActions: 'Reemplazar componente X',
        },
      ];

      for (const input of inputs) {
        const result = await repository.create(testWorkOrderId, testTechnicianId, input);
        expect(result.id).toBeDefined();
        testDiagnosticIds.push(result.id);
      }
    });
  });

  describe('listByWorkOrder', () => {
    it('should list diagnostics for a work order', async () => {
      const input: CreateDiagnosticInput = {
        observations: 'Para listar',
        faults: 'Fallo de prueba',
        recommendedActions: 'Acción de prueba',
      };

      const created = await repository.create(testWorkOrderId, testTechnicianId, input);
      testDiagnosticIds.push(created.id);

      const result = await repository.listByWorkOrder(testWorkOrderId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(d => d.id === created.id)).toBe(true);
    });

    it('should return empty array when no diagnostics exist', async () => {
      const nonExistentWorkOrderId = 'non-existent-' + Date.now();
      const result = await repository.listByWorkOrder(nonExistentWorkOrderId);

      expect(result).toEqual([]);
    });

    it('should return diagnostics ordered by creation date (newest first)', async () => {
      const result = await repository.listByWorkOrder(testWorkOrderId);

      if (result.length > 1) {
        for (let i = 0; i < result.length - 1; i++) {
          const current = new Date(result[i].created_at);
          const next = new Date(result[i + 1].created_at);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });

    it('should include all diagnostic fields', async () => {
      const result = await repository.listByWorkOrder(testWorkOrderId);

      result.forEach(diag => {
        expect(diag).toHaveProperty('id');
        expect(diag).toHaveProperty('work_order_id');
        expect(diag).toHaveProperty('technician_id');
        expect(diag).toHaveProperty('observations');
        expect(diag).toHaveProperty('faults');
        expect(diag).toHaveProperty('recommended_actions');
        expect(diag).toHaveProperty('created_at');
      });
    });
  });

  describe('diagnostic data integrity', () => {
    it('should preserve diagnostic information', async () => {
      const input: CreateDiagnosticInput = {
        observations: 'Observaciones muy detalladas con caracteres especiales: éñ@#$',
        faults: 'Fallos: problemas múltiples encontrados',
        recommendedActions: 'Acciones: reemplazar y calibrar',
      };

      const created = await repository.create(testWorkOrderId, testTechnicianId, input);
      testDiagnosticIds.push(created.id);

      const result = await repository.listByWorkOrder(testWorkOrderId);
      const found = result.find(d => d.id === created.id);

      expect(found?.observations).toBe(input.observations);
      expect(found?.faults).toBe(input.faults);
      expect(found?.recommended_actions).toBe(input.recommendedActions);
    });

    it('should preserve work order and technician relationships', async () => {
      const input: CreateDiagnosticInput = {
        observations: 'Relaciones',
        faults: 'Prueba relaciones',
        recommendedActions: 'Verificar',
      };

      const created = await repository.create(testWorkOrderId, testTechnicianId, input);
      testDiagnosticIds.push(created.id);

      expect(created.work_order_id).toBe(testWorkOrderId);
      expect(created.technician_id).toBe(testTechnicianId);
    });
  });
});
