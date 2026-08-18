# New Patient Registration — Quick Reference for Clinic Staff

## 🏥 Quick Start

1. Go to **Patients** page
2. Click **New Patient** button (top right)
3. Fill in patient details
4. Click **Save Patient** to register

**Time to complete:** ~5-10 minutes per patient

---

## 📋 What Each Field Is For

### Section 1: Patient Information

| Field | What to Enter | Required? | Example |
|-------|--------------|-----------|---------|
| **Full Name** | Patient's complete legal name | ✅ Yes | John Doe |
| **Mobile Number** | 10-digit phone number | ✅ Yes | 9876543210 |
| **Email** | Patient's email address | ❌ No | john@email.com |
| **Gender** | Male, Female, or Other | ✅ Yes | Male |
| **Date of Birth** | Patient's birth date | ✅ Yes | 1990-05-15 |
| **Age** | Auto-calculated from DOB | 🔒 Read-only | 34 years |
| **Blood Group** | A+, A-, B+, B-, AB+, AB-, O+, or O- | ❌ No | B+ |
| **Height (cm)** | Height in centimeters | ❌ No | 170 |
| **Weight (kg)** | Weight in kilograms | ❌ No | 65 |
| **Marital Status** | Single, Married, Divorced, or Widowed | ❌ No | Married |
| **Occupation** | Patient's job or profession | ❌ No | Software Engineer |

### Section 2: Address

| Field | What to Enter | Required? | Example |
|-------|--------------|-----------|---------|
| **City** | City/town name | ❌ No | Mumbai |
| **State** | State/province name | ❌ No | Maharashtra |
| **Pincode** | 6-digit postal code | ❌ No | 400001 |
| **Full Address** | Complete street address with landmarks | ✅ Yes | 123 Main St, Apt 4B, Mumbai 400001 |

### Section 3: Emergency Contact

| Field | What to Enter | Required? | Example |
|-------|--------------|-----------|---------|
| **Contact Name** | Name of emergency person | ❌ No | Jane Doe |
| **Relationship** | How they relate to patient | ❌ No | Spouse |
| **Mobile Number** | 10-digit phone number | ❌ No | 9987654321 |

**Tip:** Get this information from the patient when they visit. Even if optional, it's very useful in emergencies.

### Section 4: Medical Information

| Field | What to Enter | Required? | Example |
|-------|--------------|-----------|---------|
| **Known Allergies** | Comma-separated allergies | ❌ No | Penicillin, Nuts, Shellfish |
| **Medical Conditions** | Comma-separated conditions | ❌ No | Diabetes, Hypertension, Asthma |
| **Previous Surgeries** | Description and dates | ❌ No | Appendectomy (2015), Knee surgery (2019) |
| **Current Medications** | Medication names and dosages | ❌ No | Aspirin 500mg daily, Lisinopril 10mg daily |

**Important:** This information is **visible to doctors** when they view the patient profile or write prescriptions. Keep it accurate and up-to-date.

### Section 5: Identification

| Field | What to Enter | Required? | Example |
|-------|--------------|-----------|---------|
| **ID Proof Type** | Aadhar, Passport, License, Pan, Voter ID | ❌ No | Aadhar |
| **ID Number** | The identification number | ❌ No | 1234-5678-9012 |

**Note:** Only required if your clinic policy mandates it.

### Section 6: Account & Portal Access

| Field | What to Enter | Required? | Example |
|-------|--------------|-----------|---------|
| **Assign Doctor** | Select patient's primary doctor | ✅ Yes | Dr. Rajesh Patel |
| **Portal Password** | At least 8 characters (secure) | ✅ Yes | SecurePass123! |
| **Confirm Password** | Repeat the password exactly | ✅ Yes | SecurePass123! |
| **Portal Access** | Enable or Disable patient login | — | Enable |
| **Send Login Details** | WhatsApp, Email, or Do Not Send | — | WhatsApp |

**Important Points:**
- Every patient needs an assigned doctor
- Password must be **exactly 8 or more characters**
- Both passwords must **match exactly**
- Login details are only sent through the method you select
- If you select "Do Not Send," the patient won't receive credentials automatically (you'll need to share them manually)

### Section 7: Insurance

| Field | What to Enter | Required? | Example |
|-------|--------------|-----------|---------|
| **Insurance Provider** | Insurance company name | ❌ No | HDFC Health Insurance |
| **Policy Number** | Policy number | ❌ No | POL-12345678 |
| **Policy Holder Name** | Name on the policy | ❌ No | John Doe |
| **Valid Till** | Policy expiration date | ❌ No | 2025-12-31 |

**Tip:** Ask patients about insurance during registration. This helps with billing later.

### Section 8: Additional Information

| Field | What to Enter | Required? | Example |
|-------|--------------|-----------|---------|
| **Referred By** | Who referred this patient? | ❌ No | Dr. Sharma Clinic |
| **How Did You Hear About Us?** | Source of information | ❌ No | Family/Friends Referral |
| **Internal Notes** | Your notes (clinic staff only) | ❌ No | Patient prefers evening appointments |

**Important:** Internal notes are **only visible to clinic staff**, not to the patient.

---

## ✅ Required Fields (Must Fill)

These fields **must** be filled before saving:

1. **Full Name** ⭐
2. **Mobile Number** ⭐
3. **Gender** ⭐
4. **Date of Birth** ⭐
5. **Full Address** ⭐
6. **Assign Doctor** ⭐
7. **Portal Password** ⭐ (min 8 characters)
8. **Confirm Password** ⭐ (must match)

**Note:** All fields with a red asterisk (*) are required. If you try to save without filling these, you'll see an error message.

---

## 🚨 Validation Rules

### Mobile Number
- Must be **10 digits**
- Must start with **6, 7, 8, or 9**
- Remove any spaces or dashes
- Example: `9876543210` ✅ | `98 7654 3210` ❌

### Pincode
- Must be **6 digits**
- First digit must be **1-9** (not 0)
- Example: `400001` ✅ | `000001` ❌

### Email
- Standard email format
- Example: `patient@email.com` ✅ | `invalidemail` ❌

### Password
- Minimum **8 characters**
- Can include letters, numbers, symbols
- Example: `MySecure123` ✅ | `Short1` ❌

### Date of Birth
- Must be in the **past**
- Age must be valid (person hasn't been born yet)

---

## 📱 Tips & Tricks

### Speed Up Registration
1. Copy phone number directly from patient ID
2. Use full address from patient record
3. Select gender from dropdown (don't type)
4. Use "Do Not Send" for login if you'll share verbally

### For Better Records
1. Always get emergency contact info (even if optional)
2. Ask about allergies carefully (life-saving info!)
3. Note any medical conditions the patient mentions
4. Add internal notes about special requests or concerns
5. Verify mobile number by calling after registration

### Common Mistakes to Avoid
- ❌ Typing mobile number with country code (+91)
- ❌ Saving with mismatched passwords
- ❌ Forgetting to assign a doctor
- ❌ Using weak passwords like "12345678"
- ❌ Leaving medical info blank when patient mentions allergies

### If Something Goes Wrong
- **Error message appears:** Read the red error text and fix that field
- **Form freezes:** Wait a few seconds (probably saving)
- **Can't find a doctor:** Refresh page or check if doctor is "active" status
- **Form clears accidentally:** Click back button in your browser

---

## 🔄 After Registration

### What Happens Next?
1. ✅ Patient ID is generated automatically
2. ✅ Patient profile is created
3. ✅ Patient added to assigned doctor's list
4. ✅ Portal access set up (if enabled)
5. ✅ Login credentials sent via selected method

### Where to Find Patient?
- Go to **Patients** page to see the new patient in the list
- Click patient name to view full profile
- Schedule appointments, view history, add notes

### If Patient Can't Login
- Check if portal access is **enabled**
- Verify the password was set correctly
- Check if login method (WhatsApp/Email) actually sent the credentials
- Reset password if patient forgets

---

## 📊 Field Visibility

### Who Sees What?

**Patient Profile (visible to doctors):**
- Name, Mobile, Email, Gender, DOB, Blood Group
- Address, City, Pincode
- Allergies, Medical Conditions
- Surgeries, Current Medications
- Insurance info

**Patient Portal (visible to patient):**
- Own appointment history
- Own medical records
- Can message doctor
- Can update own profile (if allowed)

**Internal Notes (visible ONLY to clinic staff):**
- NOT visible to patient
- Not visible to doctor (unless clinic configures)
- Use for special instructions, behavioral notes, etc.

---

## 🎯 Common Scenarios

### Scenario 1: New Walk-in Patient
```
1. Get full name, mobile, gender, DOB
2. Get address
3. Ask about allergies/medical conditions
4. Assign to available doctor
5. Set password (share verbally or via WhatsApp)
6. Save
7. Welcome them!
```

### Scenario 2: Referred Patient
```
1. Get all required info
2. Fill "Referred By" field with referring doctor/clinic name
3. Select "Doctor Referral" in "How Did You Hear"
4. Fill emergency contact info
5. Note referral in internal notes if helpful
6. Save
```

### Scenario 3: Insurance Patient
```
1. Fill all personal info normally
2. Ask for insurance details
3. Fill Section 7 (Insurance)
4. Add note in Section 8 about insurance plan
5. Keep copy of policy if needed
6. Save
```

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| **"Mobile number is not valid"** | Check it's 10 digits, starts with 6-9, no spaces |
| **"Passwords do not match"** | Make sure both password fields are identical |
| **"Full name is required"** | Enter patient's complete name |
| **"Please assign a doctor"** | Select a doctor from the dropdown |
| **"Date of birth is required"** | Pick a date using the date picker |
| **Can't see doctor in dropdown** | Refresh page, or check if doctor is "active" |
| **Form keeps saying "Saving..."** | Wait 5-10 seconds, check internet connection |
| **Age not calculating** | Make sure date of birth is in the past |

---

## 💾 Best Practices

✅ **DO:**
- Fill required fields completely
- Verify mobile number is correct
- Get emergency contact if possible
- Note any special patient preferences
- Double-check password before saving
- Take time with medical information
- Keep internal notes brief but helpful

❌ **DON'T:**
- Leave required fields empty
- Use phone numbers starting with 0-5
- Make up data you don't have
- Use generic passwords
- Rush through the form
- Forget to assign a doctor
- Put patient data in internal notes (use secure fields)

---

## 📞 Need Help?

- **Can't login?** Check clinic.admin@clinic.local
- **System issue?** Refresh page or contact IT
- **Forgot how to use this?** Refer back to this guide
- **Feature request?** Contact your system administrator

---

**For Clinic Staff Use**
**Version:** 1.0
**Updated:** August 18, 2026

*Keep this guide handy while registering patients!*
