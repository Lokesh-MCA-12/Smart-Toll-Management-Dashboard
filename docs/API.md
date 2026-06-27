# API Route Catalog

## Base URL
`http://localhost:5000/api`

## Endpoints

### 1. Telemetry Stream
*   **GET** `/events`
    - **Description**: SSE stream connection.

### 2. Rates and Plazas
*   **GET** `/plazas`
    - **Response**: List of toll plazas.
*   **GET** `/rates`
    - **Response**: Price matrix.
*   **POST** `/rates/update`
    - **Body**: Rate parameters JSON.
    - **Response**: Updated rate object.

### 3. Vehicle Accounts
*   **GET** `/accounts`
    - **Response**: List of accounts.
