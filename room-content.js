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
  waiting_area: {
    title: "Waiting Area",
    description: "This is the first stop when you enter the hospital — you’ll wait here before being called to the reception or triage.",
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
    description: "You’ll go here early in your visit if your condition needs medical attention. Nurses check how serious your case is and decide what happens next.",
    features: ["Vital sign monitors", "Assessment area", "Triage charting system"],
    staff: ["Triage nurses"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Chest pain, head injuries, abdominal pain, etc.</p>
        <p><strong>Visualization:</strong> Patient distribution by triage priority (Red, Orange, Yellow, Green, Blue)</p>
      </div>
    `
  },
  emergency: {
    title: "Emergency Department (ED)",
    description: "If your condition is urgent or life-threatening, you’ll be treated here right after triage.",
    features: ["Emergency bays", "IV and oxygen support", "Crash carts"],
    staff: ["ER doctors", "ER nurses"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Serious injuries, chest pain, fainting, severe infections</p>
        <p><strong>Visualization:</strong> Response times by urgency, patient stay durations</p>
      </div>
    `
  },
  staff_room: {
    title: "Staff Room",
    description: "You won’t go here yourself, but it’s where nurses, doctors, and other staff take breaks or prep between shifts.",
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
    description: "After you’ve been stabilized in the ER or assessed by doctors, you may be moved to a ward if you need to stay in the hospital for further treatment, observation, or recovery.",
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
    description: "After you’ve been stabilized in the ER or assessed by doctors, you may be moved to a ward if you need to stay in the hospital for further treatment, observation, or recovery.",
    features: ["Patient beds", "Vitals monitors", "Nursing station"],
    staff: ["Hospitalists", "Ward nurses"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Kidney infections, abdominal pain, chronic conditions</p>
        <p><strong>Visualization:</strong> Bed occupancy, average length of stay, daily rounding times</p>
      </div>
    `
  },
  lab: {
    title: "Laboratory (Lab)",
    description: "To get your blood, urine, or other samples tested to help doctors figure out what’s going on in your body.",
    features: ["Sample analysis machines", "Blood draw chairs"],
    staff: ["Phlebotomists", "Lab techs"],
    additionalHtml: `
      <div class="room-statistics">
        <p><strong>Helpful for:</strong> Chest pain, infection, abdominal issues, medication levels</p>
        <p><strong>Visualization:</strong> Test volume by type, average result turnaround time</p>
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
    description: "When you’re ready to leave, this area makes sure you go home with everything you need.",
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
    description: "You won’t stay here, but nurses use this as their hub to monitor patients — including you.",
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
