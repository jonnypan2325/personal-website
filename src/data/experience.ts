/**
 * holy employment
 * Add an href to link the entry title
 */
export interface Experience {
  role: string;
  company: string;
  href?: string;
  dates: string;
  summary: string;
  tags?: string[];
}

export const experience: Experience[] = [
  {
    role: 'Software engineering intern',
    company: 'MyCase (8am)',
    href: 'https://8am.com',
    dates: '2026 june - sept',
    summary: 'Document previews + AI document generation for law firms',
    tags: ['TypeScript', 'Ruby on Rails', 'Python', 'AWS', 'Datadog', 'mixpanel'] ,
  },
  {
    role: 'Software engineering intern',
    company: 'Canon U.S.A.',
    href: 'https://usa.canon.com',
    dates: '2025 sept - 2026 june',
    summary: 'Document classification and field extraction workflow for Canon business clients',
    tags: ['Python', 'React', 'REST APIs', 'Docker', 'Terraform (IaC)','OpenAPIs', 'GCP', 'PaddleOCR'],
  },
  {
    role: 'Software engineering intern',
    company: 'Canon U.S.A.',
    href: 'https://usa.canon.com',
    dates: '2025 summer',
    summary: 'Chatbot for printer technicians for device specific troubleshooting with live data',
    tags: ['Python', 'Azure', 'GCP', 'LangChain'],
  },
  /*
  {
    role: 'Software engineering intern',
    company: 'job',
    dates: 'time',
    summary: 'what i did',
    tags: ['tools'],
  },
  */
];
