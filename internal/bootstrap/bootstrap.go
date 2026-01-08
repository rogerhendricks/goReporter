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
		&models.PatientConsent{},
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

	// Devices
	devices := []models.Device{
		// Medtronic
		{Name: "Azure MRI SureScan", Manufacturer: "Medtronic", DevModel: "W1SR01", IsMri: true, Type: "Pacemaker"},
		{Name: "Azure MRI SureScan", Manufacturer: "Medtronic", DevModel: "W2SR01", IsMri: true, Type: "Pacemaker"},
		{Name: "Azure MRI SureScan", Manufacturer: "Medtronic", DevModel: "W3SR01", IsMri: true, Type: "Pacemaker"},
		{Name: "Azure MRI SureScan", Manufacturer: "Medtronic", DevModel: "W1DR01", IsMri: true, Type: "Pacemaker"},
		{Name: "Azure MRI SureScan", Manufacturer: "Medtronic", DevModel: "W2DR01", IsMri: true, Type: "Pacemaker"},
		{Name: "Azure MRI SureScan", Manufacturer: "Medtronic", DevModel: "W3DR01", IsMri: true, Type: "Pacemaker"},
		{Name: "Advisa DR MRI SureScan", Manufacturer: "Medtronic", DevModel: "A2DR01", IsMri: true, Type: "Pacemaker"},
		{Name: "Advisa DR MRI SureScan", Manufacturer: "Medtronic", DevModel: "A2DR01", IsMri: true, Type: "Pacemaker"},
		{Name: "Advisa DR MRI SureScan", Manufacturer: "Medtronic", DevModel: "A3DR01", IsMri: true, Type: "Pacemaker"},
		{Name: "Advisa SR MRI SureScan", Manufacturer: "Medtronic", DevModel: "A3SR01", IsMri: true, Type: "Pacemaker"},
		{Name: "Precepta CRT-P", Manufacturer: "Medtronic", DevModel: "W1TR04", IsMri: true, Type: "Pacemaker"},
		{Name: "Claria MRI CRT-D SureScan", Manufacturer: "Medtronic", DevModel: "DTMA1D1", IsMri: true, Type: "Defibrillator"},
		{Name: "Claria MRI CRT-D SureScan", Manufacturer: "Medtronic", DevModel: "DTMA1D4", IsMri: true, Type: "Defibrillator"},
		{Name: "Claria MRI CRT-D SureScan", Manufacturer: "Medtronic", DevModel: "DTMA1Q1", IsMri: true, Type: "Defibrillator"},
		{Name: "Claria MRI CRT-D SureScan", Manufacturer: "Medtronic", DevModel: "DTMA1QQ", IsMri: true, Type: "Defibrillator"},
		{Name: "Claria MRI CRT-D SureScan", Manufacturer: "Medtronic", DevModel: "DTMA2D1", IsMri: true, Type: "Defibrillator"},
		{Name: "Claria MRI CRT-D SureScan", Manufacturer: "Medtronic", DevModel: "DTMA2D4", IsMri: true, Type: "Defibrillator"},
		{Name: "Claria MRI CRT-D SureScan", Manufacturer: "Medtronic", DevModel: "DTMA2Q1", IsMri: true, Type: "Defibrillator"},
		{Name: "Claria MRI CRT-D SureScan", Manufacturer: "Medtronic", DevModel: "DTMA2QQ", IsMri: true, Type: "Defibrillator"},
		{Name: "Cobalt DR ICD MRI SureScan", Manufacturer: "Medtronic", DevModel: "DDPB3D1", IsMri: true, Type: "Defibrillator"},
		{Name: "Cobalt DR ICD MRI SureScan", Manufacturer: "Medtronic", DevModel: "DDPB3D4", IsMri: true, Type: "Defibrillator"},
		{Name: "Cobalt VR ICD MRI SureScan", Manufacturer: "Medtronic", DevModel: "DVPB3D1", IsMri: true, Type: "Defibrillator"},
		{Name: "Cobalt VR ICD MRI SureScan", Manufacturer: "Medtronic", DevModel: "DVPB3D4", IsMri: true, Type: "Defibrillator"},
		{Name: "Cobalt XT DR ICD MRI SureScan", Manufacturer: "Medtronic", DevModel: "DDPA2D1", IsMri: true, Type: "Defibrillator"},
		{Name: "Cobalt XT DR ICD MRI SureScan", Manufacturer: "Medtronic", DevModel: "DDPA2D4", IsMri: true, Type: "Defibrillator"},
		{Name: "Cobalt XT HF CRT-D MRI SureScan", Manufacturer: "Medtronic", DevModel: "DTPA2D1", IsMri: true, Type: "Defibrillator"},
		{Name: "Cobalt XT HF CRT-D MRI SureScan", Manufacturer: "Medtronic", DevModel: "DTPA2D4", IsMri: true, Type: "Defibrillator"},
		{Name: "Cobalt XT HF CRT-D MRI SureScan", Manufacturer: "Medtronic", DevModel: "DTPA2Q1", IsMri: true, Type: "Defibrillator"},
		{Name: "Cobalt HF CRT-D MRI SureScan", Manufacturer: "Medtronic", DevModel: "DTPB2D1", IsMri: true, Type: "Defibrillator"},
		{Name: "Cobalt HF CRT-D MRI SureScan", Manufacturer: "Medtronic", DevModel: "DTPB2D4", IsMri: true, Type: "Defibrillator"},
		{Name: "Cobalt HF CRT-D MRI SureScan", Manufacturer: "Medtronic", DevModel: "DTPB2Q1", IsMri: true, Type: "Defibrillator"},
		{Name: "Cobalt HF CRT-D MRI SureScan", Manufacturer: "Medtronic", DevModel: "DTPB2QQ", IsMri: true, Type: "Defibrillator"},
		{Name: "Reveal LINQ", Manufacturer: "Medtronic", DevModel: "LNQ11", IsMri: true, Type: "ICM"},
		{Name: "Reveal LINQ II", Manufacturer: "Medtronic", DevModel: "LNQ22", IsMri: true, Type: "ICM"},
		// Biotronik
		{Name: "Entovis DR-T", Manufacturer: "Biotronik", DevModel: "ENTOVDRT", IsMri: true, Type: "Pacemaker"},
		{Name: "Entovis SR-T", Manufacturer: "Biotronik", DevModel: "ENTOVSRT", IsMri: true, Type: "Pacemaker"},
		{Name: "Edora 8 DR-T", Manufacturer: "Biotronik", DevModel: "EDO8DRT", IsMri: true, Type: "Pacemaker"},
		{Name: "Edora 8 SR-T", Manufacturer: "Biotronik", DevModel: "EDO8SRT", IsMri: true, Type: "Pacemaker"},
		{Name: "Evia DR-T", Manufacturer: "Biotronik", DevModel: "EVIADRT", IsMri: true, Type: "Pacemaker"},
		{Name: "Etrinsa 8 DR-T", Manufacturer: "Biotronik", DevModel: "ETR8DRT", IsMri: true, Type: "Pacemaker"},
		{Name: "Itrevia 7 VR-T DX", Manufacturer: "Biotronik", DevModel: "ITR7VRTDX", IsMri: true, Type: "Defibrillator"},
		{Name: "Itrevia 7 VR-T", Manufacturer: "Biotronik", DevModel: "ITR7VRT", IsMri: true, Type: "Defibrillator"},
		{Name: "Ilesto 7 DR-T", Manufacturer: "Biotronik", DevModel: "IL7DRT", IsMri: true, Type: "Defibrillator"},
		{Name: "Ilesto 7 VR-T DX", Manufacturer: "Biotronik", DevModel: "IL7VRTDX", IsMri: true, Type: "Defibrillator"},
		{Name: "Itrevia 7 VR-T", Manufacturer: "Biotronik", DevModel: "ITR7VRT", IsMri: true, Type: "Defibrillator"},
		{Name: "Lumax 740 DR-T", Manufacturer: "Biotronik", DevModel: "LU740DRT", IsMri: true, Type: "Defibrillator"},
		{Name: "Lumax 540 DR-T", Manufacturer: "Biotronik", DevModel: "LU540DRT", IsMri: true, Type: "Defibrillator"},
		{Name: "Intica Neo 7 VR-T", Manufacturer: "Biotronik", DevModel: "INTNEO7VRT", IsMri: true, Type: "Defibrillator"},
		{Name: "Intica Neo 7 DR-T", Manufacturer: "Biotronik", DevModel: "INTNEO7DRT", IsMri: true, Type: "Defibrillator"},
		{Name: "Rivacor 7 HF-T QP", Manufacturer: "Biotronik", DevModel: "RIV7HFTQP", IsMri: true, Type: "Defibrillator"},
		{Name: "Biomonitor II", Manufacturer: "Biotronik", DevModel: "BIOMONITORII", IsMri: true, Type: "ICM"},
		{Name: "Biomonitor IIIm", Manufacturer: "Biotronik", DevModel: "BIOMONITORIIIM", IsMri: true, Type: "ICM"},
		{Name: "Biomonitor IV", Manufacturer: "Biotronik", DevModel: "BIOMONITORIV", IsMri: true, Type: "ICM"},
		// Boston Scientific
		{Name: "Resonate", Manufacturer: "Boston Scientific", DevModel: "D432", IsMri: true, Type: "Defibrillator"},
		{Name: "Resonate", Manufacturer: "Boston Scientific", DevModel: "D433", IsMri: true, Type: "Defibrillator"},
		{Name: "Resonate X4", Manufacturer: "Boston Scientific", DevModel: "G447", IsMri: true, Type: "Defibrillator"},
		{Name: "Autogen", Manufacturer: "Boston Scientific", DevModel: "D174", IsMri: false, Type: "Defibrillator"},
		{Name: "Autogen", Manufacturer: "Boston Scientific", DevModel: "D175", IsMri: false, Type: "Defibrillator"},
		{Name: "Autogen", Manufacturer: "Boston Scientific", DevModel: "D176", IsMri: false, Type: "Defibrillator"},
		{Name: "Autogen", Manufacturer: "Boston Scientific", DevModel: "D177", IsMri: false, Type: "Defibrillator"},
		{Name: "Autogen", Manufacturer: "Boston Scientific", DevModel: "G172", IsMri: false, Type: "Defibrillator"},
		{Name: "Dynagen", Manufacturer: "Boston Scientific", DevModel: "D150", IsMri: true, Type: "Defibrillator"},
		{Name: "Dynagen", Manufacturer: "Boston Scientific", DevModel: "D152", IsMri: true, Type: "Defibrillator"},
		{Name: "Momentum", Manufacturer: "Boston Scientific", DevModel: "D120", IsMri: true, Type: "Defibrillator"},
		{Name: "Momentum", Manufacturer: "Boston Scientific", DevModel: "D121", IsMri: true, Type: "Defibrillator"},
		{Name: "Momentum", Manufacturer: "Boston Scientific", DevModel: "G138", IsMri: true, Type: "Defibrillator"},
		{Name: "Accolade", Manufacturer: "Boston Scientific", DevModel: "L310", IsMri: true, Type: "Pacemaker"},
		{Name: "Accolade", Manufacturer: "Boston Scientific", DevModel: "L311", IsMri: true, Type: "Pacemaker"},
		{Name: "Accolade", Manufacturer: "Boston Scientific", DevModel: "L331", IsMri: true, Type: "Pacemaker"},
		{Name: "Vitalio", Manufacturer: "Boston Scientific", DevModel: "K275", IsMri: true, Type: "Pacemaker"},
		{Name: "Vitalio", Manufacturer: "Boston Scientific", DevModel: "K277", IsMri: true, Type: "Pacemaker"},
		{Name: "Visionist X4", Manufacturer: "Boston Scientific", DevModel: "U228", IsMri: true, Type: "Pacemaker"},
		{Name: "Lux Dx", Manufacturer: "Boston Scientific", DevModel: "M301", IsMri: true, Type: "ICM"},
		{Name: "Lux Dx II", Manufacturer: "Boston Scientific", DevModel: "M302", IsMri: true, Type: "ICM"},
		{Name: "Lux Dx II+", Manufacturer: "Boston Scientific", DevModel: "M312", IsMri: true, Type: "ICM"},
		// Abbott
		{Name: "Assurity", Manufacturer: "Abbott", DevModel: "PM1272", IsMri: true, Type: "Pacemaker"},
		{Name: "Assurity", Manufacturer: "Abbott", DevModel: "PM2272", IsMri: true, Type: "Pacemaker"},
		{Name: "Accent", Manufacturer: "Abbott", DevModel: "PM1124", IsMri: true, Type: "Pacemaker"},
		{Name: "Accent", Manufacturer: "Abbott", DevModel: "PM1224", IsMri: true, Type: "Pacemaker"},
		{Name: "Accent", Manufacturer: "Abbott", DevModel: "PM2124", IsMri: true, Type: "Pacemaker"},
		{Name: "Accent", Manufacturer: "Abbott", DevModel: "PM2224", IsMri: true, Type: "Pacemaker"},
		{Name: "Aveir", Manufacturer: "Abbott", DevModel: "LSP112V", IsMri: true, Type: "Pacemaker"},
		{Name: "Quadra Allure", Manufacturer: "Abbott", DevModel: "PM3562", IsMri: true, Type: "Pacemaker"},
		{Name: "Quadra Allure", Manufacturer: "Abbott", DevModel: "PM3542", IsMri: true, Type: "Pacemaker"},
		{Name: "Quadra Assura", Manufacturer: "Abbott", DevModel: "CD3371-40Q", IsMri: true, Type: "Defibrillator"},
		{Name: "Quadra Assura", Manufacturer: "Abbott", DevModel: "CD3371-40QC", IsMri: true, Type: "Defibrillator"},
		{Name: "Quadra Assura", Manufacturer: "Abbott", DevModel: "CD3367-40Q", IsMri: true, Type: "Defibrillator"},
		{Name: "Quadra Assura", Manufacturer: "Abbott", DevModel: "CD3367-40QC", IsMri: true, Type: "Defibrillator"},
		{Name: "Neutrino", Manufacturer: "Abbott", DevModel: "CDDRA600Q", IsMri: true, Type: "Defibrillator"},
		{Name: "Neutrino", Manufacturer: "Abbott", DevModel: "CDHFA600Q", IsMri: true, Type: "Defibrillator"},
		{Name: "Neutrino", Manufacturer: "Abbott", DevModel: "CDVRA600Q", IsMri: true, Type: "Defibrillator"},
		{Name: "Gallant", Manufacturer: "Abbott", DevModel: "CDDRA500Q", IsMri: true, Type: "Defibrillator"},
		{Name: "Gallant", Manufacturer: "Abbott", DevModel: "CDHFA500Q", IsMri: true, Type: "Defibrillator"},
		{Name: "Gallant", Manufacturer: "Abbott", DevModel: "CDVRA500Q", IsMri: true, Type: "Defibrillator"},
		{Name: "Jot Dx", Manufacturer: "Abbott", DevModel: "4500", IsMri: true, Type: "ICM"},
		{Name: "Confirm Rx", Manufacturer: "Abbott", DevModel: "DM3500", IsMri: true, Type: "ICM"},
	}
	if err := db.Create(&devices).Error; err != nil {
		return err
	}

	// Leads
	leads := []models.Lead{
		// Medtronic
		{Name: "CapSure Sense 4074", Manufacturer: "Medtronic", LeadModel: "4074", IsMri: true, Connector: "IS1", Polarity: "Bipolar"},
		{Name: "CapSureFix Sense 4574", Manufacturer: "Medtronic", LeadModel: "4574", IsMri: true, Connector: "IS1", Polarity: "Bipolar"},
		{Name: "CapSureFix Novus 5076", Manufacturer: "Medtronic", LeadModel: "5076", IsMri: true, Connector: "IS1", Polarity: "Bipolar"},
		{Name: "CapSureFix Novus 4076", Manufacturer: "Medtronic", LeadModel: "4076", IsMri: true, Connector: "IS1", Polarity: "Bipolar"},
		{Name: "Sprint Quatro 6946", Manufacturer: "Medtronic", LeadModel: "6946", IsMri: true, Connector: "DF4", Polarity: "Bipolar"},
		{Name: "Sprint Quatro 6947", Manufacturer: "Medtronic", LeadModel: "6947", IsMri: true, Connector: "DF4", Polarity: "Bipolar"},
		{Name: "Sprint Quatro 6935", Manufacturer: "Medtronic", LeadModel: "6935", IsMri: true, Connector: "DF4", Polarity: "Bipolar"},
		{Name: "Attain Performa S", Manufacturer: "Medtronic", LeadModel: "4798", IsMri: true, Connector: "DF4", Polarity: "Bipolar"},
		{Name: "Attain Performa S", Manufacturer: "Medtronic", LeadModel: "4598", IsMri: true, Connector: "DF4", Polarity: "Bipolar"},
		{Name: "Attain Performa Straight", Manufacturer: "Medtronic", LeadModel: "4398", IsMri: true, Connector: "DF4", Polarity: "Bipolar"},
		{Name: "Attain Performa", Manufacturer: "Medtronic", LeadModel: "4298", IsMri: true, Connector: "DF4", Polarity: "Bipolar"},
		// Abbott
		{Name: "Tendril STS", Manufacturer: "Abbott", LeadModel: "2088TC-52", IsMri: true, Connector: "IS1", Polarity: "Bipolar"},
		{Name: "Tendril STS", Manufacturer: "Abbott", LeadModel: "2088TC-46", IsMri: true, Connector: "IS1", Polarity: "Bipolar"},
		{Name: "Tendril 2088TC", Manufacturer: "Abbott", LeadModel: "2088TC-52", IsMri: true, Connector: "IS1", Polarity: "Bipolar"},
		{Name: "Tendril 2088TC", Manufacturer: "Abbott", LeadModel: "2088TC-65", IsMri: true, Connector: "IS1", Polarity: "Bipolar"},
		{Name: "Durata 7122Q", Manufacturer: "Abbott", LeadModel: "7122Q-58", IsMri: true, Connector: "DF4", Polarity: "Bipolar"},
		{Name: "Durata 7122Q", Manufacturer: "Abbott", LeadModel: "7122Q-65", IsMri: true, Connector: "DF4", Polarity: "Bipolar"},
		{Name: "Durata 7120Q", Manufacturer: "Abbott", LeadModel: "7120Q-58", IsMri: true, Connector: "DF4", Polarity: "Bipolar"},
		{Name: "Durata 7120Q", Manufacturer: "Abbott", LeadModel: "7120Q-65", IsMri: true, Connector: "DF4", Polarity: "Bipolar"},
		// Biotronik
		{Name: "Solia S 60", Manufacturer: "Biotronik", LeadModel: "SOL60", IsMri: true, Connector: "IS1", Polarity: "Bipolar"},
		{Name: "Solia S 53", Manufacturer: "Biotronik", LeadModel: "SOL52", IsMri: true, Connector: "IS1", Polarity: "Bipolar"},
		{Name: "Pamira", Manufacturer: "Biotronik", LeadModel: "PAM", IsMri: true, Connector: "DF4", Polarity: "Bipolar"},
		{Name: "Plexa Pro MRI", Manufacturer: "Biotronik", LeadModel: "PLX", IsMri: true, Connector: "DF4", Polarity: "Bipolar"},
		// Boston Sceintific
		{Name: "Acuity X4", Manufacturer: "Boston Scientific", LeadModel: "4678", IsMri: true, Connector: "LV", Polarity: "Quadripolar"},
		{Name: "Acuity X4", Manufacturer: "Boston Scientific", LeadModel: "4677", IsMri: true, Connector: "LV", Polarity: "Quadripolar"},
		{Name: "Acuity X4", Manufacturer: "Boston Scientific", LeadModel: "4675", IsMri: true, Connector: "LV", Polarity: "Quadripolar"},
		{Name: "Acuity X4", Manufacturer: "Boston Scientific", LeadModel: "4674", IsMri: true, Connector: "LV", Polarity: "Quadripolar"},
		{Name: "Acuity X4", Manufacturer: "Boston Scientific", LeadModel: "4672", IsMri: true, Connector: "LV", Polarity: "Quadripolar"},
		{Name: "Acuity X4", Manufacturer: "Boston Scientific", LeadModel: "4671", IsMri: true, Connector: "LV", Polarity: "Quadripolar"},
		{Name: "Reliant 4-Front", Manufacturer: "Boston Scientific", LeadModel: "0636", IsMri: true, Connector: "RV", Polarity: "Bipolar"},
		{Name: "Reliant 4-Front", Manufacturer: "Boston Scientific", LeadModel: "0650", IsMri: true, Connector: "RV", Polarity: "Bipolar"},
		{Name: "Reliant 4-Front", Manufacturer: "Boston Scientific", LeadModel: "0651", IsMri: true, Connector: "RV", Polarity: "Bipolar"},
		{Name: "Reliant 4-Front", Manufacturer: "Boston Scientific", LeadModel: "0652", IsMri: true, Connector: "RV", Polarity: "Bipolar"},
		{Name: "Reliant 4-Front", Manufacturer: "Boston Scientific", LeadModel: "0653", IsMri: true, Connector: "RV", Polarity: "Bipolar"},
		{Name: "Reliant 4-Front", Manufacturer: "Boston Scientific", LeadModel: "0654", IsMri: true, Connector: "RV", Polarity: "Bipolar"},
		{Name: "Reliant 4-Front", Manufacturer: "Boston Scientific", LeadModel: "0655", IsMri: true, Connector: "RV", Polarity: "Bipolar"},
		{Name: "Reliant 4-Front", Manufacturer: "Boston Scientific", LeadModel: "0657", IsMri: true, Connector: "RV", Polarity: "Bipolar"},
		{Name: "Reliant 4-Front", Manufacturer: "Boston Scientific", LeadModel: "0658", IsMri: true, Connector: "RV", Polarity: "Bipolar"},
		{Name: "Reliant 4-Front", Manufacturer: "Boston Scientific", LeadModel: "0662", IsMri: true, Connector: "RV", Polarity: "Bipolar"},
		{Name: "Ingevity+", Manufacturer: "Boston Scientific", LeadModel: "7840", IsMri: true, Connector: "RA", Polarity: "Bipolar"},
		{Name: "Ingevity+", Manufacturer: "Boston Scientific", LeadModel: "7841", IsMri: true, Connector: "RA", Polarity: "Bipolar"},
		{Name: "Ingevity+", Manufacturer: "Boston Scientific", LeadModel: "7842", IsMri: true, Connector: "RA", Polarity: "Bipolar"},
		{Name: "Ingevity MRI", Manufacturer: "Boston Scientific", LeadModel: "7735", IsMri: true, Connector: "RA", Polarity: "Bipolar"},
		{Name: "Ingevity MRI", Manufacturer: "Boston Scientific", LeadModel: "7736", IsMri: true, Connector: "RA", Polarity: "Bipolar"},
		{Name: "Ingevity MRI", Manufacturer: "Boston Scientific", LeadModel: "7740", IsMri: true, Connector: "RA", Polarity: "Bipolar"},
		{Name: "Ingevity MRI", Manufacturer: "Boston Scientific", LeadModel: "7741", IsMri: true, Connector: "RA", Polarity: "Bipolar"},
		{Name: "Ingevity MRI", Manufacturer: "Boston Scientific", LeadModel: "7742", IsMri: true, Connector: "RA", Polarity: "Bipolar"},
	}
	if err := db.Create(&leads).Error; err != nil {
		return err
	}

	// Tags
	seedTags := []models.Tag{
		{Name: "Follow-up", Type: "patient", Description: "Patient requires follow-up", Color: "#0072a3"},
		{Name: "High Risk", Type: "patient", Description: "Higher clinical risk / needs closer monitoring", Color: "#eb00b8"},
		{Name: "Needs Scheduling", Type: "patient", Description: "Appointment or procedure needs scheduling"},
		{Name: "RHM", Type: "patient", Description: "Remote Home Monitoring enabled", Color: "#ff6600"},
		{Name: "AF", Type: "report", Description: "Atrial Fibrillation detected"},
		{Name: "VT", Type: "report", Description: "Ventricular Tachycardia detected"},
		{Name: "NSVT", Type: "report", Description: "Non Sustained Ventricular Tachycardia detected"},
		{Name: "Bradycardia", Type: "report", Description: "Bradycardia detected"},
		{Name: "Tachycardia", Type: "report", Description: "Tachycardia detected"},
		{Name: "Pause", Type: "report", Description: "Pause detected"},
		{Name: "Inappropriate", Type: "report", Description: "Inappropriate therapy delivered"},
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

	log.Println("Seeding complete.")
	return nil
}
