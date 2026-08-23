import { describe, it, expect, vi } from 'vitest';
import { WorkOrder } from './work-orders.types';
import { WorkOrderService } from './work-orders.service';
import { IWorkOrderRepository } from './work-orders.repository';
import { GuidGenerator } from '../../shared/utils/guid';

const workOrderRow = {
  id: 'wo1',
  guide_number: 'ABC12345',
  customer_id: 'c1',
  technician_id: null,
  device_brand: 'Apple',
  device_model: 'iPhone 13',
  device_serial: 'SN-001',
  problem_description: 'No enciende',
  device_password_encrypted: null,
  accessories: null,
  current_status: 'INGRESADO' as const,
  created_at: '2026-08-22T10:00:00.000Z',
};

const guidStub: GuidGenerator = { generate: () => '12345678-1234-1234-1234-123456789abc' };

describe('WorkOrder (máquina de estados)', () => {
  it('permite transiciones válidas', () => {
    const o = WorkOrder.fromRow(workOrderRow);
    expect(o.canTransitionTo('EN_REVISION')).toBe(true);
    o.transitionTo('EN_REVISION');
    expect(o.currentStatus).toBe('EN_REVISION');
  });

  it('rechaza transiciones inválidas', () => {
    const o = WorkOrder.fromRow(workOrderRow);
    expect(o.canTransitionTo('ENTREGADO')).toBe(false);
    expect(() => o.transitionTo('ENTREGADO')).toThrow('Transición inválida');
  });
});

describe('WorkOrderService', () => {
  function buildRepo(): IWorkOrderRepository {
    return {
      findById: vi.fn().mockResolvedValue(workOrderRow),
      findByGuideNumber: vi.fn().mockResolvedValue(workOrderRow),
      list: vi.fn().mockResolvedValue({ rows: [workOrderRow], total: 1 }),
      create: vi.fn().mockResolvedValue(workOrderRow),
      transitionStatus: vi.fn().mockResolvedValue({ ...workOrderRow, current_status: 'EN_REVISION' }),
      listHistory: vi.fn().mockResolvedValue([]),
      listHistoryByGuide: vi.fn().mockResolvedValue([]),
      addPhoto: vi.fn().mockResolvedValue(undefined),
      registerExit: vi.fn().mockResolvedValue(workOrderRow),
    };
  }

  it('crea una orden generando número de guía', async () => {
    const repo = buildRepo();
    const service = new WorkOrderService(repo, guidStub);
    const order = await service.create({
      deviceBrand: 'Apple',
      deviceModel: 'iPhone 13',
      deviceSerial: 'SN-001',
      problemDescription: 'No enciende',
    });
    expect(order.guideNumber).toBe('ABC12345');
    expect(repo.create).toHaveBeenCalledWith(expect.anything(), '12345678');
  });

  it('rechaza transición de estado inválida con ForbiddenError', async () => {
    const repo = buildRepo();
    const service = new WorkOrderService(repo, guidStub);
    await expect(service.transitionStatus('wo1', 'ENTREGADO', 'u1')).rejects.toThrow('Transición de estado inválida');
  });

  it('realiza seguimiento por guía sin autenticación', async () => {
    const repo = buildRepo();
    const service = new WorkOrderService(repo, guidStub);
    const result = await service.trackByGuide('ABC12345');
    expect(result.order.guideNumber).toBe('ABC12345');
  });
});
