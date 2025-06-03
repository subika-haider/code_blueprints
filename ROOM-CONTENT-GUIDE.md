# Hospital Room Content Customization Guide

This guide explains how to customize the content that appears in the room information panels of the Interactive Hospital Room Explorer.

## Overview

When a user selects a room in the 3D model, an information panel appears showing details about that room. All of this content is defined in the `room-content.js` file, which you can easily modify without touching the main application code.

## File Location

The content definitions are stored in:
```
code_blueprints/room-content.js
```

## Content Structure

Each room type has its own entry in the `roomContent` object with the following properties:

- `title`: The name/heading of the room shown in the panel
- `description`: A brief description of the room's purpose
- `features`: Array of features/equipment in the room
- `staff`: Array of staff typically present in this room
- `additionalHtml`: Optional custom HTML to add to the room panel

## Example Room Definition

```javascript
entry: {
  title: "Hospital Entry",
  description: "The main entrance where patients first arrive...",
  features: ["Wheelchair access", "Information desk", "Digital check-in kiosks"],
  staff: ["Reception staff", "Security personnel", "Volunteer guides"],
  additionalHtml: `
    <div class="room-statistics">
      <p><strong>Average wait time:</strong> 5-10 minutes</p>
      <p><strong>Daily visitors:</strong> 250-300</p>
    </div>
  `
}
```

## How to Modify Content

1. Open `room-content.js` in your code editor
2. Find the room type you want to modify (e.g., `entry`, `surgery`, `lab`)
3. Edit the text values for title, description, or add/remove items from the features and staff arrays
4. To add custom HTML content, use the `additionalHtml` property

## Available Room Types

- `entry`: Hospital entrance
- `reception`: Reception desk area
- `triage`: Initial patient assessment area
- `xray`: X-Ray department
- `emergency`: Emergency department
- `treatment`: General treatment rooms
- `cardiac`: Cardiac unit
- `neurology`: Neurology department
- `lab`: Laboratory
- `urology`: Urology department
- `gastro`: Gastroenterology department
- `surgery`: Surgery department
- `monitoring`: Patient monitoring unit
- `discharge`: Discharge processing area

## Custom HTML Content

You can add any custom HTML in the `additionalHtml` property. Some helpful CSS classes are available:

- `room-statistics`: For displaying statistical information
- `custom-list`: For styled lists
- You can also create your own custom styled elements

## Example Custom HTML

```html
<div class="room-statistics">
  <p><strong>Equipment:</strong> 3 X-ray machines, 1 fluoroscopy unit</p>
  <p><strong>Average procedure time:</strong> 15-30 minutes</p>
</div>

<div class="custom-content">
  <h4>Triage Categories:</h4>
  <ul class="custom-list">
    <li>Red - Immediate (0 minutes)</li>
    <li>Orange - Very Urgent (10 minutes)</li>
    <li>Yellow - Urgent (60 minutes)</li>
  </ul>
</div>
```

## Adding New Room Types

If you want to add completely new room types:

1. Add the new room type to the `roomsByType` object in `script.js`
2. Define the room's position in the 3D model
3. Add the content for the new room in `room-content.js`
4. Add the room to the appropriate patient journey sequence

## Best Practices

- Keep descriptions concise and informative
- Use consistent terminology across different rooms
- For lists (features, staff), aim for 3-5 items for best readability
- Test your changes by viewing each room after modification