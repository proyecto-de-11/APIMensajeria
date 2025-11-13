import { Module } from '@nestjs/common';

import { AppService } from './app.service';

import { ChatsModule } from './chats/chats.module';

@Module({
  imports: [ChatsModule],
  providers: [AppService],
})
export class AppModule {}
