# Migration Guide: Frontend to Backend Parsing

This guide explains how to migrate from frontend file parsing to backend file parsing.

## Current Architecture (Frontend Parsing)

```
User uploads file → FileImporter component → fileParser.ts → Parses file → Fills form fields
```

**Advantages:**
- ✅ No server load for parsing
- ✅ Instant feedback
- ✅ Works offline
- ✅ Full PDF support with embedded XML extraction

**Disadvantages:**
- ❌ Large parsing libraries increase bundle size
- ❌ Parsing logic duplicated if needed server-side
- ❌ Browser compatibility issues possible
- ❌ Limited to browser capabilities

## New Architecture (Backend Parsing)

```
User uploads file → FileImporter component → API call to backend → Backend parses → Returns data → Fills form fields
```

**Advantages:**
- ✅ Smaller frontend bundle
- ✅ Consistent parsing across all clients
- ✅ Can store raw files and parsed data
- ✅ Server-side validation
- ✅ Can process large files more efficiently

**Disadvantages:**
- ❌ Requires server call (slight delay)
- ❌ Server load increases
- ❌ PDF embedded file extraction not yet complete

## Migration Options

### Option 1: Full Backend Migration

Replace frontend parsing completely with backend API calls.

#### Step 1: Update FileImporter Component

**Before:**
```typescript
// frontend/src/components/FileImporter.tsx
const { parseFile } = useFileImporter();

const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (file) {
    const data = await parseFile(file);
    onDataParsed(data);
  }
};
```

**After:**
```typescript
// frontend/src/components/FileImporter.tsx
import { parseFileBackend } from '@/lib/api';

const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (file) {
    setLoading(true);
    try {
      const data = await parseFileBackend(file);
      onDataParsed(data);
    } catch (error) {
      console.error('Failed to parse file:', error);
      toast.error('Failed to parse file');
    } finally {
      setLoading(false);
    }
  }
};
```

#### Step 2: Add API Function

```typescript
// frontend/src/lib/api.ts
export async function parseFileBackend(file: File): Promise<ParsedData> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post('/api/parser/file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}
```

#### Step 3: Remove Frontend Dependencies

```bash
cd frontend
npm uninstall pdf-lib fast-xml-parser
```

### Option 2: Hybrid Approach (Recommended)

Keep frontend parsing but add backend as fallback or alternative.

#### Benefits:
- Best of both worlds
- Instant parsing for supported formats
- Backend fallback for complex cases
- Gradual migration path

#### Implementation:

```typescript
// frontend/src/hooks/useFileParser.ts
export function useFileParser() {
  const [useBackend, setUseBackend] = useState(false);
  
  const parseFile = async (file: File): Promise<ParsedData> => {
    if (useBackend) {
      // Use backend parser
      return await parseFileBackend(file);
    }
    
    try {
      // Try frontend parser first
      return await parseFileFrontend(file);
    } catch (error) {
      console.warn('Frontend parsing failed, trying backend:', error);
      // Fallback to backend
      return await parseFileBackend(file);
    }
  };
  
  return { parseFile, useBackend, setUseBackend };
}
```

Add a toggle in your UI:

```typescript
<div className="flex items-center gap-2">
  <Switch
    checked={useBackend}
    onCheckedChange={setUseBackend}
  />
  <Label>Use server-side parsing</Label>
</div>
```

### Option 3: Backend Only for Reports

Use backend parsing only when creating/updating reports (persisting data), but keep frontend parsing for form preview.

```typescript
// When user uploads file for preview
const handleFilePreview = async (file: File) => {
  const data = await parseFileFrontend(file); // Fast, local
  setFormData(data);
};

// When user saves report
const handleSaveReport = async () => {
  const formData = new FormData();
  formData.append('file', selectedFile);
  
  // Backend parses and stores
  const response = await axios.post('/api/reports', formData);
  // Backend returns parsed data + report ID
};
```

## File Upload Flow Integration

### Current Report Creation Flow

```typescript
// frontend/src/pages/patients/CreateReport.tsx
const handleSubmit = async (data: ReportFormData) => {
  const formData = new FormData();
  
  // Add parsed data
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  
  // Add file
  if (selectedFile) {
    formData.append('file', selectedFile);
  }
  
  await axios.post('/api/reports', formData);
};
```

### Recommended: Backend Parsing + Storage

```typescript
const handleSubmit = async () => {
  const formData = new FormData();
  formData.append('file', selectedFile);
  
  // Backend will:
  // 1. Parse the file
  // 2. Save the file to disk
  // 3. Create report record with parsed data
  // 4. Return the created report
  
  const response = await axios.post('/api/reports', formData);
  
  // Form is automatically filled from backend-parsed data
  // User can review and modify before final save
};
```

## Backend Route Updates

### Update Report Handler

```go
// internal/handlers/report.go
func CreateReport(c *fiber.Ctx) error {
    // Get uploaded file
    file, err := c.FormFile("file")
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "No file uploaded",
        })
    }
    
    // Open file
    fileContent, err := file.Open()
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to open file",
        })
    }
    defer fileContent.Close()
    
    // Parse file based on extension
    ext := filepath.Ext(file.Filename)
    var parsedData *models.ParsedData
    
    switch ext {
    case ".xml":
        parsedData, err = parseXML(fileContent)
    case ".log":
        parsedData, err = parseLog(fileContent)
    case ".bnk":
        parsedData, err = parseBnk(fileContent)
    default:
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Unsupported file type",
        })
    }
    
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to parse file",
        })
    }
    
    // Save file to disk
    filePath := saveUploadedFile(file)
    
    // Create report with parsed data
    report := &models.Report{
        FilePath: filePath,
        // Map parsedData fields to report fields
        PatientName: parsedData.Name,
        DOB: parsedData.Dob,
        // ... etc
    }
    
    // Save to database
    db.Create(report)
    
    return c.JSON(report)
}
```

## Testing Strategy

### 1. Test Backend Parser

```bash
./test-parser.sh
```

### 2. Test Integration

```typescript
// Create integration test
describe('File Upload Integration', () => {
  it('should parse XML file via backend', async () => {
    const file = new File(['<xml>...</xml>'], 'test.xml');
    const result = await parseFileBackend(file);
    expect(result.name).toBeDefined();
  });
  
  it('should handle parsing errors', async () => {
    const file = new File(['invalid'], 'test.xml');
    await expect(parseFileBackend(file)).rejects.toThrow();
  });
});
```

### 3. Compare Results

Create a test that compares frontend and backend parsing results:

```typescript
const frontendResult = await parseFileFrontend(file);
const backendResult = await parseFileBackend(file);

// Compare key fields
expect(frontendResult.name).toBe(backendResult.name);
expect(frontendResult.dob).toBe(backendResult.dob);
// etc.
```

## Rollout Plan

### Phase 1: Add Backend Parser (✅ Complete)
- Implement parser in Go
- Create API endpoint
- Test with example files

### Phase 2: Add Hybrid Support
- Update FileImporter to support both modes
- Add toggle in UI
- Beta test with select users

### Phase 3: Gradual Migration
- Default to backend for new users
- Monitor performance and errors
- Collect user feedback

### Phase 4: Full Migration (Optional)
- Make backend default for all
- Remove frontend parsing code
- Update bundle size

## Performance Considerations

### Frontend Parsing
- **Initial Load**: ~500KB extra (pdf-lib, xml-parser)
- **Parse Time**: 100-500ms (instant for user)
- **Memory**: Uses browser memory

### Backend Parsing
- **Initial Load**: No extra load
- **Parse Time**: 200-800ms (includes network latency)
- **Memory**: Uses server memory
- **Network**: ~50-500KB upload

### Recommendation
- **Small files (<1MB)**: Frontend or backend work equally well
- **Large files (>1MB)**: Backend is better
- **PDF files**: Frontend (until backend PDF support is complete)
- **Mobile users**: Backend (smaller app size)

## Troubleshooting

### Common Issues

**Issue**: Backend returns 400 Bad Request
**Solution**: Check file extension is supported (.xml, .log, .bnk)

**Issue**: Parsing returns empty data
**Solution**: Check file format matches expected structure

**Issue**: Date formats differ
**Solution**: Backend converts to ISO 8601, frontend may use different format

**Issue**: PDF parsing not working
**Solution**: Extract XML from PDF manually, or use frontend parser

## Next Steps

1. ✅ Review the complete parser implementation
2. Choose migration strategy (full, hybrid, or reports-only)
3. Update frontend components accordingly
4. Test with real device files
5. Deploy backend changes
6. Monitor for errors
7. Iterate based on feedback

## Support

For questions or issues:
- Check `PARSER_BACKEND.md` for implementation details
- Run `./test-parser.sh` to verify backend works
- Compare with `frontend/src/utils/fileParser.ts` for reference
