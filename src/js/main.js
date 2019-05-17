import * as THREE from 'three'
import TWEEN from 'tween.js'
import OrbitConstructor from 'three-orbit-controls'
const OrbitControls = OrbitConstructor(THREE)
const glslify = require('glslify');

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
  let pointMaterials = []
  const channelCount = 12
  let verticeCount = []
  let allVertices = []
  let bufferSize = 1000
  let initVerticeArray = [
    0, 0, 0,
    0, 0, 0.001,
    0, 0.001, 0.001
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
  let started = false
  let clock = new THREE.Clock(false)

  let cameraAnimating = false
  let camMovementTriggered = false
  let defaultCamEasing = TWEEN.Easing.Quadratic.InOut
  let camMoveTween
  let userInteracting = false

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

  function mousedown () {
    userInteracting = true
    userInteraction()
  }

  function touchstart () {
    userInteracting = true
    userInteraction()
  }

  function mouseup () {
    userInteracting = false
    userInteraction()
  }

  function touchend () {
    userInteracting = false
    userInteraction()
  }

  function userInteraction () {
    camMovementTriggered = false
    cameraAnimating = false
    if (camMoveTween) {
      camMoveTween.stop()
    }
  }

  function init () {
    clock.start()

    currentFrame = 0
    movementRate = 0

    renderer = new THREE.WebGLRenderer({
      antialias: true
    })

    // renderer.autoClear = false

    // renderer.toneMapping = THREE.ACESFilmicToneMapping
    // renderer.toneMappingExposure = 0.5

    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)

    scene = new THREE.Scene()

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 300)
    camera.position.set(0, 0, 1.8)
    scene.add(camera)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.minDistance = 1.5
    controls.maxDistance = 200
    controls.enablePan = false
    controls.zoomSpeed = 0.7
    controls.rotateSpeed = 0.04
    controls.enableDamping = true
    controls.dampingFactor = 0.04

    let listener = new THREE.AudioListener()

    sound = new THREE.Audio(listener)
    let audioLoader = new THREE.AudioLoader()

    audioLoader.load('./audio/4walls.mp3', (buffer) => {
      sound.offset = 0
      sound.setBuffer(buffer)
      sound.setLoop(false)
      sound.setVolume(1)
      sound.play()
    })

    analyser = new THREE.AudioAnalyser(sound, 64)
    analyser.smoothingTimeConstant = 0.1

    document.addEventListener('mouseup', mouseup)
    document.addEventListener('mousedown', mousedown)
    renderer.domElement.addEventListener('wheel', userInteraction)
    document.addEventListener('touchstart', touchstart)
    document.addEventListener('touchend', touchend)

    let pointsUniforms = THREE.ShaderLib.points.uniforms

    pointsUniforms.uTime = {
      type: 'f',
      value: 0
    }

    pointsUniforms.uFreq = {
      type: 'f',
      value: 0
    }

    pointsUniforms.size.value = 40.0

    let shaderSource = THREE.ShaderLib['basic']

    for (let channel = 0; channel < channelCount; channel++) {
      colours[channel] = new THREE.Color(pallete[channel][0] / 255, pallete[channel][1] / 255, pallete[channel][2] / 255)

      let uniforms = THREE.UniformsUtils.clone(shaderSource.uniforms)

      uniforms.uTime = {
        type: 'f',
        value: 0
      }

      uniforms.uFreq = {
        type: 'f',
        value: 0
      }

      uniforms.diffuse.value = colours[channel]
      uniforms.opacity.value = 0.2

      materials[channel] = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: glslify('./glsl/tetra.vert'),
        fragmentShader: glslify('./glsl/tetra.frag'),
        transparent: true,
        wireframe: true,
        blending: THREE.AdditiveBlending
      })

      pointMaterials[channel] = new THREE.ShaderMaterial({
        uniforms: pointsUniforms,
        vertexShader: glslify('./glsl/points.vert'),
        fragmentShader: glslify('./glsl/points.frag'),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false
      })

      createInitialShape(channel, true)
    }

    window.addEventListener('resize', onWindowResize, false)
  }

  function animateCamPos () {
    if (camMovementTriggered !== false) {
      return
    }

    if (userInteracting) {
      return
    }

    let animTime = 5000 + Math.random() * 30000

    cameraAnimating = true

    camMovementTriggered = true

    let to = new THREE.Vector3(0, Math.max(Math.random() * 4, 1.5), Math.max(Math.random() * 3, 1.5))

    camMoveTween = new TWEEN.Tween(camera.position)
      .to(to, animTime)
      .onUpdate(function () {
        camera.position.set(this.x, this.y, this.z)
        camera.lookAt(new THREE.Vector3(0, 0, 0))
      })
      .onComplete(() => {
        camMovementTriggered = false
        cameraAnimating = false
      })
      .easing(defaultCamEasing)
      .start()
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
    if (firstRun) {
      allVertices[channel] = new Float32Array(bufferSize * 3)

      for (let i = 0; i < initVerticeArray.length; i++) {
        allVertices[channel][i] = initVerticeArray[i]
      }

      geometry = new THREE.BufferGeometry()

      let position = new THREE.BufferAttribute(allVertices[channel], 3)

      geometry.addAttribute('position', position)

      objectMeshes1[channel] = new THREE.Mesh(geometry, materials[channel])
      objectMeshes1[channel].frustumCulled = false
      scene.add(objectMeshes1[channel])

      objectPoints1[channel] = new THREE.Points(geometry, pointMaterials[channel])
      objectPoints1[channel].frustumCulled = false
      scene.add(objectPoints1[channel])

      objectMeshes2[channel] = new THREE.Mesh(geometry, materials[channel])
      objectMeshes2[channel].frustumCulled = false
      objectMeshes2[channel].scale.x = -1
      scene.add(objectMeshes2[channel])

      objectPoints2[channel] = new THREE.Points(geometry, pointMaterials[channel])
      objectPoints2[channel].frustumCulled = false
      objectPoints2[channel].scale.x = -1
      scene.add(objectPoints2[channel])

      objectMeshes3[channel] = new THREE.Mesh(geometry, materials[channel])
      objectMeshes3[channel].frustumCulled = false
      objectMeshes3[channel].scale.y = -1
      scene.add(objectMeshes3[channel])

      objectPoints3[channel] = new THREE.Points(geometry, pointMaterials[channel])
      objectPoints3[channel].frustumCulled = false
      objectPoints3[channel].scale.y = -1
      scene.add(objectPoints3[channel])

      objectMeshes4[channel] = new THREE.Mesh(geometry, materials[channel])
      objectMeshes4[channel].frustumCulled = false
      objectMeshes4[channel].scale.x = -1
      objectMeshes4[channel].scale.y = -1
      scene.add(objectMeshes4[channel])

      objectPoints4[channel] = new THREE.Points(geometry, pointMaterials[channel])
      objectPoints4[channel].frustumCulled = false
      objectPoints4[channel].scale.x = -1
      objectPoints4[channel].scale.y = -1
      scene.add(objectPoints4[channel])
    }

    initFaces[channel] = [
      0, 1, 2,
      3, 4, 5,
      6, 7, 8,
      9, 10, 11,
      12, 13, 14,
      15, 16, 17,
      18, 19, 20,
      21, 22, 23,
      24, 25, 26
    ]

    verticeCount[channel] = 27
  }

  function grow (currentFace, channel) {
    if (typeof freqData[channel] === 'undefined') {
      return
    }

    let growthFactor

    switch (channel) {
      case 10:
        growthFactor = Math.pow(freqData[channel + 2], 2) * 0.000003
        break
      case 11:
        growthFactor = Math.pow(freqData[channel + 2], 2) * 0.000003
        break
      case 12:
        growthFactor = Math.pow(freqData[channel + 2], 2) * 0.000003
        break
      case 13:
        growthFactor = Math.pow(freqData[channel + 2], 2) * 0.000003
        break
      case 14:
        growthFactor = Math.pow(freqData[channel + 2], 2) * 0.000003
        break
      case 15:
        growthFactor = Math.pow(freqData[channel + 2], 2) * 0.000003
        break
      default:
        growthFactor = Math.pow(freqData[channel + 2], 2) * 0.000001
        break
    }

    // get center point of face
    let faceVerticeA = new THREE.Vector3(
      allVertices[channel][currentFace[0]],
      allVertices[channel][currentFace[1]],
      allVertices[channel][currentFace[2]]
    )

    let faceVerticeB = new THREE.Vector3(
      allVertices[channel][currentFace[3]],
      allVertices[channel][currentFace[4]],
      allVertices[channel][currentFace[5]]
    )

    let faceVerticeC = new THREE.Vector3(
      allVertices[channel][currentFace[6]],
      allVertices[channel][currentFace[7]],
      allVertices[channel][currentFace[8]]
    )

    let faceCenterX = (faceVerticeA.x + faceVerticeB.x + faceVerticeC.x) * 0.3333333333333333
    let faceCenterY = (faceVerticeA.y + faceVerticeB.y + faceVerticeC.y) * 0.3333333333333333
    let faceCenterZ = (faceVerticeA.z + faceVerticeB.z + faceVerticeC.z) * 0.3333333333333333

    let centerFaceVertice = new THREE.Vector3(faceCenterX, faceCenterY, faceCenterZ)

    // get face normal
    let cb = new THREE.Vector3()
    let ab = new THREE.Vector3()
    cb.subVectors(faceVerticeC, faceVerticeB)
    ab.subVectors(faceVerticeA, faceVerticeB)
    cb.cross(ab)
    cb.normalize()

    centerFaceVertice.add(cb.multiplyScalar(growthFactor))

    allVertices[channel][verticeCount[channel] - 18] = faceVerticeA.x
    allVertices[channel][verticeCount[channel] - 17] = faceVerticeA.y
    allVertices[channel][verticeCount[channel] - 16] = faceVerticeA.z

    allVertices[channel][verticeCount[channel] - 15] = faceVerticeC.x
    allVertices[channel][verticeCount[channel] - 14] = faceVerticeC.y
    allVertices[channel][verticeCount[channel] - 13] = faceVerticeC.z

    allVertices[channel][verticeCount[channel] - 12] = centerFaceVertice.x
    allVertices[channel][verticeCount[channel] - 11] = centerFaceVertice.y
    allVertices[channel][verticeCount[channel] - 10] = centerFaceVertice.z

    // --

    allVertices[channel][verticeCount[channel] - 9] = faceVerticeA.x
    allVertices[channel][verticeCount[channel] - 8] = faceVerticeA.y
    allVertices[channel][verticeCount[channel] - 7] = faceVerticeA.z

    allVertices[channel][verticeCount[channel] - 6] = faceVerticeB.x
    allVertices[channel][verticeCount[channel] - 5] = faceVerticeB.y
    allVertices[channel][verticeCount[channel] - 4] = faceVerticeB.z

    allVertices[channel][verticeCount[channel] - 3] = centerFaceVertice.x
    allVertices[channel][verticeCount[channel] - 2] = centerFaceVertice.y
    allVertices[channel][verticeCount[channel] - 1] = centerFaceVertice.z

    // --

    allVertices[channel][verticeCount[channel] + 0] = faceVerticeB.x
    allVertices[channel][verticeCount[channel] + 1] = faceVerticeB.y
    allVertices[channel][verticeCount[channel] + 2] = faceVerticeB.z

    allVertices[channel][verticeCount[channel] + 3] = faceVerticeC.x
    allVertices[channel][verticeCount[channel] + 4] = faceVerticeC.y
    allVertices[channel][verticeCount[channel] + 5] = faceVerticeC.z

    allVertices[channel][verticeCount[channel] + 6] = centerFaceVertice.x
    allVertices[channel][verticeCount[channel] + 7] = centerFaceVertice.y
    allVertices[channel][verticeCount[channel] + 8] = centerFaceVertice.z

    if (verticeCount[channel] + 9 > bufferSize * 3) {
      verticeCount[channel] = 27
    } else {
      verticeCount[channel] += 9
    }

    objectMeshes1[channel].geometry.setDrawRange(0, verticeCount[channel] * 0.33333333)

    objectMeshes1[channel].geometry.attributes.position.needsUpdate = true

    let growthPoint = (Math.ceil(movementRate * 0.045)) + 4

    if (growthPoint > 20) {
      growthPoint = 20
    }

    if (currentFrame !== 0 && currentFrame % growthPoint === 0) {
      if (typeof choose[channel] === 'undefined') {
        choose[channel] = []
      }

      choose[channel] = verticeCount[channel] - ((Math.round(Math.random() * (verticeCount[channel] * 0.05)))) * 9
      initFaces[channel] = [
        choose[channel] + 0, choose[channel] + 1, choose[channel] + 2,
        choose[channel] + 3, choose[channel] + 4, choose[channel] + 5,
        choose[channel] + 6, choose[channel] + 7, choose[channel] + 8
      ]

      if (typeof notResetCount[channel] === 'undefined') {
        notResetCount[channel] = 0
      }

      // restart
      if (notResetCount[channel] > notResetThreshold) {
        notResetCount[channel] = 0
        createInitialShape(channel)
      } else {
        if (choose[channel] % 20 === 0) {
          notResetCount[channel] = 0
          createInitialShape(channel)
        } else {
          notResetCount[channel]++
        }
      }
    } else {
      initFaces[channel] = [
        verticeCount[channel] - 9, verticeCount[channel] - 8, verticeCount[channel] - 7,
        verticeCount[channel] - 6, verticeCount[channel] - 5, verticeCount[channel] - 4,
        verticeCount[channel] - 3, verticeCount[channel] - 2, verticeCount[channel] - 1
      ]
    }
  }

  function animate () {
    window.requestAnimationFrame(animate)

    movementRate += clock.getDelta()
    currentFrame++

    if (!cameraAnimating) {
      controls.update()
    }

    TWEEN.update()

    if (sound.isPlaying) {
      if (!started) {
        started = true
        loader.classList.toggle('hide')
      }

      freqData = analyser.getFrequencyData()

      for (let channel = 0; channel < channelCount; channel++) {
        switch (channel) {
          case 0:
            materials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.0000000000000000000000005
            pointMaterials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.0000000000000000000000005
            break
          case 1:
            materials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.000000000000000000000001
            pointMaterials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.000000000000000000000001
            break
          case 2:
            materials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.00000000000000000000001
            pointMaterials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.00000000000000000000001
            break
          case 3:
            materials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.00000000000000000000001
            pointMaterials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.00000000000000000000001
            break
          case 4:
            materials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.00000000000000000000001
            pointMaterials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.00000000000000000000001
            break
          case 5:
            materials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.00000000000000000000001
            pointMaterials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.00000000000000000000001
            break
          case 6:
            materials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.00000000000000000000001
            pointMaterials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.00000000000000000000001
            break
          case 7:
            materials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.00000000000000000000001
            pointMaterials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.00000000000000000000001
            break
          case 8:
            materials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.0000000000000000000001
            pointMaterials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.0000000000000000000001
            break
          case 9:
            materials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.0000000000000000000001
            pointMaterials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.0000000000000000000001
            break
          default:
            materials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.0000000000000000000001
            pointMaterials[channel].uniforms.uFreq.value = Math.pow(freqData[channel + 2], 10) * 0.0000000000000000000001
            break
        }

        if (Math.pow(freqData[2], 10) > 1000000000000000000000000) {
          animateCamPos()
        }

        materials[channel].uniforms.uTime.value = currentFrame
        pointMaterials[channel].uniforms.uTime.value = currentFrame

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
  }
})()
