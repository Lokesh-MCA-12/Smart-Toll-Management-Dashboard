-- CreateTable
CREATE TABLE "TollPlaza" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "acronym" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "TollRate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entryPlaza" TEXT NOT NULL,
    "exitPlaza" TEXT NOT NULL,
    "rateClass1" REAL NOT NULL,
    "rateClass2" REAL NOT NULL,
    "rateClass3" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "VehicleAccount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rfidTag" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "vehicleClass" INTEGER NOT NULL,
    "balance" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rfidTag" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "vehicleClass" INTEGER NOT NULL,
    "entryPlaza" TEXT NOT NULL,
    "exitPlaza" TEXT NOT NULL,
    "chargedAmount" REAL NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TollPlaza_name_key" ON "TollPlaza"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TollPlaza_acronym_key" ON "TollPlaza"("acronym");

-- CreateIndex
CREATE UNIQUE INDEX "TollRate_entryPlaza_exitPlaza_key" ON "TollRate"("entryPlaza", "exitPlaza");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleAccount_rfidTag_key" ON "VehicleAccount"("rfidTag");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleAccount_licensePlate_key" ON "VehicleAccount"("licensePlate");
