# Deployment Guide

## Production Checklist
- [ ] Configure database backups for the SQLite database file.
- [ ] Secure the `/api/rates/update` endpoint using authentication checks.
- [ ] Install SSL certificates on Nginx.

## Deploying to a Node Server (LAMP/LEMP)
1. Install Node.js:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. Copy the project folder to the server:
   ```bash
   cp -r smart-toll-dashboard /var/www/
   ```

3. Build and package the application:
   ```bash
   npm run build
   ```

4. Run the API service using PM2:
   ```bash
   pm2 start "npm run dev" --name "toll-dashboard"
   ```
