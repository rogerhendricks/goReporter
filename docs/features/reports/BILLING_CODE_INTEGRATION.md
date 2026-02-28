# Billing Code Integration

## Overview
Efficiently manage and export medical billing codes for device check reports. The system automatically maps report types to standardized billing codes, streamlining the billing process for the clinic.

## Key Functionality

### 1. Dynamic Billing Categories
Administrators can define and manage a list of billing categories (e.g., "In Clinic Pacemaker", "Remote Defibrillator"). These categories are used to classify reports during creation.

### 2. Standardized Billing Codes
Each billing category can be assigned an alphanumeric billing code (e.g., CPT codes like 93294). These codes are automatically associated with reports based on their selected type.

### 3. Automated Batch Export
Export completed reports and their corresponding billing codes to a CSV format, suitable for the clinic's billing department. Data can be filtered by date ranges.

## For Administrators

### Managing Billing Codes
1. Navigate to the **Admin Dashboard**.
2. Select the **Admin Tools** tab.
3. Locate the **Billing Code Configuration** section.
4. **Update Existing Codes**: Enter the alphanumeric code next to any category and click the **Save** icon.
5. **Add New Categories**: Scroll to the bottom row, enter a new category name and initial code, then click **Add**.

### Exporting Billing Data
1. In the **Billing Code Configuration** section, locate the **Export Completed Reports** area.
2. (Optional) Select a **Start Date** and **End Date**.
3. Click **Export to CSV**.
4. The system will generate a file containing patient details, report dates, the selected encounter type, and the assigned billing code.

## For Healthcare Providers

### Selecting Report Types
When creating or editing a report in the **Report Builder**:
1. Locate the **Report Type** dropdown.
2. Select the appropriate billing category from the list.
3. The list is dynamically updated based on the administrator's configuration.

## Technical Details

- **Backend**: Implemented with Go (Fiber) using a `BillingCode` model and GORM for persistence.
- **Frontend**: Built with React and TypeScript, leveraging a custom `billingService` for API interactions.
- **Data Format**: Exports are provided in standard CSV format for easy integration with billing software or spreadsheet applications.
