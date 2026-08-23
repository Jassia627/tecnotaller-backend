import { NotFoundError } from '../../shared/errors/app-error';
import { IServiceRepository } from './services.repository';
import {
  CreateServiceInput,
  TechnicalService,
  UpdateServiceInput,
} from './services.types';

export class ServiceService {
  constructor(private readonly repository: IServiceRepository) {}

  async listPublic(): Promise<TechnicalService[]> {
    const rows = await this.repository.list(false);
    return rows.map(TechnicalService.fromRow);
  }

  async listAll(): Promise<TechnicalService[]> {
    const rows = await this.repository.list(true);
    return rows.map(TechnicalService.fromRow);
  }

  async getById(id: string): Promise<TechnicalService> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundError('Servicio no encontrado');
    return TechnicalService.fromRow(row);
  }

  async create(input: CreateServiceInput): Promise<TechnicalService> {
    return TechnicalService.fromRow(await this.repository.create(input));
  }

  async update(id: string, input: UpdateServiceInput): Promise<TechnicalService> {
    await this.getById(id);
    return TechnicalService.fromRow(await this.repository.update(id, input));
  }

  async changeStatus(id: string, active: boolean): Promise<TechnicalService> {
    await this.getById(id);
    return TechnicalService.fromRow(await this.repository.setActive(id, active));
  }
}
