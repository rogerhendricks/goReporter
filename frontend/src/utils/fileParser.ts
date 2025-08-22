import { XMLParser } from 'fast-xml-parser';

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
  mdc_idc_set_brady_mode?: string;
  mdc_idc_set_brady_lowrate?: string;
  mdc_idc_set_brady_max_tracking_rate?: string;
  mdc_idc_set_brady_max_sensor_rate?: string;
  mdc_idc_set_brady_mode_switch_rate?: string;
  mdc_idc_dev_sav?: string;
  mdc_idc_dev_pav?: string;
  mdc_idc_stat_brady_ra_percent?: string;
  mdc_idc_stat_brady_rv_percent?: string;
  mdc_idc_stat_brady_lv_percent?: string;
  biv_percent_paced?: string;
  mdc_idc_batt_percentage: string;
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
  VT1_detection_interval?: string;
  VT1_therapy_1_atp?: string;
  VT1_therapy_1_no_bursts?: string;
  VT1_therapy_2_atp?: string;
  VT1_therapt_2_no_bursts?: string;
  VT1_therapy_3_cvrt?: string;
  VT1_therapy_3_energy?: string;
  VT1_therapy_4_cvrt?: string;
  VT1_therapy_4_energy?: string;
  VT1_therapy_5_cvrt?: string;
  VT1_therapy_5_energy?: string;
  VT1_therapy_5_max_num_shocks?: string;
  // VT2 Settings
  VT2_detection_interval?: string;
  VT2_therapy_1_atp?: string;
  VT2_therapy_1_no_bursts?: string;
  VT2_therapy_2_atp?: string;
  VT2_therapy_2_no_bursts?: string;
  VT2_therapy_3_cvrt?: string;
  VT2_therapy_3_energy?: string;
  VT2_therapy_4_cvrt?: string;
  VT2_therapy_4_energy?: string;
  VT2_therapy_5_cvrt?: string;
  VT2_therapy_5_energy?: string;
  VT2_therapy_5_max_num_shocks?: string;
  //  VF Settings
  VF_detection_interval?: string;
  VF_therapy_1_atp?: string;
  VF_therapy_2_energy?: string;
  VF_therapy_3_energy?: string;
  VF_therapy_4_energy?: string;
  VF_therapy_4_max_num_shocks?: string;
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
    '2682': 'mdc_idc_stat_brady_ra_percent',
    '2681': 'mdc_idc_stat_brady_rv_percent',
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
    '2291': 'VT1_no_bursts',
    '2321': 'VT1_therapy_2_cvrt',
    '2327': 'VT1_therapy_2_energy',
    '2322': 'VT1_therapy_3_cvrt',
    '2329': 'VT1_therapy_3_energy',
    '2323': 'VT1_therapy_4_cvrt',
    '2331': 'VT1_therapy_4_energy',
    // VT2
    '2102': 'VT2_detection_interval',
    '2354': 'VT2_therapy_1_atp',
    '2341': 'VT2_no_bursts',
    '2355': 'VT2_therapy_2_cvrt',
    '2361': 'VT2_therapy_2_energy',
    '2356': 'VT2_therapy_3_cvrt',
    '2363': 'VT2_therapy_3_energy',
    '2357': 'VT2_therapy_4_cvrt',
    '2365': 'VT2_therapy_4_energy',
    //VF
    '2101': 'VF_detection_interval',
    '2392': 'VF_therapy_1_atp',
    '2382': 'VF_therapy_1_energy',
    '2384': 'VF_therapy_2_energy',
    '2386': 'VF_therapy_3_energy',

  };

  lines.forEach(line => {
    const parts = line.split('\x1C').filter(Boolean);
    if (parts.length >= 2) {
      const code = parts[0];
      const value = parts[2];

      if (mappings[code] && value) {
        const processedValue = value.replace(/V|Ohm|%|bpm/g, '').trim();
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
    'BatteryLongevityParams.RemainingBatteryPercent' : '',
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
    // Tachy Settings
    // VT1 Settings
    'DetectVT1Interval': 'VT1_detection_interval',
    ' ': 'VT1_therapy_1_atp',
    'VT1ATP1NumberOfBursts': 'VT1_therapy_1_no_bursts',
    'VT1ATP2NumberOfBursts ': 'VT1_therapy_2_no_bursts',
    'VT1Shock1Energy': 'VT1_therapy_3_energy',
    'VT1Shock2Energy ': 'VT1_therapy_4_energy',
    'VTachyConstParam.VThpySelection.MaxNumShocks[VT1Zone]': 'VT1_therapy_5_max_num_shocks',

    // VT2 Settings
    'DetectVTInterval': 'VT2_detection_interval',
    'VTATP1NumberOfBursts ': 'VT2_therapy_1_no_bursts',
    'VTATP2NumberOfBursts': 'VT2_therapy_2_no_bursts',
    'VTShock1Energy': 'VT2_therapy_3_energy',
    'VTShock2Energy': 'VT2_therapy_4_energy',
    'VTMaxShockEnergy': 'VT2_therapy_5_energy',
    'VTachyConstParam.VThpySelection.MaxNumShocks[VTZone]': 'VT2_therapy_5_max_num_shocks',

    // VF Settings
    'DetectVFInterval': 'VF_detection_interval',
    'VTherapyParams.VFATPEnable': 'VF_therapy_1_atp',
    'VFShock1Energy': 'VF_therapy_2_energy',
    'VFShock2Energy': 'VF_therapy_3_energy',
    'VTachyConstParam.VThpySelection.MaxNumShocks[VFZone]': 'VF_therapy_3_max_num_shocks',
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

  // // Helper function to safely parse a value to a number, defaulting to 0
  // const getNumber = (key: string): number => {
  //   const value = rawData[key];
  //   if (value) {
  //     const num = parseInt(value, 10);
  //     return isNaN(num) ? 0 : num;
  //   }
  //   return 0;
  // };

  // // Calculate and assign VT1 number of bursts
  // const vtAtp1Bursts = getNumber('VTATP1NumberOfBursts');
  // const vtAtp2Bursts = getNumber('VTATP2NumberOfBursts');
  // result['VT1_no_bursts'] = (vtAtp1Bursts + vtAtp2Bursts).toString();

  // // Calculate and assign VT2 number of bursts
  // const vt1Atp1Bursts = getNumber('VT1ATP1NumberOfBursts');
  // const vt1Atp2Bursts = getNumber('VT1ATP2NumberOfBursts');
  // result['VT2_no_bursts'] = (vt1Atp1Bursts + vt1Atp2Bursts).toString();


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
  const findValue = (section: any, name: string): string | undefined => {
    // 1. Return undefined if the section or its value property doesn't exist.
    if (!section || !section.value) return undefined;

    // 2. Check if section.value is an array.
    const valueNode = Array.isArray(section.value)
      // 3a. If it's an array, use .find() to search for the correct node.
      ? section.value.find((v: any) => v['@_name'] === name)
      // 3b. If it's not an array (it's an object), check if this single object is the one we want.
      : (section.value['@_name'] === name ? section.value : undefined);
    
    // 4. Return the text content of the found node, or undefined if not found.
    return valueNode ? valueNode['#text'] : undefined;
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
  console.log('leadSections', leadSections);
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

  const statSection = idcSection.section.find(s => s['@_name'] === 'STAT');

  if (statSection && statSection.section) {
      const bradySection = statSection.section.find(v => v['@_name'] === 'BRADY');
  
      if (bradySection && bradySection.value) {
          // Check for traditional pacing values first
          const raPaced = bradySection.value.find(v => v['@_name'] === 'RA_PERCENT_PACED');
          const rvPaced = bradySection.value.find(v => v['@_name'] === 'RV_PERCENT_PACED');
          const lvPaced = bradySection.value.find(v => v['@_name'] === 'LV_PERCENT_PACED');
  
          // Check for AP/AS values
          const apVp = bradySection.value.find(v => v['@_name'] === 'AP_VP_PERCENT');
          const apVs = bradySection.value.find(v => v['@_name'] === 'AP_VS_PERCENT');
          const asVp = bradySection.value.find(v => v['@_name'] === 'AS_VP_PERCENT');
  
          // Calculate RA pacing
          if (raPaced) {
              result.mdc_idc_stat_brady_ra_percent = raPaced['#text'];
          } else if (apVp && apVs) {
              const apVpValue = parseFloat(apVp['#text'] || 0);
              const apVsValue = parseFloat(apVs['#text'] || 0);
              result.mdc_idc_stat_brady_ra_percent = (apVpValue + apVsValue).toString();
          } else {
              result.mdc_idc_stat_brady_ra_percent = '';
          }
  
          // Calculate RV pacing
          if (rvPaced) {
              result.mdc_idc_stat_brady_rv_percent = rvPaced['#text'];
          } else if (apVp && asVp) {
              const apVpValue = parseFloat(apVp['#text'] || 0);
              const asVpValue = parseFloat(asVp['#text'] || 0);
              result.mdc_idc_stat_brady_rv_percent = (apVpValue + asVpValue).toString();
          } else {
              result.mdc_idc_stat_brady_rv_percent = '';
          }
  
          // LV pacing remains unchanged
          result.mdc_idc_stat_brady_lv_percent = lvPaced ? lvPaced['#text'] : '';
      }
  }

  // Get MSMT and BATT sections
  const msmtSection = idcSection.section.find(s => s['@_name'] === 'MSMT');
  if (msmtSection) {
      const battSection = msmtSection.section.find(s => s['@_name'] === 'BATTERY');
          if (battSection && battSection.value) {
              battSection.value.forEach(value => {
                  if (value['@_name'] === 'STATUS') {
                      result.mdc_idc_batt_status = value['#text'];
                  }
                  if (value['@_name'] === 'REMAINING_PERCENTAGE') {
                      result.mdc_idc_batt_percentage = value['#text'];
                  }
              });
          }

      // Get RA section
      const leadchnl_ra = msmtSection?.section?.find(s => s['@_name'] === 'LEADCHNL_RA');
          if (leadchnl_ra && leadchnl_ra.section) {
              // Get SENSING values
              const sensingSection = Array.isArray(leadchnl_ra?.section)
              ? leadchnl_ra.section.find(s => s['@_name'] === 'SENSING')
              : leadchnl_ra.section;
              if (sensingSection?.value) {
                  const sensingValue = Array.isArray(sensingSection.value) 
                      ? sensingSection.value.find(v => v['@_name'] === 'INTR_AMPL_MEAN')
                      : sensingSection.value;
                  result.mdc_idc_msmt_ra_sensing_mean = sensingValue?.['#text'] || '';
              } else {
                  result.mdc_idc_msmt_ra_sensing_mean = '';
              }
              // Get PACING_THRESHOLD values
              const pacingSection = Array.isArray(leadchnl_ra?.section)
              ? leadchnl_ra.section.find(s => s['@_name'] === 'PACING_THRESHOLD')
              : leadchnl_ra?.section?.['@_name'] === 'PACING_THRESHOLD' ? leadchnl_ra.section : null;

              if (pacingSection?.value) {
              const amplitudeValue = Array.isArray(pacingSection.value)
                  ? pacingSection.value.find(v => v['@_name'] === 'AMPLITUDE')
                  : pacingSection.value;
              result.mdc_idc_msmt_ra_pacing_threshold = amplitudeValue?.['#text'] || '';

              const pulsewidthValue = Array.isArray(pacingSection.value)
                  ? pacingSection.value.find(v => v['@_name'] === 'PULSEWIDTH')
                  : pacingSection.value;
              result.mdc_idc_msmt_ra_pw = pulsewidthValue?.['#text'] || '';
              } else {
              result.mdc_idc_msmt_ra_pacing_threshold = '';
              result.mdc_idc_msmt_ra_pw = '';
              }
              // Get IMPEDANCE values
              const impedanceSection = Array.isArray(leadchnl_ra?.section)
              ? leadchnl_ra.section.find(s => s['@_name'] === 'IMPEDANCE')
              : leadchnl_ra.section;
              if (impedanceSection?.value) {
                  const impedanceValue = Array.isArray(impedanceSection.value) 
                  ? impedanceSection?.value?.find(v => v['@_name'] === 'VALUE')
                  : impedanceSection?.value;
                      result.mdc_idc_msmt_ra_impedance_mean = impedanceValue['#text'];
              } else {
                  result.mdc_idc_msmt_ra_impedance_mean = '';
              }
          };

      // Get LEADCHNL_RV section
      const leadchnl_rv = msmtSection?.section?.find(s => s['@_name'] === 'LEADCHNL_RV');
          if (leadchnl_rv && leadchnl_rv.section) {
              // Get SENSING values
              const sensingSection = Array.isArray(leadchnl_rv?.section)
              ? leadchnl_rv.section.find(s => s['@_name'] === 'SENSING')
              : leadchnl_rv.section;
              if (sensingSection && sensingSection.value) {
                  const sensingValue = Array.isArray(sensingSection?.value) 
                  ? sensingSection.value.find(v => v['@_name'] === 'INTR_AMPL_MEAN')
                  : sensingSection?.value;
                  if (sensingValue) {
                      result.mdc_idc_msmt_rv_sensing_mean = sensingValue?.['#text'] || '';
                  }
              }
          // Get PACING_THRESHOLD values
          const pacingSection = Array.isArray(leadchnl_rv?.section)
          ? leadchnl_rv.section.find(s => s['@_name'] === 'PACING_THRESHOLD')
          : leadchnl_rv?.section?.['@_name'] === 'PACING_THRESHOLD' ? leadchnl_rv.section : null;;
          if (pacingSection?.value) {
              const amplitudeValue = pacingSection?.value?.find(v => v['@_name'] === 'AMPLITUDE');
              const pulsewidthValue = pacingSection?.value?.find(v => v['@_name'] === 'PULSEWIDTH');
              if (amplitudeValue) {
                  result.mdc_idc_msmt_rv_pacing_threshold = amplitudeValue['#text'];
              }
              if (pulsewidthValue) {
                  result.mdc_idc_msmt_rv_pw = pulsewidthValue['#text'];
              }
              // Get IMPEDANCE values
              const impedanceSection = leadchnl_rv?.section?.find(s => s['@_name'] === 'IMPEDANCE');
              if (impedanceSection && impedanceSection.value) {
                  const impedanceValue = impedanceSection?.value?.find(v => v['@_name'] === 'VALUE');
                  if (impedanceValue) {
                      result.mdc_idc_msmt_rv_impedance_mean = impedanceValue['#text'];
                  }
              }
          }
      }
      // Get LEADCHNL_LV section
      const leadchnl_lv = Array.isArray(msmtSection?.section)
      ? msmtSection?.section?.find(s => s['@_name'] === 'LEADCHNL_LV')
      : msmtSection?.section?.['@_name'] === 'LEADCHNL_LV' ? msmtSection?.section : null;
      if (leadchnl_lv?.value) {
          const pacingSection = leadchnl_lv?.section?.find(s => s['@_name'] === 'PACING_THRESHOLD');
          if (pacingSection?.value) {
              const amplitudeValue = pacingSection?.value?.find(v => v['@_name'] === 'AMPLITUDE');
              const pulsewidthValue = pacingSection?.value?.find(v => v['@_name'] === 'PULSEWIDTH');
              
              result.mdc_idc_msmt_lv_pacing_threshold = amplitudeValue ? amplitudeValue['#text'] : '';
              result.mdc_idc_msmt_lv_pw = pulsewidthValue ? pulsewidthValue['#text'] : '';
          }

          const impedanceSection = leadchnl_lv?.section?.find(s => s['@_name'] === 'IMPEDANCE');
          if (impedanceSection?.value) {
              const impedanceValue = impedanceSection.value.find(v => v['@_name'] === 'VALUE');
              result.mdc_idc_msmt_lv_impedance_mean = impedanceValue ? impedanceValue['#text'] : '';
          }
      }

      // Get LEADHVCHNL section
      const leadhvchnl = msmtSection?.section?.find(s => s['@_name'] === 'LEADHVCHNL');
      if (leadhvchnl) {
          // Get HV IMPEDANCE values
          const leadhvchnlValue = leadhvchnl.value.find(v => v['@_name'] === 'IMPEDANCE');
          result.mdc_idc_msmt_hv_impedance_mean = leadhvchnlValue['#text'];
      }
      // STAT section
      const setSection = idcSection.section.find(s => s['@_name'] === 'SET');
      if (setSection?.section) {
          const bradySection = setSection.section.find(s => s['@_name'] === 'BRADY');
          if (bradySection){
            const bradyValue = bradySection.value.find(v => v['@_name'] === 'LOWRATE');
            result.mdc_idc_set_brady_lowrate = bradyValue ? bradyValue['#text'] : '';
            const modeValue = bradySection.value.find(v => v['@_name'] === 'VENDOR_MODE');
            result.mdc_idc_set_brady_mode = modeValue ? modeValue['#text'] : '';
            const trackingRateValue = bradySection.value.find(v => v['@_name'] === 'MAX_TRACKING_RATE');
            result.mdc_idc_set_brady_max_tracking_rate = trackingRateValue ? trackingRateValue['#text'] : '';
            const sensorRateValue = bradySection.value.find(v => v['@_name'] === 'MAX_SENSOR_RATE');
            result.mdc_idc_set_brady_max_sensor_rate = sensorRateValue ? sensorRateValue['#text'] : '';
            const modeSwitchRate = bradySection.value.find(v => v['@_name'] === 'AT_MODE_SWITCH_RATE');
            result.mdc_idc_set_brady_mode_switch_rate = modeSwitchRate ? modeSwitchRate['#text'] : '';
          }
                // Parse TACHYTHERAPY settings
        const tachyTherapySection = setSection.section.find((s: any) => s['@_name'] === 'TACHYTHERAPY');
        const isTachyOn = findValue(tachyTherapySection, 'VSTAT') === 'On';
        if (isTachyOn){
          const zoneSections = setSection.section.filter((s: any) => s['@_name'] === 'ZONE');
        
          zoneSections.forEach((zone: any) => {
            const vendorType = findValue(zone, 'VENDOR_TYPE');
            
            switch (vendorType) {
              case 'BIO-Zone_VT1':
                result.VT1_detection_interval = findValue(zone, 'DETECTION_INTERVAL');
                result.VT1_therapy_1_atp = findValue(zone, 'TYPE_ATP_1');
                result.VT1_therapy_1_no_bursts = findValue(zone, 'NUM_ATP_SEQS_1');
                result.VT1_therapy_2_atp = findValue(zone, 'TYPE_ATP_2');
                result.VT1_therapy_2_no_bursts = findValue(zone, 'NUM_ATP_SEQS_2');
                result.VT1_therapy_3_energy = findValue(zone, 'SHOCK_ENERGY_1');
                result.VT1_therapy_4_energy = findValue(zone, 'SHOCK_ENERGY_2');
                result.VT1_therapy_5_energy = findValue(zone, 'SHOCK_ENERGY_3');
                result.VT1_therapy_5_max_num_shocks = findValue(zone, 'MAX_NUM_SHOCKS_3');
                break;
              case 'BIO-Zone_VT2':
                result.VT2_detection_interval = findValue(zone, 'DETECTION_INTERVAL');
                result.VT2_therapy_1_atp = findValue(zone, 'TYPE_ATP_1');
                result.VT2_therapy_1_no_bursts = findValue(zone, 'NUM_ATP_SEQS_1');
                result.VT2_therapy_2_atp = findValue(zone, 'TYPE_ATP_2');
                result.VT2_therapy_2_no_bursts = findValue(zone, 'NUM_ATP_SEQS_2');
                result.VT2_therapy_3_energy = findValue(zone, 'SHOCK_ENERGY_1');
                result.VT2_therapy_4_energy = findValue(zone, 'SHOCK_ENERGY_2');
                result.VT2_therapy_5_energy = findValue(zone, 'SHOCK_ENERGY_3');
                result.VT2_therapy_5_max_num_shocks = findValue(zone, 'MAX_NUM_SHOCKS_3');
                break;
              case 'BIO-Zone_VF':
                result.VF_detection_interval = findValue(zone, 'DETECTION_INTERVAL');
                result.VF_therapy_1_atp = findValue(zone, 'TYPE_ATP_1');
                result.VF_therapy_1_energy = findValue(zone, 'SHOCK_ENERGY_1');
                result.VF_therapy_2_energy = findValue(zone, 'SHOCK_ENERGY_2');
                result.VF_therapy_3_energy = findValue(zone, 'SHOCK_ENERGY_3');
                result.VF_therapy_3_max_num_shocks = findValue(zone, 'NUM_SHOCKS_3');
                break;
            }
          });
      }
  }
  return result;
}
  console.log('Parsed XML file:', result);
  return result;
}