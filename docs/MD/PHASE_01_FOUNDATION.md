# PHASE_01_FOUNDATION.md

# AI Powered Real Estate Virtual Experience Platform
## Phase 01 - Foundation & Multi-Tenant SaaS Core

Version: 1.0
Owner: Founding Team
Status: Planning

## Purpose

The purpose of Phase 01 is to build the foundation that every future module depends on.

This phase is NOT focused on:
- AI
- 3D Generation
- Digital Twin
- SDK
- Billing

Instead it focuses on creating a production-ready SaaS architecture.

Everything built later must sit on top of this foundation.

## Business Goals

At the end of this phase:
- Multiple builders can use the platform
- Builders are isolated from each other
- Users can login securely
- Projects can be created
- Teams can be managed
- Leads can be managed
- Themes can be configured
- Media can be uploaded

## Product Goals

Create:
- Super Admin Portal
- Builder Portal
- Multi-Tenant Backend
- Authentication System
- Role Management
- Media Management
- Theme Foundation
- Website Foundation

## Monorepo Architecture

apps/
- admin
- builder
- web
- api

packages/
- ui
- types
- shared-utils
- shared-hooks
- shared-api
- theme-engine
- animation-engine

## Multi Tenant Architecture

Every business record must belong to a tenant.

tenant_id must exist on:
- builders
- projects
- towers
- floors
- flats
- pages
- themes
- media
- leads

## Roles

### Super Admin
- Create Builder
- Edit Builder
- Suspend Builder
- Delete Builder
- Manage Plans
- Manage Revenue
- View Analytics

### Builder Admin
- Manage Projects
- Manage Users
- Manage Website
- Manage Leads
- Manage Themes

### Builder Staff
- Manage Inventory
- Manage Content
- Manage Media

### Sales User
- View Leads
- Add Notes
- Update Status

## Authentication Module

Features:
- JWT Login
- Refresh Token
- Session Management
- Password Reset
- Email Verification

Future:
- Google Login
- Microsoft Login
- Enterprise SSO

## Database Design

### users
id
tenant_id
email
password
first_name
last_name
status
created_at
updated_at

### roles
id
name
description

### permissions
id
name
module

### user_roles
user_id
role_id

## Builder Module

Database: builders

Fields:
id
name
slug
email
phone
logo
status
plan_id

APIs:
GET /builders
POST /builders
PUT /builders/:id
DELETE /builders/:id

## Project Module

projects:
id
tenant_id
name
description
status

towers:
id
project_id
name

floors:
id
tower_id
floor_number

flats:
id
floor_id
flat_number
flat_type
area
status

## Theme Engine Foundation

themes:
id
tenant_id
name
primary_color
secondary_color
font_family
button_style
card_style

APIs:
GET /themes
POST /themes
PUT /themes/:id

## Website Foundation

pages:
id
tenant_id
title
slug
status

website_sections:
id
page_id
type
order_no
config_json

## Lead Foundation

leads:
id
tenant_id
name
phone
email
project_id
status

Statuses:
New
Contacted
Interested
Site Visit
Booked
Lost

## Media Module

Store:
- Images
- Videos
- PDFs
- GLBs
- DXFs

media:
id
tenant_id
file_name
file_type
file_size
url

## API Standards

Rules:
- DTO Required
- Validation Required
- Swagger Required
- Service Layer Required
- Repository Layer Required

Never:
Controller -> Database Directly

## Logging

Implement:
- Winston
- Morgan
- Audit Logs

audit_logs:
id
tenant_id
user_id
action
module
old_value
new_value

## Redis Usage

Use Redis For:
- Caching
- Sessions
- Rate Limiting
- Background Jobs

## DevOps

Docker Services:
- API
- PostgreSQL
- Redis
- Admin
- Builder
- Web

GitHub Actions:
- Lint
- Test
- Build
- Deploy

## Environment Variables

DATABASE_URL
REDIS_URL
JWT_SECRET
AWS_ACCESS_KEY
AWS_SECRET_KEY
AWS_BUCKET
OPENAI_API_KEY

## Deliverables

- Multi Tenant Backend
- Builder Portal
- Admin Portal
- Authentication
- Roles & Permissions
- Project Management
- Theme Foundation
- Media Foundation
- Lead Foundation
- Audit Logging

## Acceptance Criteria

Builder Can:
- Login
- Create Projects
- Manage Team
- Upload Media
- Manage Leads

Admin Can:
- Create Builder
- Suspend Builder
- View Statistics

Platform Supports:
- Multi Tenancy
- Role Based Access
- Audit Logs
- Project Isolation

## Future Dependencies

Phase 02 Website Builder
Phase 03 CRM & Inventory
Phase 04 Digital Twin
Phase 05 SDK
Phase 06 Quotation Engine
Phase 07 AI Processing
Phase 08 AI 3D Generation
Phase 09 Billing
Phase 10 Enterprise Features
