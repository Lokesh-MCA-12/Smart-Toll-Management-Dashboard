import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const plazaNames: Record<string, string> = {
  MIN: "Mindanao Avenue",
  VAL: "Valenzuela",
  MEY: "Meycauayan",
  MAR: "Marilao",
  BOC: "Bocaue",
  BAL: "Balagtas",
  TAB: "Tabang",
  STR: "Sta. Rita",
  RITA: "Sta. Rita",
  PUL: "Pulilan",
  SNM: "San Simon",
  SNF: "San Fernando",
  MXC: "Mexico",
  ANG: "Angeles",
  DAU: "Dau",
  INES: "Sta. Ines",
  TIPO: "Tipo / SFEX",
  DIN: "Dinalupihan",
  FLOR: "Floridablanca",
  PRC: "Porac",
  SCLARK: "Clark South",
  MAB: "Mabalacat (Mabiga)",
  NCLARK: "Clark North",
  DOL: "Dolores",
  CONC: "Concepcion",
  SMG: "San Miguel",
  TAR: "Tarlac",
  KAR: "Karilao",
  BWK: "Balintawak",
};

interface ParsedRate {
  entry: string;
  exit: string;
  rate: number;
}

function parseFile(filePath: string): ParsedRate[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: File not found at ${filePath}`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const results: ParsedRate[] = [];

  for (const line of lines) {
    // Matches hash.put("ENTRY-EXIT", value);
    const match = line.match(/hash\.put\("([^"-]+)-([^"-]+)",\s*([0-9\.]+)\);/);
    if (match) {
      results.push({
        entry: match[1].trim(),
        exit: match[2].trim(),
        rate: parseFloat(match[3])
      });
    }
  }
  return results;
}

async function main() {
  console.log("Starting database seed...");

  // Path to the legacy text files for hashes
  const basePath = path.join(__dirname, '..', '..', '..', 'Excel to Python Hash Writer', 'Text Files for Hashes');
  const class1Path = path.join(basePath, 'tbl_Class1.txt');
  const class2Path = path.join(basePath, 'tbl_Class2.txt');
  const class3Path = path.join(basePath, 'tbl_Class3.txt');

  const class1Rates = parseFile(class1Path);
  const class2Rates = parseFile(class2Path);
  const class3Rates = parseFile(class3Path);

  console.log(`Parsed ${class1Rates.length} Class 1 rates`);
  console.log(`Parsed ${class2Rates.length} Class 2 rates`);
  console.log(`Parsed ${class3Rates.length} Class 3 rates`);

  // Group rates by entry-exit pair
  const ratesMap: Record<string, { entry: string; exit: string; class1: number; class2: number; class3: number }> = {};

  const processRates = (rates: ParsedRate[], classKey: 'class1' | 'class2' | 'class3') => {
    for (const item of rates) {
      const key = `${item.entry}-${item.exit}`;
      if (!ratesMap[key]) {
        ratesMap[key] = {
          entry: item.entry,
          exit: item.exit,
          class1: 0,
          class2: 0,
          class3: 0
        };
      }
      ratesMap[key][classKey] = item.rate;
    }
  };

  processRates(class1Rates, 'class1');
  processRates(class2Rates, 'class2');
  processRates(class3Rates, 'class3');

  // Collect unique plazas
  const uniquePlazas = new Set<string>();
  for (const key in ratesMap) {
    uniquePlazas.add(ratesMap[key].entry);
    uniquePlazas.add(ratesMap[key].exit);
  }

  console.log(`Found ${uniquePlazas.size} unique toll plazas. Seeding...`);

  // Clear existing database entries
  await prisma.transaction.deleteMany();
  await prisma.vehicleAccount.deleteMany();
  await prisma.tollRate.deleteMany();
  await prisma.tollPlaza.deleteMany();

  // Seed Toll Plazas
  let seq = 1;
  const plazaList = Array.from(uniquePlazas);
  for (const acronym of plazaList) {
    const name = plazaNames[acronym] || `Plaza ${acronym}`;
    await prisma.tollPlaza.create({
      data: {
        name,
        acronym,
        sequence: seq++
      }
    });
  }
  console.log("Seeded Toll Plazas.");

  // Seed Toll Rates
  let rateCount = 0;
  for (const key in ratesMap) {
    const item = ratesMap[key];
    await prisma.tollRate.create({
      data: {
        entryPlaza: item.entry,
        exitPlaza: item.exit,
        rateClass1: item.class1 || 55.0, // fallback to standard if missing
        rateClass2: item.class2 || 136.0,
        rateClass3: item.class3 || 210.0
      }
    });
    rateCount++;
  }
  console.log(`Seeded ${rateCount} Toll Rates.`);

  // Seed Vehicle Accounts
  const sampleAccountsPath = path.join(__dirname, 'sample_accounts.json');
  if (fs.existsSync(sampleAccountsPath)) {
    const sampleAccounts = JSON.parse(fs.readFileSync(sampleAccountsPath, 'utf-8'));
    await prisma.vehicleAccount.createMany({
      data: sampleAccounts
    });
    console.log(`Seeded ${sampleAccounts.length} dynamic sample accounts.`);
  } else {
    // Seed default Vehicle Accounts for testing if JSON is missing
    await prisma.vehicleAccount.createMany({
      data: [
        {
          rfidTag: "RFID10001",
          ownerName: "Juan Dela Cruz",
          licensePlate: "NDG-4521",
          vehicleClass: 1,
          balance: 500.00
        },
        {
          rfidTag: "RFID10002",
          ownerName: "Maria Santos",
          licensePlate: "NBI-8942",
          vehicleClass: 2,
          balance: 1500.00
        },
        {
          rfidTag: "RFID10003",
          ownerName: "Lito Lapid",
          licensePlate: "XAE-1029",
          vehicleClass: 3,
          balance: 3000.00
        },
        {
          rfidTag: "RFID10004",
          ownerName: "Ana Kalaw",
          licensePlate: "TYR-7721",
          vehicleClass: 1,
          balance: 45.50
        }
      ]
    });
    console.log("Seeded default test accounts.");
  }

  // Seed sample Transactions
  const sampleTxPath = path.join(__dirname, 'sample_transactions.json');
  if (fs.existsSync(sampleTxPath)) {
    const sampleTx = JSON.parse(fs.readFileSync(sampleTxPath, 'utf-8'));
    const formattedTx = sampleTx.map((tx: any) => ({
      rfidTag: tx.rfidTag,
      licensePlate: tx.licensePlate,
      vehicleClass: tx.vehicleClass,
      entryPlaza: tx.entryPlaza,
      exitPlaza: tx.exitPlaza,
      chargedAmount: tx.chargedAmount,
      timestamp: new Date(tx.timestamp),
      status: tx.status
    }));
    await prisma.transaction.createMany({
      data: formattedTx
    });
    console.log(`Seeded ${formattedTx.length} dynamic sample transactions.`);
  }

}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
