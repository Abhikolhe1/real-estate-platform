# PHASE_05_SDK_AND_EMBEDS.md

# AI Powered Real Estate Virtual Experience Platform
## Phase 05 - SDK Platform & Universal Embeds

Version: 1.0
Owner: Founding Team
Status: Planning

---

# Vision

The Digital Twin should not be limited to websites built on our platform.

Builders should be able to integrate Digital Twin experiences into:

- Existing Builder Websites
- WordPress Websites
- React Websites
- Next.js Websites
- Angular Websites
- Vue Websites
- Landing Pages
- Third Party Portals

The Digital Twin Platform must become a standalone product.

---

# Business Goal

A builder should be able to:

- Generate Embed Code
- Generate SDK Keys
- Integrate Anywhere
- Publish Digital Twin Experiences
- Track Usage

Without developer assistance.

---

# Product Goals

Create:

- JavaScript SDK
- React SDK
- iframe Embed System
- SDK Key Management
- Usage Tracking
- White Label Embeds
- Builder Embed Generator

---

# Product Architecture

Builder Dashboard
        ↓
Generate Embed
        ↓
SDK Platform
        ↓
External Website
        ↓
Digital Twin Viewer

---

# SDK Types

## JavaScript SDK

Purpose:

Integrate into any website.

Example:

<script src="sdk.js"></script>

<div id="viewer"></div>

SDK.init({
  projectId: "123"
})

---

## React SDK

Purpose:

Integrate into React projects.

Example:

<VirtualExperience
  projectId="123"
/>

---

## Next.js SDK

Purpose:

Integrate into Next.js websites.

Features:

- SSR Support
- Dynamic Loading
- SEO Compatibility

---

## iframe Embed

Purpose:

Fast integration.

Example:

<iframe
 src="https://viewer.domain.com/embed/project/123"
 width="100%"
 height="800">
</iframe>

---

# SDK Package Structure

packages/

sdk-core

sdk-react

sdk-next

sdk-js

shared-types

---

# SDK Core Engine

Responsibilities:

- Authentication
- Tenant Resolution
- Viewer Initialization
- API Communication
- Event Tracking

---

# Builder Embed Generator

Purpose:

Allow builders to generate embed code.

Builder Selects:

- Project
- Floor
- Theme
- Height
- Width
- Viewer Mode

System Generates:

React Code

JavaScript Code

iframe Code

---

# Database

## embed_configs

Fields:

id

tenant_id

project_id

embed_name

viewer_mode

theme

width

height

created_at

---

# SDK Keys

Purpose:

Control external access.

---

# Database

## sdk_keys

Fields:

id

tenant_id

key_name

api_key

status

expires_at

created_at

---

# Key Status

Active

Inactive

Revoked

Expired

---

# Viewer Modes

Building Mode

Floor Mode

Flat Mode

Room Mode

Walkthrough Mode

---

# White Label Embeds

Purpose:

Hide platform branding.

Features:

- Custom Logo
- Custom Domain
- Custom Colors
- Custom Loader

Enterprise Feature

---

# Domain Support

Support:

builder.com

project.builder.com

custom domains

subdomains

---

# Tenant Resolution

Purpose:

Identify builder context.

Methods:

- SDK Key
- Domain
- Subdomain
- JWT Token

---

# API Security

Requirements:

- API Key Validation
- Rate Limiting
- JWT Validation
- Tenant Isolation

---

# Usage Tracking

Track:

- Views
- Sessions
- Active Users
- Embed Usage
- Project Views

---

# Database

## embed_usage

Fields:

id

tenant_id

project_id

sdk_key_id

session_id

event_type

created_at

---

# Analytics

Track:

Most Viewed Projects

Most Viewed Floors

Most Viewed Flats

Average Session Time

Unique Users

Returning Users

---

# Event System

Track:

Viewer Opened

Floor Selected

Flat Selected

Room Selected

Hotspot Clicked

Brochure Downloaded

Lead Generated

---

# Database

## analytics_events

Fields:

id

tenant_id

project_id

event_name

event_data

created_at

---

# Lead Capture Integration

Allow builders to capture leads directly.

Examples:

Request Pricing

Book Site Visit

Contact Sales

Download Brochure

---

# CRM Integration

When lead generated:

Create CRM Lead

Assign Sales User

Create Follow-up

---

# Builder Dashboard Screens

SDK Dashboard

SDK Keys

Embed Generator

Usage Analytics

Integration Docs

---

# API Requirements

SDK API

Embed API

Analytics API

Authentication API

Lead API

Project API

---

# Documentation Requirements

Create:

SDK Documentation

API Documentation

React Examples

JavaScript Examples

Next.js Examples

WordPress Examples

---

# Distribution Strategy

Phase 1

iframe Embeds

Phase 2

JavaScript SDK

Phase 3

React SDK

Phase 4

Next.js SDK

Phase 5

Marketplace Integrations

---

# Permissions

Builder Admin

- Full SDK Access

Builder Staff

- View Analytics

Sales User

- Read Only

---

# Acceptance Criteria

Builder Can:

- Generate SDK Keys
- Generate Embed Code
- Integrate Anywhere
- Track Usage

External Website Can:

- Render Digital Twin
- Load Correct Project
- Capture Leads

Platform Can:

- Track Usage
- Track Analytics
- Maintain Tenant Isolation

---

# Deliverables

- SDK Core
- JavaScript SDK
- React SDK
- Next.js SDK
- Embed System
- SDK Key Management
- Usage Analytics
- Integration Documentation

---

# Future Dependencies

Phase 06 Quotation Engine

Phase 07 AI Plan Processing

Phase 08 AI 3D Generation

Phase 09 Billing & Analytics
