# Project Overview

## Project Name
Smart Toll Management Dashboard System

## Purpose
The system replaces slow desktop Swing interfaces with a web dashboard for highway operators. It simulates RFID scanning, tracks account balances in real-time, updates pricing matrices, and streams passage telemetry to monitoring screens.

## Business Problem
Legacy toll management systems use desktop interfaces that lack central sync:
1. Operator consoles do not display live entrance/exit feeds.
2. Adjusting rates across plazas requires updating local database tables manually.
3. Drivers experience delays at toll gates due to slow balance verifications.

## Solution
Our system integrates a React-based frontend with an Express API backend. It features:
- Live lane simulators that track RFID entries and exits.
- Dynamic rate controllers for Class 1 (Cars), Class 2 (Buses), and Class 3 (Trucks).
- SSE telemetry streaming for real-time dashboard updates.
- Transaction histories with billing audits.
