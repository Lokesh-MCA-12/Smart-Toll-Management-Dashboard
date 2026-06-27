# Project Structure

```
smart-toll-dashboard/
├── Excel to Python Hash Writer/   # Utility for legacy spreadsheet parsing
│   ├── GeneratedAcronym.py
│   ├── GeneratedListOfPrice.py
│   └── Read me.md
├── Java for reference/            # Legacy desktop Swing source files
│   ├── main.java
│   └── Class2.java
├── Source Code/                   # Modern Web Application
│   ├── backend/                   # Express & Prisma API Server
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # SQLite database schema
│   │   │   └── seed.ts             # Data parser and seeder
│   │   ├── src/
│   │   │   └── server.ts           # Express server and endpoints
│   │   └── tsconfig.json
│   └── frontend/                  # React & Vite client app
│       ├── src/
│       │   ├── components/
│       │   │   └── GateSimulator.tsx # RFID lane simulation UI
│       │   ├── App.tsx             # Main dashboard shell
│       │   └── index.css           # Global custom styling
│       ├── vite.config.ts
│       └── package.json
├── package.json                   # Monorepo command workspace
└── README.md
```

## Major Directories & Responsibilities
- **Source Code/backend**: Manages database queries, transaction processing, and SSE telemetry.
- **Source Code/frontend**: Renders the lane simulation UI and analytical charts.
- **Excel to Python Hash Writer**: Parses legacy Excel matrices into Python hashes.
- **Java for reference**: Legacy desktop code saved for reference.
