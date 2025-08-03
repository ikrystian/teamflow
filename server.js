const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  const io = new Server(server, {
    cors: {
      origin: dev ? ["http://localhost:3000"] : false,
      methods: ["GET", "POST"]
    }
  })

  // Store user socket mappings and online users
  const userSockets = new Map()
  const onlineUsers = new Set()

  // Make socket server globally available
  global.socketServer = io
  global.userSockets = userSockets
  global.onlineUsers = onlineUsers

  // Listen for chat room creation events from API routes
  io.on('chat-room-creation', (data) => {
    console.log('Broadcasting chat room creation:', data)

    data.memberIds.forEach(memberId => {
      const memberSocketId = userSockets.get(memberId)
      if (memberSocketId) {
        io.to(memberSocketId).emit('new-chat-room', data.chatRoom)
      }
    })
  })

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    // Store user ID mapping when they connect
    socket.on('user-register', (data) => {
      userSockets.set(data.userId, socket.id)
      socket.userId = data.userId
      console.log(`User ${data.userId} registered with socket ${socket.id}`)
    })

    // Handle user going online
    socket.on('user-online', (data) => {
      const { userId, userName } = data
      onlineUsers.add(userId)
      socket.userId = userId
      console.log(`User ${userId} (${userName}) is now online`)

      // Broadcast to all connected clients that this user is online
      socket.broadcast.emit('user-online', { userId })

      // Send current online users list to the newly connected user
      socket.emit('online-users-list', Array.from(onlineUsers))
    })

    // Handle user going offline
    socket.on('user-offline', (data) => {
      const { userId } = data
      onlineUsers.delete(userId)
      console.log(`User ${userId} is now offline`)

      // Broadcast to all connected clients that this user is offline
      socket.broadcast.emit('user-offline', { userId })
    })

    socket.on('join-room', (roomId) => {
      socket.join(roomId)
      console.log(`User ${socket.id} joined room ${roomId}`)
    })

    socket.on('leave-room', (roomId) => {
      socket.leave(roomId)
      console.log(`User ${socket.id} left room ${roomId}`)
    })

    socket.on('send-message', (data) => {
      console.log('Message received:', data)
      socket.to(data.chatRoomId).emit('new-message', data)
      socket.emit('message-sent', data)
    })

    socket.on('typing', (data) => {
      socket.to(data.chatRoomId).emit('user-typing', {
        userId: data.userId,
        userName: data.userName,
        chatRoomId: data.chatRoomId
      })
    })

    socket.on('stop-typing', (data) => {
      socket.to(data.chatRoomId).emit('user-stop-typing', {
        userId: data.userId,
        chatRoomId: data.chatRoomId
      })
    })

    // Handle new chat room creation
    socket.on('chat-room-created', (data) => {
      console.log('Chat room created:', data)

      // Notify all members of the new chat room
      data.memberIds.forEach(memberId => {
        const memberSocketId = userSockets.get(memberId)
        if (memberSocketId && memberSocketId !== socket.id) {
          io.to(memberSocketId).emit('new-chat-room', data.chatRoom)
        }
      })
    })

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id)
      // Remove user from socket mapping and online users
      if (socket.userId) {
        userSockets.delete(socket.userId)
        onlineUsers.delete(socket.userId)

        // Broadcast to all connected clients that this user is offline
        socket.broadcast.emit('user-offline', { userId: socket.userId })
        console.log(`User ${socket.userId} removed from online users due to disconnect`)
      }
    })
  })

  server
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })
})