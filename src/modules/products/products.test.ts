import { describe, it, expect, vi } from 'vitest';
import { Product } from './products.types';
import { ProductService } from './products.service';
import { IProductRepository } from './products.repository';

const productRow = {
  id: 'p1',
  sku: 'SKU-001',
  name: 'iPhone 13',
  description: '',
  image_url: null,
  category_id: null,
  purchase_price: 500,
  sale_price: 800,
  stock: 5,
  active: true,
  created_at: '2026-01-01T00:00:00Z',
};

describe('Product (encapsulamiento)', () => {
  it('descuenta stock y lanza error si excede', () => {
    const p = Product.fromRow(productRow);
    p.removeStock(3);
    expect(p.stock).toBe(2);
    expect(() => p.removeStock(10)).toThrow('Stock insuficiente');
  });

  it('no permite cantidades negativas al agregar/quitar', () => {
    const p = Product.fromRow(productRow);
    expect(() => p.addStock(-1)).toThrow();
    expect(() => p.removeStock(0)).toThrow();
  });

  it('expone disponibilidad en función de stock y estado', () => {
    const p = Product.fromRow(productRow);
    expect(p.available).toBe(true);
    p.deactivate();
    expect(p.available).toBe(false);
  });
});

describe('ProductService', () => {
  function buildRepo(): IProductRepository {
    return {
      list: vi.fn().mockResolvedValue({ rows: [productRow], total: 1 }),
      findById: vi.fn().mockResolvedValue(productRow),
      create: vi.fn().mockResolvedValue(productRow),
      update: vi.fn().mockResolvedValue(productRow),
      setActive: vi.fn().mockResolvedValue({ ...productRow, active: false }),
      listMovements: vi.fn().mockResolvedValue([]),
      registerMovement: vi.fn().mockResolvedValue({ ...productRow, stock: 3 }),
    };
  }

  it('lista catálogo público solo activos', async () => {
    const repo = buildRepo();
    const service = new ProductService(repo);
    const result = await service.listPublic({ page: 1, pageSize: 20 });
    expect(result.total).toBe(1);
    expect(repo.list).toHaveBeenCalledWith({ page: 1, pageSize: 20, includeInactive: false });
  });

  it('lanza NotFoundError al buscar un producto inexistente', async () => {
    const repo = buildRepo();
    repo.findById = vi.fn().mockResolvedValue(null);
    const service = new ProductService(repo);
    await expect(service.getById('nope')).rejects.toThrow('Producto no encontrado');
  });
});
