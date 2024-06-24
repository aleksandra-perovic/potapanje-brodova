document.addEventListener('DOMContentLoaded', () => {
  const korisnickiGrid = document.querySelector('.grid-user')
  const racunarGrid = document.querySelector('.grid-computer')
  const displayGrid = document.querySelector('.grid-display')
  const brodovi = document.querySelectorAll('.ship')
  const razarac = document.querySelector('.destroyer-container')
  const podmornica = document.querySelector('.submarine-container')
  const kruzer = document.querySelector('.cruiser-container')
  const borbeniBrod = document.querySelector('.battleship-container')
  const teretniBrod = document.querySelector('.carrier-container')
  const pokreniButton = document.querySelector('#start')
  const rotirajButton = document.querySelector('#rotate')
  const prikazRedaNapada = document.querySelector('#whose-go')
  const infoEkran = document.querySelector('#info')
  const setupButtons = document.getElementById('setup-buttons')
  const korisnickiKvadrati = []
  const racunarKvadrati = []
  let horizontalno = true
  let krajIgre = false
  let tekuciIgrac = 'user'
  const sirina = 10
  let igrackiBroj = 0
  let spreman = false
  let protivnikSpreman = false
  let sviBrodoviNamesteni = false
  let gadjanje = -1
  // Brodovi
  const nizBrodova = [
    {
      name: 'destroyer',
      directions: [
        [0, 1],
        [0, sirina]
      ]
    },
    {
      name: 'submarine',
      directions: [
        [0, 1, 2],
        [0, sirina, sirina*2]
      ]
    },
    {
      name: 'cruiser',
      directions: [
        [0, 1, 2],
        [0, sirina, sirina*2]
      ]
    },
    {
      name: 'battleship',
      directions: [
        [0, 1, 2, 3],
        [0, sirina, sirina*2, sirina*3]
      ]
    },
    {
      name: 'carrier',
      directions: [
        [0, 1, 2, 3, 4],
        [0, sirina, sirina*2, sirina*3, sirina*4]
      ]
    },
  ]

  kreirajPlatformu(korisnickiGrid, korisnickiKvadrati)
  kreirajPlatformu(racunarGrid, racunarKvadrati)

  // Izbor moda igranja
  if (gameMode === 'singlePlayer') {
    startSinglePlayer()
  } else {
    startMultiPlayer()
  }

  // Multiplayer mod
  function startMultiPlayer() {
    const socket = io();

    // Dobijanje igrackog broja
    socket.on('player-number', num => {
      if (num === -1) {
        infoEkran.innerHTML = "Nažalost server je zauzet"
      } else {
        igrackiBroj = parseInt(num)
        if(igrackiBroj === 1) tekuciIgrac = "enemy"

        console.log(igrackiBroj)

        // Zahtev za proveru statusa igraca 
        socket.emit('check-players')
      }
    })

    // Povezivanje drugog igraca ili prekid veze
    socket.on('player-connection', num => {
      console.log(`Igrač broj ${num} se pridružio ili napustio igru`)
      igracKonektovanIliDiskonektovan(num)
    })

    // Protivnik spreman
    socket.on('enemy-ready', num => {
      protivnikSpreman = true
      igracSpreman(num)
      if (spreman) {
        igrajMultiPlayer(socket)
        setupButtons.style.display = 'none'
      }
    })

    // Provera statusa protivnika
    socket.on('check-players', igraci => {
      igraci.forEach((p, i) => {
        if(p.connected) igracKonektovanIliDiskonektovan(i)
        if(p.ready) {
          igracSpreman(i)
          if(i !== igracSpreman) protivnikSpreman = true
        }
      })
    })

    // Dostizanje vremenskog limita
    socket.on('timeout', () => {
      infoEkran.innerHTML = 'Dostigli ste vremenski limit od 10 minuta'
    })

    // Klike na dugme spreman za igru
    pokreniButton.addEventListener('click', () => {
      if(sviBrodoviNamesteni) igrajMultiPlayer(socket)
      else infoEkran.innerHTML = "Postavite sve svoje brodove"
    })

    // Event listener za napadanje
    racunarKvadrati.forEach(kvadrat => {
      kvadrat.addEventListener('click', () => {
        if(tekuciIgrac === 'user' && spreman && protivnikSpreman) {
          gadjanje = kvadrat.dataset.id
          socket.emit('fire', gadjanje)
        }
      })
    })

    // Prijem napada
    socket.on('fire', id => {
      protivnikNapada(id)
      const kvadrat = korisnickiKvadrati[id]
      socket.emit('fire-reply', kvadrat.classList)
      igrajMultiPlayer(socket)
    })

    // Prijem odgovora na napad
    socket.on('fire-reply', classList => {
      otkrijKvadrat(classList)
      igrajMultiPlayer(socket)
    })

    function igracKonektovanIliDiskonektovan(num) {
      let igrac = `.p${parseInt(num) + 1}`
      document.querySelector(`${igrac} .connected`).classList.toggle('active')
      if(parseInt(num) === igrackiBroj) document.querySelector(igrac).style.fontWeight = 'bold'
    }
  }

  // Kreiranje starta igre
  function startSinglePlayer() {
    generisi(nizBrodova[0])
    generisi(nizBrodova[1])
    generisi(nizBrodova[2])
    generisi(nizBrodova[3])
    generisi(nizBrodova[4])

    pokreniButton.addEventListener('click', () => {
      setupButtons.style.display = 'none'
      igrajSinglePlayer()
    })
  }

  //Kreiranje platforme za igranje
  function kreirajPlatformu(grid, kvadrati) {
    for (let i = 0; i < sirina*sirina; i++) {
      const kvadrat = document.createElement('div')
      kvadrat.dataset.id = i
      grid.appendChild(kvadrat)
      kvadrati.push(kvadrat)
    }
  }

  //Iscrtavanje brodova na random pozicijama na ekranu
  function generisi(brod) {
    let randomPravac = Math.floor(Math.random() * brod.directions.length)
    let tekuci = brod.directions[randomPravac]
    if (randomPravac === 0) direction = 1
    if (randomPravac === 1) direction = 10
    let randomStart = Math.abs(Math.floor(Math.random() * racunarKvadrati.length - (brod.directions[0].length * direction)))

    const izabran = tekuci.some(index => racunarKvadrati[randomStart + index].classList.contains('taken'))
    const naDesnojIvici = tekuci.some(index => (randomStart + index) % sirina === sirina - 1)
    const naLevojIvici = tekuci.some(index => (randomStart + index) % sirina === 0)

    if (!izabran && !naDesnojIvici && !naLevojIvici) tekuci.forEach(index => racunarKvadrati[randomStart + index].classList.add('taken', brod.name))

    else generisi(brod)
  }
  

  //Rotiranje brodova
  function rotiraj() {
    if (horizontalno) {
      razarac.classList.toggle('destroyer-container-vertical')
      podmornica.classList.toggle('submarine-container-vertical')
      kruzer.classList.toggle('cruiser-container-vertical')
      borbeniBrod.classList.toggle('battleship-container-vertical')
      teretniBrod.classList.toggle('carrier-container-vertical')
      horizontalno = false
      // console.log(isHorizontal)
      return
    }
    if (!horizontalno) {
      razarac.classList.toggle('destroyer-container-vertical')
      podmornica.classList.toggle('submarine-container-vertical')
      kruzer.classList.toggle('cruiser-container-vertical')
      borbeniBrod.classList.toggle('battleship-container-vertical')
      teretniBrod.classList.toggle('carrier-container-vertical')
      horizontalno = true
      // console.log(isHorizontal)
      return
    }
  }
  rotirajButton.addEventListener('click', rotiraj)

  //pomeranje korisničkog broda
  brodovi.forEach(brod => brod.addEventListener('dragstart', dragStart))
  korisnickiKvadrati.forEach(kvadrat => kvadrat.addEventListener('dragstart', dragStart))
  korisnickiKvadrati.forEach(kvadrat => kvadrat.addEventListener('dragover', dragOver))
  korisnickiKvadrati.forEach(kvadrat => kvadrat.addEventListener('dragenter', dragEnter))
  korisnickiKvadrati.forEach(kvadrat => kvadrat.addEventListener('dragleave', dragLeave))
  korisnickiKvadrati.forEach(kvadrat => kvadrat.addEventListener('drop', dragDrop))
  korisnickiKvadrati.forEach(kvadrat => kvadrat.addEventListener('dragend', dragEnd))

  let izabraniBrodImeSaIndeksom
  let postavljenBrod
  let postavljeniBrodDuzina

  brodovi.forEach(brod => brod.addEventListener('mousedown', (e) => {
    izabraniBrodImeSaIndeksom = e.target.id
    // console.log(selectedShipNameWithIndex)
  }))

  function dragStart() {
    postavljenBrod = this
    postavljeniBrodDuzina = this.childNodes.length
    // console.log(draggedShip)
  }

  function dragOver(e) {
    e.preventDefault()
  }

  function dragEnter(e) {
    e.preventDefault()
  }

  function dragLeave() {
    // console.log('drag leave')
  }

  function dragDrop() {
    let brodImePoslednjiIndeks = postavljenBrod.lastChild.id
    let brodKlasa = brodImePoslednjiIndeks.slice(0, -2)
    
    let poslednjiBrodIndeks = parseInt(brodImePoslednjiIndeks.substr(-1))
    let brodPoslednjiID = poslednjiBrodIndeks + parseInt(this.dataset.id)
    
    const nedozvoljenoHorizontalno = [0,10,20,30,40,50,60,70,80,90,1,11,21,31,41,51,61,71,81,91,2,22,32,42,52,62,72,82,92,3,13,23,33,43,53,63,73,83,93]
    const nedozvoljenoVertikalno = [99,98,97,96,95,94,93,92,91,90,89,88,87,86,85,84,83,82,81,80,79,78,77,76,75,74,73,72,71,70,69,68,67,66,65,64,63,62,61,60]
    
    let noviNedozvoljeniHorizontalno = nedozvoljenoHorizontalno.splice(0, 10 * poslednjiBrodIndeks)
    let noviNedozvoljeniVertikalno = nedozvoljenoVertikalno.splice(0, 10 * poslednjiBrodIndeks)

    selectedShipIndex = parseInt(izabraniBrodImeSaIndeksom.substr(-1))

    brodPoslednjiID = brodPoslednjiID - selectedShipIndex
  

    if (horizontalno && !noviNedozvoljeniHorizontalno.includes(brodPoslednjiID)) {
      for (let i=0; i < postavljeniBrodDuzina; i++) {
        let pravacKlasa
        if (i === 0) pravacKlasa = 'start'
        if (i === postavljeniBrodDuzina - 1) pravacKlasa = 'end'
        korisnickiKvadrati[parseInt(this.dataset.id) - selectedShipIndex + i].classList.add('taken', 'horizontal', pravacKlasa, brodKlasa)
      }

    
    } else if (!horizontalno && !noviNedozvoljeniVertikalno.includes(brodPoslednjiID)) {
      for (let i=0; i < postavljeniBrodDuzina; i++) {
        let pravacKlasa
        if (i === 0) pravacKlasa = 'start'
        if (i === postavljeniBrodDuzina - 1) pravacKlasa = 'end'
        korisnickiKvadrati[parseInt(this.dataset.id) - selectedShipIndex + sirina*i].classList.add('taken', 'vertical', pravacKlasa, brodKlasa)
      }
    } else return

    displayGrid.removeChild(postavljenBrod)
    if(!displayGrid.querySelector('.ship')) sviBrodoviNamesteni = true
  }

  function dragEnd() {
    // console.log('dragend')
  }

  // Logika multiplayer moda igrice
  function igrajMultiPlayer(socket) {
    setupButtons.style.display = 'none'
    if(krajIgre) return
    if(!spreman) {
      socket.emit('player-ready')
      spreman = true
      igracSpreman(igrackiBroj)
    }

    if(protivnikSpreman) {
      if(tekuciIgrac === 'user') {
        prikazRedaNapada.innerHTML = 'Vaš napad'
      }
      if(tekuciIgrac === 'enemy') {
        prikazRedaNapada.innerHTML = "Protivnikov napad"
      }
    }
  }

  function igracSpreman(num) {
    let igrac = `.p${parseInt(num) + 1}`
    document.querySelector(`${igrac} .ready`).classList.toggle('active')
  }

  // Singeplayer logika igrice
  function igrajSinglePlayer() {
    if (krajIgre) return
    if (tekuciIgrac === 'user') {
      prikazRedaNapada.innerHTML = 'Vaš napad'
      racunarKvadrati.forEach(kvadrat => kvadrat.addEventListener('click', function(e) {
        gadjanje = kvadrat.dataset.id
        otkrijKvadrat(kvadrat.classList)
      }))
    }
    if (tekuciIgrac === 'enemy') {
      prikazRedaNapada.innerHTML = 'Računar napada'
      setTimeout(protivnikNapada, 1000)
    }
  }

  let razaracBrojac = 0
  let podmornicaBrojac = 0
  let kruzerBrojac = 0
  let borbeniBrodBrojac = 0
  let teretniBrodBrojac = 0

  function otkrijKvadrat(listaKlasa) {
    const protivnikovKvadrat = racunarGrid.querySelector(`div[data-id='${gadjanje}']`)
    const obj = Object.values(listaKlasa)
    if (!protivnikovKvadrat.classList.contains('boom') && tekuciIgrac === 'user' && !krajIgre) {
      if (obj.includes('destroyer')) razaracBrojac++
      if (obj.includes('submarine')) podmornicaBrojac++
      if (obj.includes('cruiser')) kruzerBrojac++
      if (obj.includes('battleship')) borbeniBrodBrojac++
      if (obj.includes('carrier')) teretniBrodBrojac++
    }
    if (obj.includes('taken')) {
      protivnikovKvadrat.classList.add('boom')
    } else {
      protivnikovKvadrat.classList.add('miss')
    }
    proveriPobednika()
    tekuciIgrac = 'enemy'
    if(gameMode === 'singlePlayer') igrajSinglePlayer()
  }

  let cpuRazaracBrojac = 0
  let cpuPodmornicaBrojac = 0
  let cpuKruzerBrojac = 0
  let cpuBorbeniBrodBrojac = 0
  let cpuTeretniBrodBrojac = 0


  function protivnikNapada(square) {
    if (gameMode === 'singlePlayer') square = Math.floor(Math.random() * korisnickiKvadrati.length)
    if (!korisnickiKvadrati[square].classList.contains('boom')) {
      const hit = korisnickiKvadrati[square].classList.contains('taken')
      korisnickiKvadrati[square].classList.add(hit ? 'boom' : 'miss')
      if (korisnickiKvadrati[square].classList.contains('destroyer')) cpuRazaracBrojac++
      if (korisnickiKvadrati[square].classList.contains('submarine')) cpuPodmornicaBrojac++
      if (korisnickiKvadrati[square].classList.contains('cruiser')) cpuKruzerBrojac++
      if (korisnickiKvadrati[square].classList.contains('battleship')) cpuBorbeniBrodBrojac++
      if (korisnickiKvadrati[square].classList.contains('carrier')) cpuTeretniBrodBrojac++
      proveriPobednika()
    } else if (gameMode === 'singlePlayer') protivnikNapada()
    tekuciIgrac = 'user'
    prikazRedaNapada.innerHTML = 'Vaš napad'
  }

  function proveriPobednika() {
    let protivnik = 'računar'
    if(gameMode === 'multiPlayer') protivnik = 'protivnik'
    if (razaracBrojac === 2) {
      infoEkran.innerHTML = `potopili ste ${protivnik}ov razarač`
      razaracBrojac = 10
    }
    if (podmornicaBrojac === 3) {
      infoEkran.innerHTML = `potopili ste ${protivnik}ovu podmornicu`
      podmornicaBrojac = 10
    }
    if (kruzerBrojac === 3) {
      infoEkran.innerHTML = `potopili ste ${protivnik}ov kruzer`
      kruzerBrojac = 10
    }
    if (borbeniBrodBrojac === 4) {
      infoEkran.innerHTML = `potopili ste ${protivnik}ov borbeni brod`
      borbeniBrodBrojac = 10
    }
    if (teretniBrodBrojac === 5) {
      infoEkran.innerHTML = `potopili ste ${protivnik}ov teretni brod`
      teretniBrodBrojac = 10
    }
    if (cpuRazaracBrojac === 2) {
      infoEkran.innerHTML = `${protivnik} je potopio vaš razarač`
      cpuRazaracBrojac = 10
    }
    if (cpuPodmornicaBrojac === 3) {
      infoEkran.innerHTML = `${protivnik} je potopio vašu podmornicu`
      cpuPodmornicaBrojac = 10
    }
    if (cpuKruzerBrojac === 3) {
      infoEkran.innerHTML = `${protivnik} je potopio vaš kruzer`
      cpuKruzerBrojac = 10
    }
    if (cpuBorbeniBrodBrojac === 4) {
      infoEkran.innerHTML = `${protivnik} je potopio vaš borbeni brod`
      cpuBorbeniBrodBrojac = 10
    }
    if (cpuTeretniBrodBrojac === 5) {
      infoEkran.innerHTML = `${protivnik} je potopio vaš teretni brod`
      cpuTeretniBrodBrojac = 10
    }

    if ((razaracBrojac + podmornicaBrojac + kruzerBrojac + borbeniBrodBrojac + teretniBrodBrojac) === 50) {
      infoEkran.innerHTML = "VI STE POBEDILI"
      gameOver()
    }
    if ((cpuRazaracBrojac + cpuPodmornicaBrojac + cpuKruzerBrojac + cpuBorbeniBrodBrojac + cpuTeretniBrodBrojac) === 50) {
      infoEkran.innerHTML = `${protivnik.toUpperCase()} JE POBEDNIK`
      gameOver()
    }
  }

  function gameOver() {
    krajIgre = true
    pokreniButton.removeEventListener('click', igrajSinglePlayer)
  }
})