import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { ChatsService } from './chats.service';

import { Server, Socket } from 'socket.io';
import { OnModuleInit } from '@nestjs/common';

@WebSocketGateway()
export class ChatsGateway implements OnModuleInit {
  @WebSocketServer()
  public server: Server;

  constructor(private readonly chatsService: ChatsService) {}

  onModuleInit() {
    this.server.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);
    });
  }
}
