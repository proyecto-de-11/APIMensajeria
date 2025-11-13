import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { ChatsModule } from './chats/chats.module';

@Module({
  imports: [ChatModule, ChatsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
