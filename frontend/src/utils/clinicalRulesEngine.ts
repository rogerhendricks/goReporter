import type { Report } from "@/stores/reportStore";

export interface ClinicalException {
  category: "Battery" | "Lead" | "Arrhythmia" | "Therapy";
  severity: "Critical" | "Warning" | "Info";
  metric: string;
  currentValue: string;
  previousValue?: string;
  message: string;
}

export function evaluateClinicalExceptions(
  currentReport: Partial<Report>,
  previousReport?: Report | null,
): ClinicalException[] {
  const exceptions: ClinicalException[] = [];

  // Phase 1 Rules: Battery and Arrhythmia logic

  // 1. Battery ERI/EOL Status
  const battStatus = currentReport.mdc_idc_batt_status?.toLowerCase();
  if (
    battStatus &&
    (battStatus.includes("eri") ||
      battStatus.includes("eol") ||
      battStatus.includes("rt") ||
      battStatus.includes("rrt"))
  ) {
    exceptions.push({
      category: "Battery",
      severity: "Critical",
      metric: "Battery Status",
      currentValue: currentReport.mdc_idc_batt_status || "",
      message:
        "Device indicates Elective Replacement Indicator (ERI) or End of Life (EOL).",
    });
  } else if (
    currentReport.mdc_idc_batt_volt !== undefined &&
    currentReport.mdc_idc_batt_volt !== null
  ) {
    if (currentReport.mdc_idc_batt_volt < 2.75) {
      exceptions.push({
        category: "Battery",
        severity: "Warning",
        metric: "Battery Voltage",
        currentValue: `${currentReport.mdc_idc_batt_volt} V`,
        message: "Battery voltage is below 2.5V.",
      });
    }
  }

  // 2. AT/AF Burden (Warning if > 1%, Critical if > 5%)
  if (
    currentReport.mdc_idc_stat_ataf_burden_percent !== undefined &&
    currentReport.mdc_idc_stat_ataf_burden_percent !== null
  ) {
    const afBurden = currentReport.mdc_idc_stat_ataf_burden_percent;
    if (afBurden > 5) {
      exceptions.push({
        category: "Arrhythmia",
        severity: "Critical",
        metric: "AT/AF Burden",
        currentValue: `${afBurden}%`,
        message: `AT/AF Burden is notably high at ${afBurden}%.`,
      });
    } else if (afBurden > 1) {
      exceptions.push({
        category: "Arrhythmia",
        severity: "Warning",
        metric: "AT/AF Burden",
        currentValue: `${afBurden}%`,
        message: `AT/AF Burden is elevated at ${afBurden}%.`,
      });
    }
  }

  // 3. Ventricular Arrhythmias / Treated Episodes (Shocks or ATP)
  // These represent treated VT/VF
  let totalTreatedVTVF = 0;

  if (currentReport.episode_tachy_count_since_last_check) {
    totalTreatedVTVF += currentReport.episode_tachy_count_since_last_check;
  }

  if (totalTreatedVTVF > 0) {
    exceptions.push({
      category: "Therapy",
      severity: "Critical",
      metric: "Tachycardia Episodes",
      currentValue: `${totalTreatedVTVF} episodes`,
      message: `Device reported ${totalTreatedVTVF} Tachycardia episode(s) since last check.`,
    });
  }

  // Check specific therapy counts if available (ATP, Shocks)
  // (In the future we can iterate over VT1_therapy_X, VF_therapy_X if they become numeric or have flags)

  // 4. Arrhythmia Array
  if (currentReport.arrhythmias && currentReport.arrhythmias.length > 0) {
    // Just check if there's any arrhythmias logged
    const hasVT = currentReport.arrhythmias.some(
      (a) =>
        a.name.toLowerCase().includes("vt") ||
        a.name.toLowerCase().includes("ventricular"),
    );
    if (hasVT) {
      exceptions.push({
        category: "Arrhythmia",
        severity: "Critical",
        metric: "VT/VF Logged",
        currentValue: "Detected",
        message: "Ventricular arrhythmias logged in report.",
      });
    }
  }

  // Phase 2 Rules: Lead Parameters (Threshold, Impedance, Sensing)
  const leadTypes = [
    { prefix: "ra", name: "Right Atrial (RA)" },
    { prefix: "rv", name: "Right Ventricular (RV)" },
    { prefix: "lv", name: "Left Ventricular (LV)" },
  ] as const;

  leadTypes.forEach((lead) => {
    // 1. Pacing Thresholds
    const thresholdKey =
      `mdc_idc_msmt_${lead.prefix}_pacing_threshold` as keyof Report;
    const currentThreshold = currentReport[thresholdKey] as
      | number
      | undefined
      | null;

    if (currentThreshold !== undefined && currentThreshold !== null) {
      if (currentThreshold >= 2.0) {
        exceptions.push({
          category: "Lead",
          severity: "Critical",
          metric: `${lead.name} Threshold`,
          currentValue: `${currentThreshold} V`,
          message: `${lead.name} pacing threshold is critically high (\u2265 2.0V).`,
        });
      } else if (currentThreshold > 1.5) {
        exceptions.push({
          category: "Lead",
          severity: "Warning",
          metric: `${lead.name} Threshold`,
          currentValue: `${currentThreshold} V`,
          message: `${lead.name} pacing threshold is elevated (> 1.5V).`,
        });
      }
    }

    // 2. Impedances
    const impedanceKey =
      `mdc_idc_msmt_${lead.prefix}_impedance_mean` as keyof Report;
    const currentImpedance = currentReport[impedanceKey] as
      | number
      | undefined
      | null;

    if (currentImpedance !== undefined && currentImpedance !== null) {
      if (currentImpedance < 250 || currentImpedance > 1500) {
        exceptions.push({
          category: "Lead",
          severity: "Critical",
          metric: `${lead.name} Impedance`,
          currentValue: `${currentImpedance} \u03a9`,
          message: `${lead.name} impedance is out of critical range (< 250 or > 1500 \u03a9).`,
        });
      } else if (currentImpedance < 300 || currentImpedance > 1000) {
        exceptions.push({
          category: "Lead",
          severity: "Warning",
          metric: `${lead.name} Impedance`,
          currentValue: `${currentImpedance} \u03a9`,
          message: `${lead.name} impedance is out of normal range (< 300 or > 1000 \u03a9).`,
        });
      }
    }

    // 3. Sensing
    const sensingKey = `mdc_idc_msmt_${lead.prefix}_sensing` as keyof Report;
    const currentSensing = currentReport[sensingKey] as
      | number
      | undefined
      | null;
    const previousSensing = previousReport
      ? (previousReport[sensingKey] as number | undefined | null)
      : null;

    if (
      currentSensing !== undefined &&
      currentSensing !== null &&
      previousSensing !== undefined &&
      previousSensing !== null
    ) {
      if (currentSensing < previousSensing * 0.25) {
        exceptions.push({
          category: "Lead",
          severity: "Warning",
          metric: `${lead.name} Sensing`,
          currentValue: `${currentSensing} mV`,
          previousValue: `${previousSensing} mV`,
          message: `${lead.name} sensing has dropped to less than a quarter of the previous report.`,
        });
      }
    }
  });

  return exceptions;
}
