# Troubleshooting Guide

### 1. Issue: "Prisma Client not initialized" errors
- **Cause**: The Prisma client was not generated after installing dependencies.
- **Solution**: Generate the client manually:
  ```bash
  npx prisma generate
  ```

### 2. Issue: SSE connection fails
- **Cause**: An intermediary proxy (e.g., Nginx) is caching responses instead of streaming them.
- **Solution**: Set Nginx headers:
  ```nginx
  proxy_set_header Connection '';
  proxy_http_version 1.1;
  chunked_transfer_encoding off;
  proxy_buffering off;
  ```

### 3. Issue: "Database is locked" errors
- **Cause**: Multiple write operations are running concurrently on the SQLite database file.
- **Solution**: Ensure you are not running multiple API servers pointing to the same SQLite file.
