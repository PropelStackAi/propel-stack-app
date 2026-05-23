/**
 * Special Needs Family Support Hub — types (Session 12)
 */

export const DISCLAIMER_VERSION = 'PSAI-SNFS-DISC-v1.0';

export const DISCLAIMER_TEXT = `IMPORTANT NOTICE — PSAI-SNFS-DISC-v1.0

The Special Needs Family Support Hub provides general informational content only. This is NOT professional medical, psychological, therapeutic, or clinical advice.

Propel Stack AI, LLC is not a licensed healthcare provider, therapist, psychologist, or medical professional. All information provided in this hub is for general educational purposes only.

ALWAYS seek the advice of a qualified physician, licensed therapist, licensed psychologist, special education attorney, or other licensed professional for any medical, mental health, educational, or legal concerns specific to your situation. Information in this hub should never substitute for professional consultation.

IMMEDIATE CRISIS RESOURCES — available at all times:
• 911 — Emergency Services (immediate danger to self or others)
• 988 — Suicide & Crisis Lifeline (call or text 988)
• Text HOME to 741741 — Crisis Text Line
• NAMI Helpline: 1-800-950-6264 (Mon–Fri 10am–10pm ET)

For IMMEDIATE emergencies, psychosis, or any risk of harm to self or others — call 911 immediately. Do not use this app as a substitute for emergency services.

This tool does not store clinical records and is not HIPAA-covered. Do not enter protected health information belonging to other individuals.

By tapping "I Understand & Agree" you confirm that you have read this notice in full, that you understand the limitations of this tool, and that you will seek professional advice for medical, psychological, therapeutic, educational, and legal matters.`;

export interface SnfsMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  is_crisis: boolean;
  created_at: string;
}

export interface SnfsConversation {
  id: string;
  user_id: string;
  title: string;
  care_recipient_name: string;
  created_at: string;
  updated_at: string;
}

export interface CareTeamMember {
  id: string;
  user_id: string;
  name: string;
  role: string;
  organization: string;
  phone: string;
  email: string;
  notes: string;
  created_at: string;
}

export interface CrisisPlan {
  id: string;
  user_id: string;
  care_recipient_name: string;
  triggers: string;        // JSON array
  warning_signs: string;   // JSON array
  calming_strategies: string; // JSON array
  escalation_steps: string;   // JSON array
  emergency_contacts: string; // JSON array
  safe_person: string;
  safe_place: string;
  notes: string;
  updated_at: string;
}

export interface ProgressLog {
  id: string;
  user_id: string;
  care_recipient_name: string;
  goal: string;
  log_date: string;
  rating: number;
  notes: string;
  created_at: string;
}

// ── Condition Library ──────────────────────────────────────────────────────

export type ConditionCategory =
  | 'developmental'
  | 'neurological'
  | 'sensory'
  | 'mental-health'
  | 'learning'
  | 'physical'
  | 'behavioral'
  | 'multiple-complex'
  | 'aging-adults';

export interface ConditionCard {
  name: string;
  overview: string;
  commonSigns: string[];
  strategies: string[];
  referralGuidance: string;
  sources: string[];
}

export interface ConditionCategoryDef {
  id: ConditionCategory;
  label: string;
  emoji: string;
  description: string;
  conditions: ConditionCard[];
}

export const CONDITION_CATEGORIES: ConditionCategoryDef[] = [
  {
    id: 'developmental',
    label: 'Developmental',
    emoji: '🌱',
    description: 'Autism spectrum, intellectual disabilities, developmental delays, Down syndrome',
    conditions: [
      {
        name: 'Autism Spectrum Disorder (ASD)',
        overview: 'A neurodevelopmental condition characterized by differences in social communication, sensory processing, and patterns of behavior. ASD is a spectrum — no two individuals are the same.',
        commonSigns: ['Differences in eye contact or social reciprocity', 'Preference for routines and sameness', 'Sensory sensitivities (over- or under-responsive)', 'Repetitive movements or speech (stimming)', 'Focused interests', 'Differences in nonverbal communication'],
        strategies: ['Visual schedules and predictable routines', 'AAC (Augmentative and Alternative Communication) tools', 'Sensory accommodations in environment', 'Applied Behavior Analysis (ABA) — evidence-based', 'Social Stories™ for skill-building', 'Collaboration with SLP, OT, and behavioral specialist'],
        referralGuidance: 'Seek evaluation by a developmental pediatrician, child psychologist, or neuropsychologist. Request a referral for speech-language pathology (SLP), occupational therapy (OT), and behavioral support. Request an IEP evaluation if school-age.',
        sources: ['DSM-5-TR (APA, 2022)', 'CDC Autism Data & Statistics', 'IDEA 2004', 'NAMI Autism Resources'],
      },
      {
        name: 'Intellectual Disability (ID)',
        overview: 'Characterized by significant limitations in intellectual functioning and adaptive behavior, originating before age 18. Previously called "mental retardation" — that term is outdated and offensive.',
        commonSigns: ['Delays in learning to talk or walk', 'Difficulty with problem-solving', 'Challenges with daily living skills', 'Below-average intellectual functioning (IQ below ~70)', 'Difficulties with social rules and judgment'],
        strategies: ['Break tasks into small, concrete steps', 'Use visual supports and real-world practice', 'Focus on functional skills and independence', 'IDEA 2004 IEP with transition planning', 'Person-centered planning'],
        referralGuidance: 'Request comprehensive neuropsychological or psychological evaluation. Pursue early intervention services (ages 0-3) or school-based IEP. Connect with The Arc (thearc.org) for advocacy and resources.',
        sources: ['DSM-5-TR (APA, 2022)', 'AAIDD (American Association on Intellectual and Developmental Disabilities)', 'IDEA 2004', 'The Arc'],
      },
      {
        name: 'Global Developmental Delay',
        overview: 'Significant delays in two or more developmental domains (motor, speech, cognitive, social/emotional, activities of daily living) in children under age 5, before a specific diagnosis can be made.',
        commonSigns: ['Not meeting age-expected milestones', 'Motor delays (late crawling or walking)', 'Limited speech or language', 'Challenges with self-care', 'Social or play skill differences'],
        strategies: ['Early intervention services (Part C of IDEA for ages 0-3)', 'Physical therapy, OT, SLP', 'Stimulating home environment', 'Parent coaching programs'],
        referralGuidance: 'Contact your state\'s Early Intervention program immediately (federally mandated under IDEA). Request a developmental pediatrician evaluation. Ask about Part C services.',
        sources: ['CDC Developmental Milestones', 'IDEA Part C', 'AAP Developmental Surveillance Guidelines'],
      },
    ],
  },
  {
    id: 'neurological',
    label: 'Neurological',
    emoji: '🧠',
    description: 'ADHD, traumatic brain injury, epilepsy, cerebral palsy',
    conditions: [
      {
        name: 'ADHD (Attention-Deficit/Hyperactivity Disorder)',
        overview: 'A neurodevelopmental condition affecting attention regulation, impulse control, and executive functioning. Presents as predominantly inattentive, hyperactive-impulsive, or combined type.',
        commonSigns: ['Difficulty sustaining attention on tasks', 'Forgetfulness and disorganization', 'Difficulty waiting or taking turns', 'Frequent interrupting', 'Fidgeting or leaving seat', 'Hyperfocus on preferred activities'],
        strategies: ['Consistent routines and structure', 'Break tasks into small steps', 'Use timers and visual reminders', 'Reduce distractions in the environment', 'Positive reinforcement systems', '504 Plan or IEP accommodations at school', 'Exercise and outdoor time'],
        referralGuidance: 'Seek evaluation by a developmental pediatrician, child psychiatrist, or psychologist. Consider 504 Plan or IEP for school accommodations. Treatment may include behavioral therapy, executive function coaching, and/or medication (consult physician).',
        sources: ['DSM-5-TR (APA, 2022)', 'CHADD (chadd.org)', 'AAP Clinical Practice Guidelines for ADHD', 'IDEA 2004 / Section 504'],
      },
      {
        name: 'Traumatic Brain Injury (TBI)',
        overview: 'An acquired brain injury from an external force (falls, accidents, sports injuries). Effects vary widely based on location and severity — from mild concussion to severe TBI with lasting impairments.',
        commonSigns: ['Memory and concentration difficulties', 'Personality or mood changes', 'Fatigue', 'Headaches', 'Sensory sensitivities', 'Executive function challenges', 'Physical motor impairments'],
        strategies: ['Cognitive rehabilitation with a neuropsychologist', 'Fatigue management and pacing', 'Environmental modifications', 'School re-entry support with IEP', 'Psychological support for adjustment', 'Occupational and physical therapy'],
        referralGuidance: 'Immediate medical evaluation required after any head injury. Ongoing care from neurologist and neuropsychologist. Request IEP re-evaluation after TBI. BIAA (Brain Injury Association of America, biausa.org) has state chapters.',
        sources: ['BIAA', 'CDC TBI Resources', 'IDEA 2004 (TBI is a qualifying disability category)', 'AAP Concussion Guidelines'],
      },
      {
        name: 'Epilepsy / Seizure Disorders',
        overview: 'Recurrent seizures caused by abnormal brain activity. Types range from absence (brief "staring spells") to tonic-clonic. Many individuals with epilepsy also have co-occurring developmental or learning conditions.',
        commonSigns: ['Staring spells or brief unresponsiveness', 'Convulsions or muscle jerking', 'Sudden falls', 'Temporary confusion after a seizure', 'Automatic behaviors (automatisms)'],
        strategies: ['Strict medication adherence (under physician direction)', 'Seizure first aid training for all caregivers and school staff', 'Seizure action plan on file at school', 'Trigger identification and avoidance', 'Safety modifications at home', 'Medical ID bracelet'],
        referralGuidance: 'Neurologist required for diagnosis and medication management. Provide school with written seizure action plan. Epilepsy Foundation (epilepsy.com) has support resources.',
        sources: ['Epilepsy Foundation', 'AAP Seizure Disorder Resources', 'IDEA 2004'],
      },
    ],
  },
  {
    id: 'sensory',
    label: 'Sensory',
    emoji: '👁️',
    description: 'Sensory processing disorder, visual impairment, hearing impairment',
    conditions: [
      {
        name: 'Sensory Processing Disorder (SPD)',
        overview: 'The nervous system misprocesses sensory input, causing difficulty regulating responses to sensory experiences. Not formally in DSM-5 as standalone diagnosis but widely recognized by OTs and often co-occurs with ASD and ADHD.',
        commonSigns: ['Over-reactivity to touch, sound, light, taste, or smell', 'Under-reactivity (seeking intense sensory input)', 'Difficulty with clothing textures or food textures', 'Meltdowns in stimulating environments', 'Poor balance or body awareness'],
        strategies: ['Sensory diet designed by OT', 'Environmental modifications (lighting, noise, seating)', 'Deep pressure techniques (with OT guidance)', 'Weighted items (consult OT first)', 'Predictable sensory routines', 'Sensory breaks'],
        referralGuidance: 'Occupational therapist specializing in sensory integration is the primary resource. Request OT evaluation through school (under IDEA) or privately. STAR Institute (sensoryhealth.org) has resources.',
        sources: ['STAR Institute for Sensory Processing', 'OT Practice Guidelines', 'IDEA 2004'],
      },
      {
        name: 'Hearing Impairment / Deafness',
        overview: 'Ranges from mild hearing loss to profound deafness. Early identification and intervention are critical for language development. Deaf culture and identity are important considerations.',
        commonSigns: ['Inconsistent response to sounds', 'Frequent ear infections', 'Speech and language delays', 'Difficulty localizing sounds', 'Turning up TV volume'],
        strategies: ['Newborn hearing screening — mandated in all 50 states', 'Hearing aids or cochlear implants (medical decision — consult audiologist)', 'Sign language (ASL) or total communication approach', 'FM systems in classroom', 'IEP accommodations', 'Captioning and visual alerts'],
        referralGuidance: 'Audiologist for hearing evaluation. ENT for medical causes. SLP specializing in hearing loss for communication development. Contact your state\'s deaf education program.',
        sources: ['ASHA (American Speech-Language-Hearing Association)', 'National Association of the Deaf (nad.org)', 'IDEA 2004'],
      },
      {
        name: 'Visual Impairment / Blindness',
        overview: 'Ranges from low vision to total blindness. Early intervention supports development and learning. Braille, orientation and mobility training, and assistive technology are key supports.',
        commonSigns: ['Difficulty tracking objects', 'Rubbing eyes frequently', 'Squinting', 'Not making eye contact', 'Holding objects very close', 'Light sensitivity'],
        strategies: ['Vision therapy with a developmental optometrist', 'Orientation and mobility training', 'Braille instruction', 'Large-print materials', 'Screen readers and assistive technology', 'IEP with teacher of the visually impaired (TVI)'],
        referralGuidance: 'Ophthalmologist or optometrist for evaluation. IDEA provides for a teacher of the visually impaired (TVI) on IEP team. APH (American Printing House for the Blind, aph.org) has resources.',
        sources: ['AFB (American Foundation for the Blind, afb.org)', 'APH', 'IDEA 2004'],
      },
    ],
  },
  {
    id: 'mental-health',
    label: 'Mental Health',
    emoji: '💜',
    description: 'Anxiety, depression, bipolar disorder, PTSD, OCD, schizophrenia',
    conditions: [
      {
        name: 'Anxiety Disorders',
        overview: 'A group of conditions including generalized anxiety, social anxiety, separation anxiety, specific phobias, panic disorder, and selective mutism. Very common — affects 1 in 3 adolescents.',
        commonSigns: ['Excessive worry about multiple topics', 'Physical symptoms (stomachaches, headaches)', 'Avoidance of feared situations', 'Difficulty sleeping', 'School refusal', 'Irritability'],
        strategies: ['Cognitive Behavioral Therapy (CBT) — gold standard', 'Graduated exposure with therapist', 'Mindfulness and relaxation techniques', 'Predictable routines and advance preparation', 'School accommodations (504 or IEP)', 'Communication with school counselor'],
        referralGuidance: 'Licensed therapist or psychologist specializing in child/adolescent anxiety. Consult psychiatrist if medication evaluation needed. ADAA (adaa.org) and NAMI have resources.',
        sources: ['DSM-5-TR (APA, 2022)', 'ADAA (Anxiety and Depression Association of America)', 'NAMI', 'AAP Mental Health Toolkit'],
      },
      {
        name: 'Depression',
        overview: 'A mood disorder causing persistent sadness, loss of interest, and impaired functioning. Can affect children, adolescents, and adults. In children, irritability is often more prominent than sadness.',
        commonSigns: ['Persistent sad or irritable mood', 'Loss of interest in activities', 'Changes in sleep and appetite', 'Fatigue and low energy', 'Difficulty concentrating', 'Feelings of worthlessness', 'Thoughts of death (seek help immediately)'],
        strategies: ['Evidence-based psychotherapy (CBT, IPT)', 'Regular physical activity', 'Social connection and support', 'Consistent sleep schedule', 'School accommodations', 'Caregiver psychoeducation'],
        referralGuidance: 'Any thoughts of suicide require IMMEDIATE professional evaluation — call 988 or go to emergency room. Licensed therapist or psychologist for therapy. Psychiatrist for medication evaluation if needed.',
        sources: ['DSM-5-TR (APA, 2022)', 'NAMI', 'AAP Guidelines on Adolescent Depression', 'NIMH'],
      },
      {
        name: 'PTSD (Post-Traumatic Stress Disorder)',
        overview: 'Develops after exposure to actual or threatened traumatic events. Can occur at any age. In children, trauma responses may look different than in adults (e.g., re-enacting trauma in play).',
        commonSigns: ['Intrusive memories or nightmares', 'Avoidance of trauma reminders', 'Hypervigilance and startle response', 'Emotional numbing', 'Irritability and angry outbursts', 'Difficulty trusting others'],
        strategies: ['Trauma-Focused CBT (TF-CBT) — evidence-based for children', 'Safety and stability first', 'Predictable routines', 'Minimize trauma reminders', 'EMDR (with trained therapist)', 'School supports and accommodations'],
        referralGuidance: 'Licensed therapist specializing in trauma. Trauma-Focused CBT therapist directory: tfcbt.org. Never force recollection — seek professional guidance.',
        sources: ['DSM-5-TR (APA, 2022)', 'NAMI', 'ISTSS (International Society for Traumatic Stress Studies)', 'SAMHSA'],
      },
    ],
  },
  {
    id: 'learning',
    label: 'Learning Differences',
    emoji: '📚',
    description: 'Dyslexia, dyscalculia, dysgraphia, language processing disorders',
    conditions: [
      {
        name: 'Dyslexia',
        overview: 'A specific learning disability affecting accurate and fluent word recognition, spelling, and decoding. Neurobiological in origin — not a vision or intelligence problem. The most common learning disability.',
        commonSigns: ['Difficulty learning letter sounds (phonics)', 'Slow, effortful reading', 'Poor spelling', 'Avoidance of reading', 'Difficulty rhyming', 'Reversals in letters or words (common in early readers, persistent in dyslexia)'],
        strategies: ['Structured Literacy / Orton-Gillingham approach — evidence-based', 'Multisensory reading instruction', 'Audiobooks and text-to-speech tools', 'Extended time accommodations', 'IEP or 504 Plan', 'Early intervention is critical'],
        referralGuidance: 'Request school psychoeducational evaluation or private neuropsychological evaluation. IDA (dyslexiaida.org) has screeners and certified tutor directory. Advocate for explicit phonics instruction.',
        sources: ['IDA (International Dyslexia Association)', 'IDEA 2004', 'What Works Clearinghouse (WWC)'],
      },
      {
        name: 'Dyscalculia',
        overview: 'A specific learning disability affecting mathematics — number sense, arithmetic operations, math facts, and mathematical reasoning. Often under-recognized compared to dyslexia.',
        commonSigns: ['Difficulty counting backward', 'Confusion with math symbols', 'Trouble telling time', 'Difficulty with money concepts', 'Slow math fact retrieval', 'Difficulty estimating'],
        strategies: ['Concrete manipulatives (base-10 blocks)', 'Number line strategies', 'Calculators and math tools as accommodations', 'Visual representations', 'Extra time on math assessments', 'IEP or 504 supports'],
        referralGuidance: 'Request school psychoeducational evaluation. Dyscalculia.org has resources. Specialist in math learning disabilities for tutoring.',
        sources: ['DSM-5-TR (APA, 2022)', 'NCLD (National Center for Learning Disabilities, ncld.org)'],
      },
      {
        name: 'Dysgraphia',
        overview: 'A specific learning disability affecting written expression — handwriting, spelling, and written composition. Often co-occurs with dyslexia or ADHD.',
        commonSigns: ['Illegible or labored handwriting', 'Inconsistent letter spacing or sizing', 'Difficulty with pencil grip', 'Avoidance of writing tasks', 'Strong verbal skills but poor written output', 'Fatigue when writing'],
        strategies: ['Occupational therapy for fine motor and handwriting', 'Keyboarding as alternative to handwriting', 'Speech-to-text software', 'Reduced copying tasks', 'Graph paper for math', 'IEP or 504 accommodations'],
        referralGuidance: 'OT evaluation for fine motor skills. Psychoeducational evaluation for learning disability classification. Advocate for assistive technology (AT) in IEP.',
        sources: ['NCLD', 'DSM-5-TR (APA, 2022)', 'IDEA 2004 (AT mandate)'],
      },
    ],
  },
  {
    id: 'physical',
    label: 'Physical',
    emoji: '♿',
    description: 'Cerebral palsy, muscular dystrophy, spina bifida, chronic illness',
    conditions: [
      {
        name: 'Cerebral Palsy (CP)',
        overview: 'A group of movement disorders caused by brain injury or abnormal brain development, usually before or at birth. Affects muscle tone, movement, and motor skills. Non-progressive.',
        commonSigns: ['Muscle stiffness (spasticity) or floppiness', 'Delayed motor milestones', 'Difficulty with fine motor tasks', 'Gait abnormalities', 'Co-occurring conditions: seizures, vision, communication', 'Varies greatly in severity'],
        strategies: ['Physical therapy, OT, SLP from early intervention', 'Assistive technology (AAC, adapted equipment)', 'IEP with appropriate goals', 'Adaptive physical education', 'Medical management with physiatrist and neurologist', 'Social inclusion planning'],
        referralGuidance: 'Developmental pediatrician or pediatric neurologist for diagnosis. Early intervention referral immediately. United Cerebral Palsy (ucp.org) has resources and local affiliates.',
        sources: ['United Cerebral Palsy (ucp.org)', 'CDC CP Facts', 'IDEA 2004', 'AAP CP Guidelines'],
      },
      {
        name: 'Spina Bifida',
        overview: 'A neural tube defect where the spinal column does not close completely during early fetal development. Ranges from mild (spina bifida occulta) to severe (myelomeningocele).',
        commonSigns: ['Partial or full paralysis below the lesion level', 'Bladder and bowel management needs', 'Hydrocephalus (often present)', 'Learning differences', 'Latex allergy risk', 'Varying levels of independence'],
        strategies: ['Multidisciplinary care team (neurosurgeon, urologist, OT, PT, SLP)', 'Bladder and bowel management program', 'Mobility aids and adaptive equipment', 'IEP with health plan', 'Self-advocacy skill building', 'Transition planning for independence'],
        referralGuidance: 'Spina bifida clinic at children\'s hospital for coordinated care. Spina Bifida Association (spinabifidaassociation.org). IEP with health-related services.',
        sources: ['Spina Bifida Association (spinabifidaassociation.org)', 'CDC Spina Bifida Facts', 'IDEA 2004'],
      },
    ],
  },
  {
    id: 'behavioral',
    label: 'Behavioral',
    emoji: '🔶',
    description: 'Oppositional defiant disorder, conduct disorder, emotional dysregulation',
    conditions: [
      {
        name: 'Oppositional Defiant Disorder (ODD)',
        overview: 'A pattern of angry/irritable mood, argumentative/defiant behavior, or vindictiveness lasting at least 6 months. Often co-occurs with ADHD. Not just "bad behavior" — a treatable condition.',
        commonSigns: ['Frequent loss of temper', 'Arguing with adults or authority figures', 'Actively defying rules', 'Deliberately annoying others', 'Blaming others for mistakes', 'Spiteful or vindictive behavior'],
        strategies: ['Parent Management Training (PMT) — evidence-based', 'Positive Behavioral Interventions and Supports (PBIS)', 'Consistent, calm limit-setting', 'Natural and logical consequences', 'Avoid power struggles', 'Family therapy', 'School behavioral support plan'],
        referralGuidance: 'Licensed therapist specializing in child behavior (PMT trained). Rule out co-occurring ADHD, anxiety, or trauma. School-based behavioral support team and functional behavior assessment (FBA).',
        sources: ['DSM-5-TR (APA, 2022)', 'AAP Behavioral Health Guidelines', 'PBIS.org'],
      },
      {
        name: 'Emotional Dysregulation',
        overview: 'Difficulty managing emotional responses to situations — common in many conditions including ADHD, autism, PTSD, bipolar, ODD. Not a standalone DSM diagnosis but a functional challenge requiring support.',
        commonSigns: ['Intense emotional reactions disproportionate to trigger', 'Difficulty calming once upset', 'Emotional meltdowns or shutdowns', 'Rapid mood shifts', 'Difficulty identifying emotions', 'Recovery takes a long time'],
        strategies: ['Dialectical Behavior Therapy (DBT) skills — evidence-based', 'Co-regulation with trusted adult', 'Emotional vocabulary building (Zones of Regulation)', 'Sensory strategies', 'Proactive hunger/sleep/sensory management', 'Safety planning for extreme episodes'],
        referralGuidance: 'Therapist trained in DBT or CBT for emotional regulation. OT for sensory component. Psychiatrist evaluation for underlying mood disorder. School crisis team consultation.',
        sources: ['DBT (Marsha Linehan)', 'Zones of Regulation curriculum', 'NAMI', 'PBIS.org'],
      },
    ],
  },
  {
    id: 'multiple-complex',
    label: 'Multiple / Complex Needs',
    emoji: '🔗',
    description: 'Dual diagnosis, complex medical and behavioral, rare conditions',
    conditions: [
      {
        name: 'Dual Diagnosis (Intellectual Disability + Mental Health)',
        overview: 'Individuals with intellectual disabilities have 3-4x higher rates of mental health conditions. Diagnosis is more complex because symptoms may manifest differently. Both needs must be addressed simultaneously.',
        commonSigns: ['Behavioral changes that represent emotional distress', 'Regression in skills', 'Self-injurious behavior', 'Aggression without clear trigger', 'Sleep disturbances', 'Loss of daily living skills'],
        strategies: ['Integrated treatment addressing both ID and MH needs', 'Behaviorally informed psychiatric evaluation', 'Positive Behavior Support (PBS) plan', 'Communication assessment to rule out frustration as trigger', 'Trauma-informed care', 'Respite for caregivers'],
        referralGuidance: 'Psychiatrist or psychologist with expertise in intellectual disability and mental health (often called "dual diagnosis" specialists). NADD (thenadd.org) has a provider directory.',
        sources: ['NADD (National Association for the Dually Diagnosed, thenadd.org)', 'DSM-5-TR (APA, 2022)', 'IDEA 2004'],
      },
      {
        name: 'Complex Medical + Developmental Needs',
        overview: 'Children and adults with multiple co-occurring medical and developmental conditions requiring coordinated, intensive care across many systems. Often called "medically fragile" or "medically complex."',
        commonSigns: ['Multiple specialist appointments', 'Feeding or nutrition challenges', 'Respiratory or cardiac concerns', 'Mobility and positioning needs', 'Complex medication regimens', 'Technology-dependent (ventilator, feeding tube, etc.)'],
        strategies: ['Medical home model with coordinating care team', 'IEP with extensive related services', 'Care coordinator or case manager', 'Family-centered planning', 'Transition planning from pediatric to adult medical care', 'Caregiver self-care and respite'],
        referralGuidance: 'Pediatric complex care clinic at a children\'s hospital. Request a care coordinator through state Medicaid or early intervention. Family Voices (familyvoices.org) supports families of medically complex children.',
        sources: ['Family Voices (familyvoices.org)', 'Complex Care Community (complexchild.com)', 'IDEA 2004', 'Medicaid Home and Community-Based Services Waivers'],
      },
    ],
  },
  {
    id: 'aging-adults',
    label: 'Aging Adults (18–100+)',
    emoji: '🌿',
    description: 'Dementia, ALS, Parkinson\'s disease, acquired brain injury in adults',
    conditions: [
      {
        name: 'Dementia (including Alzheimer\'s Disease)',
        overview: 'A group of symptoms affecting memory, thinking, and social abilities severely enough to interfere with daily life. Alzheimer\'s is the most common type. Progressive and currently irreversible.',
        commonSigns: ['Memory loss disrupting daily life', 'Confusion about time or place', 'Difficulty with familiar tasks', 'Language and word-finding problems', 'Mood and personality changes', 'Poor judgment', 'Withdrawal from activities'],
        strategies: ['Consistent daily routines', 'Simplify environment and reduce choices', 'Memory aids and labeling', 'Reminiscence activities', 'Caregiver education and respite', 'Safety planning (wandering, medication)', 'Adult day programs'],
        referralGuidance: 'Primary care physician or geriatric specialist for diagnosis. Neurologist for complex cases. Alzheimer\'s Association 24/7 Helpline: 1-800-272-3900. Caregiver support groups through local Alzheimer\'s chapter.',
        sources: ['Alzheimer\'s Association (alz.org)', 'NIH NIA Alzheimer\'s Research', 'NAMI Dementia Resources'],
      },
      {
        name: 'Parkinson\'s Disease',
        overview: 'A progressive nervous system disorder affecting movement. Symptoms develop slowly. While motor symptoms are most known, non-motor symptoms (depression, cognitive changes, sleep, autonomic) are also significant.',
        commonSigns: ['Tremor (often begins in hand)', 'Slowed movement (bradykinesia)', 'Rigid muscles', 'Impaired posture and balance', 'Changes in speech (softer, slurred)', 'Writing changes (micrographia)', 'Depression and anxiety'],
        strategies: ['Exercise is strongly evidence-based (boxing, cycling, dance)', 'Physical therapy and speech therapy (LSVT LOUD/BIG)', 'Occupational therapy for daily living adaptations', 'Medication management with neurologist', 'Support groups', 'Home safety modifications'],
        referralGuidance: 'Movement disorder specialist (neurologist) for diagnosis and medication management. Parkinson\'s Foundation helpline: 1-800-4PD-INFO. Physical and speech therapy are essential.',
        sources: ['Parkinson\'s Foundation (parkinson.org)', 'APDA (American Parkinson Disease Association)', 'Michael J. Fox Foundation'],
      },
      {
        name: 'ALS (Amyotrophic Lateral Sclerosis)',
        overview: 'A progressive neurodegenerative disease affecting motor neurons. Leads to loss of voluntary muscle control. Currently no cure, but multidisciplinary care and assistive technology significantly support quality of life.',
        commonSigns: ['Muscle weakness (often begins in limbs or speech)', 'Difficulty swallowing (dysphagia)', 'Slurred speech (dysarthria)', 'Muscle twitching (fasciculations)', 'Progressive difficulty walking', 'Breathing changes later'],
        strategies: ['ALS multidisciplinary clinic (gold standard of care)', 'AAC early — before speech loss is severe', 'Nutritional support and feeding team', 'Respiratory management planning', 'Physical and occupational therapy', 'Advance care planning and palliative care', 'Caregiver support and respite'],
        referralGuidance: 'ALS multidisciplinary clinic at a major academic medical center. ALS Association 24/7 helpline: 1-800-782-4747. Early AAC assessment is critical — don\'t wait.',
        sources: ['ALS Association (als.org)', 'NEALS (Northeast ALS Consortium)', 'ALS Therapy Development Institute'],
      },
    ],
  },
];

// ── Behavior Strategy Library ──────────────────────────────────────────────

export interface BehaviorStrategy {
  name: string;
  category: string;
  ageRange: string;
  evidenceLevel: 'Strong' | 'Moderate' | 'Emerging';
  overview: string;
  steps: string[];
  bestFor: string[];
  cautions: string;
}

export const BEHAVIOR_STRATEGIES: BehaviorStrategy[] = [
  {
    name: 'Positive Behavior Support (PBS)',
    category: 'Prevention & Environment',
    ageRange: 'All ages',
    evidenceLevel: 'Strong',
    overview: 'A proactive, person-centered framework that focuses on understanding why behaviors occur and changing the environment, teaching new skills, and reinforcing positive behaviors — rather than simply reacting to challenging behavior.',
    steps: ['Conduct Functional Behavior Assessment (FBA) to identify the function of behavior', 'Identify antecedents (triggers) and consequences', 'Modify environment to prevent triggers', 'Teach replacement behaviors with the same function', 'Implement reinforcement systems', 'Monitor with data collection'],
    bestFor: ['Preventing challenging behaviors', 'School-based behavior plans', 'Any age and disability type'],
    cautions: 'PBS requires consistency across ALL settings and all caregivers. Professional guidance from BCBA or behavior specialist strongly recommended for implementation.',
  },
  {
    name: 'Visual Schedules',
    category: 'Communication & Structure',
    ageRange: 'All ages (especially helpful for ages 2-adult)',
    evidenceLevel: 'Strong',
    overview: 'Using pictures, photos, symbols, or words to represent the sequence of daily activities or steps in a task. Reduces anxiety, increases independence, and supports transitions.',
    steps: ['Identify activities to include (daily routine or task)', 'Choose the right symbols (photos, icons, words — individual preference)', 'Create the schedule at the individual\'s level', 'Post in accessible location', 'Teach how to use the schedule', 'Use "first-then" boards for transitions'],
    bestFor: ['Autism', 'Intellectual disabilities', 'ADHD', 'Language processing disorders', 'Anxiety'],
    cautions: 'Schedule must be followed consistently. Changes should be previewed in advance.',
  },
  {
    name: 'Social Stories™',
    category: 'Social Skills',
    ageRange: 'Ages 2-adult',
    evidenceLevel: 'Moderate',
    overview: 'Short, individualized stories written from the person\'s perspective that describe a social situation, skill, or concept in a reassuring, accurate way. Developed by Carol Gray.',
    steps: ['Identify the social situation to address', 'Write from the individual\'s perspective (first person)', 'Use descriptive, perspective, and directive sentences', 'Keep tone supportive and non-judgmental', 'Read together and practice', 'Update as needs change'],
    bestFor: ['Autism', 'Social anxiety', 'Understanding new or difficult situations', 'Transitions'],
    cautions: 'Must be highly individualized. Pre-made generic stories are less effective. Professional guidance recommended for complex situations.',
  },
  {
    name: 'Token Economy / Reward Systems',
    category: 'Positive Reinforcement',
    ageRange: 'Ages 2-adult (format varies)',
    evidenceLevel: 'Strong',
    overview: 'A behavior modification system where tokens are earned for target behaviors and exchanged for preferred items or activities. Increases motivation for challenging tasks.',
    steps: ['Identify 2-3 specific target behaviors (positive — what TO do, not what not to do)', 'Choose tokens appropriate for age (stickers, points, chips)', 'Establish clear exchange rate', 'Choose reinforcers the individual actually wants', 'Give tokens immediately after target behavior', 'Phase out gradually as behaviors become habitual'],
    bestFor: ['ADHD', 'Autism', 'Intellectual disabilities', 'Behavioral challenges', 'Academic motivation'],
    cautions: 'Never take away earned tokens as punishment. Keep expectations achievable. Plan for how to fade the system over time.',
  },
  {
    name: 'Zones of Regulation',
    category: 'Emotional Regulation',
    ageRange: 'Ages 4-adult',
    evidenceLevel: 'Moderate',
    overview: 'A framework using four colored zones to help individuals identify their emotional state and learn strategies to self-regulate. Blue=low energy/sad, Green=calm/ready, Yellow=elevated/excited, Red=extreme emotion.',
    steps: ['Teach the four zones with visual supports', 'Help individual identify their own zone', 'Learn what zone is expected for the situation', 'Build a personalized "toolbox" of regulation strategies per zone', 'Practice in low-stakes situations first', 'Generalize across environments'],
    bestFor: ['Emotional dysregulation', 'Autism', 'ADHD', 'Anxiety', 'PTSD', 'Social skills building'],
    cautions: 'Teachers and caregivers must also use the language consistently. Not a standalone intervention for severe emotional dysregulation — pair with therapeutic support.',
  },
  {
    name: 'Sensory Breaks / Sensory Diet',
    category: 'Sensory',
    ageRange: 'All ages',
    evidenceLevel: 'Moderate',
    overview: 'A planned schedule of sensory activities throughout the day designed by an OT to keep the nervous system regulated. Prevents sensory overload and supports attention.',
    steps: ['OT evaluation to identify sensory profile', 'Create individualized sensory diet with OT', 'Schedule sensory breaks proactively (not just after dysregulation)', 'Teach the individual to identify their own needs', 'Include calming and alerting activities', 'Implement at school and home consistently'],
    bestFor: ['Sensory processing differences', 'Autism', 'ADHD', 'Anxiety', 'TBI'],
    cautions: 'Sensory diets must be designed by a qualified OT. Weighted items and deep pressure must be used with OT guidance only.',
  },
];

// ── IEP/504 Toolkit content ────────────────────────────────────────────────
export const IEP_504_CONTENT = {
  comparison: {
    iep: {
      law: 'IDEA 2004 (Individuals with Disabilities Education Act)',
      whoQualifies: 'Students with one of 13 disability categories who need specially designed instruction',
      categories: ['Autism', 'Deaf-Blindness', 'Deafness', 'Emotional Disturbance', 'Hearing Impairment', 'Intellectual Disability', 'Multiple Disabilities', 'Orthopedic Impairment', 'Other Health Impairment (ADHD, epilepsy, etc.)', 'Specific Learning Disability', 'Speech or Language Impairment', 'Traumatic Brain Injury', 'Visual Impairment'],
      includes: ['Present Levels of Academic Achievement and Functional Performance (PLAAFP)', 'Annual measurable goals', 'Special education services and related services', 'Accommodations and modifications', 'Transition planning (age 14+)', 'Least Restrictive Environment (LRE) statement'],
      funding: 'Schools receive federal funding to implement IEPs',
    },
    plan504: {
      law: 'Section 504 of the Rehabilitation Act of 1973',
      whoQualifies: 'Any student with a physical or mental impairment that substantially limits a major life activity',
      includes: ['Accommodations to level the playing field', 'Does NOT include specially designed instruction or related services', 'Wider net than IEP — more students qualify'],
      funding: 'No additional federal funding — schools use existing resources',
    },
  },
  parentRights: [
    'Right to be part of the IEP team',
    'Right to request an IEP meeting at any time',
    'Right to request an independent educational evaluation (IEE) at public expense',
    'Right to prior written notice before any change to services',
    'Right to a copy of all educational records',
    'Right to dispute resolution: mediation, state complaint, or due process hearing',
    'Right to receive documents in your primary language',
    'Right to bring advocates or attorneys to IEP meetings',
    'Right to give or withhold consent for initial evaluations and services',
  ],
  meetingPrepChecklist: [
    'Request all evaluation reports and progress data BEFORE the meeting',
    'Write down your questions and priorities — prioritize the top 3',
    'Bring documentation: medical records, therapist reports, work samples',
    'Invite outside therapists or specialists (give school written notice)',
    'Record the meeting if your state allows it (check your state law first)',
    'Bring a trusted support person (advocate, spouse, friend)',
    'Review the previous IEP goals — were they met? Are they still appropriate?',
    'Know your child\'s strengths as well as challenges',
    'Ask for plain-language explanations of any jargon',
    'You do NOT have to sign the IEP at the meeting — you can take it home to review',
  ],
  goalWritingTips: [
    'Goals must be SMART: Specific, Measurable, Attainable, Relevant, Time-bound',
    'Each goal should address a specific skill in the PLAAFP',
    'Good goal example: "By June, given a reading passage at the 3rd-grade level, [Student] will correctly decode 90% of multi-syllabic words with 3 or fewer errors across 3 consecutive trials."',
    'Vague goal example (avoid): "[Student] will improve reading skills"',
    'Ask: How will progress be measured? How often? By whom?',
    'Accommodations are NOT goals — they are supports, not skill-building targets',
  ],
  commonAccommodations: [
    'Extended time on tests and assignments (1.5x or 2x)',
    'Preferential seating (near teacher, away from distractions)',
    'Reduced homework load / modified assignments',
    'Breaks during long tasks',
    'Use of calculator, spell-check, or word processor',
    'Text-to-speech or speech-to-text tools',
    'Graphic organizers and visual supports',
    'Directions given verbally and in writing',
    'Testing in a separate, quiet setting',
    'Copies of notes or guided notes',
    'Physical education modifications',
    'Sensory supports (fidgets, noise-canceling headphones)',
  ],
};

// ── Transition Hub content (ages 14+) ─────────────────────────────────────
export const TRANSITION_CONTENT = {
  overview: 'Under IDEA 2004, transition planning must begin in the IEP by age 16 (many states require age 14). Transition planning focuses on postsecondary education, vocational training, employment, independent living, and community participation.',
  domains: [
    { emoji: '🎓', title: 'Postsecondary Education', description: 'College, vocational/trade school, certificate programs, adult education. Disability services exist at most colleges — contact them BEFORE enrollment.' },
    { emoji: '💼', title: 'Employment', description: 'Competitive integrated employment is the goal under WIOA. Vocational Rehabilitation (VR) provides job training and placement. Supported employment for individuals needing job coaching.' },
    { emoji: '🏠', title: 'Independent Living', description: 'Housing options range from fully independent to supported living. Medicaid HCBS waivers fund in-home supports. Apply for waiting lists EARLY — wait times can be years.' },
    { emoji: '🚌', title: 'Transportation', description: 'ADA requires paratransit for those who cannot use fixed-route buses. Driver\'s education adapted programs available. Ride-share coordination skills for independence.' },
    { emoji: '🏛️', title: 'Benefits & Legal', description: 'SSI/SSDI benefits, Medicaid, special needs trusts, guardianship vs. supported decision-making. Consult a special needs attorney for legal decisions.' },
    { emoji: '🤝', title: 'Community Participation', description: 'Recreation, social connections, volunteering, faith communities. Self-advocacy training — organizations like SABE (selfadvocacyinfo.org).' },
  ],
  keyResources: [
    { name: 'Vocational Rehabilitation (VR)', url: 'https://rsa.ed.gov/about/states', description: 'State agency providing job training and placement — apply before age 22 while in school.' },
    { name: 'PACER Center', url: 'https://www.pacer.org', description: 'Parent training and advocacy, transition resources.' },
    { name: 'NCWD-Youth', url: 'https://www.ncwd-youth.info', description: 'National Collaborative on Workforce and Disability for Youth.' },
    { name: 'Think College', url: 'https://thinkcollege.net', description: 'College programs for students with intellectual disabilities.' },
    { name: 'APSE', url: 'https://apse.org', description: 'Association of People Supporting Employment First.' },
  ],
};

// ── Community directory ────────────────────────────────────────────────────
export interface CommunityResource {
  name: string;
  category: string;
  description: string;
  phone?: string;
  url: string;
}

export const COMMUNITY_RESOURCES: CommunityResource[] = [
  { name: 'NAMI (National Alliance on Mental Illness)', category: 'Mental Health', description: 'Mental health support, education, advocacy. Helpline: Mon–Fri 10am–10pm ET.', phone: '1-800-950-NAMI (6264)', url: 'https://www.nami.org' },
  { name: 'Autism Society of America', category: 'Autism', description: 'Local chapters, resources, and advocacy for autism across the lifespan.', phone: '1-800-328-8476', url: 'https://autismsociety.org' },
  { name: 'The Arc', category: 'Intellectual & Developmental Disabilities', description: 'Advocacy and services for people with intellectual and developmental disabilities.', url: 'https://thearc.org' },
  { name: 'CHADD (Children and Adults with ADHD)', category: 'ADHD', description: 'Education, advocacy, and support for ADHD. Local chapters nationwide.', url: 'https://chadd.org' },
  { name: 'Epilepsy Foundation', category: 'Epilepsy', description: '24/7 Helpline, local resources, seizure first aid training.', phone: '1-800-332-1000', url: 'https://epilepsy.com' },
  { name: 'National Down Syndrome Society', category: 'Down Syndrome', description: 'Advocacy, programs, and resources for Down syndrome community.', url: 'https://ndss.org' },
  { name: 'Alzheimer\'s Association', category: 'Dementia / Aging', description: '24/7 Helpline, caregiver resources, clinical trial matching.', phone: '1-800-272-3900', url: 'https://alz.org' },
  { name: 'United Cerebral Palsy', category: 'Cerebral Palsy', description: 'Advocacy, services, and local affiliate network.', url: 'https://ucp.org' },
  { name: 'PACER Center', category: 'Education / Advocacy', description: 'Parent Training and Information Center, IEP advocacy, resources for families.', phone: '952-838-9000', url: 'https://pacer.org' },
  { name: 'ASHA (American Speech-Language-Hearing Assoc.)', category: 'Communication', description: 'Find certified SLPs and audiologists. Helpline for information.', url: 'https://asha.org' },
  { name: 'NADD (Dual Diagnosis)', category: 'Dual Diagnosis', description: 'Resources and provider directory for intellectual disability + mental health.', url: 'https://thenadd.org' },
  { name: 'Parkinson\'s Foundation', category: 'Parkinson\'s', description: 'Helpline, local resources, exercise programs (PD-specific).', phone: '1-800-4PD-INFO', url: 'https://parkinson.org' },
  { name: 'ALS Association', category: 'ALS', description: '24/7 Helpline, care coordination, assistive technology resources.', phone: '1-800-782-4747', url: 'https://als.org' },
  { name: 'Family Voices', category: 'Medically Complex', description: 'Supports families of children and youth with special health care needs.', url: 'https://familyvoices.org' },
  { name: 'Special Needs Alliance', category: 'Legal / Financial', description: 'Directory of special needs attorneys by state.', url: 'https://specialneedsalliance.org' },
];

// ── Document Organizer ─────────────────────────────────────────────────────
export const IMPORTANT_DOCUMENTS = [
  { category: 'Education', items: ['Current IEP / 504 Plan', 'All evaluation reports (psychological, speech, OT, PT)', 'Prior IEPs (last 3 years)', 'Report cards and progress reports', 'School correspondence and meeting notes', 'Placement letters', 'Prior Written Notices (PWN)'] },
  { category: 'Medical', items: ['Diagnosis letters / evaluation reports', 'Current medication list', 'Allergy list', 'Immunization records', 'Insurance cards and EOBs', 'Specialist contact list', 'Medical equipment prescriptions', 'Seizure action plan or medical action plan'] },
  { category: 'Legal & Financial', items: ['Birth certificate', 'Social Security card', 'SSI/SSDI award letters', 'Medicaid card and documentation', 'Special needs trust documents', 'Guardianship / supported decision-making documents', 'ABLE account information', 'Disability-related tax documents'] },
  { category: 'Therapy & Services', items: ['Current therapy goals and progress notes', 'Therapy authorization letters (insurance)', 'Service provider contact list', 'Assistive technology documentation', 'Home program from OT/PT/SLP', 'Behavioral support plan'] },
  { category: 'Transition & Adult Services', items: ['Vocational Rehabilitation enrollment', 'Medicaid waiver application / status', 'Supported living plan', 'Employment support documents', 'Transportation documentation', 'Self-advocacy plan'] },
];

// ── Medication Reference — informational only, no recommendations ──────────
export const MEDICATION_REFERENCE_DISCLAIMER =
  'MEDICATION INFORMATION NOTICE: The information below describes general categories of medications that healthcare providers sometimes discuss with families of individuals with special needs. This is GENERAL INFORMATION ONLY. Propel Stack AI, LLC does NOT recommend, prescribe, or advise on any medication. NEVER start, stop, or change any medication without guidance from a licensed physician or pharmacist. All medication decisions must be made in consultation with qualified healthcare professionals.';

export interface MedicationClass {
  class: string;
  commonlyDiscussedFor: string[];
  generalPurpose: string;
  questionsToAsk: string[];
  importantNote: string;
}

export const MEDICATION_CLASSES: MedicationClass[] = [
  {
    class: 'Stimulant medications',
    commonlyDiscussedFor: ['ADHD'],
    generalPurpose: 'A class of medications often discussed by physicians in the context of ADHD. Mechanism involves neurotransmitter regulation. Decision to use should involve comprehensive evaluation.',
    questionsToAsk: ['What is the expected benefit for my child/family member?', 'What are the potential side effects?', 'How will we monitor effectiveness?', 'What non-medication approaches should we also try?', 'How long is typical treatment duration?'],
    importantNote: 'Medication is ONE component of ADHD treatment. Behavioral therapy, school accommodations, and environmental supports are also essential.',
  },
  {
    class: 'Non-stimulant medications for ADHD',
    commonlyDiscussedFor: ['ADHD'],
    generalPurpose: 'Alternative medications sometimes discussed when stimulants are not appropriate or not effective. Different mechanism than stimulants.',
    questionsToAsk: ['Why is this being recommended over stimulant options?', 'What timeline should we expect for results?', 'What monitoring is recommended?'],
    importantNote: 'Consult a developmental pediatrician or child psychiatrist for medication evaluation.',
  },
  {
    class: 'Antiepileptic / seizure medications',
    commonlyDiscussedFor: ['Epilepsy', 'Seizure disorders'],
    generalPurpose: 'Medications prescribed by neurologists to reduce or prevent seizures. Many different types exist; selection depends on seizure type, individual factors, and co-occurring conditions.',
    questionsToAsk: ['What type of seizure disorder does my family member have?', 'What specific medication is being recommended and why?', 'What are the monitoring requirements (blood levels, liver function)?', 'What should we do if a seizure occurs despite medication?'],
    importantNote: 'NEVER stop seizure medication abruptly without physician guidance — this can cause serious rebound seizures.',
  },
  {
    class: 'SSRIs and other antidepressants',
    commonlyDiscussedFor: ['Anxiety disorders', 'Depression', 'OCD', 'PTSD'],
    generalPurpose: 'A class of medications often discussed in the context of mood and anxiety disorders. Work by influencing neurotransmitter systems. Typically used alongside psychotherapy.',
    questionsToAsk: ['How does this medication work?', 'What is the expected timeline for effect?', 'What side effects should we watch for, particularly in the first weeks?', 'Is therapy being recommended alongside medication?'],
    importantNote: 'For children and adolescents — discuss black box warning about suicidal ideation with prescribing physician. Close monitoring in first weeks is important.',
  },
  {
    class: 'Antipsychotic medications',
    commonlyDiscussedFor: ['Autism (irritability)', 'Bipolar disorder', 'Schizophrenia', 'Tourette syndrome', 'Severe behavioral challenges'],
    generalPurpose: 'A class of medications sometimes discussed for specific symptoms including irritability, psychosis, and mood instability. Require careful monitoring for side effects.',
    questionsToAsk: ['What specific symptoms is this intended to address?', 'What are the metabolic monitoring requirements?', 'What is the planned duration of treatment?', 'What behavioral supports are in place alongside medication?'],
    importantNote: 'These medications require regular physician monitoring for metabolic side effects. Behavioral and therapeutic supports should always accompany medication.',
  },
  {
    class: 'Melatonin and sleep support',
    commonlyDiscussedFor: ['Autism', 'ADHD', 'Anxiety'],
    generalPurpose: 'Melatonin is a natural hormone sometimes discussed for sleep difficulties common in autism, ADHD, and anxiety. Available over-the-counter but should be discussed with physician before use.',
    questionsToAsk: ['What is the appropriate dose for my family member\'s age and weight?', 'Are there interactions with current medications?', 'What sleep hygiene strategies should we also implement?'],
    importantNote: 'Even OTC supplements should be discussed with a physician, especially for children and for individuals on other medications.',
  },
];
