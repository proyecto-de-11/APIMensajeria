import { Module } from '@nestjs/common';

import { AppService } from './app.service';

import { ChatsModule } from './chats/chats.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [ ConfigModule.forRoot({
      isGlobal: true
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'mysql-test-esfe-8ff0.b.aivencloud.com',
      port: 20787,
      username: 'avnadmin',
      password: 'AVNS_PfxZhqEHsyFEn50ylaO',
      database: 'TiendaOnline',
      logging: true,
      synchronize: false,
      autoLoadEntities: true,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
    })
    ,ChatsModule],
  providers: [AppService],
})
export class AppModule {}
