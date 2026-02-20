import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { useReportStore } from "@/stores/reportStore";
import type { Report } from "@/stores/reportStore";
import type { Arrhythmia } from "@/stores/reportStore";
import type { Patient } from "@/stores/patientStore";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ValidatedInput } from "@/components/ui/validated-input";
import { Label } from "@/components/ui/label";
// import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Calendar } from "@/components/ui/calendar";
import { useBreadcrumbs } from "@/components/ui/breadcrumb-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  CalendarIcon,
  Loader2,
  Link as LinkIcon,
  FileText,
  Save,
  Clock,
  Check,
  User,
} from "lucide-react";
import api from "@/utils/axios";
import { usePdfManager } from "@/hooks/usePdfManager";
import { PdfUploader } from "@/components/PdfUploader";
import { toast } from "sonner";
import { usePdfFormFiller } from "@/hooks/usePdfFormFiller";
// import { useDoctorStore } from '@/stores/doctorStore'
import { FileImporter } from "@/components/FileImporter";
import type { ParsedData } from "@/utils/fileParser";
import { AutocompleteTextarea } from "@/components/ui/autocomplete-textarea";
import { REPORT_COMMENT_SUGGESTIONS } from "@/data/commentSuggestions";
import { tagService } from "@/services/tagService";
import type { Tag } from "@/services/tagService";
import { useFormShortcuts } from "@/hooks/useFormShortcuts";
import { fieldValidators } from "@/validation/reportSchema";
import { cn } from "@/lib/utils";

const initialFormData: Partial<Report> = {
  // Report info
  reportDate: new Date(),
  reportType: "",
  reportStatus: "",
  isCompleted: false,
  completedByName: "",
  completedBySignature: undefined,
  comments: "",
  arrhythmias: [],
  qrs_duration: undefined,
  file_path: undefined,
  // Patient substrate
  currentHeartRate: undefined,
  currentRhythm: "",
  currentDependency: "",
  mdc_idc_stat_ataf_burden_percent: undefined,
  // Episode counts (since last check)
  episode_af_count_since_last_check: undefined,
  episode_tachy_count_since_last_check: undefined,
  episode_pause_count_since_last_check: undefined,
  episode_symptom_all_count_since_last_check: undefined,
  episode_symptom_with_detection_count_since_last_check: undefined,
  // Device Settings
  mdc_idc_set_brady_mode: "",
  mdc_idc_set_brady_lowrate: undefined,
  mdc_idc_set_brady_max_tracking_rate: undefined,
  mdc_idc_set_brady_max_sensor_rate: undefined,
  mdc_idc_dev_sav: undefined,
  mdc_idc_dev_pav: undefined,
  // Pacing Percentages
  mdc_idc_stat_brady_ra_percent_paced: undefined,
  mdc_idc_stat_brady_rv_percent_paced: undefined,
  mdc_idc_stat_brady_lv_percent_paced: undefined,
  mdc_idc_stat_brady_biv_percent_paced: undefined,
  // Battery/device Diagnostics
  mdc_idc_batt_volt: undefined,
  mdc_idc_batt_remaining: undefined,
  mdc_idc_batt_percentage: undefined,
  mdc_idc_batt_status: undefined,
  mdc_idc_cap_charge_time: undefined,
  // Initialize all measurement fields to empty strings for controlled inputs
  mdc_idc_msmt_ra_impedance_mean: undefined,
  mdc_idc_msmt_ra_sensing: undefined,
  mdc_idc_msmt_ra_pacing_threshold: undefined,
  mdc_idc_msmt_ra_pw: undefined,
  mdc_idc_msmt_rv_impedance_mean: undefined,
  mdc_idc_msmt_rv_sensing: undefined,
  mdc_idc_msmt_rv_pacing_threshold: undefined,
  mdc_idc_msmt_rv_pw: undefined,
  mdc_idc_msmt_hv_impedance_mean: undefined,
  mdc_idc_msmt_lv_impedance_mean: undefined,
  mdc_idc_msmt_lv_sensing: undefined,
  mdc_idc_msmt_lv_pacing_threshold: undefined,
  mdc_idc_msmt_lv_pw: undefined,
  // tachy settings
  VT1_detection_interval: undefined,
  VT1_therapy_1_atp: undefined,
  VT1_therapy_1_no_bursts: undefined,
  VT1_therapy_2_atp: undefined,
  VT1_therapy_2_no_bursts: undefined,
  VT1_therapy_3_cvrt: undefined,
  VT1_therapy_3_energy: undefined,
  VT1_therapy_4_cvrt: undefined,
  VT1_therapy_4_energy: undefined,
  VT1_therapy_5_cvrt: undefined,
  VT1_therapy_5_energy: undefined,
  VT1_therapy_5_max_num_shocks: undefined,
  // VT2 Settings
  VT2_detection_interval: undefined,
  VT2_therapy_1_atp: undefined,
  VT2_therapy_1_no_bursts: undefined,
  VT2_therapy_2_atp: undefined,
  VT2_therapy_2_no_bursts: undefined,
  VT2_therapy_3_cvrt: undefined,
  VT2_therapy_3_energy: undefined,
  VT2_therapy_4_cvrt: undefined,
  VT2_therapy_4_energy: undefined,
  VT2_therapy_5_cvrt: undefined,
  VT2_therapy_5_energy: undefined,
  VT2_therapy_5_max_num_shocks: undefined,
  //  VF Settings
  VF_detection_interval: undefined,
  VF_therapy_1_atp: undefined,
  VF_therapy_1_no_bursts: undefined,
  VF_therapy_2_energy: undefined,
  VF_therapy_3_energy: undefined,
  VF_therapy_4_energy: undefined,
  VF_therapy_4_max_num_shocks: undefined,
  tags: [],
};

const initialArrhythmia: Arrhythmia = {
  name: "",
  symptoms: "",
  rate: "",
  termination: "",
  therapies: "",
};

interface ReportFormProps {
  patient: Patient;
}

export function ReportForm({ patient }: ReportFormProps) {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const isEdit = !!reportId;
  const pdfManager = usePdfManager();
  const {
    currentReport,
    fetchReport,
    fetchMostRecentReport,
    setCurrentReport,
  } = useReportStore();
  const { user } = useAuthStore();
  const canComplete = user?.role === "staff_doctor" || user?.role === "admin";
  const requireSignature = user?.role === "staff_doctor";
  const { setItems } = useBreadcrumbs();
  const [selectedDoctorForPdf, setSelectedDoctorForPdf] = useState<any>(null);
  const [doctorSelectorOpen, setDoctorSelectorOpen] = useState(false);

  // Define draftKey before using it in useState initializer
  const draftKey = `report-draft-${patient.id}-${reportId || "new"}`;

  const [formData, setFormData] = useState<Partial<Report>>(() => {
    // For edit mode, use initial form data
    if (isEdit) {
      return initialFormData;
    }

    // For new reports, try to load from localStorage during initialization
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft);
        console.log("🎯 INITIALIZING formData from draft:", parsedDraft);
        // Convert date strings back to Date objects
        if (parsedDraft.reportDate) {
          parsedDraft.reportDate = new Date(parsedDraft.reportDate);
        }
        return parsedDraft;
      }
    } catch (error) {
      console.error("Failed to load draft during initialization:", error);
    }

    // Default to initialFormData if no draft
    return initialFormData;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { fillReportForm, getFormFields, isGenerating } = usePdfFormFiller();
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  // Auto-save draft state
  const [draftStatus, setDraftStatus] = useState<
    "saved" | "saving" | "unsaved"
  >("saved");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  // draftKey moved above useState
  const draftToastShownRef = useRef(false);
  const isInitialMount = useRef(true);
  const isDraftLoaded = useRef(false);

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Pre-population state
  const [previousReport, setPreviousReport] = useState<Report | null>(null);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  const [prePopulatedFrom, setPrePopulatedFrom] = useState<number | null>(null);

  // Debug: track all formData changes
  useEffect(() => {
    console.log("📊 FORMDATA CHANGED:", {
      reportType: formData.reportType,
      reportStatus: formData.reportStatus,
      currentRhythm: formData.currentRhythm,
      currentDependency: formData.currentDependency,
      mdc_idc_set_brady_mode: formData.mdc_idc_set_brady_mode,
      mdc_idc_batt_status: formData.mdc_idc_batt_status,
    });
    console.trace("📊 Stack trace for formData change");
  }, [formData]);

  // Load draft from localStorage on mount
  useEffect(() => {
    console.log(
      "🔍 DRAFT LOAD EFFECT RUNNING - isEdit:",
      isEdit,
      "draftToastShownRef:",
      draftToastShownRef.current,
      "draftKey:",
      draftKey,
    );
    if (!isEdit && !draftToastShownRef.current) {
      const savedDraft = localStorage.getItem(draftKey);
      console.log(
        "🔍 DRAFT LOAD - Raw saved draft:",
        savedDraft?.substring(0, 200),
      );
      if (savedDraft) {
        try {
          const parsedDraft = JSON.parse(savedDraft);
          console.log("🔍 DRAFT LOAD - Parsed draft:", {
            reportType: parsedDraft.reportType,
            reportStatus: parsedDraft.reportStatus,
            currentRhythm: parsedDraft.currentRhythm,
            currentDependency: parsedDraft.currentDependency,
            mdc_idc_set_brady_mode: parsedDraft.mdc_idc_set_brady_mode,
            mdc_idc_batt_status: parsedDraft.mdc_idc_batt_status,
          });

          // Set lastSaved if it exists
          if (parsedDraft.lastSaved) {
            setLastSaved(new Date(parsedDraft.lastSaved));
          }

          // Mark draft as loaded and toast as shown
          isDraftLoaded.current = true;
          draftToastShownRef.current = true;

          // Show toast notification
          toast.info("Draft restored", {
            description: "Your unsaved changes have been restored",
            action: {
              label: "Discard",
              onClick: () => {
                localStorage.removeItem(draftKey);
                setFormData(initialFormData);
                setLastSaved(null);
                isDraftLoaded.current = false;
                toast.success("Draft discarded");
              },
            },
          });
        } catch (error) {
          console.error("Failed to load draft:", error);
          localStorage.removeItem(draftKey);
        }
      }
    }
  }, [draftKey, isEdit]);

  // Auto-save with debounce
  useEffect(() => {
    // Skip auto-save on initial mount or when in edit mode
    if (isInitialMount.current) {
      isInitialMount.current = false;
      console.log("🔍 AUTO-SAVE - Skipping initial mount");
      return;
    }

    if (!isEdit) {
      console.log("🔍 AUTO-SAVE - formData changed, will save in 3s:", {
        reportType: formData.reportType,
        reportStatus: formData.reportStatus,
        currentRhythm: formData.currentRhythm,
        currentDependency: formData.currentDependency,
        mdc_idc_set_brady_mode: formData.mdc_idc_set_brady_mode,
        mdc_idc_batt_status: formData.mdc_idc_batt_status,
      });
      setDraftStatus("unsaved");

      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set new timer for auto-save (3 seconds after last change)
      autoSaveTimerRef.current = setTimeout(() => {
        setDraftStatus("saving");
        try {
          const draftData = {
            ...formData,
            lastSaved: new Date().toISOString(),
          };
          console.log("💾 AUTO-SAVE - Saving draft to localStorage:", {
            reportType: draftData.reportType,
            reportStatus: draftData.reportStatus,
            currentRhythm: draftData.currentRhythm,
            currentDependency: draftData.currentDependency,
            mdc_idc_set_brady_mode: draftData.mdc_idc_set_brady_mode,
            mdc_idc_batt_status: draftData.mdc_idc_batt_status,
          });
          localStorage.setItem(draftKey, JSON.stringify(draftData));
          console.log("✅ AUTO-SAVE - Draft saved successfully");
          setDraftStatus("saved");
          setLastSaved(new Date());
        } catch (error) {
          console.error("Failed to save draft:", error);
          toast.error("Failed to auto-save draft");
        }
      }, 3000);
    }

    // Cleanup
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formData, isEdit, draftKey]);

  // Clear draft after successful submission
  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
    setLastSaved(null);
    setDraftStatus("saved");
    isDraftLoaded.current = false;
  }, [draftKey]);

  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await tagService.getAll("report");
        setAvailableTags(tags);
      } catch (error) {
        console.error("Failed to load tags:", error);
        toast.error("Failed to load tags");
      }
    };
    loadTags();
  }, []);

  // Fetch most recent report for new reports
  useEffect(() => {
    const loadPreviousReport = async () => {
      if (!isEdit && patient?.id) {
        setIsLoadingPrevious(true);
        const report = await fetchMostRecentReport(patient.id);
        if (report) {
          setPreviousReport(report);
        }
        setIsLoadingPrevious(false);
      }
    };
    loadPreviousReport();
  }, [isEdit, patient?.id, fetchMostRecentReport]);

  const toggleTag = (tagId: number) => {
    setFormData((prev) => {
      const currentTags = prev.tags || [];
      const exists = currentTags.some((t) => t.ID === tagId);

      let newTags: Tag[];
      if (exists) {
        newTags = currentTags.filter((t) => t.ID !== tagId);
      } else {
        const tagToAdd = availableTags.find((t) => t.ID === tagId);
        if (tagToAdd) {
          newTags = [...currentTags, tagToAdd];
        } else {
          newTags = currentTags;
        }
      }

      return { ...prev, tags: newTags };
    });
  };

  // Pre-populate form from previous report
  const loadFromPreviousReport = () => {
    console.log("🔍 Pre-population - Previous report:", previousReport);
    if (!previousReport) return;

    // Fields to pre-populate (settings that typically don't change between reports)
    const fieldsToPrePopulate = {
      // Device settings - usually stay the same
      mdc_idc_set_brady_mode: previousReport.mdc_idc_set_brady_mode,
      mdc_idc_set_brady_lowrate: previousReport.mdc_idc_set_brady_lowrate,
      mdc_idc_set_brady_max_tracking_rate:
      previousReport.mdc_idc_set_brady_max_tracking_rate,
      mdc_idc_set_brady_max_sensor_rate:
      previousReport.mdc_idc_set_brady_max_sensor_rate,
      mdc_idc_dev_sav: previousReport.mdc_idc_dev_sav,
      mdc_idc_dev_pav: previousReport.mdc_idc_dev_pav,

      // Tachy settings - usually stay the same unless reprogrammed
      VT1_detection_interval: previousReport.VT1_detection_interval,
      VT1_therapy_1_atp: previousReport.VT1_therapy_1_atp,
      VT1_therapy_1_no_bursts: previousReport.VT1_therapy_1_no_bursts,
      VT1_therapy_2_atp: previousReport.VT1_therapy_2_atp,
      VT1_therapy_2_no_bursts: previousReport.VT1_therapy_2_no_bursts,
      VT1_therapy_3_cvrt: previousReport.VT1_therapy_3_cvrt,
      VT1_therapy_3_energy: previousReport.VT1_therapy_3_energy,
      VT1_therapy_4_cvrt: previousReport.VT1_therapy_4_cvrt,
      VT1_therapy_4_energy: previousReport.VT1_therapy_4_energy,
      VT1_therapy_5_cvrt: previousReport.VT1_therapy_5_cvrt,
      VT1_therapy_5_energy: previousReport.VT1_therapy_5_energy,
      VT1_therapy_5_max_num_shocks: previousReport.VT1_therapy_5_max_num_shocks,

      VT2_detection_interval: previousReport.VT2_detection_interval,
      VT2_therapy_1_atp: previousReport.VT2_therapy_1_atp,
      VT2_therapy_1_no_bursts: previousReport.VT2_therapy_1_no_bursts,
      VT2_therapy_2_atp: previousReport.VT2_therapy_2_atp,
      VT2_therapy_2_no_bursts: previousReport.VT2_therapy_2_no_bursts,
      VT2_therapy_3_cvrt: previousReport.VT2_therapy_3_cvrt,
      VT2_therapy_3_energy: previousReport.VT2_therapy_3_energy,
      VT2_therapy_4_cvrt: previousReport.VT2_therapy_4_cvrt,
      VT2_therapy_4_energy: previousReport.VT2_therapy_4_energy,
      VT2_therapy_5_cvrt: previousReport.VT2_therapy_5_cvrt,
      VT2_therapy_5_energy: previousReport.VT2_therapy_5_energy,
      VT2_therapy_5_max_num_shocks: previousReport.VT2_therapy_5_max_num_shocks,

      VF_detection_interval: previousReport.VF_detection_interval,
      VF_therapy_1_atp: previousReport.VF_therapy_1_atp,
      VF_therapy_1_no_bursts: previousReport.VF_therapy_1_no_bursts,
      VF_therapy_2_energy: previousReport.VF_therapy_2_energy,
      VF_therapy_3_energy: previousReport.VF_therapy_3_energy,
      VF_therapy_4_energy: previousReport.VF_therapy_4_energy,
      VF_therapy_4_max_num_shocks: previousReport.VF_therapy_4_max_num_shocks,
    };
    console.log("🔍 Pre-population - Fields to pre-populate:", fieldsToPrePopulate);
    setFormData((prev) => ({
      ...prev,
      ...fieldsToPrePopulate,
    }));

    setPrePopulatedFrom(previousReport.id);
    toast.success("Settings loaded from previous report", {
      description: `Report from ${new Date(previousReport.reportDate).toLocaleDateString()}`,
    });
  };

  // Clear pre-populated data
  const clearPrePopulatedData = () => {
    setFormData(initialFormData);
    setPrePopulatedFrom(null);
    toast.info("Form cleared");
  };

  console.log("Rendering ReportForm with patient:", patient);

  const handleDataImported = (data: ParsedData, file: File) => {
    // If the imported file is a PDF, add it to the upload queue
    if (file.name.toLowerCase().endsWith(".pdf")) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      pdfManager.addFiles(dataTransfer.files);
      toast.success("PDF file added to attachments", {
        description: file.name,
      });
    }

    // First, clear all fields that the file parser can populate
    // This ensures old data is removed if it's not in the new file
    const clearedFields: Partial<Report> = {
      reportDate: undefined,
      reportType: undefined,
      reportStatus: undefined,
      currentHeartRate: undefined,
      currentRhythm: undefined,
      currentDependency: undefined,
      qrs_duration: undefined,
      comments: undefined,
      mdc_idc_stat_ataf_burden_percent: undefined,
      // Bradycardia settings
      mdc_idc_set_brady_mode: undefined,
      mdc_idc_set_brady_lowrate: undefined,
      mdc_idc_set_brady_max_tracking_rate: undefined,
      mdc_idc_set_brady_max_sensor_rate: undefined,
      // Pacing percentages
      mdc_idc_stat_brady_ra_percent_paced: undefined,
      mdc_idc_stat_brady_rv_percent_paced: undefined,
      mdc_idc_stat_brady_lv_percent_paced: undefined,
      mdc_idc_stat_brady_biv_percent_paced: undefined,
      // Battery data
      mdc_idc_batt_volt: undefined,
      mdc_idc_batt_remaining: undefined,
      mdc_idc_batt_status: undefined,
      mdc_idc_cap_charge_time: undefined,
      mdc_idc_batt_percentage: undefined,
      // Device settings
      mdc_idc_dev_sav: undefined,
      mdc_idc_dev_pav: undefined,
      // RA measurements
      mdc_idc_msmt_ra_impedance_mean: undefined,
      mdc_idc_msmt_ra_sensing: undefined,
      mdc_idc_msmt_ra_pacing_threshold: undefined,
      mdc_idc_msmt_ra_pw: undefined,
      // RV measurements
      mdc_idc_msmt_rv_impedance_mean: undefined,
      mdc_idc_msmt_rv_sensing: undefined,
      mdc_idc_msmt_rv_pacing_threshold: undefined,
      mdc_idc_msmt_rv_pw: undefined,
      mdc_idc_msmt_hv_impedance_mean: undefined,
      // LV measurements
      mdc_idc_msmt_lv_impedance_mean: undefined,
      mdc_idc_msmt_lv_sensing: undefined,
      mdc_idc_msmt_lv_pacing_threshold: undefined,
      mdc_idc_msmt_lv_pw: undefined,
      // VT1 settings
      VT1_detection_interval: undefined,
      VT1_therapy_1_atp: undefined,
      VT1_therapy_1_no_bursts: undefined,
      VT1_therapy_2_atp: undefined,
      VT1_therapy_2_no_bursts: undefined,
      VT1_therapy_3_cvrt: undefined,
      VT1_therapy_3_energy: undefined,
      VT1_therapy_4_cvrt: undefined,
      VT1_therapy_4_energy: undefined,
      VT1_therapy_5_cvrt: undefined,
      VT1_therapy_5_energy: undefined,
      VT1_therapy_5_max_num_shocks: undefined,
      // VT2 settings
      VT2_detection_interval: undefined,
      VT2_therapy_1_atp: undefined,
      VT2_therapy_1_no_bursts: undefined,
      VT2_therapy_2_atp: undefined,
      VT2_therapy_2_no_bursts: undefined,
      VT2_therapy_3_cvrt: undefined,
      VT2_therapy_3_energy: undefined,
      VT2_therapy_4_cvrt: undefined,
      VT2_therapy_4_energy: undefined,
      VT2_therapy_5_cvrt: undefined,
      VT2_therapy_5_energy: undefined,
      VT2_therapy_5_max_num_shocks: undefined,
      // VF settings
      VF_detection_interval: undefined,
      VF_therapy_1_atp: undefined,
      VF_therapy_1_no_bursts: undefined,
      VF_therapy_2_energy: undefined,
      VF_therapy_3_energy: undefined,
      VF_therapy_4_energy: undefined,
      VF_therapy_4_max_num_shocks: undefined,
    };

    // Start with current formData, apply cleared fields, then overlay new data
    const updatedFormData = { ...formData, ...clearedFields };

    // Map common fields
    if (data.report_date) {
      const datePart = data.report_date.split("T")[0];
      // Create a new date in the local timezone using the UTC year, month, and day
      // This corrects for the timezone offset that can push the date to the previous day
      updatedFormData.reportDate = new Date(datePart);
    }
    if (data.report_type) {
      updatedFormData.reportType = data.report_type;
    }
    if (data.report_status) {
      updatedFormData.reportStatus = data.report_status;
    }
    if (data.current_heart_rate) {
      updatedFormData.currentHeartRate = parseFloat(data.current_heart_rate);
    }
    if (data.current_rhythm) {
      updatedFormData.currentRhythm = data.current_rhythm;
    }
    if (data.current_dependency) {
      updatedFormData.currentDependency = data.current_dependency;
    }
    if (data.qrs_duration) {
      updatedFormData.qrs_duration = parseFloat(data.qrs_duration);
    }
    if (data.comments) {
      updatedFormData.comments = data.comments;
    }
    if (data.is_completed !== undefined) {
      updatedFormData.isCompleted = data.is_completed;
    }
    if (data.mdc_idc_stat_ataf_burden_percent) {
      updatedFormData.mdc_idc_stat_ataf_burden_percent = parseFloat(
        data.mdc_idc_stat_ataf_burden_percent,
      );
    }

    // Map device fields
    // if (data.mdc_idc_dev_serial_number) {
    //   updatedFormData.mdc_idc_dev_serial_number = data.mdc_idc_dev_serial_number;
    // }
    // if (data.mdc_idc_dev_model) {
    //   updatedFormData.mdc_idc_dev_model = data.mdc_idc_dev_model;
    // }
    // if (data.mdc_idc_dev_manufacturer) {
    //   updatedFormData.mdc_idc_dev_manufacturer = data.mdc_idc_dev_manufacturer;
    // }

    // Map bradycardia settings
    if (data.mdc_idc_set_brady_mode) {
      updatedFormData.mdc_idc_set_brady_mode = data.mdc_idc_set_brady_mode;
    }
    if (data.mdc_idc_set_brady_lowrate) {
      updatedFormData.mdc_idc_set_brady_lowrate = parseFloat(
        data.mdc_idc_set_brady_lowrate,
      );
    }
    if (data.mdc_idc_set_brady_max_tracking_rate) {
      updatedFormData.mdc_idc_set_brady_max_tracking_rate = parseFloat(
        data.mdc_idc_set_brady_max_tracking_rate,
      );
    }
    if (data.mdc_idc_set_brady_max_sensor_rate) {
      updatedFormData.mdc_idc_set_brady_max_sensor_rate = parseFloat(
        data.mdc_idc_set_brady_max_sensor_rate,
      );
    }

    // Map pacing percentages
    if (data.mdc_idc_stat_brady_ra_percent_paced) {
      updatedFormData.mdc_idc_stat_brady_ra_percent_paced = parseFloat(
        data.mdc_idc_stat_brady_ra_percent_paced,
      );
    }
    if (data.mdc_idc_stat_brady_rv_percent_paced) {
      updatedFormData.mdc_idc_stat_brady_rv_percent_paced = parseFloat(
        data.mdc_idc_stat_brady_rv_percent_paced,
      );
    }
    if (data.mdc_idc_stat_brady_lv_percent_paced) {
      updatedFormData.mdc_idc_stat_brady_lv_percent_paced = parseFloat(
        data.mdc_idc_stat_brady_lv_percent_paced,
      );
    }
    if (data.mdc_idc_stat_brady_biv_percent_paced) {
      updatedFormData.mdc_idc_stat_brady_biv_percent_paced = parseFloat(
        data.mdc_idc_stat_brady_biv_percent_paced,
      );
    }

    // Map battery data
    if (data.mdc_idc_batt_volt) {
      updatedFormData.mdc_idc_batt_volt = parseFloat(data.mdc_idc_batt_volt);
    }
    if (data.mdc_idc_batt_remaining) {
      updatedFormData.mdc_idc_batt_remaining = parseFloat(
        data.mdc_idc_batt_remaining,
      );
    }
    if (data.mdc_idc_batt_status) {
      updatedFormData.mdc_idc_batt_status = data.mdc_idc_batt_status;
    }
    if (data.mdc_idc_cap_charge_time) {
      updatedFormData.mdc_idc_cap_charge_time = parseFloat(
        data.mdc_idc_cap_charge_time,
      );
    }
    if (data.mdc_idc_batt_percentage) {
      updatedFormData.mdc_idc_batt_percentage = parseFloat(
        data.mdc_idc_batt_percentage,
      );
    }
    // Map device settings
    if (data.mdc_idc_dev_sav) {
      updatedFormData.mdc_idc_dev_sav = data.mdc_idc_dev_sav;
    }
    if (data.mdc_idc_dev_pav) {
      updatedFormData.mdc_idc_dev_pav = data.mdc_idc_dev_pav;
    }

    // Map lead measurements
    if (data.mdc_idc_msmt_ra_impedance_mean) {
      updatedFormData.mdc_idc_msmt_ra_impedance_mean = parseFloat(
        data.mdc_idc_msmt_ra_impedance_mean,
      );
    }
    if (data.mdc_idc_msmt_ra_sensing_mean) {
      updatedFormData.mdc_idc_msmt_ra_sensing = parseFloat(
        data.mdc_idc_msmt_ra_sensing_mean,
      );
    }
    if (data.mdc_idc_msmt_ra_pacing_threshold) {
      updatedFormData.mdc_idc_msmt_ra_pacing_threshold = parseFloat(
        data.mdc_idc_msmt_ra_pacing_threshold,
      );
    }
    if (data.mdc_idc_msmt_ra_pw) {
      updatedFormData.mdc_idc_msmt_ra_pw = parseFloat(data.mdc_idc_msmt_ra_pw);
    }

    // Map RV measurements
    if (data.mdc_idc_msmt_rv_impedance_mean) {
      updatedFormData.mdc_idc_msmt_rv_impedance_mean = parseFloat(
        data.mdc_idc_msmt_rv_impedance_mean,
      );
    }
    if (data.mdc_idc_msmt_rv_sensing_mean) {
      updatedFormData.mdc_idc_msmt_rv_sensing = parseFloat(
        data.mdc_idc_msmt_rv_sensing_mean,
      );
    }
    if (data.mdc_idc_msmt_rv_pacing_threshold) {
      updatedFormData.mdc_idc_msmt_rv_pacing_threshold = parseFloat(
        data.mdc_idc_msmt_rv_pacing_threshold,
      );
    }
    if (data.mdc_idc_msmt_rv_pw) {
      updatedFormData.mdc_idc_msmt_rv_pw = parseFloat(data.mdc_idc_msmt_rv_pw);
    }

    // Map LV measurements
    if (data.mdc_idc_msmt_lv_impedance_mean) {
      updatedFormData.mdc_idc_msmt_lv_impedance_mean = parseFloat(
        data.mdc_idc_msmt_lv_impedance_mean,
      );
    }
    if (data.mdc_idc_msmt_lv_sensing_mean) {
      updatedFormData.mdc_idc_msmt_lv_sensing = parseFloat(
        data.mdc_idc_msmt_lv_sensing_mean,
      );
    }
    if (data.mdc_idc_msmt_lv_pacing_threshold) {
      updatedFormData.mdc_idc_msmt_lv_pacing_threshold = parseFloat(
        data.mdc_idc_msmt_lv_pacing_threshold,
      );
    }
    if (data.mdc_idc_msmt_lv_pw) {
      updatedFormData.mdc_idc_msmt_lv_pw = parseFloat(data.mdc_idc_msmt_lv_pw);
    }

    // Map shock impedance
    if (data.mdc_idc_msmt_hv_impedance_mean) {
      updatedFormData.mdc_idc_msmt_hv_impedance_mean = parseFloat(
        data.mdc_idc_msmt_hv_impedance_mean,
      );
    }

    // if device has type device.type == "Defibrillator"
    if (hasDefibrillator) {
      // Map tachycardia settings
      if (data.VT1_detection_interval) {
        updatedFormData.VT1_detection_interval = data.VT1_detection_interval;
      }
      if (data.VT1_therapy_1_atp) {
        updatedFormData.VT1_therapy_1_atp = data.VT1_therapy_1_atp;
      }
      if (data.VT1_therapy_1_no_bursts) {
        updatedFormData.VT1_therapy_1_no_bursts = data.VT1_therapy_1_no_bursts;
      }
      if (data.VT1_therapy_2_atp) {
        updatedFormData.VT1_therapy_2_atp = data.VT1_therapy_2_atp;
      }
      if (data.VT1_therapy_2_no_bursts) {
        updatedFormData.VT1_therapy_2_no_bursts = data.VT1_therapy_2_no_bursts;
      }
      if (data.VT1_therapy_3_cvrt) {
        updatedFormData.VT1_therapy_3_cvrt = data.VT1_therapy_3_cvrt;
      } else {
        updatedFormData.VT1_therapy_3_cvrt = "";
      }
      if (data.VT1_therapy_3_energy) {
        updatedFormData.VT1_therapy_3_energy = data.VT1_therapy_3_energy;
      }
      if (data.VT1_therapy_4_cvrt) {
        updatedFormData.VT1_therapy_4_cvrt = data.VT1_therapy_4_cvrt;
      }
      if (data.VT1_therapy_4_energy) {
        updatedFormData.VT1_therapy_4_energy = data.VT1_therapy_4_energy;
      }
      if (data.VT1_therapy_5_cvrt) {
        updatedFormData.VT1_therapy_5_cvrt = data.VT1_therapy_5_cvrt;
      } else {
        updatedFormData.VT1_therapy_5_cvrt = "";
      }
      if (data.VT1_therapy_5_energy) {
        updatedFormData.VT1_therapy_5_energy = data.VT1_therapy_5_energy;
      }
      if (data.VT1_therapy_5_max_num_shocks) {
        updatedFormData.VT1_therapy_5_max_num_shocks =
          data.VT1_therapy_5_max_num_shocks;
      }

      if (data.VT2_detection_interval) {
        updatedFormData.VT2_detection_interval = data.VT2_detection_interval;
      }
      if (data.VT2_therapy_1_atp) {
        updatedFormData.VT2_therapy_1_atp = data.VT2_therapy_1_atp;
      } else {
        updatedFormData.VT2_therapy_1_atp = "off";
      }
      if (data.VT2_therapy_1_no_bursts) {
        updatedFormData.VT2_therapy_1_no_bursts = data.VT2_therapy_1_no_bursts;
      } else {
        updatedFormData.VT2_therapy_1_no_bursts = "";
      }
      if (data.VT2_therapy_2_atp) {
        updatedFormData.VT2_therapy_2_atp = data.VT2_therapy_2_atp;
      } else {
        updatedFormData.VT2_therapy_2_atp = "";
      }
      if (data.VT2_therapy_2_no_bursts) {
        updatedFormData.VT2_therapy_2_no_bursts = data.VT2_therapy_2_no_bursts;
      } else {
        updatedFormData.VT2_therapy_2_no_bursts = "";
      }
      if (data.VT2_therapy_3_cvrt) {
        updatedFormData.VT2_therapy_3_cvrt = data.VT2_therapy_3_cvrt;
      } else {
        updatedFormData.VT2_therapy_3_cvrt = "";
      }
      if (data.VT2_therapy_3_energy) {
        updatedFormData.VT2_therapy_3_energy = data.VT2_therapy_3_energy;
      } else {
        updatedFormData.VT2_therapy_3_energy = "";
      }
      if (data.VT2_therapy_4_cvrt) {
        updatedFormData.VT2_therapy_4_cvrt = data.VT2_therapy_4_cvrt;
      } else {
        updatedFormData.VT2_therapy_4_cvrt = "";
      }
      if (data.VT2_therapy_4_energy) {
        updatedFormData.VT2_therapy_4_energy = data.VT2_therapy_4_energy;
      }
      if (data.VT2_therapy_5_cvrt) {
        updatedFormData.VT2_therapy_5_cvrt = data.VT2_therapy_5_cvrt;
      } else {
        updatedFormData.VT2_therapy_5_cvrt = "";
      }
      if (data.VT2_therapy_5_energy) {
        updatedFormData.VT2_therapy_5_energy = data.VT2_therapy_5_energy;
      } else {
        updatedFormData.VT2_therapy_5_energy = "";
      }
      if (data.VT2_therapy_5_max_num_shocks) {
        updatedFormData.VT2_therapy_5_max_num_shocks =
          data.VT2_therapy_5_max_num_shocks;
      } else {
        updatedFormData.VT2_therapy_5_max_num_shocks = "";
      }

      if (data.VF_detection_interval) {
        updatedFormData.VF_detection_interval = data.VF_detection_interval;
      }
      if (data.VF_therapy_1_atp) {
        updatedFormData.VF_therapy_1_atp = data.VF_therapy_1_atp;
      } else {
        updatedFormData.VF_therapy_1_atp = "off";
      }
      if (data.VF_therapy_1_no_bursts) {
        updatedFormData.VF_therapy_1_no_bursts = data.VF_therapy_1_no_bursts;
      } else {
        updatedFormData.VF_therapy_1_no_bursts = "";
      }
      if (data.VF_therapy_2_energy) {
        updatedFormData.VF_therapy_2_energy = data.VF_therapy_2_energy;
      } else {
        updatedFormData.VF_therapy_2_energy = "off";
      }
      if (data.VF_therapy_3_energy) {
        updatedFormData.VF_therapy_3_energy = data.VF_therapy_3_energy;
      } else {
        updatedFormData.VF_therapy_3_energy = "off";
      }
      if (data.VF_therapy_4_energy) {
        updatedFormData.VF_therapy_4_energy = data.VF_therapy_4_energy;
      } else {
        updatedFormData.VF_therapy_4_energy = "off";
      }
      if (data.VF_therapy_4_max_num_shocks) {
        updatedFormData.VF_therapy_4_max_num_shocks =
          data.VF_therapy_4_max_num_shocks;
      } else {
        updatedFormData.VF_therapy_4_max_num_shocks = "";
      }
    }
    // If an embedded PDF was discovered in XML, convert and add to pdfManager
    if (data.embeddedPdfBase64) {
      try {
        const b64 = data.embeddedPdfBase64;
        const byteLen = atob(b64);
        const bytes = new Uint8Array(byteLen.length);
        for (let i = 0; i < byteLen.length; i++)
          bytes[i] = byteLen.charCodeAt(i);
        const fileName =
          data.embeddedPdfName || `embedded_report_${patient.id}.pdf`;
        const file = new File([bytes], fileName, { type: "application/pdf" });

        // Use DataTransfer to produce a FileList for pdfManager.addFiles
        const dt = new DataTransfer();
        dt.items.add(file);
        // pdfManager.addFiles expects an input FileList (like from <input type="file">)
        if (typeof (pdfManager as any).addFiles === "function") {
          (pdfManager as any).addFiles(dt.files);
        }
        toast.success("Embedded PDF found and queued for upload", {
          description: fileName,
        });
      } catch (e) {
        console.error("Failed to attach embedded PDF from XML:", e);
      }
    }

    // Update the form data
    setFormData(updatedFormData);

    if (data.xml_report_pdf_file) {
      try {
        const dt = new DataTransfer();
        dt.items.add(data.xml_report_pdf_file);
        pdfManager.addFiles(dt.files);
        toast.success(
          `Attached report PDF from XML: ${data.xml_report_pdf_name || data.xml_report_pdf_file.name}`,
        );
      } catch (err) {
        console.error("Failed to add embedded PDF to uploader:", err);
        toast.error("Parsed PDF found in XML, but failed to attach it.");
      }
    }

    toast.success("Form fields have been populated with imported data");
  };

  useEffect(() => {
    if (isEdit && reportId) {
      fetchReport(parseInt(reportId));
    }
  }, [isEdit, reportId, fetchReport]);

  useEffect(() => {
    if (isEdit && currentReport) {
      // Ensure date fields are converted to Date objects and null values to appropriate defaults
      const reportWithDateObjects = {
        ...currentReport,
        reportDate: currentReport.reportDate
          ? new Date(currentReport.reportDate)
          : new Date(),
        comments: currentReport.comments || "", // Convert null to empty string
      };
      setFormData(reportWithDateObjects);
    }
  }, [isEdit, currentReport]);

  const handleGeneratePdf = async () => {
    // Filter active devices and leads
    const activeDevices = (patient?.devices ?? []).filter(
      (d: any) =>
        String(d?.status || "").toLowerCase() === "active" && !d?.explantedAt,
    );
    const activeLeads = (patient?.leads ?? []).filter(
      (l: any) =>
        String(l?.status || "").toLowerCase() === "active" && !l?.explantedAt,
    );
    try {
      const pdfBlob = await fillReportForm(
        formData,
        patient,
        activeDevices,
        activeLeads,
        selectedDoctorForPdf,
      );
      if (pdfBlob) {
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `medical_report_${patient.fname}_${patient.lname}_${new Date().toISOString().split("T")[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success("PDF report generated successfully!");
      } else {
        toast.error("Failed to generate PDF report");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF report");
    }
  };
  // Available doctors for selection
  const availableDoctors = (patient as any)?.patientDoctors || [];

  // Debug function to see available form fields
  const handleDebugFields = async () => {
    const fields = await getFormFields();
    console.log("Available PDF form fields:", fields);
    console.log("Available fields", patient, formData);
    toast.info(
      `Found ${fields.length} form fields. Check console for details.`,
    );
  };

  // Validation helper function
  const validateField = (fieldName: string, value: any) => {
    const validator =
      fieldValidators[fieldName as keyof typeof fieldValidators];
    if (validator) {
      const result = validator(value);
      if (!result.isValid && result.error) {
        setValidationErrors((prev) => ({
          ...prev,
          [fieldName]: result.error!,
        }));
      } else {
        setValidationErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
      }
    }
  };

  const handleBlurValidation = (fieldName: string, value: any) => {
    validateField(fieldName, value);
  };

  // Helper for validated measurement changes
  const handleValidatedMeasurementChange = (
    fieldName: keyof Report,
    value: string,
    validatorName: keyof typeof fieldValidators,
  ) => {
    const numValue = value === "" ? undefined : parseFloat(value);
    setFormData((prev) => ({ ...prev, [fieldName]: numValue }));
    // Validate on change for measurements
    if (numValue !== undefined) {
      validateField(validatorName, numValue);
    } else {
      // Clear error if empty
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[validatorName];
        return newErrors;
      });
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    const isNumberField = type === "number";
    setFormData((prev) => ({
      ...prev,
      [name]: isNumberField && value !== "" ? parseFloat(value) : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData((prev) => ({ ...prev, reportDate: date }));
    }
  };

  const handleArrhythmiaChange = (
    index: number,
    field: keyof Arrhythmia,
    value: string,
  ) => {
    const updatedArrhythmias = [...(formData.arrhythmias || [])];
    updatedArrhythmias[index] = {
      ...updatedArrhythmias[index],
      [field]: value,
    };
    setFormData((prev) => ({ ...prev, arrhythmias: updatedArrhythmias }));
  };

  const addArrhythmia = () => {
    const arrhythmias = [...(formData.arrhythmias || []), initialArrhythmia];
    setFormData((prev) => ({ ...prev, arrhythmias }));
  };

  const removeArrhythmia = (index: number) => {
    const arrhythmias = (formData.arrhythmias || []).filter(
      (_, i) => i !== index,
    );
    setFormData((prev) => ({ ...prev, arrhythmias }));
  };

  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingSignatureRef = useRef(false);

  // Keep the canvas drawing buffer in sync with its displayed size to avoid pointer offsets
  useEffect(() => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }, []);

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFormData((prev) => ({ ...prev, completedBySignature: undefined }));
  };

  const getCanvasPoint = (
    e: React.PointerEvent<HTMLCanvasElement>,
  ): { x: number; y: number } => {
    const canvas = signatureCanvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    const scaleX = rect && canvas ? canvas.width / rect.width : 1;
    const scaleY = rect && canvas ? canvas.height / rect.height : 1;
    const x = (e.clientX - (rect?.left || 0)) * scaleX;
    const y = (e.clientY - (rect?.top || 0)) * scaleY;
    return { x, y };
  };

  const handleSignaturePointerDown = (
    e: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    isDrawingSignatureRef.current = true;
  };

  const handleSignaturePointerMove = (
    e: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawingSignatureRef.current) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleSignaturePointerUp = () => {
    if (!isDrawingSignatureRef.current) return;
    isDrawingSignatureRef.current = false;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    setFormData((prev) => ({ ...prev, completedBySignature: dataUrl }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.reportType) {
      toast.error("Report Type is required");
      return;
    }
    if (!formData.reportStatus) {
      toast.error("Report Status is required");
      return;
    }

    if (formData.isCompleted && !canComplete) {
      toast.error("Only staff doctors or admins can mark reports completed.");
      return;
    }

    if (formData.isCompleted && requireSignature && !formData.completedBySignature) {
      toast.error("Signature is required for staff doctors when completing a report.");
      return;
    }

    setIsSubmitting(true);

    let mergedPdfBlob: Blob | null = null;

    // Only perform merge logic if new files have been added
    if (pdfManager.files.length > 0) {
      // If we are editing and a PDF already exists, fetch it first
      if (isEdit && currentReport?.file_url) {
        try {
          // FIX: Use the correct API path for fetching the existing PDF
          const apiPath = currentReport.file_url?.replace(
            "/uploads/",
            "/files/",
          );
          const response = await api.get(apiPath, { responseType: "blob" });
          const existingPdfFile = new File(
            [response.data],
            "existing-report.pdf",
            { type: "application/pdf" },
          );

          // Create a new array with existing file first, then new files
          const allFiles = [existingPdfFile, ...pdfManager.files];

          // Merge all files using the PDF manager's merge function directly
          mergedPdfBlob = await pdfManager.mergePdfsFromArray(allFiles);
        } catch (error) {
          console.error("Failed to fetch existing PDF for merging:", error);
          setIsSubmitting(false);
          return;
        }
      } else {
        // No existing PDF, just merge the new files
        mergedPdfBlob = await pdfManager.mergePdfs();
      }
    }

    const submissionData = new FormData();
    submissionData.append("patientId", patient.id.toString());

    const submissionPayload: Record<string, unknown> = { ...formData };

    // Only send reviewer attribution when completion is enabled and permitted
    if (!submissionPayload.isCompleted) {
      submissionPayload.completedByName = undefined;
      submissionPayload.completedBySignature = undefined;
    } else if (!requireSignature) {
      submissionPayload.completedBySignature = undefined;
    } else if (!submissionPayload.completedByName && user) {
      submissionPayload.completedByName = user.fullName || user.username;
    }

    // If merging PDFs was successful, append the merged PDF blob
    if (mergedPdfBlob) {
      // Use a descriptive filename
      const fileName = `report_${patient.id}_${new Date().toISOString().split("T")[0]}.pdf`;
      submissionData.append("file", mergedPdfBlob, fileName);
    }

    // Append all form fields
    Object.entries(submissionPayload).forEach(([key, value]) => {
      if (key === "arrhythmias") {
        submissionData.append(key, JSON.stringify(value));
      } else if (key === "tags") {
        submissionData.append(key, JSON.stringify(value));
      } else if (value instanceof Date) {
        // Send as date-only string to avoid timezone-induced day shifts
        submissionData.append(key, format(value, "yyyy-MM-dd"));
      } else if (value !== null && value !== undefined) {
        submissionData.append(key, String(value));
      }
    });

    try {
      const config = {
        headers: { "Content-Type": "multipart/form-data" },
      };
      if (isEdit && reportId) {
        const response = await api.put(
          `/reports/${reportId}`,
          submissionData,
          config,
        );
        setCurrentReport(response.data);
        // toast.success("Report updated successfully!")
      } else {
        await api.post("/reports", submissionData, config);
      }
      toast.success(`Report ${isEdit ? "updated" : "created"} successfully!`, {
        action: {
          label: "View Report List",
          onClick: () => navigate(`/patients/${patient.id}/reports`),
        },
      });
      // Clear the PDF files after successful submission
      // This prevents the same files from being uploaded again
      pdfManager.files.forEach(() => pdfManager.removeFile(0));
      // Clear the draft after successful submission
      clearDraft();
      // navigate(`/patients/${patient.id}/reports`)
    } catch (error) {
      console.error("Failed to submit report", error);
      toast.error(`Failed to ${isEdit ? "update" : "create"} report`);
    } finally {
      setIsSubmitting(false);
    }
  };

  useFormShortcuts(handleSubmit);

  const activeDevices = (patient?.devices ?? []).filter(
    (d: any) =>
      String(d?.status || "").toLowerCase() === "active" && !d?.explantedAt,
  );

  // Device capability detection
  const hasDefibrillator = activeDevices.some((d: any) => {
    const typeStr = (
      d?.device?.type ||
      d?.device_type ||
      d?.device?.name ||
      ""
    ).toLowerCase();
    return (
      typeStr.includes("defib") ||
      typeStr.includes("defibrillator") ||
      typeStr.includes("icd") ||
      typeStr.includes("crt-d") ||
      typeStr.includes("crt d") ||
      typeStr.includes("cardioverter")
    );
  });

  // Loop recorder / ICM / ILR detection
  const hasLoopRecorder = activeDevices.some((d: any) => {
    const typeStr = (
      d?.device?.type ||
      d?.device_type ||
      d?.device?.name ||
      d?.device?.model ||
      ""
    ).toLowerCase();
    return (
      typeStr.includes("ilr") ||
      typeStr.includes("loop recorder") ||
      typeStr.includes("implanted loop") ||
      typeStr.includes("implantable loop") ||
      typeStr.includes("icm") ||
      typeStr.includes("insertable cardiac monitor") ||
      typeStr.includes("implantable cardiac monitor") ||
      typeStr.includes("linq") ||
      typeStr.includes("reveal") ||
      typeStr.includes("biomonitor") ||
      typeStr.includes("confirm") ||
      typeStr.includes("jot")
    );
  });

  // Check if device has BiV/CRT capability (left ventricular lead)
  const hasBiventricularPacing =
    activeDevices.some((d: any) => {
      const typeStr = (
        d?.device?.type ||
        d?.device_type ||
        d?.device?.name ||
        ""
      ).toLowerCase();
      return (
        typeStr.includes("crt") ||
        typeStr.includes("biventricular") ||
        typeStr.includes("bi-v") ||
        typeStr.includes("biv")
      );
    }) ||
    (patient?.leads ?? []).some(
      (l: any) =>
        String(l?.status || "").toLowerCase() === "active" &&
        !l?.explantedAt &&
        l?.chamber?.toLowerCase().includes("lv"),
    );

  // Check if device has atrial pacing (dual chamber)
  const hasAtrialPacing =
    activeDevices.some((d: any) => {
      const typeStr = (
        d?.device?.type ||
        d?.device_type ||
        d?.device?.name ||
        d?.device?.model ||
        ""
      ).toLowerCase();
      return (
        typeStr.includes("dual") ||
        typeStr.includes("ddd") ||
        typeStr.includes("crt") // CRT devices are typically dual chamber
      );
    }) ||
    (patient?.leads ?? []).some(
      (l: any) =>
        String(l?.status || "").toLowerCase() === "active" &&
        !l?.explantedAt &&
        (l?.chamber?.toLowerCase().includes("ra") ||
          l?.chamber?.toLowerCase().includes("atrial")),
    );

  useEffect(() => {
    const patientName = `${patient.fname} ${patient.lname}`.trim();
    setItems([
      { label: "Home", href: "/" },
      { label: "Patients", href: "/patients" },
      { label: patientName, href: `/patients/${patient.id}` },
      { label: "Reports", href: `/patients/${patient.id}/reports` },
      { label: isEdit ? "Edit Report" : "New Report", current: true },
    ]);
  }, [patient.id, patient.fname, patient.lname, isEdit, setItems]);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          {!isEdit && (
            <>
              {draftStatus === "saved" && lastSaved && (
                <Badge variant="outline" className="gap-1.5">
                  <Save className="h-3 w-3" />
                  Draft saved {format(lastSaved, "HH:mm:ss")}
                </Badge>
              )}
              {draftStatus === "saving" && (
                <Badge variant="secondary" className="gap-1.5">
                  <Clock className="h-3 w-3 animate-pulse" />
                  Saving draft...
                </Badge>
              )}
              {draftStatus === "unsaved" && (
                <Badge variant="secondary" className="gap-1.5 opacity-60">
                  <Clock className="h-3 w-3" />
                  Unsaved changes
                </Badge>
              )}
            </>
          )}
          {!isEdit && prePopulatedFrom && (
            <Badge variant="default" className="gap-1.5">
              <FileText className="h-3 w-3" />
              Loaded from previous report
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEdit && previousReport && (
            <>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button
                    type="button"
                    variant={prePopulatedFrom ? "secondary" : "outline"}
                    size="sm"
                    onClick={loadFromPreviousReport}
                    disabled={
                      isLoadingPrevious ||
                      prePopulatedFrom === previousReport.id
                    }
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Load from Previous
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">
                      Auto-fill from Previous Report
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Loads device settings and tachy parameters from your last
                      report dated{" "}
                      <span className="font-medium">
                        {new Date(
                          previousReport.reportDate,
                        ).toLocaleDateString()}
                      </span>
                    </p>
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium">What gets loaded:</p>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        <li>Pacing mode & rate limits</li>
                        <li>AV delays</li>
                        <li>Tachy zones & therapies</li>
                      </ul>
                      <p className="font-medium mt-2">What stays blank:</p>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        <li>Measurements (impedances, sensing)</li>
                        <li>Battery diagnostics</li>
                        <li>Pacing percentages</li>
                        <li>Arrhythmias & comments</li>
                      </ul>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
              {prePopulatedFrom && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearPrePopulatedData}
                >
                  Clear
                </Button>
              )}
            </>
          )}
          <FileImporter onDataImported={handleDataImported} />
        </div>
      </div>
      <div>
        {/* active implanted device device manufacturer, name, serial and active implanted leads  manufacturer, name, serial */}
        {(() => {
          const p =
            typeof patient !== "undefined" && patient
              ? patient
              : typeof patient !== "undefined"
                ? patient
                : null;
          const activeDevices = (p?.devices ?? []).filter(
            (d: any) =>
              String(d?.status || "").toLowerCase() === "active" &&
              !d?.explantedAt,
          );
          const activeLeads = (p?.leads ?? []).filter(
            (l: any) =>
              String(l?.status || "").toLowerCase() === "active" &&
              !l?.explantedAt,
          );

          if (!p) return null;

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 border rounded-2xl shadow dark:bg-[#1c2430]">
              <div>
                <h4 className="text-sm font-medium mb-2">
                  Active Implanted Device(s)
                </h4>
                {activeDevices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active devices.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {activeDevices.map((d: any) => (
                      <li key={d.id} className="text-sm">
                        <span className="font-medium">
                          {d?.device?.manufacturer}
                        </span>
                        {" • "}
                        {d?.device?.name}
                        {" • "}
                        <span id="deviceSerial">SN: {d?.serial}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">
                  Active Implanted Lead(s)
                </h4>
                {activeLeads.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active leads.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {activeLeads.map((l: any) => (
                      <li key={l.id} className="text-sm">
                        <span className="font-medium">
                          {l?.lead?.manufacturer}
                        </span>
                        {" • "}
                        {l?.lead?.name}
                        {" • "}
                        SN: {l?.serial}
                        {l?.chamber ? (
                          <>
                            {" "}
                            {" • "} {l.chamber}
                          </>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>
              High-level details about this report.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium leading-tight">
                  Report Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-full justify-start px-2 py-0 text-left text-sm"
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {formData.reportDate ? (
                        format(new Date(formData.reportDate), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={
                        formData.reportDate
                          ? new Date(formData.reportDate)
                          : undefined
                      }
                      onSelect={handleDateChange}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium leading-tight">
                  Report Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  name="reportType"
                  value={formData.reportType || ""}
                  onValueChange={(value) =>
                    handleSelectChange("reportType", value)
                  }
                  required
                >
                  <SelectTrigger className="h-8 text-sm w-full min-w-0">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In Clinic">In Clinic</SelectItem>
                    <SelectItem value="Remote">Remote</SelectItem>
                    <SelectItem value="Triage">Triage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium leading-tight">
                  Report Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  name="reportStatus"
                  value={formData.reportStatus || ""}
                  onValueChange={(value) =>
                    handleSelectChange("reportStatus", value)
                  }
                  required
                >
                  <SelectTrigger className="h-8 text-sm w-full min-w-0">
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="currentHeartRate"
                  className="text-xs font-medium leading-tight"
                >
                  Heart Rate (bpm)
                </Label>
                <ValidatedInput
                  id="currentHeartRate"
                  name="currentHeartRate"
                  type="number"
                  value={formData.currentHeartRate || ""}
                  onChange={handleChange}
                  onBlurValidation={(value) =>
                    handleBlurValidation(
                      "heartRate",
                      parseFloat(value) || undefined,
                    )
                  }
                  error={validationErrors.heartRate}
                  placeholder="e.g., 60"
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium leading-tight">
                  Current Rhythm
                </Label>
                <Select
                  name="currentRhythm"
                  value={formData.currentRhythm || ""}
                  onValueChange={(value) =>
                    handleSelectChange("currentRhythm", value)
                  }
                >
                  <SelectTrigger className="h-8 text-sm w-full min-w-0">
                    <SelectValue placeholder="Select rhythm..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NSR">NSR</SelectItem>
                    <SelectItem value="AFib">AFib</SelectItem>
                    <SelectItem value="AFL">AFL</SelectItem>
                    <SelectItem value="Paced">Paced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium leading-tight">
                  Pacing Dependency
                </Label>
                <Select
                  name="currentDependency"
                  value={formData.currentDependency || ""}
                  onValueChange={(value) =>
                    handleSelectChange("currentDependency", value)
                  }
                >
                  <SelectTrigger className="h-8 text-sm w-full min-w-0">
                    <SelectValue placeholder="Select dependency..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dependent">Dependent</SelectItem>
                    <SelectItem value="Non-Dependent">Non-Dependent</SelectItem>
                    <SelectItem value="Intermittent">Intermittent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium leading-tight">
                  QRS Duration (ms)
                </Label>
                <ValidatedInput
                  id="qrs_duration"
                  name="qrs_duration"
                  type="number"
                  value={formData.qrs_duration || ""}
                  onChange={handleChange}
                  onBlurValidation={(value) =>
                    handleBlurValidation(
                      "qrsDuration",
                      parseFloat(value) || undefined,
                    )
                  }
                  error={validationErrors.qrsDuration}
                  placeholder="e.g., 80-120"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        {/* tags card */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>Select tags for this report.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isSelected = (formData.tags || []).some(
                  (t) => t.ID === tag.ID,
                );
                return (
                  <div
                    key={tag.ID}
                    onClick={() => toggleTag(tag.ID)}
                    className={`
                    cursor-pointer px-3 py-1 rounded-full text-sm font-medium transition-colors
                    ${
                      isSelected
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }
                  `}
                    style={
                      isSelected && tag.color
                        ? { backgroundColor: tag.color, color: "#fff" }
                        : {}
                    }
                  >
                    {tag.name}
                  </div>
                );
              })}
              {availableTags.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No tags available.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {!hasLoopRecorder && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Bradycardia Settings</CardTitle>
                <CardDescription>
                  Programmed parameters for bradycardia pacing.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2 min-w-0">
                  <Label>Mode</Label>
                  <Select
                    name="mdc_idc_set_brady_mode"
                    value={formData.mdc_idc_set_brady_mode || ""}
                    onValueChange={(value) =>
                      handleSelectChange("mdc_idc_set_brady_mode", value)
                    }
                  >
                    <SelectTrigger className="h-8 text-sm w-full min-w-0">
                      <SelectValue placeholder="Select mode..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AAI">AAI</SelectItem>
                      <SelectItem value="VVI">VVI</SelectItem>
                      <SelectItem value="AAIR">AAIR</SelectItem>
                      <SelectItem value="VVIR">VVIR</SelectItem>
                      <SelectItem value="VVI-CLS">VVI-CLS</SelectItem>
                      <SelectItem value="DDD-CLS">DDD-CLS</SelectItem>
                      <SelectItem value="DDD">DDD</SelectItem>
                      <SelectItem value="DDDR">DDDR</SelectItem>
                      <SelectItem value="DDI">DDI</SelectItem>
                      <SelectItem value="DDIR">DDIR</SelectItem>
                      <SelectItem value="AAI DDD">AAI DDD</SelectItem>
                      <SelectItem value="AAIR DDDR">AAIR DDDR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="mdc_idc_set_brady_lowrate">LRL (bpm)</Label>
                  <ValidatedInput
                    id="mdc_idc_set_brady_lowrate"
                    name="mdc_idc_set_brady_lowrate"
                    type="number"
                    value={formData.mdc_idc_set_brady_lowrate || ""}
                    onChange={handleChange}
                    onBlurValidation={(value) =>
                      handleBlurValidation(
                        "heartRate",
                        parseFloat(value) || undefined,
                      )
                    }
                    error={
                      validationErrors.heartRate &&
                      formData.mdc_idc_set_brady_lowrate !== undefined
                        ? validationErrors.heartRate
                        : undefined
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mdc_idc_set_brady_max_tracking_rate">
                    MTR (bpm)
                  </Label>
                  <ValidatedInput
                    id="mdc_idc_set_brady_max_tracking_rate"
                    name="mdc_idc_set_brady_max_tracking_rate"
                    type="number"
                    value={formData.mdc_idc_set_brady_max_tracking_rate || ""}
                    onChange={handleChange}
                    onBlurValidation={(value) =>
                      handleBlurValidation(
                        "heartRate",
                        parseFloat(value) || undefined,
                      )
                    }
                    error={
                      validationErrors.heartRate &&
                      formData.mdc_idc_set_brady_max_tracking_rate !== undefined
                        ? validationErrors.heartRate
                        : undefined
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mdc_idc_set_brady_max_sensor_rate">
                    MSR (bpm)
                  </Label>
                  <ValidatedInput
                    id="mdc_idc_set_brady_max_sensor_rate"
                    name="mdc_idc_set_brady_max_sensor_rate"
                    type="number"
                    value={formData.mdc_idc_set_brady_max_sensor_rate || ""}
                    onChange={handleChange}
                    onBlurValidation={(value) =>
                      handleBlurValidation(
                        "heartRate",
                        parseFloat(value) || undefined,
                      )
                    }
                    error={
                      validationErrors.heartRate &&
                      formData.mdc_idc_set_brady_max_sensor_rate !== undefined
                        ? validationErrors.heartRate
                        : undefined
                    }
                  />
                </div>
              </CardContent>
            </Card>
            {/* tachy settings card */}
            <Card>
              <CardHeader>
                <CardTitle>Tachy Settings</CardTitle>
                <CardDescription>
                  Programmed parameters for tachycardia.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-1 gap-4">
                {hasDefibrillator ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Zone</TableHead>
                        <TableHead>Detection</TableHead>
                        <TableHead>1. ATP</TableHead>
                        <TableHead>2. ATP</TableHead>
                        <TableHead>1. Shock</TableHead>
                        <TableHead>2. Shock</TableHead>
                        <TableHead>3. nth</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* VT1 row */}
                      <TableRow>
                        <TableCell className="font-medium">VT1</TableCell>
                        <TableCell>
                          {formData.VT1_detection_interval
                            ? `${formData.VT1_detection_interval} ms`
                            : ""}
                        </TableCell>
                        <TableCell>
                          {[
                            formData.VT1_therapy_1_atp,
                            formData.VT1_therapy_1_no_bursts,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </TableCell>
                        <TableCell>
                          {[
                            formData.VT1_therapy_2_atp,
                            formData.VT1_therapy_2_no_bursts,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </TableCell>
                        <TableCell>
                          {[formData.VT1_therapy_3_energy].filter(Boolean)}
                        </TableCell>
                        <TableCell>{formData.VT1_therapy_4_energy}</TableCell>
                        <TableCell>
                          {[
                            formData.VT1_therapy_5_energy,
                            formData.VT1_therapy_5_max_num_shocks,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </TableCell>
                      </TableRow>

                      {/* VT2 row */}
                      <TableRow>
                        <TableCell className="font-medium">VT2</TableCell>
                        <TableCell>
                          {formData.VT2_detection_interval
                            ? `${formData.VT2_detection_interval} ms`
                            : ""}
                        </TableCell>
                        <TableCell>
                          {[
                            formData.VT2_therapy_1_atp,
                            formData.VT2_therapy_1_no_bursts,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </TableCell>
                        <TableCell>
                          {[
                            formData.VT2_therapy_2_atp,
                            formData.VT2_therapy_2_no_bursts,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </TableCell>
                        <TableCell>
                          {[formData.VT2_therapy_3_energy]
                            .filter(Boolean)
                            .join(" • ")}
                        </TableCell>
                        <TableCell>
                          {[formData.VT2_therapy_4_energy]
                            .filter(Boolean)
                            .join(" • ")}
                        </TableCell>
                        <TableCell>
                          {[
                            formData.VT2_therapy_5_energy,
                            formData.VT2_therapy_5_max_num_shocks,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </TableCell>
                      </TableRow>

                      {/* VF row */}
                      <TableRow>
                        <TableCell className="font-medium">VF</TableCell>
                        <TableCell>
                          {formData.VF_detection_interval
                            ? `${formData.VF_detection_interval} ms`
                            : ""}
                        </TableCell>
                        <TableCell colSpan={2}>
                          {[
                            formData.VF_therapy_1_atp,
                            formData.VF_therapy_1_no_bursts,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </TableCell>
                        <TableCell>{[formData.VF_therapy_2_energy]}</TableCell>
                        <TableCell>{[formData.VF_therapy_3_energy]}</TableCell>
                        <TableCell>
                          {[
                            formData.VF_therapy_4_energy,
                            formData.VF_therapy_4_max_num_shocks,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Implanted device has no tachy settings.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {hasLoopRecorder && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>ILR Measurements</CardTitle>
                <CardDescription>
                  Battery and sensing measurements only.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mdc_idc_batt_volt">Battery Voltage (V)</Label>
                  <ValidatedInput
                    id="mdc_idc_batt_volt"
                    name="mdc_idc_batt_volt"
                    type="number"
                    step="any"
                    value={formData.mdc_idc_batt_volt || ""}
                    onChange={handleChange}
                    onBlurValidation={(value) =>
                      handleBlurValidation(
                        "batteryVoltage",
                        parseFloat(value) || undefined,
                      )
                    }
                    error={validationErrors.batteryVoltage}
                  />
                </div>

                <div className="space-y-2 min-w-0">
                  <Label>Battery Status</Label>
                  <Select
                    name="mdc_idc_batt_status"
                    value={formData.mdc_idc_batt_status || ""}
                    onValueChange={(value) =>
                      handleSelectChange("mdc_idc_batt_status", value)
                    }
                  >
                    <SelectTrigger className="h-8 text-sm w-full min-w-0">
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BOL">
                        BOL (Beginning Of Life)
                      </SelectItem>
                      <SelectItem value="OK">OK</SelectItem>
                      <SelectItem value="MOS">
                        MOS (Middle Of Service)
                      </SelectItem>
                      <SelectItem value="ERI">
                        ERI (Elective Replacement)
                      </SelectItem>
                      <SelectItem value="EOL">EOL (End of Life)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mdc_idc_msmt_rv_sensing">
                    RV Sensing Mean (mV)
                  </Label>
                  <ValidatedInput
                    id="mdc_idc_msmt_rv_sensing"
                    name="mdc_idc_msmt_rv_sensing"
                    type="number"
                    step="any"
                    value={formData.mdc_idc_msmt_rv_sensing || ""}
                    onChange={(e) =>
                      handleValidatedMeasurementChange(
                        "mdc_idc_msmt_rv_sensing",
                        e.target.value,
                        "sensing",
                      )
                    }
                    error={
                      validationErrors.sensing &&
                      formData.mdc_idc_msmt_rv_sensing !== undefined
                        ? validationErrors.sensing
                        : undefined
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Episode Counts</CardTitle>
                <CardDescription>Since last check.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">Episode Type</TableHead>
                      <TableHead className="w-[180px] text-left">
                        Count
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-semibold text-left">
                        AF
                      </TableCell>
                      <TableCell className="text-left">
                        <Input
                          name="episode_af_count_since_last_check"
                          type="number"
                          min={0}
                          step={1}
                          value={
                            formData.episode_af_count_since_last_check ?? ""
                          }
                          onChange={handleChange}
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-left">
                        Tachy
                      </TableCell>
                      <TableCell className="text-left">
                        <Input
                          name="episode_tachy_count_since_last_check"
                          type="number"
                          min={0}
                          step={1}
                          value={
                            formData.episode_tachy_count_since_last_check ?? ""
                          }
                          onChange={handleChange}
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-left">
                        Pause
                      </TableCell>
                      <TableCell className="text-left">
                        <Input
                          name="episode_pause_count_since_last_check"
                          type="number"
                          min={0}
                          step={1}
                          value={
                            formData.episode_pause_count_since_last_check ?? ""
                          }
                          onChange={handleChange}
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-left">
                        Symptom (All)
                      </TableCell>
                      <TableCell className="text-left">
                        <Input
                          name="episode_symptom_all_count_since_last_check"
                          type="number"
                          min={0}
                          step={1}
                          value={
                            formData.episode_symptom_all_count_since_last_check ??
                            ""
                          }
                          onChange={handleChange}
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-left">
                        Symptom (With Detection)
                      </TableCell>
                      <TableCell className="text-left">
                        <Input
                          name="episode_symptom_with_detection_count_since_last_check"
                          type="number"
                          min={0}
                          step={1}
                          value={
                            formData.episode_symptom_with_detection_count_since_last_check ??
                            ""
                          }
                          onChange={handleChange}
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {!hasLoopRecorder && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Pacing Percentages</CardTitle>
                <CardDescription>
                  Enter the percentage of time each chamber was paced.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hasAtrialPacing && (
                  <div className="space-y-2">
                    <Label htmlFor="mdc_idc_stat_brady_ra_percent_paced">
                      RA Paced (%)
                    </Label>
                    <Input
                      id="mdc_idc_stat_brady_ra_percent_paced"
                      name="mdc_idc_stat_brady_ra_percent_paced"
                      type="number"
                      step="any"
                      value={formData.mdc_idc_stat_brady_ra_percent_paced || ""}
                      onChange={handleChange}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="mdc_idc_stat_brady_rv_percent_paced">
                    RV Paced (%)
                  </Label>
                  <Input
                    id="mdc_idc_stat_brady_rv_percent_paced"
                    name="mdc_idc_stat_brady_rv_percent_paced"
                    type="number"
                    step="any"
                    value={formData.mdc_idc_stat_brady_rv_percent_paced || ""}
                    onChange={handleChange}
                  />
                </div>
                {hasBiventricularPacing && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="mdc_idc_stat_brady_lv_percent_paced">
                        LV Paced (%)
                      </Label>
                      <Input
                        id="mdc_idc_stat_brady_lv_percent_paced"
                        name="mdc_idc_stat_brady_lv_percent_paced"
                        type="number"
                        step="any"
                        value={
                          formData.mdc_idc_stat_brady_lv_percent_paced || ""
                        }
                        onChange={handleChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mdc_idc_stat_brady_biv_percent_paced">
                        BiV Paced (%)
                      </Label>
                      <Input
                        id="mdc_idc_stat_brady_biv_percent_paced"
                        name="mdc_idc_stat_brady_biv_percent_paced"
                        type="number"
                        step="any"
                        value={
                          formData.mdc_idc_stat_brady_biv_percent_paced || ""
                        }
                        onChange={handleChange}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Battery & Device Diagnostics</CardTitle>
                <CardDescription>
                  Details about the device's battery and health.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mdc_idc_batt_volt">Battery Voltage (V)</Label>
                  <ValidatedInput
                    id="mdc_idc_batt_volt"
                    name="mdc_idc_batt_volt"
                    type="number"
                    step="any"
                    value={formData.mdc_idc_batt_volt || ""}
                    onChange={handleChange}
                    onBlurValidation={(value) =>
                      handleBlurValidation(
                        "batteryVoltage",
                        parseFloat(value) || undefined,
                      )
                    }
                    error={validationErrors.batteryVoltage}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mdc_idc_batt_remaining">
                    Longevity (yrs)
                  </Label>
                  <Input
                    id="mdc_idc_batt_remaining"
                    name="mdc_idc_batt_remaining"
                    type="number"
                    step="any"
                    value={formData.mdc_idc_batt_remaining || ""}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mdc_idc_batt_percentage">Longevity (%)</Label>
                  <ValidatedInput
                    id="mdc_idc_batt_percentage"
                    name="mdc_idc_batt_percentage"
                    type="number"
                    step="any"
                    value={formData.mdc_idc_batt_percentage || ""}
                    onChange={handleChange}
                    onBlurValidation={(value) =>
                      handleBlurValidation(
                        "percentage",
                        parseFloat(value) || undefined,
                      )
                    }
                    error={validationErrors.percentage}
                  />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Battery Status</Label>
                  <Select
                    name="mdc_idc_batt_status"
                    value={formData.mdc_idc_batt_status || ""}
                    onValueChange={(value) =>
                      handleSelectChange("mdc_idc_batt_status", value)
                    }
                  >
                    <SelectTrigger className="h-8 text-sm w-full min-w-0">
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BOL">
                        BOL (Beginning Of Life)
                      </SelectItem>
                      <SelectItem value="OK">OK</SelectItem>
                      <SelectItem value="MOS">
                        MOS (Middle Of Service)
                      </SelectItem>
                      <SelectItem value="ERI">
                        ERI (Elective Replacement)
                      </SelectItem>
                      <SelectItem value="EOL">EOL (End of Life)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {hasDefibrillator && (
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="mdc_idc_cap_charge_time">
                      Charge Time (s)
                    </Label>
                    <ValidatedInput
                      id="mdc_idc_cap_charge_time"
                      name="mdc_idc_cap_charge_time"
                      type="number"
                      step="any"
                      value={formData.mdc_idc_cap_charge_time || ""}
                      onChange={handleChange}
                      onBlurValidation={(value) =>
                        handleBlurValidation(
                          "chargeTime",
                          parseFloat(value) || undefined,
                        )
                      }
                      error={validationErrors.chargeTime}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {!hasLoopRecorder && (
          <Card>
            <CardHeader>
              <CardTitle>Lead Measurements</CardTitle>
              <CardDescription>
                Enter the measured values for each lead chamber.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Chamber</TableHead>
                    <TableHead>Impedance (Ω)</TableHead>
                    <TableHead>Sensing (mV)</TableHead>
                    <TableHead>Threshold (V)</TableHead>
                    <TableHead>Pulse Width (ms)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hasAtrialPacing && (
                    <TableRow>
                      <TableCell className="font-semibold">RA</TableCell>
                      <TableCell>
                        <ValidatedInput
                          id="mdc_idc_msmt_ra_impedance_mean"
                          name="mdc_idc_msmt_ra_impedance_mean"
                          type="number"
                          step="any"
                          value={formData.mdc_idc_msmt_ra_impedance_mean || ""}
                          onChange={(e) =>
                            handleValidatedMeasurementChange(
                              "mdc_idc_msmt_ra_impedance_mean",
                              e.target.value,
                              "impedance",
                            )
                          }
                          error={
                            validationErrors.impedance &&
                            formData.mdc_idc_msmt_ra_impedance_mean !==
                              undefined
                              ? validationErrors.impedance
                              : undefined
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <ValidatedInput
                          id="mdc_idc_msmt_ra_sensing"
                          name="mdc_idc_msmt_ra_sensing"
                          type="number"
                          step="any"
                          value={formData.mdc_idc_msmt_ra_sensing || ""}
                          onChange={(e) =>
                            handleValidatedMeasurementChange(
                              "mdc_idc_msmt_ra_sensing",
                              e.target.value,
                              "sensing",
                            )
                          }
                          error={
                            validationErrors.sensing &&
                            formData.mdc_idc_msmt_ra_sensing !== undefined
                              ? validationErrors.sensing
                              : undefined
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <ValidatedInput
                          id="mdc_idc_msmt_ra_pacing_threshold"
                          name="mdc_idc_msmt_ra_pacing_threshold"
                          type="number"
                          step="any"
                          value={
                            formData.mdc_idc_msmt_ra_pacing_threshold || ""
                          }
                          onChange={(e) =>
                            handleValidatedMeasurementChange(
                              "mdc_idc_msmt_ra_pacing_threshold",
                              e.target.value,
                              "threshold",
                            )
                          }
                          error={
                            validationErrors.threshold &&
                            formData.mdc_idc_msmt_ra_pacing_threshold !==
                              undefined
                              ? validationErrors.threshold
                              : undefined
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <ValidatedInput
                          id="mdc_idc_msmt_ra_pw"
                          name="mdc_idc_msmt_ra_pw"
                          type="number"
                          step="any"
                          value={formData.mdc_idc_msmt_ra_pw || ""}
                          onChange={(e) =>
                            handleValidatedMeasurementChange(
                              "mdc_idc_msmt_ra_pw",
                              e.target.value,
                              "pulseWidth",
                            )
                          }
                          error={
                            validationErrors.pulseWidth &&
                            formData.mdc_idc_msmt_ra_pw !== undefined
                              ? validationErrors.pulseWidth
                              : undefined
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell className="font-semibold">RV</TableCell>
                    <TableCell>
                      <ValidatedInput
                        id="mdc_idc_msmt_rv_impedance_mean"
                        name="mdc_idc_msmt_rv_impedance_mean"
                        type="number"
                        step="any"
                        value={formData.mdc_idc_msmt_rv_impedance_mean || ""}
                        onChange={(e) =>
                          handleValidatedMeasurementChange(
                            "mdc_idc_msmt_rv_impedance_mean",
                            e.target.value,
                            "impedance",
                          )
                        }
                        error={
                          validationErrors.impedance &&
                          formData.mdc_idc_msmt_rv_impedance_mean !== undefined
                            ? validationErrors.impedance
                            : undefined
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <ValidatedInput
                        id="mdc_idc_msmt_rv_sensing"
                        name="mdc_idc_msmt_rv_sensing"
                        type="number"
                        step="any"
                        value={formData.mdc_idc_msmt_rv_sensing || ""}
                        onChange={(e) =>
                          handleValidatedMeasurementChange(
                            "mdc_idc_msmt_rv_sensing",
                            e.target.value,
                            "sensing",
                          )
                        }
                        error={
                          validationErrors.sensing &&
                          formData.mdc_idc_msmt_rv_sensing !== undefined
                            ? validationErrors.sensing
                            : undefined
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <ValidatedInput
                        id="mdc_idc_msmt_rv_pacing_threshold"
                        name="mdc_idc_msmt_rv_pacing_threshold"
                        type="number"
                        step="any"
                        value={formData.mdc_idc_msmt_rv_pacing_threshold || ""}
                        onChange={(e) =>
                          handleValidatedMeasurementChange(
                            "mdc_idc_msmt_rv_pacing_threshold",
                            e.target.value,
                            "threshold",
                          )
                        }
                        error={
                          validationErrors.threshold &&
                          formData.mdc_idc_msmt_rv_pacing_threshold !==
                            undefined
                            ? validationErrors.threshold
                            : undefined
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <ValidatedInput
                        id="mdc_idc_msmt_rv_pw"
                        name="mdc_idc_msmt_rv_pw"
                        type="number"
                        step="any"
                        value={formData.mdc_idc_msmt_rv_pw || ""}
                        onChange={(e) =>
                          handleValidatedMeasurementChange(
                            "mdc_idc_msmt_rv_pw",
                            e.target.value,
                            "pulseWidth",
                          )
                        }
                        error={
                          validationErrors.pulseWidth &&
                          formData.mdc_idc_msmt_rv_pw !== undefined
                            ? validationErrors.pulseWidth
                            : undefined
                        }
                      />
                    </TableCell>
                  </TableRow>
                  {hasBiventricularPacing && (
                    <TableRow>
                      <TableCell className="font-semibold">LV</TableCell>
                      <TableCell>
                        <ValidatedInput
                          id="mdc_idc_msmt_lv_impedance_mean"
                          name="mdc_idc_msmt_lv_impedance_mean"
                          type="number"
                          step="any"
                          value={formData.mdc_idc_msmt_lv_impedance_mean || ""}
                          onChange={(e) =>
                            handleValidatedMeasurementChange(
                              "mdc_idc_msmt_lv_impedance_mean",
                              e.target.value,
                              "impedance",
                            )
                          }
                          error={
                            validationErrors.impedance &&
                            formData.mdc_idc_msmt_lv_impedance_mean !==
                              undefined
                              ? validationErrors.impedance
                              : undefined
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <ValidatedInput
                          id="mdc_idc_msmt_lv_sensing"
                          name="mdc_idc_msmt_lv_sensing"
                          type="number"
                          step="any"
                          value={formData.mdc_idc_msmt_lv_sensing || ""}
                          onChange={(e) =>
                            handleValidatedMeasurementChange(
                              "mdc_idc_msmt_lv_sensing",
                              e.target.value,
                              "sensing",
                            )
                          }
                          error={
                            validationErrors.sensing &&
                            formData.mdc_idc_msmt_lv_sensing !== undefined
                              ? validationErrors.sensing
                              : undefined
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <ValidatedInput
                          id="mdc_idc_msmt_lv_pacing_threshold"
                          name="mdc_idc_msmt_lv_pacing_threshold"
                          type="number"
                          step="any"
                          value={
                            formData.mdc_idc_msmt_lv_pacing_threshold || ""
                          }
                          onChange={(e) =>
                            handleValidatedMeasurementChange(
                              "mdc_idc_msmt_lv_pacing_threshold",
                              e.target.value,
                              "threshold",
                            )
                          }
                          error={
                            validationErrors.threshold &&
                            formData.mdc_idc_msmt_lv_pacing_threshold !==
                              undefined
                              ? validationErrors.threshold
                              : undefined
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <ValidatedInput
                          id="mdc_idc_msmt_lv_pw"
                          name="mdc_idc_msmt_lv_pw"
                          type="number"
                          step="any"
                          value={formData.mdc_idc_msmt_lv_pw || ""}
                          onChange={(e) =>
                            handleValidatedMeasurementChange(
                              "mdc_idc_msmt_lv_pw",
                              e.target.value,
                              "pulseWidth",
                            )
                          }
                          error={
                            validationErrors.pulseWidth &&
                            formData.mdc_idc_msmt_lv_pw !== undefined
                              ? validationErrors.pulseWidth
                              : undefined
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {hasDefibrillator && (
                <div className="mt-4 border-t pt-4">
                  <Label className="pb-2">RV Shock Impedance (Ω)</Label>
                  <ValidatedInput
                    id="mdc_idc_msmt_hv_impedance_mean"
                    name="mdc_idc_msmt_hv_impedance_mean"
                    type="number"
                    step="any"
                    value={formData.mdc_idc_msmt_hv_impedance_mean || ""}
                    onChange={(e) =>
                      handleValidatedMeasurementChange(
                        "mdc_idc_msmt_hv_impedance_mean",
                        e.target.value,
                        "shockImpedance",
                      )
                    }
                    error={validationErrors.shockImpedance}
                    className="max-w-xs"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Arrhythmia Events</CardTitle>
            <CardDescription>
              Add one or more arrhythmia events observed in this report.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(formData.arrhythmias || []).map((arr, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg space-y-4 relative bg-muted/50"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 pb-2"
                  onClick={() => removeArrhythmia(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="pb-2">Name</Label>
                    <Select
                      value={arr.name}
                      onValueChange={(value) =>
                        handleArrhythmiaChange(index, "name", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select arrhythmia type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="af">Atrial Fibrillation</SelectItem>
                        <SelectItem value="afl">Atrial Flutter</SelectItem>
                        <SelectItem value="svt">
                          Superventricular Tachycardia
                        </SelectItem>
                        <SelectItem value="nsvt">
                          Non Sustained Ventricular Tachycardia
                        </SelectItem>
                        <SelectItem value="vt">
                          Ventricular Tachycardia
                        </SelectItem>
                        <SelectItem value="vf">
                          Ventricular Fibrillation
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* <div><Label className='pb-2'>Symptoms</Label><Input value={arr.symptoms} onChange={e => handleArrhythmiaChange(index, 'symptoms', e.target.value)} placeholder="e.g., Palpitations" /></div> */}

                  <div>
                    <Label className="pb-2">Symptoms</Label>
                    <Select
                      value={arr.symptoms}
                      onValueChange={(value) =>
                        handleArrhythmiaChange(index, "symptoms", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select symptom type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="palpatations">
                          Palpatations
                        </SelectItem>
                        <SelectItem value="pre-syncope">Pre-syncope</SelectItem>
                        <SelectItem value="syncope">Syncope</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="pb-2">Rate (bpm)</Label>
                    <Input
                      type="number"
                      value={arr.rate}
                      onChange={(e) =>
                        handleArrhythmiaChange(index, "rate", e.target.value)
                      }
                      placeholder="e.g., 150"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* <div><Label className='pb-2'>Termination</Label><Input value={arr.termination} onChange={e => handleArrhythmiaChange(index, 'termination', e.target.value)} placeholder="e.g., Spontaneous" /></div> */}
                  <div>
                    <Label className="pb-2">Termination</Label>
                    <Select
                      value={arr.termination}
                      onValueChange={(value) =>
                        handleArrhythmiaChange(index, "termination", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select temination method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ongoing">On Going</SelectItem>
                        <SelectItem value="spontanous">Spontanous</SelectItem>
                        <SelectItem value="atp">Ant Tachy pacing</SelectItem>
                        <SelectItem value="shock">Cardioversion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="pb-2">Therapies</Label>
                    <Input
                      value={arr.therapies}
                      onChange={(e) =>
                        handleArrhythmiaChange(
                          index,
                          "therapies",
                          e.target.value,
                        )
                      }
                      placeholder="e.g., ATP"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addArrhythmia}>
              <Plus className="mr-2 h-4 w-4" /> Add Arrhythmia Event
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comments</CardTitle>
            <CardDescription>
              Any notes or comments about this report.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2 pt-2">
              <AutocompleteTextarea
                id="comments"
                name="comments"
                value={formData.comments || ""}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, comments: value }))
                }
                suggestions={REPORT_COMMENT_SUGGESTIONS}
                placeholder="Add any relevant comments here... (Start typing to see suggestions)"
                className="min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Start typing to see suggestions. Use ↑↓ arrows to navigate,
                Enter to select, Esc to dismiss.
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="isCompleted"
                name="isCompleted"
                checked={!!formData.isCompleted}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    isCompleted: !!checked,
                    ...(checked
                      ? {}
                      : { completedByName: "", completedBySignature: undefined }),
                  }))
                }
              />
              <Label htmlFor="isCompleted" className="font-normal">
                Mark as Completed
              </Label>
            </div>

            {canComplete && formData.isCompleted && (
              <div className="space-y-3 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="completedByName">Reviewer Name</Label>
                  <Input
                    id="completedByName"
                    name="completedByName"
                    value={formData.completedByName || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        completedByName: e.target.value,
                      }))
                    }
                    placeholder="Enter your name"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Digital Signature</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={clearSignature}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-2">
                    <canvas
                      ref={signatureCanvasRef}
                      width={480}
                      height={160}
                      className="w-full bg-white rounded border"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        const target = e.currentTarget;
                        target.setPointerCapture?.(e.pointerId);
                        handleSignaturePointerDown(e);
                      }}
                      onPointerMove={handleSignaturePointerMove}
                      onPointerUp={(e) => {
                        e.preventDefault();
                        handleSignaturePointerUp();
                      }}
                      onPointerLeave={handleSignaturePointerUp}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                      <span>
                        {requireSignature
                          ? "Signature required for staff doctors."
                          : "Signature optional for admins."}
                      </span>
                      {formData.completedBySignature && (
                        <span>Captured</span>
                      )}
                    </div>
                    {formData.completedBySignature && (
                      <div className="mt-2">
                        <img
                          src={formData.completedBySignature}
                          alt="Signature preview"
                          className="h-16 object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>PDF Attachments</CardTitle>
            <CardDescription>
              {isEdit && currentReport?.file_url
                ? "View the current PDF or attach new files to merge and replace it."
                : "Attach and merge multiple PDF files into a single document."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CardContent>
              {isEdit && currentReport?.file_url && (
                <div className="mb-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const apiPath = currentReport.file_url?.replace(
                          "/uploads/",
                          "/files/",
                        );
                        if (!apiPath) {
                          console.error("apiPath is undefined");
                          return;
                        }
                        const response = await api.get(apiPath, {
                          responseType: "blob",
                        });

                        // Create a blob URL and open it in a new tab
                        const blob = new Blob([response.data], {
                          type: "application/pdf",
                        });
                        const url = window.URL.createObjectURL(blob);
                        window.open(url, "_blank");

                        // Clean up the blob URL after a short delay
                        setTimeout(() => window.URL.revokeObjectURL(url), 100);
                      } catch (error) {
                        console.error("Failed to load PDF:", error);
                        // Handle error (show notification, etc.)
                      }
                    }}
                  >
                    <LinkIcon className="mr-2 h-4 w-4" /> View Current PDF
                  </Button>
                </div>
              )}
            </CardContent>
            <PdfUploader pdfManager={pdfManager} />
          </CardContent>
        </Card>

        <div className="flex justify-end items-center  pt-4">
          {availableDoctors.length > 0 && (
            <Popover
              open={doctorSelectorOpen}
              onOpenChange={setDoctorSelectorOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="flex items-center gap-2 mr-4"
                >
                  <User className="h-4 w-4" />
                  {selectedDoctorForPdf
                    ? `${selectedDoctorForPdf.doctor?.fullName || selectedDoctorForPdf.fullName}`
                    : availableDoctors[0]?.doctor?.fullName
                      ? `${availableDoctors[0].doctor.fullName}`
                      : "Select Doctor"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-2" align="end">
                <div className="space-y-1">
                  <p className="text-sm font-medium px-2 py-1.5">
                    Select Doctor for PDF
                  </p>
                  <div className="space-y-0.5">
                    {availableDoctors.map((patientDoctor: any) => (
                      <button
                        key={patientDoctor.id}
                        type="button"
                        onClick={() => {
                          setSelectedDoctorForPdf(patientDoctor);
                          setDoctorSelectorOpen(false);
                          toast.success(
                            `Selected ${patientDoctor.doctor?.fullName} for PDF`,
                          );
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-accent transition-colors",
                          (selectedDoctorForPdf?.id === patientDoctor.id ||
                            (!selectedDoctorForPdf &&
                              patientDoctor.id === availableDoctors[0]?.id)) &&
                            "bg-accent",
                        )}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4",
                            selectedDoctorForPdf?.id === patientDoctor.id ||
                              (!selectedDoctorForPdf &&
                                patientDoctor.id === availableDoctors[0]?.id)
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <div className="flex-1 text-left">
                          <div className="font-medium">
                            {patientDoctor.doctor?.fullName}
                          </div>
                          {patientDoctor.isPrimary && (
                            <Badge variant="secondary" className="text-xs mr-2">
                              Primary
                            </Badge>
                          )}
                          {patientDoctor.doctor?.email && (
                            <div className="text-xs text-muted-foreground">
                              {patientDoctor.doctor.email}
                            </div>
                          )}
                          {patientDoctor.address && (
                            <div className="text-xs text-muted-foreground">
                              {patientDoctor.address.street},{" "}
                              {patientDoctor.address.city},{" "}
                              {patientDoctor.address.state}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleGeneratePdf}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {isGenerating ? "Generating Report..." : "Generate PDF Report"}
            </Button>

            {/* Debug button - remove in production */}
            <Button
              type="button"
              variant="ghost"
              onClick={handleDebugFields}
              className="text-sm"
            >
              Debug Fields
            </Button>
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || pdfManager.isMerging}
            size="lg"
          >
            {(isSubmitting || pdfManager.isMerging) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {pdfManager.isMerging
              ? "Merging PDFs..."
              : isSubmitting
                ? "Submitting..."
                : isEdit
                  ? "Update Report"
                  : "Save Report"}
          </Button>
        </div>
      </form>
    </div>
  );
}
