# PHASE_07_AI_PLAN_PROCESSING.md

# AI Powered Real Estate Virtual Experience Platform
## Phase 07 - AI Plan Processing & Project Intelligence Engine

Version: 1.0
Owner: Founding Team
Status: Planning

---

# Vision

This phase introduces Artificial Intelligence into the platform.

The goal is not immediate 3D generation.

The goal is to automatically understand project plans and extract structured information.

Builder uploads:

PDF
DWG
DXF
JPG
PNG

System understands:

- Floors
- Towers
- Flats
- Rooms
- Amenities
- Doors
- Windows
- Staircases
- Lifts

The output becomes structured project data.

---

# Business Goal

Reduce manual effort required for:

- Quotation Generation
- Project Analysis
- Floor Mapping
- Inventory Creation
- Digital Twin Preparation

---

# Product Goals

Create:

- AI Upload Pipeline
- CAD Processing Engine
- PDF Processing Engine
- Room Detection Engine
- Floor Detection Engine
- Project Intelligence Engine

---

# High Level Flow

Builder Uploads Plan
        ↓
File Validation
        ↓
AI Processing
        ↓
Room Detection
        ↓
Floor Detection
        ↓
Inventory Generation
        ↓
Quotation Generation
        ↓
Human Validation
        ↓
Approved Data

---

# Supported File Types

PDF

DWG

DXF

PNG

JPG

JPEG

ZIP

---

# Processing Pipeline

Stage 1

File Upload

Stage 2

Document Parsing

Stage 3

Geometry Extraction

Stage 4

Object Detection

Stage 5

Room Classification

Stage 6

Inventory Extraction

Stage 7

Validation

Stage 8

Approval

---

# AI Service Architecture

Frontend
        ↓
NestJS API
        ↓
Queue System
        ↓
Python AI Service
        ↓
Processing Results
        ↓
Database

---

# Technology Stack

Python

OpenCV

NumPy

PyTorch

Detectron2

YOLO

FastAPI

Redis

BullMQ

---

# CAD Processing Engine

Purpose

Read:

DWG

DXF

Files

---

# Extract

Walls

Doors

Windows

Rooms

Text Labels

Measurements

Coordinates

---

# Database

## plan_uploads

Fields:

id

tenant_id

file_name

file_type

file_url

processing_status

created_at

---

# Processing Status

Uploaded

Queued

Processing

Validation Required

Approved

Rejected

Failed

---

# PDF Processing Engine

Purpose

Handle architectural PDFs.

Steps:

Convert PDF To Images

Detect Geometry

Detect Labels

Detect Rooms

Extract Structure

---

# Image Processing Engine

Purpose

Handle scanned plans.

Steps:

Noise Removal

Thresholding

Edge Detection

Contour Detection

Wall Extraction

---

# Floor Detection

Purpose

Detect:

Ground Floor

Floor 1

Floor 2

Floor 3

etc.

---

# Database

## detected_floors

Fields:

id

plan_id

floor_number

confidence_score

---

# Room Detection

Purpose

Detect:

Living Room

Bedroom

Kitchen

Washroom

Balcony

Dining Area

Utility Area

Lobby

---

# Database

## detected_rooms

Fields:

id

plan_id

room_name

room_type

confidence_score

---

# Flat Detection

Purpose

Determine:

Flat 101

Flat 102

Flat 201

Flat 202

etc.

---

# Database

## detected_flats

Fields:

id

plan_id

flat_number

flat_type

area

confidence_score

---

# Amenity Detection

Purpose

Identify:

Swimming Pool

Gym

Garden

Parking

Club House

Play Area

---

# Database

## detected_amenities

Fields:

id

plan_id

amenity_name

confidence_score

---

# Inventory Generation

Purpose

Generate inventory automatically.

Example:

Tower A

Floor 4

Flat 401

2 BHK

1100 Sqft

Available

---

# Automated Quotation Inputs

AI Generates:

Total Towers

Total Floors

Total Flats

BHK Distribution

Amenity Count

Building Complexity

These values feed directly into quotation engine.

---

# Validation Layer

Purpose

AI should never directly approve data.

Human must validate.

Workflow:

AI Output
        ↓
Human Review
        ↓
Approve
        ↓
Database Update

---

# Validation Dashboard

Show:

Detected Floors

Detected Flats

Detected Rooms

Detected Amenities

Confidence Scores

---

# Confidence Scoring

High

90%+

Medium

70%-90%

Low

Below 70%

Low confidence results require review.

---

# AI Analytics

Track:

Processing Time

Accuracy

Detection Rates

Validation Rates

Failure Rates

---

# Database

## ai_processing_logs

Fields:

id

plan_id

step_name

status

execution_time

created_at

---

# Queue System

Purpose

Handle large files.

Use:

BullMQ

Redis

Workers

---

# Notification System

Send:

Processing Started

Processing Completed

Validation Required

Processing Failed

---

# Builder Dashboard Screens

Plan Upload

AI Processing Dashboard

Detected Floors

Detected Flats

Detected Rooms

Validation Dashboard

Processing History

---

# Super Admin Screens

Processing Queue

Failed Jobs

AI Analytics

Validation Queue

---

# APIs Required

Plan Upload API

AI Processing API

Floor Detection API

Room Detection API

Flat Detection API

Validation API

Analytics API

---

# Permissions

Super Admin

- Full Access

Builder Admin

- Upload Plans
- Validate Results

Builder Staff

- Review Results

Sales User

- Read Only

---

# Acceptance Criteria

Builder Can:

- Upload Plans
- Receive AI Results
- Review Results
- Approve Results

System Can:

- Detect Floors
- Detect Flats
- Detect Rooms
- Detect Amenities

Platform Can:

- Feed Quotation Engine
- Feed Inventory Engine
- Feed Digital Twin Pipeline

---

# Deliverables

- AI Processing Service
- CAD Processing Engine
- PDF Processing Engine
- Room Detection Engine
- Floor Detection Engine
- Inventory Extraction
- Validation Dashboard
- AI Analytics

---

# Future Dependencies

Phase 08 AI 3D Generation

Phase 09 Analytics & Billing

Phase 10 Enterprise Scaling
