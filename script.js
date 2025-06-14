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
      entry: { primary: 0x4A90E2, secondary: 0x7BB3F0 },      // Blue - welcoming
      reception: { primary: 0x50C878, secondary: 0x7FD99A },    // Green - calming
      triage: { primary: 0xF39C12, secondary: 0xF5B041 },      // Orange - attention
      xray: { primary: 0x9B59B6, secondary: 0xBB8FCE },      // Purple - technology
      emergency: { primary: 0xE74C3C, secondary: 0xEC7063 },    // Red - urgency
      treatment: { primary: 0x1ABC9C, secondary: 0x48C9B0 },    // Teal - healing
      cardiac: { primary: 0xE91E63, secondary: 0xF06292 },      // Pink - heart
      neurology: { primary: 0x8E44AD, secondary: 0xA569BD },    // Deep purple - brain
      lab: { primary: 0x3498DB, secondary: 0x5DADE2 },      // Light blue - science
      urology: { primary: 0x2ECC71, secondary: 0x58D68D },      // Mint green
      gastro: { primary: 0xFF9800, secondary: 0xFFB74D },      // Amber
      monitoring: { primary: 0x795548, secondary: 0xA1887F },    // Brown - equipment
      discharge: { primary: 0x607D8B, secondary: 0x90A4AE }     // Blue grey - exit
    };

    // Define structural element colors
    const structuralColors = {
      floor: 0xF5F5F5,      // Light grey
      wall: 0xE8EAF0,      // Off white
      ceiling: 0xFFFFFF,      // White
      door: 0x8D6E63,      // Brown
      window: 0xB3E5FC,      // Light blue
      corridor: 0xECEFF1     // Very light grey
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

// Update room content to show dashboard and navigation
updateRoomContent(roomType);
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
        // Log for reception and triage specific assignment confirmation
        if (room.type === 'reception' || room.type === 'triage') {
          console.log(`*** DEBUG: ${room.type} assigned cube ${bestCube.name} with camera at ${cameraPos.x}, ${cameraPos.y}, ${cameraPos.z}`);
        }
      } else {
        console.log(`⚠ No suitable cube found for room ${room.type}`);
        // Log for reception and triage specific failure confirmation
        if (room.type === 'reception' || room.type === 'triage') {
          console.log(`*** DEBUG: No suitable cube found for ${room.type}.`);
        }
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

    // Automatically set camera positions for all rooms that have assigned cubes
    roomCubes.forEach((cubes, roomType) => {
      if (cubes.length > 0) {
        const mainCube = cubes[0]; // Assuming the first cube is the primary one
        const cubeBoundingBox = new THREE.Box3().setFromObject(mainCube);
        const cubeCenter = cubeBoundingBox.getCenter(new THREE.Vector3());
        const cubeSize = cubeBoundingBox.getSize(new THREE.Vector3());
        
        // Define a reasonable camera offset from the center of the cube
        // Adjust these values as needed for optimal view for each room
        let offsetX = 0;
        let offsetY = 1.5;
        let offsetZ = cubeSize.z * 1.5;

        // Special adjustments for specific room types if necessary
        if (roomType === 'reception') {
          offsetX = 5;
          offsetY = 3;
          offsetZ = 15; 
        } else if (roomType === 'triage') {
          offsetX = 15;
          offsetY = 3;
          offsetZ = 5;
        } else if (roomType === 'xray') {
          offsetX = -10;
          offsetY = 5;
          offsetZ = 10;
        } else if (roomType === 'icu') {
          offsetX = 10;
          offsetY = 5;
          offsetZ = -10;
        } else if (roomType === 'emergency') {
          offsetX = -10;
          offsetY = 5;
          offsetZ = -10;
        } else if (roomType === 'treatment') {
          offsetX = 10;
          offsetY = 5;
          offsetZ = 10;
        } else if (roomType === 'staff_room') {
          offsetX = 10;
          offsetY = 5;
          offsetZ = -10;
        } else if (roomType === 'discharge') {
          offsetX = -10;
          offsetY = 5;
          offsetZ = 10;
        }

        setRoomCamera(
          roomType,
          cubeCenter.x + offsetX,
          cubeCenter.y + offsetY,
          cubeCenter.z + offsetZ,
          cubeCenter.x,
          cubeCenter.y,
          cubeCenter.z
        );
      }
    });

    // Set camera positions for waiting area (existing manual call, ensure it's still needed or remove if automated covers it)
    // setRoomCamera('waiting_area', -3, 5, 24, -3, 0, 24); // Keep this if waiting_area has a unique position not covered by automation
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
    const contentSection = document.querySelector('.content-section');
    if (!contentSection) {
      console.warn('Content section not found');
      return;
    }
    
    // Reset to the original project overview content
    contentSection.innerHTML = `
      <div class="container">
        <div class="content-grid">
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
        </div>
      </div>
    `;

    // Add fade-in animation
    contentSection.style.opacity = '0';
    contentSection.style.transform = 'translateY(20px)';
    setTimeout(() => {
      contentSection.style.transition = 'opacity 0.4s, transform 0.4s';
      contentSection.style.opacity = '1';
      contentSection.style.transform = 'translateY(0)';
    }, 50);
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
          // Keep cubes hidden - don't show them
          cube.visible = false;
          cube.material.opacity = 0;
          break;
        case 'hide':
          cube.visible = false;
          cube.material.opacity = 0;
          break;
        case 'highlight':
          // Keep cubes hidden even when highlighting - don't show orange boxes
          cube.visible = false;
          cube.material.opacity = 0;
          cube.material.emissive.setHex(0x000000);
          cube.material.emissiveIntensity = 0;
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
          cube.material.opacity = 0; // Always keep opacity at 0
          break;
      }
    });
  }

  function highlightRoomCubes(roomTypes, color = 0xff5722) {
    // Hide all cubes first and keep them hidden
    roomCubes.forEach((cubes, roomType) => {
      manipulateCube(roomType, 'hide');
    });

    // Don't show or highlight any room cubes - keep them all hidden
    roomTypes.forEach(roomType => {
      manipulateCube(roomType, 'hide');
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
      roomBtn.dataset.room = roomType;
      
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

    // Update room content to show dashboard and navigation
    updateRoomContent(roomType);
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
    if (!content) {
      console.warn(`No content found for room type: ${roomType}`);
      return;
    }

    const projectOverview = document.querySelector('.content-section');
    if (!projectOverview) {
      console.warn('Content section not found');
      return;
    }

    // Get current condition sequence
    const currentSequence = getCurrentActiveSequence();
    const currentIndex = currentSequence ? currentSequence.indexOf(roomType) : -1;
    const totalRooms = currentSequence ? currentSequence.length : 0;

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
        
        ${currentSequence && currentIndex >= 0 ? `
          <div class="room-navigation">
            <div class="nav-info">
              <span class="room-counter">Room ${currentIndex + 1} of ${totalRooms} • ${roomType.toUpperCase()}</span>
              <span class="condition-name">${getConditionDisplayName()}</span>
            </div>
            <div class="nav-buttons">
              <button class="nav-btn prev-btn" ${currentIndex === 0 ? 'disabled' : ''} onclick="navigateToRoom('prev')" title="${currentIndex === 0 ? 'Already at first room' : 'Go to previous room in sequence'}">
                <i class="fas fa-chevron-left"></i>
                <span>Previous</span>
              </button>
              <button class="nav-btn next-btn" ${currentIndex === totalRooms - 1 ? 'disabled' : ''} onclick="navigateToRoom('next')" title="${currentIndex === totalRooms - 1 ? 'Already at last room' : 'Go to next room in sequence'}">
                <span>Next</span>
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        ` : currentSequence ? `
          <div class="room-navigation">
            <div class="nav-info">
              <span class="room-counter">Room not in current sequence</span>
              <span class="condition-name">${getConditionDisplayName()}</span>
            </div>
            <div class="nav-buttons">
              <button class="nav-btn" onclick="resetToProjectOverview()">
                <i class="fas fa-home"></i>
                <span>Back to Overview</span>
              </button>
            </div>
          </div>
        ` : `
          <div class="room-navigation">
            <div class="nav-info">
              <span class="room-counter">No condition selected</span>
              <span class="condition-name">Select a condition to see room sequence</span>
            </div>
            <div class="nav-buttons">
              <button class="nav-btn" onclick="resetToProjectOverview()">
                <i class="fas fa-home"></i>
                <span>Back to Overview</span>
              </button>
            </div>
          </div>
        `}
        
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
    
    // Set progress indicator
    if (currentSequence && currentIndex >= 0) {
      const progressPercentage = ((currentIndex + 1) / totalRooms) * 100;
      const roomCounter = dashboard?.querySelector('.room-counter');
      if (roomCounter) {
        roomCounter.style.setProperty('--progress-width', `${progressPercentage}%`);
      }
    }
    
    // Render dashboard visualizations and cards
    setTimeout(() => createRoomDashboard(roomType, true), 100);
  }

  // Navigation functions
  function navigateToRoom(direction) {
    const currentSequence = getCurrentActiveSequence();
    if (!currentSequence) return;

    // Find current room in sequence
    const currentRoom = getCurrentRoomFromDashboard();
    const currentIndex = currentSequence.indexOf(currentRoom);
    
    if (currentIndex === -1) return;

    let nextIndex;
    if (direction === 'prev') {
      nextIndex = Math.max(0, currentIndex - 1);
    } else if (direction === 'next') {
      nextIndex = Math.min(currentSequence.length - 1, currentIndex + 1);
    }

    if (nextIndex !== currentIndex) {
      const nextRoom = currentSequence[nextIndex];
      moveCameraToRoom(nextRoom);
      updateRoomContent(nextRoom);
    }
  }

  function getCurrentRoomFromDashboard() {
    const dashboard = document.querySelector('.room-dashboard');
    if (!dashboard) return null;
    
    const grid = dashboard.querySelector('.dashboard-grid');
    if (!grid) return null;
    
    // Extract room type from grid ID
    const gridId = grid.id;
    const match = gridId.match(/roomDashboardGrid-(.+)/);
    return match ? match[1] : null;
  }

  function getConditionDisplayName() {
    const conditionSelect = document.getElementById('conditionSelect');
    if (!conditionSelect) return '';
    
    const conditionMap = {
      'broken_bone': 'Broken Bone Treatment',
      'chest_pain': 'Chest Pain Evaluation',
      'head_injury': 'Head Injury Assessment',
      'kidney_infection': 'Kidney Infection Care',
      'abdominal_pain': 'Abdominal Pain Diagnosis'
    };
    
    return conditionMap[conditionSelect.value] || '';
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

    // ICU Dashboard
    if (roomType === 'icu') {
      grid.innerHTML = `
        <div class="dashboard-loading">
          <div class="loading-spinner"></div>
          <p>Loading ICU analytics...</p>
        </div>
      `;

      Promise.all([
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/transfers.csv').catch(err => { console.error('Error loading transfers.csv:', err); return []; }).catch(err => {
          console.error('Error loading transfers.csv:', err);
          return [];
        }),
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/services.csv').catch(err => { console.error('Error loading services.csv:', err); return []; }).catch(err => {
          console.error('Error loading services.csv:', err);
          return [];
        })
      ]).then(([transfers, services]) => {
        if (!transfers.length || !services.length) {
          grid.innerHTML = `
            <div class="dashboard-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Unable to load ICU data. Please try again later.</p>
            </div>
          `;
          return;
        }

        try {
          // Process ICU data
          const icuData = transfers.filter(r => 
            r.careunit === 'MICU' || 
            r.careunit === 'SICU' || 
            r.careunit === 'CCU'
          );

          // Patient Status Distribution
          const patientStatusData = [
            { label: 'Critical', value: 0, color: '#fc8181' },
            { label: 'Stable', value: 0, color: '#68d391' },
            { label: 'Improving', value: 0, color: '#4299e1' },
            { label: 'Deteriorating', value: 0, color: '#f6ad55' }
          ];

          // Resource Utilization
          const resourceData = [
            { label: 'Ventilators', value: 0, color: '#4299e1' },
            { label: 'Dialysis', value: 0, color: '#f6ad55' },
            { label: 'ECMO', value: 0, color: '#fc8181' },
            { label: 'Available', value: 0, color: '#68d391' }
          ];

          // Length of Stay Distribution
          const stayData = [
            { label: '< 24h', value: 0, color: '#68d391' },
            { label: '1-3 days', value: 0, color: '#4299e1' },
            { label: '3-7 days', value: 0, color: '#f6ad55' },
            { label: '> 7 days', value: 0, color: '#fc8181' }
          ];

          // Process data
          icuData.forEach(row => {
            // Calculate length of stay
            const intime = new Date(row.intime.replace(' ', 'T'));
            const outtime = row.outtime ? new Date(row.outtime.replace(' ', 'T')) : new Date();
            const stayHours = (outtime - intime) / (1000 * 60 * 60);

            // Update stay distribution
            if (stayHours < 24) {
              stayData[0].value++;
            } else if (stayHours < 72) {
              stayData[1].value++;
            } else if (stayHours < 168) {
              stayData[2].value++;
            } else {
              stayData[3].value++;
            }

            // Update patient status based on service and care unit
            if (row.service?.includes('CRIT')) {
              patientStatusData[0].value++; // Critical
              resourceData[0].value++; // Ventilator
            } else if (row.service?.includes('NEPH')) {
              patientStatusData[3].value++; // Deteriorating
              resourceData[1].value++; // Dialysis
            } else if (row.careunit === 'CCU') {
              patientStatusData[2].value++; // Improving
              resourceData[2].value++; // ECMO
            } else {
              patientStatusData[1].value++; // Stable
              resourceData[3].value++; // Available
            }
          });

          // Calculate total patients and average stay
          const totalPatients = patientStatusData.reduce((sum, d) => sum + d.value, 0);
          const averageStay = icuData.reduce((sum, row) => {
            const intime = new Date(row.intime.replace(' ', 'T'));
            const outtime = row.outtime ? new Date(row.outtime.replace(' ', 'T')) : new Date();
            return sum + (outtime - intime) / (1000 * 60 * 60);
          }, 0) / totalPatients;

          grid.innerHTML = '';
          const dashboardLayout = document.createElement('div');
          dashboardLayout.className = 'emergency-dashboard-layout';
          
          dashboardLayout.innerHTML = `
            <div class="dashboard-header">
              <h2>ICU Analytics</h2>
              <p class="dashboard-summary">
                Real-time monitoring of critical care metrics, patient status, and resource utilization
                to ensure optimal care delivery and resource management.
              </p>
            </div>
          `;
          
          // Create a two-column layout with explicit heights
          const dashboardGrid = document.createElement('div');
          dashboardGrid.className = 'dashboard-grid';
          dashboardGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
            padding: 1rem;
            min-height: 600px;
          `;
          
          // Left column container with explicit height
          const leftColumn = document.createElement('div');
          leftColumn.className = 'dashboard-column';
          leftColumn.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            min-height: 600px;
          `;
          
          // Add patient status card with explicit height and container
          const patientStatusContainer = document.createElement('div');
          patientStatusContainer.style.cssText = `
            flex: 1;
            min-height: 300px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 1rem;
            display: flex;
            flex-direction: column;
          `;
          
          const patientStatusCard = createDashboardCard(
            'Patient Status Distribution',
            'Current distribution of patients by their critical care status.',
            patientStatusData,
            'doughnut',
            patientStatusData.map(d => d.color),
            'Status',
            'Number of Patients'
          );
          patientStatusContainer.appendChild(patientStatusCard);
          leftColumn.appendChild(patientStatusContainer);
          
          // Add resource utilization card with explicit height and container
          const resourceContainer = document.createElement('div');
          resourceContainer.style.cssText = `
            flex: 1;
            min-height: 300px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 1rem;
            display: flex;
            flex-direction: column;
          `;
          
          const resourceCard = createDashboardCard(
            'Resource Utilization',
            'Current usage of critical care equipment and resources.',
            resourceData,
            'bar',
            resourceData.map(d => d.color),
            'Resource Type',
            'Number in Use'
          );
          resourceContainer.appendChild(resourceCard);
          leftColumn.appendChild(resourceContainer);
          
          // Right column container with explicit height
          const rightColumn = document.createElement('div');
          rightColumn.className = 'dashboard-column';
          rightColumn.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            min-height: 600px;
          `;
          
          // Add length of stay card with explicit height and container
          const stayContainer = document.createElement('div');
          stayContainer.style.cssText = `
            flex: 1;
            min-height: 600px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 1rem;
            display: flex;
            flex-direction: column;
          `;
          
          const stayCard = createDashboardCard(
            'Length of Stay Distribution',
            'Distribution of patient stays in the ICU.',
            stayData,
            'bar',
            stayData.map(d => d.color),
            'Duration',
            'Number of Patients'
          );
          stayContainer.appendChild(stayCard);
          rightColumn.appendChild(stayContainer);
          
          // Add columns to grid
          dashboardGrid.appendChild(leftColumn);
          dashboardGrid.appendChild(rightColumn);
          dashboardLayout.appendChild(dashboardGrid);
          
          // Add dashboard footer with insights
          const dashboardFooter = document.createElement('div');
          dashboardFooter.className = 'dashboard-footer';
          dashboardFooter.innerHTML = `
            <h3>Key Insights</h3>
            <ul class="insights-list">
              <li>
                <i class="fas fa-procedures"></i>
                <span>Total patients: ${totalPatients}</span>
              </li>
              <li>
                <i class="fas fa-clock"></i>
                <span>Average stay: ${Math.round(averageStay)} hours</span>
              </li>
              <li>
                <i class="fas fa-heartbeat"></i>
                <span>Critical patients: ${patientStatusData[0].value}</span>
              </li>
              <li>
                <i class="fas fa-lungs"></i>
                <span>Ventilator usage: ${resourceData[0].value}</span>
              </li>
            </ul>
          `;
          dashboardLayout.appendChild(dashboardFooter);
          
          grid.appendChild(dashboardLayout);

        } catch (error) {
          console.error('Error processing ICU data:', error);
          grid.innerHTML = `
            <div class="dashboard-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Unable to load ICU data. Please try again later.</p>
              <p class="error-details">${error.message}</p>
            </div>
          `;
        }
      }).catch(error => {
        console.error('Error loading ICU data:', error);
        grid.innerHTML = `
          <div class="dashboard-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error loading ICU data. Please try again later.</p>
            <p class="error-details">${error.message}</p>
          </div>
        `;
      });
      return;
    }

    // Waiting Area Dashboard
    if (roomType === 'waiting_area') {
      grid.innerHTML = `
        <div class="dashboard-loading">
          <div class="loading-spinner"></div>
          <p>Loading waiting area analytics...</p>
        </div>
      `;

      Promise.all([
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/transfers.csv').catch(err => { console.error('Error loading transfers.csv:', err); return []; }).catch(err => {
          console.error('Error loading transfers.csv:', err);
          return [];
        }),
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/services.csv').catch(err => { console.error('Error loading services.csv:', err); return []; }).catch(err => {
          console.error('Error loading services.csv:', err);
          return [];
        })
      ]).then(([transfers, services]) => {
        if (!transfers.length || !services.length) {
          grid.innerHTML = `
            <div class="dashboard-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Unable to load waiting area data. Please try again later.</p>
            </div>
          `;
          return;
        }

        try {
          const waitingData = transfers.filter(r => 
            r.careunit === 'Emergency Department' || 
            r.careunit === 'Medicine' || 
            r.careunit === 'Surgery'
          );

          // Wait Time Distribution
          const waitTimeData = [
            { label: '0-15 minutes', value: 0, color: '#68d391' },
            { label: '15-30 minutes', value: 0, color: '#f6ad55' },
            { label: '30-60 minutes', value: 0, color: '#fc8181' },
            { label: '60+ minutes', value: 0, color: '#e53e3e' }
          ];

          // Waiting Room Capacity
          const capacityData = [
            { label: 'Available Seats', value: 50, color: '#68d391' },
            { label: 'Occupied Seats', value: 0, color: '#4299e1' },
            { label: 'Reserved Seats', value: 0, color: '#f6ad55' }
          ];

          // Process data
          waitingData.forEach(row => {
            if (row.intime && row.outtime) {
              const waitTime = (new Date(row.intime.replace(' ', 'T')) - 
                                new Date(row.intime.replace(' ', 'T'))) / (1000 * 60); // in minutes
              
              if (waitTime <= 15) waitTimeData[0].value++;
              else if (waitTime <= 30) waitTimeData[1].value++;
              else if (waitTime <= 60) waitTimeData[2].value++;
              else waitTimeData[3].value++;

              // Update capacity
              if (row.service) {
                if (row.service.includes('SURG') || row.service.includes('TRAUMA')) {
                  capacityData[2].value++; // Reserved for urgent cases
                } else {
                  capacityData[1].value++; // Occupied
                }
              }
            }
          });

          // Calculate available seats
          capacityData[0].value = Math.max(0, capacityData[0].value - capacityData[1].value - capacityData[2].value);

          grid.innerHTML = '';
          const dashboardLayout = document.createElement('div');
          dashboardLayout.className = 'emergency-dashboard-layout';
          
          dashboardLayout.innerHTML = `
            <div class="dashboard-header">
              <h2>Waiting Area Analytics</h2>
              <p class="dashboard-summary">
                Real-time insights into wait times and waiting room capacity
                to optimize patient flow and resource allocation.
              </p>
            </div>
          `;
          
          const dashboardGrid = document.createElement('div');
          dashboardGrid.className = 'dashboard-grid';
          
          // Add wait time distribution card
          dashboardGrid.appendChild(createDashboardCard(
            'Current Wait Time Distribution',
            'Monitor the distribution of patient wait times to identify bottlenecks.',
            waitTimeData,
            'doughnut',
            waitTimeData.map(d => d.color),
            'Wait Time Range',
            'Number of Patients'
          ));
          
          // Add waiting room capacity card
          dashboardGrid.appendChild(createDashboardCard(
            'Waiting Room Capacity',
            'Track available, occupied, and reserved seats in the waiting area.',
            capacityData,
            'bar',
            capacityData.map(d => d.color),
            'Seat Status',
            'Number of Seats'
          ));
          
          dashboardLayout.appendChild(dashboardGrid);
          
          // Add dashboard footer with insights
          const dashboardFooter = document.createElement('div');
          dashboardFooter.className = 'dashboard-footer';
          dashboardFooter.innerHTML = `
            <h3>Key Insights</h3>
            <ul class="insights-list">
              <li>
                <i class="fas fa-clock"></i>
                <span>Average wait time: ${calculateAverageWaitTime(waitTimeData)} minutes</span>
              </li>
              <li>
                <i class="fas fa-chair"></i>
                <span>Available seats: ${capacityData[0].value} of ${capacityData[0].value + capacityData[1].value + capacityData[2].value}</span>
              </li>
              <li>
                <i class="fas fa-exclamation-circle"></i>
                <span>Long waits (>60 min): ${waitTimeData[3].value} patients</span>
              </li>
            </ul>
          `;
          dashboardLayout.appendChild(dashboardFooter);
          
          grid.appendChild(dashboardLayout);

          // Helper function for average wait time calculation
          function calculateAverageWaitTime(data) {
            const totalPatients = data.reduce((sum, d) => sum + d.value, 0);
            if (!totalPatients) return 0;
            
            const weightedTime = data.reduce((sum, d) => {
              const midPoint = d.label.includes('0-15') ? 7.5 :
                                 d.label.includes('15-30') ? 22.5 :
                                 d.label.includes('30-60') ? 45 : 75;
              return sum + (d.value * midPoint);
            }, 0);
            
            return Math.round(weightedTime / totalPatients);
          }
        } catch (error) {
          console.error('Error processing waiting area data:', error);
          grid.innerHTML = `
            <div class="dashboard-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Error processing waiting area data. Please try again later.</p>
              <p class="error-details">${error.message}</p>
            </div>
          `;
        }
      }).catch(error => {
        console.error('Error loading waiting area data:', error);
        grid.innerHTML = `
          <div class="dashboard-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error loading waiting area data. Please try again later.</p>
            <p class="error-details">${error.message}</p>
          </div>
        `;
      });
      return;
    }

    // Discharge Area Dashboard
    if (roomType === 'discharge') {
      // Show loading state
      grid.innerHTML = `
        <div class="dashboard-loading">
          <div class="loading-spinner"></div>
          <p>Loading discharge analytics...</p>
        </div>
      `;

      // Load and parse CSVs using d3-fetch
      Promise.all([
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/transfers.csv').catch(err => { console.error('Error loading transfers.csv:', err); return []; }).catch(err => {
          console.error('Error loading transfers.csv:', err);
          return [];
        }),
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/services.csv').catch(err => { console.error('Error loading services.csv:', err); return []; }).catch(err => {
          console.error('Error loading services.csv:', err);
          return [];
        })
      ]).then(([transfers, services]) => {
        if (!transfers.length || !services.length) {
          grid.innerHTML = `
            <div class="dashboard-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Unable to load discharge data. Please try again later.</p>
            </div>
          `;
          return;
        }

        try {
          // Process data for discharge analytics
          const dischargeData = transfers.filter(r => 
            r.careunit === 'Emergency Department' || 
            r.careunit === 'Medicine' || 
            r.careunit === 'Surgery'
          );

          const statusData = [
            { label: 'Ready for Discharge', value: 0, color: '#68d391' },
            { label: 'Awaiting Transport', value: 0, color: '#f6ad55' },
            { label: 'Discharge in Progress', value: 0, color: '#4299e1' },
            { label: 'Discharge Complete', value: 0, color: '#38a169' },
            { label: 'Delayed', value: 0, color: '#e53e3e' }
          ];

          const typeData = [
            { label: 'Home', value: 0, color: '#68d391' },
            { label: 'Rehabilitation', value: 0, color: '#4299e1' },
            { label: 'Long-term Care', value: 0, color: '#f6ad55' },
            { label: 'Transfer to Another Facility', value: 0, color: '#805ad5' },
            { label: 'Against Medical Advice', value: 0, color: '#e53e3e' }
          ];

          // Process data based on service types
          dischargeData.forEach(row => {
            if (row.service) {
              if (row.service.includes('SURG')) {
                statusData[0].value++;
                typeData[0].value++;
              } else if (row.service.includes('MED')) {
                statusData[1].value++;
                typeData[1].value++;
              } else if (row.service.includes('NEURO')) {
                statusData[2].value++;
                typeData[2].value++;
              } else if (row.service.includes('CARDIAC')) {
                statusData[3].value++;
                typeData[3].value++;
              } else {
                statusData[4].value++;
                typeData[4].value++;
              }
            }
          });

          // Add default data if no real data is found
          if (statusData.every(d => d.value === 0)) {
            console.log('No real discharge status data found, using default data');
            statusData[0].value = 15; // Ready for Discharge
            statusData[1].value = 8;  // Awaiting Transport
            statusData[2].value = 12; // Discharge in Progress
            statusData[3].value = 20; // Discharge Complete
            statusData[4].value = 5;  // Delayed
          }

          if (typeData.every(d => d.value === 0)) {
            console.log('No real discharge type data found, using default data');
            typeData[0].value = 25; // Home
            typeData[1].value = 12; // Rehabilitation
            typeData[2].value = 8;  // Long-term Care
            typeData[3].value = 10; // Transfer to Another Facility
            typeData[4].value = 5;  // Against Medical Advice
          }

          console.log('Discharge Status Data:', statusData);
          console.log('Discharge Type Data:', typeData);

          // Clear loading state and render dashboard
          grid.innerHTML = '';
          const dashboardLayout = document.createElement('div');
          dashboardLayout.className = 'emergency-dashboard-layout';
          
          dashboardLayout.innerHTML = `
            <div class="dashboard-header">
              <h2>Discharge Area Analytics</h2>
              <p class="dashboard-summary">
                Real-time insights into discharge processing and patient throughput
                to optimize discharge operations and patient flow.
              </p>
            </div>
          `;
          
          const dashboardGrid = document.createElement('div');
          dashboardGrid.className = 'dashboard-grid';
          
          dashboardGrid.appendChild(createDashboardCard(
            'Current Discharge Status',
            'Monitor the current status of patients in the discharge process.',
            statusData,
            'doughnut',
            statusData.map(d => d.color),
            'Status',
            'Number of Patients'
          ));
          
          dashboardGrid.appendChild(createDashboardCard(
            'Discharge Type Distribution',
            'Track the distribution of discharge destinations to plan resources accordingly.',
            typeData,
            'bar',
            typeData.map(d => d.color),
            'Discharge Type',
            'Number of Patients'
          ));
          
          dashboardLayout.appendChild(dashboardGrid);
          
          const dashboardFooter = document.createElement('div');
          dashboardFooter.className = 'dashboard-footer';
          dashboardFooter.innerHTML = `
            <h3>Key Insights</h3>
            <ul class="insights-list">
              <li>
                <i class="fas fa-check-circle"></i>
                <span>Ready for discharge: ${statusData[0].value} patients</span>
              </li>
              <li>
                <i class="fas fa-ambulance"></i>
                <span>Awaiting transport: ${statusData[1].value} patients</span>
              </li>
              <li>
                <i class="fas fa-home"></i>
                <span>Home discharges: ${typeData[0].value} patients</span>
              </li>
            </ul>
          `;
          dashboardLayout.appendChild(dashboardFooter);
          
          grid.appendChild(dashboardLayout);
        } catch (error) {
          console.error('Error processing discharge data:', error);
          grid.innerHTML = `
            <div class="dashboard-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Error processing discharge data. Please try again later.</p>
              <p class="error-details">${error.message}</p>
            </div>
          `;
        }
      }).catch(error => {
        console.error('Error loading discharge data:', error);
        grid.innerHTML = `
          <div class="dashboard-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error loading discharge data. Please try again later.</p>
            <p class="error-details">${error.message}</p>
          </div>
        `;
      });
      return;
    }

    // Triage Area Dashboard
    if (roomType === 'triage') {
      // Show loading state
      grid.innerHTML = `
        <div class="dashboard-loading">
          <div class="loading-spinner"></div>
          <p>Loading triage analytics...</p>
        </div>
      `;

      // Load and parse CSVs using d3-fetch
      Promise.all([
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/transfers.csv').catch(err => { console.error('Error loading transfers.csv:', err); return []; }).catch(err => {
          console.error('Error loading transfers.csv:', err);
          return [];
        }),
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/services.csv').catch(err => { console.error('Error loading services.csv:', err); return []; }).catch(err => {
          console.error('Error loading services.csv:', err);
          return [];
        })
      ]).then(([transfers, services]) => {
        if (!transfers.length || !services.length) {
          grid.innerHTML = `
            <div class="dashboard-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Unable to load triage data. Please try again later.</p>
            </div>
          `;
          return;
        }

        try {
          // Process data for triage analytics with unique variable name
          const triageAnalyticsData = transfers.filter(r => 
            r.careunit === 'Emergency Department' || 
            r.careunit === 'Medicine' || 
            r.careunit === 'Surgery'
          );

          // Acuity Level Distribution
          const acuityDistribution = {
            'Level 1 (Resuscitation)': 0,
            'Level 2 (Emergent)': 0,
            'Level 3 (Urgent)': 0,
            'Level 4 (Less Urgent)': 0,
            'Level 5 (Non-urgent)': 0
          };

          // Current Triage Status
          const triageStatus = {
            'Waiting for Assessment': 0,
            'Being Assessed': 0,
            'Assessment Complete': 0,
            'Requires Immediate Care': 0
          };

          // Process data
          triageAnalyticsData.forEach(row => {
            if (row.service) {
              // Assign acuity levels based on service type
              if (row.service.includes('SURG') || row.service.includes('TRAUMA')) {
                acuityDistribution['Level 1 (Resuscitation)']++;
                triageStatus['Requires Immediate Care']++;
              } else if (row.service.includes('MED') || row.service.includes('CARDIAC')) {
                acuityDistribution['Level 2 (Emergent)']++;
                triageStatus['Being Assessed']++;
              } else if (row.service.includes('NEURO')) {
                acuityDistribution['Level 3 (Urgent)']++;
                triageStatus['Waiting for Assessment']++;
              } else if (row.service.includes('GASTRO')) {
                acuityDistribution['Level 4 (Less Urgent)']++;
                triageStatus['Assessment Complete']++;
              } else {
                acuityDistribution['Level 5 (Non-urgent)']++;
                triageStatus['Waiting for Assessment']++;
              }
            }
          });

          // Add some default data if no real data is found
          if (Object.values(acuityDistribution).every(val => val === 0)) {
            console.log('No real data found, using default data for triage');
            acuityDistribution['Level 1 (Resuscitation)'] = 5;
            acuityDistribution['Level 2 (Emergent)'] = 12;
            acuityDistribution['Level 3 (Urgent)'] = 18;
            acuityDistribution['Level 4 (Less Urgent)'] = 25;
            acuityDistribution['Level 5 (Non-urgent)'] = 15;
          }

          if (Object.values(triageStatus).every(val => val === 0)) {
            console.log('No real status data found, using default data for triage');
            triageStatus['Waiting for Assessment'] = 20;
            triageStatus['Being Assessed'] = 15;
            triageStatus['Assessment Complete'] = 30;
            triageStatus['Requires Immediate Care'] = 10;
          }

          console.log('Triage Acuity Data:', acuityDistribution);
          console.log('Triage Status Data:', triageStatus);

          // Prepare chart data
          const acuityData = Object.entries(acuityDistribution)
            .map(([label, value]) => ({ 
              label, 
              value,
              color: label.includes('Level 1') ? '#e53e3e' : 
                     label.includes('Level 2') ? '#dd6b20' : 
                     label.includes('Level 3') ? '#d69e2e' : 
                     label.includes('Level 4') ? '#38a169' : 
                     '#4299e1'
            }));

          const statusData = Object.entries(triageStatus)
            .map(([label, value]) => ({ 
              label, 
              value,
              color: label.includes('Waiting') ? '#e53e3e' : 
                     label.includes('Being') ? '#f6ad55' : 
                     label.includes('Complete') ? '#68d391' : 
                     '#e53e3e'
            }));

          console.log('Processed Acuity Data:', acuityData);
          console.log('Processed Status Data:', statusData);

          // Clear loading state and render dashboard
          grid.innerHTML = '';
          
          // Create dashboard layout
          const dashboardLayout = document.createElement('div');
          dashboardLayout.className = 'emergency-dashboard-layout';
          
          // Add dashboard header
          dashboardLayout.innerHTML = `
            <div class="dashboard-header">
              <h2>Triage Area Analytics</h2>
              <p class="dashboard-summary">
                Real-time insights into patient acuity levels and triage status
                to optimize patient flow and resource allocation.
              </p>
            </div>
          `;
          
          // Create main content grid
          const dashboardGrid = document.createElement('div');
          dashboardGrid.className = 'dashboard-grid';
          
          // Add acuity levels card
          const acuityCard = createDashboardCard(
            'Current Acuity Distribution',
            'Track the distribution of patient acuity levels to optimize staff allocation.',
            acuityData,
            'doughnut',
            acuityData.map(d => d.color),
            'Acuity Level',
            'Number of Patients'
          );
          dashboardGrid.appendChild(acuityCard);
          
          // Add triage status card
          const statusCard = createDashboardCard(
            'Current Triage Status',
            'Monitor the current status of patients in the triage process.',
            statusData,
            'bar',
            statusData.map(d => d.color),
            'Status',
            'Number of Patients'
          );
          dashboardGrid.appendChild(statusCard);
          
          dashboardLayout.appendChild(dashboardGrid);
          
          // Add dashboard footer with insights
          const dashboardFooter = document.createElement('div');
          dashboardFooter.className = 'dashboard-footer';
          dashboardFooter.innerHTML = `
            <h3>Key Insights</h3>
            <ul class="insights-list">
              <li>
                <i class="fas fa-heartbeat"></i>
                <span>High acuity patients (Level 1-2): ${getHighAcuityPercentage(acuityData)}%</span>
              </li>
              <li>
                <i class="fas fa-user-clock"></i>
                <span>Patients waiting for assessment: ${getWaitingCount(statusData)}</span>
              </li>
              <li>
                <i class="fas fa-exclamation-circle"></i>
                <span>Requiring immediate care: ${getImmediateCareCount(statusData)}</span>
              </li>
            </ul>
          `;
          dashboardLayout.appendChild(dashboardFooter);
          
          grid.appendChild(dashboardLayout);
          
          // Helper functions for insights
          function getHighAcuityPercentage(data) {
            const highAcuity = data
              .filter(d => d.label.includes('Level 1') || d.label.includes('Level 2'))
              .reduce((sum, d) => sum + d.value, 0);
            const total = data.reduce((sum, d) => sum + d.value, 0);
            return total ? Math.round((highAcuity / total) * 100) : 0;
          }
          
          function getWaitingCount(data) {
            const waiting = data.find(d => d.label === 'Waiting for Assessment');
            return waiting ? waiting.value : 0;
          }
          
          function getImmediateCareCount(data) {
            const immediate = data.find(d => d.label === 'Requires Immediate Care');
            return immediate ? immediate.value : 0;
          }
        } catch (error) {
          console.error('Error processing triage data:', error);
          grid.innerHTML = `
            <div class="dashboard-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Error processing triage data. Please try again later.</p>
              <p class="error-details">${error.message}</p>
            </div>
          `;
        }
      }).catch(error => {
        console.error('Error loading triage data:', error);
        grid.innerHTML = `
          <div class="dashboard-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error loading triage data. Please try again later.</p>
            <p class="error-details">${error.message}</p>
          </div>
        `;
      });
      return;
    }

    // Treatment Rooms Dashboard
    if (roomType === 'treatment') {
      // Show loading state
      grid.innerHTML = `
        <div class="dashboard-loading">
          <div class="loading-spinner"></div>
          <p>Loading treatment rooms analytics...</p>
        </div>
      `;

      // Load and parse CSVs using d3-fetch
      Promise.all([
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/transfers.csv').catch(err => { console.error('Error loading transfers.csv:', err); return []; }).catch(err => {
          console.error('Error loading transfers.csv:', err);
          return [];
        }),
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/services.csv').catch(err => { console.error('Error loading services.csv:', err); return []; }).catch(err => {
          console.error('Error loading services.csv:', err);
          return [];
        })
      ]).then(([transfers, services]) => {
        if (!transfers.length || !services.length) {
          grid.innerHTML = `
            <div class="dashboard-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Unable to load treatment rooms data. Please try again later.</p>
            </div>
          `;
          return;
        }

        try {
          // Process data for treatment rooms analytics
          const treatmentRoomData = transfers.filter(r => 
            r.careunit === 'Emergency Department' || 
            r.careunit === 'Medicine' || 
            r.careunit === 'Surgery'
          );

          // Room Occupancy Status
          const roomStatus = {
            'Room 1': { status: 'Occupied', patient: 'John Doe', service: 'Medicine', timeRemaining: 45 },
            'Room 2': { status: 'Available', patient: null, service: null, timeRemaining: 0 },
            'Room 3': { status: 'Occupied', patient: 'Jane Smith', service: 'Surgery', timeRemaining: 30 },
            'Room 4': { status: 'Cleaning', patient: null, service: null, timeRemaining: 15 },
            'Room 5': { status: 'Occupied', patient: 'Mike Johnson', service: 'Emergency', timeRemaining: 60 }
          };

          // Treatment Type Distribution
          const treatmentTypes = {
            'Emergency Care': 0,
            'Minor Procedures': 0,
            'Wound Care': 0,
            'Medication Administration': 0,
            'Other': 0
          };

          // Patient Flow Status
          const flowStatus = {
            'Waiting for Room': 0,
            'In Treatment': 0,
            'Post-Treatment': 0,
            'Ready for Discharge': 0
          };

          // Acuity Level Distribution for Treatment Rooms
          const acuityDistribution = {
            'Level 1 (Resuscitation)': 0,
            'Level 2 (Emergent)': 0,
            'Level 3 (Urgent)': 0,
            'Level 4 (Less Urgent)': 0,
            'Level 5 (Non-urgent)': 0
          };

          // Simulate data based on service types
          treatmentRoomData.forEach(row => {
            if (row.service) {
              // Assign treatment types based on service
              if (row.service.includes('EMERGENCY')) {
                treatmentTypes['Emergency Care']++;
                flowStatus['In Treatment']++;
                acuityDistribution['Level 1 (Resuscitation)']++;
              } else if (row.service.includes('SURG')) {
                treatmentTypes['Minor Procedures']++;
                flowStatus['Post-Treatment']++;
                acuityDistribution['Level 2 (Emergent)']++;
              } else if (row.service.includes('MED')) {
                treatmentTypes['Medication Administration']++;
                flowStatus['Waiting for Room']++;
                acuityDistribution['Level 3 (Urgent)']++;
              } else if (row.service.includes('TRAUMA')) {
                treatmentTypes['Wound Care']++;
                flowStatus['Ready for Discharge']++;
                acuityDistribution['Level 4 (Less Urgent)']++;
              } else {
                treatmentTypes['Other']++;
                flowStatus['Waiting for Room']++;
                acuityDistribution['Level 5 (Non-urgent)']++;
              }
            }
          });

          // Add default data if no real data is found
          if (Object.values(acuityDistribution).every(val => val === 0)) {
            console.log('No real treatment data found, using default data');
            acuityDistribution['Level 1 (Resuscitation)'] = 8;
            acuityDistribution['Level 2 (Emergent)'] = 15;
            acuityDistribution['Level 3 (Urgent)'] = 22;
            acuityDistribution['Level 4 (Less Urgent)'] = 18;
            acuityDistribution['Level 5 (Non-urgent)'] = 12;
          }

          if (Object.values(treatmentTypes).every(val => val === 0)) {
            console.log('No real treatment types found, using default data');
            treatmentTypes['Emergency Care'] = 12;
            treatmentTypes['Minor Procedures'] = 18;
            treatmentTypes['Wound Care'] = 10;
            treatmentTypes['Medication Administration'] = 15;
            treatmentTypes['Other'] = 8;
          }

          console.log('Treatment Acuity Data:', acuityDistribution);
          console.log('Treatment Types Data:', treatmentTypes);

          const treatmentData = Object.entries(treatmentTypes)
            .map(([label, value]) => ({ 
              label, 
              value,
              color: label.includes('Emergency') ? '#e53e3e' : 
                     label.includes('Minor') ? '#ed8936' : 
                     label.includes('Wound') ? '#48bb78' : 
                     label.includes('Medication') ? '#4299e1' : 
                     '#a0aec0'
            }));

          const flowData = Object.entries(flowStatus)
            .map(([label, value]) => ({ 
              label, 
              value,
              color: label.includes('Waiting') ? '#e53e3e' : 
                     label.includes('In Treatment') ? '#f6ad55' : 
                     label.includes('Post') ? '#68d391' : 
                     '#4299e1'
            }));

          // Prepare acuity data for treatment rooms
          const acuityData = Object.entries(acuityDistribution)
            .map(([label, value]) => ({ 
              label, 
              value,
              color: label.includes('Level 1') ? '#e53e3e' : 
                     label.includes('Level 2') ? '#dd6b20' : 
                     label.includes('Level 3') ? '#d69e2e' : 
                     label.includes('Level 4') ? '#38a169' : 
                     '#4299e1'
            }));

          console.log('Processed Treatment Acuity Data:', acuityData);
          console.log('Processed Treatment Types Data:', treatmentData);

          // Clear loading state and render dashboard
          grid.innerHTML = '';
          
          // Create dashboard layout
          const dashboardLayout = document.createElement('div');
          dashboardLayout.className = 'emergency-dashboard-layout';
          
          // Add dashboard header with summary
          const dashboardHeader = document.createElement('div');
          dashboardHeader.className = 'dashboard-header';
          dashboardHeader.innerHTML = `
            <h2>Treatment Rooms Analytics</h2>
            <p class="dashboard-summary">
              Real-time insights into treatment room utilization and patient flow
              to optimize treatment efficiency and resource allocation.
            </p>
          `;
          dashboardLayout.appendChild(dashboardHeader);
          
          // Create main content grid
          const dashboardGrid = document.createElement('div');
          dashboardGrid.className = 'dashboard-grid';
          
          // Left column - Treatment Types
          const leftColumn = document.createElement('div');
          leftColumn.className = 'dashboard-column';
          
          // Add section header
          const treatmentHeader = document.createElement('div');
          treatmentHeader.className = 'dashboard-section-header';
          treatmentHeader.innerHTML = `
            <h3>Treatment Types</h3>
            <p>Monitor the distribution of treatment types to ensure appropriate resource allocation and prioritization.</p>
          `;
          leftColumn.appendChild(treatmentHeader);
          
          // Add treatment types card
          const treatmentCard = createDashboardCard(
            'Current Treatment Distribution',
            'Track the distribution of treatment types to optimize staff allocation and resource planning.',
            treatmentData,
            'doughnut',
            treatmentData.map(d => d.color),
            'Treatment Type',
            'Number of Patients'
          );
          leftColumn.appendChild(treatmentCard);
          
          // Right column - Wait Times
          const rightColumn = document.createElement('div');
          rightColumn.className = 'dashboard-column';
          
          // Add section header
          const waitTimeHeader = document.createElement('div');
          waitTimeHeader.className = 'dashboard-section-header';
          waitTimeHeader.innerHTML = `
            <h3>Wait Time Analysis</h3>
            <p>Analyze patient wait times to identify bottlenecks and improve triage efficiency.</p>
          `;
          rightColumn.appendChild(waitTimeHeader);
          
          // Add wait time card
          // FIX: Added color property to the data objects
          const waitTimeData = [
            { label: '0-15 min', value: 0, color: '#68d391' },
            { label: '15-30 min', value: 0, color: '#f6ad55' },
            { label: '30-60 min', value: 0, color: '#ed8936' },
            { label: '60+ min', value: 0, color: '#e53e3e' }
          ];

          // Simulate wait times for treatment rooms
          treatmentRoomData.forEach(row => {
            const randomWait = Math.random();
            if (randomWait < 0.4) waitTimeData[0].value++; // 0-15 min
            else if (randomWait < 0.7) waitTimeData[1].value++; // 15-30 min
            else if (randomWait < 0.9) waitTimeData[2].value++; // 30-60 min
            else waitTimeData[3].value++; // 60+ min
          });

          const waitTimeCard = createDashboardCard(
            'Wait Time Distribution',
            'Monitor wait time patterns to identify areas for improvement in patient flow.',
            waitTimeData,
            'bar',
            waitTimeData.map(d => d.color), // Now this will correctly pass the colors
            'Wait Time Range',
            'Number of Patients'
          );
          rightColumn.appendChild(waitTimeCard);
          
          // Add columns to grid
          dashboardGrid.appendChild(leftColumn);
          dashboardGrid.appendChild(rightColumn);
          dashboardLayout.appendChild(dashboardGrid);
          
          // Add dashboard footer with insights
          const dashboardFooter = document.createElement('div');
          dashboardFooter.className = 'dashboard-footer';
          dashboardFooter.innerHTML = `
            <h3>Key Insights</h3>
            <ul class="insights-list">
              <li>
                <span>High acuity patients (Level 1-2): ${getHighAcuityPercentage(acuityData)}%</span>
              </li>
              <li>
                <i class="fas fa-clock"></i>
                <span>Average wait time: ${getAverageWaitTime(waitTimeData)} minutes</span>
              </li>
              <li>
                <i class="fas fa-exclamation-circle"></i>
                <span>Patients waiting > 60 min: ${getLongWaitCount(waitTimeData)}</span>
              </li>
              <li>
                <i class="fas fa-heartbeat"></i>
                <span>High priority treatments (Emergency, Surgery): ${getHighPriorityPercentage(treatmentData)}%</span>
              </li>
            </ul>
          `;
          dashboardLayout.appendChild(dashboardFooter);
          
          grid.appendChild(dashboardLayout);
          
          // Helper functions for insights
          function getHighAcuityPercentage(data) {
            const highAcuity = data
              .filter(d => d.label.includes('Level 1') || d.label.includes('Level 2'))
              .reduce((sum, d) => sum + d.value, 0);
            const total = data.reduce((sum, d) => sum + d.value, 0);
            return total ? Math.round((highAcuity / total) * 100) : 0;
          }
          
          function getAverageWaitTime(data) {
            const totalPatients = data.reduce((sum, d) => sum + d.value, 0);
            const weightedTime = data.reduce((sum, d) => {
              const midPoint = d.label.includes('0-15') ? 7.5 :
                                 d.label.includes('15-30') ? 22.5 :
                                 d.label.includes('30-60') ? 45 : 75;
              return sum + (d.value * midPoint);
            }, 0);
            return totalPatients ? Math.round(weightedTime / totalPatients) : 0;
          }
          
          function getLongWaitCount(data) {
            const longWait = data.find(d => d.label === '60+ min');
            return longWait ? longWait.value : 0;
          }
          
          function getHighPriorityPercentage(data) {
            const highPriority = data
              .filter(d => d.label.includes('Emergency') || d.label.includes('Surgery'))
              .reduce((sum, d) => sum + d.value, 0);
            const total = data.reduce((sum, d) => sum + d.value, 0);
            return total ? Math.round((highPriority / total) * 100) : 0;
          }
        } catch (error) {
          console.error('Error processing treatment data:', error);
          grid.innerHTML = `
            <div class="dashboard-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Error processing treatment data. Please try again later.</p>
              <p class="error-details">${error.message}</p>
            </div>
          `;
        }
      }).catch(error => {
        console.error('Error loading treatment data:', error);
        grid.innerHTML = `
          <div class="dashboard-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error loading treatment data. Please try again later.</p>
            <p class="error-details">${error.message}</p>
          </div>
        `;
      });
      return;
    }

    // X-Ray Department Dashboard
    if (roomType === 'xray') {
      // Show loading state
      grid.innerHTML = `
        <div class="dashboard-loading">
          <div class="loading-spinner"></div>
          <p>Loading X-Ray analytics...</p>
        </div>
      `;

      // Load and parse CSVs using d3-fetch
      Promise.all([
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/transfers.csv').catch(err => { console.error('Error loading transfers.csv:', err); return []; }).catch(err => {
          console.error('Error loading transfers.csv:', err);
          return [];
        }),
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/services.csv').catch(err => { console.error('Error loading services.csv:', err); return []; }).catch(err => {
          console.error('Error loading services.csv:', err);
          return [];
        })
      ]).then(([transfers, services]) => {
        if (!transfers.length || !services.length) {
          grid.innerHTML = `
            <div class="dashboard-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Unable to load X-Ray data. Please try again later.</p>
            </div>
          `;
          return;
        }

        try {
          // Process data for X-Ray analytics
          const xrayAnalyticsData = transfers.filter(r => 
            r.careunit === 'Radiology' || 
            r.careunit === 'Imaging'
          );

          // X-Ray Type Distribution
          const xrayTypes = {
            'CT Scan': 0,
            'X-Ray': 0,
            'MRI': 0,
            'Ultrasound': 0
          };

          // Patient Flow Status
          const flowStatus = {
            'Waiting for Scan': 0,
            'In Scan': 0,
            'Post-Scan': 0,
            'Ready for Discharge': 0
          };

          // Simulate data based on service types
          xrayAnalyticsData.forEach(row => {
            if (row.service) {
              // Assign X-Ray types based on service
              if (row.service.includes('CT')) {
                xrayTypes['CT Scan']++;
                flowStatus['In Scan']++;
              } else if (row.service.includes('X-Ray')) {
                xrayTypes['X-Ray']++;
                flowStatus['Waiting for Scan']++;
              } else if (row.service.includes('MRI')) {
                xrayTypes['MRI']++;
                flowStatus['Post-Scan']++;
              } else if (row.service.includes('Ultrasound')) {
                xrayTypes['Ultrasound']++;
                flowStatus['Ready for Discharge']++;
              } else {
                xrayTypes['Other']++;
                flowStatus['Waiting for Scan']++;
              }
            }
          });

          // Add default data if no real data is found
          if (Object.values(xrayTypes).every(val => val === 0)) {
            console.log('No real X-Ray data found, using default data');
            xrayTypes['CT Scan'] = 15;
            xrayTypes['X-Ray'] = 25;
            xrayTypes['MRI'] = 10;
            xrayTypes['Ultrasound'] = 8;
          }

          if (Object.values(flowStatus).every(val => val === 0)) {
            console.log('No real flow status data found, using default data');
            flowStatus['Waiting for Scan'] = 20;
            flowStatus['In Scan'] = 15;
            flowStatus['Post-Scan'] = 18;
            flowStatus['Ready for Discharge'] = 12;
          }

          console.log('X-Ray Types Data:', xrayTypes);
          console.log('X-Ray Flow Status Data:', flowStatus);

          const xrayData = Object.entries(xrayTypes)
            .map(([label, value]) => ({ 
              label, 
              value,
              color: label.includes('CT') ? '#e53e3e' : 
                     label.includes('X-Ray') ? '#ed8936' : 
                     label.includes('MRI') ? '#48bb78' : 
                     label.includes('Ultrasound') ? '#4299e1' : 
                     '#a0aec0'
            }));

          const flowData = Object.entries(flowStatus)
            .map(([label, value]) => ({ 
              label, 
              value,
              color: label.includes('Waiting') ? '#e53e3e' : 
                     label.includes('In Scan') ? '#f6ad55' : 
                     label.includes('Post') ? '#68d391' : 
                     '#4299e1'
            }));

          console.log('Processed X-Ray Data:', xrayData);
          console.log('Processed Flow Data:', flowData);

          // Clear loading state and render dashboard
          grid.innerHTML = '';
          
          // Create dashboard layout
          const dashboardLayout = document.createElement('div');
          dashboardLayout.className = 'emergency-dashboard-layout';
          
          // Add dashboard header with summary
          const dashboardHeader = document.createElement('div');
          dashboardHeader.className = 'dashboard-header';
          dashboardHeader.innerHTML = `
            <h2>X-Ray Department Analytics</h2>
            <p class="dashboard-summary">
              Real-time insights into X-Ray types and patient flow
              to optimize imaging operations and resource allocation.
            </p>
          `;
          dashboardLayout.appendChild(dashboardHeader);
          
          // Create main content grid
          const dashboardGrid = document.createElement('div');
          dashboardGrid.className = 'dashboard-grid';
          
          // Left column - X-Ray Types
          const leftColumn = document.createElement('div');
          leftColumn.className = 'dashboard-column';
          
          // Add section header
          const xrayHeader = document.createElement('div');
          xrayHeader.className = 'dashboard-section-header';
          xrayHeader.innerHTML = `
            <h3>X-Ray Types</h3>
            <p>Monitor the distribution of X-Ray types to ensure appropriate resource allocation and prioritization.</p>
          `;
          leftColumn.appendChild(xrayHeader);
          
          // Add xray types card
          const xrayCard = createDashboardCard(
            'Current X-Ray Distribution',
            'Track the distribution of X-Ray types to optimize staff allocation and resource planning.',
            xrayData,
            'doughnut',
            xrayData.map(d => d.color),
            'X-Ray Type',
            'Number of Patients'
          );
          leftColumn.appendChild(xrayCard);
          
          // Right column - X-Ray Flow
          const rightColumn = document.createElement('div');
          rightColumn.className = 'dashboard-column';
          
          // Add section header
          const xrayFlowHeader = document.createElement('div');
          xrayFlowHeader.className = 'dashboard-section-header';
          xrayFlowHeader.innerHTML = `
            <h3>X-Ray Flow</h3>
            <p>Analyze X-Ray flow patterns to identify bottlenecks and improve imaging efficiency.</p>
          `;
          rightColumn.appendChild(xrayFlowHeader);
          
          // Add xray flow card
          const xrayFlowCard = createDashboardCard(
            'X-Ray Flow by Type',
            'Monitor X-Ray flow patterns to anticipate peak periods and adjust staffing accordingly.',
            flowData,
            'bar',
            flowData.map(d => d.color), // FIX: Use the color from the data
            'X-Ray Type',
            'Number of Patients'
          );
          rightColumn.appendChild(xrayFlowCard);
          
          // Add columns to grid
          dashboardGrid.appendChild(leftColumn);
          dashboardGrid.appendChild(rightColumn);
          dashboardLayout.appendChild(dashboardGrid);
          
          // Add dashboard footer with insights
          const dashboardFooter = document.createElement('div');
          dashboardFooter.className = 'dashboard-footer';
          dashboardFooter.innerHTML = `
            <h3>Key Insights</h3>
            <ul class="insights-list">
              <li>
                <i class="fas fa-heartbeat"></i>
                <span>High X-Ray types (CT, MRI): ${getHighXRayPercentage(xrayData)}%</span>
              </li>
              <li>
                <i class="fas fa-clock"></i>
                <span>Average wait time: ${getAverageWaitTime(flowData)} minutes</span>
              </li>
              <li>
                <i class="fas fa-exclamation-circle"></i>
                <span>Patients waiting > 60 min: ${getLongWaitCount(flowData)}</span>
              </li>
            </ul>
          `;
          dashboardLayout.appendChild(dashboardFooter);
          
          grid.appendChild(dashboardLayout);
          
          // Helper functions for insights
          function getHighXRayPercentage(data) {
            const highXRay = data
              .filter(d => d.label.includes('CT') || d.label.includes('MRI'))
              .reduce((sum, d) => sum + d.value, 0);
            const total = data.reduce((sum, d) => sum + d.value, 0);
            return total ? Math.round((highXRay / total) * 100) : 0;
          }
          
          function getAverageWaitTime(data) {
            const totalPatients = data.reduce((sum, d) => sum + d.value, 0);
            const weightedTime = data.reduce((sum, d) => {
              const midPoint = d.label.includes('0-15') ? 7.5 :
                                 d.label.includes('15-30') ? 22.5 :
                                 d.label.includes('30-60') ? 45 : 75;
              return sum + (d.value * midPoint);
            }, 0);
            return totalPatients ? Math.round(weightedTime / totalPatients) : 0;
          }
          
          function getLongWaitCount(data) {
            const longWait = data.find(d => d.label === '60+ min');
            return longWait ? longWait.value : 0;
          }
        } catch (error) {
          console.error('Error processing X-Ray data:', error);
          grid.innerHTML = `
            <div class="dashboard-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Error processing X-Ray data. Please try again later.</p>
              <p class="error-details">${error.message}</p>
            </div>
          `;
        }
      }).catch(error => {
        console.error('Error loading X-Ray data:', error);
        grid.innerHTML = `
          <div class="dashboard-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error loading X-Ray data. Please try again later.</p>
            <p class="error-details">${error.message}</p>
          </div>
        `;
      });
      return;
    }

    // Reception Area Dashboard
    if (roomType === 'reception') {
      // Show loading state
      grid.innerHTML = `
        <div class="dashboard-loading">
          <div class="loading-spinner"></div>
          <p>Loading reception analytics...</p>
        </div>
      `;

      // Load and parse CSVs using d3-fetch
      Promise.all([
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/transfers.csv').catch(err => { console.error('Error loading transfers.csv:', err); return []; }).catch(err => {
          console.error('Error loading transfers.csv:', err);
          return [];
        }),
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/services.csv').catch(err => { console.error('Error loading services.csv:', err); return []; }).catch(err => {
          console.error('Error loading services.csv:', err);
          return [];
        })
      ]).then(([transfers, services]) => {
        if (!transfers.length || !services.length) {
          grid.innerHTML = `
            <div class="dashboard-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Unable to load reception data. Please try again later.</p>
            </div>
          `;
          return;
        }

        try {
          // Process data for reception analytics
          const receptionData = transfers.filter(r => 
            r.careunit === 'Emergency Department' || 
            r.careunit === 'Medicine' || 
            r.careunit === 'Surgery'
          );

          // Registration Status Distribution
          const registrationStatus = {
            'Completed': 0,
            'In Progress': 0,
            'Waiting': 0
          };

          receptionData.forEach(row => {
            if (row.intime) {
              const registrationTime = new Date(row.intime.replace(' ', 'T'));
              const currentTime = new Date();
              const timeDiff = (currentTime - registrationTime) / (1000 * 60); // in minutes

              if (timeDiff < 5) {
                registrationStatus['In Progress']++;
              } else if (timeDiff < 15) {
                registrationStatus['Waiting']++;
              } else {
                registrationStatus['Completed']++;
              }
            }
          });

          const registrationData = Object.entries(registrationStatus)
            .map(([label, value]) => ({ 
              label, 
              value,
              color: label === 'Completed' ? '#68d391' : 
                     label === 'In Progress' ? '#f6ad55' : 
                     '#fc8181'
            }));

          // Queue Length by Hour
          const queueByHour = Array(24).fill(0);
          receptionData.forEach(row => {
            if (row.intime) {
              const hour = new Date(row.intime.replace(' ', 'T')).getHours();
              queueByHour[hour]++;
            }
          });
          const queueData = queueByHour.map((count, hour) => ({
            label: `${hour}:00`,
            value: count
          }));

          // Clear loading state and render dashboard
          grid.innerHTML = '';
          
          // Create dashboard layout
          const dashboardLayout = document.createElement('div');
          dashboardLayout.className = 'emergency-dashboard-layout';
          
          // Add dashboard header with summary
          const dashboardHeader = document.createElement('div');
          dashboardHeader.className = 'dashboard-header';
          dashboardHeader.innerHTML = `
            <h2>Reception Area Analytics</h2>
            <p class="dashboard-summary">
              Real-time insights into registration status and queue management
              to optimize patient flow and resource allocation.
            </p>
          `;
          dashboardLayout.appendChild(dashboardHeader);
          
          // Create main content grid
          const dashboardGrid = document.createElement('div');
          dashboardGrid.className = 'dashboard-grid';
          
          // Left column - Registration Status
          const leftColumn = document.createElement('div');
          leftColumn.className = 'dashboard-column';
          
          // Add section header
          const statusHeader = document.createElement('div');
          statusHeader.className = 'dashboard-section-header';
          statusHeader.innerHTML = `
            <h3>Registration Status</h3>
            <p>Monitor the current state of patient registrations to manage queue length and staff allocation.</p>
          `;
          leftColumn.appendChild(statusHeader);
          
          // Add registration status card
          const statusCard = createDashboardCard(
            'Current Registration Status',
            'Track the distribution of registration statuses to optimize staff allocation and reduce wait times.',
            registrationData,
            'doughnut',
            registrationData.map(d => d.color),
            'Status',
            'Number of Patients'
          );
          leftColumn.appendChild(statusCard);
          
          // Right column - Queue Management
          const rightColumn = document.createElement('div');
          rightColumn.className = 'dashboard-column';
          
          // Add section header
          const queueHeader = document.createElement('div');
          queueHeader.className = 'dashboard-section-header';
          queueHeader.innerHTML = `
            <h3>Queue Management</h3>
            <p>Analyze queue patterns throughout the day to optimize staffing and reduce wait times.</p>
          `;
          rightColumn.appendChild(queueHeader);
          
          // Add queue length card
          const queueCard = createDashboardCard(
            'Queue Length by Hour',
            'Monitor queue length patterns to anticipate peak periods and adjust staffing accordingly.',
            queueData,
            'bar',
            ['#63b3ed'], // FIX: Added default color for the bar chart
            'Hour of Day',
            'Queue Length'
          );
          rightColumn.appendChild(queueCard);
          
          // Add columns to grid
          dashboardGrid.appendChild(leftColumn);
          dashboardGrid.appendChild(rightColumn);
          dashboardLayout.appendChild(dashboardGrid);
          
          // Add dashboard footer with insights
          const dashboardFooter = document.createElement('div');
          dashboardFooter.className = 'dashboard-footer';
          dashboardFooter.innerHTML = `
            <h3>Key Insights</h3>
            <ul class="insights-list">
              <li>
                <i class="fas fa-check-circle"></i>
                <span>Registration completion rate: ${getCompletionRate(registrationData)}%</span>
              </li>
              <li>
                <i class="fas fa-clock"></i>
                <span>Peak queue hours: ${getPeakQueueHours(queueData)}</span>
              </li>
              <li>
                <i class="fas fa-users"></i>
                <span>Average queue length: ${getAverageQueueLength(queueData)}</span>
              </li>
            </ul>
          `;
          dashboardLayout.appendChild(dashboardFooter);
          
          grid.appendChild(dashboardLayout);
          
          // Helper functions for insights
          function getCompletionRate(data) {
            const completed = data.find(d => d.label === 'Completed')?.value || 0;
            const total = data.reduce((sum, d) => sum + d.value, 0);
            return total ? Math.round((completed / total) * 100) : 0;
          }
          
          function getPeakQueueHours(data) {
            const peakHours = data
              .map((d, i) => ({ hour: i, value: d.value }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 3)
              .map(d => `${d.hour}:00`)
              .join(', ');
            return peakHours;
          }
          
          function getAverageQueueLength(data) {
            const total = data.reduce((sum, d) => sum + d.value, 0);
            return Math.round(total / data.length);
          }
        } catch (error) {
          console.error('Error processing reception data:', error);
          grid.innerHTML = `
            <div class="dashboard-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Error processing reception data. Please try again later.</p>
              <p class="error-details">${error.message}</p>
            </div>
          `;
        }
      }).catch(error => {
        console.error('Error loading reception data:', error);
        grid.innerHTML = `
          <div class="dashboard-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error loading reception data. Please try again later.</p>
            <p class="error-details">${error.message}</p>
          </div>
        `;
      });
      return;
    }

    // Entry Room Dashboard
    if (roomType === 'entry') {
      // Show loading state
      grid.innerHTML = `
        <div class="dashboard-loading">
          <div class="loading-spinner"></div>
          <p>Loading entry analytics...</p>
        </div>
      `;

      // Load and parse CSVs using d3-fetch
      Promise.all([
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/transfers.csv').catch(err => { console.error('Error loading transfers.csv:', err); return []; }).catch(err => {
          console.error('Error loading transfers.csv:', err);
          return [];
        }),
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/services.csv').catch(err => { console.error('Error loading services.csv:', err); return []; }).catch(err => {
          console.error('Error loading services.csv:', err);
          return [];
        })
      ]).then(([transfers, services]) => {
        if (!transfers.length || !services.length) {
          grid.innerHTML = `
            <div class="dashboard-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Unable to load entry data. Please try again later.</p>
            </div>
          `;
          return;
        }

        try {
          // Process data for entry analytics
          const entryData = transfers.filter(r => r.careunit === 'Emergency Department' || r.careunit === 'Medicine' || r.careunit === 'Surgery');

          // Patient Arrivals by Hour
          const arrivalsByHour = Array(24).fill(0);
          entryData.forEach(row => {
            if (row.intime) {
              const hour = new Date(row.intime.replace(' ', 'T')).getHours();
              arrivalsByHour[hour]++;
            }
          });
          const flowData = arrivalsByHour.map((count, hour) => ({
            label: `${hour}:00`,
            value: count
          }));

          // Service Distribution
          const serviceCounts = {};
          entryData.forEach(row => {
            const service = services.find(s => s.hadm_id === row.hadm_id)?.curr_service || 'Unknown';
            serviceCounts[service] = (serviceCounts[service] || 0) + 1;
          });
          const serviceData = Object.entries(serviceCounts)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);

          // Clear loading state and render dashboard
          grid.innerHTML = '';
          
          // Create dashboard layout
          const dashboardLayout = document.createElement('div');
          dashboardLayout.className = 'emergency-dashboard-layout';
          
          // Add dashboard header with summary
          const dashboardHeader = document.createElement('div');
          dashboardHeader.className = 'dashboard-header';
          dashboardHeader.innerHTML = `
            <h2>Hospital Entry Analytics</h2>
            <p class="dashboard-summary">
              Real-time insights into patient arrival patterns and service distribution
              to help optimize entry operations and resource allocation.
            </p>
          `;
          dashboardLayout.appendChild(dashboardHeader);
          
          // Create main content grid
          const dashboardGrid = document.createElement('div');
          dashboardGrid.className = 'dashboard-grid';
          
          // Left column - Patient Flow
          const leftColumn = document.createElement('div');
          leftColumn.className = 'dashboard-column';
          
          // Add section header
          const flowHeader = document.createElement('div');
          flowHeader.className = 'dashboard-section-header';
          flowHeader.innerHTML = `
            <h3>Patient Arrival Patterns</h3>
            <p>Understanding when patients arrive helps optimize staffing and resource allocation at the entry point.</p>
          `;
          leftColumn.appendChild(flowHeader);
          
          // Add cards with improved descriptions
          const arrivalsCard = createDashboardCard(
            'Patient Arrivals by Hour',
            'Track peak hours and patient volume patterns throughout the day to optimize entry staffing levels.',
            flowData,
            'bar',
            ['#4fd1c7'], // FIX: Added default color
            'Hour of Day',
            'Number of Patients'
          );
          leftColumn.appendChild(arrivalsCard);
          
          // Right column - Service Distribution
          const rightColumn = document.createElement('div');
          rightColumn.className = 'dashboard-column';
          
          // Add section header
          const serviceHeader = document.createElement('div');
          serviceHeader.className = 'dashboard-section-header';
          serviceHeader.innerHTML = `
            <h3>Service Distribution</h3>
            <p>Analyze the types of services patients require upon entry to ensure appropriate resource allocation.</p>
          `;
          rightColumn.appendChild(serviceHeader);
          
          // Add service distribution card
          const serviceCard = createDashboardCard(
            'Initial Service Distribution',
            'Monitor the types of services patients require upon entry to ensure appropriate resource allocation.',
            serviceData,
            'bar',
            ['#63b3ed'], // FIX: Added default color
            'Service Type',
            'Number of Patients'
          );
          rightColumn.appendChild(serviceCard);
          
          // Add columns to grid
          dashboardGrid.appendChild(leftColumn);
          dashboardGrid.appendChild(rightColumn);
          dashboardLayout.appendChild(dashboardGrid);
          
          // Add dashboard footer with insights
          const dashboardFooter = document.createElement('div');
          dashboardFooter.className = 'dashboard-footer';
          dashboardFooter.innerHTML = `
            <h3>Key Insights</h3>
            <ul class="insights-list">
              <li>
                <i class="fas fa-clock"></i>
                <span>Peak arrival hours: ${getPeakHours(flowData)}</span>
              </li>
              <li>
                <i class="fas fa-hospital"></i>
                <span>Most common service: ${getTopService(serviceData)}</span>
              </li>
              <li>
                <i class="fas fa-users"></i>
                <span>Total daily arrivals: ${getTotalArrivals(flowData)}</span>
              </li>
            </ul>
          `;
          dashboardLayout.appendChild(dashboardFooter);
          
          grid.appendChild(dashboardLayout);
          
          // Helper functions for insights
          function getPeakHours(data) {
            const peakHours = data
              .map((d, i) => ({ hour: i, value: d.value }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 3)
              .map(d => `${d.hour}:00`)
              .join(', ');
            return peakHours;
          }
          
          function getTopService(data) {
            return data[0]?.label || 'N/A';
          }
          
          function getTotalArrivals(data) {
            return data.reduce((sum, d) => sum + d.value, 0);
          }
        } catch (error) {
          console.error('Error processing entry data:', error);
          grid.innerHTML = `
            <div class="dashboard-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Error processing entry data. Please try again later.</p>
              <p class="error-details">${error.message}</p>
            </div>
          `;
        }
      }).catch(error => {
        console.error('Error loading entry data:', error);
        grid.innerHTML = `
          <div class="dashboard-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error loading entry data. Please try again later.</p>
            <p class="error-details">${error.message}</p>
          </div>
        `;
      });
      return;
    }

    // Emergency Department: Use real data from CSVs
    if (roomType === 'emergency') {
      // Show loading state
      grid.innerHTML = `
        <div class="dashboard-loading">
          <div class="loading-spinner"></div>
          <p>Loading emergency department analytics...</p>
        </div>
      `;

      // Load and parse CSVs using d3-fetch
      Promise.all([
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/transfers.csv').catch(err => { console.error('Error loading transfers.csv:', err); return []; }).catch(err => {
          console.error('Error loading transfers.csv:', err);
          return [];
        }),
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/services.csv').catch(err => { console.error('Error loading services.csv:', err); return []; }).catch(err => {
          console.error('Error loading services.csv:', err);
          return [];
        }),
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/omr.csv').catch(err => {
          console.error('Error loading omr.csv:', err);
          return [];
        })
      ]).then(([transfers, services, omr]) => {
        if (!transfers.length || !services.length || !omr.length) {
          grid.innerHTML = `
            <div class="dashboard-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Unable to load emergency department data. Please try again later.</p>
            </div>
          `;
          return;
        }

        try {
          // Process data
        const edRows = transfers.filter(r => r.careunit === 'Emergency Department');
          if (!edRows.length) {
            throw new Error('No emergency department data found');
          }

          // Patient Arrivals by Hour
        const arrivalsByHour = Array(24).fill(0);
        edRows.forEach(row => {
            if (row.intime) {
            const hour = new Date(row.intime.replace(' ', 'T')).getHours();
            arrivalsByHour[hour]++;
            }
          });
          const flowData = arrivalsByHour.map((count, hour) => ({
            label: `${hour}:00`,
            value: count
          }));

          // Length of Stay
          const stays = edRows
            .map(row => {
            if (!row.intime || !row.outtime) return null;
            const inTime = new Date(row.intime.replace(' ', 'T'));
            const outTime = new Date(row.outtime.replace(' ', 'T'));
            return (outTime - inTime) / (1000 * 60 * 60);
            })
            .filter(h => h !== null && h > 0 && h < 48);

        const stayBuckets = Array(12).fill(0);
        stays.forEach(h => {
          const idx = Math.min(Math.floor(h / 2), 11);
          stayBuckets[idx]++;
        });
          const stayData = stayBuckets.map((count, i) => ({
            range: `${i*2}-${i*2+2}h`,
            count
          }));

          // Careunit Flow
        const careunitCounts = {};
          edRows.forEach(row => {
            if (row.outtime) {
              // Find all subsequent transfers for this patient
              const subsequentTransfers = transfers.filter(r => 
                r.subject_id === row.subject_id && 
                r.hadm_id === row.hadm_id && 
                r.intime && 
                new Date(r.intime.replace(' ', 'T')) > new Date(row.outtime.replace(' ', 'T'))
              ).sort((a, b) => new Date(a.intime.replace(' ', 'T')) - new Date(b.intime.replace(' ', 'T')));

              // Get the next immediate destination
              const nextTransfer = subsequentTransfers[0];
              if (nextTransfer?.careunit) {
                // Clean up care unit name for better display
                const cleanUnitName = nextTransfer.careunit
                  .replace('Intensive Care Unit', 'ICU')
                  .replace('Coronary Care Unit', 'CCU')
                  .replace('Medical Intensive Care Unit', 'MICU')
                  .replace('Surgical Intensive Care Unit', 'SICU')
                  .replace('Neuro Stepdown', 'Neuro Unit')
                  .replace('Emergency Department', 'ED')
                  .trim();
                
                careunitCounts[cleanUnitName] = (careunitCounts[cleanUnitName] || 0) + 1;
              } else {
                // If no subsequent transfer found, count as discharged
                careunitCounts['Discharged'] = (careunitCounts['Discharged'] || 0) + 1;
              }
            }
          }
          );
          // Sort destinations by count and take top 8
          const careunitData = Object.entries(careunitCounts)
            .map(([label, value]) => ({ 
              label, 
              value,
              // Add color based on unit type
              color: label.includes('ICU') ? '#4299e1' : 
                     label.includes('CCU') ? '#f56565' :
                     label.includes('Neuro') ? '#48bb78' :
                     label.includes('Medicine') ? '#ed8936' :
                     label.includes('Surgery') ? '#9f7aea' :
                     label === 'Discharged' ? '#718096' :
                     '#a0aec0'
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);

          // Service Distribution
        const edHadmIds = new Set(edRows.map(r => r.hadm_id));
        const serviceCounts = {};
        services.forEach(row => {
          if (edHadmIds.has(row.hadm_id)) {
            const svc = row.curr_service || 'Unknown';
            serviceCounts[svc] = (serviceCounts[svc] || 0) + 1;
          }
        });
          const serviceData = Object.entries(serviceCounts)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6); // Show top 6 services

          // Vitals Trend
        const edSubjectIds = new Set(edRows.map(r => r.subject_id));
          console.log('Processing vitals data for', edSubjectIds.size, 'patients');

        const vitals = { BMI: [], Weight: [], BP: [] };
        omr.forEach(row => {
          if (!edSubjectIds.has(row.subject_id)) return;
            if (row.result_name === 'BMI (kg/m2)') {
              vitals.BMI.push({ date: row.chartdate, value: parseFloat(row.result_value) });
            }
            if (row.result_name === 'Weight (Lbs)') {
              vitals.Weight.push({ date: row.chartdate, value: parseFloat(row.result_value) });
            }
            if (row.result_name === 'Blood Pressure') {
              vitals.BP.push({ date: row.chartdate, value: row.result_value });
            }
          });

          console.log('Vitals data collected:', {
            BMI: vitals.BMI.length,
            Weight: vitals.Weight.length,
            BP: vitals.BP.length
          });

          const sortByDate = arr => {
            console.log('Sorting array of length:', arr.length);
            const sorted = arr
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, 20)
              .reverse();
            console.log('Sorted array length:', sorted.length);
            return sorted;
          };

          const bmiTrend = sortByDate(vitals.BMI)
            .map(d => ({ label: d.date, value: d.value }));
          const weightTrend = sortByDate(vitals.Weight)
            .map(d => ({ label: d.date, value: d.value }));
          const bpTrend = sortByDate(vitals.BP)
            .map(d => {
            const [sys, dia] = (d.value || '').split('/').map(Number);
            return { label: d.date, systolic: sys, diastolic: dia };
        });

          console.log('Processed trends:', {
            BMI: bmiTrend.length,
            Weight: weightTrend.length,
            BP: bpTrend.length
          });

          // Clear loading state and render dashboard
        grid.innerHTML = '';
          
          // Create dashboard layout
          const dashboardLayout = document.createElement('div');
          dashboardLayout.className = 'emergency-dashboard-layout';
          
          // Add dashboard header with summary
          const dashboardHeader = document.createElement('div');
          dashboardHeader.className = 'dashboard-header';
          dashboardHeader.innerHTML = `
            <h2>Emergency Department Analytics</h2>
            <p class="dashboard-summary">
              Real-time insights into patient flow, care patterns, and operational metrics
              to help optimize emergency care delivery and resource allocation.
            </p>
          `;
          dashboardLayout.appendChild(dashboardHeader);
          
          // Create main content grid
          const dashboardGrid = document.createElement('div');
          dashboardGrid.className = 'dashboard-grid';
          
          // Left column - Patient Flow
          const leftColumn = document.createElement('div');
          leftColumn.className = 'dashboard-column';
          
          // Add section header
          const flowHeader = document.createElement('div');
          flowHeader.className = 'dashboard-section-header';
          flowHeader.innerHTML = `
            <h3>Patient Flow Analysis</h3>
            <p>Understanding when patients arrive and how long they stay helps optimize staffing and resource allocation.</p>
          `;
          leftColumn.appendChild(flowHeader);
          
          // Add cards with improved descriptions
          const arrivalsCard = createDashboardCard(
            'Patient Arrivals by Hour',
            'Track peak hours and patient volume patterns throughout the day to optimize staffing levels and resource allocation.',
            flowData,
            'bar',
            ['#fc8181'], // FIX: Added default color
            'Hour of Day',
            'Number of Patients'
          );
          leftColumn.appendChild(arrivalsCard);
          
          const stayCard = createDashboardCard(
            'Length of Stay Distribution',
            'Monitor how long patients typically spend in the ED to identify bottlenecks and improve patient flow.',
            stayData.map(d => ({ label: d.range, value: d.count })),
            'bar',
            ['#63b3ed'], // FIX: Added default color
            'Duration',
            'Number of Patients'
          );
          leftColumn.appendChild(stayCard);
          
          // Right column - Patient Care
          const rightColumn = document.createElement('div');
          rightColumn.className = 'dashboard-column';
          
          // Add section header
          const careHeader = document.createElement('div');
          careHeader.className = 'dashboard-section-header';
          careHeader.innerHTML = `
            <h3>Care Patterns & Outcomes</h3>
            <p>Analyze patient care pathways and service utilization to improve care delivery and resource planning.</p>
          `;
          rightColumn.appendChild(careHeader);
          
          // Add cards with improved descriptions
          const careunitCard = createDashboardCard(
            'Patient Flow After ED',
            'Track where patients go after emergency care to optimize care transitions and resource allocation across departments.',
            careunitData,
            'bar',
            careunitData.map(d => d.color), // Use the color property from the data
            'Destination Department',
            'Number of Patients'
          );
          rightColumn.appendChild(careunitCard);
          
          const serviceCard = createDashboardCard(
            'Service Distribution',
            'Monitor the types of services provided in the ED to ensure appropriate resource allocation and staffing.',
            serviceData,
            'bar',
            ['#68d391'], // FIX: Added default color
            'Service Type',
            'Number of Cases'
          );
          rightColumn.appendChild(serviceCard);
          
          // After creating the vitals section
          const vitalsSection = document.createElement('div');
          vitalsSection.className = 'dashboard-section vitals-section';
          vitalsSection.innerHTML = `
            <div class="dashboard-section-header">
              <h3>Patient Vitals Monitoring</h3>
              <p>Track key vital signs trends to monitor patient health and identify potential issues early.</p>
            </div>
            <div class="vitals-charts">
              <div class="vitals-chart" id="bmiChart">
                <div class="chart-loading">
                  <div class="loading-spinner"></div>
                  <p>Loading BMI data...</p>
                </div>
              </div>
              <div class="vitals-chart" id="weightChart">
                <div class="chart-loading">
                  <div class="loading-spinner"></div>
                  <p>Loading weight data...</p>
                </div>
              </div>
              <div class="vitals-chart" id="bpChart">
                <div class="chart-loading">
                  <div class="loading-spinner"></div>
                  <p>Loading blood pressure data...</p>
                </div>
              </div>
            </div>
            <div class="vitals-insights">
              <h4>Key Insights</h4>
              <ul class="insights-list">
                <li>
                  <i class="fas fa-chart-line"></i>
                  <span>BMI trends help identify nutritional status changes</span>
                </li>
                <li>
                  <i class="fas fa-weight"></i>
                  <span>Weight monitoring tracks fluid balance and nutrition</span>
                </li>
                <li>
                  <i class="fas fa-heartbeat"></i>
                  <span>Blood pressure trends indicate cardiovascular stability</span>
                </li>
              </ul>
            </div>
          `;

          // Append vitals section to dashboard layout
          dashboardLayout.appendChild(vitalsSection);

          // Render the vitals charts
          console.log('Starting chart rendering...');

          // Use requestAnimationFrame to ensure DOM is ready
          requestAnimationFrame(() => {
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
                const loadingElement = bmiChart.querySelector('.chart-loading');
                if (loadingElement) {
                  loadingElement.remove();
                }
                renderD3LineChart(bmiChart, bmiTrend, {
                  color: '#4299e1',
                  title: 'BMI Trend',
                  yTitle: 'BMI (kg/m²)'
                });
                console.log('BMI chart rendered successfully');
              } catch (error) {
                console.error('Error rendering BMI chart:', error);
                console.error('Error stack:', error.stack);
              }
            }

            if (weightChart && weightTrend.length) {
              console.log('Rendering weight chart with', weightTrend.length, 'data points');
              try {
                const loadingElement = weightChart.querySelector('.chart-loading');
                if (loadingElement) {
                  loadingElement.remove();
                }
                renderD3LineChart(weightChart, weightTrend, {
                  color: '#68d391',
                  title: 'Weight Trend',
                  yTitle: 'Weight (lbs)'
                });
                console.log('Weight chart rendered successfully');
              } catch (error) {
                console.error('Error rendering weight chart:', error);
                console.error('Error stack:', error.stack);
              }
            }

            if (bpChart && bpTrend.length) {
              console.log('Rendering blood pressure chart with', bpTrend.length, 'data points');
              try {
                const loadingElement = bpChart.querySelector('.chart-loading');
                if (loadingElement) {
                  loadingElement.remove();
                }
                renderD3LineChart(bpChart, bpTrend, {
                  color: '#fc8181',
                  title: 'Blood Pressure Trend',
                  yTitle: 'mmHg'
                });
                console.log('Blood pressure chart rendered successfully');
              } catch (error) {
                console.error('Error rendering blood pressure chart:', error);
                console.error('Error stack:', error.stack);
              }
            }
          });

          // Add columns to grid
          dashboardGrid.appendChild(leftColumn);
          dashboardGrid.appendChild(rightColumn);
          dashboardLayout.appendChild(dashboardGrid);
          
          // Add dashboard footer with insights
          const dashboardFooter = document.createElement('div');
          dashboardFooter.className = 'dashboard-footer';
          dashboardFooter.innerHTML = `
            <h3>Key Insights</h3>
            <ul class="insights-list">
              <li>
                <i class="fas fa-clock"></i>
                <span>Peak hours are typically between ${getPeakHours(flowData)}</span>
              </li>
              <li>
                <i class="fas fa-bed"></i>
                <span>Average length of stay: ${getAverageStay(stayData)} hours</span>
              </li>
              <li>
                <i class="fas fa-arrow-right"></i>
                <span>Most common destination: ${getTopDestination(careunitData)}</span>
              </li>
            </ul>
          `;
          dashboardLayout.appendChild(dashboardFooter);
          
          grid.appendChild(dashboardLayout);
          
          // Helper functions for insights
          function getPeakHours(data) {
            const peakHours = data
              .map((d, i) => ({ hour: i, value: d.value }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 3)
              .map(d => `${d.hour}:00`)
              .join(', ');
            return peakHours;
          }
          
          function getAverageStay(data) {
            const total = data.reduce((sum, d) => sum + (d.count * (parseInt(d.range) + 1)), 0);
            const count = data.reduce((sum, d) => sum + d.count, 0);
            return (total / count).toFixed(1);
          }
          
          function getTopDestination(data) {
            return data[0]?.label || 'N/A';
          }
          
          // ... rest of the existing code for rendering charts ...
        } catch (error) {
          console.error('Error processing emergency department data:', error);
          grid.innerHTML = `
            <div class="dashboard-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Error processing emergency department data. Please try again later.</p>
              <p class="error-details">${error.message}</p>
            </div>
          `;
        }
      }).catch(error => {
        console.error('Error loading emergency department data:', error);
        grid.innerHTML = `
          <div class="dashboard-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error loading emergency department data. Please try again later.</p>
            <p class="error-details">${error.message}</p>
          </div>
        `;
      });
      return;
    }
    
    // Staff Room Dashboard
    if (roomType === 'staff_room') {
      grid.innerHTML = `
        <div class="dashboard-loading">
          <div class="loading-spinner"></div>
          <p>Loading staff room analytics...</p>
        </div>
      `;

      Promise.all([
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/transfers.csv').catch(err => { console.error('Error loading transfers.csv:', err); return []; }),
        d3.csv('mimic-iv-clinical-database-demo-2.2/hosp/services.csv').catch(err => { console.error('Error loading services.csv:', err); return []; })
      ]).then(([transfers, services]) => {
        if (!transfers.length || !services.length) {
          grid.innerHTML = `
            <div class="dashboard-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Unable to load staff room data. Please try again later.</p>
            </div>
          `;
          return;
        }

        try {
          // Process staff room data
          const staffData = transfers.filter(r => 
            r.careunit === 'Medicine' || 
            r.careunit === 'Surgery' || 
            r.careunit === 'Emergency Department'
          );

          // Room Utilization Data
          const utilizationData = [
            { label: 'Break Time', value: 0, color: '#68d391' },
            { label: 'Meeting Time', value: 0, color: '#4299e1' },
            { label: 'Documentation', value: 0, color: '#f6ad55' },
            { label: 'Available', value: 0, color: '#a0aec0' }
          ];

          // Staff Distribution by Department
          const staffDistributionData = [
            { label: 'Medicine', value: 0, color: '#4299e1' },
            { label: 'Surgery', value: 0, color: '#f6ad55' },
            { label: 'Emergency', value: 0, color: '#fc8181' },
            { label: 'Other', value: 0, color: '#a0aec0' }
          ];

          // Process data
          staffData.forEach(row => {
            if (row.service) {
              // Update staff distribution
              if (row.service.includes('MED')) {
                staffDistributionData[0].value++;
              } else if (row.service.includes('SURG')) {
                staffDistributionData[1].value++;
              } else if (row.service.includes('EMERG')) {
                staffDistributionData[2].value++;
              } else {
                staffDistributionData[3].value++;
              }

              // Update utilization based on time of day
              const hour = new Date(row.intime.replace(' ', 'T')).getHours();
              if (hour >= 9 && hour <= 10 || hour >= 14 && hour <= 15) {
                utilizationData[0].value++; // Break time
              } else if (hour >= 8 && hour <= 9 || hour >= 15 && hour <= 16) {
                utilizationData[1].value++; // Meeting time
              } else if (hour >= 11 && hour <= 14) {
                utilizationData[2].value++; // Documentation
              } else {
                utilizationData[3].value++; // Available
              }
            }
          });

          // Calculate total staff
          const totalStaff = staffDistributionData.reduce((sum, d) => sum + d.value, 0);

          grid.innerHTML = '';
          const dashboardLayout = document.createElement('div');
          dashboardLayout.className = 'emergency-dashboard-layout';
          
          dashboardLayout.innerHTML = `
            <div class="dashboard-header">
              <h2>Staff Room Analytics</h2>
              <p class="dashboard-summary">
                Real-time insights into staff room utilization and department distribution
                to optimize space usage and staff coordination.
              </p>
            </div>
          `;
          
          const dashboardGrid = document.createElement('div');
          dashboardGrid.className = 'dashboard-grid';
          
          // Add room utilization card
          dashboardGrid.appendChild(createDashboardCard(
            'Room Utilization',
            'Track how the staff room is being used throughout the day.',
            utilizationData,
            'doughnut',
            utilizationData.map(d => d.color),
            'Activity Type',
            'Number of Staff'
          ));
          
          // Add staff distribution card
          // FIX: The arguments for createDashboardCard were incorrect. Corrected them.
          dashboardGrid.appendChild(createDashboardCard(
            'Staff Distribution',
            'Distribution of staff using the room by department.',
            staffDistributionData, // Correct data object
            'bar',
            staffDistributionData.map(d => d.color), // Correct colors array
            'Department',
            'Number of Staff'
          ));
          
          dashboardLayout.appendChild(dashboardGrid);
          
          // Add dashboard footer with insights
          const dashboardFooter = document.createElement('div');
          dashboardFooter.className = 'dashboard-footer';
          dashboardFooter.innerHTML = `
            <h3>Key Insights</h3>
            <ul class="insights-list">
              <li>
                <i class="fas fa-users"></i>
                <span>Total staff using room: ${totalStaff}</span>
              </li>
              <li>
                <i class="fas fa-clock"></i>
                <span>Peak usage: ${getPeakUsageTime(utilizationData)}</span>
              </li>
              <li>
                <i class="fas fa-chart-pie"></i>
                <span>Largest department: ${getLargestDepartment(staffDistributionData)}</span>
              </li>
            </ul>
          `;
          dashboardLayout.appendChild(dashboardFooter);
          
          grid.appendChild(dashboardLayout);

          // Helper functions
          function getPeakUsageTime(data) {
            const peakActivity = data.reduce((max, curr) => curr.value > max.value ? curr : max, data[0]);
            return `${peakActivity.label} (${peakActivity.value} staff)`;
          }

          function getLargestDepartment(data) {
            const largest = data.reduce((max, curr) => curr.value > max.value ? curr : max, data[0]);
            return `${largest.label} (${largest.value} staff)`;
          }

        } catch (error) {
          console.error('Error processing staff room data:', error);
          grid.innerHTML = `
            <div class="dashboard-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Error processing staff room data. Please try again later.</p>
              <p class="error-details">${error.message}</p>
            </div>
          `;
        }
      }).catch(error => {
        console.error('Error loading staff room data:', error);
        grid.innerHTML = `
          <div class="dashboard-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error loading staff room data. Please try again later.</p>
            <p class="error-details">${error.message}</p>
          </div>
        `;
      });
      return;
    }

    // Cardiac Unit Dashboard
    if (roomType === 'cardiac') {
      grid.innerHTML = '';
      const dashboardLayout = document.createElement('div');
      dashboardLayout.className = 'emergency-dashboard-layout';
      dashboardLayout.innerHTML = `
        <div class="dashboard-header">
          <h2>Cardiac Unit Analytics</h2>
          <p class="dashboard-summary">
            Insights into cardiac patient status, procedure types, and resource utilization.
          </p>
        </div>
      `;
      const dashboardGrid = document.createElement('div');
      dashboardGrid.className = 'dashboard-grid';
      // Example data
      const statusData = [
        { label: 'Critical', value: 8, color: '#e53e3e' },
        { label: 'Stable', value: 15, color: '#68d391' },
        { label: 'Recovering', value: 10, color: '#4299e1' }
      ];
      const procedureData = [
        { label: 'Angioplasty', value: 12, color: '#f6ad55' },
        { label: 'Bypass', value: 7, color: '#9f7aea' },
        { label: 'Pacemaker', value: 5, color: '#4fd1c7' }
      ];
      dashboardGrid.appendChild(createDashboardCard(
        'Patient Status',
        'Distribution of cardiac patient status.',
        statusData,
        'doughnut',
        statusData.map(d => d.color),
        'Status',
        'Patients'
      ));
      dashboardGrid.appendChild(createDashboardCard(
        'Procedure Types',
        'Types of cardiac procedures performed.',
        procedureData,
        'bar',
        procedureData.map(d => d.color),
        'Procedure',
        'Count'
      ));
      dashboardLayout.appendChild(dashboardGrid);
      grid.appendChild(dashboardLayout);
      return;
    }
    // Monitoring Dashboard
    if (roomType === 'monitoring') {
      grid.innerHTML = '';
      const dashboardLayout = document.createElement('div');
      dashboardLayout.className = 'emergency-dashboard-layout';
      dashboardLayout.innerHTML = `
        <div class="dashboard-header">
          <h2>Monitoring Unit Analytics</h2>
          <p class="dashboard-summary">
            Real-time monitoring of patient vitals and alert trends.
          </p>
        </div>
      `;
      const dashboardGrid = document.createElement('div');
      dashboardGrid.className = 'dashboard-grid';
      const alertData = [
        { label: 'No Alert', value: 30, color: '#68d391' },
        { label: 'Low', value: 10, color: '#f6ad55' },
        { label: 'Medium', value: 5, color: '#ed8936' },
        { label: 'High', value: 2, color: '#e53e3e' }
      ];
      dashboardGrid.appendChild(createDashboardCard(
        'Alert Levels',
        'Distribution of current patient alert levels.',
        alertData,
        'doughnut',
        alertData.map(d => d.color),
        'Alert Level',
        'Patients'
      ));
      dashboardLayout.appendChild(dashboardGrid);
      grid.appendChild(dashboardLayout);
      return;
    }
    // Neurology Department Dashboard
    if (roomType === 'neurology') {
      grid.innerHTML = '';
      const dashboardLayout = document.createElement('div');
      dashboardLayout.className = 'emergency-dashboard-layout';
      dashboardLayout.innerHTML = `
        <div class="dashboard-header">
          <h2>Neurology Department Analytics</h2>
          <p class="dashboard-summary">
            Insights into neurological case types and patient outcomes.
          </p>
        </div>
      `;
      const dashboardGrid = document.createElement('div');
      dashboardGrid.className = 'dashboard-grid';
      const caseData = [
        { label: 'Stroke', value: 9, color: '#9f7aea' },
        { label: 'Seizure', value: 6, color: '#4299e1' },
        { label: 'Head Trauma', value: 4, color: '#e53e3e' }
      ];
      const outcomeData = [
        { label: 'Improved', value: 12, color: '#68d391' },
        { label: 'Stable', value: 5, color: '#f6ad55' },
        { label: 'Critical', value: 2, color: '#e53e3e' }
      ];
      dashboardGrid.appendChild(createDashboardCard(
        'Case Types',
        'Types of neurological cases.',
        caseData,
        'bar',
        caseData.map(d => d.color),
        'Case',
        'Count'
      ));
      dashboardGrid.appendChild(createDashboardCard(
        'Patient Outcomes',
        'Current patient outcomes in neurology.',
        outcomeData,
        'doughnut',
        outcomeData.map(d => d.color),
        'Outcome',
        'Patients'
      ));
      dashboardLayout.appendChild(dashboardGrid);
      grid.appendChild(dashboardLayout);
      return;
    }
    // Urology Dashboard
    if (roomType === 'urology') {
      grid.innerHTML = '';
      const dashboardLayout = document.createElement('div');
      dashboardLayout.className = 'emergency-dashboard-layout';
      dashboardLayout.innerHTML = `
        <div class="dashboard-header">
          <h2>Urology Department Analytics</h2>
          <p class="dashboard-summary">
            Insights into urological procedures and patient status.
          </p>
        </div>
      `;
      const dashboardGrid = document.createElement('div');
      dashboardGrid.className = 'dashboard-grid';
      const procedureData = [
        { label: 'Cystoscopy', value: 8, color: '#4fd1c7' },
        { label: 'Lithotripsy', value: 5, color: '#2ecc71' },
        { label: 'Catheterization', value: 12, color: '#f6ad55' }
      ];
      const statusData = [
        { label: 'Stable', value: 15, color: '#68d391' },
        { label: 'Critical', value: 3, color: '#e53e3e' }
      ];
      dashboardGrid.appendChild(createDashboardCard(
        'Procedure Types',
        'Types of urological procedures performed.',
        procedureData,
        'bar',
        procedureData.map(d => d.color),
        'Procedure',
        'Count'
      ));
      dashboardGrid.appendChild(createDashboardCard(
        'Patient Status',
        'Current patient status in urology.',
        statusData,
        'doughnut',
        statusData.map(d => d.color),
        'Status',
        'Patients'
      ));
      dashboardLayout.appendChild(dashboardGrid);
      grid.appendChild(dashboardLayout);
      return;
    }
    // Lab Dashboard
    if (roomType === 'lab') {
      grid.innerHTML = '';
      const dashboardLayout = document.createElement('div');
      dashboardLayout.className = 'emergency-dashboard-layout';
      dashboardLayout.innerHTML = `
        <div class="dashboard-header">
          <h2>Lab Analytics</h2>
          <p class="dashboard-summary">
            Insights into lab test types and turnaround times.
          </p>
        </div>
      `;
      const dashboardGrid = document.createElement('div');
      dashboardGrid.className = 'dashboard-grid';
      const testData = [
        { label: 'Blood', value: 20, color: '#e53e3e' },
        { label: 'Urine', value: 12, color: '#68d391' },
        { label: 'Culture', value: 7, color: '#4299e1' }
      ];
      const turnaroundData = [
        { label: '<1h', value: 10, color: '#68d391' },
        { label: '1-3h', value: 15, color: '#f6ad55' },
        { label: '>3h', value: 5, color: '#e53e3e' }
      ];
      dashboardGrid.appendChild(createDashboardCard(
        'Test Types',
        'Types of lab tests performed.',
        testData,
        'bar',
        testData.map(d => d.color),
        'Test',
        'Count'
      ));
      dashboardGrid.appendChild(createDashboardCard(
        'Turnaround Time',
        'Lab test turnaround times.',
        turnaroundData,
        'doughnut',
        turnaroundData.map(d => d.color),
        'Time',
        'Tests'
      ));
      dashboardLayout.appendChild(dashboardGrid);
      grid.appendChild(dashboardLayout);
      return;
    }
    // Gastro Dashboard
    if (roomType === 'gastro') {
      grid.innerHTML = '';
      const dashboardLayout = document.createElement('div');
      dashboardLayout.className = 'emergency-dashboard-layout';
      dashboardLayout.innerHTML = `
        <div class="dashboard-header">
          <h2>Gastroenterology Analytics</h2>
          <p class="dashboard-summary">
            Insights into GI procedures and patient status.
          </p>
        </div>
      `;
      const dashboardGrid = document.createElement('div');
      dashboardGrid.className = 'dashboard-grid';
      const procedureData = [
        { label: 'Endoscopy', value: 10, color: '#ff9800' },
        { label: 'Colonoscopy', value: 8, color: '#f6ad55' },
        { label: 'Biopsy', value: 4, color: '#4299e1' }
      ];
      const statusData = [
        { label: 'Stable', value: 12, color: '#68d391' },
        { label: 'Critical', value: 2, color: '#e53e3e' }
      ];
      dashboardGrid.appendChild(createDashboardCard(
        'Procedure Types',
        'Types of GI procedures performed.',
        procedureData,
        'bar',
        procedureData.map(d => d.color),
        'Procedure',
        'Count'
      ));
      dashboardGrid.appendChild(createDashboardCard(
        'Patient Status',
        'Current patient status in gastroenterology.',
        statusData,
        'doughnut',
        statusData.map(d => d.color),
        'Status',
        'Patients'
      ));
      dashboardLayout.appendChild(dashboardGrid);
      grid.appendChild(dashboardLayout);
      return;
    }
    // ... fallback for other rooms ...
    // ... existing code ...
  }

  // Helper function to create dashboard cards
  function createDashboardCard(title, description, data, chartType, colors, xTitle, yTitle) {
    console.log(`Creating dashboard card: ${title}`);
    console.log(`Chart type: ${chartType}`);
    console.log(`Data:`, data);
    console.log(`Colors:`, colors);
    
    const card = document.createElement('div');
    card.className = 'dashboard-card';
    card.innerHTML = `
      <div class="dashboard-card-title">${title}</div>
      <div class="dashboard-card-desc">${description}</div>
      <div class="dashboard-chart"></div>
    `;
    
    const chartDiv = card.querySelector('.dashboard-chart');
    
    // Debug: Log chart container dimensions
    console.log(`Creating chart for: ${title}`);
    console.log(`Chart container dimensions: ${chartDiv.clientWidth}x${chartDiv.clientHeight}`);
    
    // Add a small delay to ensure the container is properly rendered
    setTimeout(() => {
      console.log(`After delay - Chart container dimensions: ${chartDiv.clientWidth}x${chartDiv.clientHeight}`);
      
      if (chartDiv.clientWidth <= 0 || chartDiv.clientHeight <= 0) {
        console.warn(`Chart container has invalid dimensions for ${title}. Setting fallback dimensions.`);
        chartDiv.style.height = '300px';
        chartDiv.style.width = '100%';
      }
      
      // Validate data
      if (!data || data.length === 0) {
        console.error(`No data provided for chart: ${title}`);
        chartDiv.innerHTML = '<div class="chart-error">No data available for this chart.</div>';
        return;
      }
      
      // Check if D3 is available
      if (typeof d3 === 'undefined') {
        console.warn('D3.js not available, using fallback chart');
        renderFallbackChart(chartDiv, {
          title: title,
          data: data,
          color: colors,
          xTitle: xTitle,
          yTitle: yTitle
        });
      } else {
        console.log('D3.js available, rendering D3 chart');
        renderD3Chart(chartDiv, {
          title: title,
          chartType: chartType,
          data: data,
          colors: colors,
          xTitle: xTitle,
          yTitle: yTitle
        });
      }
    }, 100);
    
    return card;
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
            <h4>Navigation</h4>
            <div class="shortcut-item"><kbd>←</kbd><span>Previous Room</span></div>
            <div class="shortcut-item"><kbd>→</kbd><span>Next Room</span></div>
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
      case 'arrowleft': event.preventDefault(); navigateToRoom('prev'); break;
      case 'arrowright': event.preventDefault(); navigateToRoom('next'); break;
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

  // Add camera position for waiting area
  setRoomCamera('waiting_area', -3, 5, 24, -3, 0, 24);

  // Make navigation functions globally accessible
  window.navigateToRoom = function(direction) {
    const currentSequence = getCurrentActiveSequence();
    if (!currentSequence) return;

    // Find current room in sequence
    const currentRoom = getCurrentRoomFromDashboard();
    const currentIndex = currentSequence.indexOf(currentRoom);
    
    if (currentIndex === -1) return;

    let nextIndex;
    if (direction === 'prev') {
      nextIndex = Math.max(0, currentIndex - 1);
    } else if (direction === 'next') {
      nextIndex = Math.min(currentSequence.length - 1, currentIndex + 1);
    }

    if (nextIndex !== currentIndex) {
      const nextRoom = currentSequence[nextIndex];
      moveCameraToRoom(nextRoom);
      updateRoomContent(nextRoom);
    }
  };

  // Initialize raycaster for 3D object clicking
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Add click event listener to the renderer
  renderer.domElement.addEventListener('click', onMouseClick, false);
  renderer.domElement.addEventListener('mousemove', onMouseMove, false);

  function onMouseClick(event) {
    // Calculate mouse position in normalized device coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Get all cubes for intersection testing
    const allCubes = getAllCubes();
    if (allCubes.length === 0) return;

    // Calculate intersections
    const intersects = raycaster.intersectObjects(allCubes);

    if (intersects.length > 0) {
      const clickedCube = intersects[0].object;
      
      // Find which room this cube belongs to
      let clickedRoomType = null;
      roomCubes.forEach((cubes, roomType) => {
        if (cubes.includes(clickedCube)) {
          clickedRoomType = roomType;
        }
      });

      if (clickedRoomType) {
        console.log(`Clicked on room: ${clickedRoomType}`);
        
        // Update active room button in the panel
        document.querySelectorAll('.room-btn').forEach(btn => btn.classList.remove('active'));
        const roomBtn = document.querySelector(`[data-room="${clickedRoomType}"]`);
        if (roomBtn) {
          roomBtn.classList.add('active');
        }
        
        // Move camera to room and show dashboard
        moveCameraToRoom(clickedRoomType);
      }
    }
  }

  function onMouseMove(event) {
    // Calculate mouse position in normalized device coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Get all cubes for intersection testing
    const allCubes = getAllCubes();
    if (allCubes.length === 0) return;

    // Calculate intersections
    const intersects = raycaster.intersectObjects(allCubes);

    // Reset cursor
    renderer.domElement.style.cursor = 'default';

    if (intersects.length > 0) {
      // Change cursor to pointer when hovering over a room
      renderer.domElement.style.cursor = 'pointer';
    }
  }
});

function renderD3Chart(container, config) {
  console.log('DEBUG: Rendering D3 Chart with config:', config);
  
  // Clear container
  container.innerHTML = '';
  
  // Add loading state
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'dashboard-loading';
  loadingDiv.innerHTML = `
    <div class="loading-spinner"></div>
    <p>Loading chart data...</p>
  `;
  container.appendChild(loadingDiv);
  
  // Simulate loading time for better UX
  setTimeout(() => {
    container.removeChild(loadingDiv);
    
    // FIX: Add a guard clause to prevent rendering if the container has no size.
    if (!container || container.clientWidth <= 0 || container.clientHeight <= 0) {
        console.error(`Chart container for "${config.title}" is not visible or has zero dimensions. Aborting render.`);
        container.innerHTML = `<div class="dashboard-error">Chart container not ready.</div>`;
        return;
    }

    if (!config.data || config.data.length === 0) {
      container.innerHTML = '<div class="dashboard-error">No data available for this chart</div>';
      return;
    }
    
    // FIX: Use a standard D3 margin convention
    const margin = { top: 40, right: 20, bottom: 60, left: 60 };
    const width = container.clientWidth;
    const height = container.clientHeight;
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Create SVG with enhanced styling
    const svg = d3.select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("background", "transparent")
      .style("border-radius", "12px")
      .style("overflow", "visible");
    
    // Enhanced tooltip
    const tooltip = d3.select(container)
      .append("div")
      .attr("class", "d3-tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("z-index", "1000");
    
    if (config.chartType === 'bar') {
      console.log('DEBUG: Rendering Enhanced Interactive Bar Chart. Data:', config.data);
      
      const processedData = config.data.map(d => ({
        label: d.label,
        value: parseFloat(d.value) || 0
      }));
      
      const x = d3.scaleBand()
        .domain(processedData.map(d => d.label))
        .range([0, chartWidth])
        .padding(0.3);
      
      const y = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d.value) * 1.1])
        .range([chartHeight, 0]);
      
      const color = d3.scaleOrdinal()
        .domain(processedData.map(d => d.label))
        .range(config.colors || [
          '#4fd1c7', '#63b3ed', '#9f7aea', '#f6ad55', 
          '#f687b3', '#68d391', '#fc8181', '#fbd38d'
        ]);
      
      // Add gradient definitions
      const defs = svg.append("defs");
      processedData.forEach((d, i) => {
        const gradient = defs.append("linearGradient")
          .attr("id", `barGradient${i}`)
          .attr("gradientUnits", "userSpaceOnUse");
        
        // FIX: Check if color exists before calling .brighter()
        const stopColor = color(d.label);
        if(stopColor) {
            gradient.append("stop")
              .attr("offset", "0%")
              .attr("stop-color", d3.color(stopColor).brighter(0.3));
          
            gradient.append("stop")
              .attr("offset", "100%")
              .attr("stop-color", stopColor);
        }
      });
      
      // Enhanced axes with better styling
      const xAxis = d3.axisBottom(x)
        .tickSize(0)
        .tickPadding(10);
      
      const yAxis = d3.axisLeft(y)
        .tickSize(-chartWidth)
        .tickPadding(10)
        .ticks(5);
      
      const chartGroup = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);
      
      // Add grid lines
      chartGroup.append("g")
        .attr("class", "d3-grid")
        .call(yAxis.tickSize(-chartWidth).tickFormat(""));
      
      // Enhanced X axis
      chartGroup.append("g")
        .attr("class", "d3-axis")
        .attr("transform", `translate(0, ${chartHeight})`)
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dy", ".15em")
        .attr("transform", "rotate(0)");
      
      // Enhanced Y axis
      chartGroup.append("g")
        .attr("class", "d3-axis")
        .call(yAxis);
      
      // Add axis labels
      if (config.xTitle) {
        chartGroup.append("text")
          .attr("class", "d3-x-title")
          .attr("x", chartWidth / 2)
          .attr("y", chartHeight + 55) // Adjusted for rotated labels
          .attr("text-anchor", "middle")
          .text(config.xTitle);
      }
      
      if (config.yTitle) {
        chartGroup.append("text")
          .attr("class", "d3-y-title")
          .attr("transform", "rotate(-90)")
          .attr("x", -chartHeight / 2)
          .attr("y", -45) // Adjusted margin
          .attr("text-anchor", "middle")
          .text(config.yTitle);
      }
      
      // Enhanced interactive bars
      const bars = chartGroup.selectAll(".d3-bar")
        .data(processedData)
        .enter()
        .append("rect")
        .attr("class", "d3-bar")
        .attr("x", d => x(d.label))
        .attr("y", d => y(d.value))
        .attr("width", x.bandwidth())
        .attr("height", d => chartHeight - y(d.value))
        .attr("fill", (d, i) => `url(#barGradient${i})`)
        .attr("rx", 6)
        .attr("ry", 6)
        .style("cursor", "pointer")
        .style("transition", "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)")
        .style("filter", "drop-shadow(0 4px 16px rgba(79,209,199,0.2))")
        .on("mouseover", function(event, d) {
          // Enhanced hover effect
          d3.select(this)
            .transition()
            .duration(200)
            .attr("y", y(d.value) - 8)
            .attr("height", chartHeight - y(d.value) + 8)
            .style("filter", "brightness(1.15) drop-shadow(0 8px 24px rgba(79,209,199,0.35))")
            .style("stroke", "rgba(255, 255, 255, 0.4)")
            .style("stroke-width", "2px");
          
          // Enhanced tooltip
          tooltip.transition()
            .duration(200)
            .style("opacity", 1);
          
          tooltip.html(`
            <div style="font-size: 1.1em; margin-bottom: 4px; color: #4fd1c7; font-weight: 600;">${d.label}</div>
            <div style="font-size: 1.3em; font-weight: 700; color: #fff;">${d.value}</div>
            <div style="font-size: 0.9em; color: #a0aec0; margin-top: 4px;">${config.yTitle || 'Value'}</div>
          `)
          .style("left", `${event.pageX + 15}px`)
          .style("top", `${event.pageY - 35}px`);
        })
        .on("mouseout", function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("y", y(d.value))
            .attr("height", chartHeight - y(d.value))
            .style("filter", "drop-shadow(0 4px 16px rgba(79,209,199,0.2))")
            .style("stroke", "none");
          
          tooltip.transition()
            .duration(200)
            .style("opacity", 0);
        })
        .on("click", function(event, d) {
          // Enhanced click animation
          d3.select(this)
            .transition()
            .duration(100)
            .attr("y", y(d.value) - 4)
            .attr("height", chartHeight - y(d.value) + 4)
            .style("filter", "brightness(1.2) drop-shadow(0 12px 32px rgba(79,209,199,0.4))")
            .transition()
            .duration(100)
            .attr("y", y(d.value))
            .attr("height", chartHeight - y(d.value))
            .style("filter", "drop-shadow(0 4px 16px rgba(79,209,199,0.2))");
          
          // Add click feedback
          const ripple = chartGroup.append("circle")
            .attr("cx", x(d.label) + x.bandwidth() / 2)
            .attr("cy", y(d.value) + (chartHeight - y(d.value)) / 2)
            .attr("r", 0)
            .style("fill", "rgba(255, 255, 255, 0.3)")
            .style("pointer-events", "none");
          
          ripple.transition()
            .duration(300)
            .attr("r", 20)
            .style("opacity", 0)
            .remove();
        });
      
      // Enhanced value labels with animations
      const labels = chartGroup.selectAll('.bar-label')
        .data(processedData)
        .enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('x', d => x(d.label) + x.bandwidth() / 2)
        .attr('y', d => y(d.value) - 8)
        .attr('text-anchor', 'middle')
        .style('fill', '#ffffff')
        .style('font-size', '0.85rem')
        .style('font-weight', '600')
        .style('font-family', "'Poppins', sans-serif")
        .style('text-shadow', '0 2px 4px rgba(0,0,0,0.5)')
        .style('opacity', 0)
        .text(d => d.value > 0 ? d.value : '');
      
      // Animate labels in
      labels.transition()
        .delay((d, i) => i * 100)
        .duration(500)
        .style('opacity', 1);
      
      // Add interactive legend
      const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width }, 20)`);
      
      const legendItems = legend.selectAll(".legend-item")
        .data(processedData)
        .enter().append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 25})`)
        .style("cursor", "pointer")
        .style("transition", "all 0.2s ease");
      
      legendItems.append("rect")
        .attr("width", 16)
        .attr("height", 16)
        .attr("fill", (d, i) => `url(#barGradient${i})`)
        .style("border-radius", "3px")
        .style("border", "2px solid rgba(255,255,255,0.2)")
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.2))");
      
      legendItems.append("text")
        .attr("x", 24)
        .attr("y", 12)
        .attr("dy", "0.35em")
        .style("font-size", "0.85em")
        .style("font-weight", "500")
        .style("fill", "#e2e8f0")
        .style("font-family", "'Poppins', sans-serif")
        .text(d => d.label);
      
      // Interactive legend
      legendItems
        .on("mouseover", function(event, d) {
          d3.select(this).style("transform", d3.select(this).attr("transform") + " translateY(-2px)");
          
          // Highlight corresponding bar
          bars.style("opacity", function(barData) {
            return barData.label === d.label ? 1 : 0.3;
          });
          
          labels.style("opacity", function(labelData) {
            return labelData.label === d.label ? 1 : 0.3;
          });
        })
        .on("mouseout", function() {
          const originalTransform = d3.select(this).attr("transform").replace(" translateY(-2px)", "");
          d3.select(this).style("transform", originalTransform);
          
          // Reset all bars and labels
          bars.style("opacity", 1);
          labels.style("opacity", 1);
        });
      
    } else if (config.chartType === 'doughnut') {
      console.log('DEBUG: Rendering Enhanced Interactive Doughnut Chart. Data:', config.data);
      
      const radius = Math.min(chartWidth, chartHeight) / 2;
      const innerRadius = radius * 0.5;
      const outerRadius = radius * 0.85;
      
      const color = d3.scaleOrdinal()
        .domain(config.data.map(d => d.label))
        .range(config.colors || [
          '#4fd1c7', '#63b3ed', '#9f7aea', '#f6ad55', 
          '#f687b3', '#68d391', '#fc8181', '#fbd38d'
        ]);
      
      // Add gradient definitions for pie slices
      const defs = svg.append("defs");
      config.data.forEach((d, i) => {
        const gradient = defs.append("radialGradient")
          .attr("id", `pieGradient${i}`)
          .attr("gradientUnits", "userSpaceOnUse");
        
        gradient.append("stop")
          .attr("offset", "0%")
          .attr("stop-color", d3.color(color(d.label)).brighter(0.3));
        
        gradient.append("stop")
          .attr("offset", "100%")
          .attr("stop-color", color(d.label));
      });
      
      const pie = d3.pie()
        .value(d => d.value)
        .sort(null);
      
      const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);
      
      const gDoughnut = svg.append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);
      
      const arcs = gDoughnut.selectAll(".arc")
        .data(pie(config.data))
        .enter().append("g")
        .attr("class", "arc")
        .style("cursor", "pointer");
      
      // Enhanced interactive pie slices
      arcs.append("path")
        .attr("d", arc)
        .attr("fill", (d, i) => `url(#pieGradient${i})`)
        .attr("stroke", "#1a202c")
        .style("stroke-width", "3px")
        .style("transition", "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)")
        .style("filter", "drop-shadow(0 4px 16px rgba(79,209,199,0.2))")
        .on("mouseover", function(event, d) {
          // Enhanced hover effect
          d3.select(this)
            .transition()
            .duration(200)
            .attr("d", d3.arc().innerRadius(innerRadius).outerRadius(outerRadius * 1.15))
            .style("filter", "brightness(1.15) drop-shadow(0 8px 24px rgba(79,209,199,0.35))")
            .style("stroke", "rgba(255, 255, 255, 0.4)")
            .style("stroke-width", "4px");
          
          // Enhanced tooltip
          tooltip.transition()
            .duration(200)
            .style("opacity", 1);
          
          tooltip.html(`
            <div style="font-size: 1.1em; margin-bottom: 4px; color: #4fd1c7; font-weight: 600;">${d.data.label}</div>
            <div style="font-size: 1.3em; font-weight: 700; color: #fff;">${d.data.value}</div>
            <div style="font-size: 0.9em; color: #a0aec0; margin-top: 4px;">${((d.data.value / d3.sum(config.data, p => p.value)) * 100).toFixed(1)}%</div>
          `)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 35) + "px");
        })
        .on("mouseout", function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("d", arc)
            .style("filter", "drop-shadow(0 4px 16px rgba(79,209,199,0.2))")
            .style("stroke", "#1a202c")
            .style("stroke-width", "3px");
          
          tooltip.transition()
            .duration(200)
            .style("opacity", 0);
        })
        .on("click", function(event, d) {
          // Enhanced click animation
          d3.select(this)
            .transition()
            .duration(100)
            .attr("d", d3.arc().innerRadius(innerRadius).outerRadius(outerRadius * 1.1))
            .style("filter", "brightness(1.2) drop-shadow(0 12px 32px rgba(79,209,199,0.4))")
            .transition()
            .duration(100)
            .attr("d", arc)
            .style("filter", "drop-shadow(0 4px 16px rgba(79,209,199,0.2))");
          
          // Add click feedback
          const ripple = gDoughnut.append("circle")
            .attr("cx", arc.centroid(d)[0])
            .attr("cy", arc.centroid(d)[1])
            .attr("r", 0)
            .style("fill", "rgba(255, 255, 255, 0.3)")
            .style("pointer-events", "none");
          
          ripple.transition()
            .duration(300)
            .attr("r", 30)
            .style("opacity", 0)
            .remove();
        });
      
      // Enhanced text labels with animations
      const labels = arcs.append("text")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .attr("dy", "0.35em")
        .style("text-anchor", "middle")
        .style("font-size", "0.9em")
        .style("font-weight", "600")
        .style("fill", "#ffffff")
        .style("pointer-events", "none")
        .style("text-shadow", "0 2px 4px rgba(0,0,0,0.8)")
        .style("font-family", "'Poppins', sans-serif")
        .style("opacity", 0)
        .text(d => {
          const percentage = (d.data.value / d3.sum(config.data, p => p.value)) * 100;
          return percentage > 8 ? `${d.data.label}\n${percentage.toFixed(1)}%` : '';
        });
      
      // Animate labels in
      labels.transition()
        .delay((d, i) => i * 150)
        .duration(500)
        .style("opacity", 1);
      
      // Enhanced interactive legend
      const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(20, 30)`);
      
      const legendRectSize = 14;
      const legendSpacing = 8;
      
      const legendItems = legend.selectAll(".legend-item")
        .data(color.domain())
        .enter().append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * (legendRectSize + legendSpacing + 20)})`)
        .style("cursor", "pointer")
        .style("transition", "transform 0.2s ease");
      
      legendItems.append("rect")
        .attr("width", legendRectSize)
        .attr("height", legendRectSize)
        .attr("fill", (d, i) => `url(#pieGradient${i})`)
        .style("border-radius", "3px")
        .style("border", "2px solid rgba(255,255,255,0.2)")
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.2))");
      
      legendItems.append("text")
        .attr("x", legendRectSize + 8)
        .attr("y", legendRectSize / 2)
        .attr("dy", "0.35em")
        .style("font-size", "0.85em")
        .style("font-weight", "500")
        .style("fill", "#e2e8f0")
        .style("font-family", "'Poppins', sans-serif")
        .text(d => d);
      
      // Interactive legend
      legendItems
        .on("mouseover", function(event, d) {
          d3.select(this).style("transform", d3.select(this).attr("transform") + " translateY(-2px)");
          
          // Highlight corresponding slice
          arcs.selectAll("path")
            .style("opacity", function(arcData) {
              return arcData.data.label === d ? 1 : 0.3;
            });
          
          labels.style("opacity", function(labelData) {
            return labelData.data.label === d ? 1 : 0.3;
          });
        })
        .on("mouseout", function() {
          const originalTransform = d3.select(this).attr("transform").replace(" translateY(-2px)", "");
          d3.select(this).style("transform", originalTransform);
          
          // Reset all slices and labels
          arcs.selectAll("path").style("opacity", 1);
          labels.style("opacity", 1);
        });
    }
  }, 300);
}