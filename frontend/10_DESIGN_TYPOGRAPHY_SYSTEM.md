# 10_DESIGN_TYPOGRAPHY_SYSTEM.md

Version: 1.0
Status: Design Freeze

---

# Purpose

This document defines the ONLY typography system allowed in the project.

Every page.

Every component.

Every button.

Every card.

Every dialog.

Must follow this specification.

No component may choose its own font.

---

# Typography Philosophy

The interface should communicate:

- Premium
- Calm
- Academic
- AI-first
- Professional

Typography should feel closer to:

- Notion
- Linear
- ChatGPT
- Vercel

NOT

- Newspaper
- Blog
- Magazine
- Research Portal

---

# Font Families

Only these three fonts are allowed.

## Display

Instrument Serif

Usage

- Hero Title
- Login Title
- Library Title
- Page Title
- Major Empty State Title

Never use Instrument Serif anywhere else.

---

## Sans

Inter

Usage

- Navigation
- Buttons
- Cards
- Forms
- Tables
- Paragraphs
- Search
- Dialogs
- Chat
- Metadata Labels
- Everything else

Inter is the default font.

---

## Mono

JetBrains Mono

Usage

- Badge
- Status
- Tags
- Date
- File Type
- Technical Metadata
- Timeline Labels
- Version
- Document ID

Never use JetBrains Mono for paragraphs.

---

# Typography Scale

Display XL

48px
700

Display L

40px
700

Display M

32px
700

Page Heading

28px
600

Section Heading

22px
600

Card Title

18px
600

Body Large

16px
400

Body

15px
400

Small

14px
400

Caption

13px
400

Mono Label

12px
500

Badge

11px
500

---

# Component Mapping

Login

Hero Title

Instrument Serif

Subtitle

Inter

Input

Inter

Button

Inter

Footer

JetBrains Mono

---

Navigation

Logo

Inter

Menu

Inter

Role

JetBrains Mono

Avatar Name

Inter

---

Library

Page Title

Instrument Serif

Description

Inter

Search

Inter

Filter

Inter

Category Chip

Inter

Document Title

Inter

Subject

JetBrains Mono

Tags

JetBrains Mono

Author

Inter

Date

JetBrains Mono

PDF Badge

JetBrains Mono

---

Document Detail

Title

Instrument Serif

Description

Inter

Metadata

Inter

Metadata Label

JetBrains Mono

Timeline

JetBrains Mono

Buttons

Inter

---

My Documents

Table Header

JetBrains Mono

Table Cell

Inter

Status

JetBrains Mono

Actions

Inter

---

Upload

Title

Instrument Serif

Labels

Inter

Input

Inter

Stepper

JetBrains Mono

Buttons

Inter

---

Admin

Page Title

Instrument Serif

Table Header

JetBrains Mono

Table Cell

Inter

Buttons

Inter

Reject Reason

Inter

Timeline

JetBrains Mono

---

RAG Chat

Chat Header

Inter

Question

Inter

Answer

Inter

Citation

JetBrains Mono

Page Number

JetBrains Mono

Status

JetBrains Mono

Input

Inter

Suggested Question

Inter

---

# Forbidden Typography

Never use Instrument Serif for

- Cards
- Tables
- Buttons
- Forms
- Chat
- Search
- Navigation
- Metadata
- Tags

Never use JetBrains Mono for

- Paragraph
- Description
- Card Title
- Navigation
- Hero

---

# Font Weights

Hero

700

Page Title

600

Section

600

Card Title

600

Body

400

Button

500

Badge

500

Metadata

400

---

# Spacing Rules

Hero

16px

Title -> Description

12px

Description -> Search

28px

Search -> Filter

20px

Filter -> Cards

32px

Card

Title -> Metadata

12px

Metadata -> Tags

12px

Tags -> Footer

16px

---

# Validation Checklist

Before merging any UI:

- Hero uses Instrument Serif
- Card Title uses Inter
- Body uses Inter
- Navigation uses Inter
- Metadata uses JetBrains Mono
- Badge uses JetBrains Mono
- Status uses JetBrains Mono
- No component overrides fonts
- No inline font-family
- No random typography

If any item fails

The UI is considered inconsistent.

It must be corrected before implementation.
