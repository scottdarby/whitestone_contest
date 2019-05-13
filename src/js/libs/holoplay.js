// Copyright 2017-2019 Looking Glass Factory Inc.
// All rights reserved.
// Unauthorized copying or distribution of this file, and the source code contained herein, is strictly prohibited.

function HoloPlay (scene, camera, renderer, focalPointVector, constantCenter, hiResRender) {
  var scope = this
  // This makes sure we don't try to render before initializing
  var initialized = false

  var interval
  var lastScreenX
  var lastScreenY
  var outOfWindow = false

  // private variables
  var _renderer, _scene, _camera
  var threeD
  var jsonObj

  // Stores the distance to the focal plane
  // Let's us change the rotation or position of the camera and still have it work
  // Change this in order to change the focus of the camera after runtime
  var holdCenter, cameraForward, viewScale, center

  // Quilt properties
  var tilesX, tilesY, numViews

  // Camera properties
  var viewCone, startNear, startFar

  // Render scenes
  var bufferMat, finalRenderScene, finalRenderCamera

  // Looking Glass buttons
  var buttons, buttonsLastFrame, buttonsAvailable
  var buttonNames = [ 'square', 'left', 'right', 'circle' ]

  // A public bool to indicate if you want to use buttons - set to "false" if not to save processing time
  this.useButtons = true

  var defaultCalibration = { 'configVersion': '1.0', 'serial': '00000', 'pitch': { 'value': 49.825218200683597 }, 'slope': { 'value': 5.2160325050354 }, 'center': { 'value': -0.23396748304367066 }, 'viewCone': { 'value': 40.0 }, 'invView': { 'value': 1.0 }, 'verticalAngle': { 'value': 0.0 }, 'DPI': { 'value': 338.0 }, 'screenW': { 'value': 2560.0 }, 'screenH': { 'value': 1600.0 }, 'flipImageX': { 'value': 0.0 }, 'flipImageY': { 'value': 0.0 }, 'flipSubp': { 'value': 0.0 } }

  function init () {
    doLoadEEPROM(true)
    threeD = true
    jsonObj = null

    if (hiResRender === undefined) {
      hiResRender = true
    }

    if (focalPointVector === undefined) {
      var vector = new THREE.Vector3()
      camera.getWorldDirection(vector) // Sets the vector to the camera forward

      viewScale = Math.max(camera.position.length(), 1) // Sets the focal distance to either the distance to center or just ahead of the camera
      // Because no center was provided in the constructor, it assumes that the center is 0,0,0
      center = new THREE.Vector3(0, 0, 0)

      vector.multiplyScalar(viewScale)
      focalPointVector = [camera.position.x + vector.x, camera.position.y + vector.y, camera.position.z + vector.z] // Sets the focal point to the front of the camera as far away as it is from (0,0,0)
    } else {
      if (focalPointVector instanceof THREE.Vector3) {
        focalPointVector = [focalPointVector.x, focalPointVector.y, focalPointVector.z]
      }
      center = new THREE.Vector3(focalPointVector[0], focalPointVector[1], focalPointVector[2])
      viewScale = Math.max(center.distanceTo(camera.position), 1) // Sets the focal distance to either the distance to center or just ahead of the camera
    }

    if (constantCenter === undefined) { constantCenter = true }

    _renderer = renderer
    _camera = camera
    _scene = scene

    // Locks the center to a fixed position if true, which is the default
    // Good for orbit controls, but should be false for things like first-person controls
    holdCenter = constantCenter

    cameraForward = new THREE.Vector3()
    camera.getWorldDirection(cameraForward)

    // Buffer scene
    var renderResolution = 2048
    tilesX = 4
    tilesY = 8
    if (hiResRender) {
      renderResolution = 4096
      tilesX = 5
      tilesY = 9
    }

    bufferSceneRender = new THREE.WebGLRenderTarget(renderResolution, renderResolution, { format: THREE.RGBFormat })

    // Capture settings
    numViews = tilesX * tilesY
    viewCone = 40

    startNear = camera.near
    startFar = camera.far

    // render texture dimensions
    var renderSizeX = renderResolution / tilesX
    var renderSizeY = renderResolution / tilesY

    // arraycamera
    var cameras = []

    for (var y = 0; y < tilesY; y++) {
      for (var x = 0; x < tilesX; x++) {
        var subcamera = new THREE.PerspectiveCamera()
        subcamera.viewport = new THREE.Vector4(x * renderSizeX, y * renderSizeY, renderSizeX, renderSizeY)
        cameras.push(subcamera)
      }
    }

    arraycamera = new THREE.ArrayCamera(cameras)

    // Init shader uniforms
    var uniforms =
        {
          quiltTexture: { value: bufferSceneRender.texture },
          pitch: { value: 0 },
          tilt: { value: 0 },
          center: { value: 0 },
          invView: { value: 0 },
          flipX: { value: 0 },
          flipY: { value: 0 },
          subp: { value: 0 },
          ri: { value: 0 },
          bi: { value: 2 },
          numViews: { value: 0 },
          tilesX: { value: 0 },
          tilesY: { value: 0 },
          windowInnerW: { value: 0 },
          windowInnerH: { value: 0 },
          windowOuterW: { value: 0 },
          windowOuterH: { value: 0 },
          windowInnerX: { value: 0 },
          windowInnerY: { value: 0 },
          windowOuterX: { value: 0 },
          windowOuterY: { value: 0 },
          screenW: { value: 0 },
          screenH: { value: 0 }
        }

    // Set up the shader
    var shaderProperties = {
      uniforms: uniforms,
      vertexShader: VertexShaderCode,
      fragmentShader: FragmentShaderCode
    }

    // Apply the shader to the buffer material
    bufferMat = new THREE.ShaderMaterial(shaderProperties)

    // Set up the final render scene
    finalRenderScene = new THREE.Scene()
    var renderPlaneGeometry = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight)

    var renderPlane = new THREE.Mesh(renderPlaneGeometry, bufferMat)
    finalRenderScene.add(renderPlane)

    finalRenderCamera = new THREE.OrthographicCamera(-window.innerWidth / 2, window.innerWidth / 2, window.innerHeight / 2, -window.innerHeight / 2, 1, 3)
    finalRenderCamera.position.z = 2
    finalRenderScene.add(finalRenderCamera)

    buttonsLastFrame = [ false, false, false, false ]

    // Add the user buttons
    setupFullScreen()
  };

  //* *****HTML SETUP******//

  // Create the dom element for the fullscreen button
  function makeFullScreenButton () {
    var newHTML =
            '<input type="button" style="margin:20px; position:fixed; top:0px; right:0px; z-index: 10000; height:50px; width:150px;" id="fullscreenButton" value="Enter Full Screen Mode"/>'

    var buttonDiv = document.createElement('div')

    buttonDiv.innerHTML = newHTML

    buttonDiv.setAttribute('id', 'fullscreen')

    document.body.appendChild(buttonDiv)
  };

  // Adding the functionality for the fullscreen button
  function setupFullScreen () {
    makeFullScreenButton()

    document.getElementById('fullscreen').addEventListener('click', function () {
      if (_renderer.domElement.requestFullscreen) {
        _renderer.domElement.requestFullscreen()
      } else if (_renderer.domElement.mozRequestFullScreen) {
        _renderer.domElement.mozRequestFullScreen()
      } else if (_renderer.domElement.webkitRequestFullscreen) {
        _renderer.domElement.webkitRequestFullscreen()
      } else if (_renderer.msRequestFullscreen) {
        _renderer.domElement.msRequestFullscreen()
      }
    })
  };

  //* *****CALIBRATION SETUP******//

  function applyCalibration (calibration_obj) {
    if (calibration_obj === undefined || calibration_obj === '') {
      jsonObj = defaultCalibration
      alert('No Looking Glass display connected; using default calibration data. Please ensure your Looking Glass is connected to your computer via USB and reload the page.')
    } else {
      jsonObj = JSON.parse(calibration_obj)
    }
    setShaderValues(jsonObj.DPI.value, jsonObj.pitch.value, jsonObj.slope.value, jsonObj.screenH.value, jsonObj.screenW.value, jsonObj.center.value, jsonObj.flipImageX.value, jsonObj.flipImageY.value)
    viewCone = jsonObj.viewCone.value
  }

  function saveCalibration (calibration_obj) {
    console.log('Calibration in local storage overwritten.')
    localStorage['Config'] = calibration_obj
  }

  function doLoadEEPROM (inInit) {
    var OSName = 'Unknown OS'
    if (navigator.appVersion.indexOf('Win') != -1) OSName = 'Windows'
    if (navigator.appVersion.indexOf('Mac') != -1) OSName = 'MacOS'
    if (navigator.appVersion.indexOf('X11') != -1) OSName = 'UNIX'
    if (navigator.appVersion.indexOf('Linux') != -1) OSName = 'Linux'

    var ws = new WebSocket('ws://localhost:11222/')
    var finished = function () {
      ws.close()
    }
    var timeout = setTimeout(function () {
      var errstr = 'Calibration not found in internal memory.'
      if (inInit) {
        console.log(errstr)
      } else {
        alert(errstr)
      }
      finished()
    }, 800)
    ws.onmessage = function (event) {
      console.log('New calibration loaded from internal memory.')
      saveCalibration(event.data)
      applyCalibration(event.data)
      clearTimeout(timeout)
      initialized = true
      finished()
    }
    ws.onerror = function (event) {
      if (confirm('Three.js driver not detected! Click OK to download. If you have already installed the driver, please make sure port 11222 is open.')) {
        if (OSName == 'Windows') {
				    window.location.href = 'http://look.glass/threejsdriver_win'
        } else if (OSName == 'MacOS') {
          window.location.href = 'http://look.glass/threejsdriver_mac'
        } else {
          alert('Only Windows and OSX operating systems are currently supported for the Three.js library.')
        }
      }
      finished()
    }
  }

  //* ******SHADER SETUP******//

  function setShaderValues (dpi, pitch, slope, screenH, screenW, center, flipX, flipY, invView) {
    //        var screenInches = screenW / dpi;
    var screenInches = window.innerWidth / dpi
    var newPitch = pitch * screenInches

    // account for tilt in measuring pitch horizontally
    newPitch *= Math.cos(Math.atan(1.0 / slope))
    bufferMat.uniforms.pitch.value = newPitch

    // tilt
    var newTilt = window.innerHeight / (window.innerWidth * slope)
    if (flipX == 1) { newTilt *= -1 }
    bufferMat.uniforms.tilt.value = newTilt

    // center
    // I need the relationship between the amount of pixels I have moved over to the amount of lenticulars I have jumped
    // ie how many pixels are there to a lenticular?
    bufferMat.uniforms.center.value = center

    var boundingRect = document.body.getBoundingClientRect()
    var xOffsetInner = document.body.getBoundingClientRect().left
    var yOffsetInner = document.body.getBoundingClientRect().top

    // screen and window values to offset the image
    bufferMat.uniforms.screenW.value = screenW
    bufferMat.uniforms.screenH.value = screenH
    bufferMat.uniforms.windowInnerW.value = boundingRect.width
    bufferMat.uniforms.windowInnerH.value = boundingRect.height
    bufferMat.uniforms.windowOuterW.value = window.outerWidth
    bufferMat.uniforms.windowOuterH.value = window.outerHeight
    bufferMat.uniforms.windowInnerX.value = window.screenX + boundingRect.left
    bufferMat.uniforms.windowInnerY.value = window.screenY + boundingRect.top + (window.outerHeight - window.innerHeight)
    bufferMat.uniforms.windowOuterX.value = window.screenX
    bufferMat.uniforms.windowOuterY.value = window.screenY

    // should we invert?
    bufferMat.uniforms.invView.value = invView

    // Should we flip it for peppers?
    bufferMat.uniforms.flipX.value = flipX
    bufferMat.uniforms.flipY.value = flipY

    bufferMat.uniforms.subp.value = 1 / (screenW * 3)

    // tiles
    bufferMat.uniforms.tilesX.value = tilesX
    bufferMat.uniforms.tilesY.value = tilesY

    bufferMat.needsUpdate = true
  };

  //* ******LOGIC FOR CAPTURING MULTIPLE VIEWS******//

  // Render the different views
  function captureViews (scene, camera) {
    var origPosition = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z)
    var start = -viewCone / 2
    var end = viewCone / 2
    var distance = center.distanceTo(camera.position)
    var size = 2 * distance * Math.tan(0.5 * THREE.Math.degToRad(camera.fov))

    arraycamera.copy(camera)

    for (var i = 0; i < numViews; i++) {
      var subcamera = arraycamera.cameras[ i ]
      subcamera.position.copy(origPosition)
      subcamera.rotation.copy(camera.rotation)

      var radians = THREE.Math.degToRad(THREE.Math.lerp(start, end, i / (numViews - 1)))

      // angle needs to be in radians
      var offsetX = distance * Math.tan(radians)

      // Get the right direction
      var tempRight = new THREE.Vector3(camera.right.x * offsetX, camera.right.y * offsetX, camera.right.z * offsetX)

      subcamera.position.add(tempRight)
      subcamera.updateMatrixWorld()

      subcamera.projectionMatrix.copy(camera.projectionMatrix)
      subcamera.projectionMatrix.elements[8] = -2 * offsetX / (size * camera.aspect)
    }

    renderer.setRenderTarget(bufferSceneRender)
    renderer.render(scene, arraycamera)
  };

  HoloPlay.prototype.lookAt = function (target, camera) {
    if (target instanceof THREE.Vector3) {
      center = target
      console.log(_camera)
      if (camera === undefined) {
        camera = _camera
      }
      camera.lookAt(target)
    } else if (target instanceof THREE.Object3D) {
      center = target.position
      if (camera === undefined) {
        camera = _camera
      }
      camera.lookAt(target)
    } else {
      console.logWarning('Target must be a THREE.Vector3.')
    }
  }

  // Render loop, with options for 3D or 2D rendering
  HoloPlay.prototype.render = function (scene, camera, renderer) {
    if (!initialized) { return }

    if (buttonsAvailable && scope.useButtons) {
      var gp = navigator.getGamepads()
      for (var i = 0; i < gp.length; i++) {
        if (gp[i] != null && gp[i].id.indexOf('HoloPlay') > -1) {
          buttons = gp[i].buttons
          break
        }
      }

      for (var i = 0; i < buttons.length; i++) {
        if (buttonsLastFrame === undefined && !buttons[i].pressed) {
          continue
        }

        if (buttonsLastFrame === undefined && buttons[i].pressed) {
          buttonDown.index = i
          buttonDown.name = buttonNames[i]
          document.dispatchEvent(buttonDown)
        } else if (!buttonsLastFrame[i] && buttons[i].pressed) {
          buttonDown.index = i
          buttonDown.name = buttonNames[i]
          document.dispatchEvent(buttonDown)
        } else if (buttonsLastFrame[i] && buttons[i].pressed) {
          buttonPressed.index = i
          buttonPressed.name = buttonNames[i]
          document.dispatchEvent(buttonPressed)
        } else if (buttonsLastFrame[i] && !buttons[i].pressed) {
          buttonUp.index = i
          buttonUp.name = buttonNames[i]
          document.dispatchEvent(buttonUp)
        }

        buttonsLastFrame[i] = buttons[i].pressed
      }
    }

    if (scene === undefined) { scene = _scene }
    if (camera === undefined) { camera = _camera }
    if (renderer === undefined) { renderer = _renderer }

    if (!threeD) {
      if (camera.projectionMatrix.elements[8] != 0) { camera.projectionMatrix.elements[8] = 0 }
      renderer.setRenderTarget(null)
      renderer.render(scene, camera)
    } else {
      if (jsonObj == null) {
        alert('No calibration found! Please ensure that your Looking Glass is plugged in.')
        return
      }

      if (outOfWindow) {
        if (lastScreenX != window.screenX || lastScreenY != window.screenY) {
          setShaderValues(jsonObj.DPI.value, jsonObj.pitch.value, jsonObj.slope.value, jsonObj.screenH.value, jsonObj.screenW.value, jsonObj.center.value, jsonObj.flipImageX.value, jsonObj.flipImageY.value, jsonObj.invView.value)
        }
        lastScreenX = window.screenX
        lastScreenY = window.screenY
      }

      var worldRight = new THREE.Vector3(1, 0, 0)
      camera.right = worldRight.applyQuaternion(camera.quaternion)
      if (holdCenter === false) {
        camera.getWorldDirection(cameraForward)
        cameraForward.multiplyScalar(viewScale)

        center.addVectors(camera.position, cameraForward)
      } else {
        var dist = camera.position.distanceTo(center)
        camera.near = startNear * dist / viewScale
        camera.far = startFar * dist / viewScale
        camera.updateProjectionMatrix()
      }

      captureViews(scene, camera)

      renderer.setRenderTarget(null)
      renderer.render(finalRenderScene, finalRenderCamera)
    }
  }

  //* ****EVENT LISTENERS*****//
  function addEvent (obj, evt, fn) {
    if (obj.addEventListener) {
      obj.addEventListener(evt, fn, false)
    } else if (obj.attachEvent) {
      obj.attachEvent('on' + evt, fn)
    }
  };

  // Custom Looking Glass button events
  var buttonDown = new CustomEvent('buttonDown', { bubbles: true, cancelable: false, name: 'none', index: -1 })
  var buttonPressed = new CustomEvent('buttonPressed', { bubbles: true, cancelable: false, name: 'none', index: -1 })
  var buttonUp = new CustomEvent('buttonUp', { bubbles: true, cancelable: false, name: 'none', index: -1 })

  addEvent(window, 'gamepadconnected', function (e) {
    var gp = navigator.getGamepads()[e.gamepad.index]
    console.log('Gamepad connected at index %d: %s. %d buttons, %d axes.',
      gp.index, gp.id,
      gp.buttons.length, gp.axes.length)
    if (gp.id.indexOf('HoloPlay') > -1) {
      buttonsAvailable = true
    }
  })

  addEvent(document, 'mouseout', function (e) {
    e = e || window.event
    var from = e.relatedTarget || e.toElement
    if (!from || from.nodeName == 'HTML') {
      if (!outOfWindow) {
        outOfWindow = true
      }
    }
  })

  addEvent(document, 'mouseover', function (e) {
    e = e || window.event
    var from = e.relatedTarget || e.toElement
    if (from != 'HTML') {
      if (outOfWindow) {
        outOfWindow = false
      }
    }
  })

  // Reset shader values on window resize to make it draw properly
  addEvent(window, 'resize', function (e) {
    e = e || window.event
    setShaderValues(jsonObj.DPI.value, jsonObj.pitch.value, jsonObj.slope.value, jsonObj.screenH.value, jsonObj.screenW.value, jsonObj.center.value, jsonObj.flipImageX.value, jsonObj.flipImageY.value, jsonObj.invView.value)
  })

  // Forward Slash for switching between 2D and 3D
  addEvent(document, 'keydown', function (e) {
    e = e || window.event
    if (e.keyCode === 220) {
      threeD = !threeD
    }
  })

  // SHADER CODE
  var VertexShaderCode =
        'varying vec2 iUv;' +

        'void main() {' +
            'iUv = uv;' +
            'vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);' +
            'gl_Position = projectionMatrix * modelViewPosition;' +
        '}'

  // Not all uniforms are used, some are intended for future features
  var FragmentShaderCode =
        'uniform sampler2D quiltTexture;' +
        'uniform float pitch;' +
        'uniform float tilt;' +
        'uniform float center;' +
        'uniform float invView;' +
        'uniform float flipX;' +
        'uniform float flipY;' +
        'uniform float subp;' +
        'uniform float tilesX;' +
        'uniform float tilesY;' +
        'uniform float windowInnerW;' +
        'uniform float windowInnerH;' +
        'uniform float windowOuterW;' +
        'uniform float windowOuterH;' +
        'uniform float windowInnerX;' +
        'uniform float windowInnerY;' +
        'uniform float windowOuterX;' +
        'uniform float windowOuterY;' +
        'uniform float screenW;' +
        'uniform float screenH;' +
        'varying vec2 iUv;' +

        'vec2 texArr(vec3 uvz) {' +
            'float z = floor(uvz.z * tilesX * tilesY);' +
            'float x = (mod(z, tilesX) + uvz.x) / tilesX;' +
            'float y = (floor(z / tilesX) + uvz.y) / tilesY;' +
            'return vec2(x, y);' +
        '}' +

        'float Remap(float value, float from1, float to1, float from2, float to2){' +
           'return (value - from1) / (to1 - from1) * (to2 - from2) + from2;' +
        '}' +

        'void main()' +
        '{' +
            'vec4 rgb[3];' +
            'vec3 nuv = vec3(iUv.xy, 0.0);' +

            // Flip UVs if necessary
            'nuv.x = (1.0 - flipX) * nuv.x + flipX * (1.0 - nuv.x);' +
            'nuv.y = (1.0 - flipY) * nuv.y + flipY * (1.0 - nuv.y);' +

            'for (int i = 0; i < 3; i++) {' +
                'nuv.z = (iUv.x + float(i) * subp + iUv.y * tilt) * pitch - center;' +
                'nuv.z = mod(nuv.z + ceil(abs(nuv.z)), 1.0);' +
                'nuv.z = (1.0 - invView) * nuv.z + invView * (1.0 - nuv.z);' +
                'rgb[i] = texture2D(quiltTexture, texArr(vec3(iUv.x, iUv.y, nuv.z)));' +
            '}' +

            'gl_FragColor = vec4(rgb[0].r, rgb[1].g, rgb[2].b, 1);' +
        '}'

  // Call our initialization function once all our values are set
  init()
}
