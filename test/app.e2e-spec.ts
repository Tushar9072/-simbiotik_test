/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */

process.env.NODE_ENV = 'test';
process.env.DB_TYPE = 'sqljs';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DEFAULT_ADMIN_NAME = 'Test Admin';
process.env.DEFAULT_ADMIN_EMAIL = 'admin@sim.test';
process.env.DEFAULT_ADMIN_PASSWORD = 'Admin@12345';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

const { AppModule } = require('../src/app.module');
const { setupApplication } = require('../src/app.setup');

describe('College Course Enrollment API (e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication;
  let token: string;
  let courseId: number;
  let secondCourseId: number;
  let studentId: number;
  let secondStudentId: number;
  let enrollmentId: number;
  let createdAdminId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('protects admin-readable APIs before login', async () => {
    await request(app.getHttpServer()).get('/api/admins').expect(401);
    await request(app.getHttpServer())
      .post('/api/courses')
      .send({
        code: 'CS401',
        title: 'Unauthorized Course',
        credits: 3,
        maxCapacity: 10,
      })
      .expect(401);
  });

  it('logs in with the seeded admin', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@sim.test',
        password: 'Admin@12345',
      })
      .expect(201);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.admin.email).toBe('admin@sim.test');
    token = response.body.accessToken;
  });

  it('serves Swagger documentation JSON', async () => {
    await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200)
      .expect(({ body }) => {
        expect(body.info.title).toBe('College Course Enrollment API');
        expect(body.paths['/api/auth/login']).toBeDefined();
      });
  });

  it('returns the current admin profile', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBe('admin@sim.test');
      });
  });

  it('manages admin users', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/admins')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Placement Admin',
        email: 'placement@sim.test',
        password: 'Admin@12345',
      })
      .expect(201);

    createdAdminId = createResponse.body.id;
    expect(createResponse.body.passwordHash).toBeUndefined();

    await request(app.getHttpServer())
      .get('/api/admins')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.length).toBeGreaterThanOrEqual(2);
      });

    await request(app.getHttpServer())
      .get(`/api/admins/${createdAdminId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBe('placement@sim.test');
      });

    await request(app.getHttpServer())
      .patch(`/api/admins/${createdAdminId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Placement Admin' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.name).toBe('Updated Placement Admin');
        expect(body.passwordHash).toBeUndefined();
      });
  });

  it('manages courses and exposes available course capacity publicly', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: 'CS101',
        title: 'Introduction to Computer Science',
        description: 'Core programming and computing concepts.',
        credits: 3,
        maxCapacity: 1,
      })
      .expect(201);

    courseId = createResponse.body.id;

    const secondCreateResponse = await request(app.getHttpServer())
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: 'MATH101',
        title: 'College Mathematics',
        credits: 4,
        maxCapacity: 2,
      })
      .expect(201);

    secondCourseId = secondCreateResponse.body.id;

    await request(app.getHttpServer())
      .get('/api/courses')
      .expect(200)
      .expect(({ body }) => {
        expect(
          body.some((course: { code: string }) => course.code === 'CS101'),
        ).toBe(true);
      });

    await request(app.getHttpServer())
      .get(`/api/courses/${courseId}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.availableSeats).toBe(1);
      });

    await request(app.getHttpServer())
      .patch(`/api/courses/${courseId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Intro to CS' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.title).toBe('Intro to CS');
      });

    await request(app.getHttpServer())
      .delete(`/api/courses/${secondCourseId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toBe('Course deleted successfully.');
        expect(body.deletedCourseId).toBe(secondCourseId);
      });
  });

  it('registers and manages students', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/students')
      .send({
        firstName: 'Rahul',
        lastName: 'Sharma',
        email: 'rahul.sharma@sim.test',
        dateOfBirth: '2002-08-15',
      })
      .expect(201);

    studentId = createResponse.body.id;

    const secondCreateResponse = await request(app.getHttpServer())
      .post('/api/students')
      .send({
        firstName: 'Priya',
        lastName: 'Patel',
        email: 'priya.patel@sim.test',
      })
      .expect(201);

    secondStudentId = secondCreateResponse.body.id;

    await request(app.getHttpServer())
      .get('/api/students')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.length).toBe(2);
      });

    await request(app.getHttpServer())
      .get(`/api/students/${studentId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBe('rahul.sharma@sim.test');
      });

    await request(app.getHttpServer())
      .patch(`/api/students/${studentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Rahul Kumar' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.firstName).toBe('Rahul Kumar');
      });
  });

  it('enrolls a student and blocks duplicate enrollments', async () => {
    const enrollResponse = await request(app.getHttpServer())
      .post('/api/enrollments')
      .send({
        studentId,
        courseId,
      })
      .expect(201);

    enrollmentId = enrollResponse.body.id;
    expect(enrollResponse.body.student.id).toBe(studentId);
    expect(enrollResponse.body.course.id).toBe(courseId);

    await request(app.getHttpServer())
      .post('/api/enrollments')
      .send({
        studentId,
        courseId,
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe(
          'Student is already enrolled in this course.',
        );
      });
  });

  it('blocks enrollment when the course is full', async () => {
    await request(app.getHttpServer())
      .post('/api/enrollments')
      .send({
        studentId: secondStudentId,
        courseId,
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe('Course has reached maximum capacity.');
      });
  });

  it('lists enrollment records for admins', async () => {
    await request(app.getHttpServer())
      .get('/api/enrollments')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
      });

    await request(app.getHttpServer())
      .get(`/api/enrollments/${enrollmentId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe(enrollmentId);
      });

    await request(app.getHttpServer())
      .get(`/api/enrollments/student/${studentId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
      });
  });

  it('validates malformed payloads gracefully', async () => {
    await request(app.getHttpServer())
      .post('/api/students')
      .send({
        firstName: 'A',
        email: 'not-an-email',
        unexpected: 'field',
      })
      .expect(400);
  });
});
