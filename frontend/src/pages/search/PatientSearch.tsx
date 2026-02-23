import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { usePatientStore } from "@/stores/patientStore";
import { tagService, type Tag } from "@/services/tagService";
import {
  searchFilterService,
  type SavedSearchFilter,
} from "@/services/searchFilterService";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User,
  FileDown,
  Plus,
  Check,
  X,
  Save,
  BookmarkPlus,
  Bookmark,
  History,
  Zap,
} from "lucide-react";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface SearchFilters {
  firstName: string;
  lastName: string;
  mrn: string;
  dob: string;
  doctorName: string;
  deviceSerial: string;
  deviceManufacturer: string;
  deviceName: string;
  deviceModel: string;
  leadManufacturer: string;
  leadName: string;
  tags: number[];
  booleanOperator: "AND" | "OR" | "NOT";
  fuzzyMatch: boolean;
}

export default function PatientSearch() {
  const { searchResults, loading, error, searchPatientsComplex, clearError } =
    usePatientStore();
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedSearchFilter[]>([]);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [openTagSearch, setOpenTagSearch] = useState(false);
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState("");
  const [saveFilterDescription, setSaveFilterDescription] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    firstName: "",
    lastName: "",
    mrn: "",
    dob: "",
    doctorName: "",
    deviceSerial: "",
    deviceManufacturer: "",
    deviceName: "",
    deviceModel: "",
    leadManufacturer: "",
    leadName: "",
    tags: [],
    booleanOperator: "AND",
    fuzzyMatch: true,
  });

  useEffect(() => {
    loadTags();
    loadSavedFilters();
    loadSearchHistory();
  }, []);

  const loadTags = async () => {
    try {
      const tags = await tagService.getAll("patient");
      setAvailableTags(tags);
    } catch (error) {
      console.error("Failed to load tags:", error);
    }
  };

  const loadSavedFilters = async () => {
    try {
      const filters = await searchFilterService.getAll();
      setSavedFilters(filters);
    } catch (error) {
      console.error("Failed to load saved filters:", error);
    }
  };

  const loadSearchHistory = async () => {
    try {
      const history = await searchFilterService.getHistory(10);
      setSearchHistory(history);
    } catch (error) {
      console.error("Failed to load search history:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleTag = (tagId: number) => {
    setFilters((prev) => {
      const newTags = prev.tags.includes(tagId)
        ? prev.tags.filter((id) => id !== tagId)
        : [...prev.tags, tagId];
      return { ...prev, tags: newTags };
    });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeFilters: any = Object.fromEntries(
      Object.entries(filters).filter(([key, value]) => {
        if (key === "tags") return (value as number[]).length > 0;
        if (key === "booleanOperator") return true;
        if (key === "fuzzyMatch") return true;
        return (value as string).trim() !== "";
      }),
    );
    await searchPatientsComplex(activeFilters);
    await loadSearchHistory(); // Refresh history after search
  };

  const handleReset = () => {
    setFilters({
      firstName: "",
      lastName: "",
      mrn: "",
      dob: "",
      doctorName: "",
      deviceSerial: "",
      deviceManufacturer: "",
      deviceName: "",
      deviceModel: "",
      leadManufacturer: "",
      leadName: "",
      tags: [],
      booleanOperator: "AND",
      fuzzyMatch: true,
    });
  };

  const handleSaveFilter = async () => {
    if (!saveFilterName.trim()) {
      toast.error("Please enter a filter name");
      return;
    }

    try {
      await searchFilterService.save({
        name: saveFilterName,
        description: saveFilterDescription,
        filters: filters as any,
        isDefault: false,
      });
      toast.success("Search filter saved successfully");
      setOpenSaveDialog(false);
      setSaveFilterName("");
      setSaveFilterDescription("");
      await loadSavedFilters();
    } catch (error) {
      toast.error("Failed to save filter");
      console.error(error);
    }
  };

  const handleLoadFilter = (savedFilter: SavedSearchFilter) => {
    setFilters(savedFilter.filters as SearchFilters);
    toast.success(`Loaded filter: ${savedFilter.name}`);
  };

  const handleDeleteFilter = async (id: number) => {
    try {
      await searchFilterService.delete(id);
      toast.success("Filter deleted");
      await loadSavedFilters();
    } catch (error) {
      toast.error("Failed to delete filter");
    }
  };

  const formatSearchSummary = (filters: any): string => {
    const parts: string[] = [];

    if (filters.firstName) parts.push(`First Name: ${filters.firstName}`);
    if (filters.lastName) parts.push(`Last Name: ${filters.lastName}`);
    if (filters.mrn) parts.push(`MRN: ${filters.mrn}`);
    if (filters.dob) parts.push(`DOB: ${filters.dob}`);
    if (filters.doctorName) parts.push(`Doctor: ${filters.doctorName}`);
    if (filters.deviceSerial)
      parts.push(`Device Serial: ${filters.deviceSerial}`);
    if (filters.deviceManufacturer)
      parts.push(`Device Mfr: ${filters.deviceManufacturer}`);
    if (filters.deviceName) parts.push(`Device: ${filters.deviceName}`);
    if (filters.deviceModel) parts.push(`Model: ${filters.deviceModel}`);
    if (filters.leadManufacturer)
      parts.push(`Lead Mfr: ${filters.leadManufacturer}`);
    if (filters.leadName) parts.push(`Lead: ${filters.leadName}`);
    if (filters.tags && filters.tags.length > 0) {
      const tagNames = filters.tags
        .map((tagId: number) => {
          const tag = availableTags.find((t) => t.ID === tagId);
          return tag ? tag.name : `Tag #${tagId}`;
        })
        .join(", ");
      parts.push(`Tags: ${tagNames}`);
    }

    return parts.length > 0 ? parts.join(" • ") : "Complex search";
  };

  const handleExport = () => {
    if (searchResults.length === 0) {
      toast.info("There are no results to export.");
      return;
    }

    const dataToExport = searchResults.map((patient) => ({
      "First Name": patient.fname,
      "Last Name": patient.lname,
      MRN: patient.mrn,
      DOB: new Date(patient.dob).toLocaleDateString(),
      Street: patient.street,
      "Assigned Doctors":
        patient.patientDoctors?.map((pd) => pd.doctor.fullName).join(", ") ||
        "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PatientSearchResults");
    XLSX.writeFile(workbook, "patient_search_results.xlsx");
    toast.success("Data exported successfully!");
  };

  return (
    <div className="container mx-auto space-y-6">
      {/* Saved Filters and History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Saved Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              Saved Filters ({savedFilters.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {savedFilters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No saved filters yet
              </p>
            ) : (
              <div className="space-y-2">
                {savedFilters.slice(0, 5).map((filter) => (
                  <div
                    key={filter.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{filter.name}</p>
                      {filter.description && (
                        <p className="text-xs text-muted-foreground">
                          {filter.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLoadFilter(filter)}
                      >
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteFilter(filter.id!)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {searchHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No search history</p>
            ) : (
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {searchHistory.map((item) => (
                  <div key={item.id} className="p-2 border rounded">
                    <p
                      className="text-sm font-medium truncate"
                      title={formatSearchSummary(item.filters || {})}
                    >
                      {formatSearchSummary(item.filters || {})}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.results} results •{" "}
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Search Filters</CardTitle>
          <div className="flex gap-2">
            <Dialog open={openSaveDialog} onOpenChange={setOpenSaveDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <BookmarkPlus className="mr-2 h-4 w-4" />
                  Save Filter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Search Filter</DialogTitle>
                  <DialogDescription>
                    Save your current search configuration for quick access
                    later
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="filterName">Filter Name</Label>
                    <Input
                      id="filterName"
                      value={saveFilterName}
                      onChange={(e) => setSaveFilterName(e.target.value)}
                      placeholder="e.g., High-risk patients"
                    />
                  </div>
                  <div>
                    <Label htmlFor="filterDescription">
                      Description (optional)
                    </Label>
                    <Input
                      id="filterDescription"
                      value={saveFilterDescription}
                      onChange={(e) => setSaveFilterDescription(e.target.value)}
                      placeholder="Brief description of this filter"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setOpenSaveDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveFilter}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Filter
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={searchResults.length === 0}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch}>
            {/* Search Mode Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Label htmlFor="fuzzyMatch" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Fuzzy Matching
                </Label>
                <Switch
                  id="fuzzyMatch"
                  checked={filters.fuzzyMatch}
                  onCheckedChange={(checked) => {
                    setFilters((prev) => ({ ...prev, fuzzyMatch: checked }));
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="booleanOp">Boolean Operator</Label>
                <Select
                  value={filters.booleanOperator}
                  onValueChange={(value: "AND" | "OR" | "NOT") =>
                    setFilters((prev) => ({ ...prev, booleanOperator: value }))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">AND</SelectItem>
                    <SelectItem value="OR">OR</SelectItem>
                    <SelectItem value="NOT">NOT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                name="firstName"
                placeholder="First Name"
                value={filters.firstName}
                onChange={handleInputChange}
              />
              <Input
                name="lastName"
                placeholder="Last Name"
                value={filters.lastName}
                onChange={handleInputChange}
              />
              <Input
                name="mrn"
                placeholder="MRN"
                value={filters.mrn}
                onChange={handleInputChange}
              />
              <Input
                name="dob"
                placeholder="DOB (YYYY-MM-DD)"
                value={filters.dob}
                onChange={handleInputChange}
                type="date"
              />
              <Input
                name="doctorName"
                placeholder="Doctor Name"
                value={filters.doctorName}
                onChange={handleInputChange}
              />
              <Input
                name="deviceSerial"
                placeholder="Device Serial"
                value={filters.deviceSerial}
                onChange={handleInputChange}
              />
              <Input
                name="deviceManufacturer"
                placeholder="Device Manufacturer"
                value={filters.deviceManufacturer}
                onChange={handleInputChange}
              />
              <Input
                name="deviceName"
                placeholder="Device Name"
                value={filters.deviceName}
                onChange={handleInputChange}
              />
              <Input
                name="deviceModel"
                placeholder="Device Model"
                value={filters.deviceModel}
                onChange={handleInputChange}
              />
              <Input
                name="leadManufacturer"
                placeholder="Lead Manufacturer"
                value={filters.leadManufacturer}
                onChange={handleInputChange}
              />
              <Input
                name="leadName"
                placeholder="Lead Name"
                value={filters.leadName}
                onChange={handleInputChange}
              />
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Filter by Tags</span>
                <Popover open={openTagSearch} onOpenChange={setOpenTagSearch}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-dashed"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Select Tags
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search tags..." />
                      <CommandList>
                        <CommandEmpty>No tags found.</CommandEmpty>
                        <CommandGroup>
                          {availableTags.map((tag) => {
                            const isSelected = filters.tags.includes(tag.ID);
                            return (
                              <CommandItem
                                key={tag.ID}
                                onSelect={() => handleToggleTag(tag.ID)}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: tag.color }}
                                  />
                                  <span>{tag.name}</span>
                                  {isSelected && (
                                    <Check className="ml-auto h-4 w-4" />
                                  )}
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[2rem] p-2 border rounded-md bg-background">
                {filters.tags.length > 0 ? (
                  filters.tags.map((tagId) => {
                    const tag = availableTags.find((t) => t.ID === tagId);
                    if (!tag) return null;
                    return (
                      <Badge
                        key={tag.ID}
                        variant="outline"
                        className="flex items-center gap-1 pr-1"
                        style={{
                          borderColor: tag.color,
                          color: tag.color,
                          backgroundColor: `${tag.color}10`,
                        }}
                      >
                        {tag.name}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 hover:bg-transparent text-current"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTag(tag.ID);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    );
                  })
                ) : (
                  <span className="text-sm text-muted-foreground italic self-center">
                    No tags selected
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </Button>
              <Button type="button" variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={clearError}
            className="mt-2"
          >
            Dismiss
          </Button>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Search Results ({searchResults.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : searchResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No patients found. Use the filters above to start a search.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MRN</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>DOB</TableHead>
                  <TableHead>Assigned Doctors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium  text-left">{patient.mrn}</TableCell>
                    <TableCell className="text-left">
                      <Link
                        to={`/patients/${patient.id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <User className="h-4 w-4" />
                        {patient.fname} {patient.lname}
                      </Link>
                    </TableCell>

                    <TableCell className="text-left">
                      {new Date(patient.dob).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-left">
                      {patient.patientDoctors?.map((pd) => (
                        <Badge key={pd.id} variant="secondary" className="mr-1">
                          {pd.doctor.fullName}
                        </Badge>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
