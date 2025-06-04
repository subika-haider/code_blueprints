#!/usr/bin/env python3
"""
Hospital Visualizations Runner Script
====================================

This script provides an easy way to run the hospital data visualizations
with different options for data processing and visualization.

Usage:
    python run_visualizations.py [options]

Options:
    --process-data    Process CSV data and generate visualization_data.json
    --open-basic      Open basic hospital visualizations
    --open-advanced   Open advanced dashboard
    --generate-sample Generate sample data for testing
    --help           Show this help message

Requirements:
    - Python 3.6+
    - pandas, numpy, matplotlib, seaborn (for data processing)
    - Modern web browser (for visualizations)
"""

import os
import sys
import json
import webbrowser
import argparse
from pathlib import Path

def check_dependencies():
    """Check if required Python packages are installed."""
    required_packages = ['pandas', 'numpy', 'matplotlib', 'seaborn']
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"❌ Missing required packages: {', '.join(missing_packages)}")
        print("📦 Install with: pip install " + " ".join(missing_packages))
        return False
    
    print("✅ All required packages are installed")
    return True

def process_hospital_data():
    """Process hospital data using the data processor."""
    print("🏥 Processing hospital data...")
    
    try:
        from data_processor import HospitalDataProcessor
        
        processor = HospitalDataProcessor()
        processor.load_data()
        visualization_data = processor.export_for_visualization()
        processor.generate_static_charts()
        
        print("✅ Data processing completed successfully!")
        print("📊 Generated files:")
        print("   - visualization_data.json")
        print("   - hospital_analytics_static.png")
        
        return True
    except Exception as e:
        print(f"❌ Error processing data: {e}")
        return False

def generate_sample_data():
    """Generate sample data for testing."""
    print("🔧 Generating sample data...")
    
    sample_data = {
        "demographics": {
            "gender_distribution": {"M": 1250, "F": 1250},
            "age_distribution": {
                "18-29": 200, "30-39": 300, "40-49": 400,
                "50-59": 500, "60-69": 600, "70-79": 500, "80+": 400
            },
            "total_patients": 2500,
            "mortality_count": 125
        },
        "admissions": {
            "total_admissions": 3000,
            "admission_types": {
                "URGENT": 1500, "ELECTIVE": 800, "EMERGENCY": 600, "NEWBORN": 100
            },
            "avg_length_of_stay": 5.2,
            "mortality_rate": 4.2
        },
        "icu": {
            "total_icu_stays": 800,
            "care_units": {
                "MICU": 250, "SICU": 200, "CCU": 150, "CVICU": 100, "Neuro ICU": 100
            },
            "avg_icu_los": 3.8
        }
    }
    
    try:
        with open('sample_visualization_data.json', 'w') as f:
            json.dump(sample_data, f, indent=2)
        
        print("✅ Sample data generated: sample_visualization_data.json")
        return True
    except Exception as e:
        print(f"❌ Error generating sample data: {e}")
        return False

def open_visualization(file_name):
    """Open visualization file in default browser."""
    file_path = Path(file_name)
    
    if not file_path.exists():
        print(f"❌ File not found: {file_name}")
        return False
    
    try:
        # Convert to absolute path for browser
        abs_path = file_path.resolve()
        url = f"file://{abs_path}"
        
        print(f"🌐 Opening {file_name} in browser...")
        webbrowser.open(url)
        print("✅ Visualization opened successfully!")
        return True
    except Exception as e:
        print(f"❌ Error opening visualization: {e}")
        return False

def main():
    """Main function to handle command line arguments."""
    parser = argparse.ArgumentParser(
        description="Hospital Visualizations Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python run_visualizations.py --process-data
    python run_visualizations.py --open-basic
    python run_visualizations.py --open-advanced
    python run_visualizations.py --generate-sample
        """
    )
    
    parser.add_argument('--process-data', action='store_true',
                       help='Process CSV data and generate visualization_data.json')
    parser.add_argument('--open-basic', action='store_true',
                       help='Open basic hospital visualizations')
    parser.add_argument('--open-advanced', action='store_true',
                       help='Open advanced dashboard')
    parser.add_argument('--generate-sample', action='store_true',
                       help='Generate sample data for testing')
    parser.add_argument('--check-deps', action='store_true',
                       help='Check if required dependencies are installed')
    
    args = parser.parse_args()
    
    # Show help if no arguments provided
    if len(sys.argv) == 1:
        parser.print_help()
        return
    
    print("🏥 Hospital Visualizations Runner")
    print("=" * 40)
    
    success = True
    
    if args.check_deps:
        success &= check_dependencies()
    
    if args.generate_sample:
        success &= generate_sample_data()
    
    if args.process_data:
        if check_dependencies():
            success &= process_hospital_data()
        else:
            success = False
    
    if args.open_basic:
        success &= open_visualization('hospital_visualizations.html')
    
    if args.open_advanced:
        success &= open_visualization('advanced_hospital_dashboard.html')
    
    if success:
        print("\n🎉 All operations completed successfully!")
    else:
        print("\n⚠️  Some operations failed. Please check the output above.")
        sys.exit(1)

if __name__ == "__main__":
    main()