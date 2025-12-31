package handlers

import (
	"encoding/json"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
)

// PreviewEpicFHIR generates a sample FHIR payload for a given report
// This is for testing/debugging Epic integration without actually sending to Epic
func PreviewEpicFHIR(c *fiber.Ctx) error {
	reportID := c.Params("reportId")

	var report models.Report
	if err := config.DB.
		Preload("Patient").
		Preload("Patient.ImplantedDevices").
		Preload("Patient.ImplantedDevices.Device").
		Preload("Arrhythmias").
		First(&report, reportID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Report not found",
		})
	}

	// Build the FHIR DiagnosticReport (same logic as webhook service)
	fhirReport := buildFHIRDiagnosticReport(report)

	// Pretty print the JSON
	prettyJSON, err := json.MarshalIndent(fhirReport, "", "  ")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to format FHIR payload",
		})
	}

	return c.Type("application/json").Send(prettyJSON)
}

// buildFHIRDiagnosticReport creates a FHIR R4 DiagnosticReport from a goReporter report
func buildFHIRDiagnosticReport(report models.Report) map[string]interface{} {
	// Base DiagnosticReport structure
	diagnosticReport := map[string]interface{}{
		"resourceType": "DiagnosticReport",
		"id":           report.ID,
		"status":       "final",
		"category": []map[string]interface{}{
			{
				"coding": []map[string]interface{}{
					{
						"system":  "http://terminology.hl7.org/CodeSystem/v2-0074",
						"code":    "MDC",
						"display": "Medical Device Communication",
					},
				},
			},
		},
		"code": map[string]interface{}{
			"coding": []map[string]interface{}{
				{
					"system":  "http://loinc.org",
					"code":    "34139-4",
					"display": "Pacemaker device interrogation report",
				},
			},
			"text": "Cardiac Device Interrogation Report",
		},
		"subject": map[string]interface{}{
			"reference": "Patient/" + fmt.Sprint(report.Patient.MRN),
			"identifier": map[string]interface{}{
				"system": "urn:oid:2.16.840.1.113883.4.1",
				"value":  report.Patient.MRN,
			},
			"display": report.Patient.FirstName + " " + report.Patient.LastName,
		},
		"effectiveDateTime": report.ReportDate.Format("2006-01-02T15:04:05Z"),
		"issued":            report.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}

	// Add conclusion
	conclusion := "Cardiac device interrogation completed."
	if report.MdcIdcBattStatus != nil {
		conclusion += " Battery status: " + *report.MdcIdcBattStatus
	}
	diagnosticReport["conclusion"] = conclusion

	// Add results (observations)
	results := []map[string]interface{}{}

	if report.MdcIdcBattStatus != nil {
		results = append(results, map[string]interface{}{
			"reference": "#battery-status",
			"display":   "Battery Status: " + *report.MdcIdcBattStatus,
		})
	}

	if report.MdcIdcBattPercentage != nil {
		results = append(results, map[string]interface{}{
			"reference": "#battery-percentage",
			"display":   formatFloat(*report.MdcIdcBattPercentage, "Battery Percentage: %.1f%%"),
		})
	}

	if report.MdcIdcStatBradyRaPercentPaced != nil {
		results = append(results, map[string]interface{}{
			"reference": "#atrial-pacing",
			"display":   formatFloat(*report.MdcIdcStatBradyRaPercentPaced, "Atrial Pacing: %.1f%%"),
		})
	}

	if report.MdcIdcStatBradyRvPercentPaced != nil {
		results = append(results, map[string]interface{}{
			"reference": "#ventricular-pacing",
			"display":   formatFloat(*report.MdcIdcStatBradyRvPercentPaced, "Ventricular Pacing: %.1f%%"),
		})
	}

	diagnosticReport["result"] = results

	// Add contained device resource
	contained := []map[string]interface{}{}
	if len(report.Patient.ImplantedDevices) > 0 {
		implantedDevice := report.Patient.ImplantedDevices[0]
		device := map[string]interface{}{
			"resourceType": "Device",
			"id":           "device-" + string(rune(implantedDevice.ID)),
		}

		if implantedDevice.Serial != "" {
			device["identifier"] = []map[string]interface{}{
				{
					"type": map[string]interface{}{
						"coding": []map[string]interface{}{
							{
								"system":  "http://hl7.org/fhir/identifier-type",
								"code":    "SNO",
								"display": "Serial Number",
							},
						},
					},
					"value": implantedDevice.Serial,
				},
			}
		}

		if implantedDevice.Device.Manufacturer != "" {
			device["manufacturer"] = implantedDevice.Device.Manufacturer
		}
		if implantedDevice.Device.DevModel != "" {
			device["deviceName"] = []map[string]interface{}{
				{
					"name": implantedDevice.Device.DevModel,
					"type": "model-name",
				},
			}
		}

		device["type"] = map[string]interface{}{
			"coding": []map[string]interface{}{
				{
					"system":  "http://snomed.info/sct",
					"code":    "360129009",
					"display": "Cardiac pacemaker, device",
				},
			},
		}

		contained = append(contained, device)
	}

	diagnosticReport["contained"] = contained

	// Add presentedForm (link to full report)
	if report.FileUrl != nil {
		diagnosticReport["presentedForm"] = []map[string]interface{}{
			{
				"contentType": "text/html",
				"url":         *report.FileUrl,
				"title":       "Full Interrogation Report",
			},
		}
	}

	return diagnosticReport
}

func formatFloat(value float64, format string) string {
	return fmt.Sprintf(format, value)
}
