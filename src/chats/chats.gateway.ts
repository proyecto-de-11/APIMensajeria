import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { ChatsService } from './chats.service';

import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  public server: Server;

  constructor(private readonly chatsService: ChatsService) {}

  async handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);
    const userId = client.handshake.query.userId as string;

    if (!userId) {
      client.disconnect();
      return;
    }

    // Obtener todos los chats del usuario
    const userChats = await this.chatsService.getChatByUserId(+userId);

    // Unir al usuario a todas sus salas de chat
    userChats.forEach((chat): void => {
      client.join(`chat_${chat.id}`);

      console.log(`Usuario ${userId} conectado y unido a sus chats ${chat.id}`);
    });
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
  }

  // Evento para enviar mensaje
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { chatId: number; mensaje: string },
    @ConnectedSocket() client: Socket,
  ) {
    // const { usuarioId } = client.handshake.auth;

    const userId = client.handshake.query.userId as string;
    console.log('clienet userId', userId);

    await this.chatsService.saveMensaje(data.chatId, +userId, data.mensaje);

    /*const room = `chat_${data.chatId}`;
    const socketsInRoom = await this.server.in(room).fetchSockets();
    console.log(`👥 Clientes en ${room}:`, socketsInRoom.length);
    console.log(
      '🔑 Socket IDs en la sala:',
      socketsInRoom.map((s) => s.id),
    );*/
    // 2. Emitir el mensaje a todos los usuarios en esa sala

    client.broadcast.to(`chat_${data.chatId}`).emit('newMessage', {
      chatId: data.chatId,
      mensaje: data.mensaje,
      usuarioId: userId,
    });

    return { success: true };
  }

  // Evento para unirse a un chat específico
  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody() data: { grupId: number[] },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.handshake.query.userId as string;

    console.log('data grupId', data.grupId);
    const chats = await this.chatsService.getChatByGroupId(data.grupId);

    if (chats && chats.length > 0) {
      chats.forEach((chat) => {
        // Verificar si el usuario es participante del chat
        client.join(`chat_${chat.id}`);
        console.log(`Usuario ${userId} unido al chat grupal  ${chat.id}`);
      });

      this.server.to(client.id).emit('joinedChats', { chats });
    }

    console.log(`Usuario ${userId} solicitó unirse a chats grupales.`);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { chatId: number; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.handshake.query.userId as string;

    client.broadcast.to(`chat_${data.chatId}`).emit('userTyping', {
      usuarioId: userId,
      isTyping: data.isTyping,
    });
  }
}
