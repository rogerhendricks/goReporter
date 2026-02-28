package bootstrap

import (
	"log"
	"os"
	"time"

	"gorm.io/gorm"

	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
)

func SetupTokenCleanup() {
	// Clean up expired tokens every hour
	ticker := time.NewTicker(1 * time.Hour)
	go func() {
		for range ticker.C {
			if err := models.CleanupExpiredTokens(); err != nil {
				log.Printf("Error cleaning up expired tokens: %v", err)
			}
		}
	}()
}

func MigrateAndSeed() error {
	if err := migrate(config.DB); err != nil {
		return err
	}

	// Seed when empty or DB_SEED=1 to force
	if shouldSeed(config.DB) || os.Getenv("DB_SEED") == "1" {
		if err := seed(config.DB); err != nil {
			return err
		}
	}

	log.Println("Database migration and seeding completed.")
	return nil
}

func migrate(db *gorm.DB) error {
	log.Println("Running AutoMigrate...")

	// Drop all tables when DB_RESET=drop
	if os.Getenv("DB_RESET") == "drop" {
		log.Println("Dropping all tables (DB_RESET=drop)...")
		if tables, err := db.Migrator().GetTables(); err == nil {
			for _, t := range tables {
				_ = db.Migrator().DropTable(t)
			}
		}
	}

	return db.AutoMigrate(
		&models.User{},
		&models.Token{},
		&models.Doctor{},
		&models.Address{},
		&models.Device{},
		&models.Lead{},
		&models.Patient{},
		&models.AccessRequest{},
		&models.PatientConsent{},
		&models.PatientNote{},
		&models.Medication{},
		&models.PatientDoctor{},
		&models.ImplantedDevice{},
		&models.ImplantedLead{},
		&models.Report{},
		&models.Arrhythmia{},
		&models.Tag{},
		&models.Task{},
		&models.TaskNote{},
		&models.TaskTemplate{},
		&models.CustomReport{},
		&models.SavedSearchFilter{},
		&models.SearchHistory{},
		&models.Webhook{},
		&models.WebhookDelivery{},
		&models.Team{},
		&models.AppointmentSlot{},
		&models.Appointment{},
		&models.PatientNote{},
		&models.BillingCode{},
	)
}

func shouldSeed(db *gorm.DB) bool {
	var count int64
	if err := db.Model(&models.User{}).Count(&count).Error; err != nil {
		return false
	}
	return count == 0
}

func pointer(i int) *int {
	return &i
}

func seed(db *gorm.DB) error {
	log.Println("Seeding database...")

	// Users
	adminPass, _ := models.HashPassword("OFvY#XGMFdC4P0")
	admin := models.User{
		Username: "admin",
		FullName: "Administrator",
		Email:    "admin@example.com",
		Password: adminPass,
		Role:     "admin",
	}
	if err := db.Create(&admin).Error; err != nil {
		return err
	}

	userPass, _ := models.HashPassword("OFvYXGMFdC4P01#")
	demoUser := models.User{
		Username: "demo",
		FullName: "Demo User",
		Email:    "demo@example.com",
		Password: userPass,
		Role:     "user",
	}
	if err := db.Create(&demoUser).Error; err != nil {
		return err
	}

	// Doctors + Addresses
	doc1 := models.Doctor{
		FullName:  "Dr. Alice Smith",
		Email:     "alice.smith@clinic.com",
		Phone:     "555-1000",
		Specialty: "Cardiology",
		Addresses: []models.Address{
			{Street: "100 Heart Way", City: "Cardio City", State: "CA", Country: "USA", Zip: "90001"},
		},
	}
	doc2 := models.Doctor{
		FullName:  "Dr. Bob Jones",
		Email:     "bob.jones@hospital.org",
		Phone:     "555-2000",
		Specialty: "Electrophysiology",
		Addresses: []models.Address{
			{Street: "200 Lead Ln", City: "Pulse Town", State: "TX", Country: "USA", Zip: "73301"},
		},
	}
	if err := db.Create(&doc1).Error; err != nil {
		return err
	}
	if err := db.Create(&doc2).Error; err != nil {
		return err
	}

	newDevice := func(udid uint64, name, manufacturer, model string, isMri bool, hasAlert bool, typ string) models.Device {
		return models.Device{UDID: udid, Name: name, Manufacturer: manufacturer, DevModel: model, IsMri: isMri, HasAlert: hasAlert, Type: typ}
	}

	// Devices (UDIDs hardcoded per device)
	devices := []models.Device{
		// Medtronic
		newDevice(1000001, "Azure MRI SureScan", "Medtronic", "W1SR01", true, false, "Pacemaker"),
		newDevice(1000002, "Azure MRI SureScan", "Medtronic", "W2SR01", true, false, "Pacemaker"),
		newDevice(1000003, "Azure MRI SureScan", "Medtronic", "W3SR01", true, false, "Pacemaker"),
		newDevice(1000004, "Azure MRI SureScan", "Medtronic", "W1DR01", true, false, "Pacemaker"),
		newDevice(1000005, "Azure MRI SureScan", "Medtronic", "W2DR01", true, false, "Pacemaker"),
		newDevice(1000006, "Azure MRI SureScan", "Medtronic", "W3DR01", true, false, "Pacemaker"),
		newDevice(1000007, "Advisa DR MRI SureScan", "Medtronic", "A2DR01", true, false, "Pacemaker"),
		newDevice(1000008, "Advisa DR MRI SureScan", "Medtronic", "A3DR01", true, false, "Pacemaker"),
		newDevice(1000009, "Advisa SR MRI SureScan", "Medtronic", "A3SR01", true, false, "Pacemaker"),
		newDevice(1000010, "Precepta CRT-P", "Medtronic", "W1TR04", true, false, "Pacemaker"),
		newDevice(1000011, "Claria MRI CRT-D SureScan", "Medtronic", "DTMA1D1", true, false, "Defibrillator"),
		newDevice(1000012, "Claria MRI CRT-D SureScan", "Medtronic", "DTMA1D4", true, false, "Defibrillator"),
		newDevice(1000013, "Claria MRI CRT-D SureScan", "Medtronic", "DTMA1Q1", true, false, "Defibrillator"),
		newDevice(1000014, "Claria MRI CRT-D SureScan", "Medtronic", "DTMA1QQ", true, false, "Defibrillator"),
		newDevice(1000015, "Claria MRI CRT-D SureScan", "Medtronic", "DTMA2D1", true, false, "Defibrillator"),
		newDevice(1000016, "Claria MRI CRT-D SureScan", "Medtronic", "DTMA2D4", true, false, "Defibrillator"),
		newDevice(1000017, "Claria MRI CRT-D SureScan", "Medtronic", "DTMA2Q1", true, false, "Defibrillator"),
		newDevice(1000018, "Claria MRI CRT-D SureScan", "Medtronic", "DTMA2QQ", true, false, "Defibrillator"),
		newDevice(1000019, "Cobalt DR ICD MRI SureScan", "Medtronic", "DDPB3D1", true, false, "Defibrillator"),
		newDevice(1000020, "Cobalt DR ICD MRI SureScan", "Medtronic", "DDPB3D4", true, false, "Defibrillator"),
		newDevice(1000021, "Cobalt VR ICD MRI SureScan", "Medtronic", "DVPB3D1", true, false, "Defibrillator"),
		newDevice(1000022, "Cobalt VR ICD MRI SureScan", "Medtronic", "DVPB3D4", true, false, "Defibrillator"),
		newDevice(1000023, "Cobalt XT DR ICD MRI SureScan", "Medtronic", "DDPA2D1", true, false, "Defibrillator"),
		newDevice(1000024, "Cobalt XT DR ICD MRI SureScan", "Medtronic", "DDPA2D4", true, false, "Defibrillator"),
		newDevice(1000025, "Cobalt XT HF CRT-D MRI SureScan", "Medtronic", "DTPA2D1", true, false, "Defibrillator"),
		newDevice(1000026, "Cobalt XT HF CRT-D MRI SureScan", "Medtronic", "DTPA2D4", true, false, "Defibrillator"),
		newDevice(1000027, "Cobalt XT HF CRT-D MRI SureScan", "Medtronic", "DTPA2Q1", true, false, "Defibrillator"),
		newDevice(1000028, "Cobalt HF CRT-D MRI SureScan", "Medtronic", "DTPB2D1", true, false, "Defibrillator"),
		newDevice(1000029, "Cobalt HF CRT-D MRI SureScan", "Medtronic", "DTPB2D4", true, false, "Defibrillator"),
		newDevice(1000030, "Cobalt HF CRT-D MRI SureScan", "Medtronic", "DTPB2Q1", true, false, "Defibrillator"),
		newDevice(1000031, "Cobalt HF CRT-D MRI SureScan", "Medtronic", "DTPB2QQ", true, false, "Defibrillator"),
		newDevice(1000032, "Reveal LINQ", "Medtronic", "LNQ11", true, false, "ICM"),
		newDevice(1000033, "Reveal LINQ II", "Medtronic", "LNQ22", true, false, "ICM"),
		newDevice(1000034, "Micra AV2", "Medtronic", "MC2AVR1", true, false, "Pacemaker"),
		newDevice(1000035, "Micra VR2", "Medtronic", "MC2VR01", true, false, "Pacemaker"),
		newDevice(1000036, "Micra AV", "Medtronic", "MC1AVR1", true, false, "Pacemaker"),
		newDevice(1000037, "Micra VR", "Medtronic", "MC1VR01", true, false, "Pacemaker"),
		// Biotronik
		newDevice(1000038, "Entovis DR-T", "Biotronik", "ENTOVDRT", true, false, "Pacemaker"),
		newDevice(1000039, "Entovis SR-T", "Biotronik", "ENTOVSRT", true, false, "Pacemaker"),
		newDevice(1000040, "Edora 8 DR-T", "Biotronik", "EDO8DRT", true, false, "Pacemaker"),
		newDevice(1000041, "Edora 8 SR-T", "Biotronik", "EDO8SRT", true, false, "Pacemaker"),
		newDevice(1000042, "Evia DR-T", "Biotronik", "EVIADRT", true, false, "Pacemaker"),
		newDevice(1000043, "Etrinsa 8 DR-T", "Biotronik", "ETR8DRT", true, false, "Pacemaker"),
		newDevice(1000044, "Itrevia 7 VR-T DX", "Biotronik", "ITR7VRTDX", true, false, "Defibrillator"),
		newDevice(1000045, "Itrevia 7 VR-T", "Biotronik", "ITR7VRT", true, false, "Defibrillator"),
		newDevice(1000046, "Ilesto 7 DR-T", "Biotronik", "IL7DRT", true, false, "Defibrillator"),
		newDevice(1000047, "Ilesto 7 VR-T DX", "Biotronik", "IL7VRTDX", true, false, "Defibrillator"),
		newDevice(1000048, "Lumax 740 DR-T", "Biotronik", "LU740DRT", true, false, "Defibrillator"),
		newDevice(1000049, "Lumax 540 DR-T", "Biotronik", "LU540DRT", true, false, "Defibrillator"),
		newDevice(1000050, "Intica Neo 7 VR-T", "Biotronik", "INTNEO7VRT", true, false, "Defibrillator"),
		newDevice(1000051, "Intica Neo 7 DR-T", "Biotronik", "INTNEO7DRT", true, false, "Defibrillator"),
		newDevice(1000052, "Rivacor 7 HF-T QP", "Biotronik", "RIV7HFTQP", true, false, "Defibrillator"),
		newDevice(1000053, "Biomonitor II", "Biotronik", "BIOMONITORII", true, false, "ICM"),
		newDevice(1000054, "Biomonitor IIIm", "Biotronik", "BIOMONITORIIIM", true, false, "ICM"),
		newDevice(1000055, "Biomonitor IV", "Biotronik", "BIOMONITORIV", true, false, "ICM"),
		// Boston Scientific
		newDevice(1000056, "Resonate", "Boston Scientific", "D432", true, false, "Defibrillator"),
		newDevice(1000057, "Resonate", "Boston Scientific", "D433", true, false, "Defibrillator"),
		newDevice(1000058, "Resonate X4", "Boston Scientific", "G447", true, false, "Defibrillator"),
		newDevice(1000059, "Autogen", "Boston Scientific", "D174", false, false, "Defibrillator"),
		newDevice(1000060, "Autogen", "Boston Scientific", "D175", false, false, "Defibrillator"),
		newDevice(1000061, "Autogen", "Boston Scientific", "D176", false, false, "Defibrillator"),
		newDevice(1000062, "Autogen", "Boston Scientific", "D177", false, false, "Defibrillator"),
		newDevice(1000063, "Autogen", "Boston Scientific", "G172", false, false, "Defibrillator"),
		newDevice(1000064, "Dynagen", "Boston Scientific", "D150", true, false, "Defibrillator"),
		newDevice(1000065, "Dynagen", "Boston Scientific", "D152", true, false, "Defibrillator"),
		newDevice(1000066, "Momentum", "Boston Scientific", "D120", true, false, "Defibrillator"),
		newDevice(1000067, "Momentum", "Boston Scientific", "D121", true, false, "Defibrillator"),
		newDevice(1000068, "Momentum", "Boston Scientific", "G138", true, false, "Defibrillator"),
		newDevice(1000069, "Accolade", "Boston Scientific", "L310", true, false, "Pacemaker"),
		newDevice(1000070, "Accolade", "Boston Scientific", "L311", true, false, "Pacemaker"),
		newDevice(1000071, "Accolade", "Boston Scientific", "L331", true, false, "Pacemaker"),
		newDevice(1000072, "Vitalio", "Boston Scientific", "K275", true, false, "Pacemaker"),
		newDevice(1000073, "Vitalio", "Boston Scientific", "K277", true, false, "Pacemaker"),
		newDevice(1000074, "Visionist X4", "Boston Scientific", "U228", true, true, "Pacemaker"),
		newDevice(1000075, "Lux Dx", "Boston Scientific", "M301", true, false, "ICM"),
		newDevice(1000076, "Lux Dx II", "Boston Scientific", "M302", true, false, "ICM"),
		newDevice(1000077, "Lux Dx II+", "Boston Scientific", "M312", true, false, "ICM"),
		// Abbott
		newDevice(1000078, "Assurity", "Abbott", "PM1272", true, false, "Pacemaker"),
		newDevice(1000079, "Assurity", "Abbott", "PM2272", true, false, "Pacemaker"),
		newDevice(1000080, "Accent", "Abbott", "PM1124", true, false, "Pacemaker"),
		newDevice(1000081, "Accent", "Abbott", "PM1224", true, false, "Pacemaker"),
		newDevice(1000082, "Accent", "Abbott", "PM2124", true, false, "Pacemaker"),
		newDevice(1000083, "Accent", "Abbott", "PM2224", true, false, "Pacemaker"),
		newDevice(1000084, "Aveir", "Abbott", "LSP112V", true, false, "Pacemaker"),
		newDevice(1000085, "Quadra Allure", "Abbott", "PM3562", true, false, "Pacemaker"),
		newDevice(1000086, "Quadra Allure", "Abbott", "PM3542", true, false, "Pacemaker"),
		newDevice(1000087, "Quadra Assura", "Abbott", "CD3371-40Q", true, false, "Defibrillator"),
		newDevice(1000088, "Quadra Assura", "Abbott", "CD3371-40QC", true, false, "Defibrillator"),
		newDevice(1000089, "Quadra Assura", "Abbott", "CD3367-40Q", true, false, "Defibrillator"),
		newDevice(1000090, "Quadra Assura", "Abbott", "CD3367-40QC", true, false, "Defibrillator"),
		newDevice(1000091, "Neutrino", "Abbott", "CDDRA600Q", true, true, "Defibrillator"),
		newDevice(1000092, "Neutrino", "Abbott", "CDHFA600Q", true, true, "Defibrillator"),
		newDevice(1000093, "Neutrino", "Abbott", "CDVRA600Q", true, true, "Defibrillator"),
		newDevice(1000094, "Gallant", "Abbott", "CDDRA500Q", true, true, "Defibrillator"),
		newDevice(1000095, "Gallant", "Abbott", "CDHFA500Q", true, true, "Defibrillator"),
		newDevice(1000096, "Gallant", "Abbott", "CDVRA500Q", true, true, "Defibrillator"),
		newDevice(1000097, "Jot Dx", "Abbott", "4500", true, false, "ICM"),
		newDevice(1000098, "Confirm Rx", "Abbott", "DM3500", true, false, "ICM"),
		newDevice(1000099, "Aveir VR", "Abbott", "LSP112V ", true, false, "pacemaker"),
		newDevice(1000100, "Aveir AR", "Abbott", "LSP201A ", true, false, "pacemaker"),
		newDevice(1000101, "Aveir AR2", "Abbott", "LSP203A ", true, false, "pacemaker"),
	}
	if err := db.Create(&devices).Error; err != nil {
		return err
	}

	// Leads
	leadSeed := func(udid uint64, name, manufacturer, model, connector, polarity string, isMri bool) models.Lead {
		return models.Lead{UDID: udid, Name: name, Manufacturer: manufacturer, LeadModel: model, Connector: connector, Polarity: polarity, IsMri: isMri}
	}

	leads := []models.Lead{
		// Medtronic
		leadSeed(2000001, "CapSure Sense 4074", "Medtronic", "4074", "IS1", "Bipolar", true),
		leadSeed(2000002, "CapSureFix Sense 4574", "Medtronic", "4574", "IS1", "Bipolar", true),
		leadSeed(2000003, "CapSureFix Novus 5076", "Medtronic", "5076", "IS1", "Bipolar", true),
		leadSeed(2000004, "CapSureFix Novus 4076", "Medtronic", "4076", "IS1", "Bipolar", true),
		leadSeed(2000005, "Sprint Quatro 6946", "Medtronic", "6946", "DF4", "Bipolar", true),
		leadSeed(2000006, "Sprint Quatro 6947", "Medtronic", "6947", "DF4", "Bipolar", true),
		leadSeed(2000007, "Sprint Quatro 6935", "Medtronic", "6935", "DF4", "Bipolar", true),
		leadSeed(2000008, "Attain Performa S", "Medtronic", "4798", "DF4", "Bipolar", true),
		leadSeed(2000009, "Attain Performa S", "Medtronic", "4598", "DF4", "Bipolar", true),
		leadSeed(2000010, "Attain Performa Straight", "Medtronic", "4398", "DF4", "Bipolar", true),
		leadSeed(2000011, "Attain Performa", "Medtronic", "4298", "DF4", "Bipolar", true),
		// Abbott
		leadSeed(2000012, "Tendril STS", "Abbott", "2088TC-52", "IS1", "Bipolar", true),
		leadSeed(2000013, "Tendril STS", "Abbott", "2088TC-46", "IS1", "Bipolar", true),
		leadSeed(2000014, "Tendril 2088TC", "Abbott", "2088TC-52", "IS1", "Bipolar", true),
		leadSeed(2000015, "Tendril 2088TC", "Abbott", "2088TC-65", "IS1", "Bipolar", true),
		leadSeed(2000016, "Durata 7122Q", "Abbott", "7122Q-58", "DF4", "Bipolar", true),
		leadSeed(2000017, "Durata 7122Q", "Abbott", "7122Q-65", "DF4", "Bipolar", true),
		leadSeed(2000018, "Durata 7120Q", "Abbott", "7120Q-58", "DF4", "Bipolar", true),
		leadSeed(2000019, "Durata 7120Q", "Abbott", "7120Q-65", "DF4", "Bipolar", true),
		// Biotronik
		leadSeed(2000020, "Solia S 60", "Biotronik", "SOL60", "IS1", "Bipolar", true),
		leadSeed(2000021, "Solia S 53", "Biotronik", "SOL52", "IS1", "Bipolar", true),
		leadSeed(2000022, "Pamira", "Biotronik", "PAM", "DF4", "Bipolar", true),
		leadSeed(2000023, "Plexa Pro MRI", "Biotronik", "PLX", "DF4", "Bipolar", true),
		// Boston Scientific
		leadSeed(2000024, "Acuity X4", "Boston Scientific", "4678", "IS4", "Quadripolar", true),
		leadSeed(2000025, "Acuity X4", "Boston Scientific", "4677", "IS4", "Quadripolar", true),
		leadSeed(2000026, "Acuity X4", "Boston Scientific", "4675", "IS4", "Quadripolar", true),
		leadSeed(2000027, "Acuity X4", "Boston Scientific", "4674", "IS4", "Quadripolar", true),
		leadSeed(2000028, "Acuity X4", "Boston Scientific", "4672", "IS4", "Quadripolar", true),
		leadSeed(2000029, "Acuity X4", "Boston Scientific", "4671", "IS4", "Quadripolar", true),
		leadSeed(2000030, "Reliant 4-Front", "Boston Scientific", "0636", "DF4", "Bipolar", true),
		leadSeed(2000031, "Reliant 4-Front", "Boston Scientific", "0650", "DF4", "Bipolar", true),
		leadSeed(2000032, "Reliant 4-Front", "Boston Scientific", "0651", "DF4", "Bipolar", true),
		leadSeed(2000033, "Reliant 4-Front", "Boston Scientific", "0652", "DF4", "Bipolar", true),
		leadSeed(2000034, "Reliant 4-Front", "Boston Scientific", "0653", "DF4", "Bipolar", true),
		leadSeed(2000035, "Reliant 4-Front", "Boston Scientific", "0654", "DF4", "Bipolar", true),
		leadSeed(2000036, "Reliant 4-Front", "Boston Scientific", "0655", "DF4", "Bipolar", true),
		leadSeed(2000037, "Reliant 4-Front", "Boston Scientific", "0657", "DF4", "Bipolar", true),
		leadSeed(2000038, "Reliant 4-Front", "Boston Scientific", "0658", "DF4", "Bipolar", true),
		leadSeed(2000039, "Reliant 4-Front", "Boston Scientific", "0662", "DF4", "Bipolar", true),
		leadSeed(2000040, "Ingevity+", "Boston Scientific", "7840", "IS1", "Bipolar", true),
		leadSeed(2000041, "Ingevity+", "Boston Scientific", "7841", "IS1", "Bipolar", true),
		leadSeed(2000042, "Ingevity+", "Boston Scientific", "7842", "IS1", "Bipolar", true),
		leadSeed(2000043, "Ingevity MRI", "Boston Scientific", "7735", "IS1", "Bipolar", true),
		leadSeed(2000044, "Ingevity MRI", "Boston Scientific", "7736", "IS1", "Bipolar", true),
		leadSeed(2000045, "Ingevity MRI", "Boston Scientific", "7740", "IS1", "Bipolar", true),
		leadSeed(2000046, "Ingevity MRI", "Boston Scientific", "7741", "IS1", "Bipolar", true),
		leadSeed(2000047, "Ingevity MRI", "Boston Scientific", "7742", "IS1", "Bipolar", true),
	}
	if err := db.Create(&leads).Error; err != nil {
		return err
	}

	// Tags
	seedTags := []models.Tag{
		// patient tags
		{Name: "Follow-up", Type: "patient", Description: "Patient requires follow-up", Color: "#0072a3"},
		{Name: "High Risk", Type: "patient", Description: "Higher clinical risk / needs closer monitoring", Color: "#eb00b8"},
		{Name: "Needs Scheduling", Type: "patient", Description: "Appointment or procedure needs scheduling", Color: "#0072a3"},
		{Name: "RHM", Type: "patient", Description: "Remote Home Monitoring enabled", Color: "#ff6600"},
		{Name: "HOCM", Type: "patient", Description: "Hypertrophic Obstuctive Cardiomyopathy", Color: "#dbfd8b"},
		{Name: "CHB", Type: "patient", Description: "Complete Heart Block", Color: "#dbfd8b"},
		{Name: "Stroke", Type: "patient", Description: "Stroke", Color: "#dbfd8b"},
		{Name: "Syncope", Type: "patient", Description: "Syncope", Color: "#dbfd8b"},
		{Name: "Low EF", Type: "patient", Description: "Low Ejection Fraction <40%", Color: "#dbfd8b"},
		{Name: "Approaching ERI", Type: "patient", Description: "Approaching ERI, Moninitor", Color: "#eb00b8"},
		// report tags
		{Name: "AF", Type: "report", Description: "Atrial Fibrillation detected", Color: "#00e439"},
		{Name: "VT", Type: "report", Description: "Ventricular Tachycardia detected", Color: "#5ed1ff"},
		{Name: "NSVT", Type: "report", Description: "Non Sustained Ventricular Tachycardia detected", Color: "#ff5edc"},
		{Name: "Bradycardia", Type: "report", Description: "Bradycardia detected"},
		{Name: "Tachycardia", Type: "report", Description: "Tachycardia detected"},
		{Name: "Pause", Type: "report", Description: "Pause detected"},
		{Name: "Inappropriate", Type: "report", Description: "Inappropriate therapy delivered"},
		{Name: "Low Battery", Type: "report", Description: "Low battery level", Color: "#ff5858"},
	}

	if err := db.Create(&seedTags).Error; err != nil {
		return err
	}

	// Patient
	p := models.Patient{
		MRN:       10001,
		FirstName: "John",
		LastName:  "Doe",
		DOB:       "1970-01-01",
		Gender:    "M",
		Email:     "john.doe@example.com",
		Phone:     "555-3000",
		Street:    "123 Main St",
		City:      "Metropolis",
		State:     "NY",
		Country:   "USA",
		Postal:    "10001",
	}
	if err := db.Create(&p).Error; err != nil {
		return err
	}

	// Link to doctors
	pd := []models.PatientDoctor{
		{PatientID: p.ID, DoctorID: doc1.ID, AddressID: &doc1.Addresses[0].ID, IsPrimary: true},
		{PatientID: p.ID, DoctorID: doc2.ID, AddressID: &doc2.Addresses[0].ID, IsPrimary: false},
	}
	if err := db.Create(&pd).Error; err != nil {
		return err
	}

	// Implanted device and leads
	now := time.Now().UTC()
	devs := []models.ImplantedDevice{
		{PatientID: p.ID, DeviceID: devices[94].ID, Serial: "MDT-AZR-0001", Status: "Active", ImplantedAt: now},
	}
	if err := db.Create(&devs).Error; err != nil {
		return err
	}

	// lds := []models.ImplantedLead{
	// 	{PatientID: p.ID, LeadID: leads[0].ID, Serial: "MDT-5076-RA-01", Chamber: "RA", Status: "Active", ImplantedAt: now},
	// 	{PatientID: p.ID, LeadID: leads[1].ID, Serial: "ABT-7122Q-RV-01", Chamber: "RV", Status: "Active", ImplantedAt: now},
	// }
	// if err := db.Create(&lds).Error; err != nil {
	// 	return err
	// }

	// Patient 2
	p2 := models.Patient{
		MRN:       10002,
		FirstName: "Jane",
		LastName:  "Smith",
		DOB:       "1965-05-15",
		Gender:    "F",
		Email:     "jane.smith@example.com",
		Phone:     "555-3001",
		Street:    "456 Oak Avenue",
		City:      "Springfield",
		State:     "CA",
		Country:   "USA",
		Postal:    "90210",
	}
	if err := db.Create(&p2).Error; err != nil {
		return err
	}

	// Link patient 2 to doctors
	pd2 := []models.PatientDoctor{
		{PatientID: p2.ID, DoctorID: doc2.ID, AddressID: &doc2.Addresses[0].ID, IsPrimary: true},
		{PatientID: p2.ID, DoctorID: doc1.ID, AddressID: &doc1.Addresses[0].ID, IsPrimary: false},
	}
	if err := db.Create(&pd2).Error; err != nil {
		return err
	}

	// Patient 2 implanted devices and leads
	devs2 := []models.ImplantedDevice{
		{PatientID: p2.ID, DeviceID: devices[10].ID, Serial: "MDT-PREC-0002", Status: "Active", ImplantedAt: now.AddDate(0, -6, 0)},
	}
	if err := db.Create(&devs2).Error; err != nil {
		return err
	}

	lds2 := []models.ImplantedLead{
		{PatientID: p2.ID, LeadID: leads[2].ID, Serial: "MDT-4076-RA-02", Chamber: "RA", Status: "Active", ImplantedAt: now.AddDate(0, -6, 0)},
		{PatientID: p2.ID, LeadID: leads[3].ID, Serial: "MDT-4574-RV-02", Chamber: "RV", Status: "Active", ImplantedAt: now.AddDate(0, -6, 0)},
		{PatientID: p2.ID, LeadID: leads[4].ID, Serial: "MDT-6946-LV-02", Chamber: "LV", Status: "Active", ImplantedAt: now.AddDate(0, -6, 0)},
	}
	if err := db.Create(&lds2).Error; err != nil {
		return err
	}

	// Attach tags to patient 2
	if err := db.Model(&p2).Association("Tags").Append(&seedTags[0], &seedTags[3]); err != nil {
		return err
	}

	// Patient 3
	p3 := models.Patient{
		MRN:       10003,
		FirstName: "Robert",
		LastName:  "Johnson",
		DOB:       "1958-12-20",
		Gender:    "M",
		Email:     "robert.johnson@example.com",
		Phone:     "555-3002",
		Street:    "789 Pine Street",
		City:      "Riverside",
		State:     "TX",
		Country:   "USA",
		Postal:    "75001",
	}
	if err := db.Create(&p3).Error; err != nil {
		return err
	}

	// Link patient 3 to doctors
	pd3 := []models.PatientDoctor{
		{PatientID: p3.ID, DoctorID: doc1.ID, AddressID: &doc1.Addresses[0].ID, IsPrimary: true},
	}
	if err := db.Create(&pd3).Error; err != nil {
		return err
	}

	// Patient 3 implanted devices and leads
	devs3 := []models.ImplantedDevice{
		{PatientID: p3.ID, DeviceID: devices[68].ID, Serial: "ABT-ACC-0003", Status: "Active", ImplantedAt: now.AddDate(-1, 0, 0)},
	}
	if err := db.Create(&devs3).Error; err != nil {
		return err
	}

	lds3 := []models.ImplantedLead{
		{PatientID: p3.ID, LeadID: leads[11].ID, Serial: "ABT-2088TC-RA-03", Chamber: "RA", Status: "Active", ImplantedAt: now.AddDate(-1, 0, 0)},
		{PatientID: p3.ID, LeadID: leads[15].ID, Serial: "ABT-7122Q-RV-03", Chamber: "RV", Status: "Active", ImplantedAt: now.AddDate(-1, 0, 0)},
	}
	if err := db.Create(&lds3).Error; err != nil {
		return err
	}

	// Appointments
	johnClinicStart := now.AddDate(0, 0, 7).Truncate(time.Minute)
	johnClinicEnd := johnClinicStart.Add(45 * time.Minute)
	janeRemoteStart := now.AddDate(0, 0, 3).Add(10 * time.Hour).Truncate(time.Minute)
	janeRemoteEnd := janeRemoteStart.Add(30 * time.Minute)
	robertBatteryStart := now.AddDate(0, 1, 0).Add(9 * time.Hour).Truncate(time.Minute)
	robertBatteryEnd := robertBatteryStart.Add(time.Hour)
	appointments := []models.Appointment{
		{
			Title:       "Quarterly Device Check",
			Description: "In-clinic follow-up to review pacemaker diagnostics",
			Location:    "Clinic",
			Status:      models.AppointmentStatusScheduled,
			StartAt:     johnClinicStart,
			EndAt:       &johnClinicEnd,
			PatientID:   p.ID,
			CreatedByID: admin.ID,
		},
		{
			Title:       "Remote Transmission Review",
			Description: "Phone visit to discuss remote alert about AF burden",
			Location:    "Televisit",
			Status:      models.AppointmentStatusScheduled,
			StartAt:     janeRemoteStart,
			EndAt:       &janeRemoteEnd,
			PatientID:   p2.ID,
			CreatedByID: admin.ID,
		},
		{
			Title:       "Battery Replacement Planning",
			Description: "Prep visit to plan CRT-D generator change",
			Location:    "Clinic",
			Status:      models.AppointmentStatusScheduled,
			StartAt:     robertBatteryStart,
			EndAt:       &robertBatteryEnd,
			PatientID:   p3.ID,
			CreatedByID: admin.ID,
		},
	}
	if err := db.Create(&appointments).Error; err != nil {
		return err
	}

	templates := []models.TaskTemplate{
		{
			Name:            "Follow-up Appointment",
			Description:     "Schedule a routine follow-up appointment",
			Title:           "Schedule Follow-up Appointment",
			TaskDescription: "Contact patient to schedule their next follow-up appointment. Review previous visit notes and ensure all necessary tests are completed.",
			Priority:        models.TaskPriorityMedium,
			DaysUntilDue:    pointer(7),
		},
		{
			Name:            "Device Check Review",
			Description:     "Review device interrogation results",
			Title:           "Review Device Interrogation",
			TaskDescription: "Analyze device data from recent interrogation. Check battery status, lead impedances, and arrhythmia episodes. Document findings.",
			Priority:        models.TaskPriorityHigh,
			DaysUntilDue:    pointer(2),
		},
		{
			Name:            "Battery Replacement Planning",
			Description:     "Plan for upcoming device battery replacement",
			Title:           "Plan Battery Replacement",
			TaskDescription: "Device approaching ERI. Schedule pre-operative assessment, coordinate with surgical team, and arrange patient education session.",
			Priority:        models.TaskPriorityUrgent,
			DaysUntilDue:    pointer(14),
		},
		{
			Name:            "Radiology Results Review",
			Description:     "Review and follow up on radiology results",
			Title:           "Review Radiology Results",
			TaskDescription: "Review recent radiology results. Check for any abnormalities that require intervention. Update medication if needed.",
			Priority:        models.TaskPriorityMedium,
			DaysUntilDue:    pointer(3),
		},
		{
			Name:            "Patient Education Call",
			Description:     "Educational call for new device patients",
			Title:           "Patient Education Follow-up",
			TaskDescription: "Call patient to review device care instructions, answer questions, and ensure they understand warning signs to watch for.",
			Priority:        models.TaskPriorityLow,
			DaysUntilDue:    pointer(7),
		},
		{
			Name:            "Patient Follow Up Call",
			Description:     "Follow up call for patients",
			Title:           "Patient Follow-up",
			TaskDescription: "Call patient to inform them about their remote transmission and address any concerns.",
			Priority:        models.TaskPriorityLow,
			DaysUntilDue:    pointer(7),
		},
	}

	for _, template := range templates {
		db.FirstOrCreate(&template, models.TaskTemplate{Name: template.Name})
	}

	// Seed SavedSearchFilters
	savedFilters := []models.SavedSearchFilter{
		{
			UserID:      admin.Username,
			Name:        "Medtronic Pacemaker Patients",
			Description: "All patients with Medtronic pacemakers",
			Filters: models.JSON{
				"deviceManufacturer": "Medtronic",
				"fuzzyMatch":         true,
				"booleanOperator":    "AND",
			},
			IsDefault: true,
		},
		{
			UserID:      admin.Username,
			Name:        "Dr. Smith's Patients",
			Description: "Patients assigned to Dr. Alice Smith",
			Filters: models.JSON{
				"doctorName":      "Dr. Alice Smith",
				"fuzzyMatch":      true,
				"booleanOperator": "AND",
			},
			IsDefault: false,
		},
		{
			UserID:      demoUser.Username,
			Name:        "CRT-D Patients",
			Description: "Patients with CRT-D devices",
			Filters: models.JSON{
				"deviceName":      "CRT-D",
				"fuzzyMatch":      true,
				"booleanOperator": "AND",
			},
			IsDefault: false,
		},
	}

	for _, filter := range savedFilters {
		if err := db.Create(&filter).Error; err != nil {
			return err
		}
	}

	// Seed SearchHistory
	searchHistories := []models.SearchHistory{
		{
			UserID: admin.Username,
			Query:  "John Doe",
			Filters: models.JSON{
				"firstName":       "John",
				"lastName":        "Doe",
				"fuzzyMatch":      true,
				"booleanOperator": "AND",
			},
			Results: 1,
		},
		{
			UserID: admin.Username,
			Query:  "Jane Smith",
			Filters: models.JSON{
				"firstName":       "Jane",
				"lastName":        "Smith",
				"fuzzyMatch":      true,
				"booleanOperator": "AND",
			},
			Results: 1,
		},
		{
			UserID: admin.Username,
			Query:  "Medtronic devices",
			Filters: models.JSON{
				"deviceManufacturer": "Medtronic",
				"fuzzyMatch":         true,
				"booleanOperator":    "AND",
			},
			Results: 2,
		},
		{
			UserID: demoUser.Username,
			Query:  "Robert Johnson",
			Filters: models.JSON{
				"firstName":       "Robert",
				"lastName":        "Johnson",
				"fuzzyMatch":      true,
				"booleanOperator": "AND",
			},
			Results: 1,
		},
	}

	for _, history := range searchHistories {
		if err := db.Create(&history).Error; err != nil {
			return err
		}
	}

	// Seed Patient Notes
	patientNotes := []models.PatientNote{
		// Notes for Patient 1 (John Doe)
		{
			PatientID: p.ID,
			UserID:    admin.ID,
			Content:   "Patient reports feeling well since last visit. Device interrogation shows normal parameters. Battery voltage stable at 2.8V. No arrhythmias detected in the last 3 months.",
		},
		{
			PatientID: p.ID,
			UserID:    demoUser.ID,
			Content:   "Follow-up call completed. Patient confirmed compliance with medications. Scheduled next in-office visit for 6 months from now.",
		},
		{
			PatientID: p.ID,
			UserID:    admin.ID,
			Content:   "Remote monitoring alert received - 3 episodes of VT detected last week. Patient asymptomatic. Will review in detail at next appointment.",
		},
		// Notes for Patient 2 (Jane Smith)
		{
			PatientID: p2.ID,
			UserID:    admin.ID,
			Content:   "CRT-P device functioning optimally. Patient showing significant improvement in heart failure symptoms since implant 6 months ago. LVEF improved from 25% to 35%.",
		},
		{
			PatientID: p2.ID,
			UserID:    demoUser.ID,
			Content:   "Patient called regarding lead impedance alert. Reviewed remote data - lead values within normal range. False alert likely due to body position during transmission. Reassured patient.",
		},
		{
			PatientID: p2.ID,
			UserID:    admin.ID,
			Content:   "Adjusted AV delay from 120ms to 150ms to optimize biventricular pacing. Patient to return in 2 weeks for echo to assess hemodynamic changes.",
		},
		{
			PatientID: p2.ID,
			UserID:    demoUser.ID,
			Content:   "Medication reconciliation completed. Added spironolactone 25mg daily per cardiology recommendation. Updated medication list in chart.",
		},
		// Notes for Patient 3 (Robert Johnson)
		{
			PatientID: p3.ID,
			UserID:    admin.ID,
			Content:   "New patient evaluation completed. History of ischemic cardiomyopathy with EF 30%. Recommended ICD implantation for primary prevention. Patient agrees to proceed.",
		},
		{
			PatientID: p3.ID,
			UserID:    demoUser.ID,
			Content:   "Pre-procedure education session conducted. Reviewed device function, expectations, and post-implant restrictions. Patient questions answered. Consent forms signed.",
		},
		{
			PatientID: p3.ID,
			UserID:    admin.ID,
			Content:   "ICD implant completed successfully. Single coil RV lead placed without complications. Device testing normal. Patient discharged home same day with standard post-op instructions.",
		},
	}

	for _, note := range patientNotes {
		if err := db.Create(&note).Error; err != nil {
			return err
		}
	}

	// Seed Billing codes
	billingCategories := []string{
		"in clinic pacemaker",
		"remote pacemaker",
		"call back pacemaker",
		"in clinic defibrillator",
		"remote defibrillator",
		"call back defibrillator",
		"in clinic loop recorder",
		"remote loop recorder",
		"call back loop recorder",
	}

	for _, cat := range billingCategories {
		// Just seed the categories with an empty code initially
		_, err := models.UpdateBillingCode(cat, "")
		if err != nil {
			log.Printf("Error seeding billing code for %s: %v", cat, err)
		}
	}

	log.Println("Seeding complete.")
	return nil
}
