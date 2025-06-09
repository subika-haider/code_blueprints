import * as THREE from 'https://esm.sh/three@0.150.1';
import { OrbitControls } from 'https://esm.sh/three@0.150.1/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://esm.sh/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import * as TWEEN from 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.esm.js';
// import roomContent from './room-content.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.4.4/+esm';

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
  
  // Set camera constraints to keep model in view
  controls.minDistance = 10;
  controls.maxDistance = 200;
  controls.maxPolarAngle = Math.PI * 0.9; // Prevent going below ground
  controls.minPolarAngle = Math.PI * 0.1; // Prevent going too high above
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.enableRotate = true;

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
  const roomsByType = {
    entry: [], reception: [], triage: [], xray: [], emergency: [], treatment: [],
    cardiac: [], neurology: [], lab: [], urology: [], gastro: [], monitoring: [], discharge: [],
    medication_station: [], staff_room: [], department_med: [], medicine_ward_a: [],
    waiting_area: [], nurses_station: [], icu: [], imaging: [], pharmacy: []
  };
  const roomCubes = new Map(); // Store cube components for each room
  const standaloneCubes = []; // Store cubes that are not part of any room
  const cubeCameras = new Map(); // Store cameras for each cube
  const standaloneToCondition = new Map(); // Map standalone cubes to conditions
  
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
      let isCube = false;
      const { x, y, z } = mesh.position;

      // Debug: Log all mesh names to see what we're working with
      console.log('Processing mesh:', mesh.name);
      
      // Special debug for triage, reception, diagnostic, discharge
      if (name.includes('triage') || name.includes('reception') || name.includes('diagnostic') || name.includes('discharge')) {
        console.log(`🔍 SPECIAL DEBUG - Found potential ${name.includes('triage') ? 'TRIAGE' : name.includes('diagnostic') ? 'DIAGNOSTIC' : name.includes('discharge') ? 'DISCHARGE' : 'RECEPTION'} mesh:`, mesh.name);
        console.log('  Lowercase name:', name);
        console.log('  Contains "triage":', name.includes('triage'));
        console.log('  Contains "diagnostic":', name.includes('diagnostic'));
        console.log('  Contains "reception":', name.includes('reception'));
        console.log('  Contains "discharge":', name.includes('discharge'));
        console.log('  Contains "_mesh":', name.includes('_mesh'));
      }

      // First detect by name patterns - including Room_name_Mesh pattern
      if (name.includes('entry') || name.includes('entrance') || name.includes('lobby')) {
        roomType = 'entry';
      } else if (name.includes('reception') || name.includes('desk') || name.includes('front') || name.includes('reception_mesh')) {
        roomType = 'reception';
      } else if (name.includes('triage') || name.includes('assess') || name.includes('triage_mesh') || name.includes('diagnostic')) {
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
      } else if (name.includes('discharge') || name.includes('exit') || name.includes('discharge_mesh')) {
        roomType = 'discharge';
      } else if (name.includes('medication') && (name.includes('station') || name.includes('_mesh'))) {
        roomType = 'medication_station';
      } else if (name.includes('staff') && (name.includes('room') || name.includes('_mesh'))) {
        roomType = 'staff_room';
      } else if (name.includes('department') && name.includes('med')) {
        roomType = 'department_med';
      } else if (name.includes('medicine') && name.includes('ward') && name.includes('a')) {
        roomType = 'medicine_ward_a';
      } else if (name.includes('waiting') && (name.includes('area') || name.includes('_mesh'))) {
        roomType = 'waiting_area';
      } else if ((name.includes('nurses') || name.includes('nurse')) && (name.includes('station') || name.includes('_mesh'))) {
        roomType = 'nurses_station';
      } else if (name.includes('icu') || (name.includes('intensive') && name.includes('care'))) {
        roomType = 'icu';
      } else if (name.includes('imaging') || name.includes('radiology')) {
        roomType = 'imaging';
      } else if (name.includes('pharmacy') || name.includes('pharmacist')) {
        roomType = 'pharmacy';
      }

      // Additional room detection patterns for Room_name_Mesh cubes
      if (!roomType && name.includes('_mesh')) {
        // Extract room name from Room_name_Mesh pattern
        const meshParts = name.split('_mesh')[0].split('_');
        const roomName = meshParts.join('_');
        
        // Map common room name variations
        if (roomName.includes('waiting') || roomName.includes('waitingarea')) {
          roomType = 'waiting_area';
        } else if (roomName.includes('nurses') || roomName.includes('nurse')) {
          roomType = 'nurses_station';
        } else if (roomName.includes('medication')) {
          roomType = 'medication_station';
        } else if (roomName.includes('staff')) {
          roomType = 'staff_room';
        } else if (roomName.includes('department') || roomName.includes('med')) {
          roomType = 'department_med';
        } else if (roomName.includes('medicine') || roomName.includes('ward')) {
          roomType = 'medicine_ward_a';
        } else if (roomName.includes('icu')) {
          roomType = 'icu';
        } else if (roomName.includes('imaging')) {
          roomType = 'imaging';
        } else if (roomName.includes('pharmacy')) {
          roomType = 'pharmacy';
        } else if (roomName.includes('triage') || roomName.includes('diagnostic')) {
          roomType = 'triage';
        } else if (roomName.includes('lab')) {
          roomType = 'lab';
        } else if (roomName.includes('reception')) {
          roomType = 'reception';
        } else if (roomName.includes('discharge')) {
          roomType = 'discharge';
        }
        
        console.log(`Detected Room_name_Mesh pattern: ${name} -> room type: ${roomType}`);
      }

      // Fallback detection for specific room types that might be missed
      if (!roomType) {
        if (name.includes('triage') || name.includes('diagnostic')) {
          roomType = 'triage';
          console.log(`🔍 FALLBACK - Detected triage from: ${mesh.name}`);
        } else if (name.includes('reception')) {
          roomType = 'reception';
          console.log(`🔍 FALLBACK - Detected reception from: ${mesh.name}`);
        } else if (name.includes('discharge')) {
          roomType = 'discharge';
          console.log(`🔍 FALLBACK - Detected discharge from: ${mesh.name}`);
        }
      }

      // Detect cube components with Room_name_Mesh pattern
      if (name.includes('_mesh')) {
        isCube = true;
        console.log('Found cube:', name, 'at position:', x, y, z);
      }

      // Debug: Log room assignment
      if (roomType) {
        console.log(`Assigned mesh "${mesh.name}" to room type: ${roomType}`);
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
scene.add(model);

// Clean up any existing highlight boxes and wireframes from scene
const objectsToRemove = [];
scene.children.forEach(child => {
  if (child.name && (child.name.startsWith('highlight-box-') || child.name.startsWith('wireframe-'))) {
    objectsToRemove.push(child);
  }
});
objectsToRemove.forEach(obj => scene.remove(obj));

// Manual camera placement functions
console.log('\n=== MANUAL CAMERA PLACEMENT READY ===');
console.log('Use setRoomCamera(roomType, x, y, z, targetX, targetY, targetZ) to place cameras manually');
console.log('Available room types:', Object.keys(roomsByType).filter(type => roomsByType[type].length > 0));


// Camera movement
function moveCameraToRoom(roomType) {
const cubeCamera = cubeCameras.get(roomType);
if (!cubeCamera) {
  console.warn(`No cube camera found for room: ${roomType}`);
  return;
}

console.log(`Moving camera to ${roomType}:`, cubeCamera.position);

new TWEEN.Tween(camera.position)
  .to({ x: cubeCamera.position.x, y: cubeCamera.position.y, z: cubeCamera.position.z }, 1000)
  .easing(TWEEN.Easing.Cubic.InOut)
  .start();

new TWEEN.Tween(controls.target)
  .to({ x: cubeCamera.target.x, y: cubeCamera.target.y, z: cubeCamera.target.z }, 1000)
  .easing(TWEEN.Easing.Cubic.InOut)
  .onUpdate(() => controls.update())
  .start();
}

    scene.add(model);

    // First, collect all cubes and rooms
    const allCubes = [];
    const allRooms = [];
    
    allMeshes.forEach(mesh => {
      const name = mesh.name.toLowerCase();
      if (name.includes('_mesh')) {
        allCubes.push(mesh);
      }
    });

    Object.keys(roomsByType).forEach(roomType => {
      const rooms = roomsByType[roomType];
      if (rooms.length > 0) {
        allRooms.push({ type: roomType, meshes: rooms });
      }
    });

    console.log(`Found ${allCubes.length} cubes and ${allRooms.length} room types`);
    console.log('Cubes:', allCubes.map(c => c.name));
    console.log('Rooms with meshes:', allRooms.map(r => r.type));
    
    // Show all room types defined in JS and which ones are empty
    console.log('\n=== ALL ROOM TYPES IN JS ===');
    Object.keys(roomsByType).forEach(roomType => {
      const meshCount = roomsByType[roomType].length;
      console.log(`${roomType}: ${meshCount} meshes ${meshCount === 0 ? '(EMPTY)' : ''}`);
    });
    
    console.log('\n=== CUBE TO ROOM MATCHING ===');

    // Create a matching matrix to find optimal cube-room assignments
    const assignments = [];
    const usedCubes = new Set();
    
    // First pass: Assign cubes to rooms that have meshes

    allRooms.forEach(room => {
      // Calculate room bounding box
      const roomBoundingBox = new THREE.Box3();
      room.meshes.forEach(mesh => roomBoundingBox.expandByObject(mesh));
      const roomSize = roomBoundingBox.getSize(new THREE.Vector3());
      const roomVolume = roomSize.x * roomSize.y * roomSize.z;
      const roomCenter = roomBoundingBox.getCenter(new THREE.Vector3());

      console.log(`\n=== ANALYZING ROOM: ${room.type} ===`);
      console.log(`Room bounding box:`, roomSize, 'Volume:', roomVolume);

      let bestCube = null;
      let bestScore = Infinity;

      // Check all unused cubes
      allCubes.forEach(cube => {
        if (usedCubes.has(cube.name)) return; // Skip already used cubes

        const cubeName = cube.name.toLowerCase();
        
        // Check if cube name matches room type (e.g., "triage_mesh" matches "triage")
        const isNameMatch = cubeName.includes(room.type) || 
                           cubeName.includes(room.type.replace('_', '')) ||
                           (room.type === 'waiting_area' && cubeName.includes('waiting')) ||
                           (room.type === 'nurses_station' && (cubeName.includes('nurses') || cubeName.includes('nurse'))) ||
                           (room.type === 'medication_station' && cubeName.includes('medication')) ||
                           (room.type === 'department_med' && cubeName.includes('med')) ||
                           (room.type === 'medicine_ward_a' && (cubeName.includes('medicine') || cubeName.includes('ward'))) ||
                           (room.type === 'reception' && cubeName.includes('reception')) ||
                           (room.type === 'triage' && (cubeName.includes('triage') || cubeName.includes('diagnostic'))) ||
                           (room.type === 'discharge' && cubeName.includes('discharge'));

        const cubeBoundingBox = new THREE.Box3().setFromObject(cube);
        const cubeSize = cubeBoundingBox.getSize(new THREE.Vector3());
        const cubeVolume = cubeSize.x * cubeSize.y * cubeSize.z;
        const cubeCenter = cubeBoundingBox.getCenter(new THREE.Vector3());
        const centerDistance = cubeCenter.distanceTo(roomCenter);

        // Improved scoring system with name matching bonus
        const volumeRatio = cubeVolume / roomVolume;
        const sizeCompatibility = volumeRatio >= 0.3 && volumeRatio <= 10;
        const maxDimension = Math.max(roomSize.x, roomSize.y, roomSize.z);
        const normalizedDistance = centerDistance / maxDimension;
        
        // Score: lower is better, big bonus for name match
        let score = normalizedDistance + Math.abs(Math.log(volumeRatio));
        if (isNameMatch) {
          score = score * 0.1; // Give huge priority to name matches
        }

        console.log(`Checking cube ${cube.name} for room ${room.type}:`);
        console.log(`  Name match: ${isNameMatch}, Volume ratio: ${volumeRatio.toFixed(2)}, Distance: ${centerDistance.toFixed(2)}, Score: ${score.toFixed(2)}`);
        console.log(`  Cube name contains: discharge=${cubeName.includes('discharge')}, staff=${cubeName.includes('staff')}, reception=${cubeName.includes('reception')}, diagnostic=${cubeName.includes('diagnostic')}`);

        if (sizeCompatibility && normalizedDistance < 3.0) {
          if (score < bestScore) {
            bestScore = score;
            bestCube = cube;
            console.log(`  ✓ New best cube: ${cube.name} (score: ${score.toFixed(2)})`);
          }
        }
      });

      // Assign the best cube to this room
      if (bestCube) {
        usedCubes.add(bestCube.name);
        // Make the cube invisible by default
        if (bestCube.material) {
          bestCube.material.transparent = true;
          bestCube.material.opacity = 0;
          bestCube.visible = false;
        }
        
        // Create camera inside the cube
        const cubeBoundingBox = new THREE.Box3().setFromObject(bestCube);
        const cubeCenter = cubeBoundingBox.getCenter(new THREE.Vector3());
        const cubeSize = cubeBoundingBox.getSize(new THREE.Vector3());
        
        // Position camera inside cube, slightly above center
        const cameraPos = new THREE.Vector3(
          cubeCenter.x,
          cubeCenter.y + cubeSize.y * 0.2,
          cubeCenter.z
        );
        
        cubeCameras.set(room.type, {
          position: cameraPos,
          target: cubeCenter,
          cubeRef: bestCube
        });
        
        roomCubes.set(room.type, [bestCube]);
        console.log(`✓ FINAL ASSIGNMENT: cube ${bestCube.name} assigned to room ${room.type} with camera at`, cameraPos);
        console.log(`  Assignment reason: score ${bestScore.toFixed(2)}, name match priority applied`);
      } else {
        console.log(`⚠ No suitable cube found for room ${room.type}`);
      }
    });

    // Second pass: Hide any remaining unmatched cubes completely
    allCubes.forEach(cube => {
      if (!usedCubes.has(cube.name)) {
        console.log(`⚠ Unmatched cube: ${cube.name} - will be hidden completely`);
        
        // Hide unmatched cubes completely
        if (cube.material) {
          cube.material.transparent = true;
          cube.material.opacity = 0;
          cube.visible = false;
        }
        
        // Remove from scene to ensure they don't show up
        scene.remove(cube);
      }
    });

    // Debug: Log all selected cubes (should be exactly one per room)
    console.log('=== CUBE SELECTION SUMMARY ===');
    const totalCubesUsed = Array.from(roomCubes.values()).reduce((sum, cubes) => sum + cubes.length, 0);
    console.log(`Total rooms with cubes: ${roomCubes.size}/${allRooms.length} rooms`);
    console.log(`Total cubes assigned to rooms: ${totalCubesUsed}/${allCubes.length} cubes`);
    console.log(`Standalone cubes: ${standaloneCubes.length}`);
    console.log(`Total cubes managed: ${totalCubesUsed + standaloneCubes.length}/${allCubes.length}`);
    
    console.log('\nRoom-based cubes:');
    roomCubes.forEach((cubes, roomType) => {
      console.log(`  Room ${roomType}: ${cubes[0]?.name || 'No cube'}`);
    });
    
    console.log('\nStandalone cubes:');
    standaloneCubes.forEach((cube, index) => {
      console.log(`  Standalone ${index + 1}: ${cube.name}`);
    });

    // Calculate scene center and set default camera
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const cameraDistance = maxDim * 1.5;

    // Set camera constraints based on model size to keep model in perfect view
    controls.minDistance = maxDim * 0.5;
    controls.maxDistance = maxDim * 3;
    controls.maxPolarAngle = Math.PI * 0.85; // Prevent going below ground
    controls.minPolarAngle = Math.PI * 0.15; // Prevent going too high above
  
    // Store model bounds for camera limiting
    const modelBounds = {
      center: center,
      size: size,
      maxDim: maxDim
    };
  
    // Add pan limiting to keep model in view
    const originalUpdate = controls.update.bind(controls);
    controls.update = function() {
      // Limit target position to keep model in view
      const maxPanDistance = maxDim * 1.5;
      controls.target.x = Math.max(center.x - maxPanDistance, Math.min(center.x + maxPanDistance, controls.target.x));
      controls.target.z = Math.max(center.z - maxPanDistance, Math.min(center.z + maxPanDistance, controls.target.z));
      controls.target.y = Math.max(center.y - maxDim, Math.min(center.y + maxDim, controls.target.y));
    
      return originalUpdate();
    };
    
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

  // Overview reset button
  const resetViewBtn = document.getElementById('resetViewBtn');
  if (resetViewBtn) {
    resetViewBtn.addEventListener('click', () => {
      // Reset condition selector to default
      if (conditionSelect) {
        conditionSelect.value = 'default';
      }
      // Trigger the same reset as selecting "Overview - No Highlighting"
      highlightPatientRooms('default');
    });
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
    // const roomSelectionPanel = document.getElementById('roomSelectionPanel');
    
    if (!condition || condition === 'default') {
      // if (roomSelectionPanel) roomSelectionPanel.classList.remove('visible');
      resetToDefaultView();
      // updateConditionInfo('default');
      resetToProjectOverview();
      // Hide all cubes
      roomCubes.forEach((cubes, roomType) => {
        manipulateCube(roomType, 'hide');
      });

      return;
    }

    const roomSequences = {
      broken_bone: [
        'main_entrance',
        'reception',
        'waiting_area',
        'emergency',
        'imaging',
        'diagnostic_unit',
        'pharmacy',
        'medication_station',
        'department_med',
        'medicine_ward_a_b',
        'nurses_station',
        'discharge'
      ],
      chest_pain: [
        'main_entrance',
        'reception',
        'emergency',
        'lab',
        'icu',
        'imaging',
        'diagnostic_unit',
        'pharmacy',
        'medication_station',
        'department_med',
        'medicine_ward_a_b',
        'nurses_station',
        'discharge'
      ],
      head_injury: [
        'main_entrance',
        'reception',
        'emergency',
        'lab',
        'icu',
        'imaging',
        'pharmacy',
        'medication_station',
        'department_med',
        'medicine_ward_a_b',
        'nurses_station',
        'discharge'
      ],
      kidney_infection: [
        'main_entrance',
        'reception',
        'waiting_area',
        'emergency',
        'lab',
        'icu',
        'imaging',
        'diagnostic_unit',
        'pharmacy',
        'medication_station',
        'department_med',
        'medicine_ward_a_b',
        'nurses_station',
        'discharge'
      ],
      abdominal_pain: [
        'main_entrance',
        'reception',
        'waiting_area',
        'emergency',
        'lab',
        'icu',
        'imaging',
        'diagnostic_unit',
        'pharmacy',
        'medication_station',
        'department_med',
        'medicine_ward_a_b',
        'nurses_station',
        'discharge'
      ]
    };
    

    const sequence = roomSequences[condition];
    if (!sequence) return;

    // Debug: Check which rooms in sequence have cubes available
    console.log(`\n=== CONDITION: ${condition} ===`);
    console.log('Requested sequence:', sequence);
    console.log('Available room types with cubes:', Array.from(roomCubes.keys()));
    
    const availableRooms = [];
    const missingRooms = [];
    
    sequence.forEach(roomType => {
      if (roomCubes.has(roomType) && roomCubes.get(roomType).length > 0) {
        availableRooms.push(roomType);
      } else {
        missingRooms.push(roomType);
      }
    });
    
    console.log('✓ Available rooms in sequence:', availableRooms);
    console.log('⚠ Missing rooms in sequence:', missingRooms);
    
    // Show which cubes are assigned to which rooms
    console.log('\n=== CURRENT CUBE ASSIGNMENTS ===');
    roomCubes.forEach((cubes, roomType) => {
      console.log(`${roomType}: ${cubes[0]?.name || 'No cube'}`);
    });
    
    // Show which rooms have manually placed cameras
    console.log('\n=== MANUALLY PLACED CAMERAS ===');
    roomCameras.forEach((camera, roomType) => {
      console.log(`${roomType}: camera at (${camera.position.x}, ${camera.position.y}, ${camera.position.z})`);
    });

    // Show and highlight cubes for rooms in the sequence
    highlightRoomCubes(sequence, 0xff5722);

    // populateRoomSelectionPanel(sequence);
    // roomSelectionPanel.classList.add('visible');
        // updateConditionInfo(condition);
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

  function resetToProjectOverview() {
    const contentGrid = document.querySelector('.content-section .content-grid');
    if (!contentGrid) return;
    
    contentGrid.innerHTML = `
      <div class="content-main">
        <h2 class="content-title">Project Overview</h2>
        
        <div class="feature-highlight">
          <div class="highlight-icon">
            <i class="fas fa-lightbulb"></i>
          </div>
          <div class="highlight-content">
            <h3>Advanced Healthcare Visualization</h3>
            <p>This interactive 3D hospital map revolutionizes healthcare pathway visualization by providing immersive room exploration, real-time patient journey tracking, and comprehensive departmental insights.</p>
          </div>
        </div>

        <div class="content-blocks">
          <div class="content-block">
            <div class="block-header">
              <div class="block-number">01</div>
              <h3 class="block-title">Current Achievements</h3>
            </div>
            <div class="block-content">
              <p>We've successfully developed a comprehensive 3D hospital blueprint with interactive room exploration capabilities. Users can seamlessly navigate through different medical departments and visualize complete patient journeys from entry to discharge.</p>
              
              <div class="achievement-list">
                <div class="achievement-item">
                  <i class="fas fa-check-circle"></i>
                  <span>15+ Interactive Room Types</span>
                </div>
                <div class="achievement-item">
                  <i class="fas fa-check-circle"></i>
                  <span>5 Medical Condition Pathways</span>
                </div>
                <div class="achievement-item">
                  <i class="fas fa-check-circle"></i>
                  <span>Real-time 3D Visualization</span>
                </div>
                <div class="achievement-item">
                  <i class="fas fa-check-circle"></i>
                  <span>Mobile-Responsive Design</span>
                </div>
              </div>
            </div>
          </div>

          <div class="content-block">
            <div class="block-header">
              <div class="block-number">02</div>
              <h3 class="block-title">Technical Innovation</h3>
            </div>
            <div class="block-content">
              <p>Built with cutting-edge web technologies including Three.js for 3D rendering, advanced CSS animations, and responsive design principles to ensure optimal performance across all devices.</p>
              
              <div class="tech-stack">
                <div class="tech-item">
                  <div class="tech-icon">
                    <i class="fab fa-js-square"></i>
                  </div>
                  <span>Three.js 3D Engine</span>
                </div>
                <div class="tech-item">
                  <div class="tech-icon">
                    <i class="fab fa-css3-alt"></i>
                  </div>
                  <span>Advanced CSS3</span>
                </div>
                <div class="tech-item">
                  <div class="tech-icon">
                    <i class="fas fa-mobile-alt"></i>
                  </div>
                  <span>Responsive Design</span>
                </div>
              </div>
            </div>
          </div>

          <div class="content-block">
            <div class="block-header">
              <div class="block-number">03</div>
              <h3 class="block-title">Future Roadmap</h3>
            </div>
            <div class="block-content">
              <p>Our development roadmap includes AI-powered pathway optimization, real-time hospital data integration, and advanced analytics for healthcare professionals.</p>
              
              <div class="roadmap-list">
                <div class="roadmap-item">
                  <div class="roadmap-status in-progress"></div>
                  <div class="roadmap-content">
                    <h4>AI Pathway Optimization</h4>
                    <p>Machine learning algorithms for optimal route planning</p>
                  </div>
                </div>
                <div class="roadmap-item">
                  <div class="roadmap-status planned"></div>
                  <div class="roadmap-content">
                    <h4>Real-time Data Integration</h4>
                    <p>Live hospital data feeds and occupancy tracking</p>
                  </div>
                </div>
                <div class="roadmap-item">
                  <div class="roadmap-status planned"></div>
                  <div class="roadmap-content">
                    <h4>Advanced Analytics Dashboard</h4>
                    <p>Comprehensive metrics and performance insights</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="content-sidebar">
        <div class="sidebar-widget">
          <h3 class="widget-title">
            <i class="fas fa-chart-bar"></i>
            Project Statistics
          </h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">99.9%</div>
              <div class="stat-label">Uptime</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">15</div>
              <div class="stat-label">Room Types</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">3D</div>
              <div class="stat-label">Rendering</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">5</div>
              <div class="stat-label">Pathways</div>
            </div>
          </div>
        </div>

        <div class="sidebar-widget">
          <h3 class="widget-title">
            <i class="fas fa-keyboard"></i>
            Keyboard Shortcuts
          </h3>
          <div class="shortcuts-list">
            <div class="shortcut-item">
              <kbd>R</kbd>
              <span>Reset View</span>
            </div>
            <div class="shortcut-item">
              <kbd>F</kbd>
              <span>Fullscreen</span>
            </div>
            <div class="shortcut-item">
              <kbd>H</kbd>
              <span>Help</span>
            </div>
            <div class="shortcut-item">
              <kbd>1-5</kbd>
              <span>Select Condition</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function resetCameraView() {
    resetToDefaultView();
    resetToProjectOverview();
    const roomInfoContainer = document.querySelector('.room-info-container');
    if (roomInfoContainer) roomInfoContainer.classList.remove('visible');
  }



  // Cube manipulation functions
  function getRoomCubes(roomType) {
    return roomCubes.get(roomType) || [];
  }

  function getAllCubes() {
    const allCubes = [];
    roomCubes.forEach(cubes => allCubes.push(...cubes));
    return allCubes;
  }

  function manipulateCube(roomType, action, options = {}) {
    const cubes = getRoomCubes(roomType);
    if (cubes.length === 0) {
      console.warn(`No cubes found for room type: ${roomType}`);
      return;
    }

    cubes.forEach(cube => {
      switch (action) {
        case 'show':
          cube.visible = true;
          cube.material.opacity = 0.3;
          break;
        case 'hide':
          cube.visible = false;
          cube.material.opacity = 0;
          break;
        case 'highlight':
          cube.visible = true;
          cube.material.opacity = 0.3;
          cube.material.emissive.setHex(options.color || 0xff5722);
          cube.material.emissiveIntensity = options.intensity || 0.3;
          break;
        case 'resetHighlight':
          cube.visible = false;
          cube.material.opacity = 0;
          cube.material.emissive.setHex(0x000000);
          cube.material.emissiveIntensity = 0;
          break;
        case 'scale':
          const scale = options.scale || 1;
          cube.scale.set(scale, scale, scale);
          break;
        case 'color':
          cube.material.color.setHex(options.color || 0xffffff);
          break;
        case 'opacity':
          cube.material.transparent = true;
          cube.material.opacity = options.opacity || 1;
          break;
      }
    });
  }

  function highlightRoomCubes(roomTypes, color = 0xff5722) {
    // Hide all cubes first
    roomCubes.forEach((cubes, roomType) => {
      manipulateCube(roomType, 'hide');
    });

    // Show and highlight specified room cubes
    roomTypes.forEach(roomType => {
      manipulateCube(roomType, 'highlight', { color: color, intensity: 0.3 });
    });
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
  // function populateRoomSelectionPanel(sequence) {
  //   const roomSelectionPanel = document.getElementById('roomSelectionPanel');
  //   const roomButtons = document.getElementById('roomButtons');
    
  //   if (!roomSelectionPanel || !roomButtons) return;

  //   roomButtons.innerHTML = '';
    
  //   const panelSubtitle = roomSelectionPanel.querySelector('.panel-subtitle');
  //   if (panelSubtitle) panelSubtitle.textContent = `${sequence.length} locations`;

  //   sequence.forEach((roomType, index) => {
  //     const roomBtn = document.createElement('button');
  //     roomBtn.className = 'room-btn';
  //     roomBtn.dataset.roomType = roomType;
      
  //     const displayName = roomType.charAt(0).toUpperCase() + roomType.slice(1).replace(/_/g, ' ');
      
  //     roomBtn.innerHTML = `
  //       <div class="room-btn-content">
  //         <div class="room-number">${index + 1}</div>
  //         <div class="room-name">${displayName}</div>
  //       </div>
  //     `;
      


  //     roomBtn.addEventListener('click', () => {
  //       document.querySelectorAll('.room-btn').forEach(btn => btn.classList.remove('active'));
  //       roomBtn.classList.add('active');
  //       moveCameraToRoom(roomType);
  //       updateRoomContent(roomType);
  //     });


      
  //     roomButtons.appendChild(roomBtn);
  //   });

  //   roomSelectionPanel.classList.add('visible');
  // }

  // Manual camera placement function
  function setRoomCamera(roomType, x, y, z, targetX, targetY, targetZ) {
    const cameraPos = new THREE.Vector3(x, y, z);
    const cameraTarget = new THREE.Vector3(
      targetX !== undefined ? targetX : x,
      targetY !== undefined ? targetY : y - 2,
      targetZ !== undefined ? targetZ : z
    );
    
    roomCameras.set(roomType, {
      position: cameraPos,
      target: cameraTarget
    });
    
    console.log(`✓ Camera set for ${roomType} at (${x}, ${y}, ${z}) looking at (${cameraTarget.x}, ${cameraTarget.y}, ${cameraTarget.z})`);
    return true;
  }

  // Camera movement
  function moveCameraToRoom(roomType) {
    const roomCamera = roomCameras.get(roomType);
    if (!roomCamera) {
      console.warn(`No camera found for room: ${roomType}. Use setRoomCamera() to place one.`);
      return;
    }

    console.log(`Moving camera to ${roomType}:`, roomCamera.position);

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

  // Get room information for manual camera placement
  function getRoomInfo(roomType) {
    const rooms = roomsByType[roomType];
    if (!rooms || rooms.length === 0) {
      console.log(`No meshes found for room: ${roomType}`);
      return null;
    }
    
    const roomBoundingBox = new THREE.Box3();
    rooms.forEach(room => roomBoundingBox.expandByObject(room));
    
    const center = roomBoundingBox.getCenter(new THREE.Vector3());
    const size = roomBoundingBox.getSize(new THREE.Vector3());
    const min = roomBoundingBox.min;
    const max = roomBoundingBox.max;
    
    console.log(`Room ${roomType} info:`);
    console.log(`  Center: (${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`);
    console.log(`  Size: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
    console.log(`  Bounds: (${min.x.toFixed(2)}, ${min.y.toFixed(2)}, ${min.z.toFixed(2)}) to (${max.x.toFixed(2)}, ${max.y.toFixed(2)}, ${max.z.toFixed(2)})`);
    
    return { center, size, min, max };
  }

  // Make functions globally available for manual camera placement
  window.setRoomCamera = setRoomCamera;
  window.getRoomInfo = getRoomInfo;
  window.moveCameraToRoom = moveCameraToRoom;

  // // Content updates
  // function updateRoomContent(roomType) {
  //   const content = roomContent[roomType];
  //   if (!content) return;

  //   const projectOverview = document.querySelector('.content-section');
  //   if (!projectOverview) return;

  //   // --- Full Dashboard Layout ---
  //   let dashboardHtml = `
  //     <div class="room-dashboard">
  //       <div class="dashboard-hero-card dashboard-card">
  //         <div class="dashboard-card-title">${content.title}</div>
  //         <div class="dashboard-card-desc">
  //             <p class="room-description">${content.description}</p>
  //           <div class="dashboard-hero-stats">
  //             <div><strong>Key Features:</strong> ${content.features.join(', ')}</div>
  //             <div><strong>Staff:</strong> ${content.staff.join(', ')}</div>
  //           </div>
  //             ${content.additionalHtml || ''}
  //           </div>
  //                 </div>
  //       <div class="dashboard-grid" id="roomDashboardGrid-${roomType}"></div>
  //     </div>
  //   `;

  //   projectOverview.innerHTML = dashboardHtml;

  //   // Fade-in animation
  //   const dashboard = projectOverview.querySelector('.room-dashboard');
  //   if (dashboard) {
  //     dashboard.style.opacity = '0';
  //     dashboard.style.transform = 'translateY(20px)';
  //     setTimeout(() => {
  //       dashboard.style.transition = 'opacity 0.4s, transform 0.4s';
  //       dashboard.style.opacity = '1';
  //       dashboard.style.transform = 'translateY(0)';
  //     }, 50);
  //   }
    
  //   // Render dashboard visualizations and cards
  //   setTimeout(() => createRoomDashboard(roomType, true), 100);
  // }

  // // Room-specific visualization functions

  // function createRoomDashboard(roomType, fullSection = false) {
  //   const grid = fullSection
  //     ? document.getElementById(`roomDashboardGrid-${roomType}`)
  //     : (() => {
  //         const container = document.getElementById(`roomVisualization-${roomType}`);
  //         if (!container) return null;
  //         container.innerHTML = '';
  //         const grid = document.createElement('div');
  //         grid.className = 'dashboard-grid';
  //         container.appendChild(grid);
  //         return grid;
  //       })();
  //   if (!grid) return;

  //   // Cardiac Unit Dashboard
  //   if (roomType === 'cardiac') {
  //     // Show loading state
  //     grid.innerHTML = `
  //       <div class="dashboard-loading">
  //         <div class="loading-spinner"></div>
  //         <p>Loading cardiac unit analytics...</p>
  //       </div>
  //     `;

  //     // Load and parse CSVs using d3-fetch
  //     Promise.all([
  //       d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/transfers.csv').catch(err => {
  //         console.error('Error loading transfers.csv:', err);
  //         return [];
  //       }),
  //       d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/services.csv').catch(err => {
  //         console.error('Error loading services.csv:', err);
  //         return [];
  //       }),
  //       d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/omr.csv').catch(err => {
  //         console.error('Error loading omr.csv:', err);
  //         return [];
  //       })
  //     ]).then(([transfers, services, omr]) => {
  //       if (!transfers.length || !services.length || !omr.length) {
  //         grid.innerHTML = `
  //           <div class="dashboard-error">
  //             <i class="fas fa-exclamation-triangle"></i>
  //             <p>Unable to load cardiac unit data. Please try again later.</p>
  //           </div>
  //         `;
  //         return;
  //       }

  //       try {
  //         // Process data for cardiac unit analytics
  //         const cardiacData = transfers.filter(r => 
  //           r.careunit === 'Coronary Care Unit' || 
  //           r.careunit === 'Cardiac Intensive Care Unit' ||
  //           r.careunit === 'Cardiac Stepdown'
  //         );

  //         // Simulate cardiac unit status
  //         const roomStatus = {
  //           'CCU-101': { 
  //             status: 'Occupied', 
  //             patient: 'Robert Johnson', 
  //             condition: 'Acute MI',
  //             vitals: {
  //               heartRate: 78,
  //               bloodPressure: '120/80',
  //               oxygenSat: 98,
  //               rhythm: 'Normal Sinus'
  //             },
  //             timeRemaining: 120,
  //             acuity: 'Level 2'
  //           },
  //           'CCU-102': { 
  //             status: 'Occupied', 
  //             patient: 'Mary Williams', 
  //             condition: 'Heart Failure',
  //             vitals: {
  //               heartRate: 92,
  //               bloodPressure: '135/85',
  //               oxygenSat: 95,
  //               rhythm: 'Atrial Fibrillation'
  //             },
  //             timeRemaining: 180,
  //             acuity: 'Level 1'
  //           },
  //           'CCU-103': { 
  //             status: 'Cleaning', 
  //             patient: null, 
  //             condition: null,
  //             vitals: null,
  //             timeRemaining: 30,
  //             acuity: null
  //           },
  //           'CCU-104': { 
  //             status: 'Available', 
  //             patient: null, 
  //             condition: null,
  //             vitals: null,
  //             timeRemaining: 0,
  //             acuity: null
  //           }
  //         };

  //         // Cardiac Conditions Distribution
  //         const conditionTypes = {
  //           'Acute MI': 0,
  //           'Heart Failure': 0,
  //           'Arrhythmia': 0,
  //           'Chest Pain': 0,
  //           'Other': 0
  //         };

  //         // Vital Signs Trends
  //         const vitalSigns = {
  //           heartRate: [],
  //           bloodPressure: [],
  //           oxygenSat: []
  //         };

  //         // Process cardiac data
  //         cardiacData.forEach(row => {
  //           if (row.service) {
  //             if (row.service.includes('CARDIAC')) {
  //               conditionTypes['Acute MI']++;
  //             } else if (row.service.includes('MED')) {
  //               conditionTypes['Heart Failure']++;
  //             } else if (row.service.includes('SURG')) {
  //               conditionTypes['Arrhythmia']++;
  //             } else if (row.service.includes('TRAUMA')) {
  //               conditionTypes['Chest Pain']++;
  //             } else {
  //               conditionTypes['Other']++;
  //             }
  //           }
  //         });

  //         // Process vital signs from OMR data
  //         const cardiacSubjectIds = new Set(cardiacData.map(r => r.subject_id));
  //         omr.forEach(row => {
  //           if (!cardiacSubjectIds.has(row.subject_id)) return;
            
  //           if (row.result_name === 'Heart Rate') {
  //             vitalSigns.heartRate.push({
  //               date: row.chartdate,
  //               value: parseFloat(row.result_value)
  //             });
  //           } else if (row.result_name === 'Blood Pressure') {
  //             vitalSigns.bloodPressure.push({
  //               date: row.chartdate,
  //               value: row.result_value
  //             });
  //           } else if (row.result_name === 'Oxygen Saturation') {
  //             vitalSigns.oxygenSat.push({
  //               date: row.chartdate,
  //               value: parseFloat(row.result_value)
  //             });
  //           }
  //         });

  //         // Sort vital signs by date
  //         const sortByDate = arr => arr
  //           .sort((a, b) => new Date(b.date) - new Date(a.date))
  //           .slice(0, 20)
  //           .reverse();

  //         const heartRateTrend = sortByDate(vitalSigns.heartRate)
  //           .map(d => ({ label: d.date, value: d.value }));
  //         const bpTrend = sortByDate(vitalSigns.bloodPressure)
  //           .map(d => {
  //             const [sys, dia] = (d.value || '').split('/').map(Number);
  //             return { label: d.date, systolic: sys, diastolic: dia };
  //           });
  //         const oxygenTrend = sortByDate(vitalSigns.oxygenSat)
  //           .map(d => ({ label: d.date, value: d.value }));

  //         const conditionData = Object.entries(conditionTypes)
  //           .map(([label, value]) => ({ 
  //             label, 
  //             value,
  //             color: label.includes('MI') ? '#e53e3e' : 
  //                    label.includes('Failure') ? '#dd6b20' : 
  //                    label.includes('Arrhythmia') ? '#d69e2e' : 
  //                    label.includes('Pain') ? '#38a169' : 
  //                    '#4299e1'
  //           }));

  //         // Clear loading state and render dashboard
  //         grid.innerHTML = '';
          
  //         // Create dashboard layout
  //         const dashboardLayout = document.createElement('div');
  //         dashboardLayout.className = 'emergency-dashboard-layout';
          
  //         // Add dashboard header with summary
  //         const dashboardHeader = document.createElement('div');
  //         dashboardHeader.className = 'dashboard-header';
  //         dashboardHeader.innerHTML = `
  //           <h2>Cardiac Unit Analytics</h2>
  //           <p class="dashboard-summary">
  //             Real-time insights into cardiac patient monitoring, vital signs,
  //             and treatment status to optimize cardiac care delivery.
  //           </p>
  //         `;
  //         dashboardLayout.appendChild(dashboardHeader);
          
  //         // Create main content grid
  //         const dashboardGrid = document.createElement('div');
  //         dashboardGrid.className = 'dashboard-grid';
          
  //         // Left column - Patient Status and Conditions
  //         const leftColumn = document.createElement('div');
  //         leftColumn.className = 'dashboard-column';
          
  //         // Add section header
  //         const statusHeader = document.createElement('div');
  //         statusHeader.className = 'dashboard-section-header';
  //         statusHeader.innerHTML = `
  //           <h3>Patient Status</h3>
  //           <p>Monitor current patient conditions and vital signs in the cardiac unit.</p>
  //         `;
  //         leftColumn.appendChild(statusHeader);
          
  //         // Add room status cards
  //         Object.entries(roomStatus).forEach(([room, status]) => {
  //           const roomCard = document.createElement('div');
  //           roomCard.className = 'room-status-card cardiac';
  //           roomCard.innerHTML = `
  //             <div class="room-header">
  //               <h4>${room}</h4>
  //               <span class="status-badge ${status.status.toLowerCase()}">${status.status}</span>
  //             </div>
  //             ${status.patient ? `
  //               <div class="room-details">
  //                 <p><strong>Patient:</strong> ${status.patient}</p>
  //                 <p><strong>Condition:</strong> ${status.condition}</p>
  //                 <p><strong>Time Remaining:</strong> ${status.timeRemaining} minutes</p>
  //                 <p><strong>Acuity Level:</strong> ${status.acuity}</p>
  //                 <div class="vitals-grid">
  //                   <div class="vital-item">
  //                     <span class="vital-label">HR</span>
  //                     <span class="vital-value ${getVitalStatus(status.vitals.heartRate, 'hr')}">${status.vitals.heartRate}</span>
  //                   </div>
  //                   <div class="vital-item">
  //                     <span class="vital-label">BP</span>
  //                     <span class="vital-value ${getVitalStatus(status.vitals.bloodPressure, 'bp')}">${status.vitals.bloodPressure}</span>
  //                   </div>
  //                   <div class="vital-item">
  //                     <span class="vital-label">O₂</span>
  //                     <span class="vital-value ${getVitalStatus(status.vitals.oxygenSat, 'o2')}">${status.vitals.oxygenSat}%</span>
  //                   </div>
  //                   <div class="vital-item">
  //                     <span class="vital-label">Rhythm</span>
  //                     <span class="vital-value ${getVitalStatus(status.vitals.rhythm, 'rhythm')}">${status.vitals.rhythm}</span>
  //                   </div>
  //                 </div>
  //               </div>
  //             ` : status.status === 'Cleaning' ? `
  //               <div class="room-details">
  //                 <p><strong>Status:</strong> Under Cleaning</p>
  //                 <p><strong>Time Remaining:</strong> ${status.timeRemaining} minutes</p>
  //               </div>
  //             ` : `
  //               <div class="room-details">
  //                 <p><strong>Status:</strong> Available</p>
  //                 <p><strong>Ready for next patient</strong></p>
  //               </div>
  //             `}
  //           `;
  //           leftColumn.appendChild(roomCard);
  //         });
          
  //         // Add columns to grid
  //         dashboardGrid.appendChild(leftColumn);
  //         dashboardGrid.appendChild(rightColumn);
  //         dashboardLayout.appendChild(dashboardGrid);
          
  //         // Add dashboard footer with insights
  //         const dashboardFooter = document.createElement('div');
  //         dashboardFooter.className = 'dashboard-footer';
  //         dashboardFooter.innerHTML = `
  //           <h3>Key Insights</h3>
  //           <ul class="insights-list">
  //             <li>
  //               <i class="fas fa-x-ray"></i>
  //               <span>Most common exam: ${getMostCommonExam(imagingData)}</span>
  //             </li>
  //             <li>
  //               <i class="fas fa-clock"></i>
  //               <span>Average wait time: ${getAverageWaitTime(queueData)} minutes</span>
  //             </li>
  //             <li>
  //               <i class="fas fa-cogs"></i>
  //               <span>Machine utilization: ${getMachineUtilization(machineStatus)}%</span>
  //             </li>
  //           </ul>
  //         `;
  //         dashboardLayout.appendChild(dashboardFooter);
          
  //         grid.appendChild(dashboardLayout);
          
  //         // Helper functions for insights
  //         function getMostCommonExam(data) {
  //           const maxExam = data.reduce((max, curr) => 
  //             curr.value > max.value ? curr : max
  //           );
  //           return `${maxExam.label} (${maxExam.value} exams)`;
  //         }
          
  //         function getAverageWaitTime(data) {
  //           const waiting = data.find(d => d.label === 'Waiting')?.value || 0;
  //           const inProgress = data.find(d => d.label === 'In Progress')?.value || 0;
  //           const total = waiting + inProgress;
  //           return total ? Math.round((waiting * 30 + inProgress * 15) / total) : 0;
  //         }
          
  //         function getMachineUtilization(status) {
  //           const activeMachines = Object.values(status).filter(m => m.status === 'Active').length;
  //           const totalMachines = Object.keys(status).length;
  //           return Math.round((activeMachines / totalMachines) * 100);
  //         }
  //       } catch (error) {
  //         console.error('Error processing X-Ray department data:', error);
  //         grid.innerHTML = `
  //           <div class="dashboard-error">
  //             <i class="fas fa-exclamation-triangle"></i>
  //             <p>Error processing X-Ray department data. Please try again later.</p>
  //             <p class="error-details">${error.message}</p>
  //           </div>
  //         `;
  //       }
  //     }).catch(error => {
  //       console.error('Error loading X-Ray department data:', error);
  //       grid.innerHTML = `
  //         <div class="dashboard-error">
  //           <i class="fas fa-exclamation-triangle"></i>
  //           <p>Error loading X-Ray department data. Please try again later.</p>
  //           <p>Error loading emergency department data. Please try again later.</p>
  //           <p class="error-details">${error.message}</p>
  //         </div>
  //       `;
  //     });
  //     return;
  //   }
    
    // ... fallback for other rooms ...
    // ... existing code ...


  // Helper function to create dashboard cards
  // function createDashboardCard(title, description, data, chartType, colors, xTitle, yTitle) {
  //   const card = document.createElement('div');
  //   card.className = 'dashboard-card';
  //   card.innerHTML = `
  //     <div class="dashboard-card-title">${title}</div>
  //     <div class="dashboard-card-desc">${description}</div>
  //     <div class="dashboard-chart"></div>
  //   `;
    
  //   const chartDiv = card.querySelector('.dashboard-chart');
  //   renderD3Chart(chartDiv, {
  //     type: chartType,
  //     data: data,
  //     color: colors,
  //     xTitle: xTitle,
  //     yTitle: yTitle,
  //     legend: [{ label: yTitle, color: colors[0] }]
  //   });
    
  //   return card;
  // }

  // function updateConditionInfo(condition) {
  //   const conditionInfo = document.getElementById('conditionInfo');
  //   if (!conditionInfo) return;

  //   if (condition === 'default') {
  //     conditionInfo.innerHTML = `
  //       <div class="info-content">
  //         <div class="info-icon"><i class="fas fa-info-circle"></i></div>
  //         <div class="info-text">
  //           <p class="info-title">Get Started</p>
  //           <p class="info-description">Choose a condition above to see the patient journey</p>
  //         </div>
  //       </div>
  //     `;
  //     return;
  //   }

  //   const conditionNames = {
  //     broken_bone: 'Broken Bone Treatment',
  //     chest_pain: 'Chest Pain Evaluation',
  //     head_injury: 'Head Injury Assessment',
  //     kidney_infection: 'Kidney Infection Care',
  //     abdominal_pain: 'Abdominal Pain Diagnosis'
  //   };

  //   const conditionName = conditionNames[condition] || condition;
    
  //   conditionInfo.innerHTML = `
  //     <div class="info-content">
  //       <div class="info-icon"><i class="fas fa-route"></i></div>
  //       <div class="info-text">
  //         <p class="info-title">${conditionName}</p>
  //         <p class="info-description">Patient journey path is highlighted. Use room navigation to explore.</p>
  //       </div>
  //     </div>
  //   `;
  // }

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

  // function selectCondition(value) {
  //   const conditionSelect = document.getElementById('conditionSelect');
  //   if (conditionSelect) {
  //     conditionSelect.value = value;
  //     conditionSelect.dispatchEvent(new Event('change'));
  //   }
  // }

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
      // Add subtle pulsing to colored room elements
      if (child.isMesh && child.material && child.material.emissive) {
        const emissiveIntensity = 0.05 + 0.02 * Math.sin(time * 1.5 + child.position.x * 0.1);
        child.material.emissive.multiplyScalar(emissiveIntensity / child.material.emissive.length());
      }
    });

    renderer.render(scene, camera);
  }

  // Initialize
  initializeThemeToggle();
  animate();

  // ... rest of the code ...
});

// Utility to render a D3 chart (currently supports bar charts; extend for more types)
function renderD3Chart(container, config) {
  if (!container || !config || !config.data || !config.data.length) return;

  // Clear previous content
  container.innerHTML = '';

  // Set up dimensions and margins
  const margin = { top: 40, right: 30, bottom: 60, left: 60 };
  const aspectRatio = 0.6;
  const containerWidth = container.clientWidth;
  const containerHeight = Math.min(containerWidth * aspectRatio, container.clientHeight);
  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;

  // Create SVG with responsive viewBox
    const svg = d3.select(container)
      .append('svg')
    .attr('class', 'chart-svg')
    .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  // Add chart group
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Process data to ensure valid values
  const processedData = config.data.map(d => ({
    ...d,
    value: Math.max(0, parseFloat(d.value) || 0), // Ensure non-negative values
    label: d.label
  })).filter(d => !isNaN(d.value));

  if (processedData.length === 0) {
    container.innerHTML = '<div class="chart-error">No valid data available</div>';
    return;
  }

  if (config.type === 'bar') {
    // For bar charts, ensure y scale starts at 0 and has proper padding
    const x = d3.scaleBand()
      .domain(processedData.map(d => d.label))
      .range([0, width])
      .padding(0.2);

    // Calculate y domain with proper padding
    const maxValue = d3.max(processedData, d => d.value);
    const yPadding = maxValue * 0.1; // 10% padding at top
    const y = d3.scaleLinear()
      .domain([0, maxValue + yPadding])
      .range([height, 0])
      .nice();

    // Add grid lines
    g.append('g')
      .attr('class', 'd3-grid')
      .call(d3.axisLeft(y)
        .ticks(5)
        .tickSize(-width)
        .tickFormat(''));

    // Add axes
    g.append('g')
      .attr('class', 'd3-axis x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');

    g.append('g')
      .attr('class', 'd3-axis y-axis')
      .call(d3.axisLeft(y)
        .ticks(5));

    // Add axis labels
    g.append('text')
      .attr('class', 'd3-axis-label')
      .attr('x', width / 2)
      .attr('y', height + margin.bottom - 10)
      .style('text-anchor', 'middle')
      .text(config.xTitle || '');

    g.append('text')
      .attr('class', 'd3-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -margin.left + 15)
      .style('text-anchor', 'middle')
      .text(config.yTitle || '');

    // Add bars with proper height calculation
    const bars = g.selectAll('.d3-bar')
      .data(processedData)
      .enter()
      .append('rect')
      .attr('class', 'd3-bar')
      .attr('x', d => x(d.label))
      .attr('width', x.bandwidth())
      .attr('fill', (d, i) => {
        if (Array.isArray(config.color)) {
          return config.color[i % config.color.length];
        }
        return config.color || '#4299e1';
      });

    // Set bar heights after ensuring y scale is properly set up
    bars
      .attr('y', d => y(d.value))
      .attr('height', d => Math.max(0, height - y(d.value))); // Ensure non-negative height

    // Add hover effects
    const tooltip = d3.select(container)
      .append('div')
      .attr('class', 'd3-tooltip')
      .style('opacity', 0);

    bars
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.8);

        tooltip
          .style('opacity', 1)
          .html(`
            <div class="tooltip-title">${d.label}</div>
            <div class="tooltip-value">${d.value.toLocaleString()}</div>
          `)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 28}px`);
      })
      .on('mouseout', function() {
        d3.select(this)
      .transition()
          .duration(200)
          .attr('opacity', 1);

        tooltip.style('opacity', 0);
      });

    // Add chart title
    g.append('text')
      .attr('class', 'chart-title')
      .attr('x', width / 2)
      .attr('y', -margin.top / 2)
      .style('text-anchor', 'middle')
      .style('font-size', '1.1em')
      .style('font-weight', '600')
      .text(config.title || '');

    // Add responsive behavior
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        const newHeight = Math.min(newWidth * aspectRatio, entry.contentRect.height);
        
        svg
          .attr('viewBox', `0 0 ${newWidth} ${newHeight}`)
          .attr('width', '100%')
          .attr('height', '100%');

        const newInnerWidth = newWidth - margin.left - margin.right;
        const newInnerHeight = newHeight - margin.top - margin.bottom;

        // Update scales
        x.range([0, newInnerWidth]);
        y.range([newInnerHeight, 0]);

        // Update axes
        g.select('.d3-axis.x-axis')
          .attr('transform', `translate(0,${newInnerHeight})`)
          .call(d3.axisBottom(x));

        g.select('.d3-axis.y-axis')
          .call(d3.axisLeft(y));

        // Update bars
        g.selectAll('.d3-bar')
          .attr('x', d => x(d.label))
          .attr('width', x.bandwidth())
      .attr('y', d => y(d.value))
          .attr('height', d => Math.max(0, newInnerHeight - y(d.value))); // Ensure non-negative height
      }
    });

    resizeObserver.observe(container);
  } else if (config.type === 'line') {
    // Handle line charts using the existing renderD3LineChart function
    renderD3LineChart(container, config.data, {
      color: config.color,
      title: config.title,
      yTitle: config.yTitle
    });
  }
}



function renderD3LineChart(container, data, config = {}) {
  console.log('renderD3LineChart called with:', {
    containerExists: !!container,
    dataLength: data?.length,
    config
  });

  if (!container || !data || !data.length) {
    console.warn('Invalid input for renderD3LineChart:', { container, dataLength: data?.length });
    return;
  }

  // Clear previous content
  container.innerHTML = '';



  // Set up dimensions and margins
  const margin = { top: 60, right: 100, bottom: 70, left: 90 };
  const aspectRatio = 0.6;
  const containerWidth = container.clientWidth;
  const containerHeight = Math.min(containerWidth * aspectRatio, container.clientHeight);
  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;

  // Create SVG with responsive viewBox
  const svg = d3.select(container)
    .append('svg')
    .attr('class', 'chart-svg')
    .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  // Add chart group
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Process data
  const processedData = data.map(d => ({
    ...d,
    date: new Date(d.label),
    value: parseFloat(d.value) || 0,
    systolic: parseFloat(d.systolic) || 0,
    diastolic: parseFloat(d.diastolic) || 0
  })).filter(d => !isNaN(d.value) || !isNaN(d.systolic));

  // Create scales
  const x = d3.scaleTime()
    .domain(d3.extent(processedData, d => d.date))
    .range([0, width])
    .nice();

  // For blood pressure chart, use both systolic and diastolic values
  const isBloodPressure = processedData.some(d => !isNaN(d.systolic));
  const y = d3.scaleLinear()
    .domain([
      0,
      isBloodPressure 
        ? Math.max(
            d3.max(processedData, d => d.systolic || 0),
            d3.max(processedData, d => d.diastolic || 0)
          ) * 1.1
        : d3.max(processedData, d => d.value) * 1.1
    ])
    .range([height, 0])
    .nice();

  // Add grid lines
  g.append('g')
    .attr('class', 'd3-grid')
    .call(d3.axisLeft(y)
      .ticks(5)
      .tickSize(-width)
      .tickFormat(''));

  // Add axes
  g.append('g')
    .attr('class', 'd3-axis x-axis')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x)
      .ticks(5)
      .tickFormat(d3.timeFormat('%b %d')));

  g.append('g')
    .attr('class', 'd3-axis y-axis')
    .call(d3.axisLeft(y)
      .ticks(5));

  // Add axis labels
  g.append('text')
    .attr('class', 'd3-axis-label')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom - 15)
    .style('text-anchor', 'middle')
    .style('fill', 'var(--text-primary)')
    .style('font-size', '0.9rem')
    .style('font-weight', '500')
    .text('Date');

  g.append('text')
    .attr('class', 'd3-axis-label')
    .attr('transform', `rotate(-90) translate(${-height/2}, ${-margin.left + 25})`)
    .style('text-anchor', 'middle')
    .style('fill', 'var(--text-primary)')
    .style('font-size', '0.9rem')
    .style('font-weight', '500')
    .text(config.yTitle || 'Value');

  // Create line generator
  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(isBloodPressure ? d.systolic : d.value))
    .curve(d3.curveMonotoneX);

  // Add the line path
  g.append('path')
    .datum(processedData)
    .attr('class', 'd3-line')
    .attr('fill', 'none')
    .attr('stroke', config.color || '#4299e1')
    .attr('stroke-width', 2)
    .attr('d', line);

  // Add data points
  const points = g.selectAll('.data-point')
    .data(processedData)
    .enter()
    .append('circle')
    .attr('class', 'data-point')
    .attr('cx', d => x(d.date))
    .attr('cy', d => y(isBloodPressure ? d.systolic : d.value))
    .attr('r', 4)
    .attr('fill', config.color || '#4299e1')
    .attr('opacity', 0.7);

  // For blood pressure, add diastolic line and points
  if (isBloodPressure) {
    const diastolicLine = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.diastolic))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(processedData)
      .attr('class', 'd3-line diastolic')
      .attr('fill', 'none')
      .attr('stroke', '#f6ad55')
      .attr('stroke-width', 2)
      .attr('d', diastolicLine);

    g.selectAll('.diastolic-point')
      .data(processedData)
      .enter()
      .append('circle')
      .attr('class', 'data-point diastolic')
      .attr('cx', d => x(d.date))
      .attr('cy', d => y(d.diastolic))
      .attr('r', 4)
      .attr('fill', '#f6ad55')
      .attr('opacity', 0.7);

    // Add legend
    const legend = g.append('g')
      .attr('class', 'd3-legend')
      .attr('transform', `translate(${width - 140}, 30)`);

    // Add legend background
    legend.append('rect')
      .attr('x', -15)
      .attr('y', -15)
      .attr('width', 130)
      .attr('height', 70)
      .attr('fill', 'var(--glass-bg)')
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('stroke', 'var(--glass-border)')
      .attr('stroke-width', 1);

    // Add legend items
    const systolicGroup = legend.append('g')
      .attr('class', 'systolic')
      .attr('transform', 'translate(0, 0)');

    systolicGroup.append('line')
      .attr('x1', 0)
      .attr('y1', 6)
      .attr('x2', 20)
      .attr('y2', 6)
      .attr('stroke', config.color || '#4299e1')
      .attr('stroke-width', 2);

    systolicGroup.append('text')
      .attr('x', 30)
      .attr('y', 10)
      .attr('fill', 'var(--text-primary)')
      .attr('font-size', '0.9rem')
      .text('Systolic');

    const diastolicGroup = legend.append('g')
      .attr('class', 'diastolic')
      .attr('transform', 'translate(0, 25)');

    diastolicGroup.append('line')
      .attr('x1', 0)
      .attr('y1', 6)
      .attr('x2', 20)
      .attr('y2', 6)
      .attr('stroke', '#f6ad55')
      .attr('stroke-width', 2);

    diastolicGroup.append('text')
      .attr('x', 30)
      .attr('y', 10)
      .attr('fill', 'var(--text-primary)')
      .attr('font-size', '0.9rem')
      .text('Diastolic');
  }

  // Add chart title
  g.append('text')
    .attr('class', 'chart-title')
    .attr('x', width / 2)
    .attr('y', -margin.top / 2)
    .style('text-anchor', 'middle')
    .style('font-size', '1.2rem')
    .style('font-weight', '600')
    .style('fill', 'var(--text-primary)')
    .text(config.title || '');

  // Add hover effects and tooltip


  const handleMouseOver = (event, d) => {
    d3.select(event.target)
      .transition()
      .duration(200)
      .attr('r', 6)
      .attr('opacity', 1);

    tooltip
      .style('opacity', 1)
      .html(`
        <div class="tooltip-title">${d3.timeFormat('%b %d, %Y')(d.date)}</div>
        ${isBloodPressure 
          ? `<div class="tooltip-value">Systolic: ${d.systolic} mmHg</div>
             <div class="tooltip-value">Diastolic: ${d.diastolic} mmHg</div>`
          : `<div class="tooltip-value">${d.value.toFixed(1)} ${config.yTitle || ''}</div>`
        }
      `)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 28}px`);
  };

  const handleMouseOut = (event) => {
    d3.select(event.target)
      .transition()
      .duration(200)
      .attr('r', 4)
      .attr('opacity', 0.7);

    tooltip.style('opacity', 0);
  };

  points.on('mouseover', handleMouseOver)
    .on('mouseout', handleMouseOut);

  if (isBloodPressure) {
    g.selectAll('.diastolic-point')
      .on('mouseover', handleMouseOver)
      .on('mouseout', handleMouseOut);
  }

  // Add responsive behavior
  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const newWidth = entry.contentRect.width;
      const newHeight = Math.min(newWidth * aspectRatio, entry.contentRect.height);
      
      svg
        .attr('viewBox', `0 0 ${newWidth} ${newHeight}`)
        .attr('width', '100%')
        .attr('height', '100%');

      const newInnerWidth = newWidth - margin.left - margin.right;
      const newInnerHeight = newHeight - margin.top - margin.bottom;

      // Update scales
      x.range([0, newInnerWidth]);
      y.range([newInnerHeight, 0]);

      // Update axes
      g.select('.x-axis')
        .attr('transform', `translate(0,${newInnerHeight})`)
        .call(d3.axisBottom(x)
          .ticks(5)
          .tickFormat(d3.timeFormat('%b %d')));

      g.select('.y-axis')
        .call(d3.axisLeft(y)
          .ticks(5));

      // Update line
      g.select('.d3-line')
        .attr('d', line);

      // Update points
      g.selectAll('.data-point')
        .attr('cx', d => x(d.date))
        .attr('cy', d => y(isBloodPressure ? d.systolic : d.value));

      // Update legend position
      if (isBloodPressure) {
        g.select('.d3-legend')
          .attr('transform', `translate(${newInnerWidth - 140}, 30)`);
      }

      // Update y-axis label position
      g.select('.d3-axis-label[transform*="rotate(-90)"]')
        .attr('transform', `rotate(-90) translate(${-newInnerHeight/2}, ${-margin.left + 25})`);
    }
  });

  resizeObserver.observe(container);

  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.5, 10])
    .translateExtent([[0, 0], [width, height]])
    .on('zoom', (event) => {
      const newX = event.transform.rescaleX(x);
      const newY = event.transform.rescaleY(y);

      // Update axes
      g.select('.x-axis').call(d3.axisBottom(newX));
      g.select('.y-axis').call(d3.axisLeft(newY));

      // Update line
      const newLine = d3.line()
        .x(d => newX(d.date))
        .y(d => newY(isBloodPressure ? d.systolic : d.value))
        .curve(d3.curveMonotoneX);

      g.select('.d3-line')
        .attr('d', newLine);

      // Update points
      g.selectAll('.data-point')
        .attr('cx', d => newX(d.date))
        .attr('cy', d => newY(isBloodPressure ? d.systolic : d.value));

      if (isBloodPressure) {
        const newDiastolicLine = d3.line()
          .x(d => newX(d.date))
          .y(d => newY(d.diastolic))
          .curve(d3.curveMonotoneX);

        g.selectAll('.d3-line.diastolic')
          .attr('d', newDiastolicLine);

        g.selectAll('.diastolic-point')
          .attr('cx', d => newX(d.date))
          .attr('cy', d => newY(d.diastolic));
      }
    });

  svg.call(zoom);

  // Add brush for selection
  const brush = d3.brushX()
    .extent([[0, 0], [width, height]])
    .on('end', (event) => {
      if (!event.selection) return;

      const [x0, x1] = event.selection;
      const newDomain = [x.invert(x0), x.invert(x1)];
      
      // Update x scale domain
      x.domain(newDomain);
      
      // Update axes and lines
      g.select('.x-axis').call(d3.axisBottom(x));
      g.select('.d3-line').attr('d', line);
      g.selectAll('.data-point')
        .attr('cx', d => x(d.date))
        .attr('cy', d => y(isBloodPressure ? d.systolic : d.value));

      if (isBloodPressure) {
        g.selectAll('.d3-line.diastolic')
          .attr('d', diastolicLine);
        g.selectAll('.diastolic-point')
          .attr('cx', d => x(d.date))
          .attr('cy', d => y(d.diastolic));
      }
    });

  // Add brush group
  const brushGroup = g.append('g')
    .attr('class', 'brush')
    .call(brush);

  // Enhanced tooltip with more information
  const tooltip = d3.select(container)
    .append('div')
    .attr('class', 'd3-tooltip')
    .style('opacity', 0);

  // Add vertical line for hover
  const hoverLine = g.append('line')
    .attr('class', 'hover-line')
    .attr('stroke', 'var(--text-secondary)')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4,4')
    .style('opacity', 0);

  // Enhanced mouse move handler
  const handleMouseMove = (event) => {
    const [mouseX, mouseY] = d3.pointer(event);
    const x0 = x.invert(mouseX);
    
    // Find closest data point
    const bisect = d3.bisector(d => d.date).left;
    const i = bisect(processedData, x0, 1);
    const d0 = processedData[i - 1];
    const d1 = processedData[i];
    const d = x0 - d0.date > d1.date - x0 ? d1 : d0;

    // Update hover line
    hoverLine
      .attr('x1', x(d.date))
      .attr('x2', x(d.date))
      .attr('y1', 0)
      .attr('y2', height)
      .style('opacity', 1);

    // Update tooltip using the existing tooltip instance
    tooltip
      .style('opacity', 1)
      .html(`
        <div class="tooltip-title">
          <i class="fas fa-calendar"></i>
          ${d3.timeFormat('%B %d, %Y')(d.date)}
        </div>
        ${isBloodPressure 
          ? `<div class="tooltip-value">
               <i class="fas fa-heartbeat"></i>
               Systolic: ${d.systolic} mmHg
             </div>
             <div class="tooltip-value">
               <i class="fas fa-heartbeat"></i>
               Diastolic: ${d.diastolic} mmHg
             </div>
             <div class="tooltip-value">
               <i class="fas fa-calculator"></i>
               Pulse Pressure: ${d.systolic - d.diastolic} mmHg
             </div>`
          : `<div class="tooltip-value">
               <i class="fas fa-chart-line"></i>
               ${d.value.toFixed(1)} ${config.yTitle || ''}
             </div>
             <div class="tooltip-value">
               <i class="fas fa-clock"></i>
               Time: ${d3.timeFormat('%I:%M %p')(d.date)}
             </div>`
        }
        <div class="tooltip-actions">
          <button class="tooltip-action-btn" onclick="zoomToPoint(${d.date.getTime()})">
            <i class="fas fa-search-plus"></i> Zoom
          </button>
          <button class="tooltip-action-btn" onclick="resetZoom()">
            <i class="fas fa-undo"></i> Reset
          </button>
        </div>
      `)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 28}px`);
  };

  // Add mouse move handler to chart area
  svg.on('mousemove', handleMouseMove)
    .on('mouseleave', () => {
      hoverLine.style('opacity', 0);
      tooltip.style('opacity', 0);
    });

  // Add zoom to point function
  window.zoomToPoint = (timestamp) => {
    const point = new Date(timestamp);
    const scale = 2;
    const x0 = x(point);
    const y0 = y(isBloodPressure ? processedData.find(d => d.date.getTime() === timestamp).systolic : processedData.find(d => d.date.getTime() === timestamp).value);
    
    svg.transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity
        .translate(width/2, height/2)
        .scale(scale)
        .translate(-x0, -y0));
  };

  // Add reset zoom function
  window.resetZoom = () => {
    svg.transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity);
  };

  // Add keyboard shortcuts
  document.addEventListener('keydown', (event) => {
    if (event.key === 'r' || event.key === 'R') {
      resetZoom();
    }
  });

  // Add legend interactivity
  if (isBloodPressure) {
    const legend = g.select('.d3-legend');
    
    legend.selectAll('g')
      .on('click', function(event, d) {
        const lineClass = this.classList.contains('systolic') ? '.d3-line.systolic' : '.d3-line.diastolic';
        const pointsClass = this.classList.contains('systolic') ? '.data-point.systolic' : '.data-point.diastolic';
        
        const isVisible = d3.select(lineClass).style('opacity') !== '0';
        d3.select(lineClass).style('opacity', isVisible ? 0 : 1);
        d3.selectAll(pointsClass).style('opacity', isVisible ? 0 : 0.7);
        d3.select(this).style('opacity', isVisible ? 0.5 : 1);
      });
  }

  // ... rest of the existing code (resize observer, etc.) ...
}

// ... existing code ...


// ... rest of the code ...

// Update the vitals section to render the charts
console.log('Starting chart rendering...');

const bmiChart = document.getElementById('bmiChart');
const weightChart = document.getElementById('weightChart');
const bpChart = document.getElementById('bpChart');

console.log('Chart containers found:', {
  bmiChart: !!bmiChart,
  weightChart: !!weightChart,
  bpChart: !!bpChart
});

if (bmiChart && bmiTrend.length) {
  console.log('Rendering BMI chart with', bmiTrend.length, 'data points');
  try {
    bmiChart.querySelector('.chart-loading').remove();
    renderD3LineChart(bmiChart, bmiTrend, {
      color: '#4299e1',
      title: 'BMI Trend',
      yTitle: 'BMI (kg/m²)'
    });
    console.log('BMI chart rendered successfully');
  } catch (error) {
    console.error('Error rendering BMI chart:', error);
  }
}

if (weightChart && weightTrend.length) {
  console.log('Rendering weight chart with', weightTrend.length, 'data points');
  try {
    weightChart.querySelector('.chart-loading').remove();
    renderD3LineChart(weightChart, weightTrend, {
      color: '#68d391',
      title: 'Weight Trend',
      yTitle: 'Weight (lbs)'
    });
    console.log('Weight chart rendered successfully');
  } catch (error) {
    console.error('Error rendering weight chart:', error);
  }
}

if (bpChart && bpTrend.length) {
  console.log('Rendering blood pressure chart with', bpTrend.length, 'data points');
  try {
    bpChart.querySelector('.chart-loading').remove();
    renderD3LineChart(bpChart, bpTrend, {
      color: '#fc8181',
      title: 'Blood Pressure Trend',
      yTitle: 'mmHg'
    });
    console.log('Blood pressure chart rendered successfully');
  } catch (error) {
    console.error('Error rendering blood pressure chart:', error);
  }
}

// ... rest of the code ...