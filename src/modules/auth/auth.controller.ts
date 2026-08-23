import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { loginSchema, registerSchema } from './auth.types';

export class AuthController {
  constructor(private readonly service: AuthService) {}

  async register(req: Request, res: Response): Promise<void> {
    const input = registerSchema.parse(req.body);
    const user = await this.service.register(input);
    res.status(201).json({ user });
  }

  async login(req: Request, res: Response): Promise<void> {
    const input = loginSchema.parse(req.body);
    const session = await this.service.login(input);
    res.json(session);
  }

  async logout(req: Request, res: Response): Promise<void> {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    await this.service.logout(token);
    res.status(204).send();
  }

  async me(req: Request, res: Response): Promise<void> {
    const user = await this.service.getProfile(req.user!.id);
    res.json({ user });
  }
}
