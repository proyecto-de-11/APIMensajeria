import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Chat } from './entities/chat.entity';
import { Repository, DataSource, In } from 'typeorm';
import { ChatParticipante } from './entities/ChatParticipante.entity';
import { Mensaje } from './entities/mensaje.entity';
import { TransformedChat } from './dto/type';
import { group } from 'console';

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,

    @InjectRepository(ChatParticipante)
    private chatParticipantesRepository: Repository<ChatParticipante>,

    @InjectRepository(Mensaje)
    private mensajeRepository: Repository<Mensaje>,

    private dataSource: DataSource,
  ) {}

  async findChatByExclusiveParticipants(
    userIds: number[],
  ): Promise<Chat | null> {
    const totalParticipants = userIds.length;

    // Utilizamos el Query Builder de TypeORM para manejar GROUP BY y HAVING
    const chat = await this.chatRepository
      .createQueryBuilder('chat')
      // JOIN a la tabla de participantes (asumiendo que está relacionada)
      .innerJoin('chat.participantes', 'cp', 'cp.usuarioId IN (:...userIds)', {
        userIds,
      })

      .groupBy('chat.id')

      // 1. HAVING: Garantiza que ambos (o todos) los IDs de usuario estén presentes.
      .having('COUNT(DISTINCT cp.usuarioId) = :totalParticipants', {
        totalParticipants,
      })

      // 2. HAVING Adicional: Garantiza que el chat no tenga más participantes que los solicitados.
      .andHaving(
        // Subconsulta para contar el número total de participantes en el chat encontrado
        `(SELECT COUNT(*) FROM chat_participante cp_total WHERE cp_total.chatId = chat.id) = :totalParticipants`,
        { totalParticipants },
      )

      .getOne(); // Trae un solo resultado (el chat)

    return chat;
  }

  async CreatePrivateChat(userIds: number[]): Promise<Chat | null> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 2a. Crear la entidad Chat
      const nuevoChat = queryRunner.manager.create(Chat, {
        estado: true,
      });
      const chatGuardado = await queryRunner.manager.save(nuevoChat);

      // 2b. Crear y guardar los Participantes
      const participantes = userIds.map((userId) =>
        queryRunner.manager.create(ChatParticipante, {
          chat: chatGuardado,
          usuarioId: userId,
          activo: true, // Asumiendo que se crea activo por defecto
        }),
      );
      await queryRunner.manager.save(participantes);

      await queryRunner.commitTransaction();

      // 2c. Devolver el chat creado (cargando las relaciones para la respuesta)
      // Recargamos el objeto para que TypeORM cargue las relaciones guardadas.
      const chatCreado = await this.chatRepository.findOne({
        where: { id: chatGuardado.id },
        relations: ['participantes'],
      });

      return chatCreado;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        'Error al crear el chat y sus participantes.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async findGroupChat(id: number): Promise<Chat | null> {
    return this.chatRepository.findOne({
      where: { grupoId: id },
      relations: ['participantes'],
    });
  }

  async CreateGroupChat(id: number) {
    const nuevoChat = this.chatRepository.create({
      estado: true,
      grupoId: id,
    });
    return this.chatRepository.save(nuevoChat);
  }

  async saveMensaje(chatId: number, usuarioId: number, mensaje: string) {
    const nuevoMensaje = this.mensajeRepository.create({
      chat: { id: chatId } as Chat,
      usuarioId,
      mensaje,
    });
    return this.mensajeRepository.save(nuevoMensaje);
  }

  async getChatByUserId(userId: number): Promise<Chat[]> {
    return this.chatRepository
      .createQueryBuilder('chat')
      .innerJoin('chat.participantes', 'cp', 'cp.usuarioId = :userId', {
        userId,
      })
      .leftJoinAndSelect('chat.participantes', 'participantes')
      .where('chat.estado = :estado', { estado: true })
      .getMany();
  }

  async findChatsByGroupIds(groupIds: number[]): Promise<Chat[]> {
    if (!groupIds || groupIds.length === 0) {
      return [];
    }

    // El método 'find' es ideal para buscar por una condición sencilla
    return this.chatRepository.find({
      where: {
        // Usa el operador 'In' de TypeORM para generar la cláusula WHERE grupoId IN (id1, id2, ...)
        grupoId: In(groupIds),
      },
      // NOTA: Si quisieras traer alguna relación, usarías 'relations: ["participantes"]'
      // Como solo quieres los chats, no se añade nada más aquí.
    });
  }

  async findChatsByGroup(groupIds: number): Promise<Chat[]> {
    // El método 'find' es ideal para buscar por una condición sencilla
    return this.chatRepository.find({
      where: {
        // Usa el operador 'In' de TypeORM para generar la cláusula WHERE grupoId IN (id1, id2, ...)
        grupoId: groupIds,
      },
      // NOTA: Si quisieras traer alguna relación, usarías 'relations: ["participantes"]'
      // Como solo quieres los chats, no se añade nada más aquí.
    });
  }

  async findAllMessajesByChatId(chatId: number): Promise<Mensaje[]> {
    return this.mensajeRepository.find({
      where: {
        chat: { id: chatId } as Chat,
      },
      order: {
        id: 'ASC', // Ordenar por ID ascendente (puedes cambiarlo según tus necesidades)
      },
    });
  }

  async getMessages(
    chatId: number,
    page: number = 1,
    limit: number = 50,
    before?: string,
  ) {
    const query = this.mensajeRepository
      .createQueryBuilder('mensaje')
      .where('mensaje.chatId = :chatId', { chatId })
      .orderBy('mensaje.id', 'DESC')
      .take(limit);

    const messages = await query.getMany();

    // Retornar en orden cronológico (más antiguo primero)
    return messages.reverse();
  }

  transformChatsForUser(
    chats: Chat[],
    callingUserId: number,
  ): TransformedChat[] {
    // Filtramos para asegurar que solo trabajamos con chats válidos
    return chats
      .filter((chat) => chat.participantes && chat.participantes.length > 0)
      .map((chat) => {
        // Buscar el participante que NO es el usuario que consulta
        // Para chats privados (dos personas), esto será el único resultado.
        const otherParticipant = chat.participantes.find(
          (p) => p.usuarioId !== callingUserId,
        );

        // Si es un chat privado (dos personas) y encontramos al otro
        if (otherParticipant) {
          return {
            chatId: chat.id,
            otherParticipant: {
              usuarioId: otherParticipant.usuarioId,
              // Aquí podrías agregar name, avatar, etc., si los cargaste con JOIN
            },
          };
        }

        return {
          chatId: chat.id,
          otherParticipant: {
            usuarioId: 0, // ID 0 o un ID especial para indicar 'Grupo'
            // nombre: 'Chat Grupal',
          },
          // ...
        };
      });
  }

  async getChatByGroupId(groupId: number[]): Promise<Chat[]> {
    const chat = await this.chatRepository.find({
      where: { grupoId: In(groupId) },
    });
    return chat;
  }
}
