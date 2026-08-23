import { describe, it, expect, vi } from 'vitest';
import { ReportService } from './reports.service';
import { IReportRepository } from './reports.repository';

function buildRepo(): IReportRepository {
  return {
    countServices: vi.fn().mockResolvedValue({ total: 5, byService: [] }),
    inventorySnapshot: vi.fn().mockResolvedValue({ products: [], parts: [] }),
    ordersByStatus: vi.fn().mockResolvedValue([{ status: 'REPARADO', count: 3 }]),
  };
}

describe('ReportService (Strategy)', () => {
  it('genera reporte de servicios con el generador correcto', async () => {
    const repo = buildRepo();
    const service = new ReportService(repo);
    const result = (await service.generate('services', {})) as { total: number };
    expect(result.total).toBe(5);
    expect(repo.countServices).toHaveBeenCalled();
  });

  it('genera reporte de inventario', async () => {
    const repo = buildRepo();
    const service = new ReportService(repo);
    await service.generate('inventory', {});
    expect(repo.inventorySnapshot).toHaveBeenCalled();
  });

  it('rechaza un tipo de reporte no soportado', async () => {
    const service = new ReportService(buildRepo());
    await expect(service.generate('nope' as never, {})).rejects.toThrow('no soportado');
  });
});
