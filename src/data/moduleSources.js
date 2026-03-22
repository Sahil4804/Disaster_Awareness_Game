// Official sources that back the scoring criteria for each module.
// Every document listed here is publicly available from a government or
// internationally recognised humanitarian organisation.

export const MODULE_SOURCES = {
  flood: {
    1: {
      moduleTitle: 'The 60-Second Go-Bag',
      rationale:
        'Item selection and weight priorities are derived from FEMA and Red Cross emergency-kit checklists. Items scoring 0 pts are those the same agencies classify as non-essential or hazardous when space is limited.',
      sources: [
        {
          org: 'FEMA — Ready.gov',
          icon: '🏛️',
          orgColor: '#3b82f6',
          title: 'Build A Kit — Emergency Supply List',
          excerpt:
            '"Water (one gallon per person per day for at least three days), food, battery-powered radio, flashlight, first aid kit, whistle, dust mask, plastic sheeting, moist towelettes, garbage bags, wrench/pliers, manual can opener, local maps, cell phone with chargers."',
          url: 'https://www.ready.gov/kit',
        },
        {
          org: 'American Red Cross',
          icon: '🔴',
          orgColor: '#ef4444',
          title: 'Emergency Preparedness & Disaster Relief — Survival Kit Supplies',
          excerpt:
            '"A go-bag (also called a bug-out bag or 72-hour kit) should be light enough to carry. Prioritise water, food, medication, copies of documents, cash and a change of clothes."',
          url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies/survival-kit-supplies.html',
        },
        {
          org: 'CDC — Centers for Disease Control',
          icon: '🏥',
          orgColor: '#22c55e',
          title: 'Emergency Preparedness & Response: Basic Disaster Supplies Kit',
          excerpt:
            '"Keep items in airtight plastic bags. Choose a backpack that is not too heavy to carry. Include prescription medications and a first aid manual."',
          url: 'https://www.cdc.gov/disasters/floods/',
        },
      ],
    },

    2: {
      moduleTitle: 'Home Defense',
      rationale:
        'The utility shut-off sequence (electricity before gas) and sandbag staggering pattern follow FEMA flood-proofing guidelines and US Army Corps of Engineers flood-control manuals.',
      sources: [
        {
          org: 'FEMA — Ready.gov',
          icon: '🏛️',
          orgColor: '#3b82f6',
          title: 'Floods — Before a Flood: How to Protect Your Home',
          excerpt:
            '"Turn off utilities at the main switches or valves if instructed to do so. Disconnect electrical appliances. Do not touch electrical equipment if you are wet or standing in water."',
          url: 'https://www.ready.gov/floods',
        },
        {
          org: 'American Red Cross',
          icon: '🔴',
          orgColor: '#ef4444',
          title: 'Flood Safety — How to Prepare for a Flood',
          excerpt:
            '"If flooding is likely, move essential items to an upper floor. Turn off the electricity at the main breaker. Sandbags placed in a staggered, brick-like pattern provide the best water resistance."',
          url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/flood.html',
        },
        {
          org: 'US Army Corps of Engineers',
          icon: '⚙️',
          orgColor: '#f59e0b',
          title: 'Flood Proofing Techniques — Temporary Flood Barriers',
          excerpt:
            '"Sandbags are most effective when stacked in an overlapping brick pattern. Each bag should be 2/3 full and tamped down firmly. A single-layer wall over 3 bags high requires a wider base."',
          url: 'https://www.usace.army.mil/Missions/Civil-Works/Levees/Flood-Risk-Management/',
        },
      ],
    },

    3: {
      moduleTitle: 'Yard Lockdown',
      rationale:
        'Hazard anchoring requirements derive from FEMA guidance on outdoor propane/chemical container securing and NOAA flood-safety recommendations on debris prevention.',
      sources: [
        {
          org: 'FEMA — Ready.gov',
          icon: '🏛️',
          orgColor: '#3b82f6',
          title: 'Floods — Protect Your Property',
          excerpt:
            '"Anchor fuel tanks and secure outdoor objects that floodwaters could carry away. Unsecured propane tanks and chemical containers can become deadly projectiles in moving water."',
          url: 'https://www.ready.gov/floods',
        },
        {
          org: 'NOAA / National Weather Service',
          icon: '🌩️',
          orgColor: '#60a5fa',
          title: 'Flood Safety — Preparing Before a Flood',
          excerpt:
            '"Remove or secure outdoor furniture, decorations, garbage cans, and other lightweight objects. Objects carried by floodwater can cause serious damage and injury."',
          url: 'https://www.weather.gov/safety/flood',
        },
        {
          org: 'US EPA',
          icon: '🌿',
          orgColor: '#22c55e',
          title: 'Flood Cleanup — Protecting Yourself From Contaminated Water',
          excerpt:
            '"Floodwaters can spread hazardous materials, including fuel, pesticides, and sewage. Securing storage tanks and containers before a flood prevents contamination of waterways and residential areas."',
          url: 'https://www.epa.gov/natural-disasters/flood-cleanup',
        },
      ],
    },

    4: {
      moduleTitle: 'The Sinking Car',
      rationale:
        'The SWOC escape sequence (Seatbelt, Window, Out, Children/others) and the advice to strike a window corner are sourced from NOAA\'s vehicle-flood-safety programme and automotive safety research.',
      sources: [
        {
          org: 'NOAA / National Weather Service',
          icon: '🌩️',
          orgColor: '#60a5fa',
          title: '"Turn Around, Don\'t Drown" — Vehicle Flood Safety',
          excerpt:
            '"Nearly half of all flood fatalities occur in vehicles. If your vehicle stalls in floodwater, abandon it immediately. Do not attempt to drive through water of unknown depth."',
          url: 'https://www.weather.gov/safety/flood-turn-around-dont-drown',
        },
        {
          org: 'FEMA — Ready.gov',
          icon: '🏛️',
          orgColor: '#3b82f6',
          title: 'Floods — During a Flood: If Trapped in a Vehicle',
          excerpt:
            '"Stay calm. Remove your seatbelt. Use a window-breaking tool or headrest prongs on the side window corner — not the centre. Once the window breaks, take a deep breath and swim out following your bubbles to the surface."',
          url: 'https://www.ready.gov/floods',
        },
        {
          org: 'American Red Cross',
          icon: '🔴',
          orgColor: '#ef4444',
          title: 'Flood Safety — What to Do if Trapped in a Vehicle',
          excerpt:
            '"If water enters your car: stay calm, unbuckle seatbelt, open or break window (use a pointed tool on corner of glass), and escape. Do not wait for water to equalise unless window is stuck."',
          url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/flood.html',
        },
      ],
    },

    5: {
      moduleTitle: 'Treacherous Trek',
      rationale:
        'Probing techniques and the "never walk in moving floodwater" rule come directly from NWS flood-safety publications and CDC disaster-walking guidance.',
      sources: [
        {
          org: 'NOAA / National Weather Service',
          icon: '🌩️',
          orgColor: '#60a5fa',
          title: 'Flood Safety — Pedestrian Hazards',
          excerpt:
            '"Do not walk through moving water. Six inches of moving water can knock you down. Use a stick to check the firmness of ground in front of you. Avoid storm drains, culverts, and ditches."',
          url: 'https://www.weather.gov/safety/flood',
        },
        {
          org: 'CDC — Centers for Disease Control',
          icon: '🏥',
          orgColor: '#22c55e',
          title: 'Floods — Staying Safe During a Flood',
          excerpt:
            '"Avoid walking in moving water. Even six inches of water can cause falls. Use a stick to check depth and ground stability. Floodwater often covers open manhole covers, grates, and washed-away road sections."',
          url: 'https://www.cdc.gov/disasters/floods/',
        },
        {
          org: 'FEMA — Ready.gov',
          icon: '🏛️',
          orgColor: '#3b82f6',
          title: 'Floods — During a Flood: Outdoors',
          excerpt:
            '"If you must walk in water, walk where water is not moving. Use a stick to check the ground ahead of you. Avoid bridges over fast-moving water."',
          url: 'https://www.ready.gov/floods',
        },
      ],
    },

    6: {
      moduleTitle: 'First Responder (Triage)',
      rationale:
        'Triage priority order (severe bleeding before minor wounds), floodwater wound-cleaning protocol (bottled water only), and hypothermia treatment follow WHO IFRC Psychological First Aid and Red Cross First Aid guidelines.',
      sources: [
        {
          org: 'American Red Cross',
          icon: '🔴',
          orgColor: '#ef4444',
          title: 'First Aid — Triage & Wound Care in Disasters',
          excerpt:
            '"Severe, uncontrolled bleeding is life-threatening and takes priority. Do not use floodwater to clean wounds — it contains sewage, bacteria, and chemical contaminants. Use only bottled or treated water."',
          url: 'https://www.redcross.org/take-a-class/first-aid',
        },
        {
          org: 'WHO — World Health Organization',
          icon: '🌍',
          orgColor: '#3b82f6',
          title: 'Floods — Public Health Impacts and Response',
          excerpt:
            '"Wound infection rates increase significantly after floods due to exposure to contaminated water. All wounds should be cleaned with clean water and covered immediately. Hypothermia should be treated by removing wet clothing and using insulating material."',
          url: 'https://www.who.int/health-topics/floods',
        },
        {
          org: 'FEMA — Ready.gov',
          icon: '🏛️',
          orgColor: '#3b82f6',
          title: 'Disaster First Aid — Responding to Medical Emergencies',
          excerpt:
            '"Apply the principles of triage: sort victims by severity. Those with life-threatening but survivable injuries (e.g., severe bleeding) are Priority 1. Minor injuries are Priority 3."',
          url: 'https://www.ready.gov/floods',
        },
      ],
    },

    7: {
      moduleTitle: 'Camp Safe Haven',
      rationale:
        'Ground tarp → poles → rainfly → stakes construction order, and the requirement for a rainfly, are from Red Cross and FEMA shelter-in-place guidelines and wilderness survival standards.',
      sources: [
        {
          org: 'American Red Cross',
          icon: '🔴',
          orgColor: '#ef4444',
          title: 'Shelter & Warmth — Emergency Shelter Setup',
          excerpt:
            '"Always place a ground barrier (tarp/poncho) under your sleeping area to prevent ground moisture from lowering body temperature. A rainfly or second tarp over the roof is mandatory for waterproofing in wet conditions."',
          url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/flood.html',
        },
        {
          org: 'FEMA — Ready.gov',
          icon: '🏛️',
          orgColor: '#3b82f6',
          title: 'Emergency Shelter — Protecting Against the Elements',
          excerpt:
            '"Ground insulation is critical — conductive heat loss to the ground is 25x faster than to air. Shelter construction should follow: ground barrier → frame → weather cover → secure anchors."',
          url: 'https://www.ready.gov/shelter',
        },
        {
          org: 'CDC — Centers for Disease Control',
          icon: '🏥',
          orgColor: '#22c55e',
          title: 'Extreme Heat & Cold — Hypothermia Prevention',
          excerpt:
            '"Hypothermia occurs when body temperature drops below 95°F. Ground contact accelerates heat loss. A ground tarp and overhead rain protection are the two most important elements of emergency shelter."',
          url: 'https://www.cdc.gov/disasters/floods/',
        },
      ],
    },

    8: {
      moduleTitle: 'SOS Signaling',
      rationale:
        'Tool selection by condition (mirror=day, flare=night, whistle=fog) and the 3-signal distress convention follow US Coast Guard, NOAA, and international maritime survival standards.',
      sources: [
        {
          org: 'US Coast Guard',
          icon: '⚓',
          orgColor: '#3b82f6',
          title: 'Visual Distress Signals — Approved Signaling Devices',
          excerpt:
            '"Orange smoke signals and mirror signals are highly visible in daylight. Red parachute flares are most effective at night. Aim flares high into the sky — never directly at a vessel. A whistle is the recommended signal in low visibility/fog."',
          url: 'https://www.uscg.mil/Auxiliary/Training/AUXOP/PV/USPS-VDS.pdf',
        },
        {
          org: 'NOAA — National Oceanic & Atmospheric Administration',
          icon: '🌊',
          orgColor: '#60a5fa',
          title: 'Survival at Sea — Emergency Signaling',
          excerpt:
            '"The international distress signal is three of anything — three whistle blasts, three fires, three mirror flashes. Mirror signals can be seen over 10 miles in sunlight. Signal mirrors should be aimed at the horizon, not downward."',
          url: 'https://www.noaa.gov/',
        },
        {
          org: 'FEMA — Ready.gov',
          icon: '🏛️',
          orgColor: '#3b82f6',
          title: 'Disaster Survival — How to Signal for Rescue',
          excerpt:
            '"Know when to use each tool: signal mirrors work best in bright sunlight; whistles carry further than shouting and require no energy; flares are for night or low-light conditions when searchers can see the light source."',
          url: 'https://www.ready.gov/',
        },
      ],
    },

    9: {
      moduleTitle: 'Toxic Cleanup',
      rationale:
        'Water purification sequence, generator placement outside only, and PPE requirements before mold contact are taken directly from CDC post-flood health guidelines and OSHA flood-worker safety standards.',
      sources: [
        {
          org: 'CDC — Centers for Disease Control',
          icon: '🏥',
          orgColor: '#22c55e',
          title: 'Floods: Cleaning Up After a Flood',
          excerpt:
            '"Floodwater may contain sewage, hazardous chemicals, and disease-causing organisms. Boil all water for at least 1 minute before use. Never use a generator indoors — even partially enclosed spaces can accumulate lethal CO levels within minutes."',
          url: 'https://www.cdc.gov/disasters/floods/cleanupwater.html',
        },
        {
          org: 'US EPA',
          icon: '🌿',
          orgColor: '#22c55e',
          title: 'Flood Cleanup — Mold, Carbon Monoxide & Contaminated Water',
          excerpt:
            '"Generators must be placed at least 20 feet from any window, door, or vent. Carbon monoxide is colourless and odourless. Before cleaning mould, put on an N-95 respirator, gloves, and goggles — all three are required."',
          url: 'https://www.epa.gov/natural-disasters/flood-cleanup',
        },
        {
          org: 'OSHA',
          icon: '🦺',
          orgColor: '#f59e0b',
          title: 'Flood Worker Safety — Cleanup Hazards',
          excerpt:
            '"Workers cleaning up flood damage face serious health hazards including carbon monoxide poisoning, contaminated water exposure, and mold inhalation. Three-piece PPE (respirator, gloves, goggles) is mandatory before mold remediation."',
          url: 'https://www.osha.gov/dts/weather/flood/',
        },
      ],
    },

    10: {
      moduleTitle: 'Invisible Trap',
      rationale:
        'The electrical danger radius and the advice to never enter water near downed lines come from OSHA electrical safety standards and FEMA flood-hazard publications.',
      sources: [
        {
          org: 'OSHA',
          icon: '🦺',
          orgColor: '#f59e0b',
          title: 'Electrical Safety — Downed Power Lines in Flooded Areas',
          excerpt:
            '"Never enter water that may be in contact with a downed power line. The danger zone can extend 20–30 metres from the contact point. Water conducts electricity in all directions. Assume every downed line is energised."',
          url: 'https://www.osha.gov/dts/weather/flood/',
        },
        {
          org: 'FEMA — Ready.gov',
          icon: '🏛️',
          orgColor: '#3b82f6',
          title: 'Floods — Electrical Safety After a Flood',
          excerpt:
            '"Do not walk in standing water if power lines are down nearby. If you see sparks or hear buzzing, crackling or popping, move away quickly. Report downed lines to your utility company and stay far away."',
          url: 'https://www.ready.gov/floods',
        },
        {
          org: 'NOAA / National Weather Service',
          icon: '🌩️',
          orgColor: '#60a5fa',
          title: 'Flood Safety — Electrical Hazards',
          excerpt:
            '"Step potential (ground gradient voltage) can electrocute a person standing on wet ground near a downed power line without them touching the line itself. The voltage spreads outward through the earth and water in all directions from the contact point."',
          url: 'https://www.weather.gov/safety/flood',
        },
      ],
    },

    11: {
      moduleTitle: 'Toxic Soup',
      rationale:
        'Visual identification of chemical contamination (rainbow sheen, chemical drums) and the advice that boiling cannot neutralise chemical toxins come from EPA and CDC flood-contamination guidance.',
      sources: [
        {
          org: 'US EPA',
          icon: '🌿',
          orgColor: '#22c55e',
          title: 'Flood Cleanup — Chemical Contamination in Floodwater',
          excerpt:
            '"Floodwater can contain a mix of raw sewage, industrial chemicals, pesticides, and fuel. A rainbow-coloured sheen indicates petroleum or chemical contamination. Boiling water kills pathogens but does NOT remove chemical contaminants."',
          url: 'https://www.epa.gov/natural-disasters/flood-cleanup',
        },
        {
          org: 'CDC — Centers for Disease Control',
          icon: '🏥',
          orgColor: '#22c55e',
          title: 'Floods — Avoiding Flood Water Hazards',
          excerpt:
            '"Avoid contact with floodwater. It may contain sewage, chemicals, heavy metals, and other hazardous substances. Even brief skin contact can cause rashes and infection. Do not allow children or pets to play in floodwater."',
          url: 'https://www.cdc.gov/disasters/floods/',
        },
        {
          org: 'WHO — World Health Organization',
          icon: '🌍',
          orgColor: '#3b82f6',
          title: 'Floods — Environmental Health in Emergencies',
          excerpt:
            '"Chemical contamination of water supplies following floods is a significant concern. Sources include agricultural runoff, ruptured storage tanks, and industrial waste. Water treatment by boiling is ineffective for chemical pollutants."',
          url: 'https://www.who.int/health-topics/floods',
        },
      ],
    },

    12: {
      moduleTitle: 'Wall of Water',
      rationale:
        'Flash flood travel speeds, the life-over-possessions principle, and high-ground escape priorities come from NOAA flash-flood safety research and NWS public-safety bulletins.',
      sources: [
        {
          org: 'NOAA / National Weather Service',
          icon: '🌩️',
          orgColor: '#60a5fa',
          title: 'Flash Flood Safety — Recognising and Surviving Flash Floods',
          excerpt:
            '"Flash floods are the #1 weather-related killer in the USA. They can produce walls of water 10–20 feet high moving at speeds up to 9 mph. If you hear a roaring sound or see approaching water, move immediately to high ground — do not stop for possessions."',
          url: 'https://www.weather.gov/safety/flood-flash',
        },
        {
          org: 'NOAA',
          icon: '🌊',
          orgColor: '#60a5fa',
          title: 'Floods Education — Flash Flood Facts',
          excerpt:
            '"Flash floods can roll boulders, tear out trees, destroy buildings, and obliterate bridges. Six inches of fast-moving floodwater can knock you off your feet; two feet can float your car."',
          url: 'https://www.noaa.gov/education/resource-collections/weather-atmosphere/floods',
        },
        {
          org: 'FEMA — Ready.gov',
          icon: '🏛️',
          orgColor: '#3b82f6',
          title: 'Floods — If a Flash Flood Warning is Issued',
          excerpt:
            '"Get to high ground immediately. Do not attempt to drive through flooded roadways. Abandon vehicles if floodwaters rise around them. Leave all belongings behind — material things can be replaced, lives cannot."',
          url: 'https://www.ready.gov/floods',
        },
      ],
    },

    13: {
      moduleTitle: 'Calm Mind',
      rationale:
        'Dialogue scoring follows WHO Psychological First Aid (PFA) principles: acknowledge, protect, direct. Aggressive commands and catastrophic agreement are specifically identified as harmful by WHO and SAMHSA crisis counselling guidelines.',
      sources: [
        {
          org: 'WHO — World Health Organization',
          icon: '🌍',
          orgColor: '#3b82f6',
          title: 'Psychological First Aid: Guide for Field Workers',
          excerpt:
            '"Psychological First Aid involves: (1) making contact and engaging; (2) ensuring safety and comfort; (3) stabilising overwhelmed survivors; (4) gathering information on needs; (5) providing practical assistance. Aggressive commands, dismissal, and amplifying fears are explicitly counter-indicated."',
          url: 'https://www.who.int/publications/i/item/9789241548205',
        },
        {
          org: 'SAMHSA',
          icon: '🧠',
          orgColor: '#a855f7',
          title: 'Crisis Counselling Assistance — Disaster Behavioural Health',
          excerpt:
            '"Effective crisis communication: use calm, slow speech; acknowledge feelings without agreeing with catastrophic conclusions; offer immediate, concrete tasks; stay physically present. Avoid ordering someone to "calm down" — this invalidates their experience."',
          url: 'https://www.samhsa.gov/dtac',
        },
        {
          org: 'American Red Cross',
          icon: '🔴',
          orgColor: '#ef4444',
          title: 'Disaster Mental Health — Helping Survivors Cope',
          excerpt:
            '"Grounding techniques (focusing on breathing, physical sensations, counting) activate the prefrontal cortex and reduce panic. Task-oriented dialogue — giving a survivor a purposeful job — restores agency and dramatically reduces panic behaviour."',
          url: 'https://www.redcross.org/',
        },
      ],
    },

    14: {
      moduleTitle: 'The Swarm',
      rationale:
        'Stagnant-water elimination targets (tyres, buckets, puddles) and their link to dengue/malaria outbreaks post-flood are drawn from CDC and WHO vector-control guidelines.',
      sources: [
        {
          org: 'CDC — Centers for Disease Control',
          icon: '🏥',
          orgColor: '#22c55e',
          title: 'Mosquitoes — Prevention After Floods',
          excerpt:
            '"After floods, standing water creates ideal mosquito-breeding conditions. Aedes aegypti (dengue vector) breeds in small containers — tyres, buckets, flower pots, puddles. Eliminating standing water within 1 week of flooding breaks the breeding cycle."',
          url: 'https://www.cdc.gov/mosquitoes/prevention/index.html',
        },
        {
          org: 'WHO — World Health Organization',
          icon: '🌍',
          orgColor: '#3b82f6',
          title: 'Floods — Vector-Borne Disease Outbreaks',
          excerpt:
            '"Floods are associated with increased risk of dengue, malaria, leptospirosis, and West Nile virus. Vector control — particularly elimination of standing water — is the single most effective post-flood public health intervention."',
          url: 'https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue',
        },
        {
          org: 'US EPA',
          icon: '🌿',
          orgColor: '#22c55e',
          title: 'Reducing Mosquito Breeding Sites After a Flood',
          excerpt:
            '"Standing water in any container larger than a bottle cap can support mosquito larvae within 7 days. The Aedes mosquito can lay 100–200 eggs per batch in containers as small as a bottle cap. Tip and toss all standing water every 5–7 days."',
          url: 'https://www.epa.gov/natural-disasters/flood-cleanup',
        },
      ],
    },
  },
}

export function getModuleSources(disaster, moduleNum) {
  if (!disaster || !moduleNum) return null
  return MODULE_SOURCES[disaster]?.[moduleNum] ?? null
}
