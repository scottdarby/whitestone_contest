import * as THREE from 'three'
import OrbitContructor from 'three-orbit-controls'
const OrbitControls = OrbitContructor(THREE);

(function () {
  let renderer
  let scene
  let camera
  let controls
  let initFaces = []
  let geoMap = []
  let pointsMap = []
  let analyser
  let freqData
  let materials = []
  const channelCount = 15
  let allVertices = []
  let allFaces = []
  const initTetraFaces = [
    [0, 2, 3],
    [0, 1, 3],
    [1, 2, 3],
    [0, 1, 2]
  ]
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
  const symmetryLevels = 4
  let started = false
  const pointMaterial = new THREE.PointsMaterial({
    size: 0.5,
    alphaTest: 0.0001,
    map: sprite,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: false
  })

  function start () {
    init()
    animate()
  }

  const startButton = document.querySelectorAll('#start')[0]
  const loader = document.querySelectorAll('#loader')[0]
  const container = document.querySelectorAll('.container')[0]

  function hideStartScreen () {
    startButton.classList.toggle('hide')
    container.classList.toggle('hide')
    loader.classList.toggle('hide')
  }

  startButton.addEventListener('click', (element) => {
    hideStartScreen()
    start()
  })

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

    // renderer
    renderer = new THREE.WebGLRenderer({
      antialias: true
    })

    renderer.autoClear = false

    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)

    // scene
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0, 0, 0)

    // camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 300)
    camera.position.set(0, 0, 2.3)
    scene.add(camera)

    // controls
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

    audioLoader.load('./audio/gao.mp3', (buffer) => {
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
        opacity: 0.2,
        transparent: true
      })

      createInitialShape(channel)
    }

    window.addEventListener('resize', onWindowResize, false)
  }

  function onWindowResize () {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }

  function createInitialShape (channel) {
    let vertices = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0.001),
      new THREE.Vector3(0, 0.001, 0.001),
      new THREE.Vector3(0, 0.001, 0.001)
    ]

    let faces = [
      new THREE.Face3(...initTetraFaces[0]),
      new THREE.Face3(...initTetraFaces[1]),
      new THREE.Face3(...initTetraFaces[2])
    ]

    if (typeof allVertices[channel] === 'undefined') {
      allVertices[channel] = []
    }
    allVertices[channel] = []

    if (typeof allFaces[channel] === 'undefined') {
      allFaces[channel] = []
    }
    allFaces[channel] = []

    for (let i = 0; i < vertices.length; i++) {
      allVertices[channel].push(vertices[i])
    }

    for (let i = 0; i < faces.length; i++) {
      allFaces[channel].push(faces[i])
    }

    let geometry = new THREE.Geometry()
    geometry.vertices = vertices
    geometry.faces = faces
    geometry.computeFaceNormals()

    if (typeof initFaces[channel] === 'undefined') {
      initFaces[channel] = []
    }
    initFaces[channel] = []
    initFaces[channel] = faces[1]
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
    let faceCenterX = (faceVerticeA['x'] + faceVerticeB['x'] + faceVerticeC['x']) / 3
    let faceCenterY = (faceVerticeA['y'] + faceVerticeB['y'] + faceVerticeC['y']) / 3
    let faceCenterZ = (faceVerticeA['z'] + faceVerticeB['z'] + faceVerticeC['z']) / 3
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

    if (allFaces[channel].length > 250) {
      allFaces[channel].shift()
    }

    if (typeof geoMap[channel] !== 'undefined') {
      for (let i = 0; i < geoMap[channel].length; i++) {
        geoMap[channel][i].material.dispose()
        geoMap[channel][i].geometry.dispose()
        scene.remove(geoMap[channel][i])
      }
    }

    if (typeof pointsMap[channel] !== 'undefined') {
      for (let i = 0; i < pointsMap[channel].length; i++) {
        pointsMap[channel][i].material.dispose()
        pointsMap[channel][i].geometry.dispose()
        scene.remove(pointsMap[channel][i])
      }
    }

    let geometry = new THREE.Geometry()
    geometry.vertices = allVertices[channel]
    geometry.faces = allFaces[channel]
    geometry.computeFaceNormals()

    let objectMeshes = []
    let objectPoints = []

    objectMeshes[0] = new THREE.Mesh(geometry, materials[channel])
    objectMeshes[0].frustumCulled = false

    objectPoints[0] = new THREE.Points(geometry, pointMaterial)

    scene.add(objectMeshes[0])
    scene.add(objectPoints[0])

    objectMeshes[1] = objectMeshes[0].clone()
    objectMeshes[1].scale.x = -1

    objectPoints[1] = objectPoints[0].clone()
    objectPoints[1].scale.x = -1

    scene.add(objectMeshes[1])
    scene.add(objectPoints[1])

    if (symmetryLevels > 2) {
      objectMeshes[2] = objectMeshes[0].clone()
      objectMeshes[2].scale.y = -1

      objectPoints[2] = objectPoints[0].clone()
      objectPoints[2].scale.y = -1

      scene.add(objectMeshes[2])
      scene.add(objectPoints[2])
    }

    if (symmetryLevels > 3) {
      objectMeshes[3] = objectMeshes[0].clone()
      objectMeshes[3].scale.y = -1
      objectMeshes[3].scale.x = -1

      objectPoints[3] = objectPoints[0].clone()
      objectPoints[3].scale.y = -1
      objectPoints[3].scale.x = -1

      scene.add(objectMeshes[3])
      scene.add(objectPoints[3])
    }

    if (typeof geoMap[channel] === 'undefined') {
      geoMap[channel] = []
    }
    geoMap[channel] = objectMeshes

    if (typeof pointsMap[channel] === 'undefined') {
      pointsMap[channel] = []
    }
    pointsMap[channel] = objectPoints

    let growthPoint = Math.ceil(movementRate * 0.045)

    if (growthPoint > 15) {
      growthPoint = 15
    }

    if (currentFrame !== 0 && currentFrame % growthPoint === 0) {
      if (typeof choose[channel] === 'undefined') {
        choose[channel] = []
      }

      if (typeof choose[channel][currentFrame] === 'undefined') {
        choose[channel][currentFrame] = Math.ceil((Math.random() * allFaces[channel].length - 1) * 0.5)
      }

      let newFace = allFaces[channel][allFaces[channel].length - choose[channel][currentFrame]]

      if (typeof newFace === 'undefined') {
        initFaces[channel] = allFaces[channel][allFaces[channel].length - 1]
      } else {
        initFaces[channel] = newFace
      }

      if (typeof notResetCount[channel] === 'undefined') {
        notResetCount[channel] = 0
      }

      // restart
      if (notResetCount[channel] > notResetThreshold) {
        notResetCount[channel] = 0
        createInitialShape(channel)
      } else {
        if (choose[channel][currentFrame] % 20 === 0) {
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
    movementRate += 0.2

    currentFrame++

    controls.update()

    if (sound.isPlaying) {
      if (!started) {
        started = true
        loader.classList.toggle('hide')
      }

      freqData = analyser.getFrequencyData()
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
