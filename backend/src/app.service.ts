import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(private readonly dataSource: DataSource) {}

  async getHealth() {
    await this.dataSource.query('SELECT 1');

    return {
      status: 'ok',
      database: 'connected',
      application: 'Question Web API',
      timestamp: new Date().toISOString(),
    };
  }
}
