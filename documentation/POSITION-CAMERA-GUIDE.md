# Guide: How to Modify Orange Box Positions and Camera Settings

This guide explains how to adjust the positions of the orange highlight boxes and camera views for each room in the Hospital Room Explorer.

## Modifying Orange Box Positions

The orange boxes that highlight each room are created based on the positions of the meshes that make up that room. You can adjust their size and position by modifying the code in `script.js`.

### Box Size Adjustment

To adjust the size of the highlight boxes (making them larger or smaller):

1. Locate this section in `script.js` (around line 196-198):
```javascript
// Add padding to the box
size.x += 1;
size.y += 1;
size.z += 1;
```

2. Change the values to adjust the padding:
   - Increase the values to make the boxes larger
   - Decrease the values to make the boxes smaller
   - Use different values for different dimensions

Example:
```javascript
// Make boxes wider but not taller
size.x += 2;  // Wider in X direction
size.y += 0.5;  // Less tall in Y direction
size.z += 2;  // Wider in Z direction
```

### Box Position Adjustment

To adjust the position of highlight boxes for specific rooms:

1. Add a room-specific adjustment after the `bbox.getCenter(center);` line:

```javascript
// Custom position adjustments for specific rooms
if (roomType === 'emergency') {
  center.x += 2;  // Move emergency room box 2 units in X direction
  center.y += 1;  // Move emergency room box 1 unit up
}
else if (roomType === 'surgery') {
  center.z -= 3;  // Move surgery room box 3 units back in Z direction
}
```

## Modifying Camera Positions

Each room has its own camera position that is activated when you click on the room name.

### Adjust Camera Distance and Angle

To modify the camera position for rooms:

1. Locate this section in `script.js` (around line 212-216):
```javascript
const cameraPos = new THREE.Vector3(
  center.x + (size.x * 0.7),  // Adjust this multiplier to change X distance
  center.y + (size.y * 0.7),  // Adjust this multiplier to change Y height
  center.z + (size.z * 0.7)   // Adjust this multiplier to change Z distance
);
```

2. Change the multipliers to adjust the camera position:
   - Increase values to position the camera further away
   - Decrease values to position the camera closer
   - Use negative values to position camera on the opposite side

Example:
```javascript
const cameraPos = new THREE.Vector3(
  center.x + (size.x * 1.2),  // Further to the right
  center.y + (size.y * 1.0),  // Higher up
  center.z - (size.z * 0.5)   // In front instead of behind
);
```

### Room-Specific Camera Positions

To set different camera positions for specific rooms:

1. Add room-specific adjustments after the general camera position code:

```javascript
// Custom camera positions for specific rooms
if (roomType === 'emergency') {
  cameraPos.set(
    center.x - 5,       // 5 units to the left of center
    center.y + 3,       // 3 units above center
    center.z + 10       // 10 units behind center
  );
}
else if (roomType === 'surgery') {
  cameraPos.set(
    center.x,           // Centered in x
    center.y + 8,       // High overhead view
    center.z            // Centered in z
  );
}
```

### Change Camera Look-at Target

By default, the camera looks at the center of each room. To adjust where the camera is looking:

```javascript
const roomCamera = {
  position: cameraPos,
  target: center,       // This is where the camera looks
  roomType: roomType
};

// Custom look-at targets for specific rooms
if (roomType === 'lab') {
  // Look at the right side of the lab
  roomCamera.target = new THREE.Vector3(
    center.x + 3,      // 3 units to the right
    center.y - 1,      // 1 unit down
    center.z
  );
}
```

## Applying Your Changes

After making these changes to the code:

1. Save the modified `script.js` file
2. Refresh your browser to see the updated positions

## Best Practices

- Make small adjustments and test often
- Use browser developer tools to verify positions
- Keep adjustments proportional to room sizes
- Consider the field of view when positioning cameras
- For dramatic views, position cameras lower and angle upward
- For overview perspectives, position cameras higher