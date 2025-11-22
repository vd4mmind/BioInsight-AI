import { DiseaseTopic, Methodology, OmicsType, PaperData, PublicationType, StudyType } from "./types";

export const APP_NAME = "BioInsight.AI";
export const APP_VERSION = "0.8.3 Beta";

// Fallback data in case API key is missing or fails initially
export const INITIAL_PAPERS: PaperData[] = [
  {
    id: '1',
    title: 'Multi-omics integration reveals novel biomarkers for NASH progression in T2D patients',
    journalOrConference: 'Nature Medicine',
    date: '2023-10-25',
    authors: ['J. Doe', 'A. Smith', 'et al.'],
    topic: DiseaseTopic.NASH,
    publicationType: PublicationType.PeerReviewed,
    studyType: StudyType.HumanCohort,
    methodology: Methodology.AIML,
    omicsType: OmicsType.MultiOmics,
    abstractHighlight: 'Identified 3 distinct metabolite clusters predicting fibrosis onset with 92% accuracy.',
    drugAndTarget: 'Target: FGFR1, Drug: N/A (Biomarker study)',
    context: 'Critical for patient stratification in upcoming Phase 3 trials.',
    validationScore: 95,
    url: 'https://www.nature.com/nm/',
    authorsVerified: false,
    affiliations: ['Institute of Molecular Systems Biology, ETH Zurich', 'University Hospital Zurich'],
    funding: 'Swiss National Science Foundation',
    keywords: ['Metabolomics', 'Liver Fibrosis', 'Precision Medicine', 'Machine Learning']
  },
  {
    id: '2',
    title: 'Generative AI simulation of GLP-1 receptor agonist binding dynamics',
    journalOrConference: 'NeurIPS 2023 (ML for Health)',
    date: '2023-11-10',
    authors: ['X. Chen', 'Y. Gupta'],
    topic: DiseaseTopic.Obesity,
    publicationType: PublicationType.Preprint,
    studyType: StudyType.Simulated,
    methodology: Methodology.AIML,
    omicsType: OmicsType.None,
    abstractHighlight: 'Proposed a novel small molecule scaffold with 30% higher affinity than Semaglutide in silico.',
    drugAndTarget: 'Target: GLP-1R, Drug: Novel Scaffold X7',
    context: 'Early stage discovery, needs wet lab validation.',
    validationScore: 82,
    url: 'https://arxiv.org/',
    authorsVerified: false,
    affiliations: ['Vector Institute', 'University of Toronto'],
    funding: 'Internal Research Grant',
    keywords: ['Generative Chemistry', 'Protein Folding', 'GLP-1', 'In Silico']
  },
  {
    id: '3',
    title: 'Phase 2b Trial of Ziltivekimab in CKD patients with elevated CRP',
    journalOrConference: 'The Lancet',
    date: '2023-10-28',
    authors: ['P. Ridker', 'et al.'],
    topic: DiseaseTopic.CKD,
    publicationType: PublicationType.PeerReviewed,
    studyType: StudyType.ClinicalTrial,
    methodology: Methodology.Statistical,
    omicsType: OmicsType.SingleOmics,
    abstractHighlight: 'Significantly reduced markers of inflammation and thrombosis risk compared to placebo.',
    drugAndTarget: 'Target: IL-6, Drug: Ziltivekimab',
    context: 'Potential breakthrough for residual inflammatory risk in CKD.',
    validationScore: 98,
    url: 'https://www.thelancet.com/',
    authorsVerified: true,
    affiliations: ['Brigham and Women\'s Hospital', 'Harvard Medical School'],
    funding: 'Novo Nordisk',
    keywords: ['Inflammation', 'Cardiovascular Risk', 'CKD', 'Interleukin-6']
  }
];