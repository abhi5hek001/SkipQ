import { IsEmail, IsString, Matches } from 'class-validator';

export class CreateVendorDto {
  @IsString()
  businessName: string;

  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid phone number' })
  phone: string;
}
