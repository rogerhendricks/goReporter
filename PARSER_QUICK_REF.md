# Backend Parser - Quick Reference

## Endpoint
```
POST /api/parser/file
```

## Supported Files
- ✅ `.xml` - Biotronik IEEE 11073 Export
- ✅ `.log` - Abbott interrogation files  
- ✅ `.bnk` - Boston Scientific files
- ⚠️  `.pdf` - Partial (use frontend or extract XML)

## Test Command
```bash
./test-parser.sh
```

## API Example
```bash
curl -X POST http://localhost:8080/api/parser/file \
  -F "file=@myfile.xml"
```

## Frontend Integration

### Simple (Backend Only)
```typescript
import { parseFileBackend } from '@/lib/api';

const data = await parseFileBackend(file);
```

### Hybrid (Frontend + Backend Fallback)
```typescript
try {
  const data = await parseFileFrontend(file);
} catch {
  const data = await parseFileBackend(file);
}
```

## File Locations
- **Parser Code**: `internal/handlers/parser.go`
- **Model**: `internal/models/parsed_data.go`
- **Route**: `internal/router/router.go` (line 90)
- **Examples**: `examples/*.{xml,log,bnk}`

## Documentation
- **PARSER_SUMMARY.md** - This summary
- **PARSER_BACKEND.md** - Technical details
- **MIGRATION_GUIDE.md** - How to integrate

## Migration Options

| Option | Frontend Bundle | Parse Speed | Server Load | Recommended For |
|--------|----------------|-------------|-------------|-----------------|
| Frontend Only | Large | Fast | None | Current setup |
| Backend Only | Small | Medium | High | New projects |
| Hybrid | Medium | Fast* | Low | Best of both worlds |

*Uses frontend primarily, backend as fallback

## Status
✅ Production Ready  
✅ Tested  
✅ Documented  
⚠️  PDF support incomplete
