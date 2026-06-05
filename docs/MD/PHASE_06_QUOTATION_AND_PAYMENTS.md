# PHASE_06_QUOTATION_AND_PAYMENTS.md

# AI Powered Real Estate Virtual Experience Platform
## Phase 06 - Quotation Engine, Orders & Payments

Version: 1.0
Owner: Founding Team
Status: Planning

---

# Vision

This phase introduces the primary revenue generation engine of the platform.

The objective is to automate the process of:

Builder Uploads Plan
        ↓
System Analyzes Project
        ↓
Quotation Generated
        ↓
Builder Reviews Quote
        ↓
Builder Pays
        ↓
Admin Approves
        ↓
Digital Twin Production Starts
        ↓
Digital Twin Delivered

This phase transforms the platform from a software product into a service + SaaS business.

---

# Business Goal

Allow builders to:

- Upload project plans
- Receive instant quotations
- Approve quotations
- Make payments
- Track project status
- Receive Digital Twin delivery

Without manual sales involvement.

---

# Product Goals

Create:

- Quotation Engine
- Plan Upload System
- Pricing Engine
- Order Management System
- Payment System
- Approval Workflow
- Delivery Workflow

---

# Builder Journey

Step 1

Builder uploads:

- PDF
- DWG
- DXF
- PNG
- JPG

---

Step 2

System analyzes:

- Total Floors
- Total Flats
- 1BHK Count
- 2BHK Count
- 3BHK Count
- 4BHK Count
- Amenities
- Building Size

---

Step 3

System generates quotation.

---

Step 4

Builder chooses:

- Pay Online
- Request Call
- Offline Payment

---

Step 5

Super Admin reviews order.

---

Step 6

Production begins.

---

Step 7

Digital Twin delivered.

---

# Plan Upload Module

Purpose:

Receive architectural plans.

Supported Files:

PDF

DWG

DXF

PNG

JPG

ZIP

---

# Database

## uploaded_plans

Fields:

id

tenant_id

project_name

file_name

file_type

file_size

file_url

status

created_at

---

# Upload Status

Uploaded

Processing

Quotation Generated

Awaiting Payment

Paid

Approved

Production

Delivered

Cancelled

---

# Quotation Engine

Purpose:

Generate instant estimates.

---

# Pricing Variables

Number of Floors

Number of Flats

BHK Types

Amenities

Building Complexity

Walkthrough Package

Customization Package

---

# Example Calculation

Base Cost

+

Per Flat Cost

+

Amenity Cost

+

Customization Cost

=

Total Quote

---

# Database

## quotations

Fields:

id

tenant_id

plan_id

quotation_number

subtotal

discount

tax

total_amount

status

created_at

---

# Quotation Status

Draft

Generated

Accepted

Rejected

Expired

---

# Quotation Items

Purpose:

Store line items.

---

# Database

## quotation_items

Fields:

id

quotation_id

item_name

quantity

unit_price

total_price

---

# Automated Quotation Rules

Examples:

2BHK Flat

3BHK Flat

Amenity Area

Tower Complexity

Multiple Towers

Custom Walkthrough

---

# Quotation Preview Screen

Builder Can View:

- Cost Breakdown
- Flat Count
- Floor Count
- Services Included
- Delivery Timeline

---

# Payment System

Purpose:

Collect payments.

---

# Payment Methods

Online

Offline

Manual Approval

---

# Online Payment Providers

Primary:

Razorpay

Future:

Stripe

---

# Database

## payments

Fields:

id

tenant_id

quotation_id

payment_provider

payment_reference

amount

status

created_at

---

# Payment Status

Pending

Processing

Paid

Failed

Refunded

---

# Offline Payments

Examples:

Bank Transfer

Cheque

Cash

UPI

---

# Offline Workflow

Builder uploads payment proof.

Admin reviews.

Admin approves payment.

---

# Database

## payment_proofs

Fields:

id

payment_id

file_url

remarks

status

---

# Order Management

Purpose:

Track project production.

---

# Database

## orders

Fields:

id

tenant_id

quotation_id

order_number

status

created_at

---

# Order Status

Created

Awaiting Payment

Paid

Approved

In Production

QA Review

Delivered

Closed

---

# Production Pipeline

Purpose:

Track Digital Twin creation.

---

# Database

## production_tasks

Fields:

id

order_id

task_name

assigned_to

status

created_at

---

# Production Tasks

Plan Review

Floor Mapping

Model Creation

Hotspot Creation

QA Review

Client Review

Delivery

---

# Super Admin Workflow

Admin Can:

- View Orders
- Approve Orders
- Reject Orders
- Assign Production Team
- Track Delivery

---

# Builder Dashboard Screens

Upload Plan

Quotation Dashboard

Payment Dashboard

Order Dashboard

Delivery Dashboard

---

# Notification System

Send:

Email

WhatsApp

Dashboard Notifications

---

# Email Events

Quotation Generated

Payment Received

Order Approved

Production Started

Delivery Completed

---

# CRM Integration

When builder uploads plan:

Create CRM Opportunity.

Track:

Lead

Quotation

Payment

Order

Delivery

---

# Analytics

Track:

Quotation Conversion Rate

Payment Conversion Rate

Revenue

Average Project Value

Most Common Project Types

---

# APIs Required

Plan Upload API

Quotation API

Quotation Rules API

Payment API

Order API

Production API

Notification API

Analytics API

---

# Permissions

Super Admin

- Full Access

Builder Admin

- Create Orders
- Make Payments

Builder Staff

- View Orders

Sales User

- View Quotations

---

# Acceptance Criteria

Builder Can:

- Upload Plans
- Receive Quotations
- Make Payments
- Track Orders

Admin Can:

- Review Orders
- Approve Production
- Track Delivery

Platform Can:

- Generate Quotations
- Track Payments
- Manage Orders

---

# Deliverables

- Plan Upload System
- Quotation Engine
- Payment Integration
- Order Management
- Production Workflow
- Delivery Workflow
- Analytics Dashboard

---

# Future Dependencies

Phase 07 AI Plan Processing

Phase 08 AI 3D Generation

Phase 09 Analytics & Billing

Phase 10 Enterprise Scaling
