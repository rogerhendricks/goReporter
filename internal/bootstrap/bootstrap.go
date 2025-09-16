package bootstrap

import (
	"log"
	"os"
	"time"

	"gorm.io/gorm"

	"github.com/rogerhendricks/goReporter/internal/config"
	"github.com/rogerhendricks/goReporter/internal/models"
)

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
		&models.Medication{},
		&models.PatientDoctor{},
		&models.ImplantedDevice{},
		&models.ImplantedLead{},
		&models.Report{},
	)
}

func shouldSeed(db *gorm.DB) bool {
	var count int64
	if err := db.Model(&models.User{}).Count(&count).Error; err != nil {
		return false
	}
	return count == 0
}

func seed(db *gorm.DB) error {
	log.Println("Seeding database...")

	// Users
	adminPass, _ := models.HashPassword("ChangeMe123!")
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

	userPass, _ := models.HashPassword("UserPass123!")
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
	}
	if err := db.Create(&devices).Error; err != nil {
		return err
	}

	// Leads
	leads := []models.Lead{
		// Medtronic
		{Name: "CapSure Sense 4074", Manufacturer: "Medtronic", LeadModel: "4074", IsMri: true, Type: "IS1", Polarity: "Bipolar"},
		{Name: "CapSureFix Sense 4574", Manufacturer: "Medtronic", LeadModel: "4574", IsMri: true, Type: "IS1", Polarity: "Bipolar"},
		{Name: "CapSureFix Novus 5076", Manufacturer: "Medtronic", LeadModel: "5076", IsMri: true, Type: "IS1", Polarity: "Bipolar"},
		{Name: "CapSureFix Novus 4076", Manufacturer: "Medtronic", LeadModel: "4076", IsMri: true, Type: "IS1", Polarity: "Bipolar"},
		{Name: "Sprint Quatro 6946", Manufacturer: "Medtronic", LeadModel: "6946", IsMri: true, Type: "DF4", Polarity: "Bipolar"},
		{Name: "Sprint Quatro 6947", Manufacturer: "Medtronic", LeadModel: "6947", IsMri: true, Type: "DF4", Polarity: "Bipolar"},
		{Name: "Sprint Quatro 6935", Manufacturer: "Medtronic", LeadModel: "6935", IsMri: true, Type: "DF4", Polarity: "Bipolar"},
		{Name: "Attain Performa S", Manufacturer: "Medtronic", LeadModel: "4798", IsMri: true, Type: "DF4", Polarity: "Bipolar"},
		{Name: "Attain Performa S", Manufacturer: "Medtronic", LeadModel: "4598", IsMri: true, Type: "DF4", Polarity: "Bipolar"},
		{Name: "Attain Performa Straight", Manufacturer: "Medtronic", LeadModel: "4398", IsMri: true, Type: "DF4", Polarity: "Bipolar"},
		{Name: "Attain Performa", Manufacturer: "Medtronic", LeadModel: "4298", IsMri: true, Type: "DF4", Polarity: "Bipolar"},

		// Abbott
		{Name: "Durata 7122Q", Manufacturer: "Abbott", LeadModel: "7122Q", IsMri: true, Type: "RV", Polarity: "Bipolar"},
		// Boston Sceintific
		{Name: "Acuity X4", Manufacturer: "Boston Scientific", LeadModel: "4678", IsMri: true, Type: "LV", Polarity: "Quadripolar"},
		{Name: "Acuity X4", Manufacturer: "Boston Scientific", LeadModel: "4677", IsMri: true, Type: "LV", Polarity: "Quadripolar"},
		{Name: "Acuity X4", Manufacturer: "Boston Scientific", LeadModel: "4675", IsMri: true, Type: "LV", Polarity: "Quadripolar"},
		{Name: "Acuity X4", Manufacturer: "Boston Scientific", LeadModel: "4674", IsMri: true, Type: "LV", Polarity: "Quadripolar"},
		{Name: "Acuity X4", Manufacturer: "Boston Scientific", LeadModel: "4672", IsMri: true, Type: "LV", Polarity: "Quadripolar"},
		{Name: "Acuity X4", Manufacturer: "Boston Scientific", LeadModel: "4671", IsMri: true, Type: "LV", Polarity: "Quadripolar"},
		{Name: "Reliant 4-Front", Manufacturer: "Boston Scientific", LeadModel: "0636", IsMri: true, Type: "RV", Polarity: "Bipolar"},
		{Name: "Reliant 4-Front", Manufacturer: "Boston Scientific", LeadModel: "0650", IsMri: true, Type: "RV", Polarity: "Bipolar"},
		{Name: "Reliant 4-Front", Manufacturer: "Boston Scientific", LeadModel: "0651", IsMri: true, Type: "RV", Polarity: "Bipolar"},
		{Name: "Reliant 4-Front", Manufacturer: "Boston Scientific", LeadModel: "0652", IsMri: true, Type: "RV", Polarity: "Bipolar"},
		{Name: "Reliant 4-Front", Manufacturer: "Boston Scientific", LeadModel: "0653", IsMri: true, Type: "RV", Polarity: "Bipolar"},
		{Name: "Reliant 4-Front", Manufacturer: "Boston Scientific", LeadModel: "0654", IsMri: true, Type: "RV", Polarity: "Bipolar"},
		{Name: "Reliant 4-Front", Manufacturer: "Boston Scientific", LeadModel: "0655", IsMri: true, Type: "RV", Polarity: "Bipolar"},
		{Name: "Reliant 4-Front", Manufacturer: "Boston Scientific", LeadModel: "0657", IsMri: true, Type: "RV", Polarity: "Bipolar"},
		{Name: "Reliant 4-Front", Manufacturer: "Boston Scientific", LeadModel: "0658", IsMri: true, Type: "RV", Polarity: "Bipolar"},
		{Name: "Reliant 4-Front", Manufacturer: "Boston Scientific", LeadModel: "0662", IsMri: true, Type: "RV", Polarity: "Bipolar"},
		{Name: "Ingevity+", Manufacturer: "Boston Scientific", LeadModel: "7840", IsMri: true, Type: "RA", Polarity: "Bipolar"},
		{Name: "Ingevity+", Manufacturer: "Boston Scientific", LeadModel: "7841", IsMri: true, Type: "RA", Polarity: "Bipolar"},
		{Name: "Ingevity+", Manufacturer: "Boston Scientific", LeadModel: "7842", IsMri: true, Type: "RA", Polarity: "Bipolar"},
		{Name: "Ingevity MRI", Manufacturer: "Boston Scientific", LeadModel: "7735", IsMri: true, Type: "RA", Polarity: "Bipolar"},
		{Name: "Ingevity MRI", Manufacturer: "Boston Scientific", LeadModel: "7736", IsMri: true, Type: "RA", Polarity: "Bipolar"},
		{Name: "Ingevity MRI", Manufacturer: "Boston Scientific", LeadModel: "7740", IsMri: true, Type: "RA", Polarity: "Bipolar"},
		{Name: "Ingevity MRI", Manufacturer: "Boston Scientific", LeadModel: "7741", IsMri: true, Type: "RA", Polarity: "Bipolar"},
		{Name: "Ingevity MRI", Manufacturer: "Boston Scientific", LeadModel: "7742", IsMri: true, Type: "RA", Polarity: "Bipolar"},
	}
	if err := db.Create(&leads).Error; err != nil {
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
		{PatientID: p.ID, DeviceID: devices[0].ID, Serial: "MDT-AZR-0001", Status: "Active", ImplantedAt: now},
	}
	if err := db.Create(&devs).Error; err != nil {
		return err
	}

	lds := []models.ImplantedLead{
		{PatientID: p.ID, LeadID: leads[0].ID, Serial: "MDT-5076-RA-01", Chamber: "RA", Status: "Active", ImplantedAt: now},
		{PatientID: p.ID, LeadID: leads[1].ID, Serial: "ABT-7122Q-RV-01", Chamber: "RV", Status: "Active", ImplantedAt: now},
	}
	if err := db.Create(&lds).Error; err != nil {
		return err
	}

	log.Println("Seeding complete.")
	return nil
}
