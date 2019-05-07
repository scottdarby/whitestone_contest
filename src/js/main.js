import * as THREE from 'three'
import OrbitConstructor from 'three-orbit-controls'
const OrbitControls = OrbitConstructor(THREE);

(function () {
  let renderer
  let scene
  let objectMeshes1 = []
  let objectMeshes2 = []
  let objectMeshes3 = []
  let objectMeshes4 = []
  let objectPoints1 = []
  let objectPoints2 = []
  let objectPoints3 = []
  let objectPoints4 = []
  let geometry
  let camera
  let controls
  let initFaces = []
  let analyser
  let freqData = null
  let materials = []
  const channelCount = 15
  let allVertices = []
  let allFaces = []
  let initVerticeArray = null
  let initFaceArray = null
  let currentFrame = 0
  let choose = []
  let colours = []
  let sound = null
  let movementRate = 0
  let notResetCount = []
  const notResetThreshold = 70
  const pallete = [
    [249, 107, 107],
    [249, 153, 89],
    [249, 184, 89],
    [249, 230, 89],
    [193, 249, 89],
    [118, 249, 89],
    [89, 249, 131],
    [89, 249, 201],
    [89, 235, 249],
    [89, 190, 249],
    [89, 139, 249],
    [89, 99, 249],
    [155, 89, 249],
    [235, 89, 249],
    [249, 89, 203],
    [249, 89, 113]
  ]
  const sprite = new THREE.TextureLoader().load('./textures/concentric.png')
  let started = false
  const pointMaterial = new THREE.PointsMaterial({
    size: 0.3,
    alphaTest: 0.0001,
    map: sprite,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: false
  })

  const startButton = document.querySelectorAll('#button-container')[0]
  const loader = document.querySelectorAll('#loader')[0]
  const container = document.querySelectorAll('.container')[0]

  startButton.addEventListener('click', (element) => {
    hideStartScreen()
    start()
  })

  function start () {
    init()
    animate()
  }

  function hideStartScreen () {
    startButton.classList.toggle('hide')
    container.classList.toggle('hide')
    loader.classList.toggle('hide')
  }

  function reset () {
    startButton.classList.toggle('hide')
    container.classList.toggle('hide')
    document.body.removeChild(renderer.domElement)
    scene = null
    camera = null
    controls = null
    sound = null
    analyser = null
  }

  function init () {
    currentFrame = 0
    movementRate = 0

    renderer = new THREE.WebGLRenderer({
      antialias: true
    })

    renderer.autoClear = false
    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)

    scene = new THREE.Scene()

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 300)
    camera.position.set(0, 0, 3.3)
    scene.add(camera)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.minDistance = 0
    controls.maxDistance = 200
    controls.enablePan = false
    controls.zoomSpeed = 0.7
    controls.rotateSpeed = 0.07
    controls.enableDamping = true
    controls.dampingFactor = 0.04

    let listener = new THREE.AudioListener()
    camera.add(listener)

    sound = new THREE.Audio(listener)
    let audioLoader = new THREE.AudioLoader()

    audioLoader.load('./audio/bioluminescence.mp3', (buffer) => {
      sound.setBuffer(buffer)
      sound.setLoop(false)
      sound.setVolume(1)
      sound.play()
    })

    analyser = new THREE.AudioAnalyser(sound, 32)

    for (let channel = 0; channel < channelCount; channel++) {
      colours[channel] = new THREE.Color(pallete[channel][0] / 255, pallete[channel][1] / 255, pallete[channel][2] / 255)

      materials[channel] = new THREE.MeshBasicMaterial({
        wireframe: true,
        color: colours[channel],
        opacity: 0.1,
        transparent: true
      })

      createInitialShape(channel, true)
    }

    window.addEventListener('resize', onWindowResize, false)
  }

  function onWindowResize () {
    if (camera) {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
    }
    if (renderer) {
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
  }

  function createInitialShape (channel, firstRun = false) {
    if (initVerticeArray === null) {
      initVerticeArray = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0.001),
        new THREE.Vector3(0, 0.001, 0.001),
        new THREE.Vector3(0, 0.001, 0.001)
      ]
    }

    if (initFaceArray === null) {
      initFaceArray = []
      for (let index = 0; index < 500; index++) {
        initFaceArray.push(new THREE.Face3(0, 1, 2))
      }
    }

    if (typeof allVertices[channel] === 'undefined') {
      allVertices[channel] = []
    }
    allVertices[channel] = []

    if (typeof allFaces[channel] === 'undefined') {
      allFaces[channel] = []
    }
    allFaces[channel] = []

    for (let i = 0; i < initVerticeArray.length; i++) {
      allVertices[channel].push(initVerticeArray[i])
    }

    for (let i = 0; i < initFaceArray.length; i++) {
      allFaces[channel].push(initFaceArray[i])
    }

    if (firstRun) {
      console.log('firstRun')
      geometry = new THREE.Geometry()
      geometry.vertices = initVerticeArray
      geometry.faces = initFaceArray
      objectMeshes1[channel] = new THREE.Mesh(geometry, materials[channel])
      objectMeshes1[channel].frustumCulled = false
      scene.add(objectMeshes1[channel])

      objectPoints1[channel] = new THREE.Points(geometry, pointMaterial)
      objectPoints1[channel].frustumCulled = false
      scene.add(objectPoints1[channel])

      objectMeshes2[channel] = new THREE.Mesh(geometry, materials[channel])
      objectMeshes2[channel].frustumCulled = false
      objectMeshes2[channel].scale.x = -1
      scene.add(objectMeshes2[channel])

      objectPoints2[channel] = new THREE.Points(geometry, pointMaterial)
      objectPoints2[channel].frustumCulled = false
      objectPoints2[channel].scale.x = -1
      scene.add(objectPoints2[channel])

      objectMeshes3[channel] = new THREE.Mesh(geometry, materials[channel])
      objectMeshes3[channel].frustumCulled = false
      objectMeshes3[channel].scale.y = -1
      scene.add(objectMeshes3[channel])

      objectPoints3[channel] = new THREE.Points(geometry, pointMaterial)
      objectPoints3[channel].frustumCulled = false
      objectPoints3[channel].scale.y = -1
      scene.add(objectPoints3[channel])

      objectMeshes4[channel] = new THREE.Mesh(geometry, materials[channel])
      objectMeshes4[channel].frustumCulled = false
      objectMeshes4[channel].scale.x = -1
      objectMeshes4[channel].scale.y = -1
      scene.add(objectMeshes4[channel])

      objectPoints4[channel] = new THREE.Points(geometry, pointMaterial)
      objectPoints4[channel].frustumCulled = false
      objectPoints4[channel].scale.x = -1
      objectPoints4[channel].scale.y = -1
      scene.add(objectPoints4[channel])
    }

    if (typeof initFaces[channel] === 'undefined') {
      initFaces[channel] = []
    }
    initFaces[channel] = []
    initFaces[channel] = initFaceArray[1]
  }

  function grow (currentFace, channel) {
    if (typeof freqData[channel] === 'undefined') {
      return
    }

    let growthFactor = Math.abs(freqData[channel])

    switch (channel) {
      case 0:
        growthFactor *= 0.2
        break
      case 1:
        growthFactor *= 0.3
        break
      case 2:
        growthFactor *= 0.4
        break
      case 3:
        growthFactor *= 0.5
        break
      case 4:
        growthFactor *= 0.6
        break
      case 5:
        growthFactor *= 0.7
        break
      case 6:
        growthFactor *= 0.8
        break
      case 7:
        growthFactor *= 0.9
        break
    }

    growthFactor *= 0.001

    if (growthFactor > 1) {
      growthFactor = 1
    }

    // get center point of face
    let faceVerticeA = allVertices[channel][currentFace['a']]
    let faceVerticeB = allVertices[channel][currentFace['b']]
    let faceVerticeC = allVertices[channel][currentFace['c']]
    let faceCenterX = (faceVerticeA['x'] + faceVerticeB['x'] + faceVerticeC['x']) * 0.3333333333333333
    let faceCenterY = (faceVerticeA['y'] + faceVerticeB['y'] + faceVerticeC['y']) * 0.3333333333333333
    let faceCenterZ = (faceVerticeA['z'] + faceVerticeB['z'] + faceVerticeC['z']) * 0.3333333333333333
    let centerFaceVertice = new THREE.Vector3(faceCenterX, faceCenterY, faceCenterZ)

    centerFaceVertice.add(currentFace.normal.multiplyScalar(growthFactor))
    allVertices[channel].push(centerFaceVertice)

    let newFaces = [
      new THREE.Face3(currentFace['a'], currentFace['c'], allVertices[channel].length - 1),
      new THREE.Face3(currentFace['a'], currentFace['b'], allVertices[channel].length - 1),
      new THREE.Face3(currentFace['b'], currentFace['c'], allVertices[channel].length - 1)
    ]

    allFaces[channel][allFaces[channel].length - 1] = newFaces[0]

    for (let i = 1; i < newFaces.length; i++) {
      allFaces[channel].push(newFaces[i])
    }

    allFaces[channel].shift()
    allFaces[channel].shift()

    objectMeshes1[channel].geometry.vertices = allVertices[channel]
    objectMeshes1[channel].geometry.faces = allFaces[channel]
    objectMeshes1[channel].geometry.verticesNeedUpdate = true
    objectMeshes1[channel].geometry.elementsNeedUpdate = true
    objectMeshes1[channel].geometry.computeFaceNormals()

    objectPoints1[channel].geometry.vertices = allVertices[channel]
    objectPoints1[channel].geometry.verticesNeedUpdate = true

    objectMeshes2[channel].geometry.vertices = allVertices[channel]
    objectMeshes2[channel].geometry.faces = allFaces[channel]
    objectMeshes2[channel].geometry.verticesNeedUpdate = true

    objectPoints2[channel].geometry.vertices = allVertices[channel]
    objectPoints2[channel].geometry.verticesNeedUpdate = true

    objectMeshes3[channel].geometry.vertices = allVertices[channel]
    objectMeshes3[channel].geometry.faces = allFaces[channel]
    objectMeshes3[channel].geometry.verticesNeedUpdate = true

    objectPoints3[channel].geometry.vertices = allVertices[channel]
    objectPoints3[channel].geometry.verticesNeedUpdate = true

    objectMeshes4[channel].geometry.vertices = allVertices[channel]
    objectMeshes4[channel].geometry.faces = allFaces[channel]
    objectMeshes4[channel].geometry.verticesNeedUpdate = true

    objectPoints4[channel].geometry.vertices = allVertices[channel]
    objectPoints4[channel].geometry.verticesNeedUpdate = true

    let growthPoint = Math.ceil(movementRate * 0.045)

    if (growthPoint > 15) {
      growthPoint = 15
    }

    if (currentFrame !== 0 && currentFrame % growthPoint === 0) {
      if (typeof choose[channel] === 'undefined') {
        choose[channel] = []
      }

      choose[channel] = Math.ceil((Math.random() * allFaces[channel].length - 1) * 0.3)

      initFaces[channel] = allFaces[channel][allFaces[channel].length - choose[channel]]

      if (typeof notResetCount[channel] === 'undefined') {
        notResetCount[channel] = 0
      }

      // restart
      if (notResetCount[channel] > notResetThreshold) {
        notResetCount[channel] = 0
        createInitialShape(channel)
      } else {
        if (choose[channel] % 250 === 0) {
          notResetCount[channel] = 0
          createInitialShape(channel)
        } else {
          notResetCount[channel]++
        }
      }
    } else {
      initFaces[channel] = allFaces[channel][allFaces[channel].length - 1]
    }
  }

  function animate () {
    movementRate += 0.5
    currentFrame++
    controls.update()

    if (sound.isPlaying) {
      if (!started) {
        started = true
        loader.classList.toggle('hide')
      }

      if (freqData === null) {
        freqData = analyser.getFrequencyData()
      }

      if (currentFrame % 250 === 0) {
        freqData = analyser.getFrequencyData()
      }
      for (let channel = 0; channel < channelCount; channel++) {
        grow(initFaces[channel], channel)
      }
    } else {
      // once track has finished, restart
      if (started) {
        started = false
        reset()
        return
      }
    }

    renderer.render(scene, camera)

    window.requestAnimationFrame(animate)
  }
})()
