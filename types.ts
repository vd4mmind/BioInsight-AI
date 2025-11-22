export enum DiseaseTopic {
  CVD = 'CVD',
  CKD = 'CKD',
  MASH = 'MASH',
  NASH = 'NASH',
  MASLD = 'MASLD',
  Diabetes = 'Diabetes',
  Obesity = 'Obesity'
}

export enum PublicationType {
  Preprint = 'Preprint',
  PeerReviewed = 'Peer Reviewed'
}

export enum StudyType {
  ClinicalTrial = 'Clinical Trial',
  HumanCohort = 'Human Cohort (Non-RCT)',
  PreClinical = 'Pre-clinical',
  Simulated = 'Simulated'
}

export enum Methodology {
  AIML = 'AI/ML',
  LabExperimental = 'Lab Experimental',
  Statistical = 'Statistical'
}

export enum OmicsType {
  MultiModal = 'Multi-modal',
  SingleOmics = 'Single Omics',
  MultiOmics = 'Multi-omics (>2)',
  Imaging = 'Imaging',
  None = 'None'
}

export interface PaperData {
  id: string;
  title: string;
  journalOrConference: string;
  date: string;
  authors: string[];
  topic: DiseaseTopic;
  publicationType: PublicationType;
  studyType: StudyType;
  methodology: Methodology;
  omicsType: OmicsType;
  abstractHighlight: string;
  drugAndTarget: string;
  context: string;
  validationScore: number; // 0-100
  url?: string;
  authorsVerified?: boolean;
  // Extended Metadata
  affiliations?: string[];
  funding?: string;
  keywords?: string[];
}

export interface DashboardStats {
  totalPapers: number;
  peerReviewedCount: number;
  preprintCount: number;
  aiMlCount: number;
  clinicalTrialCount: number;
}