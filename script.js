import * as THREE from 'https://esm.sh/three@0.150.1';
import { OrbitControls } from 'https://esm.sh/three@0.150.1/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://esm.sh/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import * as TWEEN from 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.esm.js';
import roomContent from './room-content.js';

document.addEventListener('DOMContentLoaded', () => {
  // Core elements
  const container = document.getElementById('three-container');
  if (!container) {
    console.error("Could not find #three-container element");
    return;
  }

  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e8f5e9');
  scene.fog = new THREE.FogExp2(0xe8f5e9, 0.005);

  // Camera setup
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(-50, 30, 80);
  camera.lookAt(0, 0, 0);

  // Renderer setup
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Controls setup
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 10;
  controls.maxDistance = 200;

  // Enhanced lighting system
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  // Main directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(50, 80, 30);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 200;
  directionalLight.shadow.camera.left = -50;
  directionalLight.shadow.camera.right = 50;
  directionalLight.shadow.camera.top = 50;
  directionalLight.shadow.camera.bottom = -50;
  scene.add(directionalLight);

  // Accent lights to enhance room colors
  const roomAccentLights = [
    { color: 0x4A90E2, position: [-20, 15, 20], intensity: 0.3 }, // Entry area
    { color: 0x50C878, position: [0, 15, 10], intensity: 0.3 },   // Reception
    { color: 0xE74C3C, position: [5, 15, -10], intensity: 0.4 },  // Emergency
    { color: 0x1ABC9C, position: [20, 15, 0], intensity: 0.3 },   // Treatment
  ];

  roomAccentLights.forEach(light => {
    const pointLight = new THREE.PointLight(light.color, light.intensity, 40);
    pointLight.position.set(light.position[0], light.position[1], light.position[2]);
    scene.add(pointLight);
  });

  // Soft fill light from below
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.2);
  fillLight.position.set(-30, -20, -30);
  scene.add(fillLight);

  // Global variables
  const roomCameras = new Map();
  const roomBoxes = new Map();
  const roomsByType = {
    entry: [], reception: [], triage: [], xray: [], emergency: [], treatment: [],
    cardiac: [], neurology: [], lab: [], urology: [], gastro: [], monitoring: [], discharge: []
  };
  
  let defaultCameraPos = new THREE.Vector3();
  let defaultCameraTarget = new THREE.Vector3();

  // Loading overlay
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) loadingOverlay.style.display = 'flex';

  // Model loading
  const loader = new GLTFLoader();
  loader.load('Starter Scene.glb', (gltf) => {
    const model = gltf.scene;
    
    // Define color schemes for different room types
    const roomColors = {
      entry: { primary: 0x4A90E2, secondary: 0x7BB3F0 },        // Blue - welcoming
      reception: { primary: 0x50C878, secondary: 0x7FD99A },     // Green - calming
      triage: { primary: 0xF39C12, secondary: 0xF5B041 },       // Orange - attention
      xray: { primary: 0x9B59B6, secondary: 0xBB8FCE },        // Purple - technology
      emergency: { primary: 0xE74C3C, secondary: 0xEC7063 },    // Red - urgency
      treatment: { primary: 0x1ABC9C, secondary: 0x48C9B0 },    // Teal - healing
      cardiac: { primary: 0xE91E63, secondary: 0xF06292 },      // Pink - heart
      neurology: { primary: 0x8E44AD, secondary: 0xA569BD },    // Deep purple - brain
      lab: { primary: 0x3498DB, secondary: 0x5DADE2 },          // Light blue - science
      urology: { primary: 0x2ECC71, secondary: 0x58D68D },      // Mint green
      gastro: { primary: 0xFF9800, secondary: 0xFFB74D },       // Amber
      monitoring: { primary: 0x795548, secondary: 0xA1887F },   // Brown - equipment
      discharge: { primary: 0x607D8B, secondary: 0x90A4AE }     // Blue grey - exit
    };

    // Define structural element colors
    const structuralColors = {
      floor: 0xF5F5F5,      // Light grey
      wall: 0xE8EAF0,       // Off white
      ceiling: 0xFFFFFF,    // White
      door: 0x8D6E63,       // Brown
      window: 0xB3E5FC,     // Light blue
      corridor: 0xECEFF1    // Very light grey
    };
    
    // Analyze model structure and group meshes by proximity for better room detection
    const meshClusters = [];
    const allMeshes = [];
    
    model.traverse((child) => {
      if (child.isMesh) {
        allMeshes.push(child);
      }
    });
    
    // Simple clustering based on proximity and naming
    allMeshes.forEach(mesh => {
      const name = mesh.name.toLowerCase();
      let roomType = null;
      let elementType = null;
      const { x, y, z } = mesh.position;

      // First detect by name patterns
      if (name.includes('entry') || name.includes('entrance') || name.includes('lobby')) {
        roomType = 'entry';
      } else if (name.includes('reception') || name.includes('desk') || name.includes('front')) {
        roomType = 'reception';
      } else if (name.includes('triage') || name.includes('assess')) {
        roomType = 'triage';
      } else if (name.includes('xray') || name.includes('x-ray') || name.includes('radiology')) {
        roomType = 'xray';
      } else if (name.includes('emergency') || name.includes('er') || name.includes('trauma')) {
        roomType = 'emergency';
      } else if (name.includes('treatment') || name.includes('procedure')) {
        roomType = 'treatment';
      } else if (name.includes('cardiac') || name.includes('cardio') || name.includes('heart')) {
        roomType = 'cardiac';
      } else if (name.includes('neuro') || name.includes('brain')) {
        roomType = 'neurology';
      } else if (name.includes('lab') || name.includes('laboratory')) {
        roomType = 'lab';
      } else if (name.includes('urology') || name.includes('kidney')) {
        roomType = 'urology';
      } else if (name.includes('gastro') || name.includes('digestive')) {
        roomType = 'gastro';
      } else if (name.includes('monitor') || name.includes('observation')) {
        roomType = 'monitoring';
      } else if (name.includes('discharge') || name.includes('exit')) {
        roomType = 'discharge';
      }
      
      // If no name match, use position-based detection with simplified regions
      if (!roomType) {
        if (x < -10 && y > 5) {
          roomType = 'entry';
        } else if (x > -10 && x < 10 && y > 5) {
          roomType = 'reception';
        } else if (x > 10 && y > 0) {
          roomType = 'triage';
        } else if (x < 0 && y < 0) {
          roomType = 'xray';
        } else if (x > 0 && y < -5) {
          roomType = 'emergency';
        } else if (x > 15) {
          roomType = 'treatment';
        }
      }

      // Detect structural elements
      if (name.includes('floor') || name.includes('ground')) {
        elementType = 'floor';
      } else if (name.includes('wall')) {
        elementType = 'wall';
      } else if (name.includes('ceiling') || name.includes('roof')) {
        elementType = 'ceiling';
      } else if (name.includes('door')) {
        elementType = 'door';
      } else if (name.includes('window')) {
        elementType = 'window';
      } else if (name.includes('corridor') || name.includes('hallway')) {
        elementType = 'corridor';
      }

      // Apply colors based on type
      if (elementType && structuralColors[elementType]) {
        // Apply structural colors
        mesh.material = new THREE.MeshStandardMaterial({
          color: structuralColors[elementType],
          roughness: elementType === 'floor' ? 0.8 : 0.6,
          metalness: elementType === 'door' ? 0.3 : 0.1
        });
      } else if (roomType && roomColors[roomType]) {
        // Apply room-specific colors
        const colorScheme = roomColors[roomType];
        const isSecondary = Math.random() > 0.7; // 30% chance for secondary color
        mesh.material = new THREE.MeshStandardMaterial({
          color: isSecondary ? colorScheme.secondary : colorScheme.primary,
          roughness: 0.7,
          metalness: 0.2,
          emissive: new THREE.Color(colorScheme.primary).multiplyScalar(0.05)
        });
      } else {
        // Default material for unclassified objects
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0xBDBDBD,
          roughness: 0.8,
          metalness: 0.1
        });
      }

      if (roomType && roomsByType[roomType]) {
        roomsByType[roomType].push(mesh);
      }

      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });

    // Create highlight boxes for each room type
    Object.keys(roomsByType).forEach(roomType => {
      const rooms = roomsByType[roomType];
      if (rooms.length > 0) {
        // Calculate combined bounding box for all room meshes
        const combinedBox = new THREE.Box3();
        rooms.forEach(room => combinedBox.expandByObject(room));
        
        const center = combinedBox.getCenter(new THREE.Vector3());
        const size = combinedBox.getSize(new THREE.Vector3());
        
        // Ensure minimum size for visibility
        const minSize = 2;
        const finalSize = {
          x: Math.max(size.x + 2, minSize),
          y: Math.max(size.y + 2, minSize),
          z: Math.max(size.z + 2, minSize)
        };
        
        // Create highlight box geometry
        const boxGeometry = new THREE.BoxGeometry(finalSize.x, finalSize.y, finalSize.z);
        const boxMaterial = new THREE.MeshBasicMaterial({
          color: 0xff5722,
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
          side: THREE.DoubleSide
        });
        const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
        boxMesh.position.copy(center);
        boxMesh.visible = false;
        boxMesh.name = `highlight-box-${roomType}`;
        
        // Add wireframe for better definition
        const wireframeGeometry = new THREE.EdgesGeometry(boxGeometry);
        const wireframeMaterial = new THREE.LineBasicMaterial({ 
          color: 0xff5722,
          linewidth: 2,
          transparent: true,
          opacity: 0.8
        });
        const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
        wireframe.visible = false;
        wireframe.name = `wireframe-${roomType}`;
        
        scene.add(boxMesh);
        scene.add(wireframe);
        roomBoxes.set(roomType, { box: boxMesh, wireframe: wireframe });

        // Calculate overall room center for camera positioning
        const overallBox = new THREE.Box3();
        rooms.forEach(room => overallBox.expandByObject(room));
        const overallCenter = overallBox.getCenter(new THREE.Vector3());
        const overallSize = overallBox.getSize(new THREE.Vector3());

        // Create room camera with better positioning
        const cameraPos = new THREE.Vector3(
          center.x + (finalSize.x * 0.8),
          center.y + Math.max(finalSize.y * 0.8, 8),
          center.z + (finalSize.z * 0.8)
        );
        roomCameras.set(roomType, {
          position: cameraPos,
          target: center,
          roomType: roomType
        });
      }
    });

    scene.add(model);

    // Calculate scene center and set default camera
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const cameraDistance = maxDim * 1.5;

    camera.position.set(center.x + cameraDistance, center.y + cameraDistance / 2, center.z + cameraDistance);
    defaultCameraPos.copy(camera.position);
    defaultCameraTarget.copy(center);
    controls.target.copy(center);
    controls.update();

    if (loadingOverlay) loadingOverlay.style.display = 'none';
  });

  // Event listeners
  const conditionSelect = document.getElementById('conditionSelect');
  if (conditionSelect) {
    conditionSelect.addEventListener('change', (event) => {
      highlightPatientRooms(event.target.value);
    });
  }

  const helpBtn = document.getElementById('helpBtn');
  if (helpBtn) {
    helpBtn.addEventListener('click', showKeyboardShortcuts);
  }

  // Color legend toggle
  const colorLegend = document.getElementById('colorLegend');
  if (colorLegend) {
    colorLegend.addEventListener('click', () => {
      colorLegend.classList.toggle('collapsed');
    });
  }

  // Room highlighting function
  function highlightPatientRooms(condition) {
    resetHighlightBoxes();

    const roomSelectionPanel = document.getElementById('roomSelectionPanel');
    
    if (!condition || condition === 'default') {
      if (roomSelectionPanel) roomSelectionPanel.classList.remove('visible');
      resetToDefaultView();
      updateConditionInfo('default');
      return;
    }

    const roomSequences = {
      broken_bone: ['entry', 'reception', 'triage', 'xray', 'treatment', 'discharge'],
      chest_pain: ['entry', 'reception', 'triage', 'emergency', 'cardiac', 'monitoring', 'discharge'],
      head_injury: ['entry', 'reception', 'triage', 'xray', 'neurology', 'monitoring', 'discharge'],
      kidney_infection: ['entry', 'reception', 'triage', 'lab', 'urology', 'treatment', 'discharge'],
      abdominal_pain: ['entry', 'reception', 'triage', 'lab', 'gastro', 'treatment', 'discharge']
    };

    const sequence = roomSequences[condition];
    if (!sequence) return;

    // Highlight rooms and create labels
    sequence.forEach((roomType, index) => {
      const roomElements = roomBoxes.get(roomType);
      if (roomElements) {
        roomElements.box.visible = true;
        roomElements.wireframe.visible = true;
        
        createRoomLabel(roomType, index + 1, roomElements.box.position);
      }
    });

    populateRoomSelectionPanel(sequence);
    updateConditionInfo(condition);
  }

  // Reset functions
  function resetHighlightBoxes() {
    roomBoxes.forEach(roomElements => {
      roomElements.box.visible = false;
      roomElements.wireframe.visible = false;
      roomElements.box.material.opacity = 0.2;
    });
    scene.children = scene.children.filter(child => child.name !== 'roomLabel');
    
    const roomViewControls = document.querySelector('.room-view-controls');
    if (roomViewControls) roomViewControls.style.display = 'none';
    
    const roomInfoContainer = document.querySelector('.room-info-container');
    if (roomInfoContainer) roomInfoContainer.classList.remove('visible');
  }

  function resetToDefaultView() {
    new TWEEN.Tween(camera.position)
      .to({ x: defaultCameraPos.x, y: defaultCameraPos.y, z: defaultCameraPos.z }, 1000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .start();
    
    new TWEEN.Tween(controls.target)
      .to({ x: defaultCameraTarget.x, y: defaultCameraTarget.y, z: defaultCameraTarget.z }, 1000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => controls.update())
      .start();

    document.querySelectorAll('.room-btn').forEach(btn => btn.classList.remove('active'));
  }

  function resetCameraView() {
    resetToDefaultView();
    const roomInfoContainer = document.querySelector('.room-info-container');
    if (roomInfoContainer) roomInfoContainer.classList.remove('visible');
  }

  // Room label creation
  function createRoomLabel(roomType, number, position) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    context.fillStyle = 'rgba(255, 255, 255, 0.95)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#ff5722';
    context.lineWidth = 3;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    context.font = 'bold 18px Arial';
    context.fillStyle = '#333';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`${number}. ${roomType.charAt(0).toUpperCase() + roomType.slice(1)}`, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      alphaTest: 0.1
    });
    const sprite = new THREE.Sprite(material);
    
    // Intelligent label positioning based on room geometry
    const rooms = roomsByType[roomType];
    if (rooms && rooms.length > 0) {
      // Find the highest point in the room for better label visibility
      let maxY = position.y;
      rooms.forEach(room => {
        const roomBox = new THREE.Box3().setFromObject(room);
        maxY = Math.max(maxY, roomBox.max.y);
      });
      
      sprite.position.copy(position);
      sprite.position.y = maxY + 3; // Place above the highest point
    } else {
      sprite.position.copy(position);
      sprite.position.y += 5;
    }
    
    sprite.scale.set(3.5, 0.875, 1);
    sprite.name = 'roomLabel';
    scene.add(sprite);
  }

  // Room highlight preview function
  function previewRoomHighlight(roomType, show) {
    const roomElements = roomBoxes.get(roomType);
    if (!roomElements) return;
    
    if (show) {
      // Temporarily show this room's highlight with different styling
      roomElements.box.material.color.setHex(0x00bcd4); // Cyan preview color
      roomElements.box.material.opacity = 0.3;
      roomElements.box.visible = true;
      roomElements.wireframe.visible = true;
    } else {
      // Hide preview unless room is part of active sequence
      const activeSequence = getCurrentActiveSequence();
      if (!activeSequence || !activeSequence.includes(roomType)) {
        roomElements.box.visible = false;
        roomElements.wireframe.visible = false;
      } else {
        // Restore original highlighting
        roomElements.box.material.color.setHex(0xff5722); // Original orange color
        roomElements.box.material.opacity = 0.2;
      }
    }
  }

  // Get currently active room sequence
  function getCurrentActiveSequence() {
    const conditionSelect = document.getElementById('conditionSelect');
    if (!conditionSelect || conditionSelect.value === 'default') return null;
    
    const roomSequences = {
      broken_bone: ['entry', 'reception', 'triage', 'xray', 'treatment', 'discharge'],
      chest_pain: ['entry', 'reception', 'triage', 'emergency', 'cardiac', 'monitoring', 'discharge'],
      head_injury: ['entry', 'reception', 'triage', 'xray', 'neurology', 'monitoring', 'discharge'],
      kidney_infection: ['entry', 'reception', 'triage', 'lab', 'urology', 'treatment', 'discharge'],
      abdominal_pain: ['entry', 'reception', 'triage', 'lab', 'gastro', 'treatment', 'discharge']
    };
    
    return roomSequences[conditionSelect.value] || null;
  }

  // Room panel population
  function populateRoomSelectionPanel(sequence) {
    const roomSelectionPanel = document.getElementById('roomSelectionPanel');
    const roomButtons = document.getElementById('roomButtons');
    
    if (!roomSelectionPanel || !roomButtons) return;

    roomButtons.innerHTML = '';
    
    const panelSubtitle = roomSelectionPanel.querySelector('.panel-subtitle');
    if (panelSubtitle) panelSubtitle.textContent = `${sequence.length} rooms`;

    sequence.forEach((roomType, index) => {
      const roomBtn = document.createElement('button');
      roomBtn.className = 'room-btn';
      roomBtn.dataset.roomType = roomType;
      roomBtn.innerHTML = `
        <div class="room-btn-content">
          <div class="room-number">${index + 1}</div>
          <div class="room-name">${roomType.charAt(0).toUpperCase() + roomType.slice(1)}</div>
        </div>
      `;
      
      // Add hover preview functionality
      roomBtn.addEventListener('mouseenter', () => {
        previewRoomHighlight(roomType, true);
      });
      
      roomBtn.addEventListener('mouseleave', () => {
        previewRoomHighlight(roomType, false);
      });

      roomBtn.addEventListener('click', () => {
        document.querySelectorAll('.room-btn').forEach(btn => btn.classList.remove('active'));
        roomBtn.classList.add('active');
        moveCameraToRoom(roomType);
        updateRoomContent(roomType);
      });
      
      roomButtons.appendChild(roomBtn);
    });

    roomSelectionPanel.classList.add('visible');
  }

  // Camera movement
  function moveCameraToRoom(roomType) {
    const roomCamera = roomCameras.get(roomType);
    if (!roomCamera) {
      console.warn(`No camera found for room: ${roomType}`);
      return;
    }

    new TWEEN.Tween(camera.position)
      .to({ x: roomCamera.position.x, y: roomCamera.position.y, z: roomCamera.position.z }, 1000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .start();

    new TWEEN.Tween(controls.target)
      .to({ x: roomCamera.target.x, y: roomCamera.target.y, z: roomCamera.target.z }, 1000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => controls.update())
      .start();
  }

  // Content updates
  function updateRoomContent(roomType) {
    const content = roomContent[roomType];
    if (!content) return;

    const projectOverview = document.querySelector('.content-section');
    if (!projectOverview) return;

    const newContent = `
      <div class="container">
        <div class="content-grid">
          <div class="content-main">
            <h2 class="content-title">${content.title}</h2>
            <p class="room-description">${content.description}</p>
            
            <h3 class="section-title">Room Features</h3>
            <ul class="feature-list">
              ${content.features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
            
            <h3 class="section-title">Staff Present</h3>
            <ul class="feature-list">
              ${content.staff.map(staff => `<li>${staff}</li>`).join('')}
            </ul>
            
            ${content.additionalHtml || ''}
          </div>
        </div>
      </div>
    `;

    projectOverview.innerHTML = newContent;
  }

  function updateConditionInfo(condition) {
    const conditionInfo = document.getElementById('conditionInfo');
    if (!conditionInfo) return;

    if (condition === 'default') {
      conditionInfo.innerHTML = `
        <div class="info-content">
          <div class="info-icon"><i class="fas fa-info-circle"></i></div>
          <div class="info-text">
            <p class="info-title">Get Started</p>
            <p class="info-description">Choose a condition above to see the patient journey</p>
          </div>
        </div>
      `;
      return;
    }

    const conditionNames = {
      broken_bone: 'Broken Bone Treatment',
      chest_pain: 'Chest Pain Evaluation',
      head_injury: 'Head Injury Assessment',
      kidney_infection: 'Kidney Infection Care',
      abdominal_pain: 'Abdominal Pain Diagnosis'
    };

    const conditionName = conditionNames[condition] || condition;
    
    conditionInfo.innerHTML = `
      <div class="info-content">
        <div class="info-icon"><i class="fas fa-route"></i></div>
        <div class="info-text">
          <p class="info-title">${conditionName}</p>
          <p class="info-description">Patient journey path is highlighted. Use room navigation to explore.</p>
        </div>
      </div>
    `;
  }

  // Theme toggle
  function initializeThemeToggle() {
    const lightModeBtn = document.getElementById('lightModeBtn');
    const darkModeBtn = document.getElementById('darkModeBtn');
    
    document.documentElement.setAttribute('data-theme', 'dark');
    
    lightModeBtn?.addEventListener('click', () => {
      document.documentElement.setAttribute('data-theme', 'light');
      lightModeBtn.classList.add('active');
      darkModeBtn.classList.remove('active');
    });
    
    darkModeBtn?.addEventListener('click', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      darkModeBtn.classList.add('active');
      lightModeBtn.classList.remove('active');
    });
  }

  // Keyboard shortcuts
  function showKeyboardShortcuts() {
    const existingModal = document.getElementById('keyboardShortcutsModal');
    if (existingModal) {
      existingModal.remove();
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'keyboardShortcutsModal';
    modal.className = 'keyboard-shortcuts-modal';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Keyboard Shortcuts</h3>
          <button class="modal-close" onclick="this.closest('.keyboard-shortcuts-modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="shortcut-group">
            <div class="shortcut-item"><kbd>R</kbd><span>Reset View</span></div>
            <div class="shortcut-item"><kbd>F</kbd><span>Fullscreen</span></div>
            <div class="shortcut-item"><kbd>H</kbd><span>Help</span></div>
          </div>
          <div class="shortcut-group">
            <h4>Select Condition</h4>
            <div class="shortcut-item"><kbd>1</kbd><span>Broken Bone Treatment</span></div>
            <div class="shortcut-item"><kbd>2</kbd><span>Chest Pain Evaluation</span></div>
            <div class="shortcut-item"><kbd>3</kbd><span>Head Injury Assessment</span></div>
            <div class="shortcut-item"><kbd>4</kbd><span>Kidney Infection Care</span></div>
            <div class="shortcut-item"><kbd>5</kbd><span>Abdominal Pain Diagnosis</span></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function toggleFullscreen() {
    const container = document.getElementById('three-container');
    if (!document.fullscreenElement) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  function selectCondition(value) {
    const conditionSelect = document.getElementById('conditionSelect');
    if (conditionSelect) {
      conditionSelect.value = value;
      conditionSelect.dispatchEvent(new Event('change'));
    }
  }

  // Keyboard event handling
  document.addEventListener('keydown', (event) => {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

    const key = event.key.toLowerCase();
    switch (key) {
      case 'r': event.preventDefault(); resetCameraView(); break;
      case 'f': event.preventDefault(); toggleFullscreen(); break;
      case 'h': event.preventDefault(); showKeyboardShortcuts(); break;
      case '1': event.preventDefault(); selectCondition('broken_bone'); break;
      case '2': event.preventDefault(); selectCondition('chest_pain'); break;
      case '3': event.preventDefault(); selectCondition('head_injury'); break;
      case '4': event.preventDefault(); selectCondition('kidney_infection'); break;
      case '5': event.preventDefault(); selectCondition('abdominal_pain'); break;
    }
  });

  // Window resize handling
  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    TWEEN.update();

    const time = Date.now() * 0.001;
    scene.children.forEach(child => {
      if (child.name === 'roomLabel') {
        child.position.y += Math.sin(time * 2 + child.position.x) * 0.002;
      }
      if (child.name?.startsWith('highlight-box-') && child.visible) {
        child.material.opacity = 0.15 + 0.1 * Math.sin(time * 3);
      }
      // Add subtle pulsing to colored room elements
      if (child.isMesh && child.material && child.material.emissive) {
        const emissiveIntensity = 0.05 + 0.02 * Math.sin(time * 1.5 + child.position.x * 0.1);
        child.material.emissive.multiplyScalar(emissiveIntensity / child.material.emissive.length());
      }
      
      // Enhanced pulsing animation for highlight boxes
      if (child.name?.startsWith('highlight-box-') && child.visible) {
        if (child.material) {
          child.material.opacity = 0.2 + 0.1 * Math.sin(time * 2 + child.position.x * 0.1);
        }
      }
    });

    renderer.render(scene, camera);
  }

  // Initialize
  initializeThemeToggle();
  animate();
});