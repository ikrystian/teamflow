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

  // Store user socket mappings
  const userSockets = new Map()

  // Make socket server globally available
  global.socketServer = io
  global.userSockets = userSockets

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
      // Remove user from socket mapping
      if (socket.userId) {
        userSockets.delete(socket.userId)
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