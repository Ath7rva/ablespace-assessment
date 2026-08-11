import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GuestLoginDto } from './dto/guest-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('guest')
  signInAsGuest(@Body() dto: GuestLoginDto) {
    return this.authService.signInAsGuest(dto);
  }
}
