import { AuthSession, AuthUser, LoginInput, RegisterInput } from './auth.types';
import { IAuthRepository } from './auth.repository';

export class AuthService {
  constructor(private readonly repository: IAuthRepository) {}

  async register(input: RegisterInput): Promise<AuthUser> {
    return this.repository.register(input);
  }

  async login(input: LoginInput): Promise<AuthSession> {
    return this.repository.login(input);
  }

  async logout(accessToken: string): Promise<void> {
    await this.repository.logout(accessToken);
  }

  async getProfile(userId: string): Promise<AuthUser | null> {
    return this.repository.getUserById(userId);
  }
}
