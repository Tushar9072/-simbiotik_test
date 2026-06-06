import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Course } from '../courses/course.entity';
import { Student } from '../students/student.entity';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { Enrollment, EnrollmentStatus } from './enrollment.entity';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepository: Repository<Enrollment>,
  ) {}

  async enroll(createEnrollmentDto: CreateEnrollmentDto): Promise<Enrollment> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const studentsRepository = manager.getRepository(Student);
        const coursesRepository = manager.getRepository(Course);
        const enrollmentsRepository = manager.getRepository(Enrollment);

        const student = await studentsRepository.findOne({
          where: { id: createEnrollmentDto.studentId },
        });

        if (!student) {
          throw new NotFoundException('Student not found.');
        }

        let courseQuery = coursesRepository
          .createQueryBuilder('course')
          .where('course.id = :courseId', {
            courseId: createEnrollmentDto.courseId,
          });

        if (this.dataSource.options.type !== 'sqljs') {
          courseQuery = courseQuery.setLock('pessimistic_write');
        }

        const course = await courseQuery.getOne();

        if (!course) {
          throw new NotFoundException('Course not found.');
        }

        if (!course.isActive) {
          throw new BadRequestException(
            'Course is not available for enrollment.',
          );
        }

        const existingEnrollment = await enrollmentsRepository.findOne({
          where: {
            student: { id: student.id },
            course: { id: course.id },
          },
        });

        if (existingEnrollment) {
          throw new BadRequestException(
            'Student is already enrolled in this course.',
          );
        }

        const activeEnrollmentCount = await enrollmentsRepository.count({
          where: {
            course: { id: course.id },
            status: EnrollmentStatus.Active,
          },
        });

        if (activeEnrollmentCount >= course.maxCapacity) {
          throw new BadRequestException('Course has reached maximum capacity.');
        }

        const enrollment = enrollmentsRepository.create({
          student,
          course,
          status: EnrollmentStatus.Active,
        });

        return enrollmentsRepository.save(enrollment);
      });
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException(
          'Student is already enrolled in this course.',
        );
      }

      throw error;
    }
  }

  async findAll(): Promise<Enrollment[]> {
    return this.enrollmentsRepository.find({
      order: { enrolledAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Enrollment> {
    const enrollment = await this.enrollmentsRepository.findOne({
      where: { id },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found.');
    }

    return enrollment;
  }

  async findByStudent(studentId: number): Promise<Enrollment[]> {
    return this.enrollmentsRepository.find({
      where: {
        student: { id: studentId },
      },
      order: { enrolledAt: 'DESC' },
    });
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const maybeError = error as { code?: string; errno?: number };
    return maybeError.code === 'ER_DUP_ENTRY' || maybeError.errno === 1062;
  }
}
