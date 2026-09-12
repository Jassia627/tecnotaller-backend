import { describe, it, expect } from 'vitest';
import { ActivityRepository } from './activities.repository';

describe('ActivityRepository Error Handling', () => {
  it('should return empty array on listByWorkOrder when table does not exist or has no rows', async () => {
    const repository = new ActivityRepository();
    const result = await repository.listByWorkOrder('d12659a4-ba42-4064-bc8b-64d597c38ab7');
    expect(Array.isArray(result)).toBe(true);
  }, 15000);

  it('should return a fallback activity on create when table does not exist', async () => {
    const repository = new ActivityRepository();
    const result = await repository.create('d12659a4-ba42-4064-bc8b-64d597c38ab7', 'tech-123', {
      description: 'Prueba de diagnóstico e inspección',
    });
    expect(result).toHaveProperty('id');
    expect(result.description).toBe('Prueba de diagnóstico e inspección');
  }, 15000);
});
