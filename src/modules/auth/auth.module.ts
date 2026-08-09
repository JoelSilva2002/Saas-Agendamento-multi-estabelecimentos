import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { RbacModule } from '../rbac/rbac.module';
import { EstablishmentsModule } from '../establishments/establishments.module';
import { ClientsModule } from '../clients/clients.module';
import { PasswordHasherPort } from './application/ports/password-hasher.port';
import { TokenServicePort } from './application/ports/token-service.port';
import { RefreshTokenRepositoryPort } from './domain/refresh-token.repository.port';
import { Argon2PasswordHasherService } from './infrastructure/security/argon2-password-hasher.service';
import { JwtTokenService } from './infrastructure/security/jwt-token.service';
import { JwtStrategy } from './infrastructure/security/jwt.strategy';
import { PrismaRefreshTokenRepository } from './infrastructure/persistence/prisma-refresh-token.repository';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { AuthController } from './presentation/auth.controller';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';
import { TenantScopeGuard } from './presentation/guards/tenant-scope.guard';
import { PermissionsGuard } from './presentation/guards/permissions.guard';
import { PlatformAdminGuard } from './presentation/guards/platform-admin.guard';
import { AppConfig } from '../../config/configuration';

// @Global(): every other module's controllers use the guards exported here (JwtAuthGuard,
// TenantScopeGuard, PermissionsGuard, PlatformAdminGuard) via @UseGuards()/@Auth(), while
// AuthModule itself needs UsersModule/RbacModule/EstablishmentsModule's ports. Making this
// module global lets those guards resolve everywhere without those feature modules having
// to import AuthModule back — which would create module import cycles.
@Global()
@Module({
  imports: [
    UsersModule,
    RbacModule,
    EstablishmentsModule,
    ClientsModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => ({
        secret: configService.get('jwt', { infer: true }).accessSecret,
        signOptions: { expiresIn: configService.get('jwt', { infer: true }).accessExpiresIn },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: PasswordHasherPort, useClass: Argon2PasswordHasherService },
    { provide: TokenServicePort, useClass: JwtTokenService },
    { provide: RefreshTokenRepositoryPort, useClass: PrismaRefreshTokenRepository },
    LoginUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    JwtStrategy,
    JwtAuthGuard,
    TenantScopeGuard,
    PermissionsGuard,
    PlatformAdminGuard,
  ],
  exports: [PasswordHasherPort, JwtAuthGuard, TenantScopeGuard, PermissionsGuard, PlatformAdminGuard],
})
export class AuthModule {}
