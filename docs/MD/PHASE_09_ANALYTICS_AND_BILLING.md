# PHASE_09_ANALYTICS_AND_BILLING.md

# AI Powered Real Estate Virtual Experience Platform
## Phase 09 - Analytics, Billing & Revenue Platform

Version: 1.0
Owner: Founding Team
Status: Planning

---

# Vision

This phase converts the platform into a complete SaaS business.

The goal is to:

- Track usage
- Measure engagement
- Generate recurring revenue
- Automate subscriptions
- Automate invoicing
- Track platform growth

This phase provides visibility into:

Builder Usage

Website Usage

Digital Twin Usage

SDK Usage

Revenue

Subscriptions

---

# Business Goal

Allow platform owners to:

- Monetize builders
- Track platform growth
- Measure Digital Twin adoption
- Analyze customer behavior

Allow builders to:

- Track leads
- Track inventory interest
- Track visitor engagement
- Track project performance

---

# Product Goals

Create:

- Subscription Engine
- Billing Engine
- Invoice Engine
- Usage Tracking Engine
- Analytics Engine
- Revenue Dashboard

---

# Subscription Architecture

Builder
      ↓
Subscription Plan
      ↓
Features
      ↓
Usage Limits
      ↓
Billing

---

# Subscription Plans

Starter

Professional

Enterprise

Custom Enterprise

---

# Starter Plan

Features:

1 Website

1 Project

Basic Analytics

Basic CRM

Limited Storage

---

# Professional Plan

Features:

Multiple Projects

Website Builder

CRM

Inventory

Digital Twin

SDK Access

Advanced Analytics

---

# Enterprise Plan

Features:

Unlimited Projects

White Label

Custom Domain

SDK

Advanced AI

Priority Support

Dedicated Infrastructure

---

# Database

## subscription_plans

Fields:

id

plan_name

monthly_price

yearly_price

feature_json

created_at

---

# Database

## subscriptions

Fields:

id

tenant_id

plan_id

status

start_date

end_date

billing_cycle

created_at

---

# Subscription Status

Trial

Active

Suspended

Cancelled

Expired

---

# Billing Engine

Purpose

Manage recurring payments.

Features:

Monthly Billing

Yearly Billing

Renewals

Upgrade

Downgrade

Cancellation

---

# Payment Providers

Primary

Razorpay

Future

Stripe

PayPal

---

# Database

## invoices

Fields:

id

tenant_id

subscription_id

invoice_number

amount

tax

status

created_at

---

# Invoice Status

Draft

Generated

Paid

Overdue

Cancelled

---

# Database

## invoice_items

Fields:

id

invoice_id

description

quantity

unit_price

total_price

---

# Revenue Dashboard

Track:

MRR

ARR

Revenue

Refunds

Growth Rate

Plan Distribution

---

# Analytics Architecture

Frontend
      ↓
Tracking Events
      ↓
Analytics Service
      ↓
Analytics Database
      ↓
Reports

---

# Website Analytics

Track:

Page Views

Sessions

Unique Visitors

Bounce Rate

Conversions

Lead Generation

---

# Digital Twin Analytics

Track:

Viewer Opens

Floor Views

Flat Views

Room Views

Hotspot Clicks

Brochure Downloads

Lead Submissions

---

# SDK Analytics

Track:

Embeds

Views

Sessions

External Website Usage

SDK Adoption

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

# Event Types

Page View

Project View

Viewer Opened

Floor Selected

Flat Selected

Room Selected

Hotspot Clicked

Brochure Downloaded

Lead Generated

---

# Heatmaps

Purpose

Understand user interaction.

Track:

Most Viewed Floors

Most Viewed Flats

Most Viewed Rooms

Most Clicked Hotspots

---

# Lead Analytics

Track:

Lead Sources

Lead Conversion Rate

Sales Funnel

Site Visit Conversion

Revenue Per Lead

---

# Inventory Analytics

Track:

Available Units

Booked Units

Sold Units

Most Viewed Units

Fastest Selling Units

---

# Revenue Analytics

Track:

Revenue Per Project

Revenue Per Builder

Revenue Per Plan

Revenue Growth

---

# Storage Analytics

Track:

Images

Videos

GLB Files

CAD Files

Storage Usage

Bandwidth Usage

---

# Usage Limits

Purpose

Control subscription plans.

Examples:

Projects

Storage

Digital Twins

SDK Embeds

Monthly Views

Users

---

# Database

## usage_tracking

Fields:

id

tenant_id

metric_name

metric_value

period

created_at

---

# Notification System

Send:

Invoice Generated

Payment Received

Subscription Expiring

Usage Limit Reached

---

# Builder Dashboard Screens

Subscription Dashboard

Invoices

Payments

Usage Analytics

Website Analytics

Digital Twin Analytics

Storage Analytics

---

# Super Admin Screens

Revenue Dashboard

Subscription Dashboard

Invoice Dashboard

Plan Management

Builder Usage Dashboard

Platform Analytics

---

# APIs Required

Subscription API

Billing API

Invoice API

Analytics API

Revenue API

Usage Tracking API

---

# Permissions

Super Admin

- Full Access

Builder Admin

- View Billing
- Manage Subscription

Builder Staff

- View Analytics

Sales User

- Read Only

---

# Acceptance Criteria

Builder Can:

- View Subscription
- Pay Invoices
- Upgrade Plans
- View Analytics

Admin Can:

- Manage Plans
- Track Revenue
- Monitor Usage

Platform Can:

- Generate Invoices
- Track Usage
- Track Revenue
- Track Engagement

---

# Deliverables

- Subscription Engine
- Billing Engine
- Invoice Engine
- Revenue Dashboard
- Website Analytics
- Digital Twin Analytics
- SDK Analytics
- Storage Analytics

---

# Future Dependencies

Phase 10 Enterprise Scaling & White Label Platform
