import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Admin } from './admin.entity';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Injectable()
export class AdminsService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Admin)
    private readonly adminsRepository: Repository<Admin>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.configService.get<string>('DEFAULT_ADMIN_EMAIL');
    const password = this.configService.get<string>('DEFAULT_ADMIN_PASSWORD');
    const name = this.configService.get<string>(
      'DEFAULT_ADMIN_NAME',
      'Super Admin',
    );

    if (!email || !password) {
      return;
    }

    const existing = await this.adminsRepository.findOne({ where: { email } });
    if (existing) {
      return;
    }

    await this.create({
      name,
      email,
      password,
      isActive: true,
    });
  }

  async create(createAdminDto: CreateAdminDto): Promise<Admin> {
    const existing = await this.adminsRepository.findOne({
      where: { email: createAdminDto.email },
    });

    if (existing) {
      throw new BadRequestException('Admin email is already registered.');
    }

    const admin = this.adminsRepository.create({
      name: createAdminDto.name,
      email: createAdminDto.email,
      passwordHash: await bcrypt.hash(createAdminDto.password, 10),
      isActive: createAdminDto.isActive ?? true,
    });

    return this.sanitize(await this.adminsRepository.save(admin));
  }

  async findAll(): Promise<Admin[]> {
    return this.adminsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Admin> {
    const admin = await this.adminsRepository.findOne({ where: { id } });

    if (!admin) {
      throw new NotFoundException('Admin not found.');
    }

    return admin;
  }

  async findByEmailWithPassword(email: string): Promise<Admin | null> {
    return this.adminsRepository
      .createQueryBuilder('admin')
      .addSelect('admin.passwordHash')
      .where('admin.email = :email', { email })
      .getOne();
  }

  async update(id: number, updateAdminDto: UpdateAdminDto): Promise<Admin> {
    const admin = await this.findOne(id);

    if (updateAdminDto.email && updateAdminDto.email !== admin.email) {
      const existing = await this.adminsRepository.findOne({
        where: { email: updateAdminDto.email },
      });

      if (existing) {
        throw new BadRequestException('Admin email is already registered.');
      }
    }

    Object.assign(admin, {
      name: updateAdminDto.name ?? admin.name,
      email: updateAdminDto.email ?? admin.email,
      isActive: updateAdminDto.isActive ?? admin.isActive,
    });

    if (updateAdminDto.password) {
      admin.passwordHash = await bcrypt.hash(updateAdminDto.password, 10);
    }

    return this.sanitize(await this.adminsRepository.save(admin));
  }

  private sanitize(admin: Admin): Admin {
    delete (admin as Partial<Admin>).passwordHash;
    return admin;
  }
}
