import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class GuestLoginDto {
  @IsOptional()
  @IsUUID()
  guestKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  displayName?: string;
}
