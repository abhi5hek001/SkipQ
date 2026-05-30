import {
  Controller, Post, Param, UseGuards, Req, Headers,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('token/:orderId')
  @UseGuards(JwtAuthGuard)
  createTokenPayment(@CurrentUser() user: any, @Param('orderId') orderId: string) {
    return this.paymentsService.createTokenPayment(orderId, user.id);
  }

  @Post('remaining/:orderId')
  @UseGuards(JwtAuthGuard)
  createRemainingPayment(@CurrentUser() user: any, @Param('orderId') orderId: string) {
    return this.paymentsService.createRemainingPayment(orderId, user.id);
  }

  // No JWT — called directly by Razorpay. Raw body required for HMAC verification.
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Req() req: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(req.rawBody!, signature);
  }

  @Post('refund/:orderId')
  @UseGuards(JwtAuthGuard)
  initiateRefund(@CurrentUser() user: any, @Param('orderId') orderId: string) {
    return this.paymentsService.initiateRefund(orderId, user.id);
  }
}
