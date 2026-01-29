import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePatientStore } from "@/stores/patientStore";
import type { Doctor } from "@/stores/patientStore";
import type { Device } from "@/stores/patientStore";
// import type { Lead } from "@/stores/patientStore";
import type { ImplantedDevice } from "@/stores/patientStore";
import type { ImplantedLead } from "@/stores/patientStore";
import type { Patient, Address, PatientDoctor } from "@/stores/patientStore";
import { tagService, type Tag } from "@/services/tagService";
import { useDoctorStore } from "@/stores/doctorStore";
import { useDeviceStore } from "@/stores/deviceStore";
import { useLeadStore, type Lead } from "@/stores/leadStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { X, Plus } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { useFormShortcuts } from '@/hooks/useFormShortcuts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PatientFormData {
  mrn: string;
  fname: string;
  lname: string;
  dob: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postal: string;
  patientDoctors: PatientDoctor[];
  devices: ImplantedDevice[];
  leads: ImplantedLead[];
  tags: number[];
}

export default function PatientForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = id !== undefined;

  const {
    currentPatient,
    loading,
    error,
    fetchPatient,
    createPatient,
    updatePatient,
    clearError,
  } = usePatientStore();

  const { doctors, fetchDoctors, searchDoctors } = useDoctorStore();
  const {
    devices: availableDevices,
    fetchDevices: fetchAllDevices,
    searchDevices,
  } = useDeviceStore();
  const {
    leads: availableLeads,
    fetchLeads: fetchAllLeads,
    searchLeads,
  } = useLeadStore();
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isPrimary, setIsPrimary] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<PatientFormData>({
    mrn: "",
    fname: "",
    lname: "",
    dob: "",
    phone: "",
    email: "",
    street: "",
    city: "",
    state: "",
    country: "",
    postal: "",
    patientDoctors: [],
    devices: [],
    leads: [],
    tags: [],
  });

  // useEffect(() => {
  //   if (selectedDoctor) {
  //     console.log("Selected doctor:", selectedDoctor);
  //     console.log("Doctor addresses:", selectedDoctor.addresses);
  //   }
  // }, [selectedDoctor]);

  const [doctorSearch, setDoctorSearch] = useState("");
  const [openDoctorSearch, setOpenDoctorSearch] = useState(false);

  const [deviceSearch, setDeviceSearch] = useState("");
  // const [deviceResults, setDeviceResults] = useState<Device[]>([])
  const [openDeviceSearch, setOpenDeviceSearch] = useState(false);

  const [leadSearch, setLeadSearch] = useState("");
  // const [leadResults, setLeadResults] = useState<Lead[]>([])
  const [openLeadSearch, setOpenLeadSearch] = useState(false);

  const toDateInput = (v?: string | null) => {
    if (!v) return ''
    const d = new Date(v)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10) // YYYY-MM-DD
  }

  useEffect(() => {
    fetchDoctors();
    fetchAllDevices();
    fetchAllLeads();
    loadTags();
    if (isEdit && id) {
      fetchPatient(parseInt(id));
    }
  }, [isEdit, id]);

  const loadTags = async () => {
    try {
      const tags = await tagService.getAll('patient');
      setAvailableTags(tags);
    } catch (error) {
      console.error("Failed to load tags:", error);
    }
  };

  useEffect(() => {
    if (isEdit && currentPatient) {
      setFormData({
        mrn: currentPatient.mrn.toString(),
        fname: currentPatient.fname,
        lname: currentPatient.lname,
        dob: currentPatient.dob.split("T")[0], // Format for date input
        phone: currentPatient.phone,
        email: currentPatient.email,
        street: currentPatient.street,
        city: currentPatient.city,
        state: currentPatient.state,
        country: currentPatient.country,
        postal: currentPatient.postal,
        patientDoctors: currentPatient.patientDoctors || [],
        devices: (currentPatient.devices || []).map((d) => ({
          ...d,
          implantedAt: toDateInput(d.implantedAt as any),
          explantedAt: toDateInput(d.explantedAt as any),
        })),
        leads: (currentPatient.leads || []).map((l) => ({
          ...l,
          implantedAt: toDateInput(l.implantedAt as any),
          explantedAt: toDateInput(l.explantedAt as any),
        })),
        tags: (currentPatient.tags || []).map((t: any) => t.ID),
      });
    }
  }, [currentPatient, isEdit]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Helpers for date <-> ISO (RFC3339) conversion
  const isoToInputDate = (iso?: string | null) => {
    if (!iso || iso === "0001-01-01T00:00:00Z") return "";
    return iso.split("T")[0];
  };



  const handleImplantedDataChange = (
    type: "devices" | "leads",
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target as HTMLInputElement | HTMLSelectElement;
    const isDate = name === "implantedAt" || name === "explantedAt";
    const nextValue = isDate
      ? value && value.trim() !== ""
        ? new Date(`${value}T00:00:00Z`).toISOString()
        : null
      : value;
    const items = [...formData[type]];
    items[index] = { ...items[index], [name]: nextValue };
    setFormData((prev) => ({ ...prev, [type]: items }));
  };

  const handleDoctorSearch = async (query: string) => {
    setDoctorSearch(query);
    if (query.length > 2) {
      await searchDoctors(query);
    } else {
      await fetchDoctors();
    }
  };

  const handleDeviceSearch = async (query: string) => {
    setDeviceSearch(query);
    if (query.length > 2) {
      await searchDevices(query); // This updates the deviceStore's list
    } else {
      await fetchAllDevices();
    }
  };

  const handleLeadSearch = async (query: string) => {
    setLeadSearch(query);
    if (query.length > 2) {
      await searchLeads(query); // This updates the leadStore's list
    } else {
      await fetchAllLeads();
    }
  };

  // const addDoctor = (doctor: Doctor) => {
  //   if (!formData.doctors.find(d => d.id === doctor.id)) {
  //     setFormData(prev => ({
  //       ...prev,
  //       doctors: [...prev.doctors, doctor]
  //     }))
  //   }
  //   setOpenDoctorSearch(false)
  //   setDoctorSearch('')
  // }

  const addDoctor = () => {
    if (!selectedDoctor) return;

    // Check if doctor is already assigned
    const existingDoctor = formData.patientDoctors.find(
      (pd) => pd.doctorId === selectedDoctor.id
    );
    if (existingDoctor) {
      toast.error("This doctor is already assigned to the patient");
      return;
    }

    // If this is set as primary, remove primary from others
    const updatedPatientDoctors = formData.patientDoctors.map((pd) => ({
      ...pd,
      isPrimary: isPrimary ? false : pd.isPrimary,
    }));

    // Add new doctor
    const newPatientDoctor: PatientDoctor = {
      doctorId: selectedDoctor.id,
      addressId: selectedAddress?.id || null,
      isPrimary: isPrimary,
      doctor: selectedDoctor,
      address: selectedAddress || null,
    };

    // Actually use the updatedPatientDoctors array
    setFormData((prev) => ({
      ...prev,
      patientDoctors: [...updatedPatientDoctors, newPatientDoctor],
    }));

    // Reset form
    setSelectedDoctor(null);
    setSelectedAddress(null);
    setIsPrimary(false);
    setOpenDoctorSearch(false);
    setDoctorSearch("");
  };

  const addDevice = (device: Device) => {
    // console.log("Adding device:", device);
    const deviceId = (device as any).ID || (device as any).id;
    if (!device || !deviceId) {
      console.error("Invalid device selected - missing or no ID:", device);
      return;
    }
    if (deviceId === 0) {
      console.error("Invalid device selected - ID is 0:", device);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      devices: [
        ...prev.devices,
        {
          deviceId: deviceId,
          serial: "",
          status: "Active",
          implantedAt: "",
          explantedAt: "",
          device,
        },
      ],
    }));
    setOpenDeviceSearch(false);
    setDeviceSearch("");
  };

  const addLead = (lead: Lead) => {
    const leadId = (lead as any).ID || (lead as any).id;
    if (!lead || !leadId) {
      console.error("Invalid lead selected - missing or no ID:", lead);
      return;
    }
    if (leadId === 0) {
      console.error("Invalid lead selected - ID is 0:", lead);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      leads: [
        ...prev.leads,
        {

          leadId: leadId,
          serial: "",
          chamber: "",
          status: "Active",
          implantedAt: "",
          lead,
        },
      ],
    }));
    setOpenLeadSearch(false);
    setLeadSearch("");
  };
  // const removeDoctor = (doctorId: number) => {
  //   setFormData(prev => ({
  //     ...prev,
  //     doctors: prev.doctors.filter(d => d.id !== doctorId)
  //   }))
  // }
  const removeDoctor = (doctorId: number) => {
    setFormData((prev) => ({
      ...prev,
      patientDoctors: prev.patientDoctors.filter(
        (pd) => pd.doctorId !== doctorId
      ),
    }));
  };

  const togglePrimaryDoctor = (doctorId: number) => {
    setFormData((prev) => ({
      ...prev,
      patientDoctors: prev.patientDoctors.map((pd) => ({
        ...pd,
        isPrimary: pd.doctorId === doctorId ? !pd.isPrimary : false,
      })),
    }));
  };

  const toggleTag = (tagId: number) => {
    setFormData((prev) => {
      const newTags = prev.tags.includes(tagId)
        ? prev.tags.filter((id) => id !== tagId)
        : [...prev.tags, tagId];
      return { ...prev, tags: newTags };
    });
  };

  const removeDevice = (index: number) => {
    const devices = [...formData.devices];
    devices.splice(index, 1);
    setFormData((prev) => ({ ...prev, devices }));
  };

  const removeLead = (index: number) => {
    const leads = [...formData.leads];
    leads.splice(index, 1);
    setFormData((prev) => ({ ...prev, leads }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFieldErrors({}); // Clear any previous field errors

    // Validate devices have valid deviceIds
    const invalidDevices = formData.devices.filter(d => !d.deviceId || d.deviceId === 0);
    if (invalidDevices.length > 0) {
      toast.error("Some devices don't have a valid device selected. Please remove them or select a valid device.");
      console.error("Invalid devices:", invalidDevices);
      return;
    }

    // Validate leads have valid leadIds
    const invalidLeads = formData.leads.filter(l => !l.leadId || l.leadId === 0);
    if (invalidLeads.length > 0) {
      toast.error("Some leads don't have a valid lead selected. Please remove them or select a valid lead.");
      console.error("Invalid leads:", invalidLeads);
      return;
    }

    try {
      const backendPayload = {
        ...formData,
        mrn: parseInt(formData.mrn),
        patientDoctors: formData.patientDoctors.map((pd) => ({
          doctorId: pd.doctorId,
          addressId: pd.addressId,
          isPrimary: pd.isPrimary,
        })),
        devices: formData.devices.map((d) => ({
          deviceId: d.deviceId,
          serial: d.serial,
          status: d.status,
          implantedAt: d.implantedAt,
          explantedAt: d.explantedAt,
        })),
        leads: formData.leads.map((l) => ({
          leadId: l.leadId,
          serial: l.serial,
          chamber: l.chamber,
          status: l.status,
          implantedAt: l.implantedAt,
        })),
        medications: [],
        tags: formData.tags,
      };

      let patientId: number;
      // If editing, we need to update the existing patient
      // If creating, we need to create a new patient
      if (isEdit && id) {
        const updatedPatient = await updatePatient(
          parseInt(id),
          backendPayload as unknown as Partial<Patient>
        );
        patientId = updatedPatient.id;
      } else {
        const newPatient = await createPatient(
          backendPayload as unknown as Partial<Patient>
        );
        patientId = newPatient.id;
      }
      toast.success(
        isEdit
          ? "Patient updated successfully!"
          : "Patient created successfully!"
      );
      // Redirect to the patient details page after saving
      navigate(`/patients/${patientId}`);
      // navigate('/patients')
    } catch (error: any) {
      // Error is handled by the store with toast notifications
      console.error("Error saving patient:", error);

      // Set field-specific error for duplicate MRN
      if (error.response?.status === 409 && error.response?.data?.code === 'DUPLICATE_MRN') {
        setFieldErrors({ mrn: error.response.data.error });
        // Scroll to the MRN field
        document.getElementById('mrn')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.getElementById('mrn')?.focus();
      } else {
        // Store already shows toast, but we can log additional context
        console.error("Failed to save patient details:", error.response?.data);
      }
    }
  };

  useFormShortcuts(handleSubmit);

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Patients", href: "/patients" },
    {
      label: isEdit
        ? `Edit ${[currentPatient?.fname, currentPatient?.lname]
          .filter(Boolean)
          .join(" ") || "Patient"
        }`
        : "New Patient",
      current: true,
    },
  ];

  // console.log("Form Data:", formData);

  return (
    <div className="container mx-auto">
      <BreadcrumbNav items={breadcrumbItems} />

      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">
          {isEdit ? "Edit Patient" : "Create New Patient"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {isEdit ? "Edit Patient" : "Create New Patient"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mrn" className={fieldErrors.mrn ? "text-destructive" : ""}>
                  Medical Record Number
                </Label>
                <Input
                  id="mrn"
                  name="mrn"
                  type="number"
                  value={formData.mrn}
                  onChange={(e) => {
                    handleInputChange(e);
                    // Clear MRN error when user starts typing
                    if (fieldErrors.mrn) {
                      setFieldErrors(prev => ({ ...prev, mrn: '' }));
                    }
                  }}
                  className={fieldErrors.mrn ? "border-destructive" : ""}
                  required
                />
                {fieldErrors.mrn && (
                  <p className="text-sm text-destructive mt-1">{fieldErrors.mrn}</p>
                )}
              </div>
              <div>
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  name="dob"
                  type="date"
                  value={formData.dob}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fname">First Name</Label>
                <Input
                  id="fname"
                  name="fname"
                  value={formData.fname}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lname">Last Name</Label>
                <Input
                  id="lname"
                  name="lname"
                  value={formData.lname}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                name="street"
                value={formData.street}
                onChange={handleInputChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="postal">Postal Code</Label>
                <Input
                  id="postal"
                  name="postal"
                  value={formData.postal}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
              />
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableTags.map((tag) => {
                  const isSelected = formData.tags.includes(tag.ID);
                  return (
                    <Badge
                      key={tag.ID}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer select-none"
                      style={
                        isSelected
                          ? { backgroundColor: tag.color, borderColor: tag.color }
                          : { borderColor: tag.color, color: tag.color }
                      }
                      onClick={() => toggleTag(tag.ID)}
                    >
                      {tag.name}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Doctor Assignment with Address Selection */}

            {/* <div>
              <Label>Assigned Doctors</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.doctors.map((doctor) => (
                  <Badge key={doctor.id} variant="secondary" className="flex items-center gap-1">
                    {doctor.name}
                    <button
                      type="button"
                      onClick={() => removeDoctor(doctor.id)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              
              <Popover open={openDoctorSearch} onOpenChange={setOpenDoctorSearch}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Doctor
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search doctors..."
                      value={doctorSearch}
                      onValueChange={handleDoctorSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No doctors found.</CommandEmpty>
                      <CommandGroup>
                        {doctors.map((doctor) => (
                          <CommandItem
                            key={doctor.id}
                            onSelect={() => addDoctor(doctor)}
                            disabled={formData.doctors.some(d => d.id === doctor.id)}
                          >
                            <div>
                              <div className="font-medium">{doctor.name}</div>
                              <div className="text-sm text-muted-foreground">{doctor.email}</div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div> */}
            <div>
              <Label>Assigned Doctors</Label>
              <div className="space-y-3 mb-4">
                {formData.patientDoctors.map((patientDoctor) => (
                  <div
                    key={patientDoctor.doctorId}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {patientDoctor.doctor.fullName}
                        </span>
                        {patientDoctor.isPrimary && (
                          <Badge variant="default">Primary</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {patientDoctor.doctor.email}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {patientDoctor.doctor.phone}
                        {patientDoctor.address && (
                          <span>
                            {" "}
                            • {patientDoctor.address.street},{" "}
                            {patientDoctor.address.city},{" "}
                            {patientDoctor.address.state}{" "}
                            {patientDoctor.address.zip}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          togglePrimaryDoctor(patientDoctor.doctorId)
                        }
                      >
                        {patientDoctor.isPrimary
                          ? "Remove Primary"
                          : "Set Primary"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDoctor(patientDoctor.doctorId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Popover
                open={openDoctorSearch}
                onOpenChange={setOpenDoctorSearch}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Doctor
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-4">
                  <div className="space-y-4">
                    <div>
                      <Label>Search Doctor</Label>
                      <Command>
                        <CommandInput
                          placeholder="Search doctors..."
                          value={doctorSearch}
                          onValueChange={handleDoctorSearch}
                        />
                        <CommandList>
                          <CommandEmpty>No doctors found.</CommandEmpty>
                          <CommandGroup>
                            {doctors.map((doctor) => (
                              <CommandItem
                                key={doctor.id}
                                onSelect={() =>
                                  setSelectedDoctor({
                                    ...doctor,
                                    addresses: doctor.addresses?.map(
                                      (address) => ({
                                        ...address,
                                        id: address.id || 0, // Ensure `id` is a number
                                      })
                                    ),
                                  })
                                }
                                className={
                                  selectedDoctor?.id === doctor.id
                                    ? "bg-accent"
                                    : ""
                                }
                              >
                                <div>
                                  <div className="font-medium">
                                    {doctor.fullName}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {doctor.email}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </div>

                    {selectedDoctor && (
                      <div className="mt-4 p-3 border rounded-lg bg-muted">
                        <div className="font-medium">
                          Selected: {selectedDoctor.fullName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Addresses available:{" "}
                          {selectedDoctor.addresses?.length || 0}
                        </div>
                        {selectedDoctor.addresses &&
                          selectedDoctor.addresses.length === 0 && (
                            <div className="text-sm text-amber-600">
                              This doctor has no addresses configured
                            </div>
                          )}
                      </div>
                    )}

                    {selectedDoctor &&
                      selectedDoctor.addresses &&
                      selectedDoctor.addresses.length > 0 && (
                        <div>
                          <Label>Select Address (Optional)</Label>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            <div
                              className={`p-2 border rounded cursor-pointer ${!selectedAddress ? "bg-accent" : ""
                                }`}
                              onClick={() => setSelectedAddress(null)}
                            >
                              <div className="text-sm">No specific address</div>
                            </div>
                            {selectedDoctor.addresses.map((address) => (
                              <div
                                key={address.id}
                                className={`p-2 border rounded cursor-pointer ${selectedAddress?.id === address.id
                                    ? "bg-accent"
                                    : ""
                                  }`}
                                onClick={() => setSelectedAddress(address)}
                              >
                                <div className="text-sm">
                                  {address.street}
                                  <br />
                                  {address.city}, {address.state} {address.zip}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isPrimary"
                        checked={isPrimary}
                        onChange={(e) => setIsPrimary(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="isPrimary">Set as Primary Doctor</Label>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={addDoctor}
                        disabled={!selectedDoctor}
                        size="sm"
                      >
                        Add Doctor
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedDoctor(null);
                          setSelectedAddress(null);
                          setIsPrimary(false);
                          setOpenDoctorSearch(false);
                        }}
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Implanted Devices */}
            <Card className="bg-sky-500/50">
              <CardHeader>
                <CardTitle>Implanted Devices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.devices.map((implanted, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-md space-y-4 relative ${!implanted.deviceId || implanted.deviceId === 0
                        ? "border-red-500 bg-red-50"
                        : ""
                      }`}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => removeDevice(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="font-semibold">
                      {!implanted.deviceId || implanted.deviceId === 0 ? (
                        <span className="text-red-600">
                          ⚠️ Invalid Device - Please remove this entry
                        </span>
                      ) : implanted.device ? (
                        <>
                          {implanted.device.name}{" "}
                          {implanted.device.manufacturer
                            ? `(${implanted.device.manufacturer})`
                            : ""}
                        </>
                      ) : (
                        <span className="text-yellow-600">
                          Device ID: {implanted.deviceId} (details not loaded)
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor={`device-serial-${index}`}>
                          Serial Number
                        </Label>
                        <Input
                          id={`device-serial-${index}`}
                          name="serial"
                          value={implanted.serial}
                          onChange={(e) =>
                            handleImplantedDataChange("devices", index, e)
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`device-implantedAt-${index}`}>
                          Implanted Date
                        </Label>
                        <Input
                          id={`device-implantedAt-${index}`}
                          name="implantedAt"
                          type="date"
                          value={isoToInputDate(implanted.implantedAt)}
                          onChange={(e) =>
                            handleImplantedDataChange("devices", index, e)
                          }
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor={`device-status-${index}`}>Status</Label>
                        <Select
                          value={implanted.status}
                          onValueChange={(value) =>
                            handleImplantedDataChange("devices", index, {
                              target: { name: "status", value },
                            } as any)
                          }
                        >
                          <SelectTrigger id={`device-status-${index}`}>
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                            <SelectItem value="Explanted">Explanted</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor={`device-explantedAt-${index}`}>
                          Explant Date
                        </Label>
                        <Input
                          id={`device-explantedAt-${index}`}
                          name="explantedAt"
                          type="date"
                          // value={implanted.explantedAt ? implanted.explantedAt.split('T')[0] : ''}
                          value={isoToInputDate(implanted.explantedAt)}
                          onChange={(e) =>
                            handleImplantedDataChange("devices", index, e)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Popover
                  open={openDeviceSearch}
                  onOpenChange={setOpenDeviceSearch}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Device
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search devices..."
                        value={deviceSearch}
                        onValueChange={handleDeviceSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No devices found.</CommandEmpty>
                        <CommandGroup>
                          {availableDevices.map((device) => (
                            <CommandItem
                              key={device.ID}
                              onSelect={() => addDevice(device)}
                            >
                              <div>
                                <div className="font-medium">{device.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {device.manufacturer} {device.model}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>

            {/* Implanted Leads */}
            <Card className="bg-fuchsia-500/50">
              <CardHeader>
                <CardTitle>Implanted Leads</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.leads.map((implanted, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-md space-y-4 relative ${!implanted.leadId || implanted.leadId === 0
                        ? "border-red-500 bg-red-50"
                        : ""
                      }`}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => removeLead(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="font-semibold">
                      {!implanted.leadId || implanted.leadId === 0 ? (
                        <span className="text-red-600">
                          ⚠️ Invalid Lead - Please remove this entry
                        </span>
                      ) : implanted.lead ? (
                        <>
                          {implanted.lead.name} ({implanted.lead.manufacturer})
                        </>
                      ) : (
                        <span className="text-yellow-600">
                          Lead ID: {implanted.leadId} (details not loaded)
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <Label htmlFor={`lead-serial-${index}`}>
                          Serial Number
                        </Label>
                        <Input
                          id={`lead-serial-${index}`}
                          name="serial"
                          value={implanted.serial}
                          onChange={(e) =>
                            handleImplantedDataChange("leads", index, e)
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`lead-chamber-${index}`}>Chamber</Label>
                        <Select
                          value={implanted.chamber}
                          onValueChange={(value) =>
                            handleImplantedDataChange("leads", index, {
                              target: { name: "chamber", value },
                            } as any)
                          }
                        >
                          <SelectTrigger id={`lead-chamber-${index}`}>
                            <SelectValue placeholder="Select Chamber" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Unknown">Unknown</SelectItem>
                            <SelectItem value="RA">RA</SelectItem>
                            <SelectItem value="RV">RV</SelectItem>
                            <SelectItem value="RV LBB">RV LBB</SelectItem>
                            <SelectItem value="LV">LV</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor={`lead-status-${index}`}>Status</Label>
                        <Select
                          value={implanted.status}
                          onValueChange={(value) =>
                            handleImplantedDataChange("leads", index, {
                              target: { name: "status", value },
                            } as any)
                          }
                        >
                          <SelectTrigger id={`lead-status-${index}`}>
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                            <SelectItem value="Explanted">Explanted</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor={`lead-implantedAt-${index}`}>
                          Implanted Date
                        </Label>
                        <Input
                          id={`lead-implantedAt-${index}`}
                          name="implantedAt"
                          type="date"
                          value={isoToInputDate(implanted.implantedAt)}
                          onChange={(e) =>
                            handleImplantedDataChange("leads", index, e)
                          }
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor={`lead-explantedAt-${index}`}>
                          Explanted Date
                        </Label>
                        <Input
                          id={`lead-explantedAt-${index}`}
                          name="explantedAt"
                          type="date"
                          value={isoToInputDate(implanted.explantedAt)}
                          onChange={(e) =>
                            handleImplantedDataChange("leads", index, e)
                          }

                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Popover open={openLeadSearch} onOpenChange={setOpenLeadSearch}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Lead
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search leads..."
                        value={leadSearch}
                        onValueChange={handleLeadSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No leads found.</CommandEmpty>
                        <CommandGroup>
                          {availableLeads.map((lead) => (
                            <CommandItem
                              key={lead.ID}
                              onSelect={() => addLead(lead)}
                            >
                              <div>
                                <div className="font-medium">{lead.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {lead.manufacturer} {lead.leadModel}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Saving..."
                  : isEdit
                    ? "Update Patient"
                    : "Create Patient"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/patients/${id}`)}
              >
                Back to Patient
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
