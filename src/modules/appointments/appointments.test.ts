import { describe, it, expect, vi } from 'vitest';
import { Appointment } from './appointments.types';
import { AppointmentService } from './appointments.service';
import { IAppointmentRepository } from './appointments.repository';

const appointmentRow = {
  id: 'a1',
  service_id: 's1',
  customer_name: 'Juan',
  phone: '3001234567',
  date: '2026-08-22T10:00:00.000Z',
  status: 'pendiente' as const,
  created_at: '2026-08-21T10:00:00.000Z',
};

describe('Appointment (encapsulamiento)', () => {
  it('no permite confirmar una cita cancelada', () => {
    const a = Appointment.fromRow({ ...appointmentRow, status: 'cancelada' });
    expect(() => a.confirm()).toThrow('No se puede confirmar una cita cancelada');
  });

  it('solo permite completar una cita confirmada', () => {
    const a = Appointment.fromRow(appointmentRow);
    expect(() => a.complete()).toThrow('Solo se puede completar una cita confirmada');
    a.confirm();
    a.complete();
    expect(a.status).toBe('completada');
  });
});

describe('AppointmentService', () => {
  function buildRepo(): IAppointmentRepository {
    return {
      findById: vi.fn().mockResolvedValue(appointmentRow),
      list: vi.fn().mockResolvedValue([appointmentRow]),
      create: vi.fn().mockResolvedValue(appointmentRow),
      setStatus: vi.fn().mockResolvedValue({ ...appointmentRow, status: 'confirmada' }),
      cancelExpired: vi.fn().mockResolvedValue(2),
      hasOverlap: vi.fn().mockResolvedValue(false),
    };
  }

  it('crea una cita si no hay solapamiento', async () => {
    const repo = buildRepo();
    const service = new AppointmentService(repo);
    const result = await service.create({
      serviceId: 's1',
      customerName: 'Juan',
      phone: '3001234567',
      date: '2026-08-22T10:00:00.000Z',
    });
    expect(result.id).toBe('a1');
  });

  it('rechaza la cita si hay solapamiento', async () => {
    const repo = buildRepo();
    repo.hasOverlap = vi.fn().mockResolvedValue(true);
    const service = new AppointmentService(repo);
    await expect(
      service.create({
        serviceId: 's1',
        customerName: 'Juan',
        phone: '3001234567',
        date: '2026-08-22T10:00:00.000Z',
      }),
    ).rejects.toThrow('Ya existe una cita');
  });
});
