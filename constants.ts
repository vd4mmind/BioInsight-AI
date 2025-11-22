import { DiseaseTopic, Methodology, ResearchModality, PaperData, PublicationType, StudyType } from "./types";

export const APP_NAME = "BioInsight.AI";
export const APP_VERSION = "1.1.0 Live";

// Fallback data: Realistic examples representing 2025 landscape
export const INITIAL_PAPERS: PaperData[] = [
  {
    id: '1',
    title: 'Tirzepatide reduces liver fat and fibrosis in MASLD: A 52-week Phase 3 Analysis',
    journalOrConference: 'The New England Journal of Medicine',
    date: '2025-01-15',
    authors: ['A. Sanyal', 'M. Noureddin', 'et al.'],
    topic: DiseaseTopic.MASLD,
    publicationType: PublicationType.PeerReviewed,
    studyType: StudyType.ClinicalTrial,
    methodology: Methodology.Statistical,
    modality: ResearchModality.Imaging,
    abstractHighlight: 'Achieved fibrosis improvement without worsening of NASH in 62% of participants.',
    drugAndTarget: 'Target: GLP-1/GIP, Drug: Tirzepatide',
    context: 'Sets new standard for pharmacological treatment of fibrosis.',
    validationScore: 99,
    url: 'https://www.nejm.org/',
    authorsVerified: true,
    affiliations: ['Virginia Commonwealth University', 'Houston Methodist'],
    funding: 'Eli Lilly and Company',
    keywords: ['MASLD', 'Fibrosis', 'Tirzepatide', 'Clinical Trial']
  },
  {
    id: '2',
    title: 'DeepLearning-based prediction of CKD progression using retinal imaging: The RetiKidney 2025 Study',
    journalOrConference: 'Nature Digital Medicine',
    date: '2025-02-02',
    authors: ['S. Kang', 'J. Park', 'L. Chen'],
    topic: DiseaseTopic.CKD,
    publicationType: PublicationType.PeerReviewed,
    studyType: StudyType.HumanCohort,
    methodology: Methodology.AIML,
    modality: ResearchModality.Imaging,
    abstractHighlight: 'Non-invasive retinal scans predicted eGFR decline with AUC 0.91 in external validation.',
    drugAndTarget: 'Target: N/A, Drug: Diagnostic AI',
    context: 'Enables mass screening of kidney health via ophthalmology clinics.',
    validationScore: 94,
    url: 'https://www.nature.com/npjdigitalmed/',
    authorsVerified: true,
    affiliations: ['Seoul National University', 'Google Health'],
    funding: 'National Research Foundation of Korea',
    keywords: ['Retinal Imaging', 'Deep Learning', 'CKD', 'Screening']
  },
  {
    id: '3',
    title: 'Single-cell atlas of adipose tissue macrophages in obesity-resistant phenotypes',
    journalOrConference: 'BioRxiv',
    date: '2025-01-20',
    authors: ['R. Gupta', 'T. Weiss'],
    topic: DiseaseTopic.Obesity,
    publicationType: PublicationType.Preprint,
    studyType: StudyType.PreClinical,
    methodology: Methodology.LabExperimental,
    modality: ResearchModality.SingleCell,
    abstractHighlight: 'Identified a rare Trem2+ macrophage population associated with sustained insulin sensitivity.',
    drugAndTarget: 'Target: Trem2, Drug: N/A',
    context: 'Novel therapeutic target for metabolically healthy obesity.',
    validationScore: 85,
    url: 'https://www.biorxiv.org/',
    authorsVerified: true,
    affiliations: ['Broad Institute of MIT and Harvard', 'Dana-Farber'],
    funding: 'NIH NIDDK',
    keywords: ['scRNA-seq', 'Macrophages', 'Obesity', 'Immunometabolism']
  }
];