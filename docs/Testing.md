# Testing and Validation

## Manual Testing Workflow
1. Start the services: `npm run dev`.
2. Open `http://localhost:5173`.
3. Select a vehicle, choose an entry gate, and click **Simulate Entry**. Verify that the transaction is logged in the transit table.
4. Select the exit gate and click **Simulate Exit**. Verify that the transaction logs update and the wallet balance is charged correctly.

## Automated Testing Strategy
- The codebase does not feature preconfigured automated test suites.
- **Recommendation**: Integrate Cypress or Jest to write automated end-to-end tests for the lane simulator and dashboard charts.
