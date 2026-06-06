# College Course Enrollment Backend

NestJS backend for a college course enrollment system. It includes admin JWT authentication, course management, student registration, enrollment rules, MySQL persistence through TypeORM, validation DTOs, and Swagger UI.

## Features

- Admin login with JWT
- Admin user management
- Course create, list, detail, update, and delete
- Student registration and admin-readable student management
- Student course enrollment
- Duplicate enrollment protection
- Course max-capacity protection
- Swagger UI for API testing
- MySQL database with TypeORM

## Requirements

- Node.js
- pnpm
- MySQL running on port `3306`
- Database named `sim`

If you use XAMPP, start **MySQL** from the XAMPP Control Panel before running the backend.

## Database Setup

Create the MySQL database:

```sql
CREATE DATABASE IF NOT EXISTS sim;
```

Default local database settings:

```text
host: 127.0.0.1 or localhost
port: 3306
username: root
password: empty by default for XAMPP
database: sim
```

## Environment Setup

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

For XAMPP MySQL with empty root password, use:

```env
PORT=8000
API_PREFIX=api

DB_TYPE=mysql
DATABASE_URL=mysql://root:@127.0.0.1:3306/sim
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_DATABASE=sim
TYPEORM_SYNC=true

JWT_SECRET=sim-college-enrollment-jwt-secret
JWT_EXPIRES_IN=1d

DEFAULT_ADMIN_NAME=Super Admin
DEFAULT_ADMIN_EMAIL=admin@sim.com
DEFAULT_ADMIN_PASSWORD=Admin@12345
```

The default admin is created automatically when the app starts if it does not already exist.

## Install Dependencies

```bash
pnpm install
```

## Run Backend

Development watch mode:

```bash
pnpm run start:dev
```

Production build:

```bash
pnpm run build
pnpm run start:prod
```

The backend runs on:

```text
http://localhost:8000
```

Swagger UI:

```text
http://localhost:8000/docs
```

## First Login

Use this API to get JWT token:

```http
POST http://localhost:8000/api/auth/login
```

Body:

```json
{
  "email": "admin@sim.com",
  "password": "Admin@12345"
}
```

Copy `accessToken` from the response.

For protected routes, add this Postman header:

```text
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## API Endpoints

### Auth

```http
POST /api/auth/login
GET /api/auth/me
```

`GET /api/auth/me` requires JWT.

### Admins

All admin routes require JWT.

```http
POST /api/admins
GET /api/admins
GET /api/admins/:id
PATCH /api/admins/:id
```

Create admin body:

```json
{
  "name": "College Admin",
  "email": "college-admin@example.com",
  "password": "Admin@12345",
  "isActive": true
}
```

### Courses

Public:

```http
GET /api/courses
GET /api/courses/:id
```

Protected:

```http
POST /api/courses
PATCH /api/courses/:id
DELETE /api/courses/:id
```

Create course body:

```json
{
  "code": "CS101",
  "title": "Introduction to Computer Science",
  "description": "Core programming and computing concepts.",
  "credits": 3,
  "maxCapacity": 30,
  "isActive": true
}
```

Delete course response:

```json
{
  "message": "Course deleted successfully.",
  "deletedCourseId": 1
}
```

A course cannot be deleted if it already has enrollment records.

### Students

Public:

```http
POST /api/students
```

Protected:

```http
GET /api/students
GET /api/students/:id
PATCH /api/students/:id
```

Create student body:

```json
{
  "firstName": "Rahul",
  "lastName": "Sharma",
  "email": "rahul.sharma@example.com",
  "phone": "+919876543210",
  "dateOfBirth": "2002-08-15"
}
```

### Enrollments

Public:

```http
POST /api/enrollments
```

Protected:

```http
GET /api/enrollments
GET /api/enrollments/:id
GET /api/enrollments/student/:studentId
```

Enroll body:

```json
{
  "studentId": 1,
  "courseId": 1
}
```

Business rules:

- A student cannot enroll in the same course twice.
- A student cannot enroll if the course has reached `maxCapacity`.
- Enrollment fails with `404` if the student or course does not exist.

## Suggested Postman Flow

1. Start MySQL and create database `sim`.
2. Run `pnpm run start:dev`.
3. Open `POST /api/auth/login` and copy the token.
4. Create a course with `POST /api/courses`.
5. Create a student with `POST /api/students`.
6. Enroll the student with `POST /api/enrollments`.
7. Call the same enrollment again to confirm duplicate enrollment returns `400`.
8. Create a course with `maxCapacity: 1`, enroll one student, then try enrolling another student to confirm capacity validation returns `400`.

## Testing

Run e2e tests:

```bash
pnpm run test:e2e
```

Run lint:

```bash
pnpm run lint
```

Run build:

```bash
pnpm run build
```

## Common Errors

### Database connection refused

Error:

```text
ECONNREFUSED 127.0.0.1:3306
```

Fix:

- Start MySQL.
- Confirm database `sim` exists.
- Check `.env` database host, port, username, and password.

### Unauthorized

Error:

```text
401 Unauthorized
```

Fix:

- Login with `POST /api/auth/login`.
- Add `Authorization: Bearer YOUR_ACCESS_TOKEN` header for protected routes.

### Course delete fails

If the course has enrollment records, delete returns `400`. This protects enrollment history. Delete only courses that have no enrollments.
