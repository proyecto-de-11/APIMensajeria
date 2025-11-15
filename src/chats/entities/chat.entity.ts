import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ChatParticipante } from './ChatParticipante.entity';
import { Mensaje } from './mensaje.entity';

@Entity()
export class Chat {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => ChatParticipante, (participante) => participante.chat, {
    cascade: true, // Importante: al guardar chat, guarda participantes
  })
  participantes: ChatParticipante[];

  @OneToMany(() => Mensaje, (mensaje) => mensaje.chat, {
    cascade: true,
  })
  mensajes: Mensaje[];

  @Column({ type: 'int', nullable: true })
  grupoId: number | null;

  @Column()
  estado: boolean;
}
