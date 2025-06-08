# Room Visualizations Guide

This guide explains the new room-specific visualization feature that displays relevant analytics when selecting rooms in the Interactive Hospital Room Explorer.

## Overview

When a user selects a room in the 3D hospital model, the content section now displays room information alongside a dedicated "Room Analytics" sidebar with an interactive chart that provides insights specific to that room type.

## Features

### Automatic Chart Generation
- Charts are automatically generated when a room is selected
- Each room type has a custom visualization relevant to its function
- Charts use Chart.js library for interactive, responsive displays
- Charts display in a dedicated sidebar next to room information

### Sidebar Layout
- Analytics appear in a sticky sidebar alongside room content
- Room information and charts are visible simultaneously
- Sidebar scrolls independently for long content
- Responsive layout adapts on mobile devices

### Loading Animation
- Smooth loading spinner while chart data is processed
- Professional loading experience with animation
- Error handling for failed chart loads

### Responsive Design
- Desktop: Sidebar layout with charts on the right (380px width)
- Tablet: Charts move above content for better viewing
- Mobile: Compact layout with charts prioritized at top
- Touch-friendly interactions on all devices

## Room-Specific Visualizations

### Entry Hall
**Chart Type:** Line Chart  
**Data:** Daily Patient Arrivals  
**Shows:** Patient flow patterns throughout the day (6AM to 9PM)  
**Insights:** Peak arrival times, traffic distribution

### Reception Area
**Chart Type:** Doughnut Chart  
**Data:** Registration Status  
**Shows:** Breakdown of completed, in-progress, and waiting registrations  
**Insights:** Registration efficiency, queue management

### Triage Station
**Chart Type:** Bar Chart  
**Data:** Triage Categories  
**Shows:** Distribution of patients by urgency (Red, Orange, Yellow, Green, Blue)  
**Insights:** Case severity patterns, resource allocation needs

### X-Ray Department
**Chart Type:** Bar Chart  
**Data:** Equipment Utilization  
**Shows:** Usage percentage for each X-ray machine and fluoroscopy unit  
**Insights:** Equipment efficiency, maintenance scheduling

### Emergency Department
**Chart Type:** Line Chart  
**Data:** Response Times  
**Shows:** Average response times by case urgency  
**Insights:** Performance metrics, efficiency tracking

### Treatment Rooms
**Chart Type:** Doughnut Chart  
**Data:** Room Occupancy  
**Shows:** Current status of rooms (occupied, available, cleaning)  
**Insights:** Capacity management, resource planning

### Cardiac Unit
**Chart Type:** Line Chart  
**Data:** Heart Rate Monitoring  
**Shows:** Average patient heart rates throughout the day  
**Insights:** Patient stability, monitoring trends

### Neurology Department
**Chart Type:** Radar Chart  
**Data:** Neurological Assessments  
**Shows:** Assessment scores across different neurological functions  
**Insights:** Comprehensive patient evaluation patterns

### Laboratory
**Chart Type:** Bar Chart  
**Data:** Test Volume by Type  
**Shows:** Daily volume of different test categories  
**Insights:** Lab workload, processing capacity

### Urology Department
**Chart Type:** Pie Chart  
**Data:** Procedure Types  
**Shows:** Distribution of urological procedures  
**Insights:** Service utilization, specialization patterns

### Gastroenterology
**Chart Type:** Line Chart  
**Data:** Procedure Schedule  
**Shows:** Number of procedures throughout the day  
**Insights:** Scheduling efficiency, capacity planning

### Surgery Department
**Chart Type:** Bar Chart  
**Data:** OR Utilization  
**Shows:** Hours used per operating room  
**Insights:** Surgical capacity, room efficiency

### Monitoring Unit
**Chart Type:** Line Chart  
**Data:** Vital Signs Monitoring  
**Shows:** Percentage of patients within normal ranges for each vital sign  
**Insights:** Patient stability, care quality metrics

### Discharge Area
**Chart Type:** Doughnut Chart  
**Data:** Discharge Destinations  
**Shows:** Where patients go after discharge  
**Insights:** Care continuum, discharge planning effectiveness

## Technical Implementation

### Chart Configuration
Each room has a specific chart configuration in the `roomChartConfigs` object:

```javascript
roomType: {
  type: 'chart-type',
  title: 'Chart Title',
  data: {
    labels: [...],
    datasets: [...]
  }
}
```

### Chart Creation Process
1. User selects a room
2. `updateRoomContent()` function is called
3. Sidebar layout is created with content and analytics sections
4. Visualization container is added to sidebar
5. `createRoomVisualization()` is called with delay
6. Loading spinner appears in sidebar
7. Chart is created and animated
8. Chart replaces loading spinner in sidebar

### Error Handling
- Missing canvas elements are logged as warnings
- Chart creation errors are caught and displayed
- Fallback messages for unsupported room types

## Customization

### Adding New Room Visualizations

1. **Add Chart Configuration:**
   Add a new entry to `roomChartConfigs` in `script.js`:
   ```javascript
   newRoomType: {
     type: 'bar',
     title: 'New Room Analytics',
     data: {
       labels: ['Label1', 'Label2'],
       datasets: [{
         label: 'Data Series',
         data: [10, 20],
         backgroundColor: '#color'
       }]
     }
   }
   ```

2. **Update Room Content:**
   Add visualization description to `room-content.js`:
   ```javascript
   additionalHtml: `
     <div class="room-statistics">
       <p><strong>Visualization:</strong> Description of what the chart shows</p>
     </div>
   `
   ```

### Modifying Existing Charts

1. **Change Chart Type:**
   Update the `type` property in the configuration

2. **Update Data:**
   Modify the `data.labels` and `data.datasets` arrays

3. **Customize Appearance:**
   Adjust colors in `backgroundColor` and `borderColor` properties

### Chart Types Available
- **Bar Chart:** `'bar'` - Good for comparing categories
- **Line Chart:** `'line'` - Perfect for trends over time
- **Doughnut Chart:** `'doughnut'` - Ideal for proportions
- **Pie Chart:** `'pie'` - Simple proportion display
- **Radar Chart:** `'radar'` - Multi-dimensional data

## Styling

### CSS Classes
- `.content-with-sidebar` - Main grid container for sidebar layout
- `.content-main` - Primary content area with room information
- `.content-sidebar` - Sticky sidebar container for analytics
- `.room-visualization-section` - Analytics section container
- `.visualization-container` - Chart wrapper
- `.chart-loading` - Loading state container
- `.loading-spinner` - Animated spinner

### Color Scheme
Charts use the application's color palette:
- Primary: `#4fd1c7` (Teal)
- Secondary: `#63b3ed` (Blue)
- Success: `#68d391` (Green)
- Warning: `#fbd38d` (Orange)
- Error: `#fc8181` (Red)

### Dark Theme Optimization
All charts are optimized for the dark theme with:
- White text for labels and titles
- Semi-transparent grids
- High contrast colors for accessibility

### Performance Considerations

### Chart Instances
- Charts are stored in `window.roomCharts` for potential cleanup
- Only one chart per room type is active at a time
- Previous charts are automatically destroyed when switching rooms

### Loading Optimization
- 100ms delay before chart creation to ensure DOM readiness
- Asynchronous chart creation to prevent UI blocking
- Responsive resize handling built into Chart.js
- Sticky sidebar positioning for optimal UX

### Mobile Performance
- Sidebar moves above content on smaller screens
- Reduced chart dimensions on mobile devices
- Touch-optimized interactions
- Simplified animations for better performance

## Accessibility

### Screen Readers
- Chart titles are properly labeled
- Alternative text descriptions in room content
- Semantic HTML structure maintained

### Keyboard Navigation
- Charts can be navigated using keyboard
- Focus indicators for interactive elements
- Proper tab order maintained

## Browser Compatibility

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Fallbacks
- Canvas element fallback text
- Error messages for unsupported features
- Graceful degradation for older browsers

## Data Sources

### Current Implementation
Charts use simulated data for demonstration purposes. Each chart contains realistic sample data that represents typical hospital metrics.

### Future Enhancement Opportunities
- Real-time data integration from hospital systems
- Historical data analysis and trending
- Predictive analytics and forecasting
- Integration with IoT sensors and monitoring devices

## Troubleshooting

### Common Issues

**Chart Not Displaying:**
- Check browser console for JavaScript errors
- Verify Chart.js library is loaded
- Ensure canvas element exists in DOM

**Loading Spinner Stuck:**
- Check for JavaScript errors in chart creation
- Verify chart configuration is valid
- Check network connectivity for external libraries

**Chart Display Issues:**
- Clear browser cache
- Check CSS styles for conflicts
- Verify responsive design rules

### Debug Mode
Enable debug logging by opening browser console. The system logs:
- Chart creation attempts
- Missing canvas elements
- Configuration errors
- Chart instance creation

## Future Enhancements

### Planned Features
- Interactive chart filtering and drilling down
- Export capabilities (PDF, PNG, Excel)
- Real-time data updates every 30 seconds
- Historical data comparison views
- Custom date range selection
- Multi-chart dashboard views

### Integration Possibilities
- Hospital Information Systems (HIS)
- Electronic Health Records (EHR)
- IoT sensor networks
- Staff scheduling systems
- Patient monitoring devices
- Laboratory information systems

This visualization system enhances the hospital room explorer by providing actionable insights relevant to each department, helping users understand not just the physical layout but also the operational dynamics of modern healthcare facilities.