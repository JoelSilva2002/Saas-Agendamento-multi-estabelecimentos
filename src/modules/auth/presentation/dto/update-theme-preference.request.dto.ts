import { IsIn } from 'class-validator';
import { ThemePreference } from '../../../users/domain/entities/user.entity';

const THEMES: ThemePreference[] = ['light', 'dark', 'system'];

export class UpdateThemePreferenceRequestDto {
  @IsIn(THEMES)
  themePreference!: ThemePreference;
}
