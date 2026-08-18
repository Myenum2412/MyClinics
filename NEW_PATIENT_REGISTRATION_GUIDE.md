# New Patient Registration — System Guide

## Overview

The new **New Patient Registration** page (`/clinic/patients/new`) is a comprehensive clinic management form designed for quick and efficient patient enrollment. The interface follows best practices for medical data capture with built-in validation and professional UX.

## Page Structure

### 1. Header
- **Back Button** — Navigate back to patient list
- **Title** — "New Patient"
- **Description** — "Register a new patient in your clinic"
- **Sticky Header** — Remains visible while scrolling

### 2. Form Sections

#### **Section 1: Patient Information**
Core patient demographics captured in a compact two-column layout.

**Fields:**
- **Full Name*** — Required
  - Patient's complete legal name
  - Minimum validation: Non-empty
- **Mobile Number*** — Required
  - Indian mobile number format (10 digits)
  - Validates: Must start with 6-9, followed by 9 digits
  - Format: Accepts with or without formatting characters
- **Email** — Optional
  - Standard email format validation
  - Stored for communication purposes
- **Gender*** — Required
  - Options: Male, Female, Other
  - Dropdown selection
- **Date of Birth*** — Required
  - Date picker control
  - Determines patient age
- **Age (Auto-calculated)** — Read-only
  - Automatically calculated from date of birth
  - Updates in real-time
- **Blood Group** — Optional
  - Dropdown options: A+, A-, B+, B-, AB+, AB-, O+, O-
  - Used for medical references
- **Height (cm)** — Optional
  - Numeric field in centimeters
- **Weight (kg)** — Optional
  - Numeric field in kilograms
- **Marital Status** — Optional
  - Dropdown: Single, Married, Divorced, Widowed
- **Occupation** — Optional
  - Free text field

#### **Section 2: Address**
Complete address information with geolocation details.

**Fields:**
- **City** — Optional
  - Locality/city name
- **State** — Optional
  - State/province name
- **Pincode** — Optional
  - Indian postal code format (6 digits)
  - Validates: Must be a valid Indian pincode (1-9 followed by 5 digits)
- **Full Address*** — Required
  - Large textarea field
  - Should include street address, building/apartment name, and landmarks
  - Essential for clinic location delivery or home visits

#### **Section 3: Emergency Contact**
Optional but recommended for every patient.

**Fields:**
- **Contact Name** — Optional
  - Name of emergency contact person
- **Relationship** — Optional
  - Relationship to patient (Spouse, Parent, Sibling, etc.)
- **Mobile Number** — Optional
  - Indian mobile number format with same validation
  - Used to contact in case of emergencies

#### **Section 4: Medical Information**
Critical medical history available to doctors for clinical decisions.

**Fields:**
- **Known Allergies** — Optional
  - Comma-separated list (e.g., "Penicillin, Nuts, Shellfish")
  - Parsed and stored as array in database
  - **Visible to:** Doctors (in patient profile and prescriptions)
- **Medical Conditions** — Optional
  - Comma-separated list (e.g., "Diabetes, Hypertension, Asthma")
  - Stored as array in database
- **Previous Surgeries / Hospitalizations** — Optional
  - Textarea for detailed history
  - Include dates and outcomes
  - Example: "Appendectomy (2015), Fracture treatment (2018)"
- **Current Medications** — Optional
  - Textarea with dosage information
  - Format: "Medication Name Dosage (frequency)"
  - Example: "Aspirin 500mg (daily), Lisinopril 10mg (daily)"

#### **Section 5: Identification**
Optional patient identification for legal and administrative purposes.

**Fields:**
- **ID Proof Type** — Optional
  - Dropdown options: Aadhar, Passport, Driving License, Pan Card, Voter ID
  - Not required unless clinic policy specifies
- **ID Number** — Optional
  - The identification number corresponding to selected type

#### **Section 6: Account & Portal Access**
Creates patient portal credentials and access settings.

**Fields:**
- **Assign Doctor*** — Required
  - Searchable dropdown of active doctors
  - Each patient must have an assigned doctor
  - Filters: Only shows active doctors (status: "active")
- **Portal Password*** — Required
  - Minimum 8 characters
  - Will be used for patient login
  - Must be set even if portal access is disabled
- **Confirm Password*** — Required
  - Must match portal password
  - Real-time validation error if mismatch
- **Portal Access** — Radio buttons
  - **Enable Access:** Patient can log into portal
  - **Disable Access:** Patient cannot access portal
  - Default: Enable
- **Send Login Details Via** — Radio buttons
  - **WhatsApp:** Credentials sent via WhatsApp to patient's mobile
  - **Email:** Credentials sent via email
  - **Do Not Send:** No automatic notification sent
  - Default: Do Not Send

**Note:** Patient receives credentials only through the selected notification method.

#### **Section 7: Insurance**
Optional insurance information for billing and claims.

**Fields:**
- **Insurance Provider** — Optional
  - Name of insurance company
- **Policy Number** — Optional
  - Insurance policy number
- **Policy Holder Name** — Optional
  - Name of person holding the policy
- **Valid Till** — Optional
  - Policy expiration date
  - Date picker control

#### **Section 8: Additional Information**
Metadata and internal clinic notes.

**Fields:**
- **Referred By** — Optional
  - Name of referring doctor or clinic
  - Helps track referral sources
- **How Did You Hear About Us?** — Optional
  - Dropdown options:
    - Family/Friends Referral
    - Google Search
    - Social Media
    - Doctor Referral
    - Walk-in
    - Other
  - Used for marketing analytics
- **Internal Notes** — Optional
  - Textarea for clinic staff notes
  - **Important:** Visible only to authorized clinic staff
  - Not visible to patients
  - Can include behavioral notes, special instructions, etc.

#### **Section 9: Attachments**
Document upload section (coming soon).

- Currently displays placeholder message
- Will support: JPG, PNG, PDF formats
- Use case: Medical reports, prescriptions, lab reports

### 3. Form Actions

#### **Reset Button**
- Clears all entered data
- Shows confirmation dialog before clearing
- Text: "Are you sure you want to clear all entered data? This cannot be undone."
- Styled: Secondary/outline button (left-aligned)

#### **Save Patient Button**
- Validates all required fields before submission
- Disabled during submission
- Shows "Saving..." state
- Styled: Primary button (right-aligned)
- Color: Blue (#0D47A1 and variations)

**Validation Order:**
1. Full name (required, non-empty)
2. Mobile number (required, valid Indian format)
3. Gender (required)
4. Date of birth (required)
5. Full address (required)
6. Doctor assignment (required)
7. Portal password (required, min 8 chars)
8. Confirm password (required, must match)
9. Email format (if provided)
10. Pincode format (if provided)
11. Emergency contact mobile (if provided)

**On Success:**
1. Patient record created in database
2. Patient ID generated automatically
3. Portal access set up if enabled
4. Doctor assigned as specified
5. Login credentials sent only if notification method selected
6. Toast success message shown
7. Redirect to patient list or patient profile page

**On Error:**
- Toast error message displayed
- User remains on form to correct issues
- Form data retained (not cleared)

---

## Styling & Theme

### Colors
- **Primary Blue:** #0D47A1 (Dark blue)
- **Light Blue:** #90CAF9 (Accent)
- **Very Light Blue:** #E3F2FD (Background)
- **Error Red:** #EF4444
- **Success Green:** #10B981
- **Borders:** #E0E7FF, #DBEAFE

### Typography
- **Heading:** Text-xl, Bold, Gray-900
- **Section Titles:** Text-base, Semibold, Gray-800
- **Labels:** Text-sm, Medium, Gray-700
- **Helper Text:** Text-xs, Gray-500
- **Error Text:** Text-sm, Red-600

### Layout
- **Max Width:** 1024px (max-w-4xl)
- **Spacing:** 6 sections × 2 columns
- **Responsive:** 
  - Mobile: 1 column
  - Tablet (md): 2 columns
  - Desktop (lg): 2-3 columns as appropriate
- **Card Style:** White background with blue border-top and subtle gradient
- **Padding:** Container padding 8 (md) / 16 (lg) px

### Interactive Elements
- **Input Fields:** Blue border (#E0E7FF), focus ring on blue (#3B82F6)
- **Error State:** Red border (#EF4444), red focus ring
- **Buttons:** Blue background, white text, hover darkens
- **Links:** Inline links with hover underline
- **Checkboxes/Radios:** Blue accent color

---

## Data Flow

### Patient Creation Process

```
User fills form → Validation → API Call
                      ↓
             (Invalid) → Show errors
                      ↓
             (Valid) → createPatient(clinicId, payload)
                      ↓
             Patient ID generated → Portal access setup
                      ↓
             Success toast → Redirect to patients list
```

### Backend API Integration

**Endpoint:** `POST /api/clinic/patients`

**Payload Structure:**
```json
{
  "fullName": "string",
  "mobile": "string (10 digits)",
  "email": "string | null",
  "gender": "male" | "female" | "other" | null",
  "dateOfBirth": "YYYY-MM-DD | null",
  "bloodGroup": "string | null",
  "address": "string | null",
  "city": "string | null",
  "pincode": "string | null",
  "allergies": ["string"],
  "notes": "string | null",
  "password": "string (min 8 chars)"
}
```

**Response:**
```json
{
  "patientId": "string",
  "doctorId": "string",
  "userId": "string",
  "fullName": "string",
  "mobile": "string",
  "email": "string | null",
  "gender": "string | null",
  "dateOfBirth": "string | null",
  "bloodGroup": "string | null",
  "address": "string | null",
  "city": "string | null",
  "pincode": "string | null",
  "allergies": ["string"],
  "notes": "string | null",
  "status": "active",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

---

## Security & Privacy

### Data Validation
- All inputs validated on client-side before submission
- Server-side validation performed again on backend
- No XSS vulnerabilities (React/Next.js sanitization)
- SQL injection prevention through ORM (MongoDB)

### Access Control
- Only clinic staff with "doctor" or "clinic_admin" role can access
- Enforced by `useRequireRole("doctor")` hook
- ClinincId scoped to logged-in user's clinic (server-side)

### Sensitive Fields
- **Passwords:** Hashed with bcryptjs on backend
- **Internal Notes:** Visible only to clinic staff (enforced server-side)
- **Medical Information:** Accessible to assigned doctor and clinic staff

### Data Storage
- All patient data stored in clinic's isolated MongoDB database
- No cross-clinic data visibility
- GDPR/privacy compliant architecture

---

## Validation Rules

### Required Fields
1. **Full Name** — Non-empty string
2. **Mobile Number** — Valid Indian format (10 digits, starts with 6-9)
3. **Gender** — One of: "male", "female", "other"
4. **Date of Birth** — Valid date (YYYY-MM-DD)
5. **Full Address** — Non-empty string
6. **Assign Doctor** — Non-empty string (valid doctorId)
7. **Portal Password** — Min 8 characters
8. **Confirm Password** — Must match Portal Password

### Optional Fields (with validation if provided)
- **Email** — Valid email format
- **Pincode** — Valid Indian pincode (6 digits)
- **Emergency Contact Mobile** — Valid Indian format if provided

### Field Constraints
- **Mobile Numbers:** 10 digits, starts with 6-9
- **Pincodes:** 6 digits, first digit 1-9
- **Passwords:** Min 8 characters
- **Age:** Auto-calculated, read-only
- **Blood Groups:** Predefined list only
- **Gender:** Predefined list only

---

## User Experience Features

### Smart UX
- **Auto-calculated Age** — Updates in real-time as DOB changes
- **Inline Validation** — Errors show per-field only when needed
- **Clear Required Indicators** — Red asterisk (*) for required fields
- **Helper Text** — Guidance for complex fields (e.g., "10-digit Indian mobile")
- **Confirm Dialogs** — Before destructive actions (Reset)
- **Loading States** — Button disabled with "Saving..." text during submission
- **Success Feedback** — Toast notifications on success/error
- **Organized Sections** — 9 logical sections, each with related fields

### Responsive Design
- **Mobile (< 768px):** Single column layout
- **Tablet (768px - 1024px):** 2 columns
- **Desktop (> 1024px):** 2 columns with optimal spacing
- **Touch-friendly:** Larger tap targets for mobile
- **Sticky Header:** Remains visible while scrolling

### Accessibility
- **ARIA Labels** — Proper semantic HTML
- **Focus States** — Clear keyboard navigation
- **Color Contrast** — WCAG AA compliant
- **Error Messages** — Clear and actionable
- **Tab Order:** Logical flow through form

---

## Troubleshooting

### Common Issues

**"Please fix the errors below" message appears**
- Check all fields marked with red asterisk (*)
- Verify Indian mobile number format (10 digits)
- Ensure passwords match exactly
- Check email format if provided

**"Failed to register patient" error**
- Check internet connection
- Verify clinic ID is correct
- Ensure assigned doctor is valid
- Try refreshing the page

**Mobile number validation fails**
- Must start with 6, 7, 8, or 9
- Must be exactly 10 digits
- Remove any formatting (spaces, dashes, +91)

**Age not calculating**
- Ensure date of birth is in past
- Use proper date format (YYYY-MM-DD)
- Check system date/time

---

## Future Enhancements

1. **Document Upload** — JPG, PNG, PDF support
2. **Duplicate Detection** — Warn if mobile/email exists
3. **Address Autocomplete** — Google Places integration
4. **Batch Import** — Import patients from CSV
5. **SMS Notifications** — OTP verification for mobile
6. **Advanced Preferences** — Clinic-specific required fields
7. **Patient History** — Link to existing patient records
8. **Multi-language** — Localization support

---

## Support & Feedback

For issues or feature requests, contact your system administrator or development team.

**Last Updated:** August 18, 2026
