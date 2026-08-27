import { NotFoundError } from '../../shared/errors/app-error';
import { ITechnicianAvailabilityRepository } from './technician-availability.repository';
import { TechnicianAvailability, UpdateTechnicianAvailabilityInput, mapTechnicianAvailabilityRow } from './technician-availability.types';

export class TechnicianAvailabilityService {
  constructor(private readonly repository: ITechnicianAvailabilityRepository) {}

  async getByTechnicianId(technicianId: string): Promise<TechnicianAvailability> {
    const row = await this.repository.getByTechnicianId(technicianId);
    if (!row) throw new NotFoundError('Disponibilidad del técnico no encontrada');
    return mapTechnicianAvailabilityRow(row);
  }

  async update(technicianId: string, input: UpdateTechnicianAvailabilityInput): Promise<TechnicianAvailability> {
    // Aquí no verificamos si existe porque el repository lo crea si no existe
    const row = await this.repository.update(technicianId, input);
    return mapTechnicianAvailabilityRow(row);
  }
}
