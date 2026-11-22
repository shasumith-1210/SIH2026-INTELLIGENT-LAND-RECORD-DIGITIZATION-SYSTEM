# IntelliLand – Intelligent Land Record Digitization System

<p align="center">
&#x20; <strong>Smart India Hackathon 2026 | Problem Statement ID: 26018</strong>
</p>

<p align="center">
&#x20; An AI-powered platform for digitizing, extracting, organizing, and managing land records through OCR and intelligent document processing.
</p>

---

## 📌 Overview

IntelliLand is a land record digitization and management platform developed as a solution to **Smart India Hackathon 2026 – Problem Statement 26018**.

The project focuses on transforming traditional physical land documents into structured digital records using Optical Character Recognition (OCR), document processing, and AI/ML-based techniques.

The goal is to reduce manual data-entry efforts, improve document accessibility, and make land record verification and management more efficient.

## 🎯 Problem Statement

| Detail               | Information                                 |
| -------------------- | ------------------------------------------- |
| Hackathon            | Smart India Hackathon 2026                  |
| Problem Statement ID | 26018                                       |
| Title                | Intelligent Land Record Digitization System |
| Team                 | SIH Coders Creed                            |

## 💡 Proposed Solution

IntelliLand aims to provide a centralized platform where land-related documents can be uploaded, processed, verified, and accessed digitally.

The proposed workflow includes:

1. **Document Upload** – Upload scanned land records and supporting documents.
2. **OCR Processing** – Extract text from physical and scanned documents.
3. **Information Extraction** – Identify relevant information from unstructured document content.
4. **Digital Record Management** – Organize extracted information into structured records.
5. **Verification Workflow** – Support document validation and verification.
6. **Record Access** – Enable users to search, retrieve, and track land records.

## ✨ Key Features

- 📄 Land document digitization
- 🔍 OCR-based text extraction
- 🤖 AI/ML-assisted document processing (planned)
- 🗂️ Structured digital land records
- 🔎 Land record search and retrieval
- 👤 Role-based portals for landowners, officers, and administrators
- 📊 Document verification and tracking workflows
- 🔐 Authentication and access control

*Feature availability may vary as development progresses.*

## 🛠️ Technology Stack

| Component        | Technology                 |
| ---------------- | -------------------------- |
| Frontend         | React, TypeScript, Vite    |
| Styling          | Tailwind CSS               |
| Backend          | Python, FastAPI            |
| Database Layer   | SQLAlchemy                 |
| OCR              | Tesseract OCR, Pytesseract |
| Image Processing | OpenCV                     |
| Database         | To be documented           |
| AI/ML            | Under development          |

## 🛠️ Technology Stack

| **Component** | **Technology** |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend | Python, FastAPI |
| ORM | SQLAlchemy |
| Database | SQLite (Default), PostgreSQL (Supported) |
| OCR | Tesseract OCR, Pytesseract |
| Image Processing | OpenCV |
| Database Migrations | Alembic |
| Authentication | JWT (JSON Web Tokens) |

## 🏗️ System Architecture

The application follows a frontend-backend architecture.

```text
              IntelliLand
                   |
          React + TypeScript
                   |
              FastAPI
                   |
        Document Processing
                   |
          OCR / Tesseract
                   |
       Information Extraction
                   |
        Structured Data Layer
                   |
          Database Storage
```

*Architecture is subject to change as development progresses.*

## 👥 User Roles

| Role                 | Responsibility                                                  |
| -------------------- | --------------------------------------------------------------- |
| Landowner            | Upload documents, track application status, access land records |
| Digitisation Officer | Process and verify submitted land documents                     |
| Administrator        | Manage administrative workflows and oversee operations          |

## 📂 Project Structure

```text
IntelliLand/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   └── package.json
│
├── backend/
│   ├── ...
│   └── requirements.txt
│
├── scripts/
│   └── dev.mjs
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js and npm
- Python
- Tesseract OCR

### 1. Clone the repository

```bash
git clone https://github.com/shasumith-1210/SIH2026-INTELLIGENT-LAND-RECORD-DIGITIZATION-SYSTEM.git
cd IntelliLand
```

### 2. Set up the Python environment

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

### 3. Install backend dependencies

```bash
pip install -r backend/requirements.txt
```

### 4. Install frontend dependencies

```bash
cd frontend
npm install
```

### 5. Start the application

```bash
npm run dev:full
```

### 6. Access the application

- Frontend: [http://localhost:8443](http://localhost:8443)
- Backend: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- API Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## 👥 Team

**Team Name:** SIH Coders Creed

**Hackathon:** Smart India Hackathon 2026

## 📌 Project Status

🚧 **Active Development**

IntelliLand is currently under development. Features and implementation details may evolve as the project progresses.

---

<p align="center">
&#x20; Developed with dedication by <strong>Team SIH Coders Creed</strong>
</p>

<p align="center">
&#x20; Smart India Hackathon 2026 | Problem Statement 26018
</p>
