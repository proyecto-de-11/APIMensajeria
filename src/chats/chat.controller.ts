import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Post,
} from '@nestjs/common';
import { ChatsService } from './chats.service';
import { CreateChatDto } from './dto/create-chat.dto';

@Controller('api/chats')
export class ChatController {
  constructor(private readonly ChatsService: ChatsService) {}

  @Post()
  async createChat(@Body() userIds: CreateChatDto) {
    // En tu controlador o en otro servicio...
    try {
      const chatEncontrado =
        await this.ChatsService.findChatByExclusiveParticipants([
          userIds.userId1,
          userIds.userId2,
        ]);

      if (chatEncontrado) {
        return {
          ok: false,
          estatus: 200,
          message: 'Ya existe un chat con solo esos dos usuarios.',
          chat: chatEncontrado,
        };
      } else {
        return {
          ok: false,
          estatus: 201,
          message: 'chat creado exitosamente.',
          chat: await this.ChatsService.CreatePrivateChat([
            userIds.userId1,
            userIds.userId2,
          ]),
        };
      }
    } catch (error) {
      console.error('Error al buscar el chat:', error);
    }
  }

  @Post('/groups')
  async createGroupChat(@Body() data: { id: number }) {
    try {
      const chatEncontardo = await this.ChatsService.findGroupChat(data.id);

      if (chatEncontardo) {
        return {
          ok: false,
          estatus: 200,
          message: 'Ya existe un chat grupal con ese ID.',
          chat: chatEncontardo,
        };
      } else {
        return {
          ok: true,
          estatus: 201,
          message: 'Chat grupal creado exitosamente.',
          chat: await this.ChatsService.CreateGroupChat(data.id),
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new InternalServerErrorException('Error al buscar el chat grupal');
    }
    // Lógica para crear un chat grupal
  }

  @Get('usuario/:userId')
  async getMyChats(@Param('userId') userId: string) {
    try {
      const chats = await this.ChatsService.getChatByUserId(+userId);

      if (!chats || chats.length === 0) {
        return {
          ok: true,
          estatus: 200,
          message: 'El usuario no tiene chats.',
          chats: [],
        };
      }

      return {
        ok: true,
        estatus: 200,
        message: 'Chats del usuario obtenidos exitosamente.',
        chats: this.ChatsService.transformChatsForUser(chats, +userId),
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al obtener los chats del usuario',
      );
    }
  }

  @Get('groups/:groupIds')
  async getChatsByGroupIds(@Param('groupIds') groupIds: string) {
    try {
      const groupIdsArray = groupIds
        .split(',')
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));

      const chats = await this.ChatsService.findChatsByGroupIds(groupIdsArray);
      return {
        ok: true,
        estatus: 200,
        message: 'Chats grupales obtenidos exitosamente.',
        chats,
      };
    } catch (error) {
      console.error('Error al obtener los chats grupales:', error);
      throw new InternalServerErrorException(
        'Error al obtener los chats grupales',
      );
    }
  }

  @Get('group/:groupId')
  async getGroupChat(@Param('groupId') groupId: string) {
    try {
      const chat = await this.ChatsService.findGroupChat(+groupId);

      if (!chat) {
        return {
          ok: false,
          estatus: 404,
          message: 'No existe un chat grupal con ese ID.',
        };
      }

      return {
        ok: true,
        estatus: 200,
        message: 'Chat grupal obtenido exitosamente.',
        chat,
      };
    } catch (error) {
      console.error('Error al obtener el chat grupal:', error);
      throw new InternalServerErrorException('Error al obtener el chat grupal');
    }
  }
}
