/**
 * Room Content Data for the Hospital Room Explorer
 * 
 * This file contains all the content that appears in the room information panels.
 * You can easily modify this data without changing the main application code.
 * 
 * For each room type, you can customize:
 * - title: The name/heading of the room shown in the panel
 * - description: A brief description of the room's purpose
 * - features: Array of features/equipment in the room
 * - staff: Array of staff typically present in this room
 * - additionalHtml: Optional custom HTML to add to the room panel
 */

const roomContent = {
  entry: {
    title: "Hospital Entry",
    description: "The main entrance where patients first arrive. This area includes registration desks, waiting areas, and initial triage assessment for urgent cases.",
    features: ["Wheelchair access", "Information desk", "Digital check-in kiosks", "Visitor badges"],
    staff: ["Reception staff", "Security personnel", "Volunteer guides"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Average wait time:</strong> 5-10 minutes</p>
        <p><strong>Daily visitors:</strong> 250-300</p>
        <p><strong>Visualization:</strong> Real-time patient arrival patterns throughout the day</p>
      </div>
    `
  },
  reception: {
    title: "Reception Area",
    description: "Administrative hub where patients register, provide insurance information, and receive initial directions for their care pathway.",
    features: ["Patient registration system", "Electronic health record access", "Queue management displays", "Multilingual services"],
    staff: ["Administrative staff", "Patient coordinators", "Financial counselors"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Key functions:</strong> Patient registration, insurance verification, appointment scheduling</p>
        <p><strong>Visualization:</strong> Registration status breakdown and completion rates</p>
      </div>
    `
  },
  triage: {
    title: "Triage Station",
    description: "Where patients are assessed to determine the urgency of their condition and prioritize treatment accordingly.",
    features: ["Vital signs monitoring", "Priority coding system", "Rapid assessment protocols", "Isolation capability"],
    staff: ["Triage nurses", "Physician assistants", "Emergency medical technicians"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Triage categories:</strong></p>
        <ul class="custom-list">
          <li>Red - Immediate (0 minutes)</li>
          <li>Orange - Very Urgent (10 minutes)</li>
          <li>Yellow - Urgent (60 minutes)</li>
          <li>Green - Standard (120 minutes)</li>
          <li>Blue - Non-Urgent (240 minutes)</li>
        </ul>
        <p><strong>Visualization:</strong> Current distribution of patients by triage priority</p>
      </div>
    `
  },
  xray: {
    title: "X-Ray Department",
    description: "Diagnostic imaging area for identifying bone fractures, lung conditions, and other internal issues visible through radiography.",
    features: ["Digital radiography systems", "PACS integration", "Lead-lined rooms", "Radiation safety protocols"],
    staff: ["Radiologic technologists", "Radiologists", "Imaging specialists"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Equipment:</strong> 3 X-ray machines, 1 fluoroscopy unit</p>
        <p><strong>Average procedure time:</strong> 15-30 minutes</p>
        <p><strong>Visualization:</strong> Real-time equipment utilization rates</p>
      </div>
    `
  },
  emergency: {
    title: "Emergency Department",
    description: "Equipped for immediate treatment of acute and life-threatening conditions, available 24/7.",
    features: ["Trauma bays", "Cardiac monitoring", "Resuscitation equipment", "Rapid response systems"],
    staff: ["Emergency physicians", "ER nurses", "Trauma specialists", "Respiratory therapists"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Capacity:</strong> 20 beds, 4 trauma bays</p>
        <p><strong>Response time for critical cases:</strong> Under 2 minutes</p>
        <p><strong>Visualization:</strong> Average response times by case urgency level</p>
      </div>
    `
  },
  treatment: {
    title: "Treatment Room",
    description: "Where procedures, examinations, and treatments are performed for non-critical patients.",
    features: ["Procedure tables", "Medical supply carts", "Medication dispensing", "Sterile field setup"],
    staff: ["Attending physicians", "Nurses", "Medical assistants", "Specialists as needed"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Common procedures:</strong> Wound care, IV therapy, minor surgeries</p>
        <p><strong>Visualization:</strong> Current room occupancy status</p>
      </div>
    `
  },
  cardiac: {
    title: "Cardiac Unit",
    description: "Specialized area for diagnosis and treatment of heart conditions with continuous monitoring.",
    features: ["ECG monitoring", "Defibrillators", "Cardiac catheterization", "Telemetry systems"],
    staff: ["Cardiologists", "Cardiac nurses", "Cardiac technicians", "Cardiopulmonary specialists"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Common conditions treated:</strong> Heart attack, arrhythmia, heart failure</p>
        <p><strong>Average stay:</strong> 3-5 days</p>
        <p><strong>Visualization:</strong> Continuous heart rate monitoring trends</p>
      </div>
    `
  },
  neurology: {
    title: "Neurology Department",
    description: "Focused on disorders of the nervous system, including brain and spinal cord conditions.",
    features: ["Neuroimaging equipment", "EEG monitoring", "Reflex testing stations", "Cognitive assessment tools"],
    staff: ["Neurologists", "Neurosurgeons", "Neuro nurses", "Neuropsychologists"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Common conditions treated:</strong> Stroke, seizures, headache disorders, nerve damage</p>
        <p><strong>Visualization:</strong> Neurological assessment scores by category</p>
      </div>
    `
  },
  lab: {
    title: "Laboratory",
    description: "Where blood samples and other specimens are analyzed to aid in diagnosis and treatment planning.",
    features: ["Automated analyzers", "Centrifuges", "Microscopy stations", "Specimen storage"],
    staff: ["Medical laboratory scientists", "Phlebotomists", "Lab technicians", "Pathologists"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Tests performed daily:</strong> 500-800</p>
        <p><strong>Turnaround time:</strong> 1-3 hours for routine tests</p>
        <p><strong>Visualization:</strong> Daily test volume breakdown by test type</p>
      </div>
    `
  },
  urology: {
    title: "Urology Department",
    description: "Specializes in the urinary tract system and male reproductive health issues.",
    features: ["Cystoscopy equipment", "Urodynamic testing", "Lithotripsy units", "Specialized imaging"],
    staff: ["Urologists", "Urology nurses", "Urologic technologists"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Common conditions treated:</strong> Kidney stones, UTIs, prostate issues</p>
        <p><strong>Visualization:</strong> Distribution of urological procedures</p>
      </div>
    `
  },
  gastro: {
    title: "Gastroenterology",
    description: "Focused on digestive system disorders affecting the esophagus, stomach, intestines, liver, and pancreas.",
    features: ["Endoscopy equipment", "Manometry systems", "Breath testing units", "Specimen collection"],
    staff: ["Gastroenterologists", "GI nurses", "Endoscopy technicians", "Nutritionists"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Common procedures:</strong> Endoscopy, colonoscopy, ERCP</p>
        <p><strong>Average procedure time:</strong> 30-60 minutes</p>
        <p><strong>Visualization:</strong> Daily procedure scheduling timeline</p>
      </div>
    `
  },
  surgery: {
    title: "Surgery Department",
    description: "Operating theaters and preparation areas for scheduled and emergency surgical procedures.",
    features: ["Operating tables", "Anesthesia equipment", "Surgical instruments", "Sterilization systems"],
    staff: ["Surgeons", "Anesthesiologists", "Surgical nurses", "Surgical technologists"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Operating rooms:</strong> 8 standard, 2 specialized</p>
        <p><strong>Average procedures per day:</strong> 25-30</p>
        <p><strong>Visualization:</strong> Operating room utilization by hours</p>
      </div>
    `
  },
  monitoring: {
    title: "Monitoring Unit",
    description: "Where patients are observed after procedures or during recovery to ensure stability and detect complications.",
    features: ["Continuous vital monitoring", "Nurse call systems", "Medication delivery", "Critical alert protocols"],
    staff: ["Monitoring nurses", "Hospitalists", "Patient care technicians", "Respiratory therapists"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Patient capacity:</strong> 15 beds</p>
        <p><strong>Nurse-to-patient ratio:</strong> 1:3</p>
        <p><strong>Visualization:</strong> Vital signs monitoring performance metrics</p>
      </div>
    `
  },
  discharge: {
    title: "Discharge Area",
    description: "Where patients receive final instructions, prescriptions, and follow-up appointments before leaving the hospital.",
    features: ["Discharge instruction systems", "Prescription printers", "Follow-up scheduling", "Transportation coordination"],
    staff: ["Discharge planners", "Care coordinators", "Social workers", "Pharmacy staff"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Average discharge time:</strong> 30-45 minutes</p>
        <p><strong>Patients discharged daily:</strong> 40-60</p>
        <p><strong>Visualization:</strong> Discharge destination distribution analysis</p>
      </div>
    `
  }
};

export default roomContent;