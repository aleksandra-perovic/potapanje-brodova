// Importovanje neophodnih modula i biblioteka
const express = require('express')
const path = require('path')
const http = require('http')
const PORT = 3000
const socketio = require('socket.io')
//kreiranje express aplikacije, http servera i instance socket.io servera
const app = express()
const server = http.createServer(app)
const io = socketio(server)

// Postavljanje static foldera
app.use(express.static(path.join(__dirname, "public")))

// Pokretanje servera
server.listen(PORT, () => console.log(`Server aktivan na portu: ${PORT}`))

// Lista klijentskih konekcija
const konekcije = [null, null]

io.on('connection', socket => {

  // Slanje igrackog broja
  let igracIndeks = -1;
  for (const i in konekcije) {
    if (konekcije[i] === null) {
      igracIndeks = i
      break
    }
  }

  socket.emit('player-number', igracIndeks)

  console.log(`Igrač ${igracIndeks} se povezao`)

  // Ignorisanje trećeg igrača
  if (igracIndeks === -1) return

  konekcije[igracIndeks] = false

  // Slanje poruke o novom klijentu koji se konektovao svim povezanim klijentima
  socket.broadcast.emit('player-connection', igracIndeks)

  // Prekid veze
  socket.on('disconnect', () => {
    console.log(`Igrac ${igracIndeks} se diskonektovao`)
    konekcije[igracIndeks] = null
    // Slanje svim drugim igracima informaciju o prekidu veze
    socket.broadcast.emit('player-connection', igracIndeks)
  })

  
  socket.on('player-ready', () => {
    socket.broadcast.emit('enemy-ready', igracIndeks)
    konekcije[igracIndeks] = true
  })

  // Proveri konekciju drugog igraca
  socket.on('check-players', () => {
    const igraci = []
    for (const i in konekcije) {
      konekcije[i] === null ? igraci.push({povezan: false, spreman: false}) 
                            : igraci.push({povezan: true, spreman: konekcije[i]})
    }
    socket.emit('check-players', igraci)
  })

  // Prijem napada
  socket.on('fire', id => {
    console.log(`Pogadjanje od igraca ${igracIndeks}`, id)

    // Slanje pozicije napada drugom klijentu
    socket.broadcast.emit('fire', id)
  })

  // Prijem odgovora na napad
  socket.on('fire-reply', kvadrat => {
    console.log(kvadrat)

    // Slanje odgovora drugom igracu
    socket.broadcast.emit('fire-reply', kvadrat)
  })


  setTimeout(() => {
    konekcije[igracIndeks] = null
    socket.emit('timeout')
    socket.disconnect()
  }, 600000) 
  
  // 10 minute vremenski limit za svakog klijenta
})