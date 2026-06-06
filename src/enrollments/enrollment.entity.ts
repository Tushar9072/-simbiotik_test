import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Course } from '../courses/course.entity';
import { Student } from '../students/student.entity';

export enum EnrollmentStatus {
  Active = 'active',
  Dropped = 'dropped',
}

@Entity('enrollments')
@Index(['student', 'course'], { unique: true })
export class Enrollment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Student, (student) => student.enrollments, {
    nullable: false,
    onDelete: 'RESTRICT',
    eager: true,
  })
  student: Student;

  @ManyToOne(() => Course, (course) => course.enrollments, {
    nullable: false,
    onDelete: 'RESTRICT',
    eager: true,
  })
  course: Course;

  @Column({
    type: 'simple-enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.Active,
  })
  status: EnrollmentStatus;

  @CreateDateColumn()
  enrolledAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
