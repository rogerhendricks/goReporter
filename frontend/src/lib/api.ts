const API_BASE_URL = import.meta.env.DEV 
  ? 'api'  // Development: explicit backend URL
  : '/api'                       // Production: relative URL (same server)

export { API_BASE_URL }