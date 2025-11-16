export interface TransformedChat {
  chatId: number;
  // La información del compañero de chat
  otherParticipant: {
    usuarioId: number;
    // Puedes añadir más campos como nombre, foto, etc. aquí
    // nombre: string;
  };
}
