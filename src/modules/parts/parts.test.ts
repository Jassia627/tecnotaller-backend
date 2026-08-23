import { describe, it, expect, vi } from 'vitest';
import { Part } from './parts.types';
import { PartService } from './parts.service';
import { IPartRepository } from './parts.repository';
import { IWorkOrderRepository } from '../work-orders/work-orders.repository';

const partRow = {
  id: 'part1',
  name: 'Pantalla iPhone 13',
  sku: 'P-001',
  stock: 10,
  purchase_price: 100,
  sale_price: 200,
  created_at: '2026-08-22T10:00:00.000Z',
};

const workOrderRow = {
  id: 'wo1',
  guide_number: 'ABC12345',
  customer_id: null,
  technician_id: null,
  device_brand: 'Apple',
  device_model: 'iPhone 13',
  device_serial: 'SN-001',
  problem_description: 'No enciende',
  device_password_encrypted: null,
  accessories: null,
  current_status: 'EN_REVISION' as const,
  created_at: '2026-08-22T10:00:00.000Z',
};

describe('Part (encapsulamiento)', () => {
  it('descuenta stock y lanza error si excede', () => {
    const p = Part.fromRow(partRow);
    p.discount(4);
    expect(p.stock).toBe(6);
    expect(() => p.discount(100)).toThrow('Stock de repuesto insuficiente');
  });
});

describe('PartService', () => {
  function buildRepo(): IPartRepository {
    return {
      list: vi.fn().mockResolvedValue({ rows: [partRow], total: 1 }),
      findById: vi.fn().mockResolvedValue(partRow),
      create: vi.fn().mockResolvedValue(partRow),
      update: vi.fn().mockResolvedValue(partRow),
      assignToWorkOrder: vi.fn().mockResolvedValue({ ...partRow, stock: 8 }),
    };
  }
  function buildWorkOrderRepo(): IWorkOrderRepository {
    return { findById: vi.fn().mockResolvedValue(workOrderRow) } as unknown as IWorkOrderRepository;
  }

  it('asocia un repuesto a una orden si hay stock', async () => {
    const repo = buildRepo();
    const service = new PartService(repo, buildWorkOrderRepo());
    const part = await service.assignToWorkOrder('wo1', { partId: 'part1', quantity: 2 });
    expect(part.stock).toBe(8);
  });

  it('rechaza asociar un repuesto con stock insuficiente', async () => {
    const repo = buildRepo();
    const service = new PartService(repo, buildWorkOrderRepo());
    await expect(service.assignToWorkOrder('wo1', { partId: 'part1', quantity: 999 })).rejects.toThrow('Stock de repuesto insuficiente');
  });
});
