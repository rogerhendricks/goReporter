# Privacy Policy

**Effective Date:** [Insert Date]

**Last Updated:** [Insert Date]

This Privacy Policy explains how [Insert Company/Clinic Name] ("we," "us," or "our") collects, uses, discloses, and safeguards your information when you use the **goReporter** application ("the Application"). We are committed to protecting the privacy and security of both our staff users and the patients whose data is managed within the Application.

This policy is designed to comply with the Health Insurance Portability and Accountability Act (HIPAA) and the General Data Protection Regulation (GDPR).

---

## 1. Information We Collect

We collect information directly from users (clinic staff, administrators, and doctors) and maintain records regarding patients for the purpose of medical reporting and device management.

### A. Protected Health Information (ePHI) & Patient Data

To generate accurate reports and manage patient care, we collect and store the following patient information:

* **Demographic Data:** Name, Date of Birth (DOB), gender, and contact information (address, phone number, email).
* **Medical Identifiers:** Medical Record Numbers (MRN).
* **Implanted Device Data:** Details regarding implanted devices (e.g., pacemakers, defibrillators, loop recorders) including manufacturer, model, serial numbers, implant/explant dates, and lead configurations.
* **Clinical Data:** Medications, appointment histories, clinical notes, and generated device reports (In-Clinic and Remote).

### B. User Account Data (Staff & Doctors)

For staff, administrators, and doctors utilizing the Application, we collect:

* **Account Information:** Usernames, email addresses, and securely hashed passwords.
* **Professional Details:** Clinic locations, specialized roles (e.g., Doctor, Staff Doctor, Admin, Viewer), and patient associations.

### C. Automatically Collected Security Data

To maintain strict security and auditing compliance, our system automatically logs:

* **Audit Trails:** Records of when users access, view, modify, or delete patient records.
* **Authentication Logs:** Login attempts (successful and failed), token issuances, and account lockouts.
* **Device & Network Data:** IP addresses (including real client IPs behind proxies), user agents, and device fingerprints.

---

## 2. How We Use Your Information

We strictly limit the use of collected data to the following medical and operational purposes:

* **Medical Care & Reporting:** To generate clinical reports for patients with implanted devices and track overdue reports based on device type (e.g., 6-month or 12-month intervals).
* **Access Control:** To verify that doctors only access the records of patients explicitly associated with them.
* **Security & Auditing:** To detect unauthorized access attempts, prevent fraud, lock accounts after excessive failed logins, and maintain a legally required audit trail of all ePHI interactions.
* **System Integrity:** To ensure the Application operates securely and to troubleshoot technical issues.

---

## 3. Data Security Measures

We have implemented rigorous, industry-standard technical and administrative safeguards to protect your data:

* **Role-Based Access Control (RBAC):** Access to patient data is strictly limited based on user roles. Administrators and staff have necessary operational access, while doctors are cryptographically verified against their assigned patient list before access is granted.
* **Secure Authentication:** The Application uses short-lived, HTTP-only, secure JWT cookies.
* **Automatic Session Termination:** To prevent unauthorized access on unattended workstations, active sessions are automatically logged out after 8 minutes of inactivity.
* **Protection Against Web Threats:** We employ built-in Cross-Site Request Forgery (CSRF) tokens and strict rate limiting.
* **Comprehensive Logging:** All data access and modifications are logged with timestamps, user IDs, and severity levels to ensure full traceability.

---

## 4. Consent Management (GDPR Compliance)

We respect patient autonomy regarding how their data is used. The Application includes a comprehensive Consent Management system that tracks:

* Explicit consent for specific activities (e.g., Treatment, Remote Home Monitoring, Data Sharing, Research).
* The exact version of the Terms and Conditions the patient agreed to, and the date it was granted.
* Consent expiration dates and revocation events.

If a patient revokes consent for a specific activity (e.g., Remote Monitoring), the Application is designed to halt processing for that specific activity.

---

## 5. Data Retention

* **Medical Records:** Patient ePHI, reports, and device tracking data are retained for the duration required by applicable local and federal medical retention laws (e.g., state-specific medical record retention minimums).
* **Security Logs:** Audit and security logs are retained securely to comply with HIPAA monitoring requirements.
* **Account Deletion:** If a patient record is requested for deletion, the Application enforces checks to prevent the deletion of legally required historical reports. In such cases, data will be retained solely for compliance and archiving purposes, or anonymized where legally permissible.

---

## 6. Your Rights

Depending on your jurisdiction, you have specific rights regarding your personal data:

### Under GDPR (For EU Residents):

* **Right to Access:** You may request a copy of the personal data we hold about you.
* **Right to Rectification:** You may request corrections to inaccurate or incomplete data.
* **Right to Erasure ("Right to be Forgotten"):** You may request the deletion of your data, subject to overriding medical retention laws.
* **Right to Restrict Processing:** You may request we suspend processing of your data under certain conditions.

### Under HIPAA (For US Residents):

* **Right to Inspect and Copy:** You have the right to inspect and obtain a copy of your health information.
* **Right to Amend:** You may request an amendment to your health record if you believe it is incorrect.
* **Right to an Accounting of Disclosures:** You may request a list of certain disclosures we have made of your ePHI (which our audit logs facilitate).

To exercise any of these rights, please contact our Privacy Officer using the details below.

---

## 7. Third-Party Integrations and Data Sharing

We do not sell your personal data or ePHI. Information is only shared with third parties under the following circumstances:

* **Healthcare Operations:** With integrated electronic health record (EHR) systems (e.g., Epic) strictly for the continuation of patient care, governed by Business Associate Agreements (BAAs).
* **Legal Requirements:** If required by law, subpoena, or other legal processes, or to protect the safety and rights of our clinic, patients, or the public.

---

## 8. Changes to This Privacy Policy

We may update this Privacy Policy periodically to reflect changes in our practices or legal obligations. When terms are updated, users and patients (where applicable) may be required to review and re-accept the updated terms within the Application's Consent Manager.

---

## 9. Contact Us

If you have questions about this Privacy Policy, our data practices, or wish to exercise your privacy rights, please contact our Data Protection Officer / Privacy Officer at:

**[Insert Organization Name]** **Email:** [Insert Privacy Email Address]

**Phone:** [Insert Phone Number]

**Mailing Address:** [Insert Physical Address]

[Insert City, State, Zip, Country]