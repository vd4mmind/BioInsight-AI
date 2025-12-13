import { DiseaseTopic, Methodology, ResearchModality, PaperData, PublicationType, StudyType } from "./types";

export const APP_NAME = "BioInsight Tracker";
export const APP_VERSION = "2.1.0";

// Curated Landmark Papers (2010 - Present)
export const INITIAL_PAPERS: PaperData[] = [
  // --- 2024 Papers ---
  {
    id: 'flow-ckd-2024',
    title: 'Effects of Semaglutide on Chronic Kidney Disease Outcomes in Type 2 Diabetes',
    journalOrConference: 'The New England Journal of Medicine',
    date: '2024-05-24',
    authors: ['V. Perkovic', 'K.R. Tuttle', 'et al.'],
    topic: DiseaseTopic.CKD,
    publicationType: PublicationType.PeerReviewed,
    studyType: StudyType.ClinicalTrial,
    methodology: Methodology.Statistical,
    modality: ResearchModality.ClinicalData,
    abstractHighlight: 'Semaglutide reduced the risk of major kidney disease events by 24% in patients with type 2 diabetes and CKD.',
    drugAndTarget: 'Target: GLP-1, Drug: Semaglutide',
    context: 'FLOW Trial: Landmark evidence for GLP-1RA in renal protection.',
    validationScore: 100,
    url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa2403347',
    authorsVerified: true,
    affiliations: ['University of New South Wales', 'University of Washington'],
    funding: 'Novo Nordisk',
    keywords: ['CKD', 'Semaglutide', 'FLOW', 'Renal Outcomes']
  },
  {
    id: 'resmetirom-2024',
    title: 'Resmetirom for Nonalcoholic Steatohepatitis with Liver Fibrosis',
    journalOrConference: 'The New England Journal of Medicine',
    date: '2024-02-08',
    authors: ['S.A. Harrison', 'P. Bedossa', 'et al.'],
    topic: DiseaseTopic.MASH,
    publicationType: PublicationType.PeerReviewed,
    studyType: StudyType.ClinicalTrial,
    methodology: Methodology.Statistical,
    modality: ResearchModality.Imaging,
    abstractHighlight: 'MAESTRO-NASH phase 3 trial showed Resmetirom achieved MASH resolution and fibrosis improvement.',
    drugAndTarget: 'Target: THR-beta, Drug: Resmetirom',
    context: 'First FDA-approved therapy for MASH/NASH.',
    validationScore: 100,
    url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa2309000',
    authorsVerified: true,
    affiliations: ['Radcliffe Department of Medicine', 'University of Paris'],
    funding: 'Madrigal Pharmaceuticals',
    keywords: ['NASH', 'Resmetirom', 'Fibrosis', 'Phase 3']
  },
  {
    id: 'alphafold3-2024',
    title: 'Accurate structure prediction of biomolecular interactions with AlphaFold 3',
    journalOrConference: 'Nature',
    date: '2024-05-08',
    authors: ['J. Abramson', 'J. Adler', 'et al.'],
    topic: DiseaseTopic.CVD, // Relevant broadly
    publicationType: PublicationType.PeerReviewed,
    studyType: StudyType.Simulated,
    methodology: Methodology.AIML,
    modality: ResearchModality.Proteomics,
    abstractHighlight: 'AlphaFold 3 predicts structure of complexes including proteins, nucleic acids, small molecules, ions.',
    drugAndTarget: 'Target: Pan-molecular',
    context: 'Major AI breakthrough for structural biology and drug design.',
    validationScore: 100,
    url: 'https://www.nature.com/articles/s41586-024-07487-w',
    authorsVerified: true,
    affiliations: ['Google DeepMind', 'Isomorphic Labs'],
    funding: 'Google',
    keywords: ['AI', 'AlphaFold 3', 'Drug Discovery']
  },

  // --- 2023 Papers ---
  {
    id: 'select-2023',
    title: 'Semaglutide and Cardiovascular Outcomes in Obesity without Diabetes',
    journalOrConference: 'The New England Journal of Medicine',
    date: '2023-11-11',
    authors: ['A.M. Lincoff', 'K. Brown-Frandsen', 'et al.'],
    topic: DiseaseTopic.Obesity,
    publicationType: PublicationType.PeerReviewed,
    studyType: StudyType.ClinicalTrial,
    methodology: Methodology.Statistical,
    modality: ResearchModality.ClinicalData,
    abstractHighlight: 'Semaglutide 2.4 mg reduced the risk of major adverse cardiovascular events by 20% in overweight/obese adults.',
    drugAndTarget: 'Target: GLP-1, Drug: Semaglutide',
    context: 'SELECT Trial: Proved weight loss drugs save lives via CV protection.',
    validationScore: 100,
    url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa2307563',
    authorsVerified: true,
    affiliations: ['Cleveland Clinic', 'Novo Nordisk'],
    funding: 'Novo Nordisk',
    keywords: ['Obesity', 'CVD', 'Semaglutide', 'SELECT']
  },

  // --- 2021 Papers ---
  {
    id: 'alphafold2-2021',
    title: 'Highly accurate protein structure prediction with AlphaFold',
    journalOrConference: 'Nature',
    date: '2021-07-15',
    authors: ['J. Jumper', 'R. Evans', 'et al.'],
    topic: DiseaseTopic.CVD,
    publicationType: PublicationType.PeerReviewed,
    studyType: StudyType.Simulated,
    methodology: Methodology.AIML,
    modality: ResearchModality.Proteomics,
    abstractHighlight: 'AlphaFold 2 regularly predicts protein structures with atomic accuracy.',
    drugAndTarget: 'N/A',
    context: 'The "ImageNet moment" for Structural Biology.',
    validationScore: 100,
    url: 'https://www.nature.com/articles/s41586-021-03819-2',
    authorsVerified: true,
    affiliations: ['DeepMind'],
    funding: 'Alphabet',
    keywords: ['AI', 'AlphaFold 2', 'Protein Folding']
  },

  // --- 2019 Papers ---
  {
    id: 'dapa-hf-2019',
    title: 'Dapagliflozin in Patients with Heart Failure and Reduced Ejection Fraction',
    journalOrConference: 'The New England Journal of Medicine',
    date: '2019-11-21',
    authors: ['J.J.V. McMurray', 'S.D. Solomon', 'et al.'],
    topic: DiseaseTopic.CVD,
    publicationType: PublicationType.PeerReviewed,
    studyType: StudyType.ClinicalTrial,
    methodology: Methodology.Statistical,
    modality: ResearchModality.ClinicalData,
    abstractHighlight: 'Dapagliflozin reduced the risk of worsening heart failure or death from cardiovascular causes in HFrEF.',
    drugAndTarget: 'Target: SGLT2, Drug: Dapagliflozin',
    context: 'DAPA-HF: Established SGLT2 inhibitors as the 4th pillar of HFrEF therapy.',
    validationScore: 100,
    url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa1911303',
    authorsVerified: true,
    affiliations: ['University of Glasgow', 'Brigham and Women’s Hospital'],
    funding: 'AstraZeneca',
    keywords: ['HFrEF', 'SGLT2', 'Dapagliflozin', 'DAPA-HF']
  },

  // --- 2015 Papers ---
  {
    id: 'empa-reg-2015',
    title: 'Empagliflozin, Cardiovascular Outcomes, and Mortality in Type 2 Diabetes',
    journalOrConference: 'The New England Journal of Medicine',
    date: '2015-11-26',
    authors: ['B. Zinman', 'C. Wanner', 'et al.'],
    topic: DiseaseTopic.Diabetes,
    publicationType: PublicationType.PeerReviewed,
    studyType: StudyType.ClinicalTrial,
    methodology: Methodology.Statistical,
    modality: ResearchModality.ClinicalData,
    abstractHighlight: 'Empagliflozin reduced cardiovascular death by 38% in patients with T2D and CVD.',
    drugAndTarget: 'Target: SGLT2, Drug: Empagliflozin',
    context: 'EMPA-REG OUTCOME: The study that started the SGLT2 cardiovascular revolution.',
    validationScore: 100,
    url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa1504720',
    authorsVerified: true,
    affiliations: ['Mount Sinai Hospital', 'Boehringer Ingelheim'],
    funding: 'Boehringer Ingelheim',
    keywords: ['Diabetes', 'CVD', 'Empagliflozin', 'SGLT2']
  },

  // --- 2011 Papers ---
  {
    id: 'paradigm-hf-2014',
    title: 'Angiotensin–Neprilysin Inhibition versus Enalapril in Heart Failure',
    journalOrConference: 'The New England Journal of Medicine',
    date: '2014-09-11',
    authors: ['J.J.V. McMurray', 'M. Packer', 'et al.'],
    topic: DiseaseTopic.CVD,
    publicationType: PublicationType.PeerReviewed,
    studyType: StudyType.ClinicalTrial,
    methodology: Methodology.Statistical,
    modality: ResearchModality.ClinicalData,
    abstractHighlight: 'LCZ696 (Sacubitril-Valsartan) was superior to Enalapril in reducing death and hospitalization for heart failure.',
    drugAndTarget: 'Target: ARNI, Drug: Sacubitril-Valsartan',
    context: 'PARADIGM-HF: Introduced ARNI as a standard of care.',
    validationScore: 100,
    url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa1409077',
    authorsVerified: true,
    affiliations: ['University of Glasgow'],
    funding: 'Novartis',
    keywords: ['HFrEF', 'ARNI', 'Sacubitril-Valsartan', 'PARADIGM-HF']
  }
];