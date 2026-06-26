import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-memory store for active transits/trips (Simulating RFID entry scans)
// Key: rfidTag, Value: { entryPlaza: string, entryTime: Date }
const activeTrips = new Map<string, { entryPlaza: string; entryTime: Date }>();

// SSE clients registry for real-time broadcasts
let sseClients: Response[] = [];

// Helper to broadcast events to all active SSE clients
const broadcastEvent = (eventType: string, data: any) => {
  const payload = JSON.stringify({ type: eventType, data });
  sseClients.forEach(client => {
    client.write(`data: ${payload}\n\n`);
  });
};

// --- API ROUTES ---

// 1. SSE Endpoint for streaming events to the dashboard
app.get('/api/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  sseClients.push(res);
  console.log(`SSE Client connected. Total: ${sseClients.length}`);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', data: { clientCount: sseClients.length } })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
    console.log(`SSE Client disconnected. Total: ${sseClients.length}`);
  });
});

// 2. Fetch all Toll Plazas
app.get('/api/plazas', async (req: Request, res: Response) => {
  try {
    const plazas = await prisma.tollPlaza.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(plazas);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve toll plazas' });
  }
});

// 3. Fetch all Toll Rates
app.get('/api/rates', async (req: Request, res: Response) => {
  try {
    const rates = await prisma.tollRate.findMany();
    res.json(rates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve toll rates' });
  }
});

// 4. Update a Toll Rate Class value
app.post('/api/rates/update', async (req: Request, res: Response) => {
  const { id, rateClass1, rateClass2, rateClass3 } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Rate ID is required' });
  }
  try {
    const updated = await prisma.tollRate.update({
      where: { id },
      data: {
        rateClass1: parseFloat(rateClass1),
        rateClass2: parseFloat(rateClass2),
        rateClass3: parseFloat(rateClass3),
      },
    });
    broadcastEvent('RATE_UPDATED', updated);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update toll rate' });
  }
});

// 5. Fetch all registered vehicle accounts
app.get('/api/accounts', async (req: Request, res: Response) => {
  try {
    const accounts = await prisma.vehicleAccount.findMany({
      orderBy: { ownerName: 'asc' },
    });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve vehicle accounts' });
  }
});

// 6. Create a new vehicle account / RFID tag
app.post('/api/accounts', async (req: Request, res: Response) => {
  const { rfidTag, ownerName, licensePlate, vehicleClass, balance } = req.body;
  if (!rfidTag || !ownerName || !licensePlate || !vehicleClass) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const newAccount = await prisma.vehicleAccount.create({
      data: {
        rfidTag,
        ownerName,
        licensePlate,
        vehicleClass: parseInt(vehicleClass),
        balance: parseFloat(balance || 0),
      },
    });
    res.status(201).json(newAccount);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'RFID Tag or License Plate already exists' });
    }
    res.status(500).json({ error: 'Failed to create vehicle account' });
  }
});

// 7. Top-up dynamic balance
app.post('/api/accounts/topup', async (req: Request, res: Response) => {
  const { rfidTag, amount } = req.body;
  if (!rfidTag || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid tag or top-up amount' });
  }
  try {
    const account = await prisma.vehicleAccount.update({
      where: { rfidTag },
      data: { balance: { increment: parseFloat(amount) } },
    });
    broadcastEvent('BALANCE_TOPPED_UP', account);
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process balance top-up' });
  }
});

// 8. Simulator: Trigger Entry RFID scan
app.post('/api/simulator/entry', async (req: Request, res: Response) => {
  const { rfidTag, entryPlaza } = req.body;
  if (!rfidTag || !entryPlaza) {
    return res.status(400).json({ error: 'RFID tag and entry plaza are required' });
  }

  try {
    // Validate tag exists
    const account = await prisma.vehicleAccount.findUnique({
      where: { rfidTag },
    });
    if (!account) {
      return res.status(404).json({ error: 'RFID Tag not registered' });
    }

    // Set transit entry
    const entryTime = new Date();
    activeTrips.set(rfidTag, { entryPlaza, entryTime });

    // Emit live event
    const eventPayload = {
      rfidTag,
      ownerName: account.ownerName,
      licensePlate: account.licensePlate,
      vehicleClass: account.vehicleClass,
      entryPlaza,
      entryTime,
    };
    broadcastEvent('VEHICLE_ENTERED', eventPayload);

    res.json({ message: `Vehicle entered at ${entryPlaza}`, activeTrip: eventPayload });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process entry simulation' });
  }
});

// 9. Simulator: Trigger Exit RFID scan and perform calculation
app.post('/api/simulator/exit', async (req: Request, res: Response) => {
  const { rfidTag, exitPlaza } = req.body;
  if (!rfidTag || !exitPlaza) {
    return res.status(400).json({ error: 'RFID tag and exit plaza are required' });
  }

  try {
    // Check if vehicle has active entry trip
    const trip = activeTrips.get(rfidTag);
    if (!trip) {
      return res.status(400).json({ error: 'No active entry recorded for this vehicle RFID tag' });
    }

    const { entryPlaza, entryTime } = trip;

    // Prevent exiting at the same plaza
    if (entryPlaza === exitPlaza) {
      return res.status(400).json({ error: 'Exit plaza must be different from entry plaza' });
    }

    // Fetch vehicle details
    const account = await prisma.vehicleAccount.findUnique({
      where: { rfidTag },
    });
    if (!account) {
      return res.status(404).json({ error: 'RFID Tag account not found' });
    }

    // Determine rate from database (checking both directions bidirectionally)
    let rateRow = await prisma.tollRate.findFirst({
      where: {
        OR: [
          { entryPlaza: entryPlaza, exitPlaza: exitPlaza },
          { entryPlaza: exitPlaza, exitPlaza: entryPlaza }
        ]
      }
    });

    if (!rateRow) {
      return res.status(404).json({ error: `No toll rate configured between ${entryPlaza} and ${exitPlaza}` });
    }

    // Determine cost based on vehicle class
    let cost = 0;
    if (account.vehicleClass === 1) cost = rateRow.rateClass1;
    else if (account.vehicleClass === 2) cost = rateRow.rateClass2;
    else if (account.vehicleClass === 3) cost = rateRow.rateClass3;

    let transactionStatus = 'COMPLETED';
    let finalBalance = account.balance;

    if (account.balance >= cost) {
      // Deduct balance
      const updatedAccount = await prisma.vehicleAccount.update({
        where: { rfidTag },
        data: { balance: { decrement: cost } },
      });
      finalBalance = updatedAccount.balance;
    } else {
      transactionStatus = 'INSUFFICIENT_FUNDS';
    }

    // Save transaction
    const transaction = await prisma.transaction.create({
      data: {
        rfidTag,
        licensePlate: account.licensePlate,
        vehicleClass: account.vehicleClass,
        entryPlaza,
        exitPlaza,
        chargedAmount: cost,
        status: transactionStatus,
      },
    });

    // Clear active trip
    activeTrips.delete(rfidTag);

    // Emit live event
    const eventPayload = {
      ...transaction,
      ownerName: account.ownerName,
      remainingBalance: finalBalance,
      entryTime,
    };
    broadcastEvent('VEHICLE_EXITED', eventPayload);

    res.json({
      message: transactionStatus === 'COMPLETED' ? 'Transaction completed successfully' : 'Transaction failed: Insufficient funds',
      transaction: eventPayload
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process exit simulation' });
  }
});

// 10. Fetch transaction logs
app.get('/api/transactions', async (req: Request, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100, // limit to 100 recent
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve transactions' });
  }
});

// 11. Fetch Active Trips (in-transit vehicles)
app.get('/api/simulator/active', async (req: Request, res: Response) => {
  try {
    const list = [];
    for (const [tag, trip] of activeTrips.entries()) {
      const account = await prisma.vehicleAccount.findUnique({ where: { rfidTag: tag } });
      if (account) {
        list.push({
          rfidTag: tag,
          ownerName: account.ownerName,
          licensePlate: account.licensePlate,
          vehicleClass: account.vehicleClass,
          entryPlaza: trip.entryPlaza,
          entryTime: trip.entryTime,
        });
      }
    }
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve active trips' });
  }
});

// 12. Fetch aggregated analytics overview
app.get('/api/analytics/summary', async (req: Request, res: Response) => {
  try {
    const totalTransactions = await prisma.transaction.count();
    const successfulTx = await prisma.transaction.findMany({
      where: { status: 'COMPLETED' }
    });

    const totalRevenue = successfulTx.reduce((sum, tx) => sum + tx.chargedAmount, 0);

    // Distribution by Vehicle Class
    const classCounts = await prisma.transaction.groupBy({
      by: ['vehicleClass'],
      _count: {
        _all: true
      }
    });

    // Plaza Popularity (Traffic Count)
    const entryPlazaCounts = await prisma.transaction.groupBy({
      by: ['entryPlaza'],
      _count: {
        _all: true
      }
    });

    const exitPlazaCounts = await prisma.transaction.groupBy({
      by: ['exitPlaza'],
      _count: {
        _all: true
      }
    });

    const activeTransitsCount = activeTrips.size;

    res.json({
      totalRevenue,
      totalTransactions,
      activeTransitsCount,
      vehicleClassDistribution: classCounts.map(item => ({
        class: item.vehicleClass,
        count: item._count._all
      })),
      trafficByEntry: entryPlazaCounts.map(item => ({
        plaza: item.entryPlaza,
        count: item._count._all
      })),
      trafficByExit: exitPlazaCounts.map(item => ({
        plaza: item.exitPlaza,
        count: item._count._all
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve analytics summary' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Smart Toll Backend running on http://localhost:${PORT}`);
});
