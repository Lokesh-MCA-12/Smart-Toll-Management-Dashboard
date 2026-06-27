# Run and Operation Guide

## Starting Servers

### Concurrent Launch (Recommended)
Run the following command from the root directory:
```bash
npm run dev
```
This concurrently starts:
- The Vite frontend server on port `5173`.
- The Express backend server on port `5000`.

### Individual Launch
- **Backend API**:
  ```bash
  cd "Source Code/backend"
  npm run dev
  ```
- **Frontend App**:
  ```bash
  cd "Source Code/frontend"
  npm run dev
  ```

## Stopping Servers
Press `Ctrl + C` in the terminal to stop active servers.

## Resetting the Database
To clear transactions and restore default balances, run:
```bash
npm run db:init
```
