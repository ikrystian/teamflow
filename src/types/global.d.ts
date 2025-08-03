import { Server as SocketIOServer } from 'socket.io'

declare global {
  var socketServer: SocketIOServer
  var userSockets: Map<string, string>
}

export {}
