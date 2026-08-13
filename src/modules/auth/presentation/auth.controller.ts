import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { RefreshSessionUseCase } from '../application/use-cases/refresh-session.use-case';
import { LogoutUseCase } from '../application/use-cases/logout.use-case';
import { ChangePasswordUseCase } from '../application/use-cases/change-password.use-case';
import { RequestPasswordResetUseCase } from '../application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.use-case';
import { ChangePasswordRequestDto } from './dto/change-password.request.dto';
import { LoginRequestDto } from './dto/login.request.dto';
import { RefreshRequestDto } from './dto/refresh.request.dto';
import { RegisterClientRequestDto } from './dto/register-client.request.dto';
import { UpdateThemePreferenceRequestDto } from './dto/update-theme-preference.request.dto';
import { ForgotPasswordRequestDto } from './dto/forgot-password.request.dto';
import { ResetPasswordRequestDto } from './dto/reset-password.request.dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../domain/request-context.types';
import { MembershipRepositoryPort } from '../../rbac/domain/membership.repository.port';
import { RegisterClientUseCase } from '../../clients/application/use-cases/register-client.use-case';
import { UserRepositoryPort } from '../../users/domain/user.repository.port';
import { UserNotFoundError } from '../../users/domain/errors/user-errors';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly membershipRepository: MembershipRepositoryPort,
    private readonly registerClientUseCase: RegisterClientUseCase,
    private readonly userRepository: UserRepositoryPort,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginRequestDto) {
    return this.loginUseCase.execute(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshRequestDto) {
    return this.refreshSessionUseCase.execute(dto);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshRequestDto) {
    await this.logoutUseCase.execute(dto);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterClientRequestDto) {
    const result = await this.registerClientUseCase.execute({
      tenantId: dto.tenantId,
      establishmentId: dto.establishmentId,
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
    });
    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      clientProfile: result.clientProfile
        ? {
            id: result.clientProfile.id,
            establishmentId: result.clientProfile.establishmentId,
            phone: result.clientProfile.phone,
            birthDate: result.clientProfile.birthDate,
          }
        : null,
    };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(@Body() dto: ForgotPasswordRequestDto) {
    await this.requestPasswordResetUseCase.execute({ email: dto.email });
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordRequestDto) {
    return this.resetPasswordUseCase.execute({ token: dto.token, newPassword: dto.newPassword });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    const memberships = await this.membershipRepository.findAllGrantsForUser(user.id);
    const fullUser = await this.userRepository.findById(user.id);
    return {
      id: user.id,
      email: user.email,
      isPlatformAdmin: user.isPlatformAdmin,
      themePreference: fullUser?.themePreference ?? 'system',
      memberships,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateThemePreferenceRequestDto,
  ) {
    const fullUser = await this.userRepository.findById(user.id);
    if (!fullUser) {
      throw new UserNotFoundError(user.id);
    }
    const updated = await this.userRepository.update(
      fullUser.update({ themePreference: dto.themePreference }),
    );
    return { id: updated.id, email: updated.email, themePreference: updated.themePreference };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordRequestDto,
  ) {
    await this.changePasswordUseCase.execute({
      userId: user.id,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    });
  }
}
