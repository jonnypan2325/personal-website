/**
 * projects... as the name suggests
 */
export interface Project {
  title: string;
  description: string;
  tags: string[];
  year?: string;
  repo?: string;
  href?: string;
  featured?: boolean; // default false, truthy will highlight project
}

export const projects: Project[] = [
  {
    title: 'This website',
    description:
      'personal site and portfolio. pixel-art wave counter backed by a serverless function.',
    tags: ['Astro', 'Tailwind CSS', 'TypeScript', 'Cloudflare Workers'],
    year: '2026',
    repo: 'https://github.com/jonnypan2325/personal-website',
    href: 'https://jonathanpan.me',
  },
  {
    title: 'Strava art ',
    description: 'Paste image -> convert to GPS coordinates -> walk/run/cycle -> see your art on Strava',
    tags: ['OpenCV', 'Python', 'OpenStreetMap', 'Strava API', 'some algorithms for spatial point matching'],
    year: 'Present, in construction',
  },
  /*
  {
    title: 'Project',
    description: 'Description',
    tags: ['Tech stack'],
    year: '2025',
    repo: 'https://github.com/jonnypan2325',
  },
  
  */
];
