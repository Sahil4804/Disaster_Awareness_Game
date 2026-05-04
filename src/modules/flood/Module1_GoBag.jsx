/**
 * Module 1 — The Go-Bag Challenge (Indian NDMA/IMD Edition)
 * Style: 2D Side-Scrolling Platformer — Fireboy & Watergirl inspired
 * Navigate a cross-section of a 2-floor Indian household.
 * Arrow keys / WASD to move + jump. E / Space to pick up items.
 * 60s timer, 12 kg weight limit. NDMA & IMD aligned.
 */
import { useState, useEffect, useRef } from 'react'
import { useGame } from '../../context/GameContext'
import Narrator from '../../components/Narrator'

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════
const MAX_WEIGHT = 12
const TIMER_START = 120
const PLAYER_W = 24
const PLAYER_H = 40
const WALK_SPEED = 230
const JUMP_VEL = 480
const GRAVITY = 980
const PICKUP_RANGE = 65
const WORLD_W = 1700
const WORLD_H = 950
const CAM_LERP = 0.08
const ITEM_SIZE = 46

// ═══════════════════════════s════════════════════════════════════
// WORLD LAYOUT — cross-section of a 2-floor Indian house
// ═══════════════════════════════════════════════════════════════
const ROOMS = [
  { id: 'Hall', name: 'Hall / Verandah', x: 20, y: 400, w: 700, h: 300, wall: '#f5e6d3', trim: '#d4a574' },
  { id: 'Kitchen', name: 'Kitchen', x: 860, y: 400, w: 800, h: 300, wall: '#d4edda', trim: '#a3cfbb' },
  { id: 'Puja', name: 'Puja Room', x: 20, y: 65, w: 360, h: 305, wall: '#fce4c4', trim: '#e8c89e' },
  { id: 'Bedroom', name: 'Bedroom', x: 390, y: 65, w: 340, h: 305, wall: '#e8dff5', trim: '#c4b5fd' },
  { id: 'Bathroom', name: 'Bathroom', x: 860, y: 65, w: 400, h: 305, wall: '#d1ecf1', trim: '#9ed5e5' },
  { id: 'Store', name: 'Store Room', x: 1270, y: 65, w: 390, h: 305, wall: '#e2e3e5', trim: '#b0b2b5' },
  { id: 'Stairs', name: 'Staircase', x: 735, y: 65, w: 120, h: 635, wall: '#d6cfc7', trim: '#b5a99a' },
]

const PLATFORMS = [
  { x: 20, y: 700, w: 1640, h: 20 },
  { x: 20, y: 370, w: 720, h: 20 },
  { x: 860, y: 370, w: 800, h: 20 },
  { x: 760, y: 620, w: 140, h: 14 },
  { x: 790, y: 540, w: 140, h: 14 },
  { x: 720, y: 460, w: 200, h: 14 },
  { x: 1000, y: 600, w: 280, h: 10 },
  { x: 60, y: 270, w: 140, h: 8 },
  { x: 430, y: 270, w: 140, h: 8 },
  { x: 1000, y: 270, w: 120, h: 8 },
  { x: 1370, y: 270, w: 150, h: 8 },
]

const WALLS_VIS = [
  { x: 378, y: 65, w: 12, h: 190 },
  { x: 1258, y: 65, w: 12, h: 190 },
  { x: 720, y: 400, w: 15, h: 180 },
  { x: 845, y: 400, w: 15, h: 180 },
  { x: 8, y: 50, w: 14, h: 670 },
  { x: 1658, y: 50, w: 14, h: 670 },
]

// Legacy FURNITURE rectangles removed — see FURNITURE_PIECES + SVG sprites below.

const DECOR = [
  // Ceiling fans
  { e: '🪭', x: 350, y: 420, s: 36, spin: 1 },
  { e: '🪭', x: 1200, y: 420, s: 36, spin: 1 },
  { e: '🪭', x: 180, y: 80, s: 30, spin: 1 },
  { e: '🪭', x: 540, y: 80, s: 30, spin: 1 },
  { e: '🪭', x: 1100, y: 80, s: 30, spin: 1 },
  { e: '🪭', x: 1450, y: 80, s: 30, spin: 1 },
  // Hall
  { e: '📅', x: 100, y: 430, s: 26 },
  { e: '🖼️', x: 580, y: 440, s: 28 },
  { e: '🌿', x: 35, y: 685, s: 22 },
  { e: '🪑', x: 365, y: 688, s: 18 },
  { e: '🪑', x: 465, y: 688, s: 18 },
  // Kitchen
  { e: '🔥', x: 985, y: 642, s: 18 },
  { e: '🔥', x: 1010, y: 642, s: 18 },
  { e: '🧅', x: 1350, y: 685, s: 16 },
  { e: '🍅', x: 1330, y: 688, s: 14 },
  // Bedroom
  { e: '🪞', x: 700, y: 200, s: 22 },
  { e: '📸', x: 420, y: 120, s: 22 },
  { e: '🛏️', x: 520, y: 325, s: 20 },
  // Bathroom
  { e: '🚿', x: 1200, y: 100, s: 32 },
  { e: '🧼', x: 1200, y: 348, s: 16 },
  // Store
  { e: '🕸️', x: 1600, y: 80, s: 28 },
  { e: '🔧', x: 1550, y: 180, s: 22 },
  // Puja
  { e: '🪔', x: 120, y: 288, s: 24 },
  { e: '🪔', x: 190, y: 288, s: 24 },
  { e: '🔔', x: 70, y: 100, s: 24 },
  { e: '🙏', x: 150, y: 140, s: 28 },
  { e: '🌸', x: 260, y: 100, s: 18 },
]

// ═══════════════════════════════════════════════════════════════
// CATALOGUE — items with world-space coordinates
// ═══════════════════════════════════════════════════════════════
const CATALOGUE = [
  // ── HALL ── TV on TV stand, fan on side table
  {
    id: 'h1', room: 'Hall', wx: 305, wy: 600, emoji: '📺', name: '55" Smart TV', sz: 56,
    cat: 'VALUABLES', wt: 8.0, util: 3, trap: true,
    tip: 'Expensive, sentimental, impossible to carry. Insurance covers it — evacuate light.'
  },
  {
    id: 'n4', room: 'Hall', wx: 498, wy: 625, emoji: '🪭', name: 'Table Fan', sz: 42,
    cat: 'VALUABLES', wt: 3.0, util: 5, trap: true,
    tip: '3 kg of plastic and copper. No electricity during floods — completely useless weight.'
  },

  // ── KITCHEN — on counter slab (top at y≈595) ──
  {
    id: 'w1', room: 'Kitchen', wx: 985, wy: 575, emoji: '🍶', name: 'Milton Bottle 1L', sz: 36,
    cat: 'WATER', wt: 1.0, util: 90, trap: false,
    tip: 'Pre-filled clean drinking water — NDMA-recommended hydration baseline.'
  },
  {
    id: 'w2', room: 'Kitchen', wx: 1040, wy: 578, emoji: '💊', name: 'Aquatabs Strip', sz: 28,
    cat: 'WATER', wt: 0.05, util: 88, trap: false,
    tip: 'Chlorine tablets — purify floodwater in 30 min. Stops cholera and typhoid.'
  },
  {
    id: 'w3', room: 'Kitchen', wx: 1095, wy: 575, emoji: '💧', name: 'LifeStraw Filter', sz: 34,
    cat: 'WATER', wt: 0.1, util: 96, trap: false,
    tip: 'Filters 1,000 L of any water. Outweighs ten heavy bottles in utility.'
  },
  {
    id: 'f1', room: 'Kitchen', wx: 1150, wy: 578, emoji: '🧂', name: 'ORS Sachets ×5', sz: 30,
    cat: 'FOOD', wt: 0.1, util: 96, trap: false,
    tip: 'Oral Rehydration Salts — IMD lists dehydration as the #1 post-flood killer.'
  },
  {
    id: 'n5', room: 'Kitchen', wx: 1210, wy: 575, emoji: '🥡', name: 'Plastic Tiffin Box', sz: 34,
    cat: 'FOOD', wt: 0.2, util: 65, trap: false,
    tip: 'Compact, airtight food container. Keeps biscuits and ORS dry in floodwater.'
  },

  // ── KITCHEN — on stove area ──
  {
    id: 'n1', room: 'Kitchen', wx: 1265, wy: 575, emoji: '♨️', name: 'Pressure Cooker', sz: 44,
    cat: 'TOOLS', wt: 3.5, util: 8, trap: true,
    tip: '3.5 kg of aluminium. Needs gas, water, and time you don\'t have. Relief camps cook for you.'
  },

  // ── KITCHEN — near fridge / floor ──
  {
    id: 'w4', room: 'Kitchen', wx: 1545, wy: 670, emoji: '🪣', name: 'Bisleri 2L Bottle', sz: 42,
    cat: 'WATER', wt: 2.0, util: 45, trap: true,
    tip: 'Heavy pre-filled water. Filter the flood instead — do not haul litres.'
  },
  {
    id: 'f2', room: 'Kitchen', wx: 900, wy: 670, emoji: '🍪', name: 'Parle-G Packs ×3', sz: 34,
    cat: 'FOOD', wt: 0.45, util: 80, trap: false,
    tip: '6-month shelf life, high-calorie, eat dry. NDMA dry-food staple.'
  },
  {
    id: 'f3', room: 'Kitchen', wx: 1380, wy: 670, emoji: '🍬', name: 'Glucose Biscuits', sz: 32,
    cat: 'FOOD', wt: 0.3, util: 76, trap: false,
    tip: 'Quick sugar for shock and weakness. Child-friendly, compact.'
  },
  {
    id: 'n2', room: 'Kitchen', wx: 1310, wy: 670, emoji: '🍽️', name: 'Steel Thali Set', sz: 42,
    cat: 'TOOLS', wt: 2.0, util: 8, trap: true,
    tip: '2 kg of steel plates. Relief camps provide utensils. Don\'t carry your kitchen.'
  },

  // ── KITCHEN — on floor shelf (heavy bags) ──
  {
    id: 'f4', room: 'Kitchen', wx: 1470, wy: 652, emoji: '🍚', name: 'Rice Bag 10 kg', sz: 54,
    cat: 'FOOD', wt: 10.0, util: 15, trap: true,
    tip: 'You cannot evacuate with 10 kg of rice. It needs cooking — useless wet.'
  },
  {
    id: 'f5', room: 'Kitchen', wx: 1540, wy: 652, emoji: '🌾', name: 'Atta Flour 10 kg', sz: 54,
    cat: 'FOOD', wt: 10.0, util: 12, trap: true,
    tip: 'Heaviest trap in the game. Needs fire + water + pan — you have none.'
  },
  {
    id: 'f6', room: 'Kitchen', wx: 1610, wy: 665, emoji: '🧈', name: 'Ghee Tin', sz: 36,
    cat: 'FOOD', wt: 1.2, util: 22, trap: true,
    tip: 'Oily, leaks in a bag, no direct survival use. 1.2 kg wasted.'
  },

  // ── BEDROOM — hanging in wardrobe (shelf wy≈238) ──
  {
    id: 'c6', room: 'Bedroom', wx: 695, wy: 170, emoji: '🧣', name: 'Wool Shawl', sz: 34,
    cat: 'CLOTHING', wt: 1.5, util: 30, trap: true,
    tip: 'Absorbs 3× its weight in water. Takes days to dry. TRAP.'
  },
  {
    id: 'c7', room: 'Bedroom', wx: 695, wy: 240, emoji: '👘', name: 'Embroidered Saree', sz: 36,
    cat: 'CLOTHING', wt: 1.8, util: 10, trap: true,
    tip: 'Heavy, delicate, impossible to move in. Sentimental trap.'
  },
  {
    id: 'n3', room: 'Bedroom', wx: 695, wy: 310, emoji: '📸', name: 'Old Photo Album', sz: 34,
    cat: 'VALUABLES', wt: 1.5, util: 12, trap: true,
    tip: '1.5 kg of memories. Back up photos digitally — cloud survives, albums don\'t.'
  },

  // ── BEDROOM — on bed / bedside / floor ──
  {
    id: 'c1', room: 'Bedroom', wx: 450, wy: 298, emoji: '👖', name: 'Quick-Dry Pants', sz: 34,
    cat: 'CLOTHING', wt: 0.3, util: 80, trap: false,
    tip: 'Synthetic, dries in 30 min. Essential for monsoon evacuation.'
  },
  {
    id: 'c2', room: 'Bedroom', wx: 510, wy: 298, emoji: '👕', name: 'Cotton Kurta', sz: 34,
    cat: 'CLOTHING', wt: 0.25, util: 75, trap: false,
    tip: 'Light, breathable, fast-drying in humid post-flood air.'
  },
  {
    id: 'c3', room: 'Bedroom', wx: 570, wy: 298, emoji: '🧥', name: 'Raincoat / Poncho', sz: 38,
    cat: 'CLOTHING', wt: 0.4, util: 92, trap: false,
    tip: 'Monsoon is active. Without a waterproof outer, hypothermia is real.'
  },
  {
    id: 'c4', room: 'Bedroom', wx: 435, wy: 338, emoji: '👟', name: 'Sports Shoes', sz: 36,
    cat: 'CLOTHING', wt: 0.9, util: 85, trap: false,
    tip: 'Closed shoes shield from glass, nails, snakes hidden in floodwater.'
  },
  {
    id: 'c5', room: 'Bedroom', wx: 630, wy: 298, emoji: '🩲', name: 'Undergarments Pack', sz: 30,
    cat: 'CLOTHING', wt: 0.2, util: 70, trap: false,
    tip: 'Three changes. Dry underwear prevents rashes and skin infections.'
  },
  {
    id: 'c8', room: 'Bedroom', wx: 530, wy: 338, emoji: '👞', name: 'Leather Shoes ×2', sz: 38,
    cat: 'CLOTHING', wt: 2.2, util: 15, trap: true,
    tip: 'Leather ruins in water. 4-5 days to dry. Skip them.'
  },

  // ── BATHROOM — on/in medicine cabinet (wy≈220) ──
  {
    id: 'm4', room: 'Bathroom', wx: 1100, wy: 225, emoji: '🧴', name: 'Dettol 500 ml', sz: 34,
    cat: 'MEDICAL', wt: 0.55, util: 62, trap: false,
    tip: 'Antiseptic for wound cleaning. A smaller bottle would be wiser.'
  },
  {
    id: 'm5', room: 'Bathroom', wx: 1145, wy: 228, emoji: '😷', name: 'N95 Masks ×5', sz: 30,
    cat: 'MEDICAL', wt: 0.15, util: 75, trap: false,
    tip: 'Floodwater evaporates sewage aerosols. Protect your lungs.'
  },
  {
    id: 'm7', room: 'Bathroom', wx: 1120, wy: 260, emoji: '💉', name: 'Full Medicine Cabinet', sz: 48,
    cat: 'MEDICAL', wt: 4.5, util: 35, trap: true,
    tip: '90% is irrelevant. Grab your personal strip — not the whole cabinet.'
  },

  // ── BATHROOM — near basin / floor ──
  {
    id: 'm1', room: 'Bathroom', wx: 990, wy: 338, emoji: '💊', name: 'Prescription Meds', sz: 30,
    cat: 'MEDICAL', wt: 0.2, util: 98, trap: false,
    tip: 'BP, diabetes, epilepsy meds are irreplaceable post-disaster. Pack FIRST.'
  },
  {
    id: 'm2', room: 'Bathroom', wx: 1060, wy: 338, emoji: '🩹', name: 'First Aid Kit', sz: 38,
    cat: 'MEDICAL', wt: 0.6, util: 88, trap: false,
    tip: 'Bandages + antiseptic. Debris cuts get infected fast in dirty water.'
  },
  {
    id: 'm3', room: 'Bathroom', wx: 1130, wy: 340, emoji: '🦟', name: 'Odomos Cream', sz: 26,
    cat: 'MEDICAL', wt: 0.1, util: 85, trap: false,
    tip: 'IMD flags a post-flood malaria/dengue surge. This 100 g tube is essential.'
  },
  {
    id: 'm6', room: 'Bathroom', wx: 900, wy: 338, emoji: '🕸️', name: 'Mosquito Net (Compact)', sz: 34,
    cat: 'MEDICAL', wt: 0.6, util: 80, trap: false,
    tip: 'Shelter sleep = malaria-free sleep. Folds to pocket size.'
  },

  // ── STORE ROOM — on shelf unit (top = y≈272) ──
  {
    id: 't2', room: 'Store', wx: 1320, wy: 255, emoji: '📻', name: 'Hand-Crank Radio', sz: 36,
    cat: 'TOOLS', wt: 0.6, util: 80, trap: false,
    tip: 'IMD/NDMA broadcast evacuation alerts on AM even when towers fail.'
  },
  {
    id: 't3', room: 'Store', wx: 1390, wy: 255, emoji: '🔋', name: 'Power Bank 10,000 mAh', sz: 32,
    cat: 'TOOLS', wt: 0.4, util: 75, trap: false,
    tip: '4-5 phone charges. Critical for 112/SOS calls during outages.'
  },
  {
    id: 't4', room: 'Store', wx: 1450, wy: 258, emoji: '📣', name: 'Emergency Whistle', sz: 24,
    cat: 'TOOLS', wt: 0.03, util: 72, trap: false,
    tip: 'Audible at 1 km. At 30 g there is zero excuse not to pack it.'
  },

  // ── STORE ROOM — floor ──
  {
    id: 't1', room: 'Store', wx: 1300, wy: 340, emoji: '🔦', name: 'Battery Torch', sz: 34,
    cat: 'TOOLS', wt: 0.3, util: 92, trap: false,
    tip: 'Power fails in every flood. NDMA\'s #1 mandatory item.'
  },
  {
    id: 't5', room: 'Store', wx: 1380, wy: 340, emoji: '🪢', name: 'Paracord Rope 30 m', sz: 36,
    cat: 'TOOLS', wt: 0.4, util: 72, trap: false,
    tip: 'Tether family, haul supplies, build shelter. 550 lb tensile strength.'
  },
  {
    id: 't6', room: 'Store', wx: 1460, wy: 340, emoji: '🪣', name: 'Steel Bucket', sz: 42,
    cat: 'TOOLS', wt: 2.0, util: 15, trap: true,
    tip: '2 kg of steel. Shelters have buckets — do not carry yours.'
  },
  {
    id: 't7', room: 'Store', wx: 1540, wy: 340, emoji: '🍳', name: 'Steel Utensil Set', sz: 44,
    cat: 'TOOLS', wt: 4.5, util: 10, trap: true,
    tip: 'Relief camps have kitchens. 4.5 kg of steel will drown you.'
  },
  {
    id: 't8', room: 'Store', wx: 1620, wy: 340, emoji: '🖥️', name: 'Desktop PC Tower', sz: 54,
    cat: 'VALUABLES', wt: 8.0, util: 5, trap: true,
    tip: 'Back up to cloud, not to your back. 8 kg of sentimental trap.'
  },

  // ── PUJA ROOM — on puja table (top = y≈292) ──
  {
    id: 'd4', room: 'Puja', wx: 110, wy: 275, emoji: '👑', name: 'Gold Jewelry Set', sz: 32,
    cat: 'VALUABLES', wt: 1.2, util: 28, trap: true,
    tip: 'Heavy, conspicuous, a theft target at shelters. Lock it at home.'
  },
  {
    id: 'd5', room: 'Puja', wx: 180, wy: 272, emoji: '🕉️', name: 'Brass Idol', sz: 40,
    cat: 'VALUABLES', wt: 2.5, util: 5, trap: true,
    tip: 'Faith travels in the heart, not in 2.5 kg of brass. NDMA prioritises people.'
  },

  // ── PUJA ROOM — in side almirah / floor ──
  {
    id: 'd1', room: 'Puja', wx: 275, wy: 300, emoji: '📄', name: 'Waterproof Doc Pouch', sz: 30,
    cat: 'DOCS', wt: 0.15, util: 98, trap: false,
    tip: 'Aadhaar · PAN · passports · insurance. Without it, relief camps cannot register you.'
  },
  {
    id: 'd2', room: 'Puja', wx: 275, wy: 340, emoji: '💵', name: 'Cash Bundle ₹10,000', sz: 28,
    cat: 'DOCS', wt: 0.1, util: 85, trap: false,
    tip: 'UPI fails when towers go down. Cash buys water, transport, medicine.'
  },
  {
    id: 'd3', room: 'Puja', wx: 60, wy: 340, emoji: '🔐', name: 'Jewelry Lockbox', sz: 42,
    cat: 'VALUABLES', wt: 3.5, util: 15, trap: true,
    tip: '3.5 kg of steel. Insurance covers this — your life does not come back.'
  },

  // ═══ FAMILY KIT — Ready.gov-inspired: pack for EVERYONE, not just yourself ═══
  // ── BEDROOM — bedside / bed ──
  {
    id: 'm8', room: 'Bedroom', wx: 415, wy: 322, emoji: '👓', name: 'Spare Eyeglasses', sz: 28,
    cat: 'MEDICAL', wt: 0.05, util: 92, trap: false, persona: 'elder',
    tip: 'For grandparents who cannot see without them. 50 g in a hard case — losing them at a shelter is a real medical risk.'
  },
  {
    id: 't9', room: 'Bedroom', wx: 600, wy: 298, emoji: '🔌', name: 'Phone Charger Cable', sz: 30,
    cat: 'TOOLS', wt: 0.1, util: 85, trap: false,
    tip: 'NDMA helpline 1078, emergency 112. A dead phone is a silent phone — pack the cable, not just the powerbank.'
  },
  {
    id: 'p1', room: 'Bedroom', wx: 475, wy: 298, emoji: '🧸', name: "Child's Comfort Toy", sz: 32,
    cat: 'VALUABLES', wt: 0.15, util: 68, trap: false, persona: 'child',
    tip: 'Kids panic in shelters. A familiar teddy = sleep, calm, less crying. Tiny weight, huge psychological relief.'
  },

  // ── BATHROOM — cabinet / floor ──
  {
    id: 'm9', room: 'Bathroom', wx: 1083, wy: 225, emoji: '🧴', name: 'Hand Sanitizer 50 ml', sz: 28,
    cat: 'MEDICAL', wt: 0.06, util: 78, trap: false,
    tip: 'No clean water at relief camps for hand-washing. Sanitiser stops cholera, typhoid, hepatitis A from spreading.'
  },
  {
    id: 'm10', room: 'Bathroom', wx: 1245, wy: 340, emoji: '🩸', name: 'Sanitary Pads ×10', sz: 32,
    cat: 'MEDICAL', wt: 0.2, util: 90, trap: false, persona: 'woman',
    tip: 'NDMA reports menstrual hygiene supplies run out within 24 h at shelters. A 5-day pack is non-negotiable for women and girls.'
  },
  {
    id: 'p2', room: 'Bathroom', wx: 875, wy: 340, emoji: '🍼', name: 'Baby Diapers + Formula', sz: 36,
    cat: 'MEDICAL', wt: 1.2, util: 95, trap: false, persona: 'infant',
    tip: 'Infants cannot wait for relief. 24 hours of formula + diapers keeps a baby alive, dry, and quiet on the move.'
  },

  // ── STORE ROOM — shelf / boxes / floor ──
  {
    id: 't10', room: 'Store', wx: 1525, wy: 288, emoji: '🛠️', name: 'Multi-tool / Swiss Knife', sz: 30,
    cat: 'TOOLS', wt: 0.18, util: 84, trap: false,
    tip: 'Knife, screwdriver, pliers, can-opener — six tools in 180 g. NDMA shelter-kit standard for any family.'
  },
  {
    id: 't11', room: 'Store', wx: 1300, wy: 255, emoji: '🔥', name: 'Waterproof Matches', sz: 26,
    cat: 'TOOLS', wt: 0.05, util: 70, trap: false,
    tip: 'Boil water, light a stove, signal at night. 50 g of fire — irreplaceable when the grid is gone.'
  },
  {
    id: 't12', room: 'Store', wx: 1580, wy: 308, emoji: '🔋', name: 'Spare AA Batteries ×8', sz: 30,
    cat: 'TOOLS', wt: 0.2, util: 82, trap: false,
    tip: 'Your torch and radio die on day 2 without these. 8 AA cells = 200 g and many extra hours of light.'
  },
  {
    id: 'p3', room: 'Store', wx: 1340, wy: 340, emoji: '🐕', name: 'Pet Food + Leash', sz: 34,
    cat: 'FOOD', wt: 0.7, util: 80, trap: false, persona: 'pet',
    tip: 'Many shelters refuse pets without a leash and food. Don\'t leave a family member behind — pack a 24 h supply.'
  },

  // ── PUJA ROOM — small almirah top ──
  {
    id: 'd6', room: 'Puja', wx: 290, wy: 300, emoji: '🗺️', name: 'Local Shelter Map', sz: 30,
    cat: 'DOCS', wt: 0.05, util: 78, trap: false,
    tip: 'NDMA shelters and high ground marked in pen. GPS dies, paper does not. Know the safe route before the road floods.'
  },
]

// ═══════════════════════════════════════════════════════════════
// (Legacy game-icons.net mappings removed — items now use full-colour
// OpenMoji SVG illustrations served from /public/assets/emoji/.)
// ═══════════════════════════════════════════════════════════════

// Per-room subtle wallpaper texture (overlaid on r.wall colour)
const ROOM_TEX = {
  Hall:    'repeating-linear-gradient(0deg, transparent 0 28px, rgba(120,80,30,0.07) 28px 30px)',
  Kitchen: 'repeating-linear-gradient(90deg, transparent 0 32px, rgba(40,100,60,0.08) 32px 34px), repeating-linear-gradient(0deg, transparent 0 32px, rgba(40,100,60,0.06) 32px 34px)',
  Puja:    'repeating-linear-gradient(0deg, transparent 0 24px, rgba(180,120,40,0.08) 24px 26px)',
  Bedroom: 'repeating-linear-gradient(45deg, transparent 0 18px, rgba(120,80,200,0.06) 18px 20px)',
  Bathroom:'repeating-linear-gradient(90deg, transparent 0 30px, rgba(50,120,160,0.10) 30px 32px), repeating-linear-gradient(0deg, transparent 0 30px, rgba(50,120,160,0.10) 30px 32px)',
  Store:   'repeating-linear-gradient(0deg, transparent 0 20px, rgba(0,0,0,0.07) 20px 22px)',
  Stairs:  'repeating-linear-gradient(0deg, #d6cfc7 0 16px, #b5a99a 16px 18px, #d6cfc7 18px 32px)',
}

// Wood-plank floor texture for the major platforms
const WOOD_FLOOR = 'repeating-linear-gradient(90deg, rgba(0,0,0,0.22) 0 1px, transparent 1px 72px), linear-gradient(180deg, #6B4226 0%, #5C3618 100%)'

// ═══════════════════════════════════════════════════════════════
// FURNITURE — each piece is positioned by world coords, sized to its
// rectangle, and rendered as a `kind` to a real SVG illustration.
// (Replaces the flat colour rectangles + faint silhouette decals.)
// ═══════════════════════════════════════════════════════════════
const FURNITURE_PIECES = [
  // ── HALL ──
  { kind: 'tvStand',     x: 250,  y: 600, w: 110, h: 92 },
  { kind: 'sideTable',   x: 460,  y: 640, w: 80,  h: 50 },
  { kind: 'sofa',        x: 90,   y: 612, w: 200, h: 78 },
  { kind: 'diningSet',   x: 350,  y: 620, w: 160, h: 72 },
  { kind: 'shoeRack',    x: 38,   y: 668, w: 64,  h: 26 },
  { kind: 'tallAlmirah', x: 595,  y: 478, w: 70,  h: 214 },
  // ── KITCHEN ──
  { kind: 'kitchenSlab', x: 950,  y: 588, w: 340, h: 104 },
  { kind: 'fridge',      x: 1525, y: 498, w: 70,  h: 196 },
  { kind: 'sink',        x: 1365, y: 638, w: 70,  h: 56 },
  { kind: 'kitchenShelf',x: 1440, y: 656, w: 200, h: 38 },
  // ── BEDROOM ──
  { kind: 'bed',         x: 425,  y: 305, w: 220, h: 60 },
  { kind: 'wardrobe',    x: 670,  y: 118, w: 62,  h: 248 },
  { kind: 'bedsideTable',x: 405,  y: 326, w: 64,  h: 36 },
  // ── BATHROOM ──
  { kind: 'washingMachine', x: 968, y: 188, w: 74, h: 124 },
  { kind: 'medCabinet',  x: 1078, y: 196, w: 84,  h: 90 },
  { kind: 'bucket',      x: 1188, y: 336, w: 32,  h: 30 },
  // ── STORE ──
  { kind: 'shelfUnit',   x: 1284, y: 270, w: 188, h: 96 },
  { kind: 'cardboardBox',x: 1498, y: 296, w: 54,  h: 68 },
  { kind: 'cardboardBox',x: 1558, y: 318, w: 44,  h: 46 },
  // ── PUJA ──
  { kind: 'pujaAltar',   x: 76,   y: 286, w: 148, h: 78 },
  { kind: 'smallAlmirah',x: 256,  y: 311, w: 66,  h: 52 },
]

// ═══════════════════════════════════════════════════════════════
// WINDOWS, DOORS, PLANTS — atmosphere props
// ═══════════════════════════════════════════════════════════════
const WINDOWS = [
  // upper-floor windows showing rainy sky outside
  { x: 80,   y: 110, w: 60, h: 70 },
  { x: 280,  y: 110, w: 60, h: 70 },
  { x: 460,  y: 110, w: 60, h: 70 },
  { x: 940,  y: 110, w: 60, h: 70 },
  { x: 1170, y: 110, w: 60, h: 70 },
  { x: 1335, y: 110, w: 70, h: 70 },
  { x: 1580, y: 110, w: 60, h: 70 },
  // hall windows
  { x: 230,  y: 460, w: 80, h: 80 },
  { x: 470,  y: 460, w: 80, h: 80 },
]

const PLANTS = [
  { x: 35,   y: 678, h: 24 },
  { x: 705,  y: 690, h: 28 },
  { x: 920,  y: 690, h: 26 },
  { x: 1655, y: 690, h: 22 },
]

const DOORS = [
  // front door at the right edge of the hall
  { x: 670, y: 590, w: 50, h: 110, label: 'EXIT' },
]

const ESSENTIAL_IDS = ['f1', 'c3', 'm1', 't1', 'd1']
const ESSENTIAL_LABELS = {
  f1: 'ORS Sachets', c3: 'Raincoat', m1: 'Prescription Meds',
  t1: 'Battery Torch', d1: 'Document Pouch',
}
const CAT_PLATES = {
  WATER: '#3b82f6', FOOD: '#f97316', CLOTHING: '#a855f7',
  MEDICAL: '#ef4444', TOOLS: '#64748b', DOCS: '#22c55e', VALUABLES: '#eab308',
}

// ═══════════════════════════════════════════════════════════════
// SCORING (unchanged from original — NDMA-aligned)
// ═══════════════════════════════════════════════════════════════
function computeScore(bagIds) {
  const items = CATALOGUE.filter(i => bagIds.includes(i.id))
  const weight = items.reduce((s, i) => s + i.wt, 0)
  const hasCat = cat => items.some(i => i.cat === cat)
  const hasAny = ids => ids.some(id => bagIds.includes(id))
  const missing = ESSENTIAL_IDS.filter(id => !bagIds.includes(id))

  if (weight > MAX_WEIGHT) {
    const score = Math.max(0, Math.round(40 - (weight - MAX_WEIGHT) * 5))
    return {
      passed: false, score, reason: 'overweight', weight,
      headline: "💀 BAG TOO HEAVY — THE TIDE CAUGHT YOU",
      lesson: `Your bag weighed ${weight.toFixed(1)} kg — ${(weight - MAX_WEIGHT).toFixed(1)} kg over the ${MAX_WEIGHT} kg limit. NDMA recommends a single-shoulder kit because Indian flash floods (Kerala 2018, Chennai 2023, Uttarakhand 2013) give minutes, not hours. You could not run.`
    }
  }
  if (!hasAny(['w1', 'w2', 'w3', 'w4', 'f1'])) {
    return {
      passed: false, score: 12, reason: 'no-water', weight,
      headline: '💀 NO WATER — DEHYDRATION CAME FIRST',
      lesson: 'IMD flags post-flood dehydration as the #1 killer. Even one LifeStraw, one Aquatabs strip, or ORS sachets would have changed the outcome.'
    }
  }
  if (!hasCat('MEDICAL')) {
    return {
      passed: false, score: 20, reason: 'no-medical', weight,
      headline: '💀 NO MEDICAL — INFECTION FROM DIRTY WATER',
      lesson: 'Indian floodwater carries cholera, leptospirosis, typhoid. One cut + no antiseptic = sepsis in 48 hours.'
    }
  }
  if (!bagIds.includes('t1')) {
    return {
      passed: false, score: 28, reason: 'no-torch', weight,
      headline: '💀 NO TORCH — LOST IN THE DARK',
      lesson: 'NDMA\'s #1 mandatory item. Indian grids fail within minutes of flooding; most rescues happen after sundown.'
    }
  }
  if (!bagIds.includes('d1')) {
    return {
      passed: false, score: 34, reason: 'no-docs', weight,
      headline: '⚠️ NO DOCUMENTS — STRANDED AT RELIEF CAMP',
      lesson: 'Without Aadhaar/PAN, relief camps cannot register you and insurance claims stall for months. A 150 g waterproof pouch is non-negotiable.'
    }
  }

  const trapItems = items.filter(i => i.trap)
  const smartItems = items.filter(i => !i.trap)
  const avgUtil = items.length ? items.reduce((s, i) => s + i.util, 0) / items.length : 0
  const mobility = Math.round(((MAX_WEIGHT - weight) / MAX_WEIGHT) * 100)
  const utility = Math.round(avgUtil)
  const essential = Math.round(((ESSENTIAL_IDS.length - missing.length) / ESSENTIAL_IDS.length) * 100)

  // Zero-trap bonus: reward players who avoid ALL trap items
  const zeroTrapBonus = (trapItems.length === 0 && smartItems.length >= 5) ? 5 : 0

  const total = Math.min(100, Math.max(40,
    Math.round(mobility * 0.25 + utility * 0.30 + essential * 0.45 + zeroTrapBonus)
  ))
  const passed = total >= 55

  return {
    passed, score: total, weight, reason: passed ? 'pass' : 'suboptimal',
    headline: passed ? '🎒 KIT VALIDATED — EVACUATION READY' : '⚠️ BAG SUBOPTIMAL — REVIEW YOUR LOADOUT',
    lesson: passed
      ? `${weight.toFixed(1)} kg packed · ${smartItems.length} smart picks. ${trapItems.length ? `You still carried ${trapItems.length} trap${trapItems.length > 1 ? 's' : ''} — cut them to score higher.` : 'Zero traps — textbook NDMA evacuation kit.'}`
      : `${trapItems.length} trap item${trapItems.length !== 1 ? 's' : ''} stole ${trapItems.reduce((s, i) => s + i.wt, 0).toFixed(1)} kg of your budget. Missing essentials: ${missing.map(id => ESSENTIAL_LABELS[id]).join(', ') || 'none'}.`,
    trapItems, smartItems, missingEssentials: missing,
  }
}

// ═══════════════════════════════════════════════════════════════
// CSS KEYFRAMES
// ═══════════════════════════════════════════════════════════════
const KEYFRAMES = `
@keyframes bob      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes bob-sm   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
@keyframes spin     { from{transform:rotate(0)} to{transform:rotate(360deg)} }
@keyframes pulse-ring { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.55)} 50%{box-shadow:0 0 0 14px rgba(239,68,68,0)} }
@keyframes danger-edge { 0%,100%{box-shadow:inset 0 0 0 6px rgba(239,68,68,0.4)} 50%{box-shadow:inset 0 0 0 14px rgba(239,68,68,0.75)} }
@keyframes tooltip-in { 0%{opacity:0;transform:translate(-50%,4px)} 100%{opacity:1;transform:translate(-50%,0)} }
@keyframes pop-in   { 0%{transform:scale(0.5);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
@keyframes shake    { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-3px)} 75%{transform:translateX(3px)} }
@keyframes rainAnim { from{transform:translateY(-20px)} to{transform:translateY(0)} }
@keyframes flyToBag {
  0%   { transform: translate(-50%,-50%) scale(1) rotate(0deg); opacity:1 }
  70%  { opacity:1 }
  100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.25) rotate(420deg); opacity:0 }
}
@keyframes fadeIn  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes roomFlash { 0%{opacity:0;transform:translateX(-50%) scale(0.9)} 20%{opacity:1;transform:translateX(-50%) scale(1)} 80%{opacity:1} 100%{opacity:0;transform:translateX(-50%) scale(0.95)} }
`

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

// Convert an emoji like 🔦 to its OpenMoji filename code (e.g. "1F526").
// Strips variation selector U+FE0F so codes match openmoji.org's naming.
function emojiToCode(e) {
  return Array.from(e || '')
    .filter(c => c.codePointAt(0) !== 0xfe0f)
    .map(c => c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'))
    .join('-')
}
const EMOJI_BASE = '/assets/emoji'

// Full-colour OpenMoji illustration of an item — proper game-art look,
// not a platform-rendered emoji glyph.
function ItemIcon({ item, size = 24, style = {} }) {
  const code = emojiToCode(item.emoji)
  return (
    <img
      src={`${EMOJI_BASE}/${code}.svg`}
      alt={item.name || ''}
      draggable={false}
      style={{
        width: size, height: size, display: 'inline-block',
        verticalAlign: 'middle', userSelect: 'none', ...style,
      }}
    />
  )
}

// ═══════════════════════════════════════════════════════════════
// SVG SPRITES — proper illustrations for furniture, windows, plants,
// doors, stairs, and the player. Side-view, cartoon, House-of-Hazards-y.
// Each component fills its container via 100% w/h SVG with viewBox.
// ═══════════════════════════════════════════════════════════════

// helper to render a fixed-size positioned SVG at world coords
function Sprite({ x, y, w, h, z = 6, children, style = {} }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, height: h,
      pointerEvents: 'none', zIndex: z, ...style,
    }}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}
           preserveAspectRatio="none"
           style={{ display: 'block', overflow: 'visible' }}>
        {children}
      </svg>
    </div>
  )
}

// — sofa: cushion + armrests + legs
function Sofa({ w, h }) {
  return (
    <>
      <rect x="2" y={h*0.45} width={w-4} height={h*0.5} rx="8" fill="#7A4A2A" stroke="#3a1f0b" strokeWidth="2"/>
      <rect x="2" y={h*0.20} width={w*0.18} height={h*0.7} rx="6" fill="#8B5A30" stroke="#3a1f0b" strokeWidth="2"/>
      <rect x={w*0.82-2} y={h*0.20} width={w*0.18} height={h*0.7} rx="6" fill="#8B5A30" stroke="#3a1f0b" strokeWidth="2"/>
      <rect x={w*0.20} y={h*0.30} width={w*0.6} height={h*0.35} rx="6" fill="#A66A3D" stroke="#3a1f0b" strokeWidth="1.5"/>
      <line x1={w*0.5} y1={h*0.30} x2={w*0.5} y2={h*0.65} stroke="#5e3618" strokeWidth="1.5"/>
      <rect x={w*0.18} y={h*0.92} width="6" height={h*0.10} fill="#3a1f0b"/>
      <rect x={w*0.82-6} y={h*0.92} width="6" height={h*0.10} fill="#3a1f0b"/>
    </>
  )
}

// — dining table with two chairs
function DiningSet({ w, h }) {
  return (
    <>
      {/* chair behind */}
      <rect x={w*0.72} y={h*0.05} width={w*0.10} height={h*0.55} rx="3" fill="#A0522D" stroke="#3a1f0b" strokeWidth="1.5"/>
      {/* table top */}
      <rect x="0" y={h*0.42} width={w} height={h*0.18} rx="4" fill="#A0522D" stroke="#3a1f0b" strokeWidth="2"/>
      {/* table legs */}
      <rect x={w*0.10} y={h*0.60} width="6" height={h*0.40} fill="#5C2D0E"/>
      <rect x={w*0.85} y={h*0.60} width="6" height={h*0.40} fill="#5C2D0E"/>
      {/* chair front */}
      <rect x={w*0.18} y={h*0.20} width={w*0.10} height={h*0.50} rx="3" fill="#8B4513" stroke="#3a1f0b" strokeWidth="1.5"/>
      {/* placemat + plate */}
      <ellipse cx={w*0.5} cy={h*0.50} rx={w*0.18} ry={h*0.05} fill="#fff8e0"/>
      <circle cx={w*0.5} cy={h*0.50} r={h*0.07} fill="#fff" stroke="#cbd5e1" strokeWidth="1"/>
    </>
  )
}

// — TV stand with TV
function TVStand({ w, h }) {
  return (
    <>
      <rect x="0" y={h*0.35} width={w} height={h*0.55} rx="4" fill="#5C3618" stroke="#2d1f14" strokeWidth="2"/>
      <rect x={w*0.05} y={h*0.55} width={w*0.45} height={h*0.30} rx="2" fill="#3a1f0b"/>
      <rect x={w*0.55} y={h*0.55} width={w*0.40} height={h*0.30} rx="2" fill="#3a1f0b"/>
    </>
  )
}

// — side table
function SideTable({ w, h }) {
  return (
    <>
      <rect x="0" y="0" width={w} height={h*0.18} rx="3" fill="#8B5A2B" stroke="#3a1f0b" strokeWidth="2"/>
      <rect x={w*0.10} y={h*0.18} width="6" height={h*0.82} fill="#5C2D0E"/>
      <rect x={w*0.85} y={h*0.18} width="6" height={h*0.82} fill="#5C2D0E"/>
    </>
  )
}

// — shoe rack
function ShoeRack({ w, h }) {
  return (
    <>
      <rect x="0" y="0" width={w} height={h} rx="3" fill="#8B5A2B" stroke="#3a1f0b" strokeWidth="2"/>
      <line x1="0" y1={h*0.5} x2={w} y2={h*0.5} stroke="#3a1f0b" strokeWidth="1"/>
    </>
  )
}

// — tall almirah / wardrobe with two doors
function TallAlmirah({ w, h }) {
  return (
    <>
      <rect x="0" y="0" width={w} height={h} rx="4" fill="#A0522D" stroke="#3a1f0b" strokeWidth="2.5"/>
      <line x1={w*0.5} y1="2" x2={w*0.5} y2={h-2} stroke="#3a1f0b" strokeWidth="2"/>
      <circle cx={w*0.42} cy={h*0.5} r="2.5" fill="#fbbf24"/>
      <circle cx={w*0.58} cy={h*0.5} r="2.5" fill="#fbbf24"/>
      <rect x={w*0.10} y={h*0.10} width={w*0.30} height={h*0.30} fill="rgba(255,255,255,0.06)" stroke="#5C2D0E" strokeWidth="0.5"/>
      <rect x={w*0.60} y={h*0.10} width={w*0.30} height={h*0.30} fill="rgba(255,255,255,0.06)" stroke="#5C2D0E" strokeWidth="0.5"/>
    </>
  )
}

// — kitchen counter slab with stove
function KitchenSlab({ w, h }) {
  return (
    <>
      <rect x="0" y={h*0.05} width={w} height={h*0.10} fill="#aaa" stroke="#666" strokeWidth="1.5"/>
      <rect x="0" y={h*0.15} width={w} height={h*0.85} fill="#888" stroke="#555" strokeWidth="2"/>
      {/* cabinet doors */}
      <line x1={w*0.33} y1={h*0.20} x2={w*0.33} y2={h*0.95} stroke="#555" strokeWidth="1.5"/>
      <line x1={w*0.66} y1={h*0.20} x2={w*0.66} y2={h*0.95} stroke="#555" strokeWidth="1.5"/>
      <circle cx={w*0.30} cy={h*0.55} r="2" fill="#444"/>
      <circle cx={w*0.63} cy={h*0.55} r="2" fill="#444"/>
      <circle cx={w*0.96} cy={h*0.55} r="2" fill="#444"/>
      {/* stove burners */}
      <circle cx={w*0.10} cy={h*0.10} r="4" fill="#222" stroke="#000" strokeWidth="0.5"/>
      <circle cx={w*0.18} cy={h*0.10} r="4" fill="#222" stroke="#000" strokeWidth="0.5"/>
    </>
  )
}

// — fridge
function Fridge({ w, h }) {
  return (
    <>
      <rect x="0" y="0" width={w} height={h} rx="4" fill="#E0E0E0" stroke="#777" strokeWidth="2"/>
      <line x1="0" y1={h*0.32} x2={w} y2={h*0.32} stroke="#999" strokeWidth="1.5"/>
      <rect x={w*0.78} y={h*0.10} width="3" height={h*0.15} fill="#666"/>
      <rect x={w*0.78} y={h*0.40} width="3" height={h*0.40} fill="#666"/>
      <rect x={w*0.10} y={h*0.10} width={w*0.55} height={h*0.18} rx="1" fill="#FAFAFA" stroke="#bbb" strokeWidth="0.8"/>
      <rect x={w*0.10} y={h*0.40} width={w*0.55} height={h*0.50} rx="1" fill="#FAFAFA" stroke="#bbb" strokeWidth="0.8"/>
    </>
  )
}

// — kitchen sink
function Sink({ w, h }) {
  return (
    <>
      <rect x="0" y={h*0.10} width={w} height={h*0.90} rx="3" fill="#C0C0C0" stroke="#777" strokeWidth="2"/>
      <rect x={w*0.10} y={h*0.20} width={w*0.80} height={h*0.55} rx="2" fill="#888" stroke="#555" strokeWidth="1.5"/>
      <rect x={w*0.45} y="0" width={w*0.10} height={h*0.20} fill="#999" stroke="#555" strokeWidth="1"/>
      <circle cx={w*0.50} cy={h*0.05} r={w*0.06} fill="#999" stroke="#555" strokeWidth="1"/>
    </>
  )
}

// — wood shelf with sacks visible
function KitchenShelf({ w, h }) {
  return (
    <>
      <rect x="0" y={h*0.10} width={w} height="6" fill="#7a5c3d" stroke="#3a2510" strokeWidth="1"/>
      <rect x="0" y={h*0.10} width={w} height={h*0.90} fill="#654321" stroke="#3a2510" strokeWidth="1.5"/>
    </>
  )
}

// — bed with pillow + blanket
function Bed({ w, h }) {
  return (
    <>
      {/* headboard */}
      <rect x="0" y="0" width={w*0.10} height={h} rx="2" fill="#5C4A0E" stroke="#3a2510" strokeWidth="1.5"/>
      {/* mattress */}
      <rect x={w*0.10} y={h*0.10} width={w*0.90} height={h*0.65} rx="6" fill="#fef3c7" stroke="#92400e" strokeWidth="2"/>
      {/* blanket */}
      <rect x={w*0.45} y={h*0.10} width={w*0.55} height={h*0.65} rx="4" fill="#60a5fa" stroke="#1e40af" strokeWidth="1.5" opacity="0.85"/>
      {/* pillow */}
      <rect x={w*0.13} y={h*0.18} width={w*0.28} height={h*0.32} rx="4" fill="#fff" stroke="#cbd5e1" strokeWidth="1"/>
      {/* base / legs */}
      <rect x={w*0.10} y={h*0.75} width={w*0.90} height={h*0.20} fill="#5C4A0E" stroke="#3a2510" strokeWidth="1.5"/>
      <rect x={w*0.12} y={h*0.95} width="5" height={h*0.05} fill="#3a2510"/>
      <rect x={w-12}  y={h*0.95} width="5" height={h*0.05} fill="#3a2510"/>
    </>
  )
}

// — wardrobe with doors + handles + mirror stripe
function Wardrobe({ w, h }) {
  return (
    <>
      <rect x="0" y="0" width={w} height={h} rx="3" fill="#A0522D" stroke="#3a1f0b" strokeWidth="2.5"/>
      <line x1={w*0.5} y1="2" x2={w*0.5} y2={h-2} stroke="#3a1f0b" strokeWidth="2"/>
      <circle cx={w*0.40} cy={h*0.50} r="2" fill="#fbbf24"/>
      <circle cx={w*0.60} cy={h*0.50} r="2" fill="#fbbf24"/>
      <rect x={w*0.20} y={h*0.30} width={w*0.60} height="3" fill="#e5e7eb" opacity="0.7"/>
    </>
  )
}

function BedsideTable({ w, h }) {
  return (
    <>
      <rect x="0" y="0" width={w} height={h} rx="3" fill="#7a5c3d" stroke="#3a2510" strokeWidth="2"/>
      <rect x={w*0.15} y={h*0.20} width={w*0.70} height={h*0.30} fill="#5C4A0E" stroke="#3a2510" strokeWidth="1"/>
      <circle cx={w*0.50} cy={h*0.35} r="1.5" fill="#fbbf24"/>
    </>
  )
}

// — washing machine: drum window
function WashingMachine({ w, h }) {
  return (
    <>
      <rect x="0" y="0" width={w} height={h} rx="4" fill="#E5E5E5" stroke="#666" strokeWidth="2"/>
      <rect x={w*0.10} y={h*0.05} width={w*0.80} height={h*0.15} rx="2" fill="#fff" stroke="#aaa" strokeWidth="1"/>
      <circle cx={w*0.18} cy={h*0.12} r="2" fill="#3b82f6"/>
      <circle cx={w*0.30} cy={h*0.12} r="2" fill="#10b981"/>
      <circle cx={w*0.50} cy={h*0.55} r={w*0.30} fill="#bfdbfe" stroke="#666" strokeWidth="2"/>
      <circle cx={w*0.50} cy={h*0.55} r={w*0.22} fill="#dbeafe" stroke="#777" strokeWidth="1"/>
    </>
  )
}

// — medicine cabinet with red cross
function MedCabinet({ w, h }) {
  return (
    <>
      <rect x="0" y="0" width={w} height={h*0.10} fill="#7a8e9a" stroke="#475569" strokeWidth="1.5"/>
      <rect x="0" y={h*0.10} width={w} height={h*0.90} rx="3" fill="#dce8f0" stroke="#475569" strokeWidth="2"/>
      <line x1={w*0.5} y1={h*0.10} x2={w*0.5} y2={h-2} stroke="#475569" strokeWidth="1.5"/>
      <rect x={w*0.42} y={h*0.30} width={w*0.16} height={h*0.36} fill="#dc2626" stroke="#fff" strokeWidth="1.5"/>
      <rect x={w*0.30} y={h*0.42} width={w*0.40} height={h*0.12} fill="#dc2626" stroke="#fff" strokeWidth="1.5"/>
    </>
  )
}

function Bucket({ w, h }) {
  return (
    <>
      <path d={`M2 ${h*0.20} L${w-2} ${h*0.20} L${w*0.85} ${h-2} L${w*0.15} ${h-2} Z`}
            fill="#60A5FA" stroke="#1e40af" strokeWidth="2"/>
      <path d={`M${w*0.10} ${h*0.20} Q${w*0.5} ${-h*0.05} ${w*0.90} ${h*0.20}`}
            fill="none" stroke="#1e40af" strokeWidth="2"/>
    </>
  )
}

// — store-room shelf unit (4 shelves of items implied)
function ShelfUnit({ w, h }) {
  return (
    <>
      <rect x="0" y="0" width={w} height={h} fill="#8B7355" stroke="#3a2510" strokeWidth="2"/>
      <rect x="2" y="2" width={w-4} height={h*0.32} fill="rgba(0,0,0,0.10)"/>
      <line x1="2" y1={h*0.34} x2={w-2} y2={h*0.34} stroke="#3a2510" strokeWidth="1.5"/>
      <line x1="2" y1={h*0.66} x2={w-2} y2={h*0.66} stroke="#3a2510" strokeWidth="1.5"/>
      <rect x="0" y="0" width={w} height="6" fill="#A08060"/>
    </>
  )
}

function CardboardBox({ w, h }) {
  return (
    <>
      <rect x="0" y="0" width={w} height={h} rx="2" fill="#C19A6B" stroke="#6B4226" strokeWidth="2"/>
      <line x1={w*0.5} y1="0" x2={w*0.5} y2={h*0.18} stroke="#6B4226" strokeWidth="1.5"/>
      <line x1="0" y1={h*0.18} x2={w} y2={h*0.18} stroke="#6B4226" strokeWidth="1.5"/>
      <rect x={w*0.20} y={h*0.45} width={w*0.60} height="2" fill="#6B4226" opacity="0.6"/>
    </>
  )
}

// — puja altar: red cloth + brass bell on wooden table
function PujaAltar({ w, h }) {
  return (
    <>
      <rect x="0" y={h*0.18} width={w} height={h*0.18} fill="#c77d4a" stroke="#7a3f1a" strokeWidth="1.5"/>
      <rect x="0" y={h*0.36} width={w} height={h*0.50} fill="#A0522D" stroke="#5C2D0E" strokeWidth="2"/>
      {/* red ceremonial cloth */}
      <path d={`M${w*0.10} ${h*0.18} L${w*0.90} ${h*0.18} L${w*0.85} ${h*0.30} L${w*0.15} ${h*0.30} Z`}
            fill="#dc2626" stroke="#7f1d1d" strokeWidth="1"/>
      {/* legs */}
      <rect x={w*0.05} y={h*0.86} width="6" height={h*0.14} fill="#5C2D0E"/>
      <rect x={w-11}  y={h*0.86} width="6" height={h*0.14} fill="#5C2D0E"/>
      {/* gold edge */}
      <line x1="0" y1={h*0.36} x2={w} y2={h*0.36} stroke="#fbbf24" strokeWidth="1.5"/>
    </>
  )
}

function SmallAlmirah({ w, h }) {
  return (
    <>
      <rect x="0" y="0" width={w} height={h} rx="3" fill="#8B6914" stroke="#3a2510" strokeWidth="2"/>
      <line x1={w*0.5} y1="2" x2={w*0.5} y2={h-2} stroke="#3a2510" strokeWidth="1.5"/>
      <circle cx={w*0.40} cy={h*0.50} r="2" fill="#fbbf24"/>
      <circle cx={w*0.60} cy={h*0.50} r="2" fill="#fbbf24"/>
    </>
  )
}

// — door with arched glass top + handle (House-of-Hazards style)
function DoorSprite({ w, h }) {
  return (
    <>
      <path d={`M2 ${h*0.18} Q2 2 ${w*0.5} 2 Q${w-2} 2 ${w-2} ${h*0.18} L${w-2} ${h-2} L2 ${h-2} Z`}
            fill="#8B4513" stroke="#3a1f0b" strokeWidth="2.5"/>
      <path d={`M${w*0.15} ${h*0.20} Q${w*0.15} ${h*0.06} ${w*0.5} ${h*0.06} Q${w*0.85} ${h*0.06} ${w*0.85} ${h*0.20} Z`}
            fill="#bfdbfe" stroke="#1e40af" strokeWidth="1.2"/>
      <line x1={w*0.5} y1={h*0.06} x2={w*0.5} y2={h*0.20} stroke="#1e40af" strokeWidth="1"/>
      <line x1={w*0.30} y1={h*0.13} x2={w*0.70} y2={h*0.13} stroke="#1e40af" strokeWidth="1" opacity="0.6"/>
      <rect x={w*0.18} y={h*0.30} width={w*0.64} height={h*0.20} fill="none" stroke="#3a1f0b" strokeWidth="1.5"/>
      <rect x={w*0.18} y={h*0.55} width={w*0.64} height={h*0.30} fill="none" stroke="#3a1f0b" strokeWidth="1.5"/>
      <circle cx={w*0.80} cy={h*0.65} r="3" fill="#fbbf24" stroke="#92400e" strokeWidth="1"/>
    </>
  )
}

// — window: rainy sky outside + frame mullions
function WindowSprite({ w, h }) {
  return (
    <>
      <defs>
        <linearGradient id={`sky-${w}-${h}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e3a8a"/>
          <stop offset="100%" stopColor="#3b82f6"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={w} height={h} fill={`url(#sky-${w}-${h})`}/>
      {/* falling rain streaks */}
      {[...Array(7)].map((_, k) => (
        <line key={k}
          x1={(k * w / 7) + 4} y1={h*0.10}
          x2={(k * w / 7) + 0} y2={h*0.95}
          stroke="rgba(174,194,224,0.55)" strokeWidth="1"/>
      ))}
      {/* frame */}
      <rect x="0" y="0" width={w} height={h} fill="none" stroke="#5C2D0E" strokeWidth="4"/>
      <line x1={w*0.5} y1="2" x2={w*0.5} y2={h-2} stroke="#5C2D0E" strokeWidth="2.5"/>
      <line x1="2" y1={h*0.5} x2={w-2} y2={h*0.5} stroke="#5C2D0E" strokeWidth="2.5"/>
      {/* sill */}
      <rect x="-3" y={h-3} width={w+6} height="6" fill="#7a4a2a" stroke="#3a1f0b" strokeWidth="1"/>
    </>
  )
}

// — potted plant
function PlantSprite({ h }) {
  const w = h
  return (
    <>
      <path d={`M${w*0.20} ${h*0.55} L${w*0.80} ${h*0.55} L${w*0.70} ${h-2} L${w*0.30} ${h-2} Z`}
            fill="#c2410c" stroke="#7c2d12" strokeWidth="1.5"/>
      <ellipse cx={w*0.50} cy={h*0.40} rx={w*0.40} ry={h*0.30} fill="#16a34a" stroke="#14532d" strokeWidth="1.5"/>
      <ellipse cx={w*0.30} cy={h*0.30} rx={w*0.18} ry={h*0.20} fill="#22c55e" stroke="#14532d" strokeWidth="1"/>
      <ellipse cx={w*0.70} cy={h*0.30} rx={w*0.18} ry={h*0.20} fill="#22c55e" stroke="#14532d" strokeWidth="1"/>
      <ellipse cx={w*0.50} cy={h*0.18} rx={w*0.16} ry={h*0.18} fill="#22c55e" stroke="#14532d" strokeWidth="1"/>
    </>
  )
}

// — proper stairs with steps + railing
function StairsSprite({ w, h }) {
  const steps = 8
  const stepH = h / steps
  return (
    <>
      <rect x="0" y="0" width={w} height={h} fill="#d6cfc7"/>
      {[...Array(steps)].map((_, i) => {
        const sy = i * stepH
        const sx = (i % 2 === 0) ? 0 : w * 0.25
        const sw = w * 0.75
        return (
          <g key={i}>
            <rect x={sx} y={sy} width={sw} height={stepH-1} fill="#a08770" stroke="#5c3d2e" strokeWidth="1"/>
            <rect x={sx} y={sy} width={sw} height="2" fill="#7a5c3d"/>
          </g>
        )
      })}
      <line x1={w*0.92} y1="0" x2={w*0.92} y2={h} stroke="#3a2510" strokeWidth="2"/>
      {[...Array(steps+1)].map((_, i) => (
        <line key={`b-${i}`} x1={w*0.92} y1={i*stepH} x2={w*0.85} y2={i*stepH+6}
              stroke="#5c3d2e" strokeWidth="1.5"/>
      ))}
    </>
  )
}

// (Player is rendered inline in the play scene so we can mutate SVG transforms
// directly each frame; no React re-render in the game loop.)

// Backpack hero icon — also OpenMoji.
function BagIcon({ size = 40, overweight = false, style = {} }) {
  return (
    <img
      src={`${EMOJI_BASE}/1F392.svg`}
      alt="backpack"
      draggable={false}
      style={{
        width: size, height: size, display: 'inline-block',
        filter: overweight ? 'drop-shadow(0 0 6px #ef4444)' : 'none',
        userSelect: 'none', ...style,
      }}
    />
  )
}

function ItemTooltip({ item, x, y }) {
  const plate = CAT_PLATES[item.cat]
  const left = Math.min(x + 10, window.innerWidth - 280)
  const top = Math.max(12, y - 170)
  return (
    <div style={{
      position: 'fixed', left, top, zIndex: 100, width: 260,
      background: '#0f172a', color: '#fff',
      border: `2px solid ${plate}`, borderRadius: 14, padding: '10px 14px',
      boxShadow: `0 10px 24px ${plate}44`,
      animation: 'fadeIn 0.15s ease-out', pointerEvents: 'none',
    }}>
      <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
        <ItemIcon item={item} size={22} color={plate} />
        <span>{item.name}</span>
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 999, fontSize: 10 }}>⚖️ {item.wt} kg</span>
        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 999, fontSize: 10 }}>🎯 util {item.util}</span>
        {item.trap
          ? <span style={{ background: 'rgba(239,68,68,0.35)', color: '#fecaca', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800 }}>⚠️ TRAP</span>
          : <span style={{ background: 'rgba(16,185,129,0.35)', color: '#d1fae5', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800 }}>✓ SMART</span>
        }
        {item.persona && (
          <span style={{ background: 'rgba(236,72,153,0.3)', color: '#fbcfe8', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800 }}>
            {item.persona === 'child' ? '🧒 CHILD' :
             item.persona === 'elder' ? '👴 ELDER' :
             item.persona === 'infant' ? '👶 BABY' :
             item.persona === 'woman' ? '👩 WOMEN' :
             item.persona === 'pet' ? '🐾 PET' : ''}
          </span>
        )}
      </div>
      <div style={{ color: '#cbd5e1', fontSize: 11, lineHeight: 1.5 }}>{item.tip}</div>
    </div>
  )
}

function BagPanel({ bagIds, onFinish, bagRef, onDrop }) {
  const [expanded, setExpanded] = useState(false)
  const items = CATALOGUE.filter(i => bagIds.includes(i.id))
  const weight = items.reduce((s, i) => s + i.wt, 0)
  const overweight = weight > MAX_WEIGHT
  const essC = ESSENTIAL_IDS.filter(id => bagIds.includes(id)).length

  // Collapsed: just bag icon + weight badge
  if (!expanded) {
    return (
      <div onClick={() => setExpanded(true)} style={{
        position: 'fixed', right: 12, top: 56, zIndex: 25, cursor: 'pointer',
        background: 'rgba(255,255,255,0.96)', borderRadius: 16, padding: '8px 14px',
        border: '2px solid #1e293b', boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
        textAlign: 'center', transition: 'all 0.2s',
      }}>
        <div ref={bagRef} style={{
          display: 'inline-block', animation: 'bob 2.5s ease-in-out infinite',
        }}>
          <BagIcon size={44} overweight={overweight} />
        </div>
        <div style={{ fontSize: 10, fontWeight: 800, color: overweight ? '#ef4444' : '#0f172a', marginTop: -2 }}>
          {items.length} · {weight.toFixed(1)} kg
        </div>
        <div style={{ height: 5, borderRadius: 999, overflow: 'hidden', background: '#e2e8f0', marginTop: 4, width: 60 }}>
          <div style={{
            width: `${Math.min(100, (weight / MAX_WEIGHT) * 100)}%`, height: '100%',
            background: overweight ? '#ef4444' : weight / MAX_WEIGHT < 0.7 ? '#10b981' : '#f59e0b',
            transition: 'width 0.3s'
          }} />
        </div>
        <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 3 }}>▼ OPEN</div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', right: 12, top: 56, width: 220, zIndex: 25,
      background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 12,
      border: '2px solid #1e293b', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
    }}>
      <div style={{ textAlign: 'right', marginBottom: 4 }}>
        <span onClick={() => setExpanded(false)} style={{
          cursor: 'pointer', fontSize: 10, color: '#94a3b8', fontWeight: 700,
          padding: '2px 8px', borderRadius: 6, background: '#f1f5f9'
        }}>▲ CLOSE</span>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div ref={bagRef} style={{
          display: 'inline-block', animation: 'bob 2.5s ease-in-out infinite',
        }}>
          <BagIcon size={48} overweight={overweight} />
        </div>
        <div style={{ fontWeight: 900, color: '#0f172a', fontSize: 13, marginTop: -4 }}>GO-BAG</div>
        <div style={{ fontSize: 10, color: '#475569' }}>{items.length} items · {weight.toFixed(1)} kg</div>
      </div>
      <div style={{ height: 8, borderRadius: 999, overflow: 'hidden', background: '#e2e8f0', marginBottom: 8 }}>
        <div style={{
          width: `${Math.min(100, (weight / MAX_WEIGHT) * 100)}%`, height: '100%',
          background: overweight ? 'linear-gradient(90deg,#ef4444,#991b1b)' : weight / MAX_WEIGHT < 0.7
            ? 'linear-gradient(90deg,#10b981,#22c55e)' : 'linear-gradient(90deg,#f59e0b,#ef4444)',
          transition: 'width 0.3s',
        }} />
      </div>
      <div style={{ background: '#f1f5f9', borderRadius: 10, padding: '6px 8px', marginBottom: 8 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: '#475569', letterSpacing: 1, marginBottom: 4 }}>NDMA ESSENTIALS · {essC}/{ESSENTIAL_IDS.length}</div>
        {ESSENTIAL_IDS.map(id => {
          const has = bagIds.includes(id)
          return <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: has ? '#059669' : '#94a3b8', fontWeight: 600, marginBottom: 2 }}>
            <span style={{ fontSize: 11 }}>{has ? '✅' : '⬜'}</span><span>{ESSENTIAL_LABELS[id]}</span>
          </div>
        })}
      </div>
      {items.length > 0 && (
        <div style={{ maxHeight: 80, overflowY: 'auto', marginBottom: 8 }}>
          {items.map(i => (
            <div key={i.id} style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 10,
              padding: '2px 4px', borderRadius: 4, marginBottom: 2,
              background: i.trap ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
              animation: 'pop-in 0.25s ease-out'
            }}>
              <ItemIcon item={i} size={20} />
              <span style={{ flex: 1, color: '#1e293b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.name}</span>
              <span style={{ color: '#64748b', fontSize: 9 }}>{i.wt}kg</span>
              <button 
                onClick={(e) => { e.stopPropagation(); onDrop(i.id); }}
                style={{
                  background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold',
                  cursor: 'pointer', padding: '0 2px', fontSize: 12
                }}
                title="Drop item"
              >×</button>
            </div>
          ))}
        </div>
      )}
      <button onClick={onFinish} style={{
        width: '100%', padding: '10px 0',
        background: overweight ? 'linear-gradient(135deg,#94a3b8,#64748b)' : 'linear-gradient(135deg,#ef4444,#b91c1c)',
        color: '#fff', border: 'none', borderRadius: 12, fontWeight: 900, fontSize: 12, letterSpacing: 1, cursor: 'pointer',
        boxShadow: overweight ? 'none' : '0 4px 12px rgba(239,68,68,0.45)',
      }}>🚁 EVACUATE NOW</button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function Module1_GoBag() {
  const { dispatch: gameDispatch } = useGame()
  const [phase, setPhase] = useState('intro')
  const [bagIds, setBagIds] = useState([])
  const [timeLeft, setTimeLeft] = useState(TIMER_START)
  const [result, setResult] = useState(null)
  const [nearbyItem, setNearbyItem] = useState(null)
  const [hoveredItem, setHoveredItem] = useState(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const [currentRoom, setCurrentRoom] = useState(null)
  const [roomFlash, setRoomFlash] = useState(false)
  const [flying, setFlying] = useState([])
  
  // Mid-game narrator state
  const [midGameNarrative, setMidGameNarrative] = useState(null)
  const hasWarnedTimeRef = useRef(false)
  const hasWarnedWeightRef = useRef(false)
  const hasPraisedRef = useRef(false)
  const hasPraisedFamilyRef = useRef(false)

  const playerRef = useRef({ x: 100, y: 660, vx: 0, vy: 0, facing: 1, grounded: false })
  const keysRef = useRef({ left: false, right: false, up: false })
  const cameraRef = useRef({ x: 0, y: 200 })
  const worldElRef = useRef(null)
  const playerElRef = useRef(null)
  const bagRef = useRef(null)
  const timerRef = useRef(null)
  const frameRef = useRef(null)
  const nearItemRef = useRef(null)
  const currentRoomRef = useRef(null)
  const bagIdsRef = useRef([])
  const finishRef = useRef(null)
  const pickupRef = useRef(null)
  const flashTimerRef = useRef(null)

  useEffect(() => { bagIdsRef.current = bagIds }, [bagIds])

  // Finish game
  finishRef.current = () => {
    clearInterval(timerRef.current)
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    const res = computeScore(bagIdsRef.current)
    setResult(res)
    gameDispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-1', result: { score: res.score, passed: res.passed } } })
    setPhase('result')
  }

  // Pickup
  pickupRef.current = () => {
    const item = nearItemRef.current
    if (!item) return
    setBagIds(prev => {
      if (prev.includes(item.id)) return prev
      const cam = cameraRef.current
      const fromX = item.wx - cam.x
      const fromY = item.wy - cam.y
      const bagRect = bagRef.current?.getBoundingClientRect()
      const toX = bagRect ? bagRect.left + bagRect.width / 2 : window.innerWidth - 100
      const toY = bagRect ? bagRect.top + bagRect.height / 2 : 80
      const fid = `${item.id}-${Date.now()}`
      setFlying(f => [...f, { fid, item, fromX, fromY, tx: toX - fromX, ty: toY - fromY }])
      setTimeout(() => setFlying(f => f.filter(fl => fl.fid !== fid)), 700)
      return [...prev, item.id]
    })
  }

  // Timer and Triggers
  useEffect(() => {
    if (phase !== 'play') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t === 31 && !hasWarnedTimeRef.current) {
          hasWarnedTimeRef.current = true
          setMidGameNarrative({ text: "Only 30 seconds left! The water is coming. Grab only the essentials and get to higher ground!", emotion: 'urgent', characterKey: 'broadcaster', visible: true })
        }
        if (t <= 1) { clearInterval(timerRef.current); finishRef.current(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase])

  // Weight & Item Triggers
  useEffect(() => {
    if (phase !== 'play') return
    const currentWeight = CATALOGUE.filter(i => bagIds.includes(i.id)).reduce((s, i) => s + i.wt, 0)
    
    if (currentWeight > MAX_WEIGHT && !hasWarnedWeightRef.current) {
      hasWarnedWeightRef.current = true
      setMidGameNarrative({ text: "Your bag is too heavy! You won't be able to run. Drop non-essentials immediately!", emotion: 'urgent', characterKey: 'broadcaster', visible: true })
    }
    
    // Praise for picking up first essential
    if (!hasPraisedRef.current && bagIds.length > 0) {
      const items = CATALOGUE.filter(i => bagIds.includes(i.id))
      const hasEssential = items.some(i => i.essential)
      if (hasEssential && currentWeight <= MAX_WEIGHT) {
        hasPraisedRef.current = true
        setMidGameNarrative({ text: "Good choice. Prioritize essentials like ORS, first-aid, and flashlights.", emotion: 'neutral', characterKey: 'neighbor', visible: true })
      }
    }

    // Praise for first family-perspective pickup
    if (!hasPraisedFamilyRef.current) {
      const items = CATALOGUE.filter(i => bagIds.includes(i.id))
      const familyPick = items.find(i => i.persona && !i.trap)
      if (familyPick) {
        hasPraisedFamilyRef.current = true
        setMidGameNarrative({
          text: "Good thinking — survival isn't only about you. The kids, elders, and pets need their own kit too.",
          emotion: 'neutral', characterKey: 'neighbor', visible: true
        })
      }
    }
  }, [bagIds, phase])

  // Input
  useEffect(() => {
    if (phase !== 'play') return
    const k = keysRef.current
    const down = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { k.left = true; e.preventDefault() }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { k.right = true; e.preventDefault() }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { k.up = true; e.preventDefault() }
      if (e.key === ' ' || e.key === 'e' || e.key === 'E') { pickupRef.current(); e.preventDefault() }
    }
    const up = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') k.left = false
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') k.right = false
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') k.up = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); k.left = k.right = k.up = false }
  }, [phase])

  // Game loop
  useEffect(() => {
    if (phase !== 'play') return
    let prev = performance.now()
    function loop(time) {
      const dt = Math.min((time - prev) / 1000, 0.033)
      prev = time
      const p = playerRef.current, k = keysRef.current, cam = cameraRef.current

      // Movement
      p.vx = k.left ? -WALK_SPEED : k.right ? WALK_SPEED : 0
      p.vy += GRAVITY * dt
      const prevY = p.y
      let nx = p.x + p.vx * dt
      let ny = p.y + p.vy * dt
      nx = Math.max(22, Math.min(WORLD_W - 22 - PLAYER_W, nx))

      // Platform collision (one-way)
      let grounded = false
      for (const pl of PLATFORMS) {
        if (p.vy >= 0 && prevY + PLAYER_H <= pl.y + 4 && ny + PLAYER_H >= pl.y) {
          if (nx + PLAYER_W > pl.x + 2 && nx < pl.x + pl.w - 2) {
            ny = pl.y - PLAYER_H; p.vy = 0; grounded = true
          }
        }
      }

      // Jump
      if (k.up && p.grounded) { p.vy = -JUMP_VEL; grounded = false }

      // Fell off world
      if (ny > WORLD_H + 50) { nx = 100; ny = 660; p.vy = 0 }

      p.x = nx; p.y = ny; p.grounded = grounded
      if (p.vx !== 0) p.facing = p.vx > 0 ? 1 : -1

      // Camera
      const vw = window.innerWidth, vh = window.innerHeight
      const tx = p.x + PLAYER_W / 2 - vw / 2, ty = p.y + PLAYER_H / 2 - vh / 2
      cam.x += (tx - cam.x) * CAM_LERP; cam.y += (ty - cam.y) * CAM_LERP
      cam.x = Math.max(0, Math.min(Math.max(0, WORLD_W - vw), cam.x))
      cam.y = Math.max(0, Math.min(Math.max(0, WORLD_H - vh), cam.y))

      // DOM updates
      if (worldElRef.current) worldElRef.current.style.transform = `translate(${-cam.x}px,${-cam.y}px)`
      if (playerElRef.current) {
        playerElRef.current.style.left = `${p.x}px`
        playerElRef.current.style.top = `${p.y}px`
        // flip the inner SVG so the shadow stays on the parent div
        const svg = playerElRef.current.querySelector('svg.player-svg')
        if (svg) svg.style.transform = `scaleX(${p.facing})`
        // walk-cycle: rotate legs + arms in opposite phases
        const walking = Math.abs(p.vx) > 0 && p.grounded
        const swing = walking ? Math.sin(time * 0.012) * 22 : 0
        const front = playerElRef.current.querySelector('.pleg-front')
        const back  = playerElRef.current.querySelector('.pleg-back')
        const armF  = playerElRef.current.querySelector('.parm-front')
        const armB  = playerElRef.current.querySelector('.parm-back')
        if (front) front.setAttribute('transform', `rotate(${ swing} 14 28)`)
        if (back)  back .setAttribute('transform', `rotate(${-swing} 10 28)`)
        if (armF)  armF .setAttribute('transform', `rotate(${-swing*0.7} 19.5 14)`)
        if (armB)  armB .setAttribute('transform', `rotate(${ swing*0.7} 4.5 14)`)
      }

      // Nearby item
      const px = p.x + PLAYER_W / 2, py = p.y + PLAYER_H / 2
      let closest = null, minD = PICKUP_RANGE
      for (const it of CATALOGUE) {
        if (bagIdsRef.current.includes(it.id)) continue
        const d = Math.sqrt((px - it.wx) ** 2 + (py - it.wy) ** 2)
        if (d < minD) { minD = d; closest = it }
      }
      if (closest !== nearItemRef.current) { nearItemRef.current = closest; setNearbyItem(closest) }

      // Room detection
      const rm = ROOMS.find(r => r.id !== 'Stairs' && px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h)
      if (rm && rm.id !== currentRoomRef.current) {
        currentRoomRef.current = rm.id; setCurrentRoom(rm); setRoomFlash(true)
        clearTimeout(flashTimerRef.current)
        flashTimerRef.current = setTimeout(() => setRoomFlash(false), 1500)
      }

      frameRef.current = requestAnimationFrame(loop)
    }
    frameRef.current = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(frameRef.current); clearTimeout(flashTimerRef.current) }
  }, [phase])

  function retry() {
    setBagIds([]); setTimeLeft(TIMER_START); setResult(null); setFlying([]); setNearbyItem(null); setCurrentRoom(null)
    setMidGameNarrative(null)
    hasWarnedTimeRef.current = false
    hasWarnedWeightRef.current = false
    hasPraisedRef.current = false
    hasPraisedFamilyRef.current = false
    playerRef.current = { x: 100, y: 660, vx: 0, vy: 0, facing: 1, grounded: false }
    cameraRef.current = { x: 0, y: 200 }
    currentRoomRef.current = null; nearItemRef.current = null
    setPhase('intro')
  }

  const totalWeight = CATALOGUE.filter(i => bagIds.includes(i.id)).reduce((s, i) => s + i.wt, 0)
  const danger = phase === 'play' && timeLeft <= 15 && timeLeft > 0

  // ═══════════ INTRO ═══════════
  if (phase === 'intro') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
        <style>{KEYFRAMES}</style>
        {['🏠', '🌧️', '🎒', '🍚', '💊', '🔦', '🧥', '📄', '🪔', '🪭'].map((e, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${(i * 11 + 4) % 95}%`, top: `${(i * 17 + 8) % 80}%`, fontSize: 40 + (i % 3) * 8, opacity: 0.2,
            animation: `bob ${3 + i * 0.3}s ease-in-out infinite`, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.2))'
          }}>{e}</div>
        ))}
        <div style={{
          position: 'relative', zIndex: 1, maxWidth: 620, width: '100%', background: 'rgba(255,255,255,0.94)', borderRadius: 28, padding: 40,
          border: '4px solid #0f172a', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', textAlign: 'center'
        }}>
          <div style={{ display: 'inline-block', animation: 'bob 2s ease-in-out infinite' }}>
            <BagIcon size={96} />
          </div>
          <div style={{
            display: 'inline-block', background: 'linear-gradient(135deg,#dc2626,#991b1b)', color: '#fff',
            padding: '6px 18px', borderRadius: 999, fontWeight: 800, fontSize: 12, letterSpacing: 2,
            animation: 'pulse-ring 1.4s infinite', marginTop: 4
          }}>🌊 IMD FLASH-FLOOD WARNING</div>
          <h1 style={{ fontSize: 34, fontWeight: 900, margin: '14px 0 4px', color: '#0f172a', letterSpacing: -0.5 }}>The Go-Bag Challenge</h1>
          <div style={{ color: '#475569', fontSize: 14, fontWeight: 600, marginBottom: 20 }}>NDMA · Indian Monsoon Edition</div>
          <p style={{ color: '#334155', fontSize: 15, lineHeight: 1.7, marginBottom: 16 }}>
            A flash flood is <strong>{TIMER_START} seconds</strong> from your house. Explore a <strong>2-floor Indian house</strong>,
            grab only what you need, and evacuate under <strong>{MAX_WEIGHT} kg</strong>.
            Use <strong>arrow keys</strong> to move and <strong>jump between floors</strong>.
            <br /><br />
            <strong>Your home has children, an elder, an infant, and a pet</strong> — pack for everyone, not just yourself.
          </p>
          <div style={{ background: '#f8fafc', border: '2px dashed #94a3b8', borderRadius: 16, padding: 16, textAlign: 'left', marginBottom: 22 }}>
            <div style={{ color: '#0f172a', fontSize: 13, lineHeight: 1.9, fontWeight: 600 }}>
              <div>🎮 Arrow keys / WASD — Move & Jump</div>
              <div>📦 E / Space — Pick up nearby items</div>
              <div>🏠 Ground floor: Hall + Kitchen · Upper floor: Puja, Bedroom, Bathroom, Store</div>
              <div>⚖️ Max weight: <strong>{MAX_WEIGHT} kg</strong> — heavier = you cannot run</div>
              <div>🌟 Essentials: ORS · meds · torch · docs · raincoat</div>
              <div>👨‍👩‍👧‍👦 Family kit: eyeglasses · baby formula · sanitary pads · pet food · comfort toy</div>
              <div>⚠️ Avoid: 10 kg rice, steel utensils, gold, wet-absorbing clothes</div>
            </div>
          </div>
          <button onClick={() => setPhase('play')} style={{
            padding: '16px 40px', borderRadius: 999, border: 'none',
            background: 'linear-gradient(135deg,#ef4444,#b91c1c)', color: '#fff', fontWeight: 900, fontSize: 18, letterSpacing: 1,
            cursor: 'pointer', boxShadow: '0 10px 24px rgba(239,68,68,0.5)', animation: 'pulse-ring 1.5s infinite',
          }}>🚨 START EVACUATION</button>
        </div>
        
        <Narrator 
          characterKey="broadcaster" 
          visible={phase === 'intro'} 
          text="Attention citizens! A severe flash flood warning has been issued by the IMD. Water levels are rising rapidly. You have exactly 120 seconds to pack your Go-Bag with essentials and evacuate. Do not overpack—heavy bags will slow you down. Move now!" 
        />
      </div>
    )
  }

  // ═══════════ RESULT ═══════════
  if (phase === 'result' && result) {
    const bagItems = CATALOGUE.filter(i => bagIds.includes(i.id))
    const smart = bagItems.filter(i => !i.trap), mistakes = bagItems.filter(i => i.trap)
    const missing = ESSENTIAL_IDS.filter(id => !bagIds.includes(id))
    const scoreColor = result.passed ? '#10b981' : result.score >= 40 ? '#f59e0b' : '#ef4444'
    return (
      <div style={{ minHeight: '100vh', background: result.passed ? 'linear-gradient(135deg,#bbf7d0,#86efac,#34d399)' : 'linear-gradient(135deg,#fecaca,#f87171,#dc2626)', padding: 32 }}>
        <style>{KEYFRAMES}</style>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div style={{ background: 'rgba(255,255,255,0.96)', borderRadius: 28, padding: 32, border: '4px solid #0f172a', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 72, animation: 'bob 2s ease-in-out infinite' }}>{result.passed ? '🎒' : '💀'}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: scoreColor, letterSpacing: 1, marginTop: 6 }}>{result.headline}</div>
            <div style={{ marginTop: 14, fontSize: 64, fontWeight: 900, color: scoreColor }}>{result.score}<span style={{ fontSize: 24, color: '#94a3b8' }}>/100</span></div>
            <p style={{ color: '#334155', fontSize: 14, lineHeight: 1.7, margin: '12px auto 0', maxWidth: 580 }}>{result.lesson}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={{ background: 'rgba(16,185,129,0.12)', border: '2px solid #10b981', borderRadius: 18, padding: 16 }}>
              <div style={{ color: '#065f46', fontWeight: 900, fontSize: 14, marginBottom: 10, letterSpacing: 1 }}>✅ SMART PICKS · {smart.length}</div>
              {smart.length === 0 ? <div style={{ color: '#065f46', fontSize: 12 }}>None — review the NDMA essentials.</div>
                : smart.map(i => <div key={i.id} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 12, color: '#065f46', alignItems: 'center' }}>
                  <ItemIcon item={i} size={28} /><div><strong>{i.name}</strong> <span style={{ color: '#047857' }}>· {i.wt} kg</span></div></div>)}
            </div>
            <div style={{ background: 'rgba(239,68,68,0.12)', border: '2px solid #ef4444', borderRadius: 18, padding: 16 }}>
              <div style={{ color: '#991b1b', fontWeight: 900, fontSize: 14, marginBottom: 10, letterSpacing: 1 }}>❌ TRAPS · {mistakes.length}</div>
              {mistakes.length === 0 ? <div style={{ color: '#065f46', fontSize: 12, fontWeight: 600 }}>✨ Zero traps — NDMA-clean!</div>
                : mistakes.map(i => <div key={i.id} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 12, color: '#991b1b', alignItems: 'center' }}>
                  <ItemIcon item={i} size={28} /><div><strong>{i.name}</strong> <span style={{ color: '#b91c1c' }}>· {i.wt} kg wasted</span></div></div>)}
            </div>
          </div>
          {missing.length > 0 && (
            <div style={{ background: 'rgba(245,158,11,0.15)', border: '2px solid #f59e0b', borderRadius: 18, padding: 16, marginBottom: 20 }}>
              <div style={{ color: '#78350f', fontWeight: 900, fontSize: 13, marginBottom: 8, letterSpacing: 1 }}>⚠️ MISSED NDMA ESSENTIALS</div>
              <div style={{ color: '#92400e', fontSize: 12, fontWeight: 600 }}>{missing.map(id => ESSENTIAL_LABELS[id]).join(' · ')}</div>
            </div>
          )}
          {(() => {
            const personas = [
              { key: 'child', label: 'Child', emoji: '🧒' },
              { key: 'elder', label: 'Elder', emoji: '👴' },
              { key: 'infant', label: 'Infant', emoji: '👶' },
              { key: 'woman', label: 'Women', emoji: '👩' },
              { key: 'pet', label: 'Pet', emoji: '🐾' },
            ]
            const covered = new Set(bagItems.filter(i => i.persona && !i.trap).map(i => i.persona))
            return (
              <div style={{ background: 'rgba(236,72,153,0.12)', border: '2px solid #ec4899', borderRadius: 18, padding: 16, marginBottom: 20 }}>
                <div style={{ color: '#831843', fontWeight: 900, fontSize: 13, marginBottom: 8, letterSpacing: 1 }}>
                  👨‍👩‍👧‍👦 FAMILY COVERAGE · {covered.size}/{personas.length}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {personas.map(p => {
                    const has = covered.has(p.key)
                    return (
                      <div key={p.key} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                        background: has ? 'rgba(16,185,129,0.18)' : 'rgba(148,163,184,0.18)',
                        color: has ? '#065f46' : '#64748b',
                        border: `1px solid ${has ? '#10b981' : '#cbd5e1'}`
                      }}>
                        <span style={{ fontSize: 14 }}>{p.emoji}</span>
                        <span>{has ? '✓' : '○'} {p.label}</span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ color: '#831843', fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
                  Disaster planning isn't only about you — NDMA's family-kit guidance covers the most vulnerable in your household first.
                </div>
              </div>
            )
          })()}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={retry} style={{ padding: '12px 28px', borderRadius: 999, background: '#fff', color: '#0f172a', border: '2px solid #0f172a', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>🔄 Try Again</button>
            <button onClick={() => gameDispatch({ type: 'BACK_TO_MODULES' })} style={{ padding: '12px 28px', borderRadius: 999, border: 'none', background: 'linear-gradient(135deg,#1e40af,#1d4ed8)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>← Back to Modules</button>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════ PLAY ═══════════
  const waterH = 30 + ((TIMER_START - timeLeft) / TIMER_START) * 120
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: 'linear-gradient(180deg,#0c1322,#1a2544)', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <style>{KEYFRAMES}</style>

      {/* Rain */}
      <div style={{
        position: 'fixed', inset: 0, background: `repeating-linear-gradient(0deg,transparent 0px,transparent 18px,rgba(174,194,224,0.06) 18px,rgba(174,194,224,0.06) 20px)`,
        backgroundSize: '100% 120px', animation: 'rainAnim 0.25s linear infinite', pointerEvents: 'none', zIndex: 50
      }} />

      {danger && <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 55, animation: 'danger-edge 0.6s infinite' }} />}

      {/* === WORLD === */}
      <div ref={worldElRef} style={{ position: 'absolute', width: WORLD_W, height: WORLD_H, willChange: 'transform' }}>
        {/* Sky */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: WORLD_W, height: 55, background: 'linear-gradient(180deg,#0c1322,#1a2544)' }} />
        {/* Roof */}
        <div style={{ position: 'absolute', left: 6, top: 42, width: 1666, height: 24, background: '#6B3410', borderTop: '3px solid #8B4513', borderBottom: '2px solid #3A1F0B', borderRadius: '2px 2px 0 0' }} />

        {/* Room backgrounds — flat colour + a subtle wall texture per room */}
        {ROOMS.map(r => (
          <div key={r.id} style={{
            position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h,
            backgroundColor: r.wall,
            backgroundImage: ROOM_TEX[r.id] || 'none',
            borderLeft: `3px solid ${r.trim}`,
            borderRight: `3px solid ${r.trim}`,
            boxShadow: 'inset 0 12px 28px rgba(0,0,0,0.08)',
          }} />
        ))}

        {/* Room labels */}
        {ROOMS.filter(r => r.id !== 'Stairs').map(r => <div key={r.id + 'lbl'} style={{ position: 'absolute', left: r.x + r.w / 2, top: r.y + 16, transform: 'translateX(-50%)', background: 'rgba(15,23,42,0.55)', color: '#fff', padding: '3px 12px', borderRadius: 10, fontSize: 10, fontWeight: 700, letterSpacing: 1, pointerEvents: 'none', opacity: 0.7 }}>{r.name.toUpperCase()}</div>)}

        {/* Windows — show rainy sky outside */}
        {WINDOWS.map((w, i) => (
          <div key={`win-${i}`} style={{
            position: 'absolute', left: w.x, top: w.y, width: w.w, height: w.h, zIndex: 1,
          }}>
            <svg viewBox={`0 0 ${w.w} ${w.h}`} width={w.w} height={w.h}>
              <WindowSprite w={w.w} h={w.h} />
            </svg>
          </div>
        ))}

        {/* Walls */}
        {WALLS_VIS.map((w, i) => <div key={i} style={{ position: 'absolute', left: w.x, top: w.y, width: w.w, height: w.h, background: '#5c3d2e', border: '1px solid #3a2510', zIndex: 2 }} />)}

        {/* Platforms — wood-plank texture for thick floors, simple shelf for thin ones */}
        {PLATFORMS.map((p, i) => (
          <div key={i} style={{
            position: 'absolute', left: p.x, top: p.y, width: p.w, height: p.h,
            ...(p.h > 10
              ? { backgroundImage: WOOD_FLOOR }
              : { background: '#7a5c3d' }),
            borderTop: '3px solid #3a2510',
            borderRadius: p.h <= 10 ? 2 : 0,
            boxShadow: p.h > 10 ? 'inset 0 -3px 0 rgba(0,0,0,0.25)' : 'none',
            zIndex: 3,
          }} />
        ))}

        {/* Stairs sprite — proper steps with railing, replaces the striped band */}
        <Sprite x={735} y={65} w={120} h={635} z={3}>
          <StairsSprite w={120} h={635} />
        </Sprite>

        {/* Foundation + flood water */}
        <div style={{ position: 'absolute', left: 0, top: 720, width: WORLD_W, height: 230, background: 'linear-gradient(180deg,#38271a,#1a1005)', zIndex: 30 }}>
          <div style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: waterH, background: 'linear-gradient(180deg,rgba(30,100,180,0.25),rgba(20,60,120,0.5))', transition: 'height 1s ease-out', borderTop: '2px solid rgba(100,180,255,0.3)' }} />
        </div>

        {/* Furniture — proper SVG illustrations per kind */}
        {FURNITURE_PIECES.map((f, i) => {
          const Comp = ({
            sofa: Sofa, diningSet: DiningSet, tvStand: TVStand, sideTable: SideTable,
            shoeRack: ShoeRack, tallAlmirah: TallAlmirah,
            kitchenSlab: KitchenSlab, fridge: Fridge, sink: Sink, kitchenShelf: KitchenShelf,
            bed: Bed, wardrobe: Wardrobe, bedsideTable: BedsideTable,
            washingMachine: WashingMachine, medCabinet: MedCabinet, bucket: Bucket,
            shelfUnit: ShelfUnit, cardboardBox: CardboardBox,
            pujaAltar: PujaAltar, smallAlmirah: SmallAlmirah,
          })[f.kind]
          if (!Comp) return null
          return (
            <Sprite key={`furn-${i}`} x={f.x} y={f.y} w={f.w} h={f.h} z={5}>
              <Comp w={f.w} h={f.h} />
            </Sprite>
          )
        })}

        {/* Front door */}
        {DOORS.map((d, i) => (
          <div key={`door-${i}`} style={{ position: 'absolute', left: d.x, top: d.y, width: d.w, height: d.h, zIndex: 4 }}>
            <svg viewBox={`0 0 ${d.w} ${d.h}`} width={d.w} height={d.h} style={{ overflow: 'visible' }}>
              <DoorSprite w={d.w} h={d.h} label={d.label} />
            </svg>
            <div style={{
              position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
              background: '#10b981', color: '#fff', fontSize: 9, fontWeight: 900,
              letterSpacing: 1, padding: '2px 6px', borderRadius: 4,
              border: '1px solid #064e3b', whiteSpace: 'nowrap',
            }}>{d.label}</div>
          </div>
        ))}

        {/* Potted plants */}
        {PLANTS.map((p, i) => (
          <div key={`plant-${i}`} style={{
            position: 'absolute', left: p.x, top: p.y, width: p.h, height: p.h, zIndex: 6,
          }}>
            <svg viewBox={`0 0 ${p.h} ${p.h}`} width={p.h} height={p.h} style={{ overflow: 'visible' }}>
              <PlantSprite h={p.h} />
            </svg>
          </div>
        ))}

        {/* Decor — full-colour OpenMoji SVG illustrations */}
        {DECOR.map((d, i) => {
          const code = emojiToCode(d.e)
          return (
            <img key={i}
              src={`${EMOJI_BASE}/${code}.svg`}
              alt=""
              draggable={false}
              style={{
                position: 'absolute', left: d.x, top: d.y, width: d.s, height: d.s,
                transform: 'translate(-50%,-50%)',
                animation: d.spin ? 'spin 4s linear infinite' : 'bob-sm 5s ease-in-out infinite',
                pointerEvents: 'none', userSelect: 'none', opacity: 0.92,
                filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))',
              }}
            />
          )
        })}

        {/* Items — full-colour OpenMoji illustrations, no flat-colour bubble in the way.
            A soft category-tinted glow appears only when the player is in pickup range. */}
        {CATALOGUE.filter(it => !bagIds.includes(it.id)).map(it => {
          const plate = CAT_PLATES[it.cat]
          const sz = (it.sz || ITEM_SIZE) * 1.1
          const isNear = nearbyItem?.id === it.id
          return (
            <div key={it.id}
              onMouseEnter={e => { setHoveredItem(it); setHoverPos({ x: e.clientX, y: e.clientY }) }}
              onMouseMove={e => setHoverPos({ x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => { if (nearItemRef.current?.id === it.id) pickupRef.current() }}
              style={{
                position: 'absolute', left: it.wx, top: it.wy, width: sz, height: sz,
                transform: 'translate(-50%,-50%)',
                cursor: isNear ? 'pointer' : 'default', zIndex: 10,
                animation: 'bob-sm 3.5s ease-in-out infinite',
              }}>
              {/* category-coloured halo when nearby */}
              {isNear && <div style={{
                position: 'absolute', inset: -6, borderRadius: '50%',
                background: `radial-gradient(circle, ${plate}55 0%, ${plate}00 70%)`,
                animation: 'pulse-ring 1.2s infinite', pointerEvents: 'none',
              }} />}
              {/* small ground shadow */}
              <div style={{
                position: 'absolute', left: '50%', bottom: -4,
                transform: 'translateX(-50%)',
                width: sz * 0.6, height: 6, borderRadius: '50%',
                background: 'radial-gradient(ellipse, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 70%)',
                pointerEvents: 'none',
              }} />
              {it.trap && <div style={{
                position: 'absolute', top: -3, right: -3, width: 14, height: 14,
                borderRadius: '50%', background: '#ef4444', color: '#fff',
                fontSize: 9, fontWeight: 900, lineHeight: '14px', textAlign: 'center',
                border: '1.5px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                pointerEvents: 'none',
              }}>!</div>}
              <ItemIcon item={it} size={sz} style={{
                filter: `drop-shadow(0 3px 4px rgba(0,0,0,0.45))${isNear ? ` drop-shadow(0 0 6px ${plate})` : ''}`,
              }} />
              {isNear && <div style={{
                position: 'absolute', top: -(sz / 2 + 4), left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(15,23,42,0.92)', color: '#fbbf24',
                padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800,
                whiteSpace: 'nowrap', border: '1px solid #fbbf24',
                animation: 'bob-sm 1.5s ease-in-out infinite',
              }}>E / SPACE</div>}
            </div>
          )
        })}

        {/* Player — full SVG cartoon character */}
        <div ref={playerElRef} style={{
          position: 'absolute', width: PLAYER_W, height: PLAYER_H, zIndex: 20,
          left: 100, top: 660, filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.35))',
        }}>
          <svg viewBox="0 0 24 40" width={PLAYER_W} height={PLAYER_H}
               style={{ overflow: 'visible' }}
               className="player-svg">
            {/* back arm */}
            <rect x="3" y="14" width="3" height="11" rx="1.5" fill="#fdba74" className="parm parm-back"/>
            {/* back leg */}
            <g className="pleg pleg-back">
              <rect x="8" y="28" width="4" height="11" rx="1.5" fill="#1d4ed8"/>
              <rect x="7" y="37" width="6" height="3" rx="1" fill="#1f2937"/>
            </g>
            {/* body / shirt */}
            <rect x="5" y="13" width="14" height="14" rx="3" fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.5"/>
            <rect x="9" y="20" width="6" height="3" fill="#fff" opacity="0.4"/>
            {/* front leg */}
            <g className="pleg pleg-front">
              <rect x="12" y="28" width="4" height="11" rx="1.5" fill="#1d4ed8"/>
              <rect x="11" y="37" width="6" height="3" rx="1" fill="#1f2937"/>
            </g>
            {/* head + hair */}
            <circle cx="12" cy="8" r="6.5" fill="#fed7aa" stroke="#92400e" strokeWidth="0.6"/>
            <path d="M5.5 6 Q6 1 12 1 Q18 1 18.5 7 Q15 4 12 5 Q9 4 5.5 6 Z" fill="#3f1d0b"/>
            <circle cx="10.5" cy="8.5" r="0.9" fill="#0f172a"/>
            <circle cx="14"   cy="8.5" r="0.9" fill="#0f172a"/>
            <path d="M11 11 Q12 12 13 11" stroke="#0f172a" strokeWidth="0.6" fill="none"/>
            {/* front arm */}
            <rect x="18" y="14" width="3" height="11" rx="1.5" fill="#fdba74" className="parm parm-front"/>
          </svg>
        </div>
      </div>

      {/* === HUD === */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30, padding: '8px 14px', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)', borderBottom: '3px solid #ef4444'
      }}>
        <div style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)', color: '#fff', padding: '5px 12px', borderRadius: 999, fontWeight: 800, fontSize: 11, letterSpacing: 0.5, animation: 'pulse-ring 1.2s infinite' }}>🌊 IMD FLOOD ALERT</div>
        {currentRoom && roomFlash && <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: 13, animation: 'roomFlash 1.5s ease-out forwards' }}>📍 {currentRoom.name}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            fontSize: 20, fontWeight: 900, color: timeLeft <= 15 ? '#ef4444' : timeLeft <= 30 ? '#f59e0b' : '#10b981', padding: '3px 10px', borderRadius: 8,
            background: 'rgba(0,0,0,0.4)', border: `2px solid ${timeLeft <= 15 ? '#ef4444' : timeLeft <= 30 ? '#f59e0b' : '#10b981'}`,
            animation: timeLeft <= 15 ? 'pulse-ring 0.7s infinite' : 'none'
          }}>⏱ {String(timeLeft).padStart(2, '0')}s</div>
          <div style={{
            fontSize: 12, color: '#fff', fontWeight: 700, padding: '5px 10px', borderRadius: 8,
            background: totalWeight > MAX_WEIGHT ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.2)',
            border: `2px solid ${totalWeight > MAX_WEIGHT ? '#ef4444' : '#10b981'}`
          }}>⚖️ {totalWeight.toFixed(1)}/{MAX_WEIGHT} kg</div>
        </div>
      </div>

      {/* Controls hint */}
      <div style={{
        position: 'fixed', bottom: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 30, display: 'flex', gap: 8,
        background: 'rgba(15,23,42,0.85)', padding: '5px 14px', borderRadius: 10, fontSize: 10, color: '#94a3b8', fontWeight: 600
      }}>
        <span>← → Move</span><span>·</span><span>↑ Jump</span><span>·</span><span>E/Space Collect</span>
      </div>

      <BagPanel bagIds={bagIds} onFinish={() => finishRef.current()} bagRef={bagRef} onDrop={(id) => {
        setBagIds(prev => {
          const idx = prev.indexOf(id);
          if (idx !== -1) {
            const next = [...prev];
            next.splice(idx, 1);
            return next;
          }
          return prev;
        });
      }} />

      {hoveredItem && <ItemTooltip item={hoveredItem} x={hoverPos.x} y={hoverPos.y} />}

      {flying.map(f => (
        <div key={f.fid} style={{
          position: 'fixed', left: f.fromX, top: f.fromY, zIndex: 1000, pointerEvents: 'none',
          '--tx': `${f.tx}px`, '--ty': `${f.ty}px`, animation: 'flyToBag 0.65s cubic-bezier(.5,.2,.7,1) forwards',
          filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.35))'
        }}>
          <ItemIcon item={f.item} size={48} />
        </div>
      ))}

      {/* In-Game Narrator */}
      {midGameNarrative && (
        <Narrator
          characterKey={midGameNarrative.characterKey}
          text={midGameNarrative.text}
          visible={midGameNarrative.visible}
          emotion={midGameNarrative.emotion}
          autoHide={true}
          onComplete={(status) => {
            if (status === 'hidden') setMidGameNarrative(prev => ({ ...prev, visible: false }))
          }}
        />
      )}
    </div>
  )
}
