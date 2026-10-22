import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    // Avoid attempting network connect during isolated unit test executions
    if (process.env.NODE_ENV !== 'test') {
      try {
        await this.$connect();
      } catch (error) {
        // Log connection status during startup without crashing offline workflows
        console.warn('Prisma could not connect to PostgreSQL instance:', error);
      }
    }
  }

  async enableShutdownHooks(app: INestApplication): Promise<void> {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
