# Build both frontend and backend
chmod +x scripts/build.sh
./scripts/build.sh

# Run the single binary
./bin/server


On my home page I would like to have donut graphs. One showing a breakdown on manufacturer of all of the patients implanted devices so I can tell which company has the most implants and able to compare them. I would also like to have a donut graph breaking down how types of implanted devices IE ImplantedDevice.Device.Type. I would also like to have a table showing how many reports are waiting to be completed Report.IsCompleted, Report.ReportStatus