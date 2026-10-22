import {
  THEME_PRESETS,
  type ThemePreset,
} from "./theme";
import type {
  PageBuilderComponents,
  PageBuilderData,
  PageBuilderRootProps,
} from "./config";

type Block = PageBuilderData["content"][number];

function block<T extends keyof PageBuilderComponents>(
  type: T,
  props: PageBuilderComponents[T] & { id: string }
): Block {
  return { type, props } as unknown as Block;
}

export const PAGE_THEME_OPTIONS = (
  Object.keys(THEME_PRESETS) as ThemePreset[]
).map((value) => ({
  value,
  label: THEME_PRESETS[value].label,
  description: THEME_PRESETS[value].description,
  primary: THEME_PRESETS[value].primary,
  accent: THEME_PRESETS[value].accent,
  image: THEME_PRESETS[value].heroImage,
}));

type ThemeCopy = {
  tagline: string;
  announcement: string;
  seoTitle: string;
  seoDescription: string;
  footer: { title: string; links: string }[];
};

const CONTACT = {
  phone: "+91 98765 43210",
  email: "hello@myclinic.example",
  address: "123 Main Road, Your City",
  hours: "Mon–Sat · 9:00 AM – 6:00 PM",
  mapUrl: "https://www.google.com/maps?q=123+Main+Road+Your+City&output=embed",
};

const NAV = [
  { label: "Home", href: "#home" },
  { label: "Services", href: "#services" },
  { label: "Doctors", href: "#doctors" },
  { label: "Reviews", href: "#reviews" },
  { label: "Contact", href: "#contact" },
];

const COPY: Record<ThemePreset, ThemeCopy> = {
  medical: {
    tagline: "Expert care, close to home",
    announcement: "Now accepting new patients · Same-week appointments available",
    seoTitle: "Expert medical care for every stage of life",
    seoDescription:
      "Modern, patient-first medical care with same-week appointments, experienced doctors and a friendly clinic team.",
    footer: [
      {
        title: "Care",
        links:
          "General medicine|#services\nPreventive care|#services\nOur doctors|#doctors\nPatient reviews|#reviews",
      },
      {
        title: "Clinic",
        links:
          "Book an appointment|#appointment\nHow it works|#process\nContact & location|#contact",
      },
    ],
  },
  dental: {
    tagline: "Gentle dentistry for the whole family",
    announcement: "New patient smile consultations available this week",
    seoTitle: "Gentle dental care for healthy, confident smiles",
    seoDescription:
      "Family dentistry, cosmetic treatments, implants and orthodontics delivered with a gentle, personal approach.",
    footer: [
      {
        title: "Dental care",
        links:
          "General dentistry|#services\nCosmetic dentistry|#services\nImplants|#services\nOrthodontics|#services",
      },
      {
        title: "Patients",
        links:
          "Book a consultation|#appointment\nMeet the dentists|#doctors\nSmile gallery|#gallery\nContact us|#contact",
      },
    ],
  },
  orthopaedic: {
    tagline: "Move better. Live stronger.",
    announcement: "Sports injury and joint pain clinics now open",
    seoTitle: "Expert orthopaedic care and rehabilitation",
    seoDescription:
      "Specialist orthopaedic assessment, sports injury care, joint treatment and rehabilitation in a modern clinic.",
    footer: [
      {
        title: "Treatment",
        links:
          "Orthopaedic assessment|#services\nSports injuries|#services\nJoint care|#services\nRehabilitation|#services",
      },
      {
        title: "Patients",
        links:
          "Book a consultation|#appointment\nMeet the team|#doctors\nYour visit|#process\nContact us|#contact",
      },
    ],
  },
  hospital: {
    tagline: "Advanced care, close to home",
    announcement: "Now accepting new patients · Book online or call our patient support team",
    seoTitle: "Advanced hospital care, close to home",
    seoDescription:
      "Comprehensive hospital care with experienced specialists, modern diagnostics, emergency services and patient-first support.",
    footer: [
      {
        title: "Departments",
        links:
          "General medicine|#services\nCardiology|#services\nOrthopaedics|#services\nDiagnostics|#services",
      },
      {
        title: "Patients",
        links:
          "Book an appointment|#appointment\nFind a doctor|#doctors\nPatient journey|#process\nContact us|#contact",
      },
    ],
  },
};

function makeRoot(theme: ThemePreset, clinicName: string): PageBuilderRootProps {
  const copy = COPY[theme];
  return {
    background: "muted",
    width: "full",
    theme,
    customize: "off",
    primaryColor: "",
    accentColor: "",
    backgroundColor: "",
    surfaceColor: "",
    textColor: "",
    mutedColor: "",
    borderColor: "",
    headingFont: "theme",
    bodyFont: "theme",
    radius: "theme",
    buttonShape: "theme",
    headerStyle: "theme",
    clinicName,
    logoUrl: "",
    tagline: copy.tagline,
    bookingLabel: "Book an appointment",
    bookingHref: "#appointment",
    announcement: copy.announcement,
    announcementHref: "#appointment",
    phone: CONTACT.phone,
    email: CONTACT.email,
    address: CONTACT.address,
    hours: CONTACT.hours,
    navItems: NAV.map((item) => ({ ...item })),
    footerColumns: copy.footer.map((column) => ({ ...column })),
    socialLinks: "Instagram|https://instagram.com\nFacebook|https://facebook.com",
    footerText: `© ${clinicName}. All rights reserved.`,
    seoTitle: copy.seoTitle,
    seoDescription: copy.seoDescription,
  };
}

function contactBlock(clinicName: string): Block {
  return block("ClinicDetails", {
    id: "contact",
    name: clinicName,
    address: CONTACT.address,
    phone: CONTACT.phone,
    email: CONTACT.email,
    hours: CONTACT.hours,
    bookingHref: "#appointment",
    mapUrl: CONTACT.mapUrl,
  });
}

function appointmentBlock({
  title,
  subtitle,
  tone = "brand",
}: {
  title: string;
  subtitle: string;
  tone?: "brand" | "dark" | "light";
}): Block {
  return block("AppointmentCTA", {
    id: "appointment",
    title,
    subtitle,
    phone: CONTACT.phone,
    buttonLabel: "Book an appointment",
    buttonHref: "#contact",
    tone,
  });
}

function faqBlock(
  items: { question: string; answer: string }[],
  title = "Frequently asked questions",
  subtitle = "Can't find what you need? Our team is happy to help."
): Block {
  return block("FAQ", {
    id: "faq",
    title,
    subtitle,
    items,
  });
}

function medicalTemplate(clinicName: string): Block[] {
  return [
    block("Hero", {
      id: "hero",
      eyebrow: "Trusted care, close to home",
      title: "Expert care for every stage of life.",
      subtitle:
        "From everyday check-ups to specialist treatment, our team combines modern medicine with a personal touch. Appointments that respect your time, and care that puts you first.",
      primaryLabel: "Book an appointment",
      primaryHref: "#appointment",
      secondaryLabel: "Explore services",
      secondaryHref: "#services",
      layout: "split",
      align: "left",
      tone: "light",
      imageUrl: "/website/medical-hero.webp",
      imageAlt: "Doctor welcoming a patient at the clinic",
      stats: [
        { value: "25+", label: "Years of care" },
        { value: "40k+", label: "Patients served" },
        { value: "4.9/5", label: "Patient rating" },
      ],
    }),
    block("Features", {
      id: "about",
      title: "Care built around you",
      subtitle: "Thoughtful medicine, clear answers and appointments that fit real life.",
      columns: "3",
      items: [
        {
          icon: "♥",
          title: "Patient-first care",
          description: "We listen carefully, explain clearly and involve you in every decision.",
        },
        {
          icon: "◷",
          title: "Same-week visits",
          description: "Flexible appointments, including early mornings for busy schedules.",
        },
        {
          icon: "✚",
          title: "Modern diagnostics",
          description: "Accurate on-site testing and treatment with the latest equipment.",
        },
      ],
    }),
    block("Services", {
      id: "services",
      title: "Care for every need",
      subtitle: "Comprehensive services delivered by an experienced, friendly team.",
      columns: "3",
      items: [
        {
          icon: "🩺",
          title: "General medicine",
          description: "Thorough assessments, treatment and ongoing support for adults.",
          href: "#appointment",
        },
        {
          icon: "🛡",
          title: "Preventive care",
          description: "Health checks, screenings and vaccinations to help you stay well.",
          href: "#appointment",
        },
        {
          icon: "🔬",
          title: "Diagnostics",
          description: "On-site testing with fast, accurate results and clear next steps.",
          href: "#appointment",
        },
        {
          icon: "👶",
          title: "Child health",
          description: "Gentle, family-friendly care for babies, children and teenagers.",
          href: "#appointment",
        },
        {
          icon: "🌸",
          title: "Women's health",
          description: "Confidential, supportive care across every stage of life.",
          href: "#appointment",
        },
        {
          icon: "💙",
          title: "Chronic care",
          description: "Personal plans for long-term conditions, with regular reviews.",
          href: "#appointment",
        },
      ],
    }),
    block("Stats", {
      id: "stats",
      tone: "brand",
      items: [
        { value: "25+", label: "Years of care" },
        { value: "40,000+", label: "Patients served" },
        { value: "98%", label: "Would recommend" },
        { value: "12", label: "Specialists" },
      ],
    }),
    block("Doctors", {
      id: "doctors",
      title: "Meet your care team",
      subtitle: "Experienced clinicians who listen first and explain every step.",
      items: [
        {
          name: "Dr. Aisha Khan",
          specialty: "General medicine",
          imageUrl: "/website/doctor-1.webp",
          bio: "Focused on preventive care and long-term wellbeing for the whole family.",
          href: "#appointment",
        },
        {
          name: "Dr. Rohan Mehta",
          specialty: "Specialist care",
          imageUrl: "/website/doctor-2.webp",
          bio: "Combines careful diagnostics with a calm, patient-first approach.",
          href: "#appointment",
        },
        {
          name: "Dr. Neha Shah",
          specialty: "Family health",
          imageUrl: "/website/doctor-3.webp",
          bio: "Helping patients feel informed, comfortable and confident in their care.",
          href: "#appointment",
        },
      ],
    }),
    block("Testimonials", {
      id: "reviews",
      title: "Kind words from our patients",
      subtitle: "Real experiences from people who trust us with their care.",
      items: [
        {
          quote:
            "The team explained everything clearly and made me feel completely at ease from the first visit.",
          name: "Priya S.",
          role: "Patient",
          rating: 5,
        },
        {
          quote:
            "I was seen quickly, treated with respect, and left with a plan I actually understood.",
          name: "Arjun M.",
          role: "Patient",
          rating: 5,
        },
        {
          quote:
            "A calm, friendly clinic that treats the whole family — including the nervous ones.",
          name: "Meera K.",
          role: "Parent",
          rating: 5,
        },
      ],
    }),
    appointmentBlock({
      title: "Your health can't wait.",
      subtitle:
        "Book a visit with our team. We will confirm your appointment and answer any questions before you arrive.",
      tone: "brand",
    }),
    faqBlock(
      [
        {
          question: "How do I book an appointment?",
          answer:
            "Use the booking button on this page or call the clinic. Our team will confirm a time that works for you.",
        },
        {
          question: "Do you accept walk-ins?",
          answer:
            "Walk-ins are welcome when space is available, but booking ahead helps us keep waiting times short.",
        },
        {
          question: "What should I bring to my first visit?",
          answer:
            "Please bring a photo ID, your insurance details if applicable, and a list of any medicines you currently take.",
        },
        {
          question: "Can I get a follow-up by phone?",
          answer:
            "Yes. Many follow-ups can be handled by phone or video. Our team will advise what is appropriate for your care.",
        },
      ]
    ),
    contactBlock(clinicName),
  ];
}

function dentalTemplate(clinicName: string): Block[] {
  return [
    block("Hero", {
      id: "hero",
      eyebrow: "Gentle dentistry for the whole family",
      title: "A healthier smile starts here.",
      subtitle:
        "Modern dental care in a calm, welcoming clinic. From routine check-ups to complete smile transformations, we make every visit comfortable and clear.",
      primaryLabel: "Book a smile consultation",
      primaryHref: "#appointment",
      secondaryLabel: "See our treatments",
      secondaryHref: "#services",
      layout: "image",
      align: "left",
      tone: "light",
      imageUrl: "/website/dental-hero.webp",
      imageAlt: "Modern dental clinic",
      stats: [
        { value: "15+", label: "Years of dentistry" },
        { value: "8k+", label: "Happy smiles" },
        { value: "5★", label: "Patient rated" },
      ],
    }),
    block("Features", {
      id: "about",
      title: "Dentistry without the worry",
      subtitle: "We take the time to explain, reassure and make treatment feel manageable.",
      columns: "3",
      items: [
        {
          icon: "🦷",
          title: "Gentle appointments",
          description: "Numbing options, a calm pace and a team that explains every step.",
        },
        {
          icon: "✨",
          title: "Modern technology",
          description: "Digital X-rays, intraoral scans and precise, minimally invasive care.",
        },
        {
          icon: "💳",
          title: "Flexible plans",
          description: "Transparent pricing and payment options to fit your family's budget.",
        },
      ],
    }),
    block("Services", {
      id: "services",
      title: "Complete dental care",
      subtitle: "From preventive check-ups to cosmetic dentistry, all under one roof.",
      columns: "3",
      items: [
        {
          icon: "🪥",
          title: "General dentistry",
          description: "Check-ups, cleanings, fillings and preventive care for all ages.",
          href: "#appointment",
        },
        {
          icon: "😁",
          title: "Cosmetic dentistry",
          description: "Veneers, bonding and smile design tailored to your goals.",
          href: "#appointment",
        },
        {
          icon: "🦷",
          title: "Dental implants",
          description: "Long-lasting tooth replacement with a natural look and feel.",
          href: "#appointment",
        },
        {
          icon: "📐",
          title: "Orthodontics",
          description: "Clear aligners and braces for children, teens and adults.",
          href: "#appointment",
        },
        {
          icon: "🩺",
          title: "Root canal treatment",
          description: "Comfortable, precise treatment that saves your natural tooth.",
          href: "#appointment",
        },
        {
          icon: "🌟",
          title: "Teeth whitening",
          description: "Safe, professional whitening for a brighter, confident smile.",
          href: "#appointment",
        },
      ],
    }),
    block("Gallery", {
      id: "gallery",
      title: "A clinic designed for comfort",
      subtitle: "Bright treatment rooms, modern equipment and a team that makes you feel at home.",
      columns: "3",
      images: [
        {
          src: "/website/dental-clinic-1.webp",
          alt: "Modern dental treatment room",
          caption: "Modern treatment rooms",
        },
        {
          src: "/website/dental-clinic-2.webp",
          alt: "Dentist reviewing a dental X-ray",
          caption: "Digital diagnostics",
        },
        {
          src: "/website/dental-clinic-3.webp",
          alt: "Clear aligner treatment",
          caption: "Cosmetic & orthodontic care",
        },
      ],
    }),
    block("Stats", {
      id: "stats",
      tone: "dark",
      items: [
        { value: "15+", label: "Years of care" },
        { value: "8,000+", label: "Smiles transformed" },
        { value: "98%", label: "Would recommend" },
        { value: "6", label: "Dental specialists" },
      ],
    }),
    block("Doctors", {
      id: "doctors",
      title: "Meet your dentists",
      subtitle: "A friendly team with a shared commitment to gentle, evidence-based dentistry.",
      items: [
        {
          name: "Dr. Sana Kapoor",
          specialty: "General & cosmetic dentistry",
          imageUrl: "/website/doctor-3.webp",
          bio: "Known for a calm manner and a meticulous eye for natural-looking results.",
          href: "#appointment",
        },
        {
          name: "Dr. Vikram Rao",
          specialty: "Implant dentistry",
          imageUrl: "/website/doctor-2.webp",
          bio: "Helping patients restore comfort, function and confidence with implant care.",
          href: "#appointment",
        },
        {
          name: "Dr. Leena Joseph",
          specialty: "Orthodontics",
          imageUrl: "/website/doctor-1.webp",
          bio: "Creating healthy, confident smiles for children, teens and adults.",
          href: "#appointment",
        },
      ],
    }),
    block("Testimonials", {
      id: "reviews",
      title: "Smiles worth talking about",
      subtitle: "Kind words from patients who trusted us with their dental care.",
      items: [
        {
          quote:
            "I used to dread the dentist. The team was so patient and gentle that I actually look forward to my check-ups now.",
          name: "Ananya R.",
          role: "Patient",
          rating: 5,
        },
        {
          quote:
            "My veneers look completely natural. Every step was explained clearly and the results exceeded my expectations.",
          name: "Karan D.",
          role: "Cosmetic patient",
          rating: 5,
        },
        {
          quote:
            "They made my daughter feel safe and celebrated her first visit. A truly family-friendly clinic.",
          name: "Shreya P.",
          role: "Parent",
          rating: 5,
        },
      ],
    }),
    faqBlock(
      [
        {
          question: "Is the first consultation painful?",
          answer:
            "Most first visits are a conversation and a gentle examination. We use numbing options where needed and always agree on comfort steps before treatment.",
        },
        {
          question: "Do you treat children?",
          answer:
            "Yes. We welcome children of all ages and help them build positive habits with a calm, friendly first experience.",
        },
        {
          question: "How much does a smile consultation cost?",
          answer:
            "Consultation fees are confirmed when you book. If treatment is recommended, you receive a clear written plan and cost estimate before deciding.",
        },
        {
          question: "Can I pay in instalments?",
          answer:
            "We offer flexible payment options for larger treatment plans. Ask our front desk team for details when you book.",
        },
      ],
      "Dental questions, answered",
      "Everything you need to know before your first visit."
    ),
    appointmentBlock({
      title: "Ready for a healthier, happier smile?",
      subtitle:
        "Book a friendly consultation with our dental team. We will listen, assess and explain your options with no pressure.",
      tone: "brand",
    }),
    contactBlock(clinicName),
  ];
}

function orthopaedicTemplate(clinicName: string): Block[] {
  return [
    block("Hero", {
      id: "hero",
      eyebrow: "Orthopaedic & sports injury care",
      title: "Move better. Live stronger.",
      subtitle:
        "Specialist assessment and rehabilitation for joint pain, sports injuries and everyday mobility. Clear advice, modern treatment and a plan built around your goals.",
      primaryLabel: "Book an assessment",
      primaryHref: "#appointment",
      secondaryLabel: "Explore treatment",
      secondaryHref: "#services",
      layout: "image",
      align: "left",
      tone: "light",
      imageUrl: "/website/orthopaedic-hero.webp",
      imageAlt: "Orthopaedic specialist consulting a patient",
      stats: [
        { value: "20+", label: "Years of experience" },
        { value: "12k+", label: "Patients treated" },
        { value: "4.9/5", label: "Patient rating" },
      ],
    }),
    block("Stats", {
      id: "stats",
      tone: "dark",
      items: [
        { value: "20+", label: "Years of experience" },
        { value: "12,000+", label: "Patients treated" },
        { value: "96%", label: "Return to activity" },
        { value: "9", label: "Specialist clinicians" },
      ],
    }),
    block("Services", {
      id: "services",
      title: "Specialist treatment, tailored to you",
      subtitle: "From diagnosis to rehabilitation, we support every step of your recovery.",
      columns: "3",
      items: [
        {
          icon: "🦴",
          title: "Orthopaedic assessment",
          description: "Detailed examination and imaging to find the cause of your pain.",
          href: "#appointment",
        },
        {
          icon: "🏃",
          title: "Sports injuries",
          description: "Fast assessment and recovery plans for sprains, strains and overuse.",
          href: "#appointment",
        },
        {
          icon: "🦵",
          title: "Joint & knee care",
          description: "Conservative treatment and injection therapy for joint pain.",
          href: "#appointment",
        },
        {
          icon: "💪",
          title: "Physiotherapy",
          description: "Targeted exercise programmes to restore strength and movement.",
          href: "#appointment",
        },
        {
          icon: "🩻",
          title: "Diagnostic imaging",
          description: "On-site X-ray and ultrasound for faster, clearer answers.",
          href: "#appointment",
        },
        {
          icon: "🔄",
          title: "Rehabilitation",
          description: "Structured recovery plans that help you return to the life you love.",
          href: "#appointment",
        },
      ],
    }),
    block("Process", {
      id: "process",
      title: "Your recovery, made simple",
      subtitle: "A clear pathway from your first assessment to getting back to what you love.",
      steps: [
        {
          title: "Assess",
          description:
            "We listen to your story, examine carefully and use imaging only when it adds value.",
        },
        {
          title: "Plan",
          description:
            "You receive a clear diagnosis, treatment options and realistic recovery timeframes.",
        },
        {
          title: "Recover",
          description:
            "Your physiotherapy and follow-up plan is adjusted as you progress, with clear milestones.",
        },
      ],
    }),
    block("Doctors", {
      id: "doctors",
      title: "Meet your orthopaedic team",
      subtitle: "Specialists who combine surgical expertise with a strong focus on conservative care.",
      items: [
        {
          name: "Dr. Arvind Nair",
          specialty: "Orthopaedic surgery",
          imageUrl: "/website/doctor-2.webp",
          bio: "Special interest in knee and shoulder conditions, with a minimally invasive approach.",
          href: "#appointment",
        },
        {
          name: "Dr. Farah Siddiqui",
          specialty: "Sports medicine",
          imageUrl: "/website/doctor-3.webp",
          bio: "Helping athletes and active people return to sport safely and confidently.",
          href: "#appointment",
        },
        {
          name: "Dr. Daniel Thomas",
          specialty: "Physiotherapy",
          imageUrl: "/website/doctor-4.webp",
          bio: "Exercise-led rehabilitation for long-term strength, mobility and pain relief.",
          href: "#appointment",
        },
      ],
    }),
    block("Testimonials", {
      id: "reviews",
      title: "Back to doing what you love",
      subtitle: "Stories from patients who regained movement and confidence.",
      items: [
        {
          quote:
            "After months of knee pain, I finally understood what was wrong. The plan was clear and I was back walking pain-free within weeks.",
          name: "Rahul V.",
          role: "Patient",
          rating: 5,
        },
        {
          quote:
            "The team took my sports injury seriously and got me back on the field stronger than before.",
          name: "Ishita B.",
          role: "Athlete",
          rating: 5,
        },
        {
          quote:
            "No pressure for surgery. They explained every option and the physiotherapy programme worked.",
          name: "Mohan L.",
          role: "Patient",
          rating: 5,
        },
      ],
    }),
    faqBlock(
      [
        {
          question: "Do I need a referral to see an orthopaedic specialist?",
          answer:
            "You can book directly. If your insurer requires a referral, our team will guide you through the paperwork.",
        },
        {
          question: "Will I need surgery?",
          answer:
            "Most orthopaedic conditions improve without surgery. We always discuss conservative options first and only recommend surgery when it is clearly the best choice.",
        },
        {
          question: "How soon can I be seen after an injury?",
          answer:
            "We keep urgent slots for acute injuries. Call the clinic and our team will find the earliest available appointment.",
        },
        {
          question: "Do you provide rehabilitation after surgery?",
          answer:
            "Yes. Our physiotherapy team works closely with your surgeon to create a structured recovery programme.",
        },
      ],
      "Orthopaedic questions, answered",
      "Clear answers about assessment, treatment and recovery."
    ),
    appointmentBlock({
      title: "Don't let pain hold you back.",
      subtitle:
        "Book a specialist assessment and get a clear plan for moving forward — whether that means physiotherapy, medication or surgery.",
      tone: "dark",
    }),
    contactBlock(clinicName),
  ];
}

function hospitalTemplate(clinicName: string): Block[] {
  return [
    block("EmergencyBanner", {
      id: "emergency",
      text: "24/7 emergency care available. If this is an emergency, call us now.",
      phone: CONTACT.phone,
      href: `tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`,
      tone: "accent",
    }),
    block("Hero", {
      id: "hero",
      eyebrow: "Advanced care, close to home",
      title: "Exceptional care for every stage of life.",
      subtitle:
        "A modern hospital with experienced specialists, advanced diagnostics and a team that treats you like family. From emergency care to planned treatment, we are here when you need us.",
      primaryLabel: "Book an appointment",
      primaryHref: "#appointment",
      secondaryLabel: "Find a department",
      secondaryHref: "#services",
      layout: "image",
      align: "left",
      tone: "light",
      imageUrl: "/website/hospital-hero.webp",
      imageAlt: "Modern hospital building",
      stats: [
        { value: "24/7", label: "Emergency care" },
        { value: "50+", label: "Specialists" },
        { value: "200+", label: "Beds" },
        { value: "4.8/5", label: "Patient rating" },
      ],
    }),
    block("Services", {
      id: "services",
      title: "Comprehensive hospital departments",
      subtitle: "Expert care across specialties, supported by modern diagnostics and dedicated teams.",
      columns: "4",
      items: [
        {
          icon: "🫀",
          title: "Cardiology",
          description: "Heart screening, diagnostics and specialist treatment.",
          href: "#appointment",
        },
        {
          icon: "🦴",
          title: "Orthopaedics",
          description: "Joint, spine and sports injury care with rehabilitation.",
          href: "#appointment",
        },
        {
          icon: "🧠",
          title: "Neurology",
          description: "Assessment and care for neurological symptoms and conditions.",
          href: "#appointment",
        },
        {
          icon: "👶",
          title: "Paediatrics",
          description: "Gentle, family-centred care for babies and children.",
          href: "#appointment",
        },
        {
          icon: "🩺",
          title: "General medicine",
          description: "Diagnosis and treatment for adults across common conditions.",
          href: "#appointment",
        },
        {
          icon: "🔬",
          title: "Diagnostics",
          description: "Pathology, imaging and health screening under one roof.",
          href: "#appointment",
        },
        {
          icon: "🚑",
          title: "Emergency",
          description: "24/7 emergency assessment and critical care.",
          href: "#appointment",
        },
        {
          icon: "💙",
          title: "Preventive health",
          description: "Executive health checks and personalised prevention plans.",
          href: "#appointment",
        },
      ],
    }),
    block("Stats", {
      id: "stats",
      tone: "brand",
      items: [
        { value: "24/7", label: "Emergency care" },
        { value: "50+", label: "Specialists" },
        { value: "200+", label: "Inpatient beds" },
        { value: "100k+", label: "Patients cared for" },
      ],
    }),
    block("Process", {
      id: "process",
      title: "Care that feels coordinated",
      subtitle: "One team, one plan, and clear communication from arrival to follow-up.",
      steps: [
        {
          title: "Get in touch",
          description:
            "Book online or call our patient support team. For emergencies, come straight to our 24/7 department.",
        },
        {
          title: "Meet your specialist",
          description:
            "We review your history, arrange any tests and explain your options in plain language.",
        },
        {
          title: "Treatment & follow-up",
          description:
            "Your care team coordinates treatment, discharge planning and follow-up so nothing falls through the gaps.",
        },
      ],
    }),
    block("Doctors", {
      id: "doctors",
      title: "Find the right specialist",
      subtitle: "A multidisciplinary team working together around your needs.",
      items: [
        {
          name: "Dr. Kavita Menon",
          specialty: "Cardiology",
          imageUrl: "/website/doctor-1.webp",
          bio: "Preventive cardiology and long-term heart health with a patient-centred approach.",
          href: "#appointment",
        },
        {
          name: "Dr. Sameer Ali",
          specialty: "Orthopaedics",
          imageUrl: "/website/doctor-2.webp",
          bio: "Joint replacement and sports injury care focused on safe, lasting recovery.",
          href: "#appointment",
        },
        {
          name: "Dr. Rachel Fernandes",
          specialty: "Paediatrics",
          imageUrl: "/website/doctor-3.webp",
          bio: "Warm, family-friendly care for children from newborn through adolescence.",
          href: "#appointment",
        },
      ],
    }),
    block("Testimonials", {
      id: "reviews",
      title: "Trusted by families across the city",
      subtitle: "Compassionate care, clear communication and outcomes that matter.",
      items: [
        {
          quote:
            "From the emergency team to the ward staff, everyone was calm, kind and incredibly thorough. We felt looked after at every step.",
          name: "Nisha T.",
          role: "Patient family",
          rating: 5,
        },
        {
          quote:
            "The specialist explained my options clearly and involved me in the decision. I never felt rushed or uncertain.",
          name: "David R.",
          role: "Patient",
          rating: 5,
        },
        {
          quote:
            "The paediatric team made my son feel safe and explained everything to him in a way he understood.",
          name: "Ayesha M.",
          role: "Parent",
          rating: 5,
        },
      ],
    }),
    block("Gallery", {
      id: "gallery",
      title: "A modern hospital, designed around patients",
      subtitle: "Comfortable spaces, advanced facilities and easy access to the care you need.",
      columns: "3",
      images: [
        {
          src: "/website/hospital-hero.webp",
          alt: "Hospital building",
          caption: "Our hospital",
        },
        {
          src: "/website/hospital-team.webp",
          alt: "Hospital care team",
          caption: "Specialist care team",
        },
        {
          src: "/website/medical-hero.webp",
          alt: "Patient consultation",
          caption: "Patient consultations",
        },
      ],
    }),
    faqBlock(
      [
        {
          question: "How do I find the right department?",
          answer:
            "Call our patient support team or book a general consultation. We will direct you to the right specialist and coordinate any tests.",
        },
        {
          question: "Do you accept insurance?",
          answer:
            "We work with major insurers and can help with pre-authorisation. Please bring your policy details when you contact us.",
        },
        {
          question: "What should I bring for an admission?",
          answer:
            "Bring a photo ID, insurance details, your medication list and any recent test results. Our admissions team will guide you through the rest.",
        },
        {
          question: "Are visitors welcome?",
          answer:
            "Yes, within our visiting hours and clinical guidance. Our ward team can advise on current arrangements for your department.",
        },
      ],
      "Hospital questions, answered",
      "Practical information for patients and families."
    ),
    appointmentBlock({
      title: "Get the care you need, when you need it.",
      subtitle:
        "Book an appointment with the right specialist, or call our 24/7 team for urgent help.",
      tone: "brand",
    }),
    contactBlock(clinicName),
  ];
}

const TEMPLATES: Record<ThemePreset, (clinicName: string) => Block[]> = {
  medical: medicalTemplate,
  dental: dentalTemplate,
  orthopaedic: orthopaedicTemplate,
  hospital: hospitalTemplate,
};

export function makeThemeTemplate(theme: ThemePreset, clinicName: string): PageBuilderData {
  return {
    root: { props: makeRoot(theme, clinicName) },
    content: TEMPLATES[theme](clinicName),
  };
}
