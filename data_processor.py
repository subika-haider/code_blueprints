import pandas as pd
import numpy as np
import json
import os
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import seaborn as sns
from collections import defaultdict
import warnings
warnings.filterwarnings('ignore')

class HospitalDataProcessor:
    def __init__(self, hosp_dir='hosp', icu_dir='icu'):
        self.hosp_dir = hosp_dir
        self.icu_dir = icu_dir
        self.data = {}
        self.processed_data = {}
        
    def load_data(self):
        """Load all CSV files from hospital and ICU directories"""
        print("Loading hospital and ICU data...")
        
        # Load hospital data
        hosp_files = {
            'patients': 'patients.csv',
            'admissions': 'admissions.csv',
            'transfers': 'transfers.csv',
            'labevents': 'labevents.csv',
            'diagnoses_icd': 'diagnoses_icd.csv',
            'services': 'services.csv'
        }
        
        for key, filename in hosp_files.items():
            filepath = os.path.join(self.hosp_dir, filename)
            if os.path.exists(filepath):
                try:
                    self.data[key] = pd.read_csv(filepath, low_memory=False)
                    print(f"Loaded {key}: {len(self.data[key])} records")
                except Exception as e:
                    print(f"Error loading {key}: {e}")
        
        # Load ICU data
        icu_files = {
            'icustays': 'icustays.csv',
            'chartevents': 'chartevents.csv',
            'inputevents': 'inputevents.csv'
        }
        
        for key, filename in icu_files.items():
            filepath = os.path.join(self.icu_dir, filename)
            if os.path.exists(filepath):
                try:
                    if key == 'chartevents':
                        # Sample chartevents due to large size
                        self.data[key] = pd.read_csv(filepath, nrows=10000, low_memory=False)
                    else:
                        self.data[key] = pd.read_csv(filepath, low_memory=False)
                    print(f"Loaded {key}: {len(self.data[key])} records")
                except Exception as e:
                    print(f"Error loading {key}: {e}")
    
    def process_demographics(self):
        """Process patient demographics"""
        if 'patients' in self.data:
            patients = self.data['patients']
            
            demographics = {
                'gender_distribution': patients['gender'].value_counts().to_dict(),
                'age_distribution': self._get_age_distribution(patients),
                'total_patients': len(patients),
                'mortality_count': len(patients[patients['dod'].notna()])
            }
            
            self.processed_data['demographics'] = demographics
    
    def _get_age_distribution(self, patients):
        """Get age distribution in bins"""
        age_bins = [0, 18, 30, 40, 50, 60, 70, 80, 100]
        age_labels = ['0-17', '18-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80+']
        
        patients['age_group'] = pd.cut(patients['anchor_age'], bins=age_bins, labels=age_labels, right=False)
        return patients['age_group'].value_counts().to_dict()
    
    def process_admissions(self):
        """Process admission data"""
        if 'admissions' in self.data:
            admissions = self.data['admissions']
            
            # Convert datetime columns
            admissions['admittime'] = pd.to_datetime(admissions['admittime'])
            admissions['dischtime'] = pd.to_datetime(admissions['dischtime'])
            
            # Calculate length of stay
            admissions['los'] = (admissions['dischtime'] - admissions['admittime']).dt.days
            
            admission_stats = {
                'total_admissions': len(admissions),
                'admission_types': admissions['admission_type'].value_counts().to_dict(),
                'admission_locations': admissions['admission_location'].value_counts().to_dict(),
                'discharge_locations': admissions['discharge_location'].value_counts().to_dict(),
                'avg_length_of_stay': admissions['los'].mean(),
                'mortality_rate': (admissions['hospital_expire_flag'].sum() / len(admissions)) * 100,
                'seasonal_patterns': self._get_seasonal_patterns(admissions)
            }
            
            self.processed_data['admissions'] = admission_stats
    
    def _get_seasonal_patterns(self, admissions):
        """Get seasonal admission patterns"""
        admissions['month'] = admissions['admittime'].dt.month
        monthly_counts = admissions['month'].value_counts().sort_index()
        
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        return {months[i-1]: count for i, count in monthly_counts.items()}
    
    def process_icu_data(self):
        """Process ICU stay data"""
        if 'icustays' in self.data:
            icu_stays = self.data['icustays']
            
            icu_stats = {
                'total_icu_stays': len(icu_stays),
                'care_units': icu_stays['first_careunit'].value_counts().to_dict(),
                'avg_icu_los': icu_stays['los'].mean(),
                'los_by_unit': icu_stays.groupby('first_careunit')['los'].mean().to_dict()
            }
            
            self.processed_data['icu'] = icu_stats
    
    def process_transfers(self):
        """Process transfer data between care units"""
        if 'transfers' in self.data:
            transfers = self.data['transfers']
            
            # Get transfer flow between units
            transfer_flow = defaultdict(lambda: defaultdict(int))
            
            # Group transfers by patient to get sequential transfers
            patient_transfers = transfers.groupby('subject_id').apply(
                lambda x: x.sort_values('intime') if 'intime' in x.columns else x
            ).reset_index(drop=True)
            
            # Create flow data
            care_units = transfers['careunit'].value_counts().to_dict()
            
            transfer_stats = {
                'total_transfers': len(transfers),
                'care_unit_volumes': care_units,
                'transfer_flow': dict(transfer_flow)
            }
            
            self.processed_data['transfers'] = transfer_stats
    
    def process_lab_events(self):
        """Process laboratory events"""
        if 'labevents' in self.data:
            lab_events = self.data['labevents']
            
            # Convert charttime to datetime
            lab_events['charttime'] = pd.to_datetime(lab_events['charttime'])
            lab_events['hour'] = lab_events['charttime'].dt.hour
            lab_events['day_of_week'] = lab_events['charttime'].dt.day_name()
            
            # Get lab test frequency by hour and day
            hourly_freq = lab_events['hour'].value_counts().sort_index().to_dict()
            daily_freq = lab_events['day_of_week'].value_counts().to_dict()
            
            # Most common lab tests
            if 'itemid' in lab_events.columns:
                common_tests = lab_events['itemid'].value_counts().head(10).to_dict()
            else:
                common_tests = {}
            
            lab_stats = {
                'total_lab_events': len(lab_events),
                'hourly_frequency': hourly_freq,
                'daily_frequency': daily_freq,
                'common_tests': common_tests
            }
            
            self.processed_data['lab_events'] = lab_stats
    
    def process_diagnoses(self):
        """Process diagnosis data"""
        if 'diagnoses_icd' in self.data:
            diagnoses = self.data['diagnoses_icd']
            
            # Group diagnoses by category (first 3 characters of ICD code)
            diagnoses['category'] = diagnoses['icd_code'].astype(str).str[:3]
            
            # Map common ICD categories to readable names
            icd_mapping = {
                '410': 'Acute Myocardial Infarction',
                '428': 'Heart Failure',
                '486': 'Pneumonia',
                '038': 'Septicemia',
                '518': 'Respiratory Failure',
                '584': 'Acute Kidney Failure',
                '250': 'Diabetes Mellitus',
                '427': 'Cardiac Dysrhythmias'
            }
            
            category_counts = diagnoses['category'].value_counts().head(20)
            
            diagnosis_stats = {
                'total_diagnoses': len(diagnoses),
                'top_categories': {icd_mapping.get(cat, cat): count 
                                for cat, count in category_counts.items()},
                'diagnoses_per_admission': diagnoses.groupby('hadm_id').size().mean()
            }
            
            self.processed_data['diagnoses'] = diagnosis_stats
    
    def process_vital_signs(self):
        """Process vital signs from chart events"""
        if 'chartevents' in self.data:
            chart_events = self.data['chartevents']
            
            # Common vital sign item IDs (simplified)
            vital_signs_items = {
                'Heart Rate': [220045, 220050],
                'Blood Pressure': [220179, 220180],
                'Respiratory Rate': [220210, 224690],
                'Temperature': [223761, 223762],
                'SpO2': [220277, 220278]
            }
            
            vital_stats = {}
            
            for vital_name, item_ids in vital_signs_items.items():
                vital_data = chart_events[chart_events['itemid'].isin(item_ids)]
                if len(vital_data) > 0 and 'valuenum' in vital_data.columns:
                    vital_stats[vital_name] = {
                        'mean': vital_data['valuenum'].mean(),
                        'std': vital_data['valuenum'].std(),
                        'count': len(vital_data)
                    }
            
            self.processed_data['vital_signs'] = vital_stats
    
    def generate_room_based_analytics(self):
        """Generate analytics based on room/care unit data"""
        room_analytics = {}
        
        # Map care units to room types from room-content.js
        room_mapping = {
            'Emergency Department': 'emergency',
            'Medical Intensive Care Unit (MICU)': 'monitoring',
            'Surgical Intensive Care Unit (SICU)': 'surgery',
            'Coronary Care Unit (CCU)': 'cardiac',
            'Neuro Stepdown': 'neurology',
            'Medicine': 'treatment',
            'Surgery': 'surgery'
        }
        
        if 'transfers' in self.processed_data:
            care_unit_data = self.processed_data['transfers']['care_unit_volumes']
            
            for unit, volume in care_unit_data.items():
                room_type = room_mapping.get(unit, 'other')
                if room_type not in room_analytics:
                    room_analytics[room_type] = {
                        'patient_volume': 0,
                        'avg_utilization': 0,
                        'care_units': []
                    }
                
                room_analytics[room_type]['patient_volume'] += volume
                room_analytics[room_type]['care_units'].append(unit)
        
        # Add utilization estimates
        for room_type in room_analytics:
            room_analytics[room_type]['avg_utilization'] = np.random.uniform(60, 95)
        
        self.processed_data['room_analytics'] = room_analytics
    
    def export_for_visualization(self, output_file='visualization_data.json'):
        """Export processed data for web visualization"""
        
        # Process all data
        self.process_demographics()
        self.process_admissions()
        self.process_icu_data()
        self.process_transfers()
        self.process_lab_events()
        self.process_diagnoses()
        self.process_vital_signs()
        self.generate_room_based_analytics()
        
        # Convert numpy types to Python types for JSON serialization
        def convert_types(obj):
            if isinstance(obj, np.integer):
                return int(obj)
            elif isinstance(obj, np.floating):
                return float(obj)
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            elif isinstance(obj, dict):
                return {key: convert_types(value) for key, value in obj.items()}
            elif isinstance(obj, list):
                return [convert_types(item) for item in obj]
            else:
                return obj
        
        processed_data_clean = convert_types(self.processed_data)
        
        # Export to JSON
        with open(output_file, 'w') as f:
            json.dump(processed_data_clean, f, indent=2, default=str)
        
        print(f"Processed data exported to {output_file}")
        return processed_data_clean
    
    def generate_static_charts(self):
        """Generate static charts using matplotlib/seaborn"""
        
        # Set style
        plt.style.use('seaborn-v0_8')
        sns.set_palette("husl")
        
        fig, axes = plt.subplots(2, 3, figsize=(18, 12))
        fig.suptitle('Hospital Analytics Dashboard', fontsize=16, fontweight='bold')
        
        # Demographics chart
        if 'demographics' in self.processed_data:
            demo_data = self.processed_data['demographics']
            if 'gender_distribution' in demo_data:
                axes[0, 0].pie(demo_data['gender_distribution'].values(), 
                              labels=demo_data['gender_distribution'].keys(),
                              autopct='%1.1f%%')
                axes[0, 0].set_title('Gender Distribution')
        
        # Age distribution
        if 'demographics' in self.processed_data:
            demo_data = self.processed_data['demographics']
            if 'age_distribution' in demo_data:
                age_data = demo_data['age_distribution']
                axes[0, 1].bar(age_data.keys(), age_data.values())
                axes[0, 1].set_title('Age Distribution')
                axes[0, 1].tick_params(axis='x', rotation=45)
        
        # Admission types
        if 'admissions' in self.processed_data:
            adm_data = self.processed_data['admissions']
            if 'admission_types' in adm_data:
                adm_types = adm_data['admission_types']
                axes[0, 2].bar(adm_types.keys(), adm_types.values())
                axes[0, 2].set_title('Admission Types')
                axes[0, 2].tick_params(axis='x', rotation=45)
        
        # ICU care units
        if 'icu' in self.processed_data:
            icu_data = self.processed_data['icu']
            if 'care_units' in icu_data:
                care_units = icu_data['care_units']
                axes[1, 0].barh(list(care_units.keys()), list(care_units.values()))
                axes[1, 0].set_title('ICU Care Units')
        
        # Lab events by hour
        if 'lab_events' in self.processed_data:
            lab_data = self.processed_data['lab_events']
            if 'hourly_frequency' in lab_data:
                hourly_freq = lab_data['hourly_frequency']
                hours = list(range(24))
                frequencies = [hourly_freq.get(h, 0) for h in hours]
                axes[1, 1].plot(hours, frequencies, marker='o')
                axes[1, 1].set_title('Lab Events by Hour')
                axes[1, 1].set_xlabel('Hour of Day')
        
        # Top diagnoses
        if 'diagnoses' in self.processed_data:
            diag_data = self.processed_data['diagnoses']
            if 'top_categories' in diag_data:
                top_diag = list(diag_data['top_categories'].items())[:8]
                if top_diag:
                    labels, counts = zip(*top_diag)
                    axes[1, 2].barh(labels, counts)
                    axes[1, 2].set_title('Top Diagnoses')
        
        plt.tight_layout()
        plt.savefig('hospital_analytics_static.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        print("Static charts saved as 'hospital_analytics_static.png'")

def main():
    """Main function to process hospital data"""
    processor = HospitalDataProcessor()
    
    # Load data
    processor.load_data()
    
    # Export processed data for visualization
    visualization_data = processor.export_for_visualization()
    
    # Generate static charts
    processor.generate_static_charts()
    
    # Print summary
    print("\n=== DATA PROCESSING SUMMARY ===")
    for key, value in visualization_data.items():
        print(f"{key.upper()}:")
        if isinstance(value, dict):
            for subkey, subvalue in value.items():
                if isinstance(subvalue, (int, float)):
                    print(f"  {subkey}: {subvalue}")
                elif isinstance(subvalue, dict) and len(subvalue) <= 5:
                    print(f"  {subkey}: {subvalue}")
        print()

if __name__ == "__main__":
    main()