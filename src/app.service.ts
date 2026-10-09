import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): { status: string; message: string; timestamp: string } {
    return {
      status: 'ok',
      message: 'Nest.js backend service is running!',
      timestamp: new Date().toISOString(),
    };
  }
}
