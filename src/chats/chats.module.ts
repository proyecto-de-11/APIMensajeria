import { Module } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { ChatsGateway } from './chats.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chat } from './entities/chat.entity';
import { ChatParticipante } from './entities/ChatParticipante.entity';
import { Mensaje } from './entities/mensaje.entity';
import { ChatController } from './chat.controller';

@Module({
  controllers: [ChatController],
  imports: [TypeOrmModule.forFeature([Chat, ChatParticipante, Mensaje])],
  providers: [ChatsGateway, ChatsService],
})
export class ChatsModule {}
