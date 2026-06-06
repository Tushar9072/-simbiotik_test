import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment, EnrollmentStatus } from '../enrollments/enrollment.entity';
import { Course } from './course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepository: Repository<Enrollment>,
  ) {}

  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    const existing = await this.coursesRepository.findOne({
      where: { code: createCourseDto.code },
    });

    if (existing) {
      throw new BadRequestException('Course code is already registered.');
    }

    return this.coursesRepository.save(
      this.coursesRepository.create({
        ...createCourseDto,
        isActive: createCourseDto.isActive ?? true,
      }),
    );
  }

  async findAll(): Promise<
    Array<Course & { enrolledCount: number; availableSeats: number }>
  > {
    const courses = await this.coursesRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });

    return Promise.all(courses.map((course) => this.withCapacity(course)));
  }

  async findOne(
    id: number,
  ): Promise<Course & { enrolledCount: number; availableSeats: number }> {
    const course = await this.coursesRepository.findOne({ where: { id } });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    return this.withCapacity(course);
  }

  async update(id: number, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.coursesRepository.findOne({ where: { id } });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    if (updateCourseDto.code && updateCourseDto.code !== course.code) {
      const existing = await this.coursesRepository.findOne({
        where: { code: updateCourseDto.code },
      });

      if (existing) {
        throw new BadRequestException('Course code is already registered.');
      }
    }

    if (updateCourseDto.maxCapacity !== undefined) {
      const enrolledCount = await this.getActiveEnrollmentCount(id);
      if (updateCourseDto.maxCapacity < enrolledCount) {
        throw new BadRequestException(
          'Course capacity cannot be lower than current active enrollments.',
        );
      }
    }

    Object.assign(course, updateCourseDto);
    return this.coursesRepository.save(course);
  }

  async remove(
    id: number,
  ): Promise<{ message: string; deletedCourseId: number }> {
    const course = await this.coursesRepository.findOne({ where: { id } });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    const enrollmentCount = await this.enrollmentsRepository.count({
      where: {
        course: { id },
      },
    });

    if (enrollmentCount > 0) {
      throw new BadRequestException(
        'Course cannot be deleted because it has enrollment records.',
      );
    }

    await this.coursesRepository.remove(course);

    return {
      message: 'Course deleted successfully.',
      deletedCourseId: id,
    };
  }

  async getActiveEnrollmentCount(courseId: number): Promise<number> {
    return this.enrollmentsRepository.count({
      where: {
        course: { id: courseId },
        status: EnrollmentStatus.Active,
      },
    });
  }

  private async withCapacity(
    course: Course,
  ): Promise<Course & { enrolledCount: number; availableSeats: number }> {
    const enrolledCount = await this.getActiveEnrollmentCount(course.id);

    return {
      ...course,
      enrolledCount,
      availableSeats: Math.max(course.maxCapacity - enrolledCount, 0),
    };
  }
}
