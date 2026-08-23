import { NotFoundError } from '../../shared/errors/app-error';
import { ITechnicianRepository } from './technicians.repository';
import { RegisterTechnicianInput, Technician } from './technicians.types';

export class TechnicianService {
  constructor(private readonly repository: ITechnicianRepository) {}

  async list(): Promise<Technician[]> {
    return this.repository.list();
  }

  async register(input: RegisterTechnicianInput): Promise<Technician> {
    return this.repository.register(input);
  }

  async setActive(id: string, active: boolean): Promise<Technician> {
    await this.getById(id);
    return this.repository.setActive(id, active);
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
