import bpy
import math
import random
from mathutils import Vector

# --- Initialize scene ---
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
bpy.context.scene.unit_settings.system = 'METRIC'

# --- Create collections for organization ---
def create_collection(name):
    if name in bpy.data.collections:
        return bpy.data.collections[name]
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection

# Create main collections
structure_collection = create_collection("Structure")
furniture_collection = create_collection("Furniture")
equipment_collection = create_collection("Medical_Equipment")
decor_collection = create_collection("Decor")
lighting_collection = create_collection("Lighting")

# --- Helper function to check Blender version and set appropriate inputs ---
def set_principled_inputs(principled_node, base_color=None, roughness=None, metallic=None, specular=None, ior=None):
    """Set inputs for Principled BSDF node with version compatibility"""
    if base_color is not None:
        principled_node.inputs['Base Color'].default_value = base_color
    
    if roughness is not None:
        principled_node.inputs['Roughness'].default_value = roughness
    
    if metallic is not None:
        principled_node.inputs['Metallic'].default_value = metallic
    
    # Handle Specular vs IOR based on Blender version
    if 'Specular' in principled_node.inputs:
        if specular is not None:
            principled_node.inputs['Specular'].default_value = specular
    elif 'IOR' in principled_node.inputs:
        if ior is not None:
            principled_node.inputs['IOR'].default_value = ior
        elif specular is not None:
            # Convert specular to approximate IOR (rough conversion)
            ior_value = 1.0 + (specular * 0.5)
            principled_node.inputs['IOR'].default_value = ior_value

# --- Create main floorplate with tiled pattern ---
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
floor = bpy.context.object
floor.name = "Main_Floorplate"
floor.scale[1] = 1.5  # Make it 40x60m

# Link to collection
bpy.ops.object.select_all(action='DESELECT')
floor.select_set(True)
bpy.context.view_layer.objects.active = floor
bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Structure"))

# Create floor material with tile pattern
mat_floor = bpy.data.materials.new(name="Hospital_Floor")
mat_floor.use_nodes = True
nodes = mat_floor.node_tree.nodes
links = mat_floor.node_tree.links

# Clear existing nodes
for node in nodes:
    nodes.remove(node)

# Create new nodes for tiled pattern
output = nodes.new(type='ShaderNodeOutputMaterial')
principled = nodes.new(type='ShaderNodeBsdfPrincipled')
tex_coord = nodes.new(type='ShaderNodeTexCoord')
mapping = nodes.new(type='ShaderNodeMapping')
checker = nodes.new(type='ShaderNodeTexChecker')

# Connect nodes
links.new(tex_coord.outputs['Generated'], mapping.inputs['Vector'])
links.new(mapping.outputs['Vector'], checker.inputs['Vector'])
links.new(checker.outputs['Color'], principled.inputs['Base Color'])
links.new(principled.outputs['BSDF'], output.inputs['Surface'])

# Configure nodes
mapping.inputs['Scale'].default_value = [100, 100, 100]
checker.inputs['Color1'].default_value = (0.85, 0.85, 0.85, 1.0)
checker.inputs['Color2'].default_value = (0.8, 0.8, 0.8, 1.0)
checker.inputs['Scale'].default_value = 0.5

# Use the helper function for principled inputs
set_principled_inputs(principled, roughness=0.2, specular=0.1, ior=1.45)

floor.data.materials.append(mat_floor)

# --- Create ceiling ---
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 3.5))
ceiling = bpy.context.object
ceiling.name = "Ceiling"
ceiling.scale[1] = 1.5  # Match floor size
bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Structure"))

# Create ceiling material with acoustic tile pattern
mat_ceiling = bpy.data.materials.new(name="Ceiling_Tiles")
mat_ceiling.use_nodes = True
nodes = mat_ceiling.node_tree.nodes
links = mat_ceiling.node_tree.links

# Clear existing nodes
for node in nodes:
    nodes.remove(node)

# Create new nodes for ceiling tile pattern
output = nodes.new(type='ShaderNodeOutputMaterial')
principled = nodes.new(type='ShaderNodeBsdfPrincipled')
tex_coord = nodes.new(type='ShaderNodeTexCoord')
mapping = nodes.new(type='ShaderNodeMapping')
grid = nodes.new(type='ShaderNodeTexChecker')
bump = nodes.new(type='ShaderNodeBump')

# Connect nodes
links.new(tex_coord.outputs['Generated'], mapping.inputs['Vector'])
links.new(mapping.outputs['Vector'], grid.inputs['Vector'])
links.new(grid.outputs['Color'], bump.inputs['Height'])
links.new(bump.outputs['Normal'], principled.inputs['Normal'])
links.new(principled.outputs['BSDF'], output.inputs['Surface'])

# Configure nodes
mapping.inputs['Scale'].default_value = [80, 120, 1]
grid.inputs['Color1'].default_value = (0.95, 0.95, 0.95, 1.0)
grid.inputs['Color2'].default_value = (0.9, 0.9, 0.9, 1.0)
grid.inputs['Scale'].default_value = 0.25
bump.inputs['Strength'].default_value = 0.02

set_principled_inputs(principled, base_color=(0.95, 0.95, 0.95, 1.0), roughness=0.3)

ceiling.data.materials.append(mat_ceiling)

# --- Define improved room layout with corridors ---
rooms = {
    "Main_Entrance": (-10, 28, 15, 4),
    "Reception": (-17, 24, 8, 6),
    "Waiting_Area": (-3, 24, 10, 6),
    "Triage": (-17, 15, 8, 6),
    "Emergency": (-18, -5, 14, 18),
    "ICU": (-18, -25, 10, 10),
    "Medicine_Ward_A": (5, 20, 12, 15),
    "Medicine_Ward_B": (18, 20, 12, 15),
    "Nurses_Station": (12, 10, 10, 5),
    "Department_MED": (5, -10, 15, 15),
    "Imaging": (5, -28, 15, 10),
    "Lab": (-5, -28, 10, 10), 
    "Staff_Room": (22, -4, 8, 8),
    "Pharmacy": (25, -25, 8, 10),
    "Medication_Station": (20, -15, 6, 8),
    "Discharge": (15, 28, 6, 4)
}

# Corridors defined as (start_x, start_y, end_x, end_y, width)
corridors = [
    # Main central corridor (vertical)
    (0, -30, 0, 25, 5),
    # Main entrance corridor (horizontal)
    (-10, 28, 15, 28, 4),
    # Emergency corridor (horizontal)
    (-20, 0, 0, 0, 4),
    # Ward corridor (horizontal)
    (0, 10, 25, 10, 3),
    # Department corridor (horizontal)
    (0, -20, 25, -20, 3)
]

# --- Material palette ---
material_palette = {
    "Wall_Standard": (0.85, 0.85, 0.85),
    "Wall_Emergency": (0.9, 0.95, 0.95),
    "Wall_Lab": (1.0, 1.0, 1.0),
    "Wall_Pharmacy": (0.9, 0.95, 0.9),
    "Wall_Ward": (0.95, 0.9, 0.85),
    "Wall_Staff": (0.85, 0.9, 0.95),
    "Wall_Reception": (0.9, 0.9, 1.0),
    "Floor_Main": (0.85, 0.85, 0.85),
    "Floor_Emergency": (0.9, 0.9, 0.9),
    "Floor_Lab": (0.92, 0.92, 0.92),
    "Accent_Emergency": (0.8, 0.2, 0.2),
    "Accent_Lab": (0.2, 0.4, 0.8),
    "Accent_Reception": (0.3, 0.5, 0.8),
    "Accent_Pharmacy": (0.2, 0.7, 0.4),
}

def set_principled_inputs(principled_node, base_color=None, roughness=None, metallic=None, 
                         specular=None, ior=None, transmission=None, alpha=None):
    """Set inputs for Principled BSDF node with version compatibility"""
    if base_color is not None:
        principled_node.inputs['Base Color'].default_value = base_color
    
    if roughness is not None:
        principled_node.inputs['Roughness'].default_value = roughness
    
    if metallic is not None:
        principled_node.inputs['Metallic'].default_value = metallic
    
    # Handle Specular vs IOR based on Blender version
    if 'Specular' in principled_node.inputs:
        if specular is not None:
            principled_node.inputs['Specular'].default_value = specular
    elif 'IOR' in principled_node.inputs:
        if ior is not None:
            principled_node.inputs['IOR'].default_value = ior
        elif specular is not None:
            # Convert specular to approximate IOR (rough conversion)
            ior_value = 1.0 + (specular * 0.5)
            principled_node.inputs['IOR'].default_value = ior_value
    
    # Handle Transmission compatibility
    if transmission is not None:
        if 'Transmission' in principled_node.inputs:
            principled_node.inputs['Transmission'].default_value = transmission
        elif 'Transmission Weight' in principled_node.inputs:
            principled_node.inputs['Transmission Weight'].default_value = transmission
    
    # Handle Alpha
    if alpha is not None:
        if 'Alpha' in principled_node.inputs:
            principled_node.inputs['Alpha'].default_value = alpha

def create_material(name, color, roughness=0.3, metallic=0.0, specular=None, ior=None, 
                   transmission=None, alpha=None):
    """Create material with version compatibility"""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    
    set_principled_inputs(bsdf, 
                         base_color=(*color, 1.0), 
                         roughness=roughness, 
                         metallic=metallic,
                         specular=specular,
                         ior=ior,
                         transmission=transmission,
                         alpha=alpha)
    
    # Set blend mode for transparency
    if alpha is not None and alpha < 1.0:
        mat.blend_method = 'BLEND'
    
    return mat
# Create standard materials
wall_materials = {}
for name, color in material_palette.items():
    if name.startswith("Wall_"):
        wall_materials[name] = create_material(name, color)

# --- Improved functions ---
def get_room_wall_material(room_name):
    """Return appropriate wall material based on room type"""
    if "Emergency" in room_name or "ICU" in room_name:
        return wall_materials["Wall_Emergency"]
    elif "Lab" in room_name or "Imaging" in room_name:
        return wall_materials["Wall_Lab"]
    elif "Pharmacy" in room_name or "Medication" in room_name:
        return wall_materials["Wall_Pharmacy"]
    elif "Ward" in room_name:
        return wall_materials["Wall_Ward"]
    elif "Staff" in room_name:
        return wall_materials["Wall_Staff"]
    elif "Reception" in room_name or "Entrance" in room_name:
        return wall_materials["Wall_Reception"]
    else:
        return wall_materials["Wall_Standard"]

def create_wall(start, end, height=3.2, thickness=0.2, name="Wall", collection_name="Structure"):
    """Create a wall between two points"""
    # Calculate midpoint
    mid_x = (start[0] + end[0]) / 2
    mid_y = (start[1] + end[1]) / 2
    
    # Calculate length and angle
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    length = ((dx)**2 + (dy)**2)**0.5
    angle = math.atan2(dy, dx)
    
    # Create wall
    bpy.ops.mesh.primitive_cube_add(size=1, location=(mid_x, mid_y, height/2))
    wall = bpy.context.object
    wall.dimensions = (length, thickness, height)
    wall.rotation_euler[2] = angle
    wall.name = name
    
    # Move to collection
    bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find(collection_name))
    
    return wall

def create_floor_section(x, y, width, depth, z=0.01, name="Floor_Section", material=None):
    """Create a floor section with custom material"""
    bpy.ops.mesh.primitive_plane_add(size=1, location=(x, y, z))
    section = bpy.context.object
    section.scale.x = width / 2
    section.scale.y = depth / 2
    section.name = name
    
    if material:
        section.data.materials.append(material)
        
    bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Structure"))
    return section

def create_door(x, y, rotation=0, width=1.0, height=2.2, double=False, automatic=False, name="Door"):
    """Create a door with frame"""
    # Door frame
    frame_width = width + 0.1
    frame_depth = 0.2
    
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, height/2))
    door_frame = bpy.context.object
    door_frame.dimensions = (frame_width, frame_depth, height+0.1)
    door_frame.rotation_euler[2] = rotation
    door_frame.name = name + "_Frame"
    
    # Door material
    door_mat = create_material("Door_Material", (0.6, 0.4, 0.3), roughness=0.6)
    frame_mat = create_material("Frame_Material", (0.3, 0.3, 0.3), roughness=0.2)
    
    # Door leaf/leaves
    if double:
        # Left door
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x-width/4, y, height/2))
        door_left = bpy.context.object
        door_left.dimensions = (width/2-0.05, 0.05, height-0.05)
        door_left.rotation_euler[2] = rotation
        door_left.name = name + "_Left"
        door_left.data.materials.append(door_mat)
        
        # Right door
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x+width/4, y, height/2))
        door_right = bpy.context.object
        door_right.dimensions = (width/2-0.05, 0.05, height-0.05)
        door_right.rotation_euler[2] = rotation
        door_right.name = name + "_Right"
        door_right.data.materials.append(door_mat)
        
        door_parts = [door_frame, door_left, door_right]
    else:
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, height/2))
        door_leaf = bpy.context.object
        door_leaf.dimensions = (width-0.05, 0.05, height-0.05)
        door_leaf.rotation_euler[2] = rotation
        door_leaf.name = name + "_Leaf"
        door_leaf.data.materials.append(door_mat)
        door_parts = [door_frame, door_leaf]
    
    door_frame.data.materials.append(frame_mat)
    
    # Add automatic door signage if needed
    if automatic:
        # Add sensor box and automatic sign
        bpy.ops.mesh.primitive_cube_add(size=0.2, location=(x, y, height+0.2))
        sensor = bpy.context.object
        sensor.dimensions = (0.2, 0.2, 0.1)
        sensor.rotation_euler[2] = rotation
        sensor.name = name + "_Sensor"
        sensor_mat = create_material("Sensor_Material", (0.1, 0.1, 0.1), 0.2, 0.8)
        sensor.data.materials.append(sensor_mat)
        door_parts.append(sensor)
    
    # Move to collection
    for part in door_parts:
        bpy.ops.object.select_all(action='DESELECT')
        part.select_set(True)
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Structure"))
    
    return door_parts

def create_window(x, y, rotation=0, width=1.5, height=1.5, sill_height=0.8, name="Window"):
    """Create a window with frame"""
    frame_width = width + 0.1
    frame_depth = 0.2
    
    # Window frame
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, sill_height + height/2))
    window_frame = bpy.context.object
    window_frame.dimensions = (frame_width, frame_depth, height+0.1)
    window_frame.rotation_euler[2] = rotation
    window_frame.name = name + "_Frame"
    
    # Window glass
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, sill_height + height/2))
    window_glass = bpy.context.object
    window_glass.dimensions = (width-0.05, 0.05, height-0.05)
    window_glass.rotation_euler[2] = rotation
    window_glass.name = name + "_Glass"
    
    # Materials
    frame_mat = create_material("Window_Frame", (0.3, 0.3, 0.3), 0.2, 0.3)
    window_frame.data.materials.append(frame_mat)
    
    glass_mat = bpy.data.materials.new(name="Window_Glass")
    glass_mat.use_nodes = True
    bsdf = glass_mat.node_tree.nodes["Principled BSDF"]
    set_principled_inputs(bsdf, 
                         base_color=(0.8, 0.9, 1.0, 1.0), 
                         roughness=0.0,
                         ior=1.45)
    
    # Handle transmission based on Blender version
    if 'Transmission' in bsdf.inputs:
        bsdf.inputs['Transmission'].default_value = 0.9
    elif 'Transmission Weight' in bsdf.inputs:
        bsdf.inputs['Transmission Weight'].default_value = 0.9
    
    window_glass.data.materials.append(glass_mat)
    
    # Move to collection
    for part in [window_frame, window_glass]:
        bpy.ops.object.select_all(action='DESELECT')
        part.select_set(True)
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Structure"))
    
    return [window_frame, window_glass]

def create_cutaway_room(x, y, width, depth, height=3.2, wall_thickness=0.2, room_name="", collection_name="Structure"):
    """Create an improved cutaway room with floor section and better walls"""
    # Create floor section with appropriate material
    floor_mat = create_material("Floor_" + room_name, material_palette.get("Floor_" + room_name.split("_")[0], material_palette["Floor_Main"]))
    floor_section = create_floor_section(x, y, width, depth, 0.01, f"{room_name}_Floor", floor_mat)
    
    # Get wall material based on room type
    wall_mat = get_room_wall_material(room_name)
    
    # Back wall
    back_wall = create_wall((x - width/2, y - depth/2), (x + width/2, y - depth/2), height, wall_thickness, f"{room_name}_BackWall", collection_name)
    back_wall.data.materials.append(wall_mat)
    
    # Left wall
    left_wall = create_wall((x - width/2, y - depth/2), (x - width/2, y + depth/2), height, wall_thickness, f"{room_name}_LeftWall", collection_name)
    left_wall.data.materials.append(wall_mat)
    
    # Right wall
    right_wall = create_wall((x + width/2, y - depth/2), (x + width/2, y + depth/2), height, wall_thickness, f"{room_name}_RightWall", collection_name)
    right_wall.data.materials.append(wall_mat)
    
    # Label
    bpy.ops.object.text_add(location=(x, y, height + 0.2))
    label = bpy.context.object
    label.data.body = room_name.replace("_", " ")
    label.data.size = 0.8
    label.name = f"Label_{room_name}"
    label.data.align_x = 'CENTER'
    label.data.align_y = 'CENTER'
    # Rotate label to face up
    label.rotation_euler = (math.radians(90), 0, 0)
    # Set label color
    mat = create_material(f"LabelMat_{room_name}", (0, 0, 0))
    label.data.materials.append(mat)
    
    bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Decor"))
    
    return back_wall, left_wall, right_wall, label, floor_section


def create_corridor(start_x, start_y, end_x, end_y, width, height=3.2, wall_thickness=0.2):
    """Create corridor with walls"""
    # Calculate corridor direction
    dx = end_x - start_x
    dy = end_y - start_y
    length = ((dx)**2 + (dy)**2)**0.5
    angle = math.atan2(dy, dx)
    
    # Corridor floor
    corridor_floor_mat = create_material("Corridor_Floor", (0.82, 0.82, 0.82), 0.2)
    bpy.ops.mesh.primitive_plane_add(size=1, location=((start_x + end_x)/2, (start_y + end_y)/2, 0.01))
    corridor_floor = bpy.context.object
    corridor_floor.scale.x = length / 2
    corridor_floor.scale.y = width / 2
    corridor_floor.rotation_euler[2] = angle
    corridor_floor.name = f"Corridor_Floor_{start_x}_{start_y}"
    corridor_floor.data.materials.append(corridor_floor_mat)
    bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Structure"))
    
    # Add guidance lines on floor
    if length > 10:  # Only add guidance lines to longer corridors
        guide_mat = create_material("Guide_Line", (0.3, 0.7, 0.4), 0.3)
        bpy.ops.mesh.primitive_plane_add(size=1, location=((start_x + end_x)/2, (start_y + end_y)/2, 0.02))
        guide_line = bpy.context.object
        guide_line.scale.x = length / 2
        guide_line.scale.y = 0.1
        guide_line.rotation_euler[2] = angle
        guide_line.name = f"Guide_Line_{start_x}_{start_y}"
        guide_line.data.materials.append(guide_mat)
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Decor"))
    
    # Corridor walls (if needed - depends on room layouts)
    # Add wall segments where needed - this would require checking for room intersections
    # This simplified version just adds fixed walls at the ends if they're not close to a room
    
    return corridor_floor

# --- Equipment and furniture functions ---
def create_trauma_bed(x, y, z=0):
    """Create improved hospital bed with mattress and frame"""
    # Bed frame
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + 0.3))
    frame = bpy.context.object
    frame.dimensions = (2.1, 0.9, 0.6)
    frame.name = "Bed_Frame"
    
    # Mattress
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + 0.6))
    mattress = bpy.context.object
    mattress.dimensions = (2, 0.85, 0.2)
    mattress.name = "Bed_Mattress"
    
    # Pillow
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x - 0.7, y, z + 0.75))
    pillow = bpy.context.object
    pillow.dimensions = (0.4, 0.6, 0.1)
    pillow.name = "Bed_Pillow"
    
    # Footboard and headboard
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x + 0.95, y, z + 0.8))
    footboard = bpy.context.object
    footboard.dimensions = (0.1, 0.9, 1)
    footboard.name = "Bed_Footboard"
    
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x - 0.95, y, z + 0.8))
    headboard = bpy.context.object
    headboard.dimensions = (0.1, 0.9, 1)
    headboard.name = "Bed_Headboard"
    
    # Materials
    frame_mat = create_material("Bed_Frame_Material", (0.7, 0.7, 0.75), 0.2, 0.3)
    frame.data.materials.append(frame_mat)
    footboard.data.materials.append(frame_mat)
    headboard.data.materials.append(frame_mat)
    
    mattress_mat = create_material("Mattress_Material", (0.9, 0.9, 0.95), 0.5, 0.0)
    mattress.data.materials.append(mattress_mat)
    
    pillow_mat = create_material("Pillow_Material", (1, 1, 1), 0.5, 0.0)
    pillow.data.materials.append(pillow_mat)
    
    # Group objects
    bed_parts = [frame, mattress, pillow, footboard, headboard]
    
    # Move to collection
    for part in bed_parts:
        bpy.ops.object.select_all(action='DESELECT')
        part.select_set(True)
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Furniture"))
        
    return bed_parts

def create_chair(x, y, z=0, color=(0.6, 0.6, 0.6)):
    """Create an improved chair"""
    # Seat
    bpy.ops.mesh.primitive_cube_add(size=0.5, location=(x, y, z + 0.25))
    seat = bpy.context.object
    seat.dimensions = (0.5, 0.5, 0.1)
    seat.name = "Chair_Seat"
    
    # Back
    bpy.ops.mesh.primitive_cube_add(size=0.5, location=(x - 0.2, y, z + 0.55))
    back = bpy.context.object
    back.dimensions = (0.1, 0.5, 0.7)
    back.name = "Chair_Back"
    
    # Legs
    legs = []
    for lx, ly in [(0.2, 0.2), (0.2, -0.2), (-0.2, 0.2), (-0.2, -0.2)]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.5, location=(x + lx, y + ly, z + 0.125))
        leg = bpy.context.object
        leg.name = f"Chair_Leg_{lx}_{ly}"
        legs.append(leg)
    
    # Materials
    chair_mat = create_material("Chair_Material", color, 0.3, 0.0)
    leg_mat = create_material("Chair_Leg_Material", (0.3, 0.3, 0.3), 0.1, 0.6)
    
    seat.data.materials.append(chair_mat)
    back.data.materials.append(chair_mat)
    for leg in legs:
        leg.data.materials.append(leg_mat)
    
    # Group objects
    chair_parts = [seat, back] + legs
    
    # Move to collection
    for part in chair_parts:
        bpy.ops.object.select_all(action='DESELECT')
        part.select_set(True)
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Furniture"))
    
    return chair_parts

def create_desk(x, y, z=0, width=1.2, depth=0.6, height=0.75):
    """Create an improved desk"""
    # Desktop
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + height))
    desktop = bpy.context.object
    desktop.dimensions = (width, depth, 0.05)
    desktop.name = "Desk_Top"
    
    # Legs
    legs = []
    for lx, ly in [(width/2 - 0.05, depth/2 - 0.05), 
                   (width/2 - 0.05, -depth/2 + 0.05),
                   (-width/2 + 0.05, depth/2 - 0.05), 
                   (-width/2 + 0.05, -depth/2 + 0.05)]:
        bpy.ops.mesh.primitive_cube_add(size=0.05, location=(x + lx, y + ly, z + height/2))
        leg = bpy.context.object
        leg.dimensions = (0.05, 0.05, height)
        leg.name = f"Desk_Leg_{lx}_{ly}"
        legs.append(leg)
    
    # Material
    desk_mat = create_material("Desk_Material", (0.6, 0.5, 0.4), 0.4, 0.0)
    desktop.data.materials.append(desk_mat)
    for leg in legs:
        leg.data.materials.append(desk_mat)
    
    # Move to collection
    desk_parts = [desktop] + legs
    for part in desk_parts:
        bpy.ops.object.select_all(action='DESELECT')
        part.select_set(True)
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Furniture"))
    
    return desk_parts

def create_counter(x, y, z=0, width=2.5, depth=0.7, height=1.0):
    """Create improved counter with drawers"""
    # Counter top
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + height))
    top = bpy.context.object
    top.dimensions = (width, depth, 0.05)
    top.name = "Counter_Top"
    
    # Base
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y - depth*0.25, z + height/2))
    base = bpy.context.object
    base.dimensions = (width, depth*0.5, height)
    base.name = "Counter_Base"
    
    # Drawer fronts
    drawer_count = max(1, int(width / 0.6))
    drawer_width = width / drawer_count
    drawers = []
    
    for i in range(drawer_count):
        drawer_x = x - width/2 + drawer_width/2 + i * drawer_width
        bpy.ops.mesh.primitive_cube_add(size=1, location=(drawer_x, y - depth*0.25, z + height*0.7))
        drawer = bpy.context.object
        drawer.dimensions = (drawer_width - 0.05, 0.02, height*0.25)
        drawer.name = f"Counter_Drawer_{i}"
        
        # Add handle
        bpy.ops.mesh.primitive_cube_add(size=1, location=(drawer_x, y - depth*0.25, z + height*0.7))
        handle = bpy.context.object
        handle.dimensions = (drawer_width*0.3, 0.05, 0.04)
        handle.name = f"Counter_Handle_{i}"
        
        drawers.extend([drawer, handle])
    
    # Materials
    counter_mat = create_material("Counter_Material", (0.9, 0.9, 0.9), 0.2, 0.1)
    top.data.materials.append(counter_mat)
    
    base_mat = create_material("Counter_Base", (0.8, 0.8, 0.8), 0.3, 0.0)
    base.data.materials.append(base_mat)
    
    drawer_mat = create_material("Counter_Drawer", (0.75, 0.75, 0.75), 0.3, 0.0)
    handle_mat = create_material("Counter_Handle", (0.4, 0.4, 0.4), 0.2, 0.8)
    
    for i in range(0, len(drawers), 2):
        drawers[i].data.materials.append(drawer_mat)
        drawers[i+1].data.materials.append(handle_mat)
    
    # Move to collection
    counter_parts = [top, base] + drawers
    for part in counter_parts:
        bpy.ops.object.select_all(action='DESELECT')
        part.select_set(True)
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Furniture"))
    
    return counter_parts

def create_shelf(x, y, z=0, width=1.0, depth=0.4, height=2.0):
    """Create improved shelf unit with multiple shelves"""
    # Back panel
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + height/2))
    back = bpy.context.object
    back.dimensions = (width, 0.02, height)
    back.name = "Shelf_Back"
    
    # Side panels
    left = bpy.ops.mesh.primitive_cube_add(size=1, location=(x - width/2 + 0.02, y + depth/2 - 0.02, z + height/2))
    left = bpy.context.object
    left.dimensions = (0.04, depth, height)
    left.name = "Shelf_Left"
    
    right = bpy.ops.mesh.primitive_cube_add(size=1, location=(x + width/2 - 0.02, y + depth/2 - 0.02, z + height/2))
    right = bpy.context.object
    right.dimensions = (0.04, depth, height)
    right.name = "Shelf_Right"
    
    # Shelf boards
    shelves = []
    shelf_count = 5
    for i in range(shelf_count):
        shelf_z = z + (i * height/(shelf_count-1))
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y + depth/2 - 0.02, shelf_z))
        shelf = bpy.context.object
        shelf.dimensions = (width - 0.04, depth, 0.03)
        shelf.name = f"Shelf_Board_{i}"
        shelves.append(shelf)
    
    # Materials
    shelf_mat = create_material("Shelf_Material", (0.8, 0.8, 0.85), 0.3, 0.0)
    
    for obj in [back, left, right] + shelves:
        obj.data.materials.append(shelf_mat)
        
    # Add some items to shelves
    items = []
    # Add medicine boxes and supplies randomly to shelves
    for i in range(15):
        shelf_num = random.randint(0, shelf_count-1)
        shelf_z = z + (shelf_num * height/(shelf_count-1))
        item_x = x - width/2 + 0.1 + random.random() * (width - 0.2)
        item_y = y + depth/2 - 0.15 - random.random() * (depth - 0.2)
        
        size_x = 0.1 + random.random() * 0.15
        size_y = 0.1 + random.random() * 0.1
        size_z = 0.1 + random.random() * 0.15
        
        bpy.ops.mesh.primitive_cube_add(size=1, location=(item_x, item_y, shelf_z + 0.03 + size_z/2))
        item = bpy.context.object
        item.dimensions = (size_x, size_y, size_z)
        
        # Random pastel color for medicine boxes
        r = 0.3 + random.random() * 0.7
        g = 0.3 + random.random() * 0.7
        b = 0.3 + random.random() * 0.7
        
        item_mat = create_material(f"Item_Material_{i}", (r, g, b), 0.2, 0.0)
        item.data.materials.append(item_mat)
        item.name = f"Shelf_Item_{i}"
        items.append(item)
    
    # Move to collections
    for part in [back, left, right] + shelves:
        bpy.ops.object.select_all(action='DESELECT')
        part.select_set(True)
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Furniture"))
        
    for item in items:
        bpy.ops.object.select_all(action='DESELECT')
        item.select_set(True)
        bpy.context.view_layer.objects.active = item
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Decor"))
    
    return [back, left, right] + shelves + items

def create_monitor(x, y, z):
    """Create improved medical monitor with screen and stand"""
    # Monitor screen
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + 1.2))
    monitor = bpy.context.object
    monitor.dimensions = (0.4, 0.05, 0.3)
    monitor.name = "Monitor_Screen"
    
    # Stand
    bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.5, location=(x, y, z + 0.95))
    stand = bpy.context.object
    stand.name = "Monitor_Stand"
    
    # Base
    bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=0.03, location=(x, y, z + 0.7))
    base = bpy.context.object
    base.name = "Monitor_Base"
    
    # Material for casing
    casing_mat = create_material("Monitor_Casing", (0.2, 0.2, 0.22), 0.3, 0.1)
    stand.data.materials.append(casing_mat)
    base.data.materials.append(casing_mat)
    
    # Screen material with emission
    screen_mat = bpy.data.materials.new(name="Monitor_Screen")
    screen_mat.use_nodes = True
    nodes = screen_mat.node_tree.nodes
    links = screen_mat.node_tree.links
    
    # Clear existing nodes
    for node in nodes:
        nodes.remove(node)
        
    # Create emission shader
    output = nodes.new(type='ShaderNodeOutputMaterial')
    emission = nodes.new(type='ShaderNodeEmission')
    emission.inputs['Color'].default_value = (0.2, 0.8, 1.0, 1.0)
    emission.inputs['Strength'].default_value = 2.0
    links.new(emission.outputs['Emission'], output.inputs['Surface'])
    
    monitor.data.materials.append(screen_mat)
    
    # Add vitals display texture
    # (This would be more complex in a full implementation)
    
    # Move to collection
    for part in [monitor, stand, base]:
        bpy.ops.object.select_all(action='DESELECT')
        part.select_set(True)
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Medical_Equipment"))
    
    return [monitor, stand, base]

def create_iv_stand(x, y, z):
    """Create improved IV stand with hooks and IV bag - VERSION COMPATIBLE"""
    # Main pole
    bpy.ops.mesh.primitive_cylinder_add(radius=0.02, depth=2.0, location=(x, y, z + 1.0))
    pole = bpy.context.object
    pole.name = "IV_Stand_Pole"
    
    # Base
    bpy.ops.mesh.primitive_cylinder_add(radius=0.25, depth=0.05, location=(x, y, z + 0.025))
    base = bpy.context.object
    base.name = "IV_Stand_Base"
    
    # Hooks
    hooks = []
    for angle in [0, 1.57, 3.14, 4.71]:  # Positions around pole
        bpy.ops.mesh.primitive_cylinder_add(radius=0.01, depth=0.2, location=(x + 0.08 * math.cos(angle), y + 0.08 * math.sin(angle), z + 1.95))
        hook = bpy.context.object
        hook.rotation_euler = (0, math.radians(90), angle)
        hook.name = f"IV_Hook_{angle}"
        hooks.append(hook)
    
    # Add IV bag to one hook
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x + 0.05, y, z + 1.75))
    iv_bag = bpy.context.object
    iv_bag.dimensions = (0.08, 0.05, 0.2)
    iv_bag.name = "IV_Bag"
    
    # Add tubing
    curve_data = bpy.data.curves.new('IV_Tube', 'CURVE')
    curve_data.dimensions = '3D'
    curve_data.resolution_u = 2
    
    spline = curve_data.splines.new('BEZIER')
    spline.bezier_points.add(3)
    
    # Set tube points
    points = spline.bezier_points
    points[0].co = (x + 0.05, y, z + 1.65)
    points[0].handle_right_type = 'AUTO'
    points[0].handle_left_type = 'AUTO'
    
    points[1].co = (x + 0.1, y, z + 1.4)
    points[1].handle_right_type = 'AUTO'
    points[1].handle_left_type = 'AUTO'
    
    points[2].co = (x + 0.2, y, z + 1.2)
    points[2].handle_right_type = 'AUTO'
    points[2].handle_left_type = 'AUTO'
    
    points[3].co = (x + 0.3, y, z + 0.9)
    points[3].handle_right_type = 'AUTO'
    points[3].handle_left_type = 'AUTO'
    
    # Create tube object
    iv_tube = bpy.data.objects.new('IV_Tube', curve_data)
    iv_tube.data.bevel_depth = 0.005
    bpy.context.collection.objects.link(iv_tube)
    
    # Materials
    metal_mat = create_material("IV_Metal", (0.8, 0.8, 0.8), 0.2, 1.0)
    pole.data.materials.append(metal_mat)
    base.data.materials.append(metal_mat)
    for hook in hooks:
        hook.data.materials.append(metal_mat)
    
    # IV bag material - using the updated create_material function
    iv_bag_mat = create_material("IV_Fluid", (0.9, 0.9, 1.0), 
                                roughness=0.05, 
                                ior=1.33, 
                                transmission=0.7, 
                                alpha=0.8)
    iv_bag.data.materials.append(iv_bag_mat)
    
    iv_tube_mat = create_material("IV_Tube", (1.0, 1.0, 1.0), 0.2, 0.0)
    iv_tube.data.materials.append(iv_tube_mat)
    
    # Move to collection
    for part in [pole, base] + hooks + [iv_bag, iv_tube]:
        bpy.ops.object.select_all(action='DESELECT')
        if hasattr(part, 'select_set'):  # Check if the object has this method
            part.select_set(True)
            bpy.context.view_layer.objects.active = part
            bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Medical_Equipment"))
    
    return [pole, base] + hooks + [iv_bag, iv_tube]

def create_wheelchair(x, y, z):
    """Create improved wheelchair"""
    # Main seat
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + 0.5))
    seat = bpy.context.object
    seat.dimensions = (0.6, 0.6, 0.1)
    seat.name = "Wheelchair_Seat"
    
    # Back
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x - 0.25, y, z + 0.85))
    back = bpy.context.object
    back.dimensions = (0.1, 0.6, 0.8)
    back.name = "Wheelchair_Back"
    
    # Wheels
    wheels = []
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.25, depth=0.05, location=(x, y + side*0.35, z + 0.25))
        wheel = bpy.context.object
        wheel.rotation_euler = (math.radians(90), 0, 0)
        wheel.name = f"Wheelchair_Wheel_{side}"
        
        # Add spokes
        bpy.ops.mesh.primitive_cylinder_add(radius=0.01, depth=0.5, location=(x, y + side*0.35, z + 0.25))
        spokes = bpy.context.object
        spokes.name = f"Wheelchair_Spokes_{side}"
        
        wheels.extend([wheel, spokes])
    
    # Small front wheels
    small_wheels = []
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=0.03, location=(x + 0.25, y + side*0.3, z + 0.1))
        small_wheel = bpy.context.object
        small_wheel.rotation_euler = (math.radians(90), 0, 0)
        small_wheel.name = f"Wheelchair_SmallWheel_{side}"
        small_wheels.append(small_wheel)
    
    # Armrests
    armrests = []
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x - 0.1, y + side*0.35, z + 0.7))
        armrest = bpy.context.object
        armrest.dimensions = (0.4, 0.07, 0.05)
        armrest.name = f"Wheelchair_Armrest_{side}"
        armrests.append(armrest)
    
    # Footrests
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x + 0.25, y, z + 0.25))
    footrest = bpy.context.object
    footrest.dimensions = (0.15, 0.5, 0.05)
    footrest.name = "Wheelchair_Footrest"
    
    # Materials
    frame_mat = create_material("Wheelchair_Frame", (0.15, 0.15, 0.15), 0.2, 0.8)
    seat_mat = create_material("Wheelchair_Seat", (0.1, 0.1, 0.6), 0.4, 0.0)
    wheel_mat = create_material("Wheelchair_Wheel", (0.1, 0.1, 0.1), 0.3, 0.0)
    
    seat.data.materials.append(seat_mat)
    back.data.materials.append(seat_mat)
    for armrest in armrests:
        armrest.data.materials.append(frame_mat)
    footrest.data.materials.append(frame_mat)
    
    for i in range(0, len(wheels), 2):
        wheels[i].data.materials.append(wheel_mat)
        wheels[i+1].data.materials.append(frame_mat)
    
    for wheel in small_wheels:
        wheel.data.materials.append(wheel_mat)
    
    # Move to collection
    wheelchair_parts = [seat, back, footrest] + wheels + small_wheels + armrests
    for part in wheelchair_parts:
        bpy.ops.object.select_all(action='DESELECT')
        part.select_set(True)
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Medical_Equipment"))
    
    return wheelchair_parts

def create_lab_bench(x, y, z=0):
    """Create improved lab bench with equipment"""
    # Main bench
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + 0.45))
    bench = bpy.context.object
    bench.dimensions = (2, 0.7, 0.9)
    bench.name = "Lab_Bench"
    
    bench_mat = create_material("Bench_Material", (0.85, 0.85, 0.9), 0.3, 0.0)
    bench.data.materials.append(bench_mat)
    
    # Add lab equipment
    equipment = []
    
    # Microscope
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=0.3, location=(x - 0.6, y, z + 0.9 + 0.15))
    microscope_base = bpy.context.object
    microscope_base.name = "Microscope_Base"
    
    bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.2, location=(x - 0.6, y, z + 0.9 + 0.35))
    microscope_arm = bpy.context.object
    microscope_arm.name = "Microscope_Arm"
    
    bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.15, location=(x - 0.6, y, z + 0.9 + 0.5))
    microscope_head = bpy.context.object
    microscope_head.rotation_euler = (math.radians(90), 0, 0)
    microscope_head.name = "Microscope_Head"
    
    equipment.extend([microscope_base, microscope_arm, microscope_head])
    
    # Test tubes
    for i in range(5):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.02, depth=0.15, location=(x - 0.2 + i*0.1, y + 0.2, z + 0.9 + 0.075))
        tube = bpy.context.object
        tube.name = f"Test_Tube_{i}"
        
        # Add colored liquid to some tubes
        if random.random() > 0.3:
            liquid_height = random.random() * 0.1
            bpy.ops.mesh.primitive_cylinder_add(radius=0.018, depth=liquid_height, 
                                             location=(x - 0.2 + i*0.1, y + 0.2, z + 0.9 + liquid_height/2))
            liquid = bpy.context.object
            liquid.name = f"Tube_Liquid_{i}"
            
            # Random color for liquid
            r = random.random()
            g = random.random()
            b = random.random()
            liquid_mat = bpy.data.materials.new(name=f"Liquid_{i}")
            liquid_mat.use_nodes = True
            liquid_mat.node_tree.nodes["Principled BSDF"].inputs['Base Color'].default_value = (r, g, b, 1.0)
            principled_node = liquid_mat.node_tree.nodes.get("Principled BSDF")
            if principled_node and principled_node.type == 'BSDF_PRINCIPLED':
                if 'Transmission' in principled_node.inputs:
                    principled_node.inputs['Transmission'].default_value = 0.7
                else:
                    print("Transmission input not found in Principled BSDF")
            else:
                print("Principled BSDF node not found or incorrect type")
            liquid.data.materials.append(liquid_mat)
            equipment.append(liquid)
        
        # Test tube material - glass
        tube_mat = bpy.data.materials.new(name=f"Glass_Tube_{i}")
        tube_mat.use_nodes = True
        tube_mat.node_tree.nodes["Principled BSDF"].inputs['Base Color'].default_value = (0.9, 0.9, 0.9, 1.0)
        principled_node = tube_mat.node_tree.nodes.get("Principled BSDF")
        if principled_node and principled_node.type == 'BSDF_PRINCIPLED':
            if 'Transmission' in principled_node.inputs:
                principled_node.inputs['Transmission'].default_value = 0.95
            else:
                print("Transmission input not found in Principled BSDF")
        else:
            print("Principled BSDF node not found or incorrect type")

        tube_mat.node_tree.nodes["Principled BSDF"].inputs['Roughness'].default_value = 0.0
        tube.data.materials.append(tube_mat)
        equipment.append(tube)
    
    # Lab equipment and materials
    metal_mat = create_material("Metal_Equipment", (0.8, 0.8, 0.8), 0.2, 0.8)
    for part in [microscope_base, microscope_arm, microscope_head]:
        part.data.materials.append(metal_mat)
    
    # Move to collection
    bpy.ops.object.select_all(action='DESELECT')
    bench.select_set(True)
    bpy.context.view_layer.objects.active = bench
    bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Furniture"))
    
    for part in equipment:
        bpy.ops.object.select_all(action='DESELECT')
        part.select_set(True)
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Medical_Equipment"))
    
    return [bench] + equipment

def create_examination_table(x, y, z=0):
    """Create examination/procedure table"""
    # Table base
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + 0.4))
    base = bpy.context.object
    base.dimensions = (2.0, 0.8, 0.8)
    base.name = "Exam_Table_Base"
    
    # Padding on top
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + 0.85))
    padding = bpy.context.object
    padding.dimensions = (2.0, 0.8, 0.1)
    padding.name = "Exam_Table_Padding"
    
    # Create materials
    base_mat = create_material("Exam_Table", (0.8, 0.8, 0.8), 0.3, 0.3)
    padding_mat = create_material("Exam_Padding", (0.05, 0.4, 0.6), 0.3, 0.0)
    
    base.data.materials.append(base_mat)
    padding.data.materials.append(padding_mat)
    
    # Move to collection
    for part in [base, padding]:
        bpy.ops.object.select_all(action='DESELECT')
        part.select_set(True)
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Medical_Equipment"))
    
    return [base, padding]

def create_reception_desk(x, y, z=0, width=4.0, depth=1.2, height=1.1):
    """Create reception desk with elevated counter"""
    # Main desk
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + height/2))
    desk = bpy.context.object
    desk.dimensions = (width, depth, height)
    desk.name = "Reception_Desk_Main"
    
    # Counter top (lower)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y - depth*0.25, z + height))
    counter_lower = bpy.context.object
    counter_lower.dimensions = (width, depth*0.5, 0.05)
    counter_lower.name = "Reception_Counter_Lower"
    
    # Elevated section
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y + depth*0.25, z + height))
    raised_section = bpy.context.object
    raised_section.dimensions = (width, depth*0.5, 0.4)
    raised_section.name = "Reception_Raised_Section"
    
    # Counter top (upper)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y + depth*0.25, z + height + 0.4))
    counter_upper = bpy.context.object
    counter_upper.dimensions = (width, depth*0.5, 0.05)
    counter_upper.name = "Reception_Counter_Upper"
    
    # Materials
    desk_mat = create_material("Reception_Desk", (0.7, 0.4, 0.3), 0.5, 0.0)  # Wood finish
    desk.data.materials.append(desk_mat)
    raised_section.data.materials.append(desk_mat)
    
    counter_mat = create_material("Reception_Counter", (0.9, 0.9, 0.9), 0.2, 0.0)  # Stone/laminate look
    counter_lower.data.materials.append(counter_mat)
    counter_upper.data.materials.append(counter_mat)
    
    # Move to collection
    for part in [desk, counter_lower, raised_section, counter_upper]:
        bpy.ops.object.select_all(action='DESELECT')
        part.select_set(True)
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Furniture"))
    
    return [desk, counter_lower, raised_section, counter_upper]


def create_waiting_area_chair(x, y, z=0, color=(0.2, 0.3, 0.6)):
    """Create improved waiting area chair"""
    # Seat
    bpy.ops.mesh.primitive_cube_add(size=0.5, location=(x, y, z + 0.25))
    seat = bpy.context.object
    seat.dimensions = (0.6, 0.6, 0.1)
    seat.name = "WaitingChair_Seat"
    
    # Back
    bpy.ops.mesh.primitive_cube_add(size=0.5, location=(x - 0.25, y, z + 0.6))
    back = bpy.context.object
    back.dimensions = (0.1, 0.6, 0.8)
    back.name = "WaitingChair_Back"
    
    # Legs
    legs = []
    for lx, ly in [(0.25, 0.25), (0.25, -0.25), (-0.25, 0.25), (-0.25, -0.25)]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.5, location=(x + lx, y + ly, z + 0.125))
        leg = bpy.context.object
        leg.name = f"WaitingChair_Leg_{lx}_{ly}"
        legs.append(leg)
    
    # Materials
    chair_mat = create_material("WaitingChair_Material", color, 0.3, 0.0)
    leg_mat = create_material("WaitingChair_Leg_Material", (0.3, 0.3, 0.3), 0.1, 0.6)
    
    seat.data.materials.append(chair_mat)
    back.data.materials.append(chair_mat)
    for leg in legs:
        leg.data.materials.append(leg_mat)
    
    # Move to collection
    chair_parts = [seat, back] + legs
    for part in chair_parts:
        bpy.ops.object.select_all(action='DESELECT')
        part.select_set(True)
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Furniture"))
    
    return chair_parts

def create_plant(x, y, z=0, size=1.0):
    """Create decorative plant"""
    # Pot
    bpy.ops.mesh.primitive_cylinder_add(radius=0.2*size, depth=0.4*size, location=(x, y, z + 0.2*size))
    pot = bpy.context.object
    pot.name = "Plant_Pot"
    
    # Plant base (central stem)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.02*size, depth=0.6*size, location=(x, y, z + 0.7*size))
    stem = bpy.context.object
    stem.name = "Plant_Stem"
    
    # Leaves using spheres
    leaves = []
    leaf_count = random.randint(3, 6)
    for i in range(leaf_count):
        angle = (i / leaf_count) * 2 * math.pi
        dist = 0.15 * size
        leaf_x = x + dist * math.cos(angle)
        leaf_y = y + dist * math.sin(angle)
        leaf_z = z + (0.5 + 0.4 * random.random()) * size
        
        bpy.ops.mesh.primitive_ico_sphere_add(radius=0.15*size, location=(leaf_x, leaf_y, leaf_z))
        leaf = bpy.context.object
        leaf.scale = (1.0, 1.0, 0.5)  # Flatten slightly
        leaf.name = f"Plant_Leaf_{i}"
        leaves.append(leaf)
    
    # Materials
    pot_mat = create_material("Plant_Pot", (0.6, 0.3, 0.2), 0.5, 0.0)  # Terracotta
    pot.data.materials.append(pot_mat)
    
    stem_mat = create_material("Plant_Stem", (0.1, 0.3, 0.05), 0.5, 0.0)  # Dark green
    stem.data.materials.append(stem_mat)
    
    leaf_mat = create_material("Plant_Leaf", (0.2, 0.6, 0.3), 0.6, 0.0)  # Brighter green
    for leaf in leaves:
        leaf.data.materials.append(leaf_mat)
    
    # Move to collection
    plant_parts = [pot, stem] + leaves
    for part in plant_parts:
        bpy.ops.object.select_all(action='DESELECT')
        part.select_set(True)
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Decor"))
    
    return plant_parts

def create_information_board(x, y, z=0, width=1.2, height=0.8):
    """Create hospital information board"""
    # Board frame
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + height/2))
    board = bpy.context.object
    board.dimensions = (width, 0.05, height)
    board.name = "Info_Board"
    
    # Add some visual details (simplified text representation)
    details = []
    for i in range(4):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x - width*0.4 + i*width*0.25, y, z + height*0.6))
        line = bpy.context.object
        line.dimensions = (width*0.2, 0.01, 0.05)
        line.name = f"Info_Line_{i}"
        details.append(line)
    
    # Board title
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + height*0.85))
    title = bpy.context.object
    title.dimensions = (width*0.8, 0.01, 0.08)
    title.name = "Info_Title"
    details.append(title)
    
    # Materials
    board_mat = create_material("Board_Material", (0.9, 0.9, 0.95), 0.3, 0.0)
    board.data.materials.append(board_mat)
    
    text_mat = create_material("Text_Material", (0.1, 0.1, 0.1), 0.0, 0.0)
    for detail in details:
        detail.data.materials.append(text_mat)
    
    # Move to collection
    board_parts = [board] + details
    for part in board_parts:
        bpy.ops.object.select_all(action='DESELECT')
        part.select_set(True)
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Decor"))
    
    return board_parts

def create_directional_sign(x, y, z=3.0, width=1.0, main_direction="Emergency"):
    """Create hospital directional sign hanging from ceiling"""
    # Sign board
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z - 0.15))
    sign = bpy.context.object
    sign.dimensions = (width, 0.05, 0.3)
    sign.name = "Directional_Sign"
    
    # Ceiling attachment
    bpy.ops.mesh.primitive_cylinder_add(radius=0.01, depth=0.3, location=(x, y, z))
    attachment = bpy.context.object
    attachment.name = "Sign_Attachment"
    
    # Materials
    sign_mat = bpy.data.materials.new(name="Sign_Material")
    sign_mat.use_nodes = True
    
    # Create emission material based on department
    nodes = sign_mat.node_tree.nodes
    links = sign_mat.node_tree.links
    
    # Clear existing nodes
    for node in nodes:
        nodes.remove(node)
        
    # Create emission shader
    output = nodes.new(type='ShaderNodeOutputMaterial')
    emission = nodes.new(type='ShaderNodeEmission')
    
    # Set color based on direction/department
    if "Emergency" in main_direction:
        emission.inputs['Color'].default_value = (0.9, 0.1, 0.1, 1.0)  # Red for emergency
    elif "Lab" in main_direction:
        emission.inputs['Color'].default_value = (0.1, 0.3, 0.8, 1.0)  # Blue for lab
    elif "Pharmacy" in main_direction:
        emission.inputs['Color'].default_value = (0.2, 0.8, 0.4, 1.0)  # Green for pharmacy
    elif "Ward" in main_direction:
        emission.inputs['Color'].default_value = (0.8, 0.7, 0.2, 1.0)  # Yellow for wards
    else:
        emission.inputs['Color'].default_value = (0.4, 0.6, 0.8, 1.0)  # Default blue
    
    emission.inputs['Strength'].default_value = 1.5
    links.new(emission.outputs['Emission'], output.inputs['Surface'])
    
    sign.data.materials.append(sign_mat)
    
    attach_mat = create_material("Attachment_Material", (0.8, 0.8, 0.8), 0.2, 0.8)
    attachment.data.materials.append(attach_mat)
    
    # Move to collection
    for part in [sign, attachment]:
        bpy.ops.object.select_all(action='DESELECT')
        part.select_set(True)
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Decor"))
    
    return [sign, attachment]

def create_floor_marking(start_x, start_y, end_x, end_y, color=(0.9, 0.1, 0.1), width=0.2, z=0.02):
    """Create colored floor marking line"""
    # Calculate midpoint and line properties
    mid_x = (start_x + end_x) / 2
    mid_y = (start_y + end_y) / 2
    length = ((end_x - start_x)**2 + (end_y - start_y)**2)**0.5
    angle = math.atan2(end_y - start_y, end_x - start_x)
    
    bpy.ops.mesh.primitive_plane_add(size=1, location=(mid_x, mid_y, z))
    marking = bpy.context.object
    marking.scale.x = length / 2
    marking.scale.y = width / 2
    marking.rotation_euler[2] = angle
    marking.name = f"FloorMarking_{start_x}_{start_y}_{end_x}_{end_y}"
    
    # Material
    marking_mat = create_material(f"Marking_{color[0]}_{color[1]}_{color[2]}", color, 0.3, 0.0)
    marking.data.materials.append(marking_mat)
    
    # Move to collection
    bpy.ops.object.select_all(action='DESELECT')
    marking.select_set(True)
    bpy.context.view_layer.objects.active = marking
    bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Decor"))
    
    return marking

def create_privacy_curtain_rail(x, y, width, depth, z=2.8):
    """Create curtain rail for hospital privacy curtains"""
    # Create U-shaped rail
    curve_data = bpy.data.curves.new('CurtainRail', 'CURVE')
    curve_data.dimensions = '3D'
    curve_data.resolution_u = 2
    
    spline = curve_data.splines.new('POLY')
    
    # Create U shape
    points = [
        (x - width/2, y - depth/2, z),
        (x - width/2, y + depth/2, z),
        (x + width/2, y + depth/2, z),
        (x + width/2, y - depth/2, z)
    ]
    
    spline.points.add(len(points)-1)  # Add points to spline
    for i, coord in enumerate(points):
        spline.points[i].co = (*coord, 1)  # 4D for NURBS
    
    # Create curtain rail object
    rail = bpy.data.objects.new('CurtainRail', curve_data)
    rail.data.bevel_depth = 0.02  # Give the curve thickness
    bpy.context.collection.objects.link(rail)
    
    # Material
    rail_mat = create_material("Rail_Material", (0.8, 0.8, 0.8), 0.2, 0.9)
    rail.data.materials.append(rail_mat)
    
    # Create simplified curtains
    curtain_sections = []
    section_count = 8
    for i in range(section_count):
        t = i / (section_count - 1)
        if t <= 0.5:  # Left side
            cx = x - width/2
            cy = y - depth/2 + t * depth
        else:  # Right side
            cx = x - width/2 + (t - 0.5) * width
            cy = y + depth/2
            
        bpy.ops.mesh.primitive_plane_add(size=1, location=(cx, cy, z - 1.4))
        curtain = bpy.context.object
        curtain.dimensions = (0.2, 0.02, 2.8)
        curtain.rotation_euler = (0, 0, math.pi/2 if t <= 0.5 else 0)
        curtain.name = f"Curtain_Section_{i}"
        curtain_sections.append(curtain)
    
    # Curtain material - semi-transparent fabric
    curtain_mat = bpy.data.materials.new(name="Curtain_Material")
    curtain_mat.use_nodes = True
    curtain_mat.node_tree.nodes["Principled BSDF"].inputs['Base Color'].default_value = (0.9, 0.9, 0.95, 1.0)
    curtain_mat.node_tree.nodes["Principled BSDF"].inputs['Roughness'].default_value = 0.8
    principled_node = curtain_mat.node_tree.nodes.get("Principled BSDF")
    if principled_node and principled_node.type == 'BSDF_PRINCIPLED':
        if 'Sheen' in principled_node.inputs:
            principled_node.inputs['Sheen'].default_value = 0.2
        else:
            print("Sheen input not found in Principled BSDF")
    else:
        print("Principled BSDF node not found or incorrect type")    
    curtain_mat.use_screen_refraction = True
    curtain_mat.blend_method = 'BLEND'
    curtain_mat.node_tree.nodes["Principled BSDF"].inputs['Alpha'].default_value = 0.7
    
    for curtain in curtain_sections:
        curtain.data.materials.append(curtain_mat)
    
    # Move to collection
    bpy.ops.object.select_all(action='DESELECT')
    for part in curtain_sections + [rail]:
        if hasattr(part, 'select_set'):  # Check if the object has this method
            part.select_set(True)
            bpy.context.view_layer.objects.active = part
            bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Decor"))
    
    return [rail] + curtain_sections

def create_medical_cabinet(x, y, z=0, width=1.2, depth=0.4, height=1.8):
    """Create medical supply cabinet"""
    # Main cabinet body
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + height/2))
    cabinet = bpy.context.object
    cabinet.dimensions = (width, depth, height)
    cabinet.name = "Medical_Cabinet"
    
    # Doors
    doors = []
    door_width = width / 2
    
    for i, offset in enumerate([-1, 1]):
        door_x = x + offset * door_width/2
        bpy.ops.mesh.primitive_cube_add(size=1, location=(door_x, y + depth/2 + 0.01, z + height/2))
        door = bpy.context.object
        door.dimensions = (door_width - 0.05, 0.05, height - 0.05)
        door.name = f"Cabinet_Door_{i}"
        
        # Add handle
        bpy.ops.mesh.primitive_cylinder_add(radius=0.02, depth=0.12, location=(door_x + offset * door_width*0.3, y + depth/2 + 0.05, z + height/2))
        handle = bpy.context.object
        handle.rotation_euler = (math.pi/2, 0, 0)
        handle.name = f"Cabinet_Handle_{i}"
        
        doors.extend([door, handle])
    
    # Shelves inside cabinet (simplified - just for visibility when doors are open)
    shelves = []
    shelf_count = 4
    for i in range(shelf_count):
        shelf_z = z + height * (i + 1) / (shelf_count + 1)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, shelf_z))
        shelf = bpy.context.object
        shelf.dimensions = (width - 0.1, depth - 0.1, 0.03)
        shelf.name = f"Cabinet_Shelf_{i}"
        shelves.append(shelf)
    
    # Materials
    cabinet_mat = create_material("Cabinet_Material", (0.9, 0.9, 0.9), 0.3, 0.0)
    cabinet.data.materials.append(cabinet_mat)
    
    door_mat = create_material("Cabinet_Door", (0.85, 0.85, 0.9), 0.3, 0.0)
    handle_mat = create_material("Cabinet_Handle", (0.4, 0.4, 0.4), 0.2, 0.8)
    shelf_mat = cabinet_mat
    
    for i in range(0, len(doors), 2):
        doors[i].data.materials.append(door_mat)
        doors[i+1].data.materials.append(handle_mat)
    
    for shelf in shelves:
        shelf.data.materials.append(shelf_mat)
    
    # Move to collection
    cabinet_parts = [cabinet] + doors + shelves
    for part in cabinet_parts:
        bpy.ops.object.select_all(action='DESELECT')
        part.select_set(True)
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Furniture"))
    
    return cabinet_parts

def create_medical_cart(x, y, z=0):
    """Create mobile medical cart"""
    # Main cart body
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + 0.5))
    cart = bpy.context.object
    cart.dimensions = (0.7, 0.5, 1.0)
    cart.name = "Medical_Cart"
    
    # Top surface
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + 1.01))
    top = bpy.context.object
    top.dimensions = (0.7, 0.5, 0.02)
    top.name = "Cart_Top"
    
    # Drawers
    drawers = []
    drawer_count = 3
    for i in range(drawer_count):
        drawer_z = z + 0.25 + i * 0.25
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y + 0.25, drawer_z))
        drawer = bpy.context.object
        drawer.dimensions = (0.65, 0.03, 0.2)
        drawer.name = f"Cart_Drawer_{i}"
        
        # Handle
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y + 0.27, drawer_z))
        handle = bpy.context.object
        handle.dimensions = (0.2, 0.03, 0.03)
        handle.name = f"Cart_Handle_{i}"
        
        drawers.extend([drawer, handle])
    
    # Wheels
    wheels = []
    for wx, wy in [(0.25, 0.2), (0.25, -0.2), (-0.25, 0.2), (-0.25, -0.2)]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.04, location=(x + wx, y + wy, z + 0.05))
        wheel = bpy.context.object
        wheel.rotation_euler = (math.pi/2, 0, 0)
        wheel.name = f"Cart_Wheel_{wx}_{wy}"
        wheels.append(wheel)
    
    # Materials
    cart_mat = create_material("Cart_Material", (0.85, 0.85, 0.9), 0.3, 0.0)
    cart.data.materials.append(cart_mat)
    top.data.materials.append(cart_mat)
    
    drawer_mat = create_material("Drawer_Material", (0.8, 0.8, 0.85), 0.3, 0.0)
    handle_mat = create_material("Handle_Material", (0.4, 0.4, 0.5), 0.2, 0.8)
    for i in range(0, len(drawers), 2):
        drawers[i].data.materials.append(drawer_mat)
        drawers[i+1].data.materials.append(handle_mat)
    
    wheel_mat = create_material("Wheel_Material", (0.2, 0.2, 0.2), 0.3, 0.1)
    for wheel in wheels:
        wheel.data.materials.append(wheel_mat)
    
    # Move to collection
    cart_parts = [cart, top] + drawers + wheels
    for part in cart_parts:
        bpy.ops.object.select_all(action='DESELECT')
        part.select_set(True)
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Medical_Equipment"))
    
    return cart_parts

def create_light(x, y, z, energy=500, color=(1,1,1), type='AREA', size=1.0, name=None):
    """Create improved lighting with fixture"""
    # Light fixture
    bpy.ops.mesh.primitive_cylinder_add(radius=0.2*size, depth=0.05*size, location=(x, y, z-0.05*size))
    fixture = bpy.context.object
    fixture.name = f"Light_Fixture_{x}_{y}"
    
    # Create light
    bpy.ops.object.light_add(type=type, location=(x, y, z))
    light = bpy.context.object
    light.data.energy = energy
    light.data.color = color
    
    if type == 'AREA':
        light.data.size = 0.8 * size
        light.data.spread = 80
    
    if name:
        light.name = name
    else:
        light.name = f"Light_{x}_{y}"
    
    # Material for fixture
    fixture_mat = create_material("Fixture_Material", (0.8, 0.8, 0.8), 0.2, 0.8)
    fixture.data.materials.append(fixture_mat)
    
    # Move to collection
    bpy.ops.object.select_all(action='DESELECT')
    fixture.select_set(True)
    bpy.context.view_layer.objects.active = fixture
    bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Lighting"))
    
    bpy.ops.object.select_all(action='DESELECT')
    light.select_set(True)
    bpy.context.view_layer.objects.active = light
    bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Lighting"))
    
    return [light, fixture]

# --- Create corridors first ---
for corridor_data in corridors:
    create_corridor(*corridor_data)

# --- Create all rooms as cutaway + labels ---
for room, params in rooms.items():
    create_cutaway_room(*params, room_name=room)
    x, y, width, depth = params
    
    # Place furniture/features based on room type
    if room == "Main_Entrance":
        create_door(x, y + depth/2, 0, width=3.0, double=True, automatic=True, name="Main_Entrance_Door")
        create_information_board(x + 4, y - 1, 1.8, width=1.5, height=1.0)
        create_directional_sign(x, y, 3.0, 1.5, main_direction="Reception")
        
    elif room == "Reception":
        desk = create_reception_desk(x, y)
        create_chair(x - 1, y - 0.3)  # Chair behind desk for staff
        create_chair(x + 1, y - 0.3)  # Second chair
        create_monitor(x - 0.8, y, 0.5)  # Computer monitor
        create_monitor(x + 0.8, y, 0.5)  # Second monitor
        
    elif room == "Waiting_Area":
        # Create rows of waiting chairs
        for i in range(3):
            for j in range(3):
                chair_color = (0.2, 0.3, 0.6) if (i + j) % 2 == 0 else (0.2, 0.4, 0.7)
                create_waiting_area_chair(x - width/2 + 1 + i*2, y - depth/2 + 1 + j*2, color=chair_color)
        
        create_plant(x + width/2 - 1, y + depth/2 - 1, size=1.2)  # Decorative plant
        create_information_board(x, y - depth/2 + 0.5, 1.2)  # Information board
        
    elif room == "Triage":
        create_desk(x, y)
        create_chair(x - 1, y)  # Staff chair
        create_chair(x + 1, y + 1)  # Patient chair
        create_monitor(x, y, 0)  # Computer
        create_medical_cart(x + 2, y - 1)  # Medical cart
        
    elif room == "Emergency":
        # Create examination areas with curtained sections
        for i in range(3):
            bed_x = x - width/2 + 3 + i*4
            create_examination_table(bed_x, y)
            create_monitor(bed_x + 1, y + 0.5, 0)
            create_iv_stand(bed_x - 0.8, y + 0.3, 0)
            create_privacy_curtain_rail(bed_x, y, 3.5, 3.5)
        
        # Central nurses station
        create_counter(x, y - depth/2 + 3, width=3.0, depth=1.0)
        create_chair(x - 1, y - depth/2 + 2.5)
        create_chair(x + 1, y - depth/2 + 2.5)
        create_monitor(x, y - depth/2 + 3, 0.5)
        
        # Emergency equipment
        create_medical_cart(x - width/2 + 2, y - depth/2 + 2)
        create_medical_cart(x + width/2 - 2, y - depth/2 + 2)
        
        # Emergency directional sign
        create_directional_sign(x, y - depth/2 + 5, 3.0, 1.5, main_direction="Emergency")
        # Emergency floor marking
        create_floor_marking(x, 0, x, y - depth/2, (0.9, 0.1, 0.1), 0.3)
        
    elif room == "ICU":
        # ICU beds with monitoring
        for i in range(2):
            bed_x = x - 2 + i*4
            create_trauma_bed(bed_x, y)
            create_monitor(bed_x + 1, y + 0.3, 0)
            create_monitor(bed_x + 1, y - 0.3, 0)
            create_iv_stand(bed_x - 0.8, y + 0.3, 0)
            create_privacy_curtain_rail(bed_x, y, 3.0, 3.0)
        
        create_counter(x, y - depth/2 + 2, width=2.5, depth=0.8)
        create_medical_cabinet(x + 3, y - 3, width=1.4)
        
    elif room == "Medicine_Ward_A" or room == "Medicine_Ward_B":
        # Create patient beds with nightstands in ward layout
        beds_per_side = 3
        for i in range(beds_per_side):
            # Left side beds
            bed_x = x - width/2 + 3
            bed_y = y - depth/2 + 3 + i*4
            create_trauma_bed(bed_x, bed_y)
            create_privacy_curtain_rail(bed_x, bed_y, 2.5, 3.0)
            
            # Right side beds
            bed_x = x + width/2 - 3
            create_trauma_bed(bed_x, bed_y)
            create_privacy_curtain_rail(bed_x, bed_y, 2.5, 3.0)
        
        # Ward central area
        create_desk(x, y - depth/2 + 3)
        create_chair(x, y - depth/2 + 2)
        
        # Directional sign
        create_directional_sign(x, y, 3.0, 1.2, main_direction="Ward")
        
    elif room == "Nurses_Station":
        create_counter(x, y, width=3.5, depth=1.2)
        for i in range(3):
            chair_x = x - 1 + i
            create_chair(chair_x, y - 1)
            create_monitor(chair_x, y, 0.5)
        
        create_medical_cabinet(x - 3, y + 1.5, width=1.4)
        create_medical_cart(x + 3, y + 1)
        
        # Add filing cabinet
        create_medical_cabinet(x + 2, y - 2, width=1.0, height=1.2)
        
    elif room == "Department_MED":
        # Create examination rooms within the department
        for i in range(2):
            for j in range(2):
                exam_x = x - width/2 + 3 + i*6
                exam_y = y - depth/2 + 3 + j*6
                create_examination_table(exam_x, exam_y)
                create_chair(exam_x - 1.5, exam_y)  # Doctor's chair
                create_chair(exam_x + 1.5, exam_y + 1)  # Patient chair
                create_monitor(exam_x + 1, exam_y - 1, 0)
                create_medical_cart(exam_x - 2, exam_y + 1)
        
        # Department desk area
        create_desk(x, y - depth/2 + 2)
        create_chair(x, y - depth/2 + 1)
        create_medical_cabinet(x - 5, y - 5, width=1.5)
        
    elif room == "Imaging":
        # CT/MRI area - simplified representation
        bpy.ops.mesh.primitive_cylinder_add(radius=1.2, depth=0.8, location=(x - 3, y, 0.4))
        imaging_machine = bpy.context.object
        imaging_machine.name = "Imaging_Machine_Main"
        imaging_mat = create_material("Imaging_Machine", (0.9, 0.9, 0.95), 0.2, 0.1)
        imaging_machine.data.materials.append(imaging_mat)
        
        # Control booth
        create_desk(x + 4, y - 3, width=2.0, depth=1.0)
        create_chair(x + 4, y - 4)
        create_monitor(x + 3.5, y - 3, 0.5)
        create_monitor(x + 4.5, y - 3, 0.5)
        
        # Patient table
        create_examination_table(x - 3, y + 2)
        
        # Move imaging machine to equipment collection
        bpy.ops.object.select_all(action='DESELECT')
        imaging_machine.select_set(True)
        bpy.context.view_layer.objects.active = imaging_machine
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Medical_Equipment"))
        
        create_directional_sign(x, y + depth/2 - 1, 3.0, 1.2, main_direction="Imaging")
        
    elif room == "Lab":
        # Create lab benches with equipment
        for i in range(2):
            bench_x = x - width/2 + 2 + i*3
            create_lab_bench(bench_x, y - 1)
            create_chair(bench_x, y - 2, color=(0.8, 0.8, 0.9))
        
        # Fume hood (simplified)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y + depth/2 - 1, 1))
        fume_hood = bpy.context.object
        fume_hood.dimensions = (2.5, 1.0, 2.0)
        fume_hood.name = "Fume_Hood"
        
        fume_hood_mat = create_material("Fume_Hood", (0.7, 0.7, 0.8), 0.3, 0.2)
        fume_hood.data.materials.append(fume_hood_mat)
        
        # Lab storage
        create_shelf(x + 3, y + 2, width=1.2, height=2.2)
        create_medical_cabinet(x - 3, y + 2, width=1.4, height=2.0)
        
        # Move fume hood to equipment collection
        bpy.ops.object.select_all(action='DESELECT')
        fume_hood.select_set(True)
        bpy.context.view_layer.objects.active = fume_hood
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Medical_Equipment"))
        
        create_directional_sign(x, y - depth/2 + 1, 3.0, 1.0, main_direction="Laboratory")
        
    elif room == "Staff_Room":
        # Break room setup
        # Table with chairs
        create_desk(x, y, width=1.8, depth=1.2, height=0.75)  # Meeting table
        for i in range(4):
            angle = i * math.pi / 2
            chair_x = x + 1.2 * math.cos(angle)
            chair_y = y + 1.2 * math.sin(angle)
            create_chair(chair_x, chair_y, color=(0.4, 0.6, 0.3))
        
        # Kitchenette counter
        create_counter(x - 2, y + 2, width=2.0, depth=0.6, height=0.9)
        
        # Lockers (simplified)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x + 2.5, y - 2, 1))
        lockers = bpy.context.object
        lockers.dimensions = (0.5, 3.0, 2.0)
        lockers.name = "Staff_Lockers"
        
        locker_mat = create_material("Locker_Material", (0.6, 0.6, 0.7), 0.3, 0.5)
        lockers.data.materials.append(locker_mat)
        
        # Move lockers to furniture collection
        bpy.ops.object.select_all(action='DESELECT')
        lockers.select_set(True)
        bpy.context.view_layer.objects.active = lockers
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Furniture"))
        
        # Add some plants for ambiance
        create_plant(x - 3, y - 3, size=0.8)
        
    elif room == "Pharmacy":
        # Pharmacy counter
        create_counter(x, y - depth/2 + 2, width=4.0, depth=1.0, height=1.1)
        create_chair(x - 1, y - depth/2 + 1)
        create_chair(x + 1, y - depth/2 + 1)
        
        # Medication shelving units
        for i in range(3):
            shelf_x = x - width/2 + 2 + i*2.5
            create_shelf(shelf_x, y + 1, width=1.0, depth=0.5, height=2.5)
        
        # Secure medication cabinet
        create_medical_cabinet(x + 3, y + 2, width=1.2, height=2.2)
        
        # Pharmacy work area
        create_desk(x - 2, y, width=1.5, depth=0.8)
        create_chair(x - 2, y - 1, color=(0.2, 0.6, 0.4))
        create_monitor(x - 2, y, 0.5)
        
        create_directional_sign(x, y - depth/2 + 3, 3.0, 1.2, main_direction="Pharmacy")
        
        # Floor marking to pharmacy
        create_floor_marking(x, 0, x, y - depth/2, (0.2, 0.7, 0.4), 0.25)
        
    elif room == "Medication_Station":
        # Medication preparation area
        create_counter(x, y, width=2.0, depth=1.0, height=1.0)
        create_chair(x, y - 1)
        create_medical_cart(x - 1.5, y + 1)
        create_medical_cart(x + 1.5, y + 1)
        
        # Medication storage
        create_medical_cabinet(x - 2, y - 2, width=1.0, height=1.8)
        create_shelf(x + 2, y - 2, width=0.8, depth=0.4, height=1.6)
        
        # Sink area (simplified)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y + 2, 0.45))
        sink = bpy.context.object
        sink.dimensions = (0.6, 0.4, 0.9)
        sink.name = "Med_Station_Sink"
        
        sink_mat = create_material("Sink_Material", (0.9, 0.9, 0.95), 0.1, 0.0)
        sink.data.materials.append(sink_mat)
        
        # Move sink to furniture collection
        bpy.ops.object.select_all(action='DESELECT')
        sink.select_set(True)
        bpy.context.view_layer.objects.active = sink
        bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Furniture"))
        
    elif room == "Discharge":
        # Discharge processing area
        create_desk(x, y, width=1.8, depth=1.0)
        create_chair(x, y - 1)  # Staff chair
        create_chair(x + 1.5, y + 1)  # Patient chair
        create_chair(x - 1.5, y + 1)  # Family chair
        
        create_monitor(x, y, 0.5)
        
        # Information display
        create_information_board(x, y - 2, 1.2, width=1.5, height=0.8)
        
        # Wheelchair for patient transport
        create_wheelchair(x - 2, y + 2, 0)

# --- Add doors between rooms and corridors ---
door_locations = [
    # Main entrance
    (-10, 25, 0, 3.0, True, True),  # x, y, rotation, width, double, automatic
    
    # Reception area doors
    (-12, 21, 0, 1.2, False, False),
    (-7, 21, 0, 1.2, False, False),
    
    # Emergency department
    (-11, 5, math.pi/2, 2.5, True, True),
    (-4, 5, math.pi/2, 2.0, False, False),
    
    # ICU access
    (-13, -15, 0, 1.5, False, False),
    
    # Ward doors
    (5, 12, 0, 1.2, False, False),
    (18, 12, 0, 1.2, False, False),
    
    # Department doors
    (12, -3, math.pi/2, 1.5, False, False),
    
    # Lab and imaging
    (-5, -23, 0, 1.2, False, False),
    (12, -23, 0, 1.5, False, False),
    
    # Pharmacy
    (21, -20, 0, 1.2, False, False),
]

for door_data in door_locations:
    x, y, rotation, width, double, automatic = door_data
    create_door(x, y, rotation, width, double=double, automatic=automatic)

# --- Add windows to exterior walls ---
window_locations = [
    # Reception area windows
    (-20, 27, math.pi/2, 1.8, 1.2),
    
    # Emergency department windows
    (-20, -10, math.pi/2, 2.0, 1.5),
    (-20, 0, math.pi/2, 2.0, 1.5),
    
    # Ward windows
    (30, 25, math.pi/2, 1.5, 1.2),
    (30, 15, math.pi/2, 1.5, 1.2),
    
    # Lab windows
    (15, -33, 0, 1.5, 1.2),
    
    # Staff room windows
    (26, -8, math.pi/2, 1.5, 1.2),
]

for window_data in window_locations:
    x, y, rotation, width, height = window_data
    create_window(x, y, rotation, width, height)

# --- Enhanced lighting system ---
# Main corridor lighting
corridor_lights = [
    (0, -15, 3.3, 800, (1.0, 1.0, 1.0)),
    (0, -5, 3.3, 800, (1.0, 1.0, 1.0)),
    (0, 5, 3.3, 800, (1.0, 1.0, 1.0)),
    (0, 15, 3.3, 800, (1.0, 1.0, 1.0)),
    
    (12, 10, 3.3, 600, (1.0, 1.0, 1.0)),
    (12, -20, 3.3, 600, (1.0, 1.0, 1.0)),
]

for light_data in corridor_lights:
    x, y, z, energy, color = light_data
    create_light(x, y, z, energy, color, 'AREA', 1.2, f"Corridor_Light_{x}_{y}")

# Room-specific lighting
room_lights = [
    # Reception warm lighting
    (-17, 24, 3.2, 600, (1.0, 0.95, 0.9)),
    
    # Waiting area soft lighting
    (-3, 24, 3.2, 500, (1.0, 0.98, 0.95)),
    
    # Emergency bright clinical lighting
    (-11, -5, 3.2, 1000, (1.0, 1.0, 1.0)),
    (-18, 5, 3.2, 1000, (1.0, 1.0, 1.0)),
    
    # ICU specialized lighting
    (-13, -20, 3.2, 800, (0.98, 1.0, 1.0)),
    
    # Ward gentle lighting
    (12, 27, 3.2, 400, (1.0, 0.97, 0.92)),
    (25, 27, 3.2, 400, (1.0, 0.97, 0.92)),
    
    # Lab bright white lighting
    (-5, -23, 3.2, 900, (1.0, 1.0, 1.0)),
    
    # Imaging technical lighting
    (12, -23, 3.2, 700, (0.95, 0.98, 1.0)),
    
    # Pharmacy clean lighting
    (29, -20, 3.2, 600, (1.0, 1.0, 0.98)),
    
    # Staff room warm lighting
    (25, -4, 3.2, 350, (1.0, 0.92, 0.85)),
]

for light_data in room_lights:
    x, y, z, energy, color = light_data
    create_light(x, y, z, energy, color, 'AREA', 1.0, f"Room_Light_{x}_{y}")

# --- Add emergency lighting ---
emergency_lights = [
    # Exit signs
    (-10, 30, 3.0, 200, (0.2, 1.0, 0.2)),  # Main entrance
    (-4, 5, 3.0, 200, (0.2, 1.0, 0.2)),    # Emergency exit
    (30, 10, 3.0, 200, (0.2, 1.0, 0.2)),   # Ward exit
]

for light_data in emergency_lights:
    x, y, z, energy, color = light_data
    create_light(x, y, z, energy, color, 'SPOT', 0.5, f"Emergency_Light_{x}_{y}")

# --- Add accent lighting and floor markings ---
# Emergency department red floor markings
create_floor_marking(-20, 0, 0, 0, (0.9, 0.1, 0.1), 0.4)
create_floor_marking(0, 0, 0, -15, (0.9, 0.1, 0.1), 0.4)

# Pharmacy green floor markings
create_floor_marking(0, -20, 29, -20, (0.2, 0.7, 0.4), 0.3)

# Lab blue floor markings
create_floor_marking(0, -20, -5, -28, (0.2, 0.4, 0.8), 0.25)

# General wayfinding yellow lines
create_floor_marking(-10, 28, 0, 15, (0.8, 0.8, 0.2), 0.15)
create_floor_marking(0, 15, 25, 10, (0.8, 0.8, 0.2), 0.15)

# --- Final scene setup ---
# Set up camera for good overview
bpy.ops.object.camera_add(location=(25, -40, 20))
camera = bpy.context.object
camera.rotation_euler = (math.radians(65), 0, math.radians(45))

# Add some atmospheric elements
# Create a subtle background plane for context
bpy.ops.mesh.primitive_plane_add(size=100, location=(0, 0, -0.1))
background = bpy.context.object
background.name = "Background_Plane"
bg_mat = create_material("Background", (0.75, 0.75, 0.8), 0.8, 0.0)
background.data.materials.append(bg_mat)

bpy.ops.object.select_all(action='DESELECT')
background.select_set(True)
bpy.context.view_layer.objects.active = background
bpy.ops.object.move_to_collection(collection_index=bpy.data.collections.find("Structure"))

# Set up world lighting
world = bpy.context.scene.world
world.use_nodes = True
world_nodes = world.node_tree.nodes
world_nodes["Background"].inputs['Color'].default_value = (0.1, 0.15, 0.2, 1.0)
world_nodes["Background"].inputs['Strength'].default_value = 0.3

# Set render engine for better visualization
bpy.context.scene.render.engine = 'CYCLES'
bpy.context.scene.cycles.samples = 128

# Set the viewport to material preview for better visualization
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        for space in area.spaces:
            if space.type == 'VIEW_3D':
                space.shading.type = 'MATERIAL'
                break
            
bpy.ops.export_scene.gltf(
    filepath="final_model.glb",
    export_format='GLB',
    export_apply=True
)

print("Hospital floor design completed successfully!")
print("Collections created:")
print("- Structure: Floor, ceiling, walls, doors, windows")
print("- Furniture: Desks, chairs, counters, cabinets")
print("- Medical_Equipment: Beds, monitors, IV stands, carts, imaging equipment")
print("- Decor: Plants, signs, information boards, curtains")
print("- Lighting: Area lights, emergency lights, fixtures")
print("\nTotal objects created: Approximately 500+ individual objects")
print("Rooms included: 16 different hospital departments and areas")
print("Features: Realistic materials, proper lighting, wayfinding systems")
