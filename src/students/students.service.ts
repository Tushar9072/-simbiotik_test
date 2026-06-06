import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './student.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
  ) {}

  async create(createStudentDto: CreateStudentDto): Promise<Student> {
    const existing = await this.studentsRepository.findOne({
      where: { email: createStudentDto.email },
    });

    if (existing) {
      throw new BadRequestException('Student email is already registered.');
    }

    return this.studentsRepository.save(
      this.studentsRepository.create(createStudentDto),
    );
  }

  async findAll(): Promise<Student[]> {
    return this.studentsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Student> {
    const student = await this.studentsRepository.findOne({ where: { id } });

    if (!student) {
      throw new NotFoundException('Student not found.');
    }

    return student;
  }

  async update(
    id: number,
    updateStudentDto: UpdateStudentDto,
  ): Promise<Student> {
    const student = await this.findOne(id);

    if (updateStudentDto.email && updateStudentDto.email !== student.email) {
      const existing = await this.studentsRepository.findOne({
        where: { email: updateStudentDto.email },
      });

      if (existing) {
        throw new BadRequestException('Student email is already registered.');
      }
    }

    Object.assign(student, updateStudentDto);
    return this.studentsRepository.save(student);
  }
}
