import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AdminsService } from '../admins/admins.service';
import { Admin } from '../admins/admin.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly adminsService: AdminsService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const admin = await this.adminsService.findByEmailWithPassword(
      loginDto.email,
    );

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Invalid admin credentials.');
    }

    const isValidPassword = await bcrypt.compare(
      loginDto.password,
      admin.passwordHash,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid admin credentials.');
    }

    const safeAdmin = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      isActive: admin.isActive,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };

    return {
      accessToken: await this.jwtService.signAsync({
        sub: admin.id,
        email: admin.email,
      }),
      admin: safeAdmin,
    };
  }

  async validateAdmin(adminId: number): Promise<Admin> {
    const admin = await this.adminsService.findOne(adminId);

    if (!admin.isActive) {
      throw new UnauthorizedException('Admin account is inactive.');
    }

    return admin;
  }
}
