import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Chat } from './chat.entity';

@Entity()
export class Mensaje {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Chat, (chat) => chat.participantes, {
    onDelete: 'CASCADE', // Si se borra el chat, se borran los participantes
  })
  chat: Chat;

  @Column()
  usuarioId: number;

  @Column({ type: 'text' })
  mensaje: string;
}
