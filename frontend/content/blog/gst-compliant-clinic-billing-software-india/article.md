---
Title: GST-Compliant Clinic Billing Software in India: 2026 Guide
Category: Buying Guide
Excerpt: HSN/SAC codes, GST invoice formats, UPI QR payments, TDS/TCS rules  everything Indian clinics need for compliant billing without the spreadsheet chaos.
AuthorName: Marcus Webb
AuthorInitials: MW
AuthorImg: 12
Date: Aug 23, 2026
ReadTime: 10 Min Read
---

# GST-Compliant Clinic Billing Software in India: 2026 Guide

## TL;DR

- **Healthcare services**: Exempt from GST (Notification 12/2017)  but **medicines, implants, diagnostics are taxable**
- **Your software must**: Auto-apply correct GST rate per line item, generate GST-compliant invoices, handle UPI QR, file GSTR-1 data
- **Critical codes**: Medicines HSN 3004 (12%), Implants HSN 9021 (12%), Diagnostics SAC 9993 (18%)
- **My Clinics**: Native GST engine, UPI QR on every invoice, GSTR-1 export, TDS/TCS ready

---

## The GST Reality for Indian Clinics

### What's Exempt vs Taxable (2026 Rates)

| Category | GST Rate | HSN/SAC Code | Notes |
|---|---|---|---|
| **Doctor consultation (OPD/IPD)** | **Exempt** | SAC 999311 | Human health services |
| **Surgery / procedures** | **Exempt** | SAC 999312 | Including OT, anesthesia |
| **Nursing / paramedic services** | **Exempt** | SAC 999313 | |
| **Diagnostics (lab, radiology)** | **18%** | SAC 999314 | **Taxable!** |
| **Allopathic medicines** | **12%** | HSN 3004 | Most common |
| **Ayurvedic/Unani/Homeopathic** | **12%** | HSN 3004 | |
| **Surgical implants** | **12%** | HSN 9021 | Stents, lenses, joints |
| **Medical devices (non-implant)** | **12–18%** | HSN 9018/9022 | |
| **Hospital room rent >₹5,000/day** | **5%** (no ITC) | SAC 999311 | New rule 2022 |

> **Key insight**: A single invoice mixes exempt (consultation) + taxable (medicines, tests). Your software must split automatically.

---

## GST Invoice Requirements (Rule 46 + 54)

Every B2C invoice must have:

| Field | Required? | My Clinics Auto-Fill |
|---|---|---|
| Supplier GSTIN, name, address | ✅ | Clinic profile |
| Invoice number (sequential, FY-wise) | ✅ | Auto-series |
| Invoice date | ✅ | Auto |
| Place of supply (state) | ✅ | Clinic state |
| **Patient name, address, state** | ✅ | Patient profile |
| **Patient GSTIN (if B2B/corporate)** | Conditional | Captured at registration |
| HSN/SAC code per line | ✅ | Medicine master mapped |
| Description, quantity, unit | ✅ | Auto from prescription/order |
| **Rate per unit, taxable value** | ✅ | Auto-calculated |
| **GST rate + amount (CGST/SGST/IGST)** | ✅ | Auto-split by state |
| **Total invoice value** | ✅ | Auto |
| **UPI QR code (Bharat QR)** | Mandatory >₹500 | ✅ Every invoice |
| Digital signature (if >₹50K B2B) | Conditional | Optional add-on |

---

## Place of Supply Rules (Critical for Multi-State)

| Scenario | Place of Supply | Tax Type |
|---|---|---|
| Clinic in Maharashtra, patient from Maharashtra | Maharashtra | CGST + SGST |
| Clinic in Maharashtra, patient from Gujarat | Gujarat | IGST |
| Teleconsultation: Doctor in Delhi, patient in Kerala | Kerala (patient location) | IGST |
| Medicine couriered to patient in another state | Patient's state | IGST |
| Corporate health checkup at client office (other state) | Client office state | IGST |

**My Clinics**: Auto-detects from patient address/clinic address. Teleconsult uses patient location.

---

## UPI QR / Bharat QR on Invoices (Mandatory >₹500)

Since Oct 2022: **All B2C invoices >₹500 must have dynamic UPI QR**

```
UPI QR Contains:
- Payee VPA: clinic@upi
- Amount: ₹1,234.00
- Reference: INV-2026-001234
- Merchant Category Code: 8011 (Medical)
```

**Benefits:**
- Patient scans → pays in 10 seconds → auto-reconciled
- No "payment pending" follow-ups
- Digital trail for audit

**My Clinics**: Generates dynamic QR per invoice. Integrates with Razorpay/Pine Labs/Cashfree for auto-reconciliation.

---

## TDS / TCS Implications for Clinics

### TDS (Tax Deducted at Source)  You Deduct

| Payment Type | Section | Rate | Threshold | Applies to Clinic? |
|---|---|---|---|---|
| Rent (clinic premises) | 194I | 10% | ₹2.4L/yr | ✅ If renting |
| Professional fees (visiting doctors) | 194J | 10% | ₹30K/yr | ✅ Very common |
| Contractor payments (housekeeping, security) | 194C | 1–2% | ₹30K single / ₹1L aggregate | ✅ |
| Software SaaS (My Clinics, etc.) | 194J | 10% | ₹30K/yr | ✅ Your vendor deducts |

**Software must**: Track vendor PAN, auto-calculate TDS, generate Form 16A, file 26Q.

### TCS (Tax Collected at Source)  You Collect

| Sale Type | Section | Rate | Threshold |
|---|---|---|---|
| Sale of goods (medicines, devices) | 206C(1H) | 0.1% | ₹50L/yr turnover |

**Applies if**: Your clinic pharmacy turnover >₹50L/year. Most standalone clinics exempt.

---

## GSTR-1 / GSTR-3B Filing: What Software Must Export

### GSTR-1 (Monthly/Quarterly)

| Table | Data Needed | Software Export |
|---|---|---|
| **B2B** (Corporate patients with GSTIN) | GSTIN, invoice, value, tax | ✅ CSV/JSON |
| **B2C Large** (Invoices >₹2.5L) | Invoice, value, tax | ✅ |
| **B2C Small** (Consolidated) | State-wise summary | ✅ Auto-aggregated |
| **HSN Summary** | HSN, qty, value, tax | ✅ Auto from line items |
| **Documents issued** | Invoice series, cancelled | ✅ |

### GSTR-3B (Monthly)

Auto-populated from GSTR-1. Software should give you:
- Total taxable value (exempt + taxable split)
- IGST/CGST/SGST liability
- ITC available (on rent, equipment, software)
- Net cash payable

**My Clinics**: One-click GSTR-1 JSON for offline tool / GST Suvidha Provider upload.

---

## Common GST Mistakes Clinics Make

| Mistake | Consequence | Software Fix |
|---|---|---|
| **No HSN on medicine lines** | Notice, penalty ₹10K+ | Mandatory HSN field in medicine master |
| **Wrong rate on diagnostics** | 18% vs 0% dispute | SAC 999314 hardcoded for lab/radiology |
| **Missing UPI QR >₹500** | Penalty ₹25K per invoice | Auto-generated on every invoice |
| **Wrong place of supply (teleconsult)** | IGST vs CGST/SGST mismatch | Patient location = POS for services |
| **Not reversing ITC on exempt services** | Section 17(2) reversal needed | Auto-calc: ITC only on taxable inputs |
| **Composition scheme error** | Clinics NOT eligible | Block composition  healthcare is services |
| **No invoice series per FY** | Sequencing violation | Auto-reset April 1 |

---

## Medicine Master Setup: The Foundation

Your software is only as good as your medicine master data.

| Field | Required for GST | Example |
|---|---|---|
| Medicine name | ✅ | Metformin 500mg |
| **HSN Code** | ✅ | 30049099 |
| **GST Rate** | ✅ | 12% |
| Unit (tab/vial/bottle) | ✅ | Strip of 10 |
| MRP | ✅ | ₹120 |
| Your sale rate | ✅ | ₹100 |
| Batch tracking | Recommended | B23456 |
| Expiry tracking | Recommended | 12/2027 |

**My Clinics**: Pre-loaded 5,000+ Indian medicines with HSN/GST. Import your price list via Excel.

---

## Corporate / Insurance Billing (B2B)

| Requirement | Standard B2C | Corporate/Insurance (B2B) |
|---|---|---|
| Patient GSTIN | No | **Yes (mandatory)** |
| Invoice type | B2C | **B2B** |
| E-invoicing (IRN) | No | **If >₹10Cr turnover** |
| TDS by corporate | No | **Yes, they deduct 10%** |
| Credit note for rejection | Manual | **Auto-linked to invoice** |

**Workflow**: Corporate sends employee → Clinic bills corporate → Corporate pays net of TDS → Clinic claims TDS credit in 26AS.

**My Clinics**: Corporate master with GSTIN, auto B2B invoice, credit note wizard, TDS receivable tracker.

---

## Year-End GST Checklist for Clinics

- [ ] All B2B invoices have correct GSTIN (verify on GST portal)
- [ ] HSN summary matches medicine master
- [ ] No orphan invoices (every number accounted: used/cancelled)
- [ ] UPI QR present on all invoices >₹500
- [ ] ITC claimed only on taxable inputs (rent, equipment, software)
- [ ] Exempt supply (consultations) separated in GSTR-3B Table 3.1(d)
- [ ] Credit notes for rejected claims linked to original invoices
- [ ] Advance receipts (patient deposits)  GST on receipt basis
- [ ] Doctor visiting fees  TDS deducted, Form 16A issued
- [ ] Annual return (GSTR-9) data ready from monthly exports

---

## My Clinics GST Features (Native, No Add-on)

| Feature | Included In |
|---|---|
| Auto HSN/SAC on 5,000+ medicines | All plans |
| GST-compliant invoice template (Rule 46/54) | All plans |
| Dynamic UPI QR (Bharat QR) per invoice | All plans |
| Place of supply auto-detect (inter-state) | All plans |
| CGST/SGST/IGST auto-split | All plans |
| GSTR-1 JSON export | Practice + Enterprise |
| TDS tracker (vendor/doctor payments) | Practice + Enterprise |
| Corporate B2B billing with credit notes | Practice + Enterprise |
| Advance receipt GST handling | All plans |
| E-invoice (IRN) ready | Enterprise |

---

## Pricing: GST Module in Market vs My Clinics

| Vendor | GST Module Cost |
|---|---|
| Tally + custom | ₹2,000–5,000/month |
| Practo Ray | Included (basic) |
| KareXpert | Included |
| DocPulse | ₹1,500/month extra |
| EasyClinic | Basic only |
| **My Clinics** | **Included in all plans** |

---

## Frequently Asked Questions

**Q: Are doctor consultations really GST-exempt?**
A: Yes, under Notification 12/2017-Central Tax (Rate), Sr. No. 74: "Services by way of healthcare... by a clinical establishment". But diagnostics, medicines, implants are taxable.

**Q: What if I don't charge GST on diagnostics?**
A: You're liable for 18% + interest + penalty. Department audits clinics specifically for this.

**Q: Can I use composition scheme for my clinic?**
A: No. Composition scheme (Section 10) is for **goods** suppliers turnover <₹1.5Cr. Healthcare is **services**  not eligible.

**Q: Do I need e-invoicing (IRN)?**
A: Only if aggregate turnover >₹10Cr (from FY 2024–25). Most clinics exempt. My Clinics Enterprise is IRN-ready.

**Q: How to handle patient advances/deposits?**
A: GST on **receipt basis** for advances. Issue receipt voucher with GST. Adjust against final invoice.

**Q: What about free samples / doctor gifts from pharma?**
A: No GST if genuine free sample (no consideration). But if "buy 10 get 1 free"  GST on 11 units.

**Q: Can I issue consolidated invoice for daily OPD?**
A: For B2C small (<₹2.5L), yes  state-wise daily summary allowed. But individual invoices better for patient records.

**Q: What if patient refuses to give GSTIN for corporate billing?**
A: Treat as B2C. Corporate cannot claim ITC without GSTIN on invoice.

**Q: Does My Clinics file returns for me?**
A: We export GSTR-1 JSON. You/your CA upload to GST portal or use GSP. We don't file directly (requires your DSC).

---

## Quick Reference: GST Rates Card for Clinic Reception

```
┌────────────────────────────────────────────────────────────┐
│                    GST QUICK REFERENCE                      │
├────────────────────────────────────────────────────────────┤
│ CONSULTATION / PROCEDURE / SURGERY    →  EXEMPT (0%)       │
│ DIAGNOSTICS (Lab, X-ray, MRI, ECG)    →  18% (SAC 999314)  │
│ ALLOPATHIC MEDICINES                  →  12% (HSN 3004)    │
│ AYURVEDIC / HOMEOPATHIC MEDICINES     →  12% (HSN 3004)    │
│ SURGICAL IMPLANTS (Stent, Lens, Joint)→  12% (HSN 9021)    │
│ MEDICAL DEVICES (Non-implant)         →  12–18%            │
│ ROOM RENT >₹5,000/day                 →  5% (No ITC)       │
├────────────────────────────────────────────────────────────┤
│ SAME STATE PATIENT  → CGST + SGST (6%+6% or 9%+9%)         │
│ OTHER STATE PATIENT → IGST (12% or 18%)                    │
│ TELECONSULT         → Patient's state = IGST               │
└────────────────────────────────────────────────────────────┘
```

Print this. Stick at billing counter.

---

## Final Takeaway

GST for clinics isn't optional  it's the difference between clean audits and ₹50K+ penalties. **The right software makes it invisible**: every invoice compliant, every return export ready, every payment auto-reconciled via UPI.

My Clinics builds Indian GST logic into the core  not a plugin, not an afterthought. [Try it free for 30 days](/signup) with your actual medicine master and see GSTR-1 export in action.