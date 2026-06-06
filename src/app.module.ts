import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminsModule } from './admins/admins.module';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { StudentsModule } from './students/students.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get<string>('DB_TYPE', 'mysql');

        if (dbType === 'sqljs') {
          return {
            type: 'sqljs' as const,
            autoSave: false,
            autoLoadEntities: true,
            synchronize: true,
            dropSchema: true,
            retryAttempts: 0,
          };
        }

        return {
          type: 'mysql' as const,
          url: configService.get<string>('DATABASE_URL') || undefined,
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 3306),
          username: configService.get<string>('DB_USERNAME', 'root'),
          password: configService.get<string>('DB_PASSWORD', ''),
          database: configService.get<string>('DB_DATABASE', 'sim'),
          autoLoadEntities: true,
          synchronize:
            configService.get<string>('TYPEORM_SYNC', 'true') === 'true',
          retryAttempts: configService.get<number>('DB_RETRY_ATTEMPTS', 10),
        };
      },
    }),
    AdminsModule,
    AuthModule,
    CoursesModule,
    StudentsModule,
    EnrollmentsModule,
  ],
})
export class AppModule {}
