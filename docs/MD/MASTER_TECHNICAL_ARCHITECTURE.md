# MASTER_TECHNICAL_ARCHITECTURE.md

Purpose:

Explain exactly how the platform works technically.

Sections:

1. Monorepo Architecture

apps/

* admin
* builder
* web
* api

packages/

* ui
* sdk
* shared
* theme-engine
* animation-engine

2. Multi-Tenant Architecture

Builder
↓
Projects
↓
Towers
↓
Floors
↓
Flats

3. Database Architecture

All tables

Relationships

Indexes

Constraints

4. API Architecture

NestJS Modules

Authentication

Projects

CRM

Inventory

Digital Twin

SDK

Analytics

Billing

5. Event Architecture

Queues

Redis

BullMQ

Notifications

6. Storage Architecture

S3

GLB

DXF

PDF

Images

7. AI Architecture

Python Services

OpenCV

YOLO

PaddleOCR

GPT Vision

Gemini Vision

8. DXF Processing Architecture

Upload
↓
Parser
↓
Floor Splitter
↓
Room Detection
↓
Validation Studio

9. Exterior Generation Architecture

Floor Plan DXF
+
Elevation DXF
+
Exterior Images
+
Theme

↓

Digital Twin

10. SDK Architecture

React SDK

Next SDK

JS SDK

11. Security

JWT

RBAC

Audit Logs

Rate Limits

12. Deployment

Docker

AWS

CloudFront

RDS

Redis

Expected Size:

100+ pages equivalent.

Audience:

CTO
Developers
Architects
AI Engineers
