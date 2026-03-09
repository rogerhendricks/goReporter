import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { Report } from "@/stores/reportStore";
import type {
  Patient,
  ImplantedDevice,
  ImplantedLead,
} from "@/stores/patientStore";
import type { ClinicalException } from "@/utils/clinicalRulesEngine";

interface PatientDoctor {
  id: number;
  doctorId: number;
  addressId: number;
  isPrimary: boolean;
  doctor: {
    id: number;
    fullName: string;
    email?: string;
    phone?: string;
    specialty?: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zip: string;
  };
}

export interface PdfSectionVisibility {
  exceptions: boolean;
  patientInfo: boolean;
  bradySettings: boolean;
  arrhythmias: boolean;
  measurements: boolean;
  comments: boolean;
  batteryDiagnostics?: boolean;
  tachySettings?: boolean;
  pacingPercentages?: boolean;
  ilrMeasurements?: boolean;
  episodecount?: boolean;
}

interface ProgrammaticReportProps {
  formData: Partial<Report>;
  patient: Patient;
  activeDevices?: ImplantedDevice[];
  activeLeads?: ImplantedLead[];
  selectedDoctor?: PatientDoctor;
  exceptions?: ClinicalException[];
  visibility: PdfSectionVisibility;
  logoDataUri?: string;
}

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 30,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    paddingBottom: 10,
  },
  logo: {
    width: 100,
    height: 80,
  },
  titleContainer: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  reportDate: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  mailToBox: {
    width: "45%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#CCC",
    backgroundColor: "#F9F9F9",
    borderRadius: 4,
  },
  patientBox: {
    width: "45%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 4,
  },
  boxTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    paddingBottom: 2,
  },
  text: {
    fontSize: 10,
    marginBottom: 4,
    lineHeight: 1.4,
  },
  textBold: {
    fontSize: 10,
    fontWeight: "bold",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    backgroundColor: "#F0F0F0",
    padding: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  colLabel: {
    width: "30%",
    fontSize: 10,
    fontWeight: "bold",
    color: "#444",
  },
  colValue: {
    width: "70%",
    fontSize: 10,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridItem: {
    width: "50%",
    flexDirection: "row",
    marginBottom: 4,
  },
  gridLabel: {
    width: "50%",
    fontSize: 10,
    fontWeight: "bold",
    color: "#444",
  },
  gridValue: {
    width: "50%",
    fontSize: 10,
  },
  exceptionCritical: {
    backgroundColor: "#FEE2E2",
    borderLeftWidth: 3,
    borderLeftColor: "#EF4444",
    padding: 6,
    marginBottom: 4,
  },
  exceptionWarning: {
    backgroundColor: "#FEF3C7",
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
    padding: 6,
    marginBottom: 4,
  },
  exceptionText: {
    fontSize: 10,
    color: "#111",
  },
  table: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row",
  },
  tableHeader: {
    backgroundColor: "#F3F4F6",
    fontWeight: "bold",
  },
  tableColHeader: {
    width: "25%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderTopWidth: 0,
    borderLeftWidth: 0,
    padding: 4,
  },
  tableCol: {
    width: "25%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderTopWidth: 0,
    borderLeftWidth: 0,
    padding: 4,
  },
  tableCellHeader: {
    margin: "auto",
    fontSize: 10,
    fontWeight: "bold",
  },
  tableCell: {
    margin: "auto",
    fontSize: 10,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: "center",
    color: "grey",
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    paddingTop: 8,
  },
});

export const ProgrammaticReportDocument: React.FC<ProgrammaticReportProps> = ({
  formData,
  patient,
  activeDevices,
  activeLeads,
  selectedDoctor,
  exceptions = [],
  visibility,
  logoDataUri,
}) => {
  const doctorToUse =
    selectedDoctor?.doctor || (patient as any).patientDoctors?.[0]?.doctor;
  const addressToUse =
    selectedDoctor?.address || (patient as any).patientDoctors?.[0]?.address;

  const formatDate = (dateStr: string | Date | undefined) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString();
  };

  const hasEpisodeCounts = [
    formData.episode_af_count_since_last_check,
    formData.episode_tachy_count_since_last_check,
    formData.episode_pause_count_since_last_check,
    formData.episode_symptom_all_count_since_last_check,
    formData.episode_symptom_with_detection_count_since_last_check,
  ].some(
    (val) =>
      val !== undefined &&
      val !== null &&
      (typeof val !== "string" || val !== "")
  );

  const formatCount = (value: any) => {
    if (value === 0) return "0";
    return value || "N/A";
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            {logoDataUri ? (
              <Image src={logoDataUri} style={styles.logo} />
            ) : (
              <Text style={{ fontSize: 24, fontWeight: "bold" }}>
                Company Logo
              </Text>
            )}
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.reportTitle}>Device Interrogation Report</Text>
            <Text style={styles.reportDate}>
              Date: {formatDate(formData.reportDate)}
            </Text>
            <Text style={styles.reportDate}>
              Status: {formData.reportStatus || "Pending"}
            </Text>
          </View>
        </View>

        {/* MAIL TO & PATIENT DEMOGRAPHICS */}
        {visibility.patientInfo && (
          <View style={styles.topSection}>
            <View style={styles.mailToBox}>
              <Text style={styles.boxTitle}>MAIL TO:</Text>
              {doctorToUse ? (
                <>
                  <Text style={styles.textBold}>
                    Dr. {doctorToUse.fullName}
                  </Text>
                  {addressToUse ? (
                    <>
                      <Text style={styles.text}>{addressToUse.street}</Text>
                      <Text style={styles.text}>
                        {addressToUse.city}, {addressToUse.state}{" "}
                        {addressToUse.zip}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.text}>Address not on file</Text>
                  )}
                  {doctorToUse.phone && (
                    <Text style={styles.text}>Ph: {doctorToUse.phone}</Text>
                  )}
                </>
              ) : (
                <Text style={styles.text}>No Provider Selected</Text>
              )}
            </View>

            <View style={styles.patientBox}>
              <Text style={styles.boxTitle}>PATIENT DEMOGRAPHICS:</Text>
              <Text style={styles.textBold}>
                {patient.fname} {patient.lname}
              </Text>
              <Text style={styles.text}>MRN: {patient.mrn}</Text>
              <Text style={styles.text}>DOB: {formatDate(patient.dob)}</Text>
              <Text style={styles.text}>Ph: {patient.phone}</Text>
              <Text style={styles.text}>{patient.street}</Text>
              <Text style={styles.text}>
                {patient.city}, {patient.state} {patient.postal}
              </Text>
            </View>
          </View>
        )}

        {/* CLINICAL EXCEPTIONS TOP SHEET */}
        {visibility.exceptions && exceptions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CLINICAL EXCEPTIONS SUMMARY</Text>
            {exceptions.map((exc, idx) => (
              <View
                key={idx}
                style={
                  exc.severity === "Critical"
                    ? styles.exceptionCritical
                    : styles.exceptionWarning
                }
              >
                <Text style={styles.textBold}>
                  {exc.metric}: {exc.currentValue}
                </Text>
                <Text style={styles.exceptionText}>{exc.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* DEVICE INFORMATION */}
        {activeDevices && activeDevices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>IMPLANTED SYSTEM</Text>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              {/* Devices Column */}
              <View style={{ width: "48%" }}>
                <Text
                  style={[
                    styles.textBold,
                    { marginBottom: 4, textDecoration: "underline" },
                  ]}
                >
                  Device(s)
                </Text>
                {activeDevices.map((dev, idx) => (
                  <View key={`dev-${idx}`} style={{ marginBottom: 6 }}>
                    <Text style={styles.textBold}>
                      {dev.device?.manufacturer} {dev.device?.name} (
                      {dev.device?.model})
                    </Text>
                    <Text style={styles.text}>
                      SN: {dev.serial} | Imp: {formatDate(dev.implantedAt)}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Leads Column */}
              <View style={{ width: "48%" }}>
                <Text
                  style={[
                    styles.textBold,
                    { marginBottom: 4, textDecoration: "underline" },
                  ]}
                >
                  Lead(s)
                </Text>
                {activeLeads && activeLeads.length > 0 ? (
                  activeLeads.map((lead, idx) => (
                    <View key={`lead-${idx}`} style={{ marginBottom: 4 }}>
                      <Text style={styles.text}>
                        <Text style={styles.textBold}>{lead.chamber}:</Text>{" "}
                        {lead.lead?.manufacturer} {lead.lead?.name} | SN:{" "}
                        {lead.serial}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.text}>No active leads.</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* BATTERY & DEVICE DIAGNOSTICS */}
        {visibility.batteryDiagnostics !== false && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              BATTERY & DEVICE DIAGNOSTICS
            </Text>
            <View style={styles.gridContainer}>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Battery Status:</Text>
                <Text style={styles.gridValue}>
                  {formData.mdc_idc_batt_status || "N/A"}
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Battery Voltage:</Text>
                <Text style={styles.gridValue}>
                  {formData.mdc_idc_batt_volt
                    ? `${formData.mdc_idc_batt_volt} V`
                    : "N/A"}
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Longevity:</Text>
                <Text style={styles.gridValue}>
                  {formData.mdc_idc_batt_remaining
                    ? `${formData.mdc_idc_batt_remaining} months`
                    : "N/A"}
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Charge Time:</Text>
                <Text style={styles.gridValue}>
                  {formData.mdc_idc_cap_charge_time
                    ? `${formData.mdc_idc_cap_charge_time} sec`
                    : "N/A"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* BRADYCARDIA SETTINGS */}
        {visibility.bradySettings && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PACING PARAMETERS</Text>
            <View style={styles.gridContainer}>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Mode:</Text>
                <Text style={styles.gridValue}>
                  {formData.mdc_idc_set_brady_mode || "N/A"}
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Lower Rate:</Text>
                <Text style={styles.gridValue}>
                  {formData.mdc_idc_set_brady_lowrate || "N/A"} bpm
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Max Tracking:</Text>
                <Text style={styles.gridValue}>
                  {formData.mdc_idc_set_brady_max_tracking_rate || "N/A"} bpm
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* PACING PERCENTAGES */}
        {visibility.pacingPercentages && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PACING PERCENTAGES</Text>
            <View style={styles.gridContainer}>
              {formData.mdc_idc_stat_brady_ra_percent_paced !== undefined &&
                formData.mdc_idc_stat_brady_ra_percent_paced !== null && (
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>RA Paced:</Text>
                    <Text style={styles.gridValue}>
                      {formData.mdc_idc_stat_brady_ra_percent_paced}%
                    </Text>
                  </View>
                )}
              {formData.mdc_idc_stat_brady_rv_percent_paced !== undefined &&
                formData.mdc_idc_stat_brady_rv_percent_paced !== null && (
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>RV Paced:</Text>
                    <Text style={styles.gridValue}>
                      {formData.mdc_idc_stat_brady_rv_percent_paced}%
                    </Text>
                  </View>
                )}
              {formData.mdc_idc_stat_brady_lv_percent_paced !== undefined &&
                formData.mdc_idc_stat_brady_lv_percent_paced !== null && (
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>LV Paced:</Text>
                    <Text style={styles.gridValue}>
                      {formData.mdc_idc_stat_brady_lv_percent_paced}%
                    </Text>
                  </View>
                )}
              {formData.mdc_idc_stat_brady_biv_percent_paced !== undefined &&
                formData.mdc_idc_stat_brady_biv_percent_paced !== null && (
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>BiV Paced:</Text>
                    <Text style={styles.gridValue}>
                      {formData.mdc_idc_stat_brady_biv_percent_paced}%
                    </Text>
                  </View>
                )}
            </View>
          </View>
        )}

        {/* TACHY SETTINGS */}
        {visibility.tachySettings &&
          (formData.VT1_active ||
            formData.VT2_active ||
            formData.VF_active) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>TACHYCARDIA SETTINGS</Text>
              <View style={styles.gridContainer}>
                {formData.VT1_detection_interval && (
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>VT1 Detection:</Text>
                    <Text style={styles.gridValue}>
                      {formData.VT1_detection_interval}
                    </Text>
                  </View>
                )}
                {formData.VT2_detection_interval && (
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>VT2 Detection:</Text>
                    <Text style={styles.gridValue}>
                      {formData.VT2_detection_interval}
                    </Text>
                  </View>
                )}
                {formData.VF_detection_interval && (
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>VF Detection:</Text>
                    <Text style={styles.gridValue}>
                      {formData.VF_detection_interval}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

        {/* LEAD MEASUREMENTS */}
        {visibility.measurements && !visibility.ilrMeasurements && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>LEAD MEASUREMENTS</Text>
            <View style={{ marginTop: 4 }}>
              <View style={styles.table}>
                {/* Table Header */}
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <View style={styles.tableColHeader}>
                    <Text style={styles.tableCellHeader}>Chamber</Text>
                  </View>
                  <View style={styles.tableColHeader}>
                    <Text style={styles.tableCellHeader}>Impedance (Ω)</Text>
                  </View>
                  <View style={styles.tableColHeader}>
                    <Text style={styles.tableCellHeader}>Sensing (mV)</Text>
                  </View>
                  <View style={styles.tableColHeader}>
                    <Text style={styles.tableCellHeader}>
                      Threshold (V @ ms)
                    </Text>
                  </View>
                </View>

                {/* RA Lead */}
                {formData.mdc_idc_msmt_ra_impedance_mean && (
                  <View style={styles.tableRow}>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>RA Lead</Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>
                        {formData.mdc_idc_msmt_ra_impedance_mean}
                      </Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>
                        {formData.mdc_idc_msmt_ra_sensing}
                      </Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>
                        {formData.mdc_idc_msmt_ra_pacing_threshold} @{" "}
                        {formData.mdc_idc_msmt_ra_pw}
                      </Text>
                    </View>
                  </View>
                )}

                {/* RV Lead */}
                {formData.mdc_idc_msmt_rv_impedance_mean && (
                  <View style={styles.tableRow}>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>RV Lead</Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>
                        {formData.mdc_idc_msmt_rv_impedance_mean}
                      </Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>
                        {formData.mdc_idc_msmt_rv_sensing}
                      </Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>
                        {formData.mdc_idc_msmt_rv_pacing_threshold} @{" "}
                        {formData.mdc_idc_msmt_rv_pw}
                      </Text>
                    </View>
                  </View>
                )}

                {/* LV Lead */}
                {formData.mdc_idc_msmt_lv_impedance_mean && (
                  <View style={styles.tableRow}>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>LV Lead</Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>
                        {formData.mdc_idc_msmt_lv_impedance_mean}
                      </Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>
                        {formData.mdc_idc_msmt_lv_sensing}
                      </Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>
                        {formData.mdc_idc_msmt_lv_pacing_threshold} @{" "}
                        {formData.mdc_idc_msmt_lv_pw}
                      </Text>
                    </View>
                  </View>
                )}

                {/* HV/Shock Lead */}
                {formData.mdc_idc_msmt_hv_impedance_mean && (
                  <View style={styles.tableRow}>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>Shock Coil</Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>
                        {formData.mdc_idc_msmt_hv_impedance_mean}
                      </Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>N/A</Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>N/A</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ILR MEASUREMENTS */}
        {visibility.ilrMeasurements && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ILR MEASUREMENTS</Text>
            <View style={styles.gridContainer}>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Battery Voltage:</Text>
                <Text style={styles.gridValue}>
                  {formData.mdc_idc_batt_volt
                    ? `${formData.mdc_idc_batt_volt} V`
                    : "N/A"}
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Battery Status:</Text>
                <Text style={styles.gridValue}>
                  {formData.mdc_idc_batt_status || "N/A"}
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Sensing:</Text>
                <Text style={styles.gridValue}>
                  {formData.mdc_idc_msmt_rv_sensing
                    ? `${formData.mdc_idc_msmt_rv_sensing} mV`
                    : "N/A"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* EPISODE COUNTS */}
        {visibility.episodecount !== false && hasEpisodeCounts && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EPISODE COUNTS (SINCE LAST CHECK)</Text>
            <View style={styles.gridContainer}>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>AF:</Text>
                <Text style={styles.gridValue}>
                  {formatCount(formData.episode_af_count_since_last_check)}
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Tachy:</Text>
                <Text style={styles.gridValue}>
                  {formatCount(formData.episode_tachy_count_since_last_check)}
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Pause:</Text>
                <Text style={styles.gridValue}>
                  {formatCount(formData.episode_pause_count_since_last_check)}
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Symptom (All):</Text>
                <Text style={styles.gridValue}>
                  {formatCount(formData.episode_symptom_all_count_since_last_check)}
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Symptom (With Detection):</Text>
                <Text style={styles.gridValue}>
                  {formatCount(formData.episode_symptom_with_detection_count_since_last_check)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ARRHYTHMIAS */}
        {visibility.arrhythmias &&
          formData.arrhythmias &&
          formData.arrhythmias.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ARRHYTHMIA EPISODES</Text>
              {formData.arrhythmias.map((arr, idx) => (
                <View
                  key={idx}
                  style={{
                    marginBottom: 6,
                    borderBottomWidth: 1,
                    borderBottomColor: "#EEE",
                    paddingBottom: 4,
                  }}
                >
                  <Text style={styles.textBold}>
                    {arr.name} ({arr.rate} bpm)
                  </Text>
                  <Text style={styles.text}>
                    Symptoms: {arr.symptoms || "None reported"}
                  </Text>
                  <Text style={styles.text}>
                    Therapies: {arr.therapies || "None"}
                  </Text>
                </View>
              ))}
            </View>
          )}

        {/* COMMENTS */}
        {visibility.comments && formData.comments && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CLINICAL COMMENTS</Text>
            <Text style={styles.text}>{formData.comments}</Text>
          </View>
        )}

        {/* FOOTER */}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Generated electronically via goReporter by ${formData.completedByName || "Authorized User"} on ${new Date().toLocaleString()} | Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};
