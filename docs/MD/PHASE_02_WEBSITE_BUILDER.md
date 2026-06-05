# PHASE_02_WEBSITE_BUILDER.md

# AI Powered Real Estate Virtual Experience Platform
## Phase 02 - Dynamic Website Builder (Shopify for Builders)

Version: 1.0
Owner: Founding Team
Status: Planning

---

# Vision

Create a no-code website builder specifically for real-estate builders.

The builder should be able to create, edit, publish, and manage websites without developers.

This is not a generic website builder.

It is optimized for:

- Builders
- Real Estate Projects
- Residential Projects
- Commercial Projects
- Digital Twin Integration

---

# Business Goal

A builder should be able to:

- Create website pages
- Add sections
- Remove sections
- Reorder sections
- Change colors
- Change typography
- Configure animations
- Configure buttons
- Publish website

Without writing code.

---

# Product Goal

Create:

- Page Builder
- Theme Builder
- Component Builder
- Animation Builder
- Navigation Builder
- Template System

---

# Website Builder Architecture

Builder Dashboard
    ↓
Website Builder Engine
    ↓
JSON Layout Storage
    ↓
Dynamic Website Renderer
    ↓
Published Builder Website

---

# Core Modules

## Page Builder

Purpose:

Allow builders to manage pages.

Pages:

- Home
- About
- Projects
- Project Details
- Amenities
- Contact
- Virtual Tour

Features:

- Create Page
- Duplicate Page
- Delete Page
- Draft Page
- Publish Page

---

# Database

## pages

Fields:

id
tenant_id
title
slug
status
seo_title
seo_description
created_at
updated_at

---

# APIs

GET /pages

POST /pages

PUT /pages/:id

DELETE /pages/:id

---

# Section Builder

Purpose:

Allow pages to be assembled using reusable sections.

Examples:

- Hero
- Features
- Gallery
- Amenities
- Testimonials
- CTA
- Contact Form
- Video Section
- Virtual Tour Section

---

# Database

## website_sections

Fields:

id
page_id
type
order_no
config_json

---

# Example Config

{
  "title": "Luxury Living",
  "subtitle": "Premium Homes",
  "buttonText": "Book Site Visit"
}

---

# Component Library

Purpose:

Reusable components.

Components:

- Text
- Button
- Card
- Image
- Video
- Form
- Carousel
- Counter
- Testimonial

---

# Database

## components

Fields:

id
tenant_id
component_type
config_json

---

# Drag & Drop Builder

Purpose:

Allow visual page editing.

Features:

- Move Section Up
- Move Section Down
- Drag Section
- Duplicate Section
- Delete Section

Recommended Library:

dnd-kit

---

# Theme Builder

Purpose:

Control branding.

Builder Can Change:

- Primary Color
- Secondary Color
- Typography
- Buttons
- Cards
- Header Style
- Footer Style

---

# Database

## themes

Fields:

id
tenant_id
theme_name
primary_color
secondary_color
font_family
button_style
card_style

---

# Animation Builder

Purpose:

Configure GSAP animations visually.

Builder Never Writes GSAP.

Builder Selects:

- Fade Up
- Fade Down
- Fade Left
- Fade Right
- Scale
- Zoom
- Rotate
- Parallax

---

# Database

## animation_presets

Fields:

id
name
type
duration
delay
easing

---

# Example

{
  "animation": "fade-up",
  "duration": 1.2,
  "delay": 0.3
}

---

# Button Builder

Builder Can Configure:

- Text
- Size
- Width
- Color
- Radius
- Position

Options:

- Left
- Center
- Right

Internally Stored:

{
  "alignment": "center"
}

---

# Layout Builder

Purpose:

Control section layouts.

Layouts:

- Single Column
- Two Column
- Three Column
- Grid
- Masonry

---

# Navigation Builder

Builder Can Manage:

- Header Menus
- Footer Menus
- Mobile Menus

---

# Database

## navigation_menus

id
tenant_id
name

## navigation_items

id
menu_id
title
url
order_no

---

# SEO Module

Builder Can Configure:

- Meta Title
- Meta Description
- Open Graph
- Canonical URL

---

# Template System

Provide Templates:

- Luxury Builder
- Commercial Builder
- Township Builder
- Premium Villa Builder

---

# Media Integration

Connect To:

- Media Library
- Image Library
- Video Library

---

# Digital Twin Ready Components

Create Future Components:

- Building Viewer
- Floor Viewer
- Flat Viewer
- Virtual Tour CTA

These will connect in future phases.

---

# Permissions

Builder Admin

- Full Website Access

Builder Staff

- Content Editing

Sales User

- Read Only

---

# APIs Required

Page API

Section API

Component API

Theme API

Animation API

Navigation API

SEO API

Template API

---

# Acceptance Criteria

Builder Can:

- Create Pages
- Edit Pages
- Reorder Sections
- Configure Themes
- Configure Animations
- Configure Menus
- Publish Website

Without Developer Assistance.

---

# Deliverables

- Dynamic Website Engine
- Visual Website Builder
- Theme Builder
- Animation Builder
- Navigation Builder
- Template System
- Publishing System

---

# Future Dependencies

Phase 03 CRM & Inventory

Phase 04 Digital Twin Platform

Phase 05 SDK & Embeds
