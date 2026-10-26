# Kazo Technical School — Staff Dashboard Handover Guide

This guide is written in plain English for the leadership and administrative staff of **Kazo Technical School (KTS)**. It explains how to own, back up, protect, and manage the Staff Dashboard day to day.

---

## 1. Account Ownership (Keep the School in Control)

The dashboard relies on three free online services. **All three accounts must belong to an official Kazo Technical School email address** (for example, `info@theweldingschool-ug.com` or `admin@theweldingschool-ug.com`) — never a personal or contractor email:

1. **GitHub** (stores the software code)
2. **Supabase** (stores the database of students, fees, lessons, and inventory, and handles staff sign-in)
3. **Netlify** (hosts the live website on the internet)

### Ownership Checklist for School Leadership
- Register or transfer the **GitHub**, **Supabase**, and **Netlify** accounts under the school's official email address.
- Store the master passwords and two-factor authentication (2FA) recovery codes in a secure place accessible to the School Director / Administrator.
- Invite your software builder/developer as a **collaborator** (rather than the owner) so they can help with updates while the school retains full legal and technical ownership.

---

## 2. Monthly Backup Routine

Even though Supabase backs up the cloud database automatically, the school should keep its own independent monthly copies.

### Step A: Monthly CSV Spreadsheet Download (5 Minutes)
On the **1st working day of every month**:
1. Sign in as an **Administrator** and go to **Home** (`/admin`).
2. Scroll to the **CSV Exports (Admin Only)** section at the bottom of the page.
3. Click each button to download the 11 CSV spreadsheets:
   - `Students & Fee Balances CSV`
   - `Payments Ledger CSV`
   - `Applications CSV`
   - `KTS 18-Module Syllabus CSV`
   - `Lesson Logs CSV`
   - `Consumables Stock CSV`
   - `Stock Movements CSV`
   - `Equipment Register CSV`
   - `Equipment Faults CSV`
   - `Staff Accounts CSV`
   - `Intakes CSV`
4. Save the downloaded `.csv` files into a dated folder (e.g., `KTS-Backups/2026-11/`) on the school's Google Drive / OneDrive **and** on an office backup flash drive. These files open directly in Microsoft Excel or Google Sheets.

### Step B: Supabase Database Export
1. Sign in to the school's **Supabase Dashboard**.
2. Go to **Database → Backups** (or use the SQL/Table export tool) to download a full database snapshot before closing an intake at the end of a semester.

---

## 3. Data Protection & Privacy (Uganda Data Protection and Privacy Act)

> **Important Notice (Not Legal Advice):** Kazo Technical School collects personal information about applicants, students, their next of kin, and staff. Under **Uganda's Data Protection and Privacy Act, 2019**, the school is the **Data Controller** and is responsible for keeping this personal data accurate, secure, and restricted only to authorized staff. Please confirm your school's registration, privacy notice, and retention policies with qualified legal or compliance counsel in Uganda.

### What Personal Data Is Stored
- **Applicants & Students:** Full name, phone number, email (optional), date of birth, village/town location, highest education level, prior welding experience, how they heard about KTS, assigned welding booth, attendance records, and fee payment ledger.
- **Next of Kin:** Full name, phone number, and relationship to the applicant/student.
- **Staff:** Full name, email address, role (`Administrator`, `Teacher`, `Store keeper`), and activity logs (who recorded a payment, lesson log, or stock movement).

### Who Can See What (Strict Role Separation)
The dashboard enforces strict privacy boundaries on the server:
- **Administrator:** Can view and manage all school records, fee balances, payments, applications, staff accounts, and CSV exports.
- **Teacher:** Can view the syllabus, log lessons/attendance, and view student profiles and emergency contacts. **Teachers cannot see any student fee balances or payment records.**
- **Store Keeper:** Can view and update welding consumables, stock movements, and workshop equipment/faults. **Store keepers only see student names and booth numbers for equipment assignment — they cannot see student phone numbers, locations, next of kin, or fee records.**

### How to Remove or Archive a Person's Data on Request
- Because the dashboard maintains a financial and academic audit trail, records are **archived** rather than permanently deleted during normal use.
- If an applicant or former student formally requests that their personal contact details be removed (and there is no legal or financial requirement to retain them), an Administrator can clear their personal fields (`phone`, `email`, `location`, `next of kin`) in **Admin → Students** or ask the technical support contact to set `archived_at` / scrub personal columns in Supabase while preserving anonymized financial ledger totals.

---

## 4. What to Do When a Staff Member Joins or Leaves

### When a New Staff Member Joins
1. Sign in as **Administrator** and open **Staff** (`/admin/staff`).
2. Fill in **Add a staff account** with their full name, email, role (`Administrator`, `Teacher`, or `Store keeper`), and a temporary password (at least 8 characters).
3. Share the temporary password with the staff member privately.

### When a Staff Member Leaves the School
1. Sign in as **Administrator** and open **Staff** (`/admin/staff`) **immediately** on their last day.
2. Find the staff member in the list and click **Deactivate**.
3. **What happens when you click Deactivate:**
   - Their account status changes to **Inactive** immediately.
   - They are blocked from signing in or viewing any page in the dashboard.
   - All historical records they created in the past (lesson logs taught, payments recorded, or stock movements logged) **remain safely intact** so the school never loses its audit history.
4. If the person returns in the future, you can click **Reactivate** on the same card.

---

## 5. Everyday School Operations Reference

- **Course Structure:** The dashboard is pre-configured for the **KTS Welding & Fabrication Course (Lincoln Welding Curricula)** — 2 semesters of 13 weeks each (18 modules total), with a **85% minimum attendance threshold** (configurable in **Admin → Settings**).
- **Correcting a Payment Mistake:** Fee payments can never be edited or deleted once saved. If a payment was typed with the wrong amount or on the wrong student, open the student's profile in **Admin → Students**, click **Reverse** next to that payment, enter the reason, and then record the correct payment.
- **Closing an Intake:** Only one intake is active at a time. When a cohort finishes Semester 2 and graduates, go to **Admin → Intakes** and click **Close intake**. All records for that cohort remain readable forever, and you can then open the next intake and click **Load KTS 18-module syllabus** in **Admin → Syllabus**.

---

## 6. Support Contact

For technical assistance, domain/hosting updates, or database support:
- **Primary School Administrator:** Contact the KTS Administration Office (`theweldingschool-ug.com`).
- **Technical Builder / Developer Support:** *(Fill in the name, phone/WhatsApp, and email of the designated technical maintainer here at handover).*
