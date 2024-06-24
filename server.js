// Importovanje neophodnih modula i biblioteka
const express = require('express')
const path = require('path')
const http = require('http')
const PORT = process.env.PORT || 3000
const socketio = require('socket.io')
const app = express()
const server = http.createServer(app)
const io = socketio(server)

// Postavljanje static foldera
app.use(express.static(path.join(__dirname, "public")))

// Pokretanje servera
server.listen(PORT, () => console.log(`Server running on port ${PORT}`))

// Lista klijentskih konekcija
const connections = [null, null]

io.on('connection', socket => {

  // Slanje igrackog broja
  let playerIndex = -1;
  for (const i in connections) {
    if (connections[i] === null) {
      playerIndex = i
      break
    }
  }

  socket.emit('player-number', playerIndex)

  console.log(`Igrač ${playerIndex} se povezao`)

  // Ignorisanje trećeg igrača
  if (playerIndex === -1) return

  connections[playerIndex] = false

  // Slanje poruke o novom klijentu koji se konektovao
  socket.broadcast.emit('player-connection', playerIndex)

  // Prekid veze
  socket.on('disconnect', () => {
    console.log(`Igrac ${playerIndex} se diskonektovao`)
    connections[playerIndex] = null
    // Slanje svim drugim igracima informaciju o prekidu veze
    socket.broadcast.emit('player-connection', playerIndex)
  })

  
  socket.on('player-ready', () => {
    socket.broadcast.emit('enemy-ready', playerIndex)
    connections[playerIndex] = true
  })

  // Check player connections
  socket.on('check-players', () => {
    const players = []
    for (const i in connections) {
      connections[i] === null ? players.push({connected: false, ready: false}) : players.push({connected: true, ready: connections[i]})
    }
    socket.emit('check-players', players)
  })

  // Prijem napada
  socket.on('fire', id => {
    console.log(`Shot fired from ${playerIndex}`, id)

    // Slanje pozicije napada drugom klijentu
    socket.broadcast.emit('fire', id)
  })

  // Prijem odgovora na napad
  socket.on('fire-reply', square => {
    console.log(square)

    // Slanje odgovora drugom igracu
    socket.broadcast.emit('fire-reply', square)
  })


  setTimeout(() => {
    connections[playerIndex] = null
    socket.emit('timeout')
    socket.disconnect()
  }, 600000) // 10 minute vremenski limit za svakog klijenta
})