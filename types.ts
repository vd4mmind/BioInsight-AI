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
  PeerReviewed = 'Peer Reviewed',
  News = 'News/Analysis',
  ConferenceAbstract = 'Conference Abstract',
  Poster = 'Poster',
  ReviewArticle = 'Review Article',
  MetaAnalysis = 'Meta-Analysis'
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

export enum ResearchModality {
  SingleCell = 'Single Cell',
  Genetics = 'Genetics',
  Proteomics = 'Proteomics',
  Transcriptomics = 'Transcriptomics',
  Metabolomics = 'Metabolomics',
  Lipidomics = 'Lipidomics',
  MultiOmics = 'Multi-omics',
  EHR = 'EHR',
  Imaging = 'Imaging',
  ClinicalData = 'Clinical Data',
  InVitro = 'In-vitro',
  InVivo = 'In-vivo',
  Other = 'Other'
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
  modality: ResearchModality;
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
  isLive?: boolean;
}

export interface DashboardStats {
  totalPapers: number;
  peerReviewedCount: number;
  preprintCount: number;
  aiMlCount: number;
  clinicalTrialCount: number;
}