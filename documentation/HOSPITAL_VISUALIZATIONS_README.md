# Hospital & ICU Data Visualizations

This repository contains comprehensive visualization dashboards for hospital and ICU data analysis, built using modern web technologies and designed to provide insights into patient care pathways and hospital operations.

## 📁 Files Overview

### Core Visualization Files

1. **`hospital_visualizations.html`** - Basic comprehensive dashboard with sample data
2. **`advanced_hospital_dashboard.html`** - Advanced real-time dashboard with enhanced features
3. **`data_processor.py`** - Python script for processing actual CSV data from MIMIC-IV dataset

### Supporting Files

- **`room-content.js`** - Room/department definitions and metadata
- **`hosp/`** - Hospital data (CSV files from MIMIC-IV)
- **`icu/`** - ICU data (CSV files from MIMIC-IV)

## 🚀 Quick Start

### Option 1: View Basic Visualizations
```bash
# Simply open in browser
open hospital_visualizations.html
```

### Option 2: View Advanced Dashboard
```bash
# Open advanced dashboard
open advanced_hospital_dashboard.html
```

### Option 3: Process Real Data
```bash
# Install Python dependencies
pip install pandas numpy matplotlib seaborn plotly

# Run data processor
python data_processor.py

# Open generated visualization_data.json in dashboard
```

## 📊 Visualization Features

### Static Visualizations
- **Patient Demographics** - Gender and age distribution charts
- **Admission Analysis** - Types, patterns, and seasonal trends
- **Length of Stay** - Analysis by department and patient type
- **Mortality Rates** - Department-wise mortality statistics
- **Diagnosis Distribution** - Top diagnosis categories
- **Resource Utilization** - Bed occupancy and equipment usage

### Dynamic Visualizations
- **Real-time Vital Signs** - Interactive time series of patient vitals
- **Patient Flow Diagram** - Animated transfers between departments
- **Lab Test Heatmap** - Activity patterns by time and day
- **ICU Occupancy** - Box plots showing stay duration distributions
- **Seasonal Patterns** - Interactive trend analysis
- **Interactive Filters** - Department, time range, and data source filters

### Advanced Features
- **Real-time Updates** - Simulated live data feeds
- **Data Quality Indicators** - Visual data quality assessments
- **Export Capabilities** - PDF, Excel, and CSV export options
- **Responsive Design** - Mobile and tablet compatible
- **Keyboard Shortcuts** - Quick navigation and actions
- **Alert System** - Real-time hospital alerts and notifications

## 🏥 Room-Based Analysis

The visualizations are organized around hospital room types and care units:

- **Emergency Department** - Triage, wait times, patient flow
- **ICU Units** - MICU, SICU, CCU, Neuro ICU occupancy and outcomes
- **Surgery Department** - Utilization, scheduling, outcomes
- **Cardiac Unit** - Specialized cardiac care metrics
- **Neurology** - Neurological care pathways
- **General Medicine** - Ward-based care analysis
- **Laboratory** - Test processing and turnaround times

## 📈 Key Metrics Tracked

### Patient Flow Metrics
- Total active patients
- Admission rates by type
- Average length of stay
- Transfer patterns between units
- Discharge destinations

### Clinical Quality Metrics
- Mortality rates by department
- Readmission rates
- Patient satisfaction scores
- Response times
- Treatment outcomes

### Operational Metrics
- Bed occupancy rates
- Staff utilization
- Equipment usage
- Lab test turnaround times
- Emergency wait times

## 🛠️ Technical Implementation

### Frontend Technologies
- **D3.js** - Advanced data visualizations and flow diagrams
- **Chart.js** - Interactive charts and graphs
- **Plotly.js** - Scientific plotting and 3D visualizations
- **CSS Grid & Flexbox** - Responsive layout system
- **Modern JavaScript (ES6+)** - Data processing and interactivity

### Data Processing
- **Python + Pandas** - CSV data processing and analysis
- **NumPy** - Numerical computations
- **Matplotlib/Seaborn** - Static chart generation
- **JSON** - Data interchange format

### Features
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Real-time Updates** - Simulated live data feeds
- **Data Export** - Multiple export formats
- **Interactive Filtering** - Dynamic data exploration
- **Performance Optimized** - Efficient rendering for large datasets

## 📊 Data Sources

### MIMIC-IV Dataset Structure
```
hosp/
├── patients.csv          # Patient demographics
├── admissions.csv        # Hospital admissions
├── transfers.csv         # Room/unit transfers
├── labevents.csv         # Laboratory test results
├── diagnoses_icd.csv     # Diagnosis codes
└── services.csv          # Clinical services

icu/
├── icustays.csv          # ICU admission details
├── chartevents.csv       # Vital signs and monitoring
├── inputevents.csv       # Medications and fluids
└── outputevents.csv      # Outputs and measurements
```

## 🎮 Interactive Controls

### Dashboard Controls
- **Department Filter** - Focus on specific hospital departments
- **Time Range Selector** - Analyze different time periods
- **Data Upload** - Load custom datasets
- **Auto-refresh Toggle** - Enable/disable real-time updates
- **Export Options** - Download data and reports

### Chart Interactions
- **Hover Tooltips** - Detailed information on data points
- **Zoom and Pan** - Explore data in detail
- **Toggle Data Series** - Show/hide specific metrics
- **Animation Controls** - Play/pause animated visualizations

### Keyboard Shortcuts
- `Ctrl + R` - Refresh dashboard
- `Ctrl + E` - Export raw data
- `Ctrl + S` - Generate report
- `Ctrl + U` - Update filters

## 📱 Mobile Responsiveness

The dashboards are fully responsive and adapt to different screen sizes:
- **Desktop** - Full dashboard with all features
- **Tablet** - Optimized layout with touch-friendly controls
- **Mobile** - Simplified view with essential metrics

## 🔧 Customization

### Adding New Visualizations
1. Define data processing function in JavaScript
2. Create chart using D3.js, Chart.js, or Plotly
3. Add to `createAllCharts()` function
4. Include in responsive resize handlers

### Modifying Room Content
Edit `room-content.js` to customize:
- Room descriptions and features
- Staff assignments
- Additional metadata

### Data Processing
Modify `data_processor.py` to:
- Add new data sources
- Create custom metrics
- Generate specialized reports

## 🎯 Use Cases

### Clinical Operations
- **Patient Flow Optimization** - Identify bottlenecks in care pathways
- **Resource Planning** - Optimize bed and staff allocation
- **Quality Improvement** - Track clinical outcomes and metrics

### Administrative Analysis
- **Capacity Management** - Monitor hospital utilization
- **Financial Planning** - Analyze cost drivers and efficiency
- **Compliance Reporting** - Generate regulatory reports

### Research Applications
- **Clinical Research** - Analyze patient populations and outcomes
- **Operational Research** - Study hospital workflow efficiency
- **Quality Research** - Investigate care quality metrics

## 🔒 Data Privacy

This visualization system is designed for:
- **De-identified Data** - No patient personal information
- **HIPAA Compliance** - Aggregated and anonymized metrics
- **Secure Processing** - Local data processing without cloud uploads

## 🚨 Alerts and Notifications

The advanced dashboard includes real-time alerts for:
- **Critical Situations** - High ICU occupancy, equipment failures
- **Operational Issues** - Extended wait times, staff shortages
- **Quality Concerns** - Unusual mortality patterns, readmission spikes

## 📊 Performance Metrics

### Data Processing Performance
- Handles datasets with 100K+ records
- Real-time updates every 30 seconds
- Responsive interactions < 100ms

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🤝 Contributing

To contribute to this project:
1. Fork the repository
2. Create feature branch
3. Add new visualizations or improvements
4. Submit pull request with documentation

## 📞 Support

For questions or issues:
- Review the code comments in HTML files
- Check browser console for error messages
- Ensure all required JavaScript libraries are loaded
- Verify data file formats match expected structure

## 🎓 Learning Resources

### Data Visualization
- [D3.js Documentation](https://d3js.org/)
- [Chart.js Documentation](https://www.chartjs.org/)
- [Plotly.js Documentation](https://plotly.com/javascript/)

### Healthcare Analytics
- [MIMIC-IV Documentation](https://mimic.mit.edu/)
- [Healthcare Data Visualization Best Practices](https://www.healthcatalyst.com/)
- [Clinical Quality Metrics](https://www.cms.gov/)

---

**Note**: This visualization system is designed for educational and research purposes. Always ensure compliance with relevant healthcare data regulations and institutional policies when working with real patient data.