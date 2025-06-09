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
    description: "This is the main entrance to the hospital where patients and visitors first arrive. It's designed to be welcoming and provide clear direction to different departments.",
    features: ["Information desk", "Security checkpoint", "Wheelchair access", "Visitor registration"],
    staff: ["Security personnel", "Information desk staff", "Volunteers"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> All patients and visitors entering the hospital</p>
        <p><strong>Visualization:</strong> Daily visitor counts, peak entry times, security screening efficiency</p>
      </div>
    `
  },
  waiting_area: {
    title: "Waiting Area",
    description: "This is the first stop when you enter the hospital — you'll wait here before being called to the reception or triage.",
    features: ["Digital wait time display", "Patient check-in", "Seating area", "Information screens"],
    staff: ["Reception assistants", "Volunteers"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Everyone coming in for non-emergency care</p>
        <p><strong>Visualization:</strong> Real-time waitlist size, average waiting time by hour</p>
      </div>
    `
  },
  reception: {
    title: "Reception Area",
    description: "This is where you officially start your hospital visit by sharing your information and getting checked in.",
    features: ["Patient intake forms", "Insurance verification", "Appointment scheduler"],
    staff: ["Receptionists", "Administrative coordinators"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> All patients entering the system</p>
        <p><strong>Visualization:</strong> Registration completion rate and active queue stats</p>
      </div>
    `
  },
  triage: {
    title: "Triage Station",
    description: "You'll go here early in your visit if your condition needs medical attention. Nurses check how serious your case is and decide what happens next.",
    features: ["Vital sign monitors", "Assessment area", "Triage charting system"],
    staff: ["Triage nurses"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Chest pain, head injuries, abdominal pain, etc.</p>
        <p><strong>Visualization:</strong> Patient distribution by triage priority (Red, Orange, Yellow, Green, Blue)</p>
      </div>
    `
  },
  xray: {
    title: "X-Ray Department",
    description: "This specialized imaging area uses X-ray technology to examine bones, chest, and other body parts for fractures, infections, or other conditions.",
    features: ["X-ray machines", "Lead shielding", "Image processing equipment", "Patient positioning aids"],
    staff: ["Radiologic technologists", "Radiologists"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Broken bones, chest pain, lung conditions, dental issues</p>
        <p><strong>Visualization:</strong> X-ray volume by type, average procedure time, result turnaround</p>
      </div>
    `
  },
  emergency: {
    title: "Emergency Department (ED)",
    description: "If your condition is urgent or life-threatening, you'll be treated here right after triage.",
    features: ["Emergency bays", "IV and oxygen support", "Crash carts"],
    staff: ["ER doctors", "ER nurses"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Serious injuries, chest pain, fainting, severe infections</p>
        <p><strong>Visualization:</strong> Response times by urgency, patient stay durations</p>
      </div>
    `
  },
  treatment: {
    title: "Treatment Room",
    description: "This is where you receive active medical treatment, procedures, or interventions based on your diagnosis.",
    features: ["Treatment beds", "Medical equipment", "Procedure supplies", "Monitoring devices"],
    staff: ["Nurses", "Physicians", "Medical technicians"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Wound care, minor procedures, medication administration</p>
        <p><strong>Visualization:</strong> Treatment types, procedure duration, patient outcomes</p>
      </div>
    `
  },
  cardiac: {
    title: "Cardiac Unit",
    description: "Specialized care for heart-related conditions, including monitoring, testing, and treatment for cardiac patients.",
    features: ["ECG machines", "Cardiac monitors", "Stress test equipment", "Defibrillators"],
    staff: ["Cardiologists", "Cardiac nurses", "Cardiac technicians"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Chest pain, heart attacks, arrhythmias, cardiac monitoring</p>
        <p><strong>Visualization:</strong> Cardiac case volume, procedure success rates, monitoring duration</p>
      </div>
    `
  },
  neurology: {
    title: "Neurology Department",
    description: "Specialized care for brain and nervous system conditions, including stroke care, seizures, and neurological disorders.",
    features: ["Neurological exam equipment", "EEG machines", "Brain imaging access", "Neurological monitoring"],
    staff: ["Neurologists", "Neurology nurses", "Neurodiagnostic technicians"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Head injuries, strokes, seizures, neurological symptoms</p>
        <p><strong>Visualization:</strong> Neurological case types, diagnostic accuracy, treatment outcomes</p>
      </div>
    `
  },
  lab: {
    title: "Laboratory (Lab)",
    description: "To get your blood, urine, or other samples tested to help doctors figure out what's going on in your body.",
    features: ["Sample analysis machines", "Blood draw chairs"],
    staff: ["Phlebotomists", "Lab techs"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Chest pain, infection, abdominal issues, medication levels</p>
        <p><strong>Visualization:</strong> Test volume by type, average result turnaround time</p>
      </div>
    `
  },
  urology: {
    title: "Urology Department",
    description: "Specialized care for urinary system and male reproductive health, including kidney stones, infections, and urological procedures.",
    features: ["Urological exam equipment", "Cystoscopy equipment", "Kidney stone treatment devices"],
    staff: ["Urologists", "Urology nurses", "Urological technicians"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Kidney infections, urinary problems, kidney stones, urological pain</p>
        <p><strong>Visualization:</strong> Urological case types, procedure success rates, treatment outcomes</p>
      </div>
    `
  },
  gastro: {
    title: "Gastroenterology Department",
    description: "Specialized care for digestive system conditions, including stomach, intestines, liver, and pancreas problems.",
    features: ["Endoscopy equipment", "Gastrointestinal monitors", "Digestive system imaging"],
    staff: ["Gastroenterologists", "GI nurses", "Endoscopy technicians"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Abdominal pain, digestive issues, nausea, vomiting, GI bleeding</p>
        <p><strong>Visualization:</strong> GI procedure volume, diagnostic accuracy, treatment effectiveness</p>
      </div>
    `
  },
  monitoring: {
    title: "Patient Monitoring Unit",
    description: "Specialized area for continuous patient monitoring, often used for patients who need close observation but not intensive care.",
    features: ["Continuous monitoring equipment", "Vital sign displays", "Alert systems", "Observation beds"],
    staff: ["Monitoring nurses", "Patient care technicians"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Patients requiring close observation, post-procedure monitoring</p>
        <p><strong>Visualization:</strong> Monitoring duration, alert frequency, patient outcomes</p>
      </div>
    `
  },
  icu: {
    title: "Intensive Care Unit (ICU)",
    description: "Critical care area for patients with severe, life-threatening conditions requiring constant monitoring and specialized medical attention.",
    features: ["Ventilators", "Advanced monitoring systems", "Life support equipment", "Critical care beds"],
    staff: ["Intensivists", "ICU nurses", "Respiratory therapists"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Critical patients, severe injuries, post-surgery complications</p>
        <p><strong>Visualization:</strong> ICU occupancy, length of stay, survival rates, ventilator usage</p>
      </div>
    `
  },
  staff_room: {
    title: "Staff Room",
    description: "You won't go here yourself, but it's where nurses, doctors, and other staff take breaks or prep between shifts.",
    features: ["Rest area", "Kitchenette", "Staff lockers"],
    staff: ["Nurses", "Doctors"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Keeping the care team sharp and ready</p>
        <p><strong>Visualization:</strong> Shift changes, staff presence by time</p>
      </div>
    `
  },
  medicine_ward_a: {
    title: "Medicine Ward A",
    description: "After you've been stabilized in the ER or assessed by doctors, you may be moved to a ward if you need to stay in the hospital for further treatment, observation, or recovery.",
    features: ["Patient beds", "Vitals monitors", "Nursing station"],
    staff: ["Hospitalists", "Ward nurses"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Kidney infections, abdominal pain, chronic conditions</p>
        <p><strong>Visualization:</strong> Bed occupancy, average length of stay, daily rounding times</p>
      </div>
    `
  },
  medicine_ward_b: {
    title: "Medicine Ward B",
    description: "A second general medical ward providing inpatient care for patients requiring hospital admission for medical conditions.",
    features: ["Patient beds", "Vitals monitors", "Nursing station", "Medical equipment"],
    staff: ["Hospitalists", "Ward nurses", "Medical technicians"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Medical conditions requiring hospitalization, post-treatment recovery</p>
        <p><strong>Visualization:</strong> Bed utilization, patient turnover, length of stay metrics</p>
      </div>
    `
  },
  imaging: {
    title: "Imaging (Radiology)",
    description: "If you have pain, injury, or symptoms that need a look inside your body — like broken bones, head injuries, or chest pain.",
    features: ["CT scanner", "MRI machine", "X-ray"],
    staff: ["Radiologists", "Imaging techs"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Head injury assessment, broken bones, abdominal pain</p>
        <p><strong>Visualization:</strong> Imaging types used by condition, average wait and result times</p>
      </div>
    `
  },
  department_med: {
    title: "Department MED",
    description: "This is the central department for general medical care — where your case is managed if you're not in surgery or ICU.",
    features: ["Doctor offices", "Electronic charting stations"],
    staff: ["Physicians", "Medical staff"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Chronic illnesses, infections, non-surgical recovery</p>
        <p><strong>Visualization:</strong> Case load, time from admit to diagnosis</p>
      </div>
    `
  },
  medication_station: {
    title: "Medication Station",
    description: "This is the place where nurses prepare and double-check the medication before giving it to you.",
    features: ["Prep counters", "Medication drawers"],
    staff: ["Nurses"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Safe and accurate medication delivery</p>
        <p><strong>Visualization:</strong> Prep time per dose, most common meds prepared</p>
      </div>
    `
  },
  discharge: {
    title: "Discharge Area",
    description: "When you're ready to leave, this area makes sure you go home with everything you need.",
    features: ["Discharge paperwork", "Pharmacy pickup", "Exit desk"],
    staff: ["Discharge coordinators"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> All patients finishing their hospital stay</p>
        <p><strong>Visualization:</strong> Discharge times, readmission rates, time-to-clearance</p>
      </div>
    `
  },
  diagnostic_unit: {
    title: "Diagnostic Unit",
    description: "To get detailed tests (like heart monitoring, urine tests, or special evaluations) to help doctors better understand your condition.",
    features: ["Diagnostic equipment", "Monitoring tools"],
    staff: ["Diagnostic techs"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Chest pain, infections, unexplained symptoms</p>
        <p><strong>Visualization:</strong> Test types by case, turnaround times</p>
      </div>
    `
  },
  pharmacy: {
    title: "Pharmacy",
    description: "To receive the medication prescribed to treat your condition — either while you're in the hospital or before discharge.",
    features: ["Medication storage", "Pharmacist counter"],
    staff: ["Pharmacists", "Pharmacy techs"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Pain relief, antibiotics, blood pressure meds</p>
        <p><strong>Visualization:</strong> Most prescribed drugs, time from prescription to administration</p>
      </div>
    `
  },
  nurses_station: {
    title: "Nurses Station",
    description: "You won't stay here, but nurses use this as their hub to monitor patients — including you.",
    features: ["Computer terminals", "Charts", "Alert systems"],
    staff: ["Nurses"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Every patient — nurses make it all work</p>
        <p><strong>Visualization:</strong> Nurse-to-patient ratios, alert volumes</p>
      </div>
    `
  }
};

export default roomContent;
