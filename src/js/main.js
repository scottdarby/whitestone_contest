import * as THREE from 'three'
const work = require('webworkify');

(function () {
  const canvas = document.querySelectorAll('canvas')[0]
  const startButton = document.querySelectorAll('#button-container')[0]
  const loader = document.querySelectorAll('#loader')[0]
  const container = document.querySelectorAll('.container')[0]

  let frame = 0

  // this.startButton.addEventListener('click', () => {
  //   this.hideStartScreen()
  //   this.start()
  // })

  let isOffscreen = false
  let worker = false

  let listener = new THREE.AudioListener()
  // this.camera.add(listener)

  let sound = new THREE.Audio(listener)
  let audioLoader = new THREE.AudioLoader()

  audioLoader.load('./audio/4walls.mp3', (buffer) => {
    sound.offset = 0
    sound.setBuffer(buffer)
    sound.setLoop(false)
    sound.setVolume(1)
    sound.play()
  })

  let analyser = new THREE.AudioAnalyser(sound, 64)
  analyser.smoothingTimeConstant = 0.1

  if ('transferControlToOffscreen' in canvas) {
    isOffscreen = true

    const offscreen = canvas.transferControlToOffscreen()

    worker = work(require('./offscreen.js'))
    // worker.addEventListener('message', function (ev) {
    //   console.log(ev.data)
    // })

    worker.postMessage({
      drawingSurface: offscreen,
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      pixelRatio: window.devicePixelRatio,
      type: 'init'
    }, [ offscreen ])

    animate()
  } else {
    alert('asdfasd')
  }

  function animate () {
    if (isOffscreen) {
      let freqData = analyser.getFrequencyData()

      worker.postMessage({
        type: 'updateAudio',
        freqData: freqData
      })
    }
    window.requestAnimationFrame(animate)
  }
})()
