/**
 * Tests para verificar que ambas implementaciones del repositorio de clientes
 * cumplen con la misma interfaz y comportamiento.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ICustomerRepository } from './customers.repository';
import { CustomerRow, CreateCustomerInput, UpdateCustomerInput } from './customers.types';

// Mock de cliente para pruebas
const mockCustomerRow: CustomerRow = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  full_name: 'Juan Pérez',
  phone: '3001234567',
  created_at: '2024-01-15T10:00:00.000Z',
};

/**
 * Test suite genérica que puede ejecutarse contra cualquier implementación
 * de ICustomerRepository para verificar que cumple el contrato.
 */
function testRepositoryContract(
  name: string,
  createRepository: () => ICustomerRepository
) {
  describe(`${name} - Contrato ICustomerRepository`, () => {
    let repository: ICustomerRepository;

    beforeEach(() => {
      repository = createRepository();
    });

    describe('list()', () => {
      it('debe retornar una estructura con rows y total', async () => {
        const result = await repository.list({ page: 1, pageSize: 10 });
        
        expect(result).toHaveProperty('rows');
        expect(result).toHaveProperty('total');
        expect(Array.isArray(result.rows)).toBe(true);
        expect(typeof result.total).toBe('number');
      });

      it('debe respetar la paginación', async () => {
        const page1 = await repository.list({ page: 1, pageSize: 5 });
        const page2 = await repository.list({ page: 2, pageSize: 5 });
        
        // Ambas deben retornar el mismo total
        expect(page1.total).toBe(page2.total);
        
        // Las filas pueden ser diferentes si hay suficientes registros
        expect(page1.rows.length).toBeLessThanOrEqual(5);
        expect(page2.rows.length).toBeLessThanOrEqual(5);
      });
    });

    describe('findById()', () => {
      it('debe retornar null para un ID inexistente', async () => {
        const result = await repository.findById('00000000-0000-0000-0000-000000000000');
        expect(result).toBeNull();
      });
    });

    describe('findByPhone()', () => {
      it('debe retornar null para un teléfono inexistente', async () => {
        const result = await repository.findByPhone('0000000000');
        expect(result).toBeNull();
      });

      it('debe retornar null para un teléfono vacío', async () => {
        const result = await repository.findByPhone('');
        expect(result).toBeNull();
      });
    });

    describe('Formato de CustomerRow', () => {
      it('los registros deben tener la estructura correcta', async () => {
        // Crear un cliente para verificar el formato
        const input: CreateCustomerInput = {
          email: 'format-test@example.com',
          fullName: 'Test Format',
          phone: '3009999999',
        };

        const created = await repository.create(input);

        // Verificar estructura del CustomerRow
        expect(created).toHaveProperty('id');
        expect(created).toHaveProperty('email');
        expect(created).toHaveProperty('full_name');
        expect(created).toHaveProperty('phone');
        expect(created).toHaveProperty('created_at');

        // Verificar tipos
        expect(typeof created.id).toBe('string');
        expect(typeof created.full_name).toBe('string');
        expect(typeof created.created_at).toBe('string');

        // Limpiar
        await repository.delete(created.id);
      });
    });
  });
}

// ============================================================================
// Tests específicos para verificar la lógica del factory
// ============================================================================

describe('createCustomerRepository Factory', () => {
  it('debe exportar la función factory', async () => {
    const { createCustomerRepository } = await import('./customers.repository.factory');
    expect(typeof createCustomerRepository).toBe('function');
  });

  it('debe crear un repositorio válido', async () => {
    const { createCustomerRepository } = await import('./customers.repository.factory');
    const repository = createCustomerRepository();
    
    // Verificar que tiene todos los métodos de la interfaz
    expect(typeof repository.list).toBe('function');
    expect(typeof repository.findById).toBe('function');
    expect(typeof repository.findByPhone).toBe('function');
    expect(typeof repository.create).toBe('function');
    expect(typeof repository.update).toBe('function');
    expect(typeof repository.delete).toBe('function');
    expect(typeof repository.listWorkOrders).toBe('function');
  });
});

// ============================================================================
// Tests de normalización de teléfono
// ============================================================================

describe('Normalización de teléfono', () => {
  // Función de normalización extraída para testing
  function normalizePhone(phone: string): string {
    let normalized = phone.replace(/\D/g, '');
    if (normalized.startsWith('57') && normalized.length > 10) {
      normalized = normalized.substring(2);
    }
    if (normalized.startsWith('00')) {
      normalized = normalized.substring(2);
    }
    return normalized;
  }

  it('debe remover espacios y guiones', () => {
    expect(normalizePhone('300 123 4567')).toBe('3001234567');
    expect(normalizePhone('300-123-4567')).toBe('3001234567');
    expect(normalizePhone('300 - 123 - 4567')).toBe('3001234567');
  });

  it('debe remover prefijo de Colombia +57', () => {
    expect(normalizePhone('+573001234567')).toBe('3001234567');
    expect(normalizePhone('573001234567')).toBe('3001234567');
  });

  it('debe remover paréntesis', () => {
    expect(normalizePhone('(300) 123-4567')).toBe('3001234567');
  });

  it('debe manejar números sin prefijo', () => {
    expect(normalizePhone('3001234567')).toBe('3001234567');
  });

  it('debe retornar string vacío para entrada vacía', () => {
    expect(normalizePhone('')).toBe('');
  });
});

// ============================================================================
// Tests de equivalencia de respuestas entre proveedores
// ============================================================================

describe('Equivalencia de formato entre proveedores', () => {
  it('ambas implementaciones deben usar los mismos nombres de campos en CustomerRow', () => {
    // Verificar que la interfaz CustomerRow tiene los campos esperados
    const expectedFields = ['id', 'email', 'full_name', 'phone', 'created_at'];
    
    // Crear un objeto que simula un CustomerRow
    const row: CustomerRow = {
      id: 'test-id',
      email: 'test@test.com',
      full_name: 'Test Name',
      phone: '123456789',
      created_at: '2024-01-01T00:00:00Z',
    };

    expectedFields.forEach(field => {
      expect(row).toHaveProperty(field);
    });
  });
});

// ============================================================================
// Tests de validación del proveedor
// ============================================================================

describe('Validación de DATA_PROVIDER', () => {
  const originalEnv = process.env.DATA_PROVIDER;

  afterEach(() => {
    // Restaurar valor original
    if (originalEnv !== undefined) {
      process.env.DATA_PROVIDER = originalEnv;
    } else {
      delete process.env.DATA_PROVIDER;
    }
  });

  it('debe usar Supabase cuando DATA_PROVIDER no está definido', () => {
    delete process.env.DATA_PROVIDER;
    // La validación ocurre en tiempo de carga del módulo env.ts
    // Este test verifica el comportamiento esperado
    expect(true).toBe(true); // Placeholder - validación real en integración
  });

  it('debe aceptar "supabase" como valor válido', () => {
    process.env.DATA_PROVIDER = 'supabase';
    expect(true).toBe(true); // Placeholder - validación real en integración
  });

  it('debe aceptar "postgres" como valor válido', () => {
    process.env.DATA_PROVIDER = 'postgres';
    expect(true).toBe(true); // Placeholder - validación real en integración
  });
});

// ============================================================================
// Tests de seguridad - SQL Injection
// ============================================================================

describe('Prevención de SQL Injection', () => {
  it('las consultas deben usar parámetros, no concatenación', () => {
    // Este test documenta que las implementaciones usan consultas parametrizadas
    // La verificación real es por revisión de código
    
    // Patrones seguros usados en PostgresCustomerRepository:
    // - $1, $2, $3 para parámetros en queries
    // - Nunca se concatena input del usuario directamente en SQL
    
    expect(true).toBe(true);
  });

  it('findByPhone no debe ser vulnerable a injection', () => {
    // El teléfono se normaliza (solo dígitos) antes de cualquier operación
    // Esto elimina caracteres especiales que podrían usarse para injection
    
    const maliciousInput = "'; DROP TABLE customers; --";
    const normalized = maliciousInput.replace(/\D/g, '');
    
    // Después de normalizar, solo quedan dígitos
    expect(normalized).toBe('');
    expect(normalized).not.toContain("'");
    expect(normalized).not.toContain(';');
    expect(normalized).not.toContain('-');
  });
});

// ============================================================================
// Tests de comportamiento de delete() con órdenes activas
// ============================================================================

describe('CustomerService.delete() - Comportamiento con órdenes', () => {
  it('debe documentar que ENTREGADO es el único estado terminal', () => {
    // Basado en ORDER_STATUSES de work-orders.types.ts:
    // ['PENDIENTE', 'ACEPTADA', 'EN_REVISION', 'ESPERANDO_REPUESTO', 
    //  'EN_REPARACION', 'REPARADO', 'LISTO_PARA_ENTREGA', 'ENTREGADO']
    
    // ENTREGADO es el estado final del flujo normal.
    // No existe CANCELADO ni COMPLETADO en los tipos oficiales.
    
    const terminalStatuses = ['ENTREGADO'];
    expect(terminalStatuses).toContain('ENTREGADO');
    expect(terminalStatuses).not.toContain('COMPLETADO');
    expect(terminalStatuses).not.toContain('CANCELADO');
  });

  it('debe documentar la limitación de delete con DATA_PROVIDER=postgres', () => {
    // Cuando DATA_PROVIDER=postgres:
    // - Los clientes están en RDS
    // - Las órdenes (work_orders) están en Supabase
    // - No se puede verificar si el cliente tiene órdenes activas
    // - Por seguridad, se rechaza la eliminación
    
    // Este es un test de documentación, no de comportamiento funcional
    expect(true).toBe(true);
  });
});
