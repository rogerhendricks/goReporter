import { XMLParser } from 'fast-xml-parser';
import { PDFDocument, PDFName, PDFArray, PDFDict, PDFStream } from 'pdf-lib'

export interface ParsedData {
  mrn?: string;
  name?: string;
  dob?: string;
  report_date?: string;
  mdc_idc_dev_serial_number?: string;
  mdc_idc_dev_model?: string;
  mdc_idc_dev_manufacturer?: string;
  mdc_idc_dev_implant_date?: string;
  mdc_idc_dev_ra_serial_number?: string;
  mdc_idc_dev_ra_manufacturer?: string;
  mdc_idc_dev_ra_model?: string;
  mdc_idc_dev_ra_implant_date?: string;
  mdc_idc_dev_rv_serial_number?: string;
  mdc_idc_dev_rv_manufacturer?: string;
  mdc_idc_dev_rv_model?: string;
  mdc_idc_dev_rv_implant_date?: string;
  mdc_idc_dev_lv_serial_number?: string;
  mdc_idc_dev_lv_manufacturer?: string;
  mdc_idc_dev_lv_model?: string;
  mdc_idc_dev_lv_implant_date?: string;
  mdc_idc_msmt_hv_impedance_mean?: string;
  mdc_idc_stat_ataf_burden_percent?: string;
  mdc_idc_stat_ataf_count?: string;
  mdc_idc_stat_pvc_count?: string;
  mdc_idc_stat_nsvt_count?: string;
  mdc_idc_stat_atp_delivered_recent?: string;
  mdc_idc_stat_shocks_delivered_recent?: string;
  mdc_idc_set_brady_mode?: string;
  mdc_idc_set_brady_lowrate?: string;
  mdc_idc_set_brady_max_tracking_rate?: string;
  mdc_idc_set_brady_max_sensor_rate?: string;
  mdc_idc_set_brady_mode_switch_rate?: string;
  mdc_idc_dev_sav?: string;
  mdc_idc_dev_pav?: string;
  mdc_idc_stat_brady_ra_percent_paced?: string;
  mdc_idc_stat_brady_rv_percent_paced?: string;
  mdc_idc_stat_brady_lv_percent_paced?: string;
  mdc_idc_stat_brady_biv_percent_paced?: string;
  mdc_idc_batt_percentage?: string;
  mdc_idc_batt_volt?: string;
  mdc_idc_batt_remaining?: string;
  mdc_idc_batt_status?: string;
  mdc_idc_cap_charge_time?: string;
  mdc_idc_msmt_ra_impedance_mean?: string;
  mdc_idc_msmt_ra_sensing_mean?: string;
  mdc_idc_msmt_ra_pacing_threshold?: string;
  mdc_idc_msmt_ra_pw?: string;
  mdc_idc_msmt_rv_impedance_mean?: string;
  mdc_idc_msmt_rv_sensing_mean?: string;
  mdc_idc_msmt_rv_pacing_threshold?: string;
  mdc_idc_msmt_rv_pw?: string;
  mdc_idc_msmt_lv_impedance_mean?: string;
  mdc_idc_msmt_lv_sensing_mean?: string;
  mdc_idc_msmt_lv_pacing_threshold?: string;
  mdc_idc_msmt_lv_pw?: string;
  // Tachy Settings
  VT1_active?: string;
  VT1_detection_interval?: string;
  VT1_therapy_1_atp?: string;
  VT1_therapy_1_no_bursts?: string;
  VT1_therapy_2_atp?: string;
  VT1_therapy_2_no_bursts?: string;
  // VT1_therapy_3_cvrt?: string;
  VT1_therapy_3_energy?: string;
  // VT1_therapy_4_cvrt?: string;
  VT1_therapy_4_energy?: string;
  // VT1_therapy_5_cvrt?: string;
  VT1_therapy_5_energy?: string;
  VT1_therapy_5_max_num_shocks?: string;
  // VT2 Settings
  VT2_active?: string;
  VT2_detection_interval?: string;
  VT2_therapy_1_atp?: string;
  VT2_therapy_1_no_bursts?: string;
  VT2_therapy_2_atp?: string;
  VT2_therapy_2_no_bursts?: string;
  // VT2_therapy_3_cvrt?: string;
  VT2_therapy_3_energy?: string;
  // VT2_therapy_4_cvrt?: string;
  VT2_therapy_4_energy?: string;
  // VT2_therapy_5_cvrt?: string;
  VT2_therapy_5_energy?: string;
  VT2_therapy_5_max_num_shocks?: string;
  //  VF Settings
  VF_active?: string;
  VF_detection_interval?: string;
  VF_therapy_1_atp?: string;
  VF_therapy_2_energy?: string;
  VF_therapy_3_energy?: string;
  VF_therapy_4_energy?: string;
  VF_therapy_4_max_num_shocks?: string;
  embeddedPdfBase64?: string;
  embeddedPdfName?: string;
  [key: string]: any;
}

const monthNameToNumber: Record<string, number> = {
  'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
  'Jul': 7, 'Aug': 8, 'Sep': 9, 'Sept': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
};

function msToBpm(ms: string | number): number {
  return Math.round(60000 / parseInt(ms.toString()));
}

function convertThreshold(threshold: string | number): number {
  return parseFloat(threshold.toString()) / 1000;
}

function pdfObjToString(obj: any): string {
  if (!obj) return ''
  const tryFns = ['decodeText', 'asString', 'toString']
  for (const fn of tryFns) {
    if (typeof obj[fn] === 'function') {
      try { return obj[fn]() } catch { /* ignore */ }
    }
  }
  return String(obj?.value ?? '')
}

// Read bytes from a PDFStream
function getStreamBytes(stream: any): Uint8Array | null {
  if (!stream) return null
  try {
    if (typeof stream.getContents === 'function') return stream.getContents()
    if (stream.contents instanceof Uint8Array) return stream.contents
  } catch { /* ignore */ }
  return null
}

// Small helper: normalize to array
// const toArr = <T>(x: T | T[] | undefined): T[] => (x ? (Array.isArray(x) ? x : [x]) : [])

// Try to detect base64-encoded PDF strings
function looksLikeBase64Pdf(s: string): boolean {
  // Common PDF base64 prefix: "JVBERi0" (%PDF-)
  return /^\s*JVBERi0/i.test(s.trim())
}

// Recursively walk sections to collect all <value> nodes
// function collectAllValues(node: any, out: any[] = []): any[] {
//   if (!node) return out
//   const values = node.value
//   if (values) out.push(...toArr(values))
//   const sections = node.section
//   toArr(sections).forEach((child: any) => collectAllValues(child, out))
//   return out
// }

export async function parseFileContent(file: File, serial?: string): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    console.log(file.name, file.type, serial);

    const reader = new FileReader();

    if (file.type === "text/xml" || file.name.endsWith('.xml')) {
      reader.readAsText(file);
      reader.addEventListener('load', (e) => {
        const data = e.target?.result as string;
        try {
          const result = parseXmlFile(data);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      reader.addEventListener('error', (e) => {
        reject(e);
      });
    } else if (file.name.endsWith('.log')) {
      reader.readAsText(file);
      reader.addEventListener('load', (e) => {
        const data = e.target?.result as string;
        try {
          const result = parseLogFile(data);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      reader.addEventListener('error', (e) => {
        reject(e);
      });
    } else if (file.name.endsWith('.bnk')) {
      reader.readAsText(file);
      reader.addEventListener('load', (e) => {
        const data = e.target?.result as string;
        try {
          const result = parseBnkFile(data);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      reader.addEventListener('error', (e) => {
        reject(e);
      });
    } else if (file.name.endsWith('.pdf')) {
      parsePdfFile(file)
        .then(pdfResult => {
          resolve(pdfResult)
        })
      // .catch(e => {
      //   resolve({ fileType: 'pdf', fileName: file.name, xmlFound: false, embeddedXml: null })
      // })
    } else {
      reject(new Error("Unsupported file type. Please upload .xml, .log, or .bnk files."));
    }
  });
}

function parseLogFile(data: string): ParsedData {
  const lines = data.split('\n');
  const parsedData: ParsedData = {};

  const mappings: Record<string, string> = {
    '2430': 'name',
    '105': 'report_date',
    '2431': 'dob',
    '202': 'mdc_idc_dev_serial_number',
    '200': 'mdc_idc_dev_model',
    '2442': 'mdc_idc_dev_implant_date',
    '2468': 'mdc_idc_dev_ra_serial_number',
    '2456': 'mdc_idc_dev_ra_manufacturer',
    '2457': 'mdc_idc_dev_ra_model',
    '2458': 'mdc_idc_dev_ra_model',
    '2459': 'mdc_idc_dev_ra_implant_date',
    '2470': 'mdc_idc_dev_rv_serial_number',
    '2469': 'mdc_idc_dev_rv_serial_number',
    '2460': 'mdc_idc_dev_rv_manufacturer',
    '2461': 'mdc_idc_dev_rv_model',
    '2462': 'mdc_idc_dev_rv_model',
    '2463': 'mdc_idc_dev_rv_implant_date',
    '2471': 'mdc_idc_dev_lv_serial_number',
    '2464': 'mdc_idc_dev_lv_manufacturer',
    '2465': 'mdc_idc_dev_lv_model',
    '2466': 'mdc_idc_dev_lv_model',
    '2467': 'mdc_idc_dev_lv_implant_date',
    '301': 'mdc_idc_set_brady_mode',
    '302': 'mdc_idc_set_brady_lowrate',
    '406': 'mdc_idc_set_brady_max_sensor_rate',
    '323': 'mdc_idc_set_brady_max_tracking_rate',
    '2754': 'mdc_idc_stat_ataf_count',
    '2682': 'mdc_idc_stat_brady_ra_percent_paced',
    '2681': 'mdc_idc_stat_brady_rv_percent_paced',
    '519': 'mdc_idc_batt_volt',
    '2745': 'mdc_idc_cap_charge_time',
    '533': 'mdc_idc_batt_remaining',
    '512': 'mdc_idc_msmt_ra_impedance_mean',
    '2721': 'mdc_idc_msmt_ra_sensing_mean',
    '1610': 'mdc_idc_msmt_ra_pacing_threshold',
    '849': 'mdc_idc_msmt_ra_pacing_threshold',
    '1611': 'mdc_idc_msmt_ra_pw',
    '507': 'mdc_idc_msmt_rv_impedance_mean',
    '2722': 'mdc_idc_msmt_rv_sensing_mean',
    '1606': 'mdc_idc_msmt_rv_pacing_threshold',
    '1620': 'mdc_idc_msmt_rv_pacing_threshold',
    '1607': 'mdc_idc_msmt_rv_pw',
    '2720': 'mdc_idc_msmt_lv_impedance_mean',
    '2723': 'mdc_idc_msmt_lv_sensing_mean',
    '1616': 'mdc_idc_msmt_lv_pacing_threshold',
    '3009': 'mdc_idc_msmt_lv_pacing_threshold',
    '1617': 'mdc_idc_msmt_lv_pw',
    // Tachy Settings
    // VT1
    '2103': 'VT1_detection_interval',
    '2320': 'VT1_therapy_1_atp',
    '2291': 'VT1_therapy_1_no_bursts',
    // '2321': 'VT1_therapy_2_cvrt',
    '2327': 'VT1_therapy_3_energy',
    // '2322': 'VT1_therapy_3_cvrt',
    '2329': 'VT1_therapy_4_energy',
    // '2323': 'VT1_therapy_5_cvrt',
    '2331': 'VT1_therapy_5_energy',
    '2323': 'VT1_therapy_5_max_num_shocks',
    // VT2
    '2102': 'VT2_detection_interval',
    '2354': 'VT2_therapy_1_atp',
    '2341': 'VT2_therapy_1_no_bursts',
    // '2355': 'VT2_therapy_3_cvrt',
    '2361': 'VT2_therapy_3_energy',
    // '2356': 'VT2_therapy_4_cvrt',
    '2363': 'VT2_therapy_4_energy',
    // '2357': 'VT2_therapy_5_cvrt',
    '2365': 'VT2_therapy_5_energy',
    '2357': 'VT2_therapy_5_max_num_shocks',
    //VF
    '2101': 'VF_detection_interval',
    '2387': 'VF_therapy_1_atp',
    '2392': 'VF_therapy_1_no_bursts',
    '2382': 'VF_therapy_2_energy',
    '2384': 'VF_therapy_3_energy',
    '2386': 'VF_therapy_4_energy',
    // '2388': 'VF_therapy_4_max_num_shocks', // doesn't exist in log?
  };

  lines.forEach(line => {
    const parts = line.split('\x1C').filter(Boolean);
    if (parts.length >= 2) {
      const code = parts[0];
      const value = parts[2];

      if (mappings[code] && value) {
        let processedValue = value.replace(/V|Ohm|%|bpm/g, '').trim();
        if (mappings[code] === 'VT2_therapy_5_max_num_shocks') {
        processedValue = processedValue.replace(/^CRT\s*/i, '').trim();
        }
        if (mappings[code] === 'VT1_therapy_5_max_num_shocks') {
        processedValue = processedValue.replace(/^CRT\s*/i, '').trim();
        }
      parsedData[mappings[code]] = processedValue;
      }
    }
  });

  // Process dates
  if (parsedData.report_date) {
    parsedData.report_date = new Date(parsedData.report_date).toISOString();
  }
  if (parsedData.mdc_idc_dev_ra_implant_date) {
    parsedData.mdc_idc_dev_ra_implant_date = new Date(parsedData.mdc_idc_dev_ra_implant_date).toISOString().split('T')[0];
  }
  if (parsedData.mdc_idc_dev_rv_implant_date) {
    parsedData.mdc_idc_dev_rv_implant_date = new Date(parsedData.mdc_idc_dev_rv_implant_date).toISOString().split('T')[0];
  }
  if (parsedData.mdc_idc_dev_lv_implant_date) {
    parsedData.mdc_idc_dev_lv_implant_date = new Date(parsedData.mdc_idc_dev_lv_implant_date).toISOString().split('T')[0];
  }
  if (parsedData.mdc_idc_dev_implant_date) {
    parsedData.mdc_idc_dev_implant_date = new Date(parsedData.mdc_idc_dev_implant_date).toISOString().split('T')[0];
  }
  if (parsedData.dob) {
    parsedData.dob = new Date(parsedData.dob).toISOString().split('T')[0];
  }

  parsedData.mdc_idc_dev_manufacturer = "Abbott";
  parsedData.VF_therapy_4_max_num_shocks = "x 4";
  console.log('Parsed log file:', parsedData);
  return parsedData;
}

function parseBnkFile(fileContent: string): ParsedData {
  const mappings: Record<string, string> = {
    'PatientFirstName': 'PatientFirstName',
    'PatientLastName': 'PatientLastName',
    'PatientBirthDay': 'PatientBirthDay',
    'PatientBirthMonth': 'PatientBirthMonth',
    'PatientBirthYear': 'PatientBirthYear',
    'SystemSerialNumber': 'mdc_idc_dev_serial_number',
    'SystemName': 'mdc_idc_dev_model',
    'PatientData.ImplantDay': 'ImplantDay',
    'PatientData.ImplantMonth': 'ImplantMonth',
    'PatientData.ImplantYear': 'ImplantYear',
    'PatientLeadASerialNum': 'mdc_idc_dev_ra_serial_number',
    'PatientLeadAManufacturer': 'mdc_idc_dev_ra_manufacturer',
    'PatientLeadAModelNum': 'mdc_idc_dev_ra_model',
    'PatientData.LeadA.ImplantMonth': 'lead_ra_ImplantMonth',
    'PatientData.LeadA.ImplantYear': 'lead_ra_ImplantYear',
    'PatientLeadV1SerialNum': 'mdc_idc_dev_rv_serial_number',
    'PatientLeadV1Manufacturer': 'mdc_idc_dev_rv_manufacturer',
    'PatientLeadV1ModelNum': 'mdc_idc_dev_rv_model',
    'PatientData.Lead1.ImplantMonth': 'lead_1_ImplantMonth',
    'PatientData.Lead1.ImplantYear': 'lead_1_ImplantYear',
    'PatientLeadV2SerialNum': 'mdc_idc_dev_lv_serial_number',
    'PatientLeadV2Manufacturer': 'mdc_idc_dev_lv_manufacturer',
    'PatientLeadV2ModelNum': 'mdc_idc_dev_lv_model',
    'PatientData.Lead2.ImplantMonth': 'lead_2_ImplantMonth',
    'PatientData.Lead2.ImplantYear': 'lead_2_ImplantYear',
    'BdyNormBradyMode': 'mdc_idc_set_brady_mode',
    'NormParams.LRLIntvl': 'mdc_idc_set_brady_lowrate',
    'NormParams.MTRIntvl': 'mdc_idc_set_brady_max_tracking_rate',
    'NormParams.MSRIntvl': 'mdc_idc_set_brady_max_sensor_rate',
    'BatteryStatus.BatteryPhase': 'mdc_idc_batt_status',
    'BatteryLongevityParams.RemainingBatteryPercent': '',
    'BatteryLongevityParams.TimeToERI': 'mdc_idc_batt_remaining',
    'CapformChargeTime': 'mdc_idc_cap_charge_time',
    'ManualLeadImpedData.RAMsmt.Msmt': 'mdc_idc_msmt_ra_impedance_mean',
    'ManualIntrinsicResult.RAMsmt.Msmt': 'mdc_idc_msmt_ra_sensing_mean',
    'InterPaceThreshResult.RAMsmt.Amplitude': 'mdc_idc_msmt_ra_pacing_threshold',
    'InterPaceThreshResult.RAMsmt.PulseWidth': 'mdc_idc_msmt_ra_pw',
    'ManualLeadImpedData.RVMsmt.Msmt': 'mdc_idc_msmt_rv_impedance_mean',
    'ManualIntrinsicResult.RVMsmt.Msmt': 'mdc_idc_msmt_rv_sensing_mean',
    'InterPaceThreshResult.RVMsmt.Amplitude': 'mdc_idc_msmt_rv_pacing_threshold',
    'InterPaceThreshResult.RVMsmt.PulseWidth': 'mdc_idc_msmt_rv_pw',
    'ManualLeadImpedData.LVMsmt.Msmt': 'mdc_idc_msmt_lv_impedance_mean',
    'ManualIntrinsicResult.LVMsmt.Msmt': 'mdc_idc_msmt_lv_sensing_mean',
    'InterPaceThreshResult.LVMsmt.Amplitude': 'mdc_idc_msmt_lv_pacing_threshold',
    'InterPaceThreshResult.LVMsmt.PulseWidth': 'mdc_idc_msmt_lv_pw',
    'ShockImpedanceLastMeas0': '',
    'ShockImpedanceLastMeas1': '',
    // Tachy Settings
    // VT1 Settings
    'DetectVT1Interval': 'VT1_detection_interval',
    'VT1ATP1NumberOfBursts': 'VT1_therapy_1_no_bursts',
    'VT1ATP2NumberOfBursts': 'VT1_therapy_2_no_bursts',
    'VT1Shock1Energy': 'VT1_therapy_3_energy',
    'VT1Shock2Energy': 'VT1_therapy_4_energy',
    'VT1MaxShockEnergy': 'VT1_therapy_5_energy',
    'VTachyConstParam.VThpySelection.MaxNumShocks[VT1Zone]': '',

    // VT2 Settings
    'DetectVTInterval': 'VT2_detection_interval',
    'VTATP1NumberOfBursts': 'VT2_therapy_1_no_bursts',
    'VTATP2NumberOfBursts': 'VT2_therapy_2_no_bursts',
    'VTShock1Energy': 'VT2_therapy_3_energy',
    'VTShock2Energy': 'VT2_therapy_4_energy',
    'VTherapyParams.VTMaxShockEnergy': 'VT2_therapy_5_energy',
    'VTachyConstParam.VThpySelection.MaxNumShocks[VTZone]': '',

    // VF Settings
    'DetectVFInterval': 'VF_detection_interval',
    'VTherapyParams.VFATPEnable': '',
    'VFShock1Energy': 'VF_therapy_2_energy',
    'VFShock2Energy': 'VF_therapy_3_energy',
    // 'VFShock3Energy': 'VF_therapy_4_energy', // doesnt exist in BNK?
    'VTachyConstParam.VThpySelection.MaxNumShocks[VFZone]': '',
  };

  const lines = fileContent.split('\n');
  const result: ParsedData = {};
  const rawData: { [key: string]: string } = {}; // Temporary object to hold all key-value pairs

  // First, parse the entire file into the rawData object
  lines.forEach(line => {
    if (!line.startsWith('#')) {
      const parts = line.split(',');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(',').trim(); // Handle values that might contain commas
        rawData[key] = value;
      }
    }
  });

  // Now, process the mappings for simple one-to-one value assignments
  for (const key in mappings) {
    if (rawData[key] && mappings[key]) {
      let processedValue = rawData[key];
      processedValue = processedValue
        .replace(/V|\bohms|Ohm|mV|ms|%|bpm/gi, '')
        .trim();
      result[mappings[key]] = processedValue;
    }
  }

  // Process header date
  const headerLine = lines[0];
  const dateMatch = headerLine.match(/SAVE DATE:\s*(\d+\s+\w+\s+\d{4})/);
  if (dateMatch) {
    const dateStr = dateMatch[1];
    result.report_date = new Date(dateStr).toISOString();
  }

  if (rawData['VTherapyParams.VFATPEnable']){
    const v = rawData['VTherapyParams.VFATPEnable']?.trim();
    result.VF_therapy_1_atp = v && v !== '--' ? 'ATP' : 'Off';
  }
  if (rawData['VT1ATP1NumberOfBursts']) {
    result.VT1_therapy_1_atp = "ATP";
  }
  if (rawData['VT1ATP2NumberOfBursts']) {
    result.VT1_therapy_2_atp = "ATP";
  }
  if (rawData['VTATP1NumberOfBursts']) {
    result.VT2_therapy_1_atp = "ATP";
  }
  if (rawData['VTATP2NumberOfBursts']) {
    result.VT2_therapy_2_atp = "ATP";
  }

  if (rawData['VFShock2Energy'] && parseInt(rawData['VFShock2Energy'], 10) > 0) {
    result.VF_therapy_4_energy = "41.0 J";
  }

  // Helper function to safely parse a value to a number, defaulting to 0
  const getNumber = (valOrKey: string): number => {
    const fromMap = rawData[valOrKey];
    const value = fromMap !== undefined ? fromMap : valOrKey;
    const num = parseInt(String(value), 10);
    return isNaN(num) ? 0 : num;
  };
  // Replaces `isPresent`
  const isActiveValue = (value: unknown): 1 | 0 => {
    if (typeof value !== 'string') return 0;
    return value.trim().toLowerCase() !== 'off' ? 1 : 0;
  };

  // If the first shock therapy is active, calculate the remaining shocks.
  const vt1Shock1Present = isActiveValue(rawData['VT1Shock1Energy']);
  const vt1Shock2Present = isActiveValue(rawData['VT1Shock2Energy']);
  if (vt1Shock1Present === 0 && vt1Shock2Present === 0) {
    result['VT1_therapy_5_max_num_shocks'] = 'off';
  } else {
    const vt1TotalShocks = getNumber(rawData['VTachyConstParam.VThpySelection.MaxNumShocks[VT1Zone]']);
    result['VT1_therapy_5_max_num_shocks'] = (vt1TotalShocks - (vt1Shock1Present + vt1Shock2Present)).toString();
  }


  // Calculate remaining shocks for VT2 Zone (Note: key is VTZone)
  const vtShock1Present = isActiveValue(rawData['VTShock1Energy']);
  const vtShock2Present = isActiveValue(rawData['VTShock2Energy']);

  if (vtShock1Present === 0 && vtShock2Present === 0) {
    result['VT2_therapy_5_max_num_shocks'] = 'Off';
  } else {
    const vtTotalShocks = getNumber(rawData['VTachyConstParam.VThpySelection.MaxNumShocks[VTZone]']);
    result['VT2_therapy_5_max_num_shocks'] = (vtTotalShocks - (vtShock1Present + vtShock2Present)).toString();
  }


  // Calculate remaining shocks for VF Zone
  const vfShock1Present = isActiveValue(rawData['VFShock1Energy']);
  const vfShock2Present = isActiveValue(rawData['VFShock2Energy']);

  if (vfShock1Present === 0 && vfShock2Present === 0) {
    result['VF_therapy_4_max_num_shocks'] = 'off';
  } else {
    const vfTotalShocks = getNumber(rawData['VTachyConstParam.VThpySelection.MaxNumShocks[VFZone]']);
    result['VF_therapy_4_max_num_shocks'] = (vfTotalShocks - (vfShock1Present + vfShock2Present)).toString();
  }

  //if  ShockImpedanceLastMeas0 is empty, use ShockImpedanceLastMeas1
  if (rawData['ShockImpedanceLastMeas0']) {
    result.mdc_idc_msmt_hv_impedance_mean = rawData['ShockImpedanceLastMeas0'].replace(/V|\bohms|Ohm|mV|ms|%|bpm/gi, '').trim();
  } else if (rawData['ShockImpedanceLastMeas1']) {
    result.mdc_idc_msmt_hv_impedance_mean = rawData['ShockImpedanceLastMeas1'].replace(/V|\bohms|Ohm|mV|ms|%|bpm/gi, '').trim();
  }

  // Process implant dates
  if (result.ImplantDay && result.ImplantMonth && result.ImplantYear) {
    const monthNum = monthNameToNumber[result.ImplantMonth as string];
    result.mdc_idc_dev_implant_date = `${result.ImplantYear}-${monthNum}-${result.ImplantDay}`;
  }

  // Process patient name and DOB
  if (result.PatientFirstName && result.PatientLastName) {
    result.name = `${result.PatientFirstName} ${result.PatientLastName}`;
  }

  if (result.PatientBirthDay && result.PatientBirthMonth && result.PatientBirthYear) {
    const birthMonth = monthNameToNumber[result.PatientBirthMonth as string];
    const birthDay = String(result.PatientBirthDay).padStart(2, '0');
    const birthMonthPadded = String(birthMonth).padStart(2, '0');
    result.dob = `${result.PatientBirthYear}-${birthMonthPadded}-${birthDay}`;
  }

  result.mdc_idc_dev_manufacturer = "Boston Scientific";
  result.VF_therapy_4_energy = "41 J";
  if (result.mdc_idc_batt_status === "Beginning of Life") {
    result.mdc_idc_batt_status = 'BOL';
  }

  if (result.mdc_idc_batt_remaining) {
    result.mdc_idc_batt_remaining = Math.floor(parseInt(result.mdc_idc_batt_remaining.replace(/months?/i, '').trim()) / 12).toString();
  }
  // Convert rates and thresholds
  if (result.mdc_idc_set_brady_lowrate) {
    result.mdc_idc_set_brady_lowrate = msToBpm(result.mdc_idc_set_brady_lowrate).toString();
  }
  if (result.mdc_idc_set_brady_max_tracking_rate) {
    result.mdc_idc_set_brady_max_tracking_rate = msToBpm(result.mdc_idc_set_brady_max_tracking_rate).toString();
  }
  if (result.mdc_idc_set_brady_max_sensor_rate) {
    result.mdc_idc_set_brady_max_sensor_rate = msToBpm(result.mdc_idc_set_brady_max_sensor_rate).toString();
  }
  if (result.mdc_idc_msmt_ra_pacing_threshold) {
    result.mdc_idc_msmt_ra_pacing_threshold = convertThreshold(result.mdc_idc_msmt_ra_pacing_threshold).toString();
  }
  if (result.mdc_idc_msmt_rv_pacing_threshold) {
    result.mdc_idc_msmt_rv_pacing_threshold = convertThreshold(result.mdc_idc_msmt_rv_pacing_threshold).toString();
  }
  if (result.mdc_idc_msmt_lv_pacing_threshold) {
    result.mdc_idc_msmt_lv_pacing_threshold = convertThreshold(result.mdc_idc_msmt_lv_pacing_threshold).toString();
  }



  console.log('Parsed BNK file:', result);
  return result;
}


function parseXmlFile(fileContent: string): ParsedData {
  const result: ParsedData = {};

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });

  const jsonObj = parser.parse(fileContent);
  const sections = jsonObj['biotronik-ieee11073-export'].dataset.section;
  const mdcSection = Array.isArray(sections) ? sections.find((s: any) => s['@_name'] === 'MDC') : sections;

  if (!mdcSection) {
    throw new Error('MDC section not found in XML');
  }
  const idcSection = mdcSection.section.find((s: any) => s['@_name'] === 'IDC');
  if (!idcSection) {
    throw new Error('IDC section not found in XML');
  }
  // --- This is the helper function ---
  // It safely finds a <value> tag within a <section> by its name attribute,
  // regardless of whether there is one <value> (object) or many (array).
  const asArray = (x: any) => (Array.isArray(x) ? x : x ? [x] : []);
  const findSection = (parent: any, name: string): any | undefined => {
    if (!parent) return undefined;
    const secs = asArray(parent.section);
    return secs.find((s: any) => s['@_name'] === name);
  };
  const findSections = (parent: any, name: string): any[] => {
    const secs = asArray(parent?.section);
    return secs.filter((s: any) => s['@_name'] === name);
  };
  const findValue = (section: any, name: string): string | undefined => {
    const vals = asArray(section?.value);
    const node = vals.find((v: any) => v['@_name'] === name);
    return node?.['#text'];
  };

  // Parse patient information
  const attrSection = mdcSection.section.find((s: any) => s['@_name'] === 'ATTR');
  console.log('attrSection', attrSection);
  if (attrSection && attrSection.section) {
    const ptSection = Array.isArray(attrSection.section)
      ? attrSection.section.find((s: any) => s['@_name'] === 'PT')
      : attrSection.section;

    if (ptSection && ptSection.value) {
      const nameGiven = ptSection.value.find((v: any) => v['@_name'] === 'NAME_GIVEN');
      const nameFamily = ptSection.value.find((v: any) => v['@_name'] === 'NAME_FAMILY');
      const dobValue = ptSection.value.find((v: any) => v['@_name'] === 'DOB');

      if (nameGiven && nameFamily) {
        result.name = `${nameGiven['#text']} ${nameFamily['#text']}`;
      }

      if (dobValue) {
        const dobString = String(dobValue['#text']);
        const year = dobString.slice(0, 4);
        const month = dobString.slice(4, 6);
        const day = dobString.slice(6, 8);
        result.dob = `${year}-${month}-${day}`;
      }
    }
  }

  // Parse device information
  const devSection = idcSection.section.find((s: any) => s['@_name'] === 'DEV');
  if (devSection && devSection.value) {
    console.log('devSection', devSection);
    devSection.value.forEach((value: any) => {
      if (value['@_name'] === 'MODEL') {
        result.mdc_idc_dev_model = value['#text'];
      }
      if (value['@_name'] === 'SERIAL') {
        result.mdc_idc_dev_serial_number = value['#text'];
      }
      if (value['@_name'] === 'MFG') {
        result.mdc_idc_dev_manufacturer = value['#text'];
      }
      if (value['@_name'] === 'IMPLANT_DT') {
        const implantDate = value['#text'];
        if (implantDate) {
          const date = new Date(implantDate.replace(/(\d{4})(\d{2})(\d{2})T.*/, '$1-$2-$3'));
          result.mdc_idc_dev_implant_date = date.toISOString().split('T')[0];
        }
      }
    });
  }

  // Parse session information
  const sessSection = idcSection.section.find((s: any) => s['@_name'] === 'SESS');
  if (sessSection && sessSection.value) {
    console.log('sessSection', sessSection);
    const dtmValue = sessSection.value.find((v: any) => v['@_name'] === 'DTM');
    if (dtmValue) {
      const dateStr = dtmValue['#text'];
      const date = new Date(dateStr.replace(/(\d{4})(\d{2})(\d{2})T.*/, '$1-$2-$3'));
      result.report_date = date.toISOString().split('T')[0];
    }
  }

  // Parse lead information
  const leadSections = idcSection.section.filter((s: any) => s['@_name'] === 'LEAD');
  if (leadSections.length > 0) {
    leadSections.forEach((lead: any) => {
      if (!lead.value) return;

      const locationValue = lead.value.find((v: any) => v['@_name'] === 'LOCATION');
      if (!locationValue) return;

      const location = locationValue['#text'];
      const modelValue = lead.value.find((v: any) => v['@_name'] === 'MODEL');
      const serialValue = lead.value.find((v: any) => v['@_name'] === 'SERIAL');
      const mfgValue = lead.value.find((v: any) => v['@_name'] === 'MFG');
      const implantValue = lead.value.find((v: any) => v['@_name'] === 'IMPLANT_DT');

      if (location === 'RA') {
        result.mdc_idc_dev_ra_model = modelValue?.['#text'] || '';
        result.mdc_idc_dev_ra_serial_number = serialValue?.['#text'] || '';
        result.mdc_idc_dev_ra_manufacturer = mfgValue?.['#text'] || '';
        if (implantValue?.['#text']) {
          const dateStr = String(implantValue['#text']);
          const dateOnly = dateStr.slice(0, 8);
          const year = dateOnly.slice(0, 4);
          const month = dateOnly.slice(4, 6);
          const day = dateOnly.slice(6, 8);
          result.mdc_idc_dev_ra_implant_date = `${year}-${month}-${day}`;
        }
      } else if (location === 'RV') {
        result.mdc_idc_dev_rv_model = modelValue?.['#text'] || '';
        result.mdc_idc_dev_rv_serial_number = serialValue?.['#text'] || '';
        result.mdc_idc_dev_rv_manufacturer = mfgValue?.['#text'] || '';
        if (implantValue?.['#text']) {
          const dateStr = String(implantValue['#text']);
          const dateOnly = dateStr.slice(0, 8);
          const year = dateOnly.slice(0, 4);
          const month = dateOnly.slice(4, 6);
          const day = dateOnly.slice(6, 8);
          result.mdc_idc_dev_rv_implant_date = `${year}-${month}-${day}`;
        }
      } else if (location === 'LV') {
        result.mdc_idc_dev_lv_model = modelValue?.['#text'] || '';
        result.mdc_idc_dev_lv_serial_number = serialValue?.['#text'] || '';
        result.mdc_idc_dev_lv_manufacturer = mfgValue?.['#text'] || '';
        if (implantValue?.['#text']) {
          const dateStr = String(implantValue['#text']);
          const dateOnly = dateStr.slice(0, 8);
          const year = dateOnly.slice(0, 4);
          const month = dateOnly.slice(4, 6);
          const day = dateOnly.slice(6, 8);
          result.mdc_idc_dev_lv_implant_date = `${year}-${month}-${day}`;
        }
      }
    });
  }
  // Get STAT section
  const statSection = idcSection.section.find((s: any) => s['@_name'] === 'STAT');
  if (statSection && statSection.section) {
    console.log('statSection', statSection);
    const bradySection = statSection.section.find((v: any) => v['@_name'] === 'BRADY');

    if (bradySection && bradySection.value) {
      // Check for traditional pacing values first
      const raPaced = bradySection.value.find((v: any) => v['@_name'] === 'RA_PERCENT_PACED');
      const rvPaced = bradySection.value.find((v: any) => v['@_name'] === 'RV_PERCENT_PACED');

      // Check for AP/AS values
      const apVp = bradySection.value.find((v: any) => v['@_name'] === 'AP_VP_PERCENT');
      const apVs = bradySection.value.find((v: any) => v['@_name'] === 'AP_VS_PERCENT');
      const asVp = bradySection.value.find((v: any) => v['@_name'] === 'AS_VP_PERCENT');

      // Calculate RA pacing
      if (raPaced) {
        result.mdc_idc_stat_brady_ra_percent_paced = raPaced['#text'];
      } else if (apVp && apVs) {
        const apVpValue = parseFloat(apVp['#text'] || 0);
        const apVsValue = parseFloat(apVs['#text'] || 0);
        result.mdc_idc_stat_brady_ra_percent_paced = (apVpValue + apVsValue).toString();
      } else {
        result.mdc_idc_stat_brady_ra_percent_paced = '';
      }

      // Calculate RV pacing
      if (rvPaced) {
        result.mdc_idc_stat_brady_rv_percent_paced = rvPaced['#text'];
      } else if (apVp && asVp) {
        const apVpValue = parseFloat(apVp['#text'] || 0);
        const asVpValue = parseFloat(asVp['#text'] || 0);
        result.mdc_idc_stat_brady_rv_percent_paced = (apVpValue + asVpValue).toString();
      } else {
        result.mdc_idc_stat_brady_rv_percent_paced = '';
      }
    }
  }
  // Get AT section
  const atSection = statSection.section.find((v: any) => v['@_name'] === 'AT');
  if (atSection && atSection.value) {
    atSection.value.forEach((value: any) => {
      if (value['@_name'] === 'BURDEN_PERCENT') {
        result.mdc_idc_stat_ataf_burden_percent = value['#text'];
      }
      if (value['@_name'] === 'MODE_SW_COUNT') {
        result.mdc_idc_stat_ataf_count = value['#text'];
      }
    });
  }
  // Get CRT section
  const crtSection = statSection.section.find((v: any) => v['@_name'] === 'CRT');
  if (crtSection && crtSection.value) {
    crtSection.value.forEach((value: any) => {
      if (value['@_name'] === 'LV_PERCENT_PACED') {
        result.mdc_idc_stat_brady_lv_percent_paced = (value['#text']);
      }
      if (value['@_name'] === 'PERCENT_PACED') {
        result.mdc_idc_stat_brady_biv_percent_paced = value['#text'];
      }
    });
  }
  // Get TACHY section
  const tachySection = statSection.section.find((v: any) => v['@_name'] === 'TACHYTHERAPY');
  if (tachySection && tachySection.value) {
    tachySection.value.forEach((value: any) => {
      if (value['@_name'] === 'ATP_DELIVERED_RECENT') {
        result.mdc_idc_stat_atp_delivered_recent = value['#text'];
      }
      if (value['@_name'] === 'SHOCKS_DELIVERED_RECENT') {
        result.mdc_idc_stat_shocks_delivered_recent = value['#text'];
      }
    });
  }

  // Get MSMT and BATT sections
  // const msmtSection = idcSection.section.find((s: any) => s['@_name'] === 'MSMT');
  // console.log('msmtSection', msmtSection);
  // if (msmtSection) {
  //   console.log('msmtSection', msmtSection);
  //   const battSection = msmtSection.section.find((s: any) => s['@_name'] === 'BATTERY');
  //   if (battSection && battSection.value) {
  //     battSection.value.forEach((value: any) => {
  //       if (value['@_name'] === 'STATUS') {
  //         result.mdc_idc_batt_status = value['#text'];
  //       }
  //       if (value['@_name'] === 'REMAINING_PERCENTAGE') {
  //         result.mdc_idc_batt_percentage = value['#text'];
  //       }
  //     });
  //   }

  //   // Get RA section
  //   const leadchnl_ra = msmtSection?.section?.find((s: any) => s['@_name'] === 'LEADCHNL_RA');
  //   if (leadchnl_ra && leadchnl_ra.section) {
  //     console.log('leadchnl_ra', leadchnl_ra);
  //     // Get SENSING values
  //     const sensingSection = Array.isArray(leadchnl_ra?.section)
  //       ? leadchnl_ra.section.find((s: any) => s['@_name'] === 'SENSING')
  //       : leadchnl_ra.section;
  //     if (sensingSection?.value) {
  //       const sensingValue = Array.isArray(sensingSection.value)
  //         ? sensingSection.value.find((v: any) => v['@_name'] === 'INTR_AMPL_MEAN')
  //         : sensingSection.value;
  //       result.mdc_idc_msmt_ra_sensing_mean = sensingValue?.['#text'] || '';
  //     } else {
  //       result.mdc_idc_msmt_ra_sensing_mean = '';
  //     }
  //     // Get PACING_THRESHOLD values
  //     const pacingSection = Array.isArray(leadchnl_ra?.section)
  //       ? leadchnl_ra.section.find((s: any) => s['@_name'] === 'PACING_THRESHOLD')
  //       : leadchnl_ra?.section?.['@_name'] === 'PACING_THRESHOLD' ? leadchnl_ra.section : null;

  //     if (pacingSection?.value) {
  //       const amplitudeValue = Array.isArray(pacingSection.value)
  //         ? pacingSection.value.find((v: any) => v['@_name'] === 'AMPLITUDE')
  //         : pacingSection.value;
  //       result.mdc_idc_msmt_ra_pacing_threshold = amplitudeValue?.['#text'] || '';

  //       const pulsewidthValue = Array.isArray(pacingSection.value)
  //         ? pacingSection.value.find((v: any) => v['@_name'] === 'PULSEWIDTH')
  //         : pacingSection.value;
  //       result.mdc_idc_msmt_ra_pw = pulsewidthValue?.['#text'] || '';
  //     } else {
  //       result.mdc_idc_msmt_ra_pacing_threshold = '';
  //       result.mdc_idc_msmt_ra_pw = '';
  //     }
  //     // Get IMPEDANCE values
  //     const impedanceSection = Array.isArray(leadchnl_ra?.section)
  //       ? leadchnl_ra.section.find((s: any) => s['@_name'] === 'IMPEDANCE')
  //       : leadchnl_ra.section;
  //     if (impedanceSection?.value) {
  //       const impedanceValue = Array.isArray(impedanceSection.value)
  //         ? impedanceSection?.value?.find((v: any) => v['@_name'] === 'VALUE')
  //         : impedanceSection?.value;
  //       result.mdc_idc_msmt_ra_impedance_mean = impedanceValue['#text'];
  //     } else {
  //       result.mdc_idc_msmt_ra_impedance_mean = '';
  //     }
  //   };

  //   // Get LEADCHNL_RV section
  //   const leadchnl_rv = msmtSection?.section?.find((s: any) => s['@_name'] === 'LEADCHNL_RV');
  //   if (leadchnl_rv && leadchnl_rv.section) {
  //     console.log('leadchnl_rv', leadchnl_rv);
  //     // Get SENSING values
  //     const sensingSection = Array.isArray(leadchnl_rv?.section)
  //       ? leadchnl_rv.section.find((s: any) => s['@_name'] === 'SENSING')
  //       : leadchnl_rv.section;
  //     if (sensingSection && sensingSection.value) {
  //       const sensingValue = Array.isArray(sensingSection?.value)
  //         ? sensingSection.value.find((v: any) => v['@_name'] === 'INTR_AMPL_MEAN')
  //         : sensingSection?.value;
  //       if (sensingValue) {
  //         result.mdc_idc_msmt_rv_sensing_mean = sensingValue?.['#text'] || '';
  //       }
  //     }
  //     // Get PACING_THRESHOLD values
  //     const pacingSection = Array.isArray(leadchnl_rv?.section)
  //       ? leadchnl_rv.section.find((s: any) => s['@_name'] === 'PACING_THRESHOLD')
  //       : leadchnl_rv?.section?.['@_name'] === 'PACING_THRESHOLD' ? leadchnl_rv.section : null;;
  //     if (pacingSection?.value) {
  //       const amplitudeValue = pacingSection?.value?.find((v: any) => v['@_name'] === 'AMPLITUDE');
  //       const pulsewidthValue = pacingSection?.value?.find((v: any) => v['@_name'] === 'PULSEWIDTH');
  //       if (amplitudeValue) {
  //         result.mdc_idc_msmt_rv_pacing_threshold = amplitudeValue['#text'];
  //       }
  //       if (pulsewidthValue) {
  //         result.mdc_idc_msmt_rv_pw = pulsewidthValue['#text'];
  //       }
  //       // Get IMPEDANCE values
  //       const impedanceSection = leadchnl_rv?.section?.find((s: any) => s['@_name'] === 'IMPEDANCE');
  //       if (impedanceSection && impedanceSection.value) {
  //         const impedanceValue = impedanceSection?.value?.find((v: any) => v['@_name'] === 'VALUE');
  //         if (impedanceValue) {
  //           result.mdc_idc_msmt_rv_impedance_mean = impedanceValue['#text'];
  //         }
  //       }
  //     }
  //   }
  //   // Get LEADCHNL_LV section
  //   const leadchnl_lv = Array.isArray(msmtSection?.section)
  //     ? msmtSection?.section?.find((s: any) => s['@_name'] === 'LEADCHNL_LV')
  //     : msmtSection?.section?.['@_name'] === 'LEADCHNL_LV' ? msmtSection?.section : null;
  //   if (leadchnl_lv?.value) {
  //     const pacingSection = leadchnl_lv?.section?.find((s: any) => s['@_name'] === 'PACING_THRESHOLD');
  //     if (pacingSection?.value) {
  //       const amplitudeValue = pacingSection?.value?.find((v: any) => v['@_name'] === 'AMPLITUDE');
  //       const pulsewidthValue = pacingSection?.value?.find((v: any) => v['@_name'] === 'PULSEWIDTH');

  //       result.mdc_idc_msmt_lv_pacing_threshold = amplitudeValue ? amplitudeValue['#text'] : '';
  //       result.mdc_idc_msmt_lv_pw = pulsewidthValue ? pulsewidthValue['#text'] : '';
  //     }

  //     const impedanceSection = leadchnl_lv?.section?.find((s: any) => s['@_name'] === 'IMPEDANCE');
  //     if (impedanceSection?.value) {
  //       const impedanceValue = impedanceSection.value.find((v: any) => v['@_name'] === 'VALUE');
  //       result.mdc_idc_msmt_lv_impedance_mean = impedanceValue ? impedanceValue['#text'] : '';
  //     }
  //   }

  //   // Get LEADHVCHNL section
  //   const leadhvchnl = msmtSection?.section?.find((s: any) => s['@_name'] === 'LEADHVCHNL');
  //   if (leadhvchnl) {
  //     // Get HV IMPEDANCE values
  //     const leadhvchnlValue = leadhvchnl.value.find((v: any) => v['@_name'] === 'IMPEDANCE');
  //     result.mdc_idc_msmt_hv_impedance_mean = leadhvchnlValue['#text'];
  //   }
  //   // STAT section
  //   const setSection = idcSection.section.find((s: any) => s['@_name'] === 'SET');
  //   if (setSection?.section) {
  //     console.log('setSection', setSection);
  //     const bradySection = setSection.section.find((s: any) => s['@_name'] === 'BRADY');
  //     if (bradySection) {
  //       const bradyValue = bradySection.value.find((v: any) => v['@_name'] === 'LOWRATE');
  //       result.mdc_idc_set_brady_lowrate = bradyValue ? bradyValue['#text'] : '';
  //       const modeValue = bradySection.value.find((v: any) => v['@_name'] === 'VENDOR_MODE');
  //       result.mdc_idc_set_brady_mode = modeValue ? modeValue['#text'] : '';
  //       const trackingRateValue = bradySection.value.find((v: any) => v['@_name'] === 'MAX_TRACKING_RATE');
  //       result.mdc_idc_set_brady_max_tracking_rate = trackingRateValue ? trackingRateValue['#text'] : '';
  //       const sensorRateValue = bradySection.value.find((v: any) => v['@_name'] === 'MAX_SENSOR_RATE');
  //       result.mdc_idc_set_brady_max_sensor_rate = sensorRateValue ? sensorRateValue['#text'] : '';
  //       const modeSwitchRate = bradySection.value.find((v: any) => v['@_name'] === 'AT_MODE_SWITCH_RATE');
  //       result.mdc_idc_set_brady_mode_switch_rate = modeSwitchRate ? modeSwitchRate['#text'] : '';
  //     }
  //     // Parse TACHYTHERAPY settings
  //     const tachyTherapySection = setSection.section.find((s: any) => s['@_name'] === 'TACHYTHERAPY');
  //     const isTachyOn = findValue(tachyTherapySection, 'VSTAT') === 'On';
  //     if (isTachyOn) {
  //       console.log('Tachytherapy is enabled');
  //       const zoneSections = setSection.section.filter((s: any) => s['@_name'] === 'ZONE');

  //       zoneSections.forEach((zone: any) => {
  //         const vendorType = findValue(zone, 'VENDOR_TYPE');

  //         switch (vendorType) {
  //           case 'BIO-Zone_VT1':
  //             result.VT1_detection_interval = findValue(zone, 'DETECTION_INTERVAL');
  //             result.VT1_therapy_1_atp = findValue(zone, 'TYPE_ATP_1');
  //             result.VT1_therapy_1_no_bursts = findValue(zone, 'NUM_ATP_SEQS_1');
  //             result.VT1_therapy_2_atp = findValue(zone, 'TYPE_ATP_2');
  //             result.VT1_therapy_2_no_bursts = findValue(zone, 'NUM_ATP_SEQS_2');
  //             result.VT1_therapy_3_energy = findValue(zone, 'SHOCK_ENERGY_1');
  //             result.VT1_therapy_4_energy = findValue(zone, 'SHOCK_ENERGY_2');
  //             result.VT1_therapy_5_energy = findValue(zone, 'SHOCK_ENERGY_3');
  //             result.VT1_therapy_5_max_num_shocks = findValue(zone, 'MAX_NUM_SHOCKS_3');
  //             break;
  //           case 'BIO-Zone_VT2':
  //             result.VT2_detection_interval = findValue(zone, 'DETECTION_INTERVAL');
  //             result.VT2_therapy_1_atp = findValue(zone, 'TYPE_ATP_1');
  //             result.VT2_therapy_1_no_bursts = findValue(zone, 'NUM_ATP_SEQS_1');
  //             result.VT2_therapy_2_atp = findValue(zone, 'TYPE_ATP_2');
  //             result.VT2_therapy_2_no_bursts = findValue(zone, 'NUM_ATP_SEQS_2');
  //             result.VT2_therapy_3_energy = findValue(zone, 'SHOCK_ENERGY_1');
  //             result.VT2_therapy_4_energy = findValue(zone, 'SHOCK_ENERGY_2');
  //             result.VT2_therapy_5_energy = findValue(zone, 'SHOCK_ENERGY_3');
  //             result.VT2_therapy_5_max_num_shocks = findValue(zone, 'MAX_NUM_SHOCKS_3');
  //             break;
  //           case 'BIO-Zone_VF':
  //             result.VF_detection_interval = findValue(zone, 'DETECTION_INTERVAL');
  //             result.VF_therapy_1_atp = findValue(zone, 'TYPE_ATP_1');
  //             result.VF_therapy_1_energy = findValue(zone, 'SHOCK_ENERGY_1');
  //             result.VF_therapy_2_energy = findValue(zone, 'SHOCK_ENERGY_2');
  //             result.VF_therapy_3_energy = findValue(zone, 'SHOCK_ENERGY_3');
  //             result.VF_therapy_3_max_num_shocks = findValue(zone, 'NUM_SHOCKS_3');
  //             break;
  //         }
  //       });
  //     }
  //   }
  //   // return result;
  // }
 
  const msmtSection = findSection(idcSection, 'MSMT');
  console.log('msmtSection', msmtSection);
  if (msmtSection) {
    console.log('msmtSection', msmtSection);
  
    const battSection = findSection(msmtSection, 'BATTERY');
    if (battSection) {
      result.mdc_idc_batt_status = findValue(battSection, 'STATUS') || '';
      result.mdc_idc_batt_percentage = findValue(battSection, 'REMAINING_PERCENTAGE') || '';
    }
  
    // LEADCHNL_RA
    const leadchnl_ra = findSection(msmtSection, 'LEADCHNL_RA');
    if (leadchnl_ra) {
      console.log('leadchnl_ra', leadchnl_ra);
  
      const sensingSection = findSection(leadchnl_ra, 'SENSING');
      result.mdc_idc_msmt_ra_sensing_mean = findValue(sensingSection, 'INTR_AMPL_MEAN') || '';
  
      const pacingSection = findSection(leadchnl_ra, 'PACING_THRESHOLD');
      if (pacingSection) {
        result.mdc_idc_msmt_ra_pacing_threshold = findValue(pacingSection, 'AMPLITUDE') || '';
        result.mdc_idc_msmt_ra_pw = findValue(pacingSection, 'PULSEWIDTH') || '';
      } else {
        result.mdc_idc_msmt_ra_pacing_threshold = '';
        result.mdc_idc_msmt_ra_pw = '';
      }
  
      const impedanceSection = findSection(leadchnl_ra, 'IMPEDANCE');
      result.mdc_idc_msmt_ra_impedance_mean = findValue(impedanceSection, 'VALUE') || '';
    }
  
    // LEADCHNL_RV
    const leadchnl_rv = findSection(msmtSection, 'LEADCHNL_RV');
    if (leadchnl_rv) {
      console.log('leadchnl_rv', leadchnl_rv);
  
      const sensingSectionRV = findSection(leadchnl_rv, 'SENSING');
      result.mdc_idc_msmt_rv_sensing_mean = findValue(sensingSectionRV, 'INTR_AMPL_MEAN') || '';
  
      const pacingSectionRV = findSection(leadchnl_rv, 'PACING_THRESHOLD');
      if (pacingSectionRV) {
        result.mdc_idc_msmt_rv_pacing_threshold = findValue(pacingSectionRV, 'AMPLITUDE') || '';
        result.mdc_idc_msmt_rv_pw = findValue(pacingSectionRV, 'PULSEWIDTH') || '';
      }
  
      const impedanceSectionRV = findSection(leadchnl_rv, 'IMPEDANCE');
      result.mdc_idc_msmt_rv_impedance_mean = findValue(impedanceSectionRV, 'VALUE') || '';
    }
  
    // LEADCHNL_LV
    const leadchnl_lv = findSection(msmtSection, 'LEADCHNL_LV');
    if (leadchnl_lv) {
      const pacingSectionLV = findSection(leadchnl_lv, 'PACING_THRESHOLD');
      if (pacingSectionLV) {
        result.mdc_idc_msmt_lv_pacing_threshold = findValue(pacingSectionLV, 'AMPLITUDE') || '';
        result.mdc_idc_msmt_lv_pw = findValue(pacingSectionLV, 'PULSEWIDTH') || '';
      } else {
        result.mdc_idc_msmt_lv_pacing_threshold = '';
        result.mdc_idc_msmt_lv_pw = '';
      }
  
      const impedanceSectionLV = findSection(leadchnl_lv, 'IMPEDANCE');
      result.mdc_idc_msmt_lv_impedance_mean = findValue(impedanceSectionLV, 'VALUE') || '';
    }
  
    // LEADHVCHNL
    const leadhvchnl = findSection(msmtSection, 'LEADHVCHNL');
    if (leadhvchnl) {
      result.mdc_idc_msmt_hv_impedance_mean = findValue(leadhvchnl, 'IMPEDANCE') || '';
    }
  
    // SET
    const setSection = findSection(idcSection, 'SET');
    if (setSection) {
      console.log('setSection', setSection);
  
      const bradySection = findSection(setSection, 'BRADY');
      if (bradySection) {
        result.mdc_idc_set_brady_lowrate = findValue(bradySection, 'LOWRATE') || '';
        result.mdc_idc_set_brady_mode = findValue(bradySection, 'VENDOR_MODE') || '';
        result.mdc_idc_set_brady_max_tracking_rate = findValue(bradySection, 'MAX_TRACKING_RATE') || '';
        result.mdc_idc_set_brady_max_sensor_rate = findValue(bradySection, 'MAX_SENSOR_RATE') || '';
        result.mdc_idc_set_brady_mode_switch_rate = findValue(bradySection, 'AT_MODE_SWITCH_RATE') || '';
      }
  
      const tachyTherapySection = findSection(setSection, 'TACHYTHERAPY');
      const isTachyOn = findValue(tachyTherapySection, 'VSTAT') === 'On';
      if (isTachyOn) {
        console.log('Tachytherapy is enabled');
        const zoneSections = findSections(setSection, 'ZONE');
        zoneSections.forEach((zone: any) => {
          const vendorType = findValue(zone, 'VENDOR_TYPE');
          switch (vendorType) {
            case 'BIO-Zone_VT1':
              const VT1_active = findValue(zone, 'STATUS');
              result.VT1_active = VT1_active;
              if (VT1_active == "Active") {
                result.VT1_detection_interval = findValue(zone, 'DETECTION_INTERVAL');
                result.VT1_therapy_1_atp = findValue(zone, 'TYPE_ATP_1');
                result.VT1_therapy_1_no_bursts = findValue(zone, 'NUM_ATP_SEQS_1');
                result.VT1_therapy_2_atp = findValue(zone, 'TYPE_ATP_2');
                result.VT1_therapy_2_no_bursts = findValue(zone, 'NUM_ATP_SEQS_2');
                result.VT1_therapy_3_energy = findValue(zone, 'SHOCK_ENERGY_1');
                result.VT1_therapy_4_energy = findValue(zone, 'SHOCK_ENERGY_2');
                result.VT1_therapy_5_energy = findValue(zone, 'SHOCK_ENERGY_3');
                result.VT1_therapy_5_max_num_shocks = findValue(zone, 'NUM_SHOCKS_3');
              } else if (VT1_active === "Monitor"){
                result.VT1_detection_interval = findValue(zone, 'DETECTION_INTERVAL');
                result.VT1_therapy_1_atp = 'off';
                result.VT1_therapy_1_no_bursts = '';
                result.VT1_therapy_2_atp = 'off';
                result.VT1_therapy_2_no_bursts = '';
                result.VT1_therapy_3_energy = 'off';
                result.VT1_therapy_4_energy = 'off';
                result.VT1_therapy_5_energy = 'off';
                result.VT1_therapy_5_max_num_shocks = '';
              }
              break;
            case 'BIO-Zone_VT2':
              const VT2_active = findValue(zone, 'STATUS');
              result.VT2_active = VT2_active;
              if (VT2_active == "Active") {
                result.VT2_detection_interval = findValue(zone, 'DETECTION_INTERVAL');
                result.VT2_therapy_1_atp = findValue(zone, 'TYPE_ATP_1');
                result.VT2_therapy_1_no_bursts = findValue(zone, 'NUM_ATP_SEQS_1');
                result.VT2_therapy_2_atp = findValue(zone, 'TYPE_ATP_2');
                result.VT2_therapy_2_no_bursts = findValue(zone, 'NUM_ATP_SEQS_2');
                result.VT2_therapy_3_energy = findValue(zone, 'SHOCK_ENERGY_1');
                result.VT2_therapy_4_energy = findValue(zone, 'SHOCK_ENERGY_2');
                result.VT2_therapy_5_energy = findValue(zone, 'SHOCK_ENERGY_3');
                result.VT2_therapy_5_max_num_shocks = findValue(zone, 'NUM_SHOCKS_3');
              } else if ( VT2_active === "Monitor"){
                result.VT2_detection_interval = findValue(zone, 'DETECTION_INTERVAL');
                result.VT2_therapy_1_atp = 'off';
                result.VT2_therapy_1_no_bursts = '';
                result.VT2_therapy_2_atp = 'off';
                result.VT2_therapy_2_no_bursts = '';
                result.VT2_therapy_3_energy = 'off';
                result.VT2_therapy_4_energy = 'off';
                result.VT2_therapy_5_energy = 'off';
                result.VT2_therapy_5_max_num_shocks = '';
              }

              break;
            case 'BIO-Zone_VF':
              const VF_active = findValue(zone, 'STATUS');
              result.VF_active = VF_active;
              if (VF_active){
                result.VF_detection_interval = findValue(zone, 'DETECTION_INTERVAL');
                result.VF_therapy_1_atp = findValue(zone, 'TYPE_ATP_1');
                result.VF_therapy_2_energy = findValue(zone, 'SHOCK_ENERGY_1');
                result.VF_therapy_3_energy = findValue(zone, 'SHOCK_ENERGY_2');
                result.VF_therapy_4_energy = findValue(zone, 'SHOCK_ENERGY_3');
                result.VF_therapy_4_max_num_shocks = findValue(zone, 'NUM_SHOCKS_3');
              }
              break;
          }
        });
      }
    }
  }


  try {
    console.log('Attempting to extract embedded PDF from XML...');
    const bioSection = Array.isArray(sections) ? sections.find((s: any) => s['@_name'] === 'BIO') : sections;  
    console.log('bioSection', bioSection);

    // Use safe section finder to avoid .find on non-arrays
    const requestSection = findSection(bioSection, 'REQUEST');
    const reportsSection = findSection(requestSection, 'REPORTS');
    const statusReportSection = findSection(reportsSection, 'STATUS_REPORT');
    const idValue = statusReportSection.value.find((v: any) => v['@_name'] === 'ID');
    const embeddePdfvalue = statusReportSection.value.find((v: any) => v['@_name'] === 'CONTENT');
    const fileName = idValue['#text'].replace(/\s+/g, '') + '.pdf';
    if (idValue && typeof idValue['#text'] === 'string' && looksLikeBase64Pdf(embeddePdfvalue['#text'])) {
      result.embeddedPdfBase64 = embeddePdfvalue['#text'].replace(/\s+/g, ''); // strip whitespace/newlines
      result.embeddedPdfName = fileName
    }
    console.log('Extracted embedded PDF name:', result.embeddedPdfName);
    console.log('Extracted embedded PDF base64 length:', result.embeddedPdfBase64?.length);
  } catch (err) {
    console.error('Error extracting embedded PDF from XML', err);
  }
  console.log('Parsed XML file:', result);
  return result;
}


// Extract FileSpec bytes (and name) -> used for EmbeddedFiles/AF
function readFileSpec(dict: any): { name: string; bytes: Uint8Array | null } | null {
  if (!dict) return null
  const ef = dict.lookup?.(PDFName.of('EF'), PDFDict) ?? dict.get?.(PDFName.of('EF'))
  const fileNameObj = dict.get?.(PDFName.of('UF')) ?? dict.get?.(PDFName.of('F'))
  const name = pdfObjToString(fileNameObj) || 'attachment.xml'
  const fStream =
    ef?.lookup?.(PDFName.of('UF'), PDFStream) ??
    ef?.lookup?.(PDFName.of('F'), PDFStream) ??
    ef?.get?.(PDFName.of('UF')) ??
    ef?.get?.(PDFName.of('F'))
  const bytes = getStreamBytes(fStream)
  return { name, bytes }
}

// Walk the Names/EmbeddedFiles name tree and collect attachments
function extractFromEmbeddedFiles(pdfDoc: PDFDocument): { name: string; bytes: Uint8Array | null }[] {
  const out: { name: string; bytes: Uint8Array | null }[] = []
  const namesDict = (pdfDoc as any).catalog?.dict?.lookup?.(PDFName.of('Names'), PDFDict)
  const embeddedRoot = namesDict?.lookup?.(PDFName.of('EmbeddedFiles'), PDFDict)
  if (!embeddedRoot) return out

  const walk = (node: any) => {
    const names = node.lookup?.(PDFName.of('Names'), PDFArray)
    if (names) {
      for (let i = 0; i < names.size(); i += 2) {
        //const _key = names.get(i) // usually PDFString filename
        const fileSpec = names.get(i + 1)
        const spec = readFileSpec((pdfDoc as any).context?.lookup?.(fileSpec, PDFDict) ?? fileSpec)
        if (spec) out.push(spec)
      }
    }
    const kids = node.lookup?.(PDFName.of('Kids'), PDFArray)
    if (kids) {
      for (let i = 0; i < kids.size(); i++) {
        const kid = kids.get(i)
        const kidDict = (pdfDoc as any).context?.lookup?.(kid, PDFDict) ?? kid
        if (kidDict) walk(kidDict)
      }
    }
  }

  walk(embeddedRoot)
  return out
}

// Extract from Associated Files (AF) on the Catalog (and optionally pages)
function extractFromAF(pdfDoc: PDFDocument): { name: string; bytes: Uint8Array | null }[] {
  const out: { name: string; bytes: Uint8Array | null }[] = []
  const catalogDict = (pdfDoc as any).catalog?.dict
  const afArray = catalogDict?.lookup?.(PDFName.of('AF'), PDFArray)
  if (afArray) {
    for (let i = 0; i < afArray.size(); i++) {
      const specDict = (pdfDoc as any).context?.lookup?.(afArray.get(i), PDFDict)
      const spec = readFileSpec(specDict)
      if (spec) out.push(spec)
    }
  }
  return out
}

// Decode XML strings from attachments
function toXmlStrings(entries: { name: string; bytes: Uint8Array | null }[]): { name: string; xml: string }[] {
  const dec = new TextDecoder('utf-8', { fatal: false })
  const xmls: { name: string; xml: string }[] = []
  for (const e of entries) {
    if (!e.bytes) continue
    const text = dec.decode(e.bytes)
    // Heuristic: filename ends with .xml OR content contains an XML prolog/root tag
    if (e.name.toLowerCase().endsWith('.xml') || text.trimStart().startsWith('<?xml') || text.includes('<biotronik-ieee11073-export')) {
      xmls.push({ name: e.name, xml: text })
    }
  }
  return xmls
}


export async function parsePdfFile(file: File): Promise<ParsedData> {
  const arrayBuffer = await file.arrayBuffer()
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })

  const attachments = [
    ...extractFromEmbeddedFiles(pdfDoc),
    ...extractFromAF(pdfDoc),
  ]

  const xmls = toXmlStrings(attachments)

  // Return the first XML (and list) so you can parse/map later
  return {
    fileType: 'pdf',
    fileName: file.name,
    xmlFound: xmls.length > 0,
    embeddedXml: xmls[0]?.xml ?? null,
    embeddedXmlFiles: xmls, // [{ name, xml }]
  }
}