import { NotFoundError, ConflictError } from '../../shared/errors/app-error';
import { ITechnicianRepository } from './technicians.repository';
import { RegisterTechnicianInput, Technician, UpdateTechnicianInput } from './technicians.types';

export class TechnicianService {
  constructor(private readonly repository: ITechnicianRepository) {}

  async list(): Promise<Technician[]> {
    return this.repository.list();
  }

  async register(input: RegisterTechnicianInput): Promise<Technician> {
    return this.repository.register(input);
  }

  async update(id: string, input: UpdateTechnicianInput): Promise<Technician> {
    await this.getById(id);
    return this.repository.update(id, input);
  }

  async setActive(id: string, active: boolean): Promise<Technician> {
    await this.getById(id);
    return this.repository.setActive(id, active);
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    
    // Validar que el técnico no tiene órdenes activas
    const workOrders = await this.repository.listWorkOrders(id);
    if (workOrders && workOrders.length > 0) {
      throw new ConflictError('No se puede eliminar un técnico con órdenes de trabajo activas');
    }

    await this.repository.delete(id);
  }

  async listWorkOrders(technicianId: string): Promise<{ id: string; guide_number: string; current_status: string }[]> {
    await this.getById(technicianId);
    return this.repository.listWorkOrders(technicianId);
  }

  private async getById(id: string): Promise<Technician> {
    const tech = await this.repository.findById(id);
    if (!tech) throw new NotFoundError('Técnico no encontrado');
    return tech;
  }
}
