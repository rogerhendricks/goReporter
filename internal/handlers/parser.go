package handlers

import (
	"bufio"
	"bytes"
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"math"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rogerhendricks/goReporter/internal/models"
	"github.com/unidoc/unipdf/v4/model"
)

// ParseFile handles parsing an uploaded file and returns the data.
func ParseFile(c *fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Failed to retrieve file"})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to open file"})
	}
	defer file.Close()

	ext := filepath.Ext(fileHeader.Filename)
	var data interface{}

	switch strings.ToLower(ext) {
	case ".xml":
		data, err = parseXML(file)
	case ".log":
		data, err = parseLog(file)
	case ".bnk":
		data, err = parseBnk(file)
	case ".pdf":
		data, err = parsePDF(file)
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Unsupported file type"})
	}

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(data)
}

// Simplified structs for XML parsing

type BioIeee11073Export struct {
	XMLName xml.Name `xml:"biotronik-ieee11073-export"`
	Dataset Dataset  `xml:"dataset"`
}

type Dataset struct {
	XMLName xml.Name  `xml:"dataset"`
	Section []Section `xml:"section"`
}

type Section struct {
	XMLName xml.Name  `xml:"section"`
	Name    string    `xml:"name,attr"`
	Value   []Value   `xml:"value"`
	Section []Section `xml:"section"`
}

type Value struct {
	XMLName xml.Name `xml:"value"`
	Name    string   `xml:"name,attr"`
	Text    string   `xml:",chardata"`
}

func parseXML(file io.Reader) (interface{}, error) {
	// Read all content
	content, err := io.ReadAll(file)
	if err != nil {
		return nil, err
	}

	decoder := xml.NewDecoder(bytes.NewReader(content))
	var export BioIeee11073Export
	err = decoder.Decode(&export)
	if err != nil {
		return nil, err
	}

	parsedData := &models.ParsedData{}

	// Find MDC section
	var mdcSection *Section
	for i := range export.Dataset.Section {
		if export.Dataset.Section[i].Name == "MDC" {
			mdcSection = &export.Dataset.Section[i]
			break
		}
	}

	if mdcSection == nil {
		return parsedData, nil
	}

	// Find IDC section within MDC
	var idcSection *Section
	for i := range mdcSection.Section {
		if mdcSection.Section[i].Name == "IDC" {
			idcSection = &mdcSection.Section[i]
			break
		}
	}

	if idcSection == nil {
		return parsedData, nil
	}

	// Parse ATTR section (patient information)
	for i := range mdcSection.Section {
		if mdcSection.Section[i].Name == "ATTR" {
			attrSection := &mdcSection.Section[i]
			for j := range attrSection.Section {
				subsection := &attrSection.Section[j]
				if subsection.Name == "PATIENT" {
					for k := range subsection.Value {
						val := &subsection.Value[k]
						switch val.Name {
						case "NAME":
							parsedData.Name = &val.Text
						case "BIRTHDATE":
							dob := parseXMLDate(val.Text)
							parsedData.Dob = &dob
						case "ID":
							parsedData.Mrn = &val.Text
						}
					}
				}
			}
		}
	}

	// Parse DEV section (device information)
	for i := range idcSection.Section {
		if idcSection.Section[i].Name == "DEV" {
			devSection := &idcSection.Section[i]
			for j := range devSection.Value {
				val := &devSection.Value[j]
				switch val.Name {
				case "SERIAL_NUM":
					parsedData.MdcIdcDevSerialNumber = &val.Text
				case "MODEL":
					parsedData.MdcIdcDevModel = &val.Text
				case "MANUFACTURER":
					parsedData.MdcIdcDevManufacturer = &val.Text
				case "IMPLANT_DATE":
					date := parseXMLDate(val.Text)
					parsedData.MdcIdcDevImplantDate = &date
				}
			}
		}
	}

	// Parse SESS section (session/report date)
	for i := range idcSection.Section {
		if idcSection.Section[i].Name == "SESS" {
			sessSection := &idcSection.Section[i]
			for j := range sessSection.Value {
				val := &sessSection.Value[j]
				if val.Name == "DATE" {
					reportDate := parseXMLDateTime(val.Text)
					parsedData.ReportDate = &reportDate
				}
			}
		}
	}

	// Parse LEAD sections (lead information)
	leadCount := 0
	for i := range idcSection.Section {
		if idcSection.Section[i].Name == "LEAD" {
			leadSection := &idcSection.Section[i]
			leadCount++

			var serialNum, manufacturer, model, implantDate string
			for j := range leadSection.Value {
				val := &leadSection.Value[j]
				switch val.Name {
				case "SERIAL_NUM":
					serialNum = val.Text
				case "MANUFACTURER":
					manufacturer = val.Text
				case "MODEL":
					model = val.Text
				case "IMPLANT_DATE":
					implantDate = parseXMLDate(val.Text)
				}
			}

			// Assign to RA, RV, or LV based on order
			switch leadCount {
			case 1:
				parsedData.MdcIdcDevRaSerialNumber = &serialNum
				parsedData.MdcIdcDevRaManufacturer = &manufacturer
				parsedData.MdcIdcDevRaModel = &model
				parsedData.MdcIdcDevRaImplantDate = &implantDate
			case 2:
				parsedData.MdcIdcDevRvSerialNumber = &serialNum
				parsedData.MdcIdcDevRvManufacturer = &manufacturer
				parsedData.MdcIdcDevRvModel = &model
				parsedData.MdcIdcDevRvImplantDate = &implantDate
			case 3:
				parsedData.MdcIdcDevLvSerialNumber = &serialNum
				parsedData.MdcIdcDevLvManufacturer = &manufacturer
				parsedData.MdcIdcDevLvModel = &model
				parsedData.MdcIdcDevLvImplantDate = &implantDate
			}
		}
	}

	// Parse STAT section
	for i := range idcSection.Section {
		if idcSection.Section[i].Name == "STAT" {
			statSection := &idcSection.Section[i]
			parseStatSection(statSection, parsedData)
		}
	}

	// Parse MSMT section (measurements)
	for i := range idcSection.Section {
		if idcSection.Section[i].Name == "MSMT" {
			msmtSection := &idcSection.Section[i]
			parseMsmtSection(msmtSection, parsedData)
		}
	}

	// Parse SET section (settings)
	for i := range idcSection.Section {
		if idcSection.Section[i].Name == "SET" {
			setSection := &idcSection.Section[i]
			parseSetSection(setSection, parsedData)
		}
	}

	return parsedData, nil
}

func parseStatSection(statSection *Section, parsedData *models.ParsedData) {
	for i := range statSection.Section {
		subsection := &statSection.Section[i]
		switch subsection.Name {
		case "BRADY":
			for j := range subsection.Value {
				val := &subsection.Value[j]
				switch val.Name {
				case "RA_PERCENT_PACED":
					parsedData.MdcIdcStatBradyRaPercentPaced = &val.Text
				case "RV_PERCENT_PACED":
					parsedData.MdcIdcStatBradyRvPercentPaced = &val.Text
				case "LV_PERCENT_PACED":
					parsedData.MdcIdcStatBradyLvPercentPaced = &val.Text
				case "BIV_PERCENT_PACED":
					parsedData.MdcIdcStatBradyBivPercentPaced = &val.Text
				}
			}
		case "AT":
			for j := range subsection.Value {
				val := &subsection.Value[j]
				switch val.Name {
				case "BURDEN_PERCENT":
					parsedData.MdcIdcStatAtafBurdenPercent = &val.Text
				case "COUNT":
					parsedData.MdcIdcStatAtafCount = &val.Text
				}
			}
		case "TACHYTHERAPY":
			for j := range subsection.Value {
				val := &subsection.Value[j]
				switch val.Name {
				case "ATP_DELIVERED_RECENT":
					parsedData.MdcIdcStatAtpDeliveredRecent = &val.Text
				case "SHOCKS_DELIVERED_RECENT":
					parsedData.MdcIdcStatShocksDeliveredRecent = &val.Text
				}
			}
		case "CRT":
			for j := range subsection.Value {
				val := &subsection.Value[j]
				if val.Name == "BIV_PERCENT_PACED" {
					parsedData.MdcIdcStatBradyBivPercentPaced = &val.Text
				}
			}
		case "ARRHYTHMIA":
			for j := range subsection.Value {
				val := &subsection.Value[j]
				switch val.Name {
				case "PVC_COUNT":
					parsedData.MdcIdcStatPvcCount = &val.Text
				case "NSVT_COUNT":
					parsedData.MdcIdcStatNsvtCount = &val.Text
				}
			}
		}
	}
}

func parseMsmtSection(msmtSection *Section, parsedData *models.ParsedData) {
	for i := range msmtSection.Section {
		subsection := &msmtSection.Section[i]
		switch subsection.Name {
		case "BATTERY":
			for j := range subsection.Value {
				val := &subsection.Value[j]
				switch val.Name {
				case "STATUS":
					parsedData.MdcIdcBattStatus = &val.Text
				case "REMAINING_PERCENTAGE":
					parsedData.MdcIdcBattPercentage = &val.Text
				case "VOLTAGE":
					parsedData.MdcIdcBattVolt = &val.Text
				case "REMAINING":
					parsedData.MdcIdcBattRemaining = &val.Text
				}
			}
		case "LEADCHNL_RA":
			parseLeadChannel(subsection, parsedData, "RA")
		case "LEADCHNL_RV":
			parseLeadChannel(subsection, parsedData, "RV")
		case "LEADCHNL_LV":
			parseLeadChannel(subsection, parsedData, "LV")
		case "LEADHVCHNL":
			for j := range subsection.Value {
				val := &subsection.Value[j]
				if val.Name == "IMPEDANCE" {
					parsedData.MdcIdcMsmtHvImpedanceMean = &val.Text
				}
			}
		}
	}
}

func parseLeadChannel(leadSection *Section, parsedData *models.ParsedData, leadType string) {
	for i := range leadSection.Section {
		subsection := &leadSection.Section[i]
		switch subsection.Name {
		case "SENSING":
			for j := range subsection.Value {
				val := &subsection.Value[j]
				if val.Name == "INTR_AMPL_MEAN" {
					switch leadType {
					case "RA":
						parsedData.MdcIdcMsmtRaSensingMean = &val.Text
					case "RV":
						parsedData.MdcIdcMsmtRvSensingMean = &val.Text
					case "LV":
						parsedData.MdcIdcMsmtLvSensingMean = &val.Text
					}
				}
			}
		case "PACING_THRESHOLD":
			var amplitude, pulseWidth string
			for j := range subsection.Value {
				val := &subsection.Value[j]
				switch val.Name {
				case "AMPLITUDE":
					amplitude = val.Text
				case "PULSEWIDTH":
					pulseWidth = val.Text
				}
			}
			switch leadType {
			case "RA":
				parsedData.MdcIdcMsmtRaPacingThreshold = &amplitude
				parsedData.MdcIdcMsmtRaPw = &pulseWidth
			case "RV":
				parsedData.MdcIdcMsmtRvPacingThreshold = &amplitude
				parsedData.MdcIdcMsmtRvPw = &pulseWidth
			case "LV":
				parsedData.MdcIdcMsmtLvPacingThreshold = &amplitude
				parsedData.MdcIdcMsmtLvPw = &pulseWidth
			}
		case "IMPEDANCE":
			for j := range subsection.Value {
				val := &subsection.Value[j]
				if val.Name == "VALUE" {
					switch leadType {
					case "RA":
						parsedData.MdcIdcMsmtRaImpedanceMean = &val.Text
					case "RV":
						parsedData.MdcIdcMsmtRvImpedanceMean = &val.Text
					case "LV":
						parsedData.MdcIdcMsmtLvImpedanceMean = &val.Text
					}
				}
			}
		}
	}
}

func parseSetSection(setSection *Section, parsedData *models.ParsedData) {
	for i := range setSection.Section {
		subsection := &setSection.Section[i]
		switch subsection.Name {
		case "BRADY":
			for j := range subsection.Value {
				val := &subsection.Value[j]
				switch val.Name {
				case "LOWRATE":
					parsedData.MdcIdcSetBradyLowrate = &val.Text
				case "VENDOR_MODE":
					parsedData.MdcIdcSetBradyMode = &val.Text
				case "MAX_TRACKING_RATE":
					parsedData.MdcIdcSetBradyMaxTrackingRate = &val.Text
				case "MAX_SENSOR_RATE":
					parsedData.MdcIdcSetBradyMaxSensorRate = &val.Text
				case "AT_MODE_SWITCH_RATE":
					parsedData.MdcIdcSetBradyModeSwitchRate = &val.Text
				case "SAV":
					parsedData.MdcIdcDevSav = &val.Text
				case "PAV":
					parsedData.MdcIdcDevPav = &val.Text
				}
			}
		case "TACHYTHERAPY":
			for j := range subsection.Value {
				val := &subsection.Value[j]
				if val.Name == "VSTAT" && val.Text == "On" {
					// Tachy therapy is enabled, parse zones
					parseZones(setSection, parsedData)
				}
			}
		case "ZONE":
			// Zones are parsed separately when TACHYTHERAPY is On
		}
	}
}

func parseZones(setSection *Section, parsedData *models.ParsedData) {
	for i := range setSection.Section {
		if setSection.Section[i].Name == "ZONE" {
			zone := &setSection.Section[i]
			var vendorType string

			// Find vendor type first
			for j := range zone.Value {
				if zone.Value[j].Name == "VENDOR_TYPE" {
					vendorType = zone.Value[j].Text
					break
				}
			}

			// Parse zone values based on vendor type
			switch vendorType {
			case "BIO-Zone_VT1":
				parseVT1Zone(zone, parsedData)
			case "BIO-Zone_VT2":
				parseVT2Zone(zone, parsedData)
			case "BIO-Zone_VF":
				parseVFZone(zone, parsedData)
			}
		}
	}
}

func parseVT1Zone(zone *Section, parsedData *models.ParsedData) {
	for i := range zone.Value {
		val := &zone.Value[i]
		switch val.Name {
		case "DETECTION_INTERVAL":
			parsedData.VT1DetectionInterval = &val.Text
		case "TYPE_ATP_1":
			parsedData.VT1Therapy1Atp = &val.Text
		case "NUM_ATP_SEQS_1":
			parsedData.VT1Therapy1NoBursts = &val.Text
		case "TYPE_ATP_2":
			parsedData.VT1Therapy2Atp = &val.Text
		case "NUM_ATP_SEQS_2":
			parsedData.VT1Therapy2NoBursts = &val.Text
		case "SHOCK_ENERGY_1":
			parsedData.VT1Therapy3Energy = &val.Text
		case "SHOCK_ENERGY_2":
			parsedData.VT1Therapy4Energy = &val.Text
		case "SHOCK_ENERGY_3":
			parsedData.VT1Therapy5Energy = &val.Text
		case "MAX_NUM_SHOCKS_3":
			parsedData.VT1Therapy5MaxNumShocks = &val.Text
		}
	}
	active := "On"
	parsedData.VT1Active = &active
}

func parseVT2Zone(zone *Section, parsedData *models.ParsedData) {
	for i := range zone.Value {
		val := &zone.Value[i]
		switch val.Name {
		case "DETECTION_INTERVAL":
			parsedData.VT2DetectionInterval = &val.Text
		case "TYPE_ATP_1":
			parsedData.VT2Therapy1Atp = &val.Text
		case "NUM_ATP_SEQS_1":
			parsedData.VT2Therapy1NoBursts = &val.Text
		case "TYPE_ATP_2":
			parsedData.VT2Therapy2Atp = &val.Text
		case "NUM_ATP_SEQS_2":
			parsedData.VT2Therapy2NoBursts = &val.Text
		case "SHOCK_ENERGY_1":
			parsedData.VT2Therapy3Energy = &val.Text
		case "SHOCK_ENERGY_2":
			parsedData.VT2Therapy4Energy = &val.Text
		case "SHOCK_ENERGY_3":
			parsedData.VT2Therapy5Energy = &val.Text
		case "MAX_NUM_SHOCKS_3":
			parsedData.VT2Therapy5MaxNumShocks = &val.Text
		}
	}
	active := "On"
	parsedData.VT2Active = &active
}

func parseVFZone(zone *Section, parsedData *models.ParsedData) {
	for i := range zone.Value {
		val := &zone.Value[i]
		switch val.Name {
		case "DETECTION_INTERVAL":
			parsedData.VFDetectionInterval = &val.Text
		case "TYPE_ATP_1":
			parsedData.VFTherapy1Atp = &val.Text
		case "SHOCK_ENERGY_1":
			parsedData.VFTherapy2Energy = &val.Text
		case "SHOCK_ENERGY_2":
			parsedData.VFTherapy3Energy = &val.Text
		case "SHOCK_ENERGY_3":
			parsedData.VFTherapy4Energy = &val.Text
		case "NUM_SHOCKS_3":
			parsedData.VFTherapy4MaxNumShocks = &val.Text
		}
	}
	active := "On"
	parsedData.VFActive = &active
}

func parseXMLDate(dateStr string) string {
	// Parse dates in format like "2024-01-15"
	if dateStr == "" {
		return ""
	}
	return dateStr
}

func parseXMLDateTime(dateStr string) string {
	// Parse datetime and return ISO format
	if dateStr == "" {
		return ""
	}
	return dateStr
}

func parseLog(file io.Reader) (interface{}, error) {
	scanner := bufio.NewScanner(file)
	parsedData := &models.ParsedData{}

	// Map to temporarily store values
	rawValues := make(map[string]string)

	for scanner.Scan() {
		line := scanner.Text()
		parts := strings.Split(line, "\x1C")

		if len(parts) >= 3 {
			code := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[2])

			// Store the raw value
			rawValues[code] = value
		}
	}

	if err := scanner.Err(); err != nil {
		log.Printf("Error reading file: %v", err)
		return nil, err
	}

	// Process all the mappings
	processLogMapping(rawValues, parsedData)

	// Process dates
	if parsedData.ReportDate != nil {
		t, err := time.Parse("1/2/2006 3:04:05 PM", *parsedData.ReportDate)
		if err == nil {
			isoDate := t.Format(time.RFC3339)
			parsedData.ReportDate = &isoDate
		}
	}

	if parsedData.Dob != nil {
		t, err := time.Parse("1/2/2006", *parsedData.Dob)
		if err == nil {
			dateOnly := t.Format("2006-01-02")
			parsedData.Dob = &dateOnly
		}
	}

	// Process implant dates
	processLogImplantDate := func(datePtr **string) {
		if *datePtr != nil {
			t, err := time.Parse("1/2/2006", **datePtr)
			if err == nil {
				dateOnly := t.Format("2006-01-02")
				*datePtr = &dateOnly
			}
		}
	}

	processLogImplantDate(&parsedData.MdcIdcDevImplantDate)
	processLogImplantDate(&parsedData.MdcIdcDevRaImplantDate)
	processLogImplantDate(&parsedData.MdcIdcDevRvImplantDate)
	processLogImplantDate(&parsedData.MdcIdcDevLvImplantDate)

	// Set manufacturer for Abbott
	manufacturer := "Abbott"
	parsedData.MdcIdcDevManufacturer = &manufacturer

	// Set VF max shocks default
	vfMaxShocks := "x 4"
	parsedData.VFTherapy4MaxNumShocks = &vfMaxShocks

	return parsedData, nil
}

func processLogMapping(rawValues map[string]string, parsedData *models.ParsedData) {
	// Helper function to process and clean values
	cleanValue := func(value string) string {
		value = strings.TrimSpace(value)
		value = strings.TrimSuffix(value, " V")
		value = strings.TrimSuffix(value, " Ohm")
		value = strings.TrimSuffix(value, " %")
		value = strings.TrimSuffix(value, " bpm")
		value = strings.TrimSuffix(value, " ms")
		value = strings.TrimSuffix(value, " mV")
		value = strings.TrimSuffix(value, " J")
		return value
	}

	// Set value helper
	setValue := func(code string, target **string) {
		if val, ok := rawValues[code]; ok {
			cleaned := cleanValue(val)
			*target = &cleaned
		}
	}

	// Basic patient and device info
	setValue("2430", &parsedData.Name)
	setValue("105", &parsedData.ReportDate)
	setValue("2431", &parsedData.Dob)
	setValue("202", &parsedData.MdcIdcDevSerialNumber)
	setValue("200", &parsedData.MdcIdcDevModel)
	setValue("2442", &parsedData.MdcIdcDevImplantDate)

	// RA Lead
	setValue("2468", &parsedData.MdcIdcDevRaSerialNumber)
	setValue("2456", &parsedData.MdcIdcDevRaManufacturer)
	if val, ok := rawValues["2457"]; ok {
		cleaned := cleanValue(val)
		parsedData.MdcIdcDevRaModel = &cleaned
	} else {
		setValue("2458", &parsedData.MdcIdcDevRaModel)
	}
	setValue("2459", &parsedData.MdcIdcDevRaImplantDate)

	// RV Lead
	if val, ok := rawValues["2470"]; ok {
		cleaned := cleanValue(val)
		parsedData.MdcIdcDevRvSerialNumber = &cleaned
	} else {
		setValue("2469", &parsedData.MdcIdcDevRvSerialNumber)
	}
	setValue("2460", &parsedData.MdcIdcDevRvManufacturer)
	if val, ok := rawValues["2461"]; ok {
		cleaned := cleanValue(val)
		parsedData.MdcIdcDevRvModel = &cleaned
	} else {
		setValue("2462", &parsedData.MdcIdcDevRvModel)
	}
	setValue("2463", &parsedData.MdcIdcDevRvImplantDate)

	// LV Lead
	setValue("2471", &parsedData.MdcIdcDevLvSerialNumber)
	setValue("2464", &parsedData.MdcIdcDevLvManufacturer)
	if val, ok := rawValues["2465"]; ok {
		cleaned := cleanValue(val)
		parsedData.MdcIdcDevLvModel = &cleaned
	} else {
		setValue("2466", &parsedData.MdcIdcDevLvModel)
	}
	setValue("2467", &parsedData.MdcIdcDevLvImplantDate)

	// Brady Settings
	setValue("301", &parsedData.MdcIdcSetBradyMode)
	setValue("302", &parsedData.MdcIdcSetBradyLowrate)
	setValue("406", &parsedData.MdcIdcSetBradyMaxSensorRate)
	setValue("323", &parsedData.MdcIdcSetBradyMaxTrackingRate)

	// Statistics
	setValue("2754", &parsedData.MdcIdcStatAtafCount)
	setValue("2682", &parsedData.MdcIdcStatBradyRaPercentPaced)
	setValue("2681", &parsedData.MdcIdcStatBradyRvPercentPaced)

	// Battery
	setValue("519", &parsedData.MdcIdcBattVolt)
	setValue("2745", &parsedData.MdcIdcCapChargeTime)
	setValue("533", &parsedData.MdcIdcBattRemaining)

	// RA Measurements
	setValue("512", &parsedData.MdcIdcMsmtRaImpedanceMean)
	setValue("2721", &parsedData.MdcIdcMsmtRaSensingMean)
	if val, ok := rawValues["1610"]; ok {
		cleaned := cleanValue(val)
		parsedData.MdcIdcMsmtRaPacingThreshold = &cleaned
	} else {
		setValue("849", &parsedData.MdcIdcMsmtRaPacingThreshold)
	}
	setValue("1611", &parsedData.MdcIdcMsmtRaPw)

	// RV Measurements
	setValue("507", &parsedData.MdcIdcMsmtRvImpedanceMean)
	setValue("2722", &parsedData.MdcIdcMsmtRvSensingMean)
	if val, ok := rawValues["1606"]; ok {
		cleaned := cleanValue(val)
		parsedData.MdcIdcMsmtRvPacingThreshold = &cleaned
	} else {
		setValue("1620", &parsedData.MdcIdcMsmtRvPacingThreshold)
	}
	setValue("1607", &parsedData.MdcIdcMsmtRvPw)

	// LV Measurements
	setValue("2720", &parsedData.MdcIdcMsmtLvImpedanceMean)
	setValue("2723", &parsedData.MdcIdcMsmtLvSensingMean)
	if val, ok := rawValues["1616"]; ok {
		cleaned := cleanValue(val)
		parsedData.MdcIdcMsmtLvPacingThreshold = &cleaned
	} else {
		setValue("3009", &parsedData.MdcIdcMsmtLvPacingThreshold)
	}
	setValue("1617", &parsedData.MdcIdcMsmtLvPw)

	// VT1 Settings
	setValue("2103", &parsedData.VT1DetectionInterval)
	setValue("2320", &parsedData.VT1Therapy1Atp)
	setValue("2291", &parsedData.VT1Therapy1NoBursts)
	setValue("2327", &parsedData.VT1Therapy3Energy)
	setValue("2329", &parsedData.VT1Therapy4Energy)
	setValue("2331", &parsedData.VT1Therapy5Energy)
	setValue("2323", &parsedData.VT1Therapy5MaxNumShocks)

	// VT2 Settings
	setValue("2102", &parsedData.VT2DetectionInterval)
	setValue("2354", &parsedData.VT2Therapy1Atp)
	setValue("2341", &parsedData.VT2Therapy1NoBursts)
	setValue("2361", &parsedData.VT2Therapy3Energy)
	setValue("2363", &parsedData.VT2Therapy4Energy)
	setValue("2365", &parsedData.VT2Therapy5Energy)
	setValue("2357", &parsedData.VT2Therapy5MaxNumShocks)

	// VF Settings
	setValue("2101", &parsedData.VFDetectionInterval)
	setValue("2387", &parsedData.VFTherapy1Atp)
	setValue("2382", &parsedData.VFTherapy2Energy)
	setValue("2384", &parsedData.VFTherapy3Energy)
	setValue("2386", &parsedData.VFTherapy4Energy)
}

func parseBnk(file io.Reader) (interface{}, error) {
	scanner := bufio.NewScanner(file)
	rawData := make(map[string]string)

	// First line contains header with date
	var headerLine string
	if scanner.Scan() {
		headerLine = scanner.Text()
	}

	// Read all key-value pairs
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "#") && strings.Contains(line, ",") {
			parts := strings.SplitN(line, ",", 2)
			if len(parts) == 2 {
				key := strings.TrimSpace(parts[0])
				value := strings.TrimSpace(parts[1])
				rawData[key] = value
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	parsedData := &models.ParsedData{}

	// Parse header date (SAVE DATE: DD MMM YYYY)
	dateRegex := regexp.MustCompile(`SAVE DATE:\s*(\d+)\s+(\w+)\s+(\d{4})`)
	if matches := dateRegex.FindStringSubmatch(headerLine); len(matches) == 4 {
		day := matches[1]
		month := matches[2]
		year := matches[3]

		// Convert month name to number
		monthNum := getMonthNumber(month)
		if monthNum > 0 {
			reportDate := fmt.Sprintf("%s-%02d-%sT00:00:00Z", year, monthNum, day)
			parsedData.ReportDate = &reportDate
		}
	}

	// Patient information
	if firstName, ok := rawData["PatientFirstName"]; ok {
		if lastName, ok2 := rawData["PatientLastName"]; ok2 {
			fullName := firstName + " " + lastName
			parsedData.Name = &fullName
		}
	}

	if day, ok := rawData["PatientBirthDay"]; ok {
		if month, ok2 := rawData["PatientBirthMonth"]; ok2 {
			if year, ok3 := rawData["PatientBirthYear"]; ok3 {
				monthInt, _ := strconv.Atoi(month)
				dob := fmt.Sprintf("%s-%02d-%02s", year, monthInt, day)
				parsedData.Dob = &dob
			}
		}
	}

	// Device information
	if val, ok := rawData["SystemSerialNumber"]; ok {
		parsedData.MdcIdcDevSerialNumber = &val
	}
	if val, ok := rawData["SystemName"]; ok {
		parsedData.MdcIdcDevModel = &val
	}

	// Device implant date
	if day, ok := rawData["PatientData.ImplantDay"]; ok {
		if month, ok2 := rawData["PatientData.ImplantMonth"]; ok2 {
			if year, ok3 := rawData["PatientData.ImplantYear"]; ok3 {
				monthInt, _ := strconv.Atoi(month)
				implantDate := fmt.Sprintf("%s-%02d-%02s", year, monthInt, day)
				parsedData.MdcIdcDevImplantDate = &implantDate
			}
		}
	}

	// RA Lead
	if val, ok := rawData["PatientLeadASerialNum"]; ok {
		parsedData.MdcIdcDevRaSerialNumber = &val
	}
	if val, ok := rawData["PatientLeadAManufacturer"]; ok {
		parsedData.MdcIdcDevRaManufacturer = &val
	}
	if val, ok := rawData["PatientLeadAModelNum"]; ok {
		parsedData.MdcIdcDevRaModel = &val
	}
	if month, ok := rawData["PatientData.LeadA.ImplantMonth"]; ok {
		if year, ok2 := rawData["PatientData.LeadA.ImplantYear"]; ok2 {
			monthInt, _ := strconv.Atoi(month)
			implantDate := fmt.Sprintf("%s-%02d-01", year, monthInt)
			parsedData.MdcIdcDevRaImplantDate = &implantDate
		}
	}

	// RV Lead (Lead1)
	if val, ok := rawData["PatientLeadV1SerialNum"]; ok {
		parsedData.MdcIdcDevRvSerialNumber = &val
	}
	if val, ok := rawData["PatientLeadV1Manufacturer"]; ok {
		parsedData.MdcIdcDevRvManufacturer = &val
	}
	if val, ok := rawData["PatientLeadV1ModelNum"]; ok {
		parsedData.MdcIdcDevRvModel = &val
	}
	if month, ok := rawData["PatientData.Lead1.ImplantMonth"]; ok {
		if year, ok2 := rawData["PatientData.Lead1.ImplantYear"]; ok2 {
			monthInt, _ := strconv.Atoi(month)
			implantDate := fmt.Sprintf("%s-%02d-01", year, monthInt)
			parsedData.MdcIdcDevRvImplantDate = &implantDate
		}
	}

	// LV Lead (Lead2)
	if val, ok := rawData["PatientLeadV2SerialNum"]; ok {
		parsedData.MdcIdcDevLvSerialNumber = &val
	}
	if val, ok := rawData["PatientLeadV2Manufacturer"]; ok {
		parsedData.MdcIdcDevLvManufacturer = &val
	}
	if val, ok := rawData["PatientLeadV2ModelNum"]; ok {
		parsedData.MdcIdcDevLvModel = &val
	}
	if month, ok := rawData["PatientData.Lead2.ImplantMonth"]; ok {
		if year, ok2 := rawData["PatientData.Lead2.ImplantYear"]; ok2 {
			monthInt, _ := strconv.Atoi(month)
			implantDate := fmt.Sprintf("%s-%02d-01", year, monthInt)
			parsedData.MdcIdcDevLvImplantDate = &implantDate
		}
	}

	// Brady settings
	if val, ok := rawData["BdyNormBradyMode"]; ok {
		parsedData.MdcIdcSetBradyMode = &val
	}

	// Convert intervals to BPM
	if val, ok := rawData["NormParams.LRLIntvl"]; ok {
		bpm := msToBpm(val)
		parsedData.MdcIdcSetBradyLowrate = &bpm
	}
	if val, ok := rawData["NormParams.MTRIntvl"]; ok {
		bpm := msToBpm(val)
		parsedData.MdcIdcSetBradyMaxTrackingRate = &bpm
	}
	if val, ok := rawData["NormParams.MSRIntvl"]; ok {
		bpm := msToBpm(val)
		parsedData.MdcIdcSetBradyMaxSensorRate = &bpm
	}

	// Battery
	if val, ok := rawData["BatteryStatus.BatteryPhase"]; ok {
		parsedData.MdcIdcBattStatus = &val
		if val == "Beginning of Life" {
			bol := "BOL"
			parsedData.MdcIdcBattStatus = &bol
		}
	}
	if val, ok := rawData["BatteryLongevityParams.TimeToERI"]; ok {
		// Convert months to years
		months, err := strconv.ParseFloat(val, 64)
		if err == nil {
			years := months / 12.0
			yearsStr := fmt.Sprintf("%.1f years", years)
			parsedData.MdcIdcBattRemaining = &yearsStr
		}
	}
	if val, ok := rawData["CapformChargeTime"]; ok {
		parsedData.MdcIdcCapChargeTime = &val
	}

	// RA Measurements
	if val, ok := rawData["ManualLeadImpedData.RAMsmt.Msmt"]; ok {
		parsedData.MdcIdcMsmtRaImpedanceMean = &val
	}
	if val, ok := rawData["ManualIntrinsicResult.RAMsmt.Msmt"]; ok {
		parsedData.MdcIdcMsmtRaSensingMean = &val
	}
	if val, ok := rawData["InterPaceThreshResult.RAMsmt.Amplitude"]; ok {
		threshold := convertThreshold(val)
		parsedData.MdcIdcMsmtRaPacingThreshold = &threshold
	}
	if val, ok := rawData["InterPaceThreshResult.RAMsmt.PulseWidth"]; ok {
		parsedData.MdcIdcMsmtRaPw = &val
	}

	// RV Measurements
	if val, ok := rawData["ManualLeadImpedData.RVMsmt.Msmt"]; ok {
		parsedData.MdcIdcMsmtRvImpedanceMean = &val
	}
	if val, ok := rawData["ManualIntrinsicResult.RVMsmt.Msmt"]; ok {
		parsedData.MdcIdcMsmtRvSensingMean = &val
	}
	if val, ok := rawData["InterPaceThreshResult.RVMsmt.Amplitude"]; ok {
		threshold := convertThreshold(val)
		parsedData.MdcIdcMsmtRvPacingThreshold = &threshold
	}
	if val, ok := rawData["InterPaceThreshResult.RVMsmt.PulseWidth"]; ok {
		parsedData.MdcIdcMsmtRvPw = &val
	}

	// LV Measurements
	if val, ok := rawData["ManualLeadImpedData.LVMsmt.Msmt"]; ok {
		parsedData.MdcIdcMsmtLvImpedanceMean = &val
	}
	if val, ok := rawData["ManualIntrinsicResult.LVMsmt.Msmt"]; ok {
		parsedData.MdcIdcMsmtLvSensingMean = &val
	}
	if val, ok := rawData["InterPaceThreshResult.LVMsmt.Amplitude"]; ok {
		threshold := convertThreshold(val)
		parsedData.MdcIdcMsmtLvPacingThreshold = &threshold
	}
	if val, ok := rawData["InterPaceThreshResult.LVMsmt.PulseWidth"]; ok {
		parsedData.MdcIdcMsmtLvPw = &val
	}

	// HV Impedance
	if val, ok := rawData["ShockImpedanceLastMeas0"]; ok && val != "" {
		parsedData.MdcIdcMsmtHvImpedanceMean = &val
	} else if val, ok := rawData["ShockImpedanceLastMeas1"]; ok {
		parsedData.MdcIdcMsmtHvImpedanceMean = &val
	}

	// VT1 Settings
	if val, ok := rawData["DetectVT1Interval"]; ok {
		bpm := msToBpm(val)
		parsedData.VT1DetectionInterval = &bpm
	}
	if val, ok := rawData["VT1ATP1NumberOfBursts"]; ok {
		formatted := fmt.Sprintf("x %s", val)
		parsedData.VT1Therapy1NoBursts = &formatted
	}
	if val, ok := rawData["VT1ATP1NumberOfBursts"]; ok && val != "0" {
		atp := "Burst"
		parsedData.VT1Therapy1Atp = &atp
	}
	if val, ok := rawData["VT1ATP2NumberOfBursts"]; ok {
		formatted := fmt.Sprintf("x %s", val)
		parsedData.VT1Therapy2NoBursts = &formatted
	}
	if val, ok := rawData["VT1ATP2NumberOfBursts"]; ok && val != "0" {
		atp := "Burst"
		parsedData.VT1Therapy2Atp = &atp
	}
	if val, ok := rawData["VT1Shock1Energy"]; ok {
		energy := fmt.Sprintf("%s J", val)
		parsedData.VT1Therapy3Energy = &energy
	}
	if val, ok := rawData["VT1Shock2Energy"]; ok {
		energy := fmt.Sprintf("%s J", val)
		parsedData.VT1Therapy4Energy = &energy
	}
	if val, ok := rawData["VT1MaxShockEnergy"]; ok {
		energy := fmt.Sprintf("%s J", val)
		parsedData.VT1Therapy5Energy = &energy
	}

	// Calculate VT1 remaining shocks
	vt1Shock1, _ := strconv.Atoi(rawData["VT1Shock1Energy"])
	vt1Shock2, _ := strconv.Atoi(rawData["VT1Shock2Energy"])
	if vt1Shock1 == 0 && vt1Shock2 == 0 {
		maxShocks := "Off"
		parsedData.VT1Therapy5MaxNumShocks = &maxShocks
	} else {
		maxShocks := calculateRemainingShocks(rawData, "VT1")
		parsedData.VT1Therapy5MaxNumShocks = &maxShocks
	}

	// VT2 Settings
	if val, ok := rawData["DetectVTInterval"]; ok {
		bpm := msToBpm(val)
		parsedData.VT2DetectionInterval = &bpm
	}
	if val, ok := rawData["VTATP1NumberOfBursts"]; ok {
		formatted := fmt.Sprintf("x %s", val)
		parsedData.VT2Therapy1NoBursts = &formatted
	}
	if val, ok := rawData["VTATP1NumberOfBursts"]; ok && val != "0" {
		atp := "Burst"
		parsedData.VT2Therapy1Atp = &atp
	}
	if val, ok := rawData["VTATP2NumberOfBursts"]; ok {
		formatted := fmt.Sprintf("x %s", val)
		parsedData.VT2Therapy2NoBursts = &formatted
	}
	if val, ok := rawData["VTATP2NumberOfBursts"]; ok && val != "0" {
		atp := "Burst"
		parsedData.VT2Therapy2Atp = &atp
	}
	if val, ok := rawData["VTShock1Energy"]; ok {
		energy := fmt.Sprintf("%s J", val)
		parsedData.VT2Therapy3Energy = &energy
	}
	if val, ok := rawData["VTShock2Energy"]; ok {
		energy := fmt.Sprintf("%s J", val)
		parsedData.VT2Therapy4Energy = &energy
	}
	if val, ok := rawData["VTherapyParams.VTMaxShockEnergy"]; ok {
		energy := fmt.Sprintf("%s J", val)
		parsedData.VT2Therapy5Energy = &energy
	}

	// Calculate VT2 remaining shocks
	vtShock1, _ := strconv.Atoi(rawData["VTShock1Energy"])
	vtShock2, _ := strconv.Atoi(rawData["VTShock2Energy"])
	if vtShock1 == 0 && vtShock2 == 0 {
		maxShocks := "Off"
		parsedData.VT2Therapy5MaxNumShocks = &maxShocks
	} else {
		maxShocks := calculateRemainingShocks(rawData, "VT")
		parsedData.VT2Therapy5MaxNumShocks = &maxShocks
	}

	// VF Settings
	if val, ok := rawData["DetectVFInterval"]; ok {
		bpm := msToBpm(val)
		parsedData.VFDetectionInterval = &bpm
	}
	if val, ok := rawData["VTherapyParams.VFATPEnable"]; ok && val == "1" {
		atp := "Burst"
		parsedData.VFTherapy1Atp = &atp
	}
	if val, ok := rawData["VFShock1Energy"]; ok {
		// VFShock1Energy is actually therapy 2
		energy := fmt.Sprintf("%s J", val)
		parsedData.VFTherapy2Energy = &energy
	}
	if val, ok := rawData["VFShock2Energy"]; ok && val != "0" {
		energy := fmt.Sprintf("%s J", val)
		parsedData.VFTherapy3Energy = &energy
	}

	// Calculate VF remaining shocks
	vfShock1, _ := strconv.Atoi(rawData["VFShock1Energy"])
	vfShock2, _ := strconv.Atoi(rawData["VFShock2Energy"])
	if vfShock1 == 0 && vfShock2 == 0 {
		maxShocks := "Off"
		parsedData.VFTherapy4MaxNumShocks = &maxShocks
	} else {
		maxShocks := calculateRemainingShocks(rawData, "VF")
		parsedData.VFTherapy4MaxNumShocks = &maxShocks
	}

	// Set manufacturer and VF max energy
	manufacturer := "Boston Scientific"
	parsedData.MdcIdcDevManufacturer = &manufacturer

	vfMaxEnergy := "41 J"
	parsedData.VFTherapy4Energy = &vfMaxEnergy

	return parsedData, nil
}

// Helper functions
func msToBpm(ms string) string {
	msInt, err := strconv.Atoi(ms)
	if err != nil {
		return ms
	}
	bpm := int(math.Round(60000.0 / float64(msInt)))
	return strconv.Itoa(bpm)
}

func convertThreshold(threshold string) string {
	thresholdFloat, err := strconv.ParseFloat(threshold, 64)
	if err != nil {
		return threshold
	}
	result := thresholdFloat / 1000.0
	return fmt.Sprintf("%.3f", result)
}

func getMonthNumber(monthName string) int {
	months := map[string]int{
		"Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
		"Jul": 7, "Aug": 8, "Sep": 9, "Sept": 9, "Oct": 10, "Nov": 11, "Dec": 12,
	}
	return months[monthName]
}

func calculateRemainingShocks(rawData map[string]string, zoneType string) string {
	var maxNumShocksKey string

	switch zoneType {
	case "VT1":
		maxNumShocksKey = "VTachyConstParam.VThpySelection.MaxNumShocks[VT1Zone]"
	case "VT":
		maxNumShocksKey = "VTachyConstParam.VThpySelection.MaxNumShocks[VTZone]"
	case "VF":
		maxNumShocksKey = "VTachyConstParam.VThpySelection.MaxNumShocks[VFZone]"
	default:
		return "x 4"
	}

	maxShocks, _ := strconv.Atoi(rawData[maxNumShocksKey])

	// Get number of shocks already configured
	var configuredShocks int
	switch zoneType {
	case "VT1":
		shock1, _ := strconv.Atoi(rawData["VT1Shock1Energy"])
		shock2, _ := strconv.Atoi(rawData["VT1Shock2Energy"])
		if shock1 > 0 {
			configuredShocks++
		}
		if shock2 > 0 {
			configuredShocks++
		}
	case "VT":
		shock1, _ := strconv.Atoi(rawData["VTShock1Energy"])
		shock2, _ := strconv.Atoi(rawData["VTShock2Energy"])
		if shock1 > 0 {
			configuredShocks++
		}
		if shock2 > 0 {
			configuredShocks++
		}
	case "VF":
		shock1, _ := strconv.Atoi(rawData["VFShock1Energy"])
		shock2, _ := strconv.Atoi(rawData["VFShock2Energy"])
		if shock1 > 0 {
			configuredShocks++
		}
		if shock2 > 0 {
			configuredShocks++
		}
	}

	remaining := maxShocks - configuredShocks
	if remaining < 0 {
		remaining = 0
	}

	return fmt.Sprintf("x %d", remaining)
}

func parsePDF(file io.Reader) (interface{}, error) {
	// Read all content into memory since unipdf needs a ReadSeeker
	content, err := io.ReadAll(file)
	if err != nil {
		return nil, err
	}

	pdfReader, err := model.NewPdfReader(bytes.NewReader(content))
	if err != nil {
		return nil, err
	}

	isEncrypted, err := pdfReader.IsEncrypted()
	if err != nil {
		return nil, err
	}

	if isEncrypted {
		_, err = pdfReader.Decrypt([]byte(""))
		if err != nil {
			return nil, err
		}
	}

	// Try to extract embedded XML from the PDF
	// For now, return a simple message. The full implementation would require
	// more complex PDF parsing to extract embedded files from the Names tree
	// or Associated Files (AF) array.

	// TODO: Implement full PDF embedded file extraction
	// This would involve:
	// 1. Accessing the PDF catalog
	// 2. Looking for Names > EmbeddedFiles name tree
	// 3. Extracting file specs and their streams
	// 4. Decoding the stream data
	// 5. Passing XML content to parseXML

	return fiber.Map{
		"message":  "PDF parsing not fully implemented. Please upload the embedded XML file directly or use the frontend parser.",
		"fileType": "pdf",
	}, nil
}
