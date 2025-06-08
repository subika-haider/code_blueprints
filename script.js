import * as THREE from 'https://esm.sh/three@0.150.1';
import { OrbitControls } from 'https://esm.sh/three@0.150.1/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://esm.sh/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import * as TWEEN from 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.esm.js';
import roomContent from './room-content.js';
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
    const roomSelectionPanel = document.getElementById('roomSelectionPanel');
    
    if (!condition || condition === 'default') {
      if (roomSelectionPanel) roomSelectionPanel.classList.remove('visible');
      resetToDefaultView();
      updateConditionInfo('default');
      resetToProjectOverview();
      // Hide all cubes
      roomCubes.forEach((cubes, roomType) => {
        manipulateCube(roomType, 'hide');
      });

      return;
    }

    const roomSequences = {
      broken_bone:     ['waiting_area', 'reception', 'triage', 'emergency', 'staff_room', 'discharge'],
      chest_pain:      ['waiting_area', 'reception', 'triage', 'emergency', 'icu', 'discharge'],
      head_injury:     ['waiting_area', 'reception', 'triage', 'icu', 'staff_room', 'discharge'],
      kidney_infection:['waiting_area', 'reception', 'triage', 'emergency', 'staff_room', 'discharge'],
      abdominal_pain:  ['waiting_area', 'reception', 'triage', 'emergency', 'icu', 'discharge']
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

    populateRoomSelectionPanel(sequence);
    updateConditionInfo(condition);
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
  function populateRoomSelectionPanel(sequence) {
    const roomSelectionPanel = document.getElementById('roomSelectionPanel');
    const roomButtons = document.getElementById('roomButtons');
    
    if (!roomSelectionPanel || !roomButtons) return;

    roomButtons.innerHTML = '';
    
    const panelSubtitle = roomSelectionPanel.querySelector('.panel-subtitle');
    if (panelSubtitle) panelSubtitle.textContent = `${sequence.length} locations`;

    sequence.forEach((roomType, index) => {
      const roomBtn = document.createElement('button');
      roomBtn.className = 'room-btn';
      roomBtn.dataset.roomType = roomType;
      
      const displayName = roomType.charAt(0).toUpperCase() + roomType.slice(1).replace(/_/g, ' ');
      
      roomBtn.innerHTML = `
        <div class="room-btn-content">
          <div class="room-number">${index + 1}</div>
          <div class="room-name">${displayName}</div>
        </div>
      `;
      


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

  // Content updates
  function updateRoomContent(roomType) {
    const content = roomContent[roomType];
    if (!content) return;

    const projectOverview = document.querySelector('.content-section');
    if (!projectOverview) return;

    // --- Full Dashboard Layout ---
    let dashboardHtml = `
      <div class="room-dashboard">
        <div class="dashboard-hero-card dashboard-card">
          <div class="dashboard-card-title">${content.title}</div>
          <div class="dashboard-card-desc">
              <p class="room-description">${content.description}</p>
            <div class="dashboard-hero-stats">
              <div><strong>Key Features:</strong> ${content.features.join(', ')}</div>
              <div><strong>Staff:</strong> ${content.staff.join(', ')}</div>
            </div>
              ${content.additionalHtml || ''}
            </div>
                  </div>
        <div class="dashboard-grid" id="roomDashboardGrid-${roomType}"></div>
      </div>
    `;

    projectOverview.innerHTML = dashboardHtml;

    // Fade-in animation
    const dashboard = projectOverview.querySelector('.room-dashboard');
    if (dashboard) {
      dashboard.style.opacity = '0';
      dashboard.style.transform = 'translateY(20px)';
      setTimeout(() => {
        dashboard.style.transition = 'opacity 0.4s, transform 0.4s';
        dashboard.style.opacity = '1';
        dashboard.style.transform = 'translateY(0)';
      }, 50);
    }
    
    // Render dashboard visualizations and cards
    setTimeout(() => createRoomDashboard(roomType, true), 100);
  }

  // Room-specific visualization functions

  function createRoomDashboard(roomType, fullSection = false) {
    const grid = fullSection
      ? document.getElementById(`roomDashboardGrid-${roomType}`)
      : (() => {
          const container = document.getElementById(`roomVisualization-${roomType}`);
          if (!container) return null;
          container.innerHTML = '';
          const grid = document.createElement('div');
          grid.className = 'dashboard-grid';
          container.appendChild(grid);
          return grid;
        })();
    if (!grid) return;

    // Emergency Department: Use real data from CSVs only
    if (roomType === 'emergency') {
      // Load and parse CSVs using d3-fetch (async)
      Promise.all([
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/transfers.csv'),
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/services.csv'),
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/omr.csv')
      ]).then(([transfers, services, omr]) => {
        // --- DEBUG LOGGING ---
        console.log('Loaded transfers.csv:', transfers.slice(0, 5));
        console.log('Loaded services.csv:', services.slice(0, 5));
        console.log('Loaded omr.csv:', omr.slice(0, 5));
        // --- Patient Arrivals by Hour ---
        const edRows = transfers.filter(r => r.careunit === 'Emergency Department');
        console.log('Filtered ED rows:', edRows.slice(0, 5), 'Total:', edRows.length);
        const arrivalsByHour = Array(24).fill(0);
        edRows.forEach(row => {
          if (!row.intime) return;
          const hour = new Date(row.intime.replace(' ', 'T')).getHours();
          arrivalsByHour[hour]++;
        });
        console.log('Arrivals by hour:', arrivalsByHour);
        const flowData = arrivalsByHour.map((count, hour) => ({ label: hour + ':00', value: count }));
        // --- Length of Stay ---
        const stays = edRows.map(row => {
          if (!row.intime || !row.outtime) return null;
          const inTime = new Date(row.intime.replace(' ', 'T'));
          const outTime = new Date(row.outtime.replace(' ', 'T'));
          return (outTime - inTime) / (1000 * 60 * 60);
        }).filter(h => h !== null && h > 0 && h < 48);
        console.log('Length of stay (hours):', stays.slice(0, 10));
        const stayBuckets = Array(12).fill(0);
        stays.forEach(h => {
          const idx = Math.min(Math.floor(h / 2), 11);
          stayBuckets[idx]++;
        });
        const stayData = stayBuckets.map((count, i) => ({ range: `${i*2}-${i*2+2}h`, count }));
        // --- Careunit Flow ---
        const careunitCounts = {};
        for (let i = 0; i < transfers.length; i++) {
          const row = transfers[i];
          if (row.careunit === 'Emergency Department' && row.outtime) {
            // Find the next row for the same subject/hadm with a later intime
            const next = transfers.find(r => r.subject_id === row.subject_id && r.hadm_id === row.hadm_id && r.intime && new Date(r.intime.replace(' ', 'T')) > new Date(row.outtime.replace(' ', 'T')));
            if (next && next.careunit) {
              careunitCounts[next.careunit] = (careunitCounts[next.careunit] || 0) + 1;
            }
          }
        }
        console.log('Careunit flow counts:', careunitCounts);
        const careunitData = Object.entries(careunitCounts).map(([label, value]) => ({ label, value }));
        // --- Service Distribution ---
        const edHadmIds = new Set(edRows.map(r => r.hadm_id));
        const serviceCounts = {};
        services.forEach(row => {
          if (edHadmIds.has(row.hadm_id)) {
            const svc = row.curr_service || 'Unknown';
            serviceCounts[svc] = (serviceCounts[svc] || 0) + 1;
          }
        });
        const serviceData = Object.entries(serviceCounts).map(([label, value]) => ({ label, value }));
        // --- Vitals Trend (BMI, Weight, BP) ---
        // Use the most recent 20 BMI, Weight, BP for patients seen in ED
        const edSubjectIds = new Set(edRows.map(r => r.subject_id));
        const vitals = { BMI: [], Weight: [], BP: [] };
        omr.forEach(row => {
          if (!edSubjectIds.has(row.subject_id)) return;
          if (row.result_name === 'BMI (kg/m2)') vitals.BMI.push({ date: row.chartdate, value: parseFloat(row.result_value) });
          if (row.result_name === 'Weight (Lbs)') vitals.Weight.push({ date: row.chartdate, value: parseFloat(row.result_value) });
          if (row.result_name === 'Blood Pressure') vitals.BP.push({ date: row.chartdate, value: row.result_value });
        });
        // Sort and take most recent 20 for each
        const sortByDate = arr => arr.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20).reverse();
        const bmiTrend = sortByDate(vitals.BMI).map(d => ({ label: d.date, value: d.value }));
        const weightTrend = sortByDate(vitals.Weight).map(d => ({ label: d.date, value: d.value }));
        // For BP, split systolic/diastolic
        const bpTrend = sortByDate(vitals.BP).map(d => {
          const [sys, dia] = (d.value || '').split('/').map(Number);
          return { label: d.date, systolic: sys, diastolic: dia };
        });
        // --- Render charts ---
        grid.innerHTML = '';
        // Patient Arrivals by Hour
        const flowCard = document.createElement('div');
        flowCard.className = 'dashboard-card';
        flowCard.innerHTML = `<div class=\"dashboard-card-title\">Patient Arrivals by Hour</div><div class=\"dashboard-card-desc\">Shows when the ED is busiest, based on real transfer data.</div>`;
        const flowDiv = document.createElement('div');
        flowDiv.className = 'dashboard-chart';
        flowCard.appendChild(flowDiv);
        grid.appendChild(flowCard);
        renderD3Chart(flowDiv, {
          type: 'bar',
          data: flowData,
          color: ['#fc8181'],
          xTitle: 'Hour of Day',
          yTitle: 'Arrivals',
          legend: [{ label: 'Arrivals', color: '#fc8181' }]
        });
        renderD3Legend(flowDiv, [{ label: 'Arrivals', color: '#fc8181' }]);
        // Length of Stay
        const stayCard = document.createElement('div');
        stayCard.className = 'dashboard-card';
        stayCard.innerHTML = `<div class=\"dashboard-card-title\">Length of Stay Distribution</div><div class=\"dashboard-card-desc\">How long patients typically spend in the ED.</div>`;
        const stayDiv = document.createElement('div');
        stayDiv.className = 'dashboard-chart';
        stayCard.appendChild(stayDiv);
        grid.appendChild(stayCard);
        renderD3Chart(stayDiv, {
          type: 'bar',
          data: stayData.map(d => ({ label: d.range, value: d.count })),
          color: ['#63b3ed'],
          xTitle: 'Stay (hours)',
          yTitle: 'Patients',
          legend: [{ label: 'Patients', color: '#63b3ed' }]
        });
        renderD3Legend(stayDiv, [{ label: 'Patients', color: '#63b3ed' }]);
        // Careunit Flow
        const careunitCard = document.createElement('div');
        careunitCard.className = 'dashboard-card';
        careunitCard.innerHTML = `<div class=\"dashboard-card-title\">Careunit Flow</div><div class=\"dashboard-card-desc\">Where do patients go after the ED? Top next care units.</div>`;
        const careunitDiv = document.createElement('div');
        careunitDiv.className = 'dashboard-chart';
        careunitCard.appendChild(careunitDiv);
        grid.appendChild(careunitCard);
        renderD3Chart(careunitDiv, {
          type: 'bar',
          data: careunitData,
          color: ['#f6ad55'],
          xTitle: 'Careunit',
          yTitle: 'Transfers',
          legend: [{ label: 'Transfers', color: '#f6ad55' }]
        });
        renderD3Legend(careunitDiv, [{ label: 'Transfers', color: '#f6ad55' }]);
        // Service Distribution
        const serviceCard = document.createElement('div');
        serviceCard.className = 'dashboard-card';
        serviceCard.innerHTML = `<div class=\"dashboard-card-title\">Service Distribution</div><div class=\"dashboard-card-desc\">Distribution of services for ED patients.</div>`;
        const serviceDiv = document.createElement('div');
        serviceDiv.className = 'dashboard-chart';
        serviceCard.appendChild(serviceDiv);
        grid.appendChild(serviceCard);
        renderD3Chart(serviceDiv, {
          type: 'bar',
          data: serviceData,
          color: ['#68d391'],
          xTitle: 'Service',
          yTitle: 'Count',
          legend: [{ label: 'Service', color: '#68d391' }]
        });
        renderD3Legend(serviceDiv, [{ label: 'Service', color: '#68d391' }]);
        // Service Distribution Pie Chart (legend handled by pie util)
        // Vitals Trend (BMI, Weight, BP)
        const vitalsCard = document.createElement('div');
        vitalsCard.className = 'dashboard-card';
        vitalsCard.innerHTML = `<div class=\"dashboard-card-title\">Vitals Trend (BMI, Weight, BP)</div><div class=\"dashboard-card-desc\">Recent BMI, Weight, and Blood Pressure for ED patients.</div>`;
        const vitalsDiv = document.createElement('div');
        vitalsDiv.className = 'dashboard-chart';
        vitalsCard.appendChild(vitalsDiv);
        grid.appendChild(vitalsCard);
        // BMI
        renderD3LineChart(vitalsDiv, bmiTrend, { color: '#805ad5' });
        // Weight
        const weightDiv = document.createElement('div');
        weightDiv.className = 'dashboard-chart';
        vitalsCard.appendChild(weightDiv);
        renderD3LineChart(weightDiv, weightTrend, { color: '#f56565' });
        // BP (systolic/diastolic)
        const bpDiv = document.createElement('div');
        bpDiv.className = 'dashboard-chart';
        vitalsCard.appendChild(bpDiv);
        let legendItems = [
          { label: 'BMI', color: '#805ad5' },
          { label: 'Weight', color: '#f56565' }
        ];
        if (bpTrend.length > 0) {
          // Render as two lines
          const systolic = bpTrend.map(d => ({ label: d.label, value: d.systolic }));
          const diastolic = bpTrend.map(d => ({ label: d.label, value: d.diastolic }));
          renderD3LineChart(bpDiv, systolic, { color: '#4299e1' });
          renderD3LineChart(bpDiv, diastolic, { color: '#ecc94b' });
          legendItems = legendItems.concat([
            { label: 'Systolic', color: '#4299e1' },
            { label: 'Diastolic', color: '#ecc94b' }
          ]);
        }
        renderD3Legend(bpDiv, legendItems);
      });
      return;
    }
    // ... fallback for other rooms ...
    // ... existing code ...
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
});

// Utility to render a D3 chart (currently supports bar charts; extend for more types)
function renderD3Chart(container, config) {
  d3.select(container).selectAll('svg').remove();
  d3.select(container).selectAll('.d3-tooltip').remove();
  const theme = getD3ThemeColors();
  const width = 320;
  const height = 180;
  const margin = { top: 32, right: 24, bottom: 64, left: 56 };
  if (config.type === 'bar') {
    const data = config.data;
    const color = config.color?.[0] || getD3Color('--d3-bar', '#63b3ed');
    const maxLabelLength = 10;
    const maxXTicks = 10;
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background', theme.background);
    // Truncate labels if too long
    const truncatedLabels = data.map(d => d.label.length > maxLabelLength ? d.label.slice(0, maxLabelLength - 1) + '…' : d.label);
    const labelMap = Object.fromEntries(data.map((d, i) => [truncatedLabels[i], d.label]));
    // Reduce number of ticks if too many bars
    let xTickLabels = truncatedLabels;
    if (data.length > maxXTicks) {
      const step = Math.ceil(data.length / maxXTicks);
      xTickLabels = truncatedLabels.map((lbl, i) => (i % step === 0 ? lbl : ''));
    }
    const x = d3.scaleBand()
      .domain(truncatedLabels)
      .range([margin.left, width - margin.right])
      .padding(0.18);
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) * 1.1])
      .nice()
      .range([height - margin.bottom, margin.top]);
    // X axis
    const xAxis = svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat((d, i) => xTickLabels[i]))
      .selectAll('text')
      .attr('class', 'd3-axis-label')
      .attr('font-size', 12)
      .attr('fill', theme.label)
      .attr('text-anchor', 'middle')
      .attr('dx', '0em')
      .attr('dy', '1.2em');
    // If labels overlap, rotate them
    const labelNodes = svg.selectAll('g.x.axis g.tick text').nodes();
    let overlap = false;
    if (labelNodes.length > 1) {
      for (let i = 1; i < labelNodes.length; i++) {
        const prev = labelNodes[i - 1].getBoundingClientRect();
        const curr = labelNodes[i].getBoundingClientRect();
        if (prev.right > curr.left) {
          overlap = true;
          break;
        }
      }
    }
    if (overlap || data.length > 6) {
      svg.selectAll('g.x.axis g.tick text, g > g > text')
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(-32)')
        .attr('dx', '-0.6em')
        .attr('dy', '0.2em');
    }
    // Add tooltips to axis labels if truncated
    svg.selectAll('g > g > text').each(function(d, i) {
      if (truncatedLabels[i] !== labelMap[truncatedLabels[i]]) {
        d3.select(this)
          .style('cursor', 'pointer')
          .append('title')
          .text(labelMap[truncatedLabels[i]]);
      }
    });
    // X axis title
    svg.append('text')
      .attr('class', 'd3-x-title')
      .attr('x', width / 2)
      .attr('y', height - 18)
      .attr('text-anchor', 'middle')
      .attr('fill', theme.axis)
      .attr('font-size', 13)
      .text(config.xTitle || '');
    // Y axis
    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('~s')))
      .selectAll('text')
      .attr('class', 'd3-axis-label')
      .attr('font-size', 12)
      .attr('fill', theme.label);
    // Y axis title
    svg.append('text')
      .attr('class', 'd3-y-title')
      .attr('x', -height / 2)
      .attr('y', 16)
      .attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'middle')
      .attr('fill', theme.axis)
      .attr('font-size', 13)
      .text(config.yTitle || '');
    // Tooltip
    let tooltip = d3.select(container).select('.d3-tooltip');
    if (tooltip.empty()) {
      tooltip = d3.select(container)
        .append('div')
        .attr('class', 'd3-tooltip')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('opacity', 0);
    }
    
    // Bars
    svg.selectAll('.d3-bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'd3-bar')
      .attr('x', (d, i) => x(truncatedLabels[i]))
      .attr('y', d => y(0))
      .attr('width', x.bandwidth())
      .attr('height', 0)
      .attr('fill', color)
      .on('mouseover', function (event, d) {
        d3.select(this)
          .transition().duration(120)
          .attr('fill', d3.rgb(color).darker(1));
        tooltip.transition().duration(100).style('opacity', 1);
        tooltip.html(`<strong>${d.label}</strong><br/>${d.value}`)
          .style('left', (event.offsetX + 16) + 'px')
          .style('top', (event.offsetY - 28) + 'px');
      })
      .on('mousemove', function (event, d) {
        tooltip.style('left', (event.offsetX + 16) + 'px')
               .style('top', (event.offsetY - 28) + 'px');
      })
      .on('mouseout', function () {
        d3.select(this)
          .transition().duration(120)
          .attr('fill', color);
        tooltip.transition().duration(150).style('opacity', 0);
      })
      .transition()
      .duration(700)
      .attr('y', d => y(d.value))
      .attr('height', d => y(0) - y(d.value));
  }
  // TODO: Add support for other chart types (line, pie, etc.) as needed
}

// --- D3 Pie Chart Utility ---
function renderD3PieChart(container, data, options = {}) {
  d3.select(container).selectAll('svg').remove();
  const width = 220, height = 180, radius = Math.min(width, height) / 2 - 10;
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`);
  const color = d3.scaleOrdinal(options.colors || d3.schemeSet2);
  const pie = d3.pie().value(d => d.value);
  const arc = d3.arc().innerRadius(0).outerRadius(radius);
  const arcs = svg.selectAll('arc')
    .data(pie(data))
    .enter().append('g');
  arcs.append('path')
    .attr('d', arc)
    .attr('fill', d => color(d.data.label))
    .attr('class', 'd3-pie-slice')
    .on('mouseover', function (event, d) {
      d3.select(this).attr('stroke', '#222').attr('stroke-width', 2);
      tooltip.transition().duration(100).style('opacity', 1);
      tooltip.html(`<strong>${d.data.label}</strong><br/>${d.data.value}`)
        .style('left', (event.offsetX + 16) + 'px')
        .style('top', (event.offsetY - 28) + 'px');
    })
    .on('mousemove', function (event) {
      tooltip.style('left', (event.offsetX + 16) + 'px')
             .style('top', (event.offsetY - 28) + 'px');
    })
    .on('mouseout', function () {
      d3.select(this).attr('stroke', null);
      tooltip.transition().duration(150).style('opacity', 0);
    });
  // Tooltip
  const tooltip = d3.select(container)
    .append('div')
    .attr('class', 'd3-tooltip')
    .style('position', 'absolute')
    .style('pointer-events', 'none')
    .style('opacity', 0);
  // Legend
  const legend = d3.select(container)
    .append('div')
    .attr('class', 'd3-legend')
    .style('display', 'flex')
    .style('flex-wrap', 'wrap')
    .style('gap', '0.5em 1.2em')
    .style('margin-top', '0.5em');
  data.forEach(d => {
    const item = legend.append('div').style('display', 'flex').style('align-items', 'center');
    item.append('span')
      .style('display', 'inline-block')
      .style('width', '1em')
      .style('height', '1em')
      .style('border-radius', '50%')
      .style('background', color(d.label))
      .style('margin-right', '0.4em');
    item.append('span').text(d.label);
  });
}

// --- D3 Line Chart Utility ---
function renderD3LineChart(container, data, options = {}) {
  d3.select(container).selectAll('svg').remove();
  d3.select(container).selectAll('.d3-tooltip').remove();
  const width = 320, height = 180, margin = { top: 32, right: 24, bottom: 56, left: 56 };
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);
  const x = d3.scalePoint()
    .domain(data.map(d => d.label))
    .range([margin.left, width - margin.right]);
  const y = d3.scaleLinear()
    .domain([d3.min(data, d => d.value) * 0.95, d3.max(data, d => d.value) * 1.05])
    .nice()
    .range([height - margin.bottom, margin.top]);
  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('class', 'd3-axis-label')
    .attr('font-size', 12)
    .attr('text-anchor', 'end')
    .attr('transform', 'rotate(-32)')
    .attr('dx', '-0.6em')
    .attr('dy', '0.2em');
  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('~s')))
    .selectAll('text')
    .attr('class', 'd3-axis-label')
    .attr('font-size', 12);
  svg.append('path')
    .datum(data)
    .attr('class', 'd3-line')
    .attr('fill', 'none')
    .attr('stroke', options.color || '#4299e1')
    .attr('stroke-width', 3)
    .attr('d', d3.line()
      .x(d => x(d.label))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX)
    );
  // Points
  svg.selectAll('.d3-point')
    .data(data)
    .enter()
    .append('circle')
    .attr('class', 'd3-point')
    .attr('cx', d => x(d.label))
    .attr('cy', d => y(d.value))
    .attr('r', 4)
    .attr('fill', options.color || '#4299e1')
    .on('mouseover', function (event, d) {
      d3.select(this).attr('r', 7);
      tooltip.transition().duration(100).style('opacity', 1);
      tooltip.html(`<strong>${d.label}</strong><br/>${d.value}`)
        .style('left', (event.offsetX + 16) + 'px')
        .style('top', (event.offsetY - 28) + 'px');
    })
    .on('mousemove', function (event) {
      tooltip.style('left', (event.offsetX + 16) + 'px')
             .style('top', (event.offsetY - 28) + 'px');
    })
    .on('mouseout', function () {
      d3.select(this).attr('r', 4);
      tooltip.transition().duration(150).style('opacity', 0);
    });
  // Tooltip
  const tooltip = d3.select(container)
    .append('div')
    .attr('class', 'd3-tooltip')
    .style('position', 'absolute')
    .style('pointer-events', 'none')
    .style('opacity', 0);
}

// --- Theme-aware D3 color helpers ---
function getD3Color(varName, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName) || fallback;
}

function getD3ThemeColors() {
  return {
    axis: getD3Color('--d3-axis', '#a0aec0'),
    label: getD3Color('--text-primary', '#222'),
    grid: getD3Color('--d3-grid', '#e2e8f0'),
    background: getD3Color('--d3-bg', 'transparent'),
    tooltipBg: getD3Color('--d3-tooltip-bg', '#222'),
    tooltipText: getD3Color('--d3-tooltip-text', '#fff'),
    legendText: getD3Color('--d3-legend-text', '#222'),
    cardBg: getD3Color('--glass-bg', '#fff'),
    cardBorder: getD3Color('--glass-border', '#e2e8f0')
  };
}

// --- D3 Chart re-render on theme change ---
function rerenderAllD3Charts() {
  document.querySelectorAll('.dashboard-chart').forEach(chartDiv => {
    const parent = chartDiv.closest('.dashboard-card');
    if (!parent) return;
    const title = parent.querySelector('.dashboard-card-title')?.textContent || '';
    // Re-render based on chart type
    if (title.includes('Arrivals')) createRoomDashboard('emergency', true);
    if (title.includes('Length of Stay')) createRoomDashboard('emergency', true);
    if (title.includes('Service Distribution')) createRoomDashboard('emergency', true);
    if (title.includes('Careunit Flow')) createRoomDashboard('emergency', true);
    if (title.includes('Vitals Trend')) createRoomDashboard('emergency', true);
  });
}

// Listen for theme changes
const observer = new MutationObserver(() => rerenderAllD3Charts());
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// Update D3 chart rendering functions to use theme colors
// Example for bar chart:

// ... Repeat for renderD3PieChart, renderD3LineChart, renderD3MultiLineChart, updating all color usages to use theme ...
// ... existing code ...

// --- D3 Legend Utility ---
function renderD3Legend(container, legend) {
  // Remove any existing legend
  d3.select(container.parentNode).selectAll('.d3-legend').remove();
  if (!legend || !legend.length) return;
  const legendDiv = document.createElement('div');
  legendDiv.className = 'd3-legend';
  legend.forEach(item => {
    const legendItem = document.createElement('div');
    legendItem.className = 'd3-legend-item';
    const colorBox = document.createElement('span');
    colorBox.className = 'd3-legend-color';
    colorBox.style.background = item.color;
    legendItem.appendChild(colorBox);
    legendItem.appendChild(document.createTextNode(item.label));
    legendDiv.appendChild(legendItem);
  });
  container.parentNode.appendChild(legendDiv);
}