# Database Schema Documentation

## Database Type
SQLite (managed via Prisma ORM)

## Schema Tables

### 1. `TollPlaza`
- `id`: Int (Primary Key, Auto-Increment)
- `name`: String (Unique)
- `acronym`: String (Unique)
- `sequence`: Int

### 2. `TollRate`
- `id`: Int (Primary Key, Auto-Increment)
- `entryPlaza`: String
- `exitPlaza`: String
- `rateClass1`: Float
- `rateClass2`: Float
- `rateClass3`: Float

### 3. `VehicleAccount`
- `id`: Int (Primary Key, Auto-Increment)
- `rfidTag`: String (Unique)
- `ownerName`: String
- `licensePlate`: String (Unique)
- `vehicleClass`: Int (1, 2, or 3)
- `balance`: Float

### 4. `Transaction`
- `id`: Int (Primary Key, Auto-Increment)
- `rfidTag`: String
- `licensePlate`: String
- `vehicleClass`: Int
- `entryPlaza`: String
- `exitPlaza`: String
- `chargedAmount`: Float
- `timestamp`: DateTime
- `status`: String (`COMPLETED`, `INSUFFICIENT_FUNDS`, `FAILED`)
