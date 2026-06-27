# Installation Guide

## Local Installation

1. Clone the repository and navigate to the directory:
   ```bash
   git clone <repo-url>
   cd smart-toll-dashboard
   ```

2. Install all dependencies:
   ```bash
   npm run install:all
   ```
   *This command installs package dependencies for both the frontend and backend modules.*

3. Initialize the database and run migrations:
   ```bash
   npm run db:init
   ```
   *This generates the local SQLite database and seeds default toll rate matrices.*

4. Run the development servers:
   ```bash
   npm run dev
   ```
   - Frontend Dashboard: `http://localhost:5173`
   - Backend API: `http://localhost:5000`
