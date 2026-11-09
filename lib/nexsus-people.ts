// Official roster sources are linked from the About and Team pages.
export const peopleSources = {
  about: 'https://nexsus.mmmut.app/about',
  team: 'https://nexsus.mmmut.app/team',
  faculty: 'https://nexsus.mmmut.app/faculty',
  administration: 'https://www.mmmut.ac.in/Administration',
} as const;

export const chiefPatron: { name: string; role: string; appointment: string; portrait?: string } = {
  name: 'Prof. Anupama Kaushik Sharma',
  role: 'Chief Patron',
  appointment: 'Vice-Chancellor, MMMUT',
  portrait: 'vice-chancellor',
};

export const cseHead = {
  name: 'Prof. Rakesh Kumar',
  appointment: 'Professor and Head of Computer Science & Engineering, MMMUT',
} as const;

export const developerCredits = [
  { name: 'Priyanshu Chaurasia', role: 'Lead developer', cohort: 'CSE ’28' },
  { name: 'Ayush Singh', role: 'Finishing and polish', cohort: 'CSE ’29' },
  { name: 'Amitesh Vishwakarma', role: 'Developer', cohort: 'CSE ’28' },
  { name: 'Nitin Deep', role: 'Developer', cohort: 'CSE ’29' },
  { name: 'Aryan Raj', role: 'Developer', cohort: 'CSE ’29' },
  { name: 'Abhishek Sharma', role: 'Developer', cohort: 'CSE ’29' },
] as const;

type TeamMember = {
  name: string;
  role: string;
  branch: 'CSE' | 'ECE' | 'EE';
  portrait: string;
  github?: string;
  linkedin?: string;
};

export const leadership: TeamMember[] = [
  { name: 'Priyanshu Chaurasia', role: 'President', branch: 'CSE', portrait: 'priyanshu', github: 'priyanshu-1006', linkedin: 'priyanshu-chaurasia-326979335' },
  { name: 'Amitesh Vishwakarma', role: 'Vice President', branch: 'CSE', portrait: 'amitesh', github: 'amitesh-7', linkedin: 'amitesh-vishwakarma-636165311' },
  { name: 'Saurabh Gupta', role: 'Technical Head', branch: 'CSE', portrait: 'saurabh', github: 'saurabhg90055-exp', linkedin: 'saurabh-gupta-77b764330' },
  { name: 'Ujjwal Dixit', role: 'Head of Operations (Boys)', branch: 'ECE', portrait: 'ujjwal', linkedin: 'ujjwaldixit07' },
  { name: 'Ritika Chauhan', role: 'Head of Operations (Girls)', branch: 'CSE', portrait: 'ritika', github: 'sharkpro123', linkedin: 'ritika-chauhan-6a7435340' },
];

export const thirdYearTeam: TeamMember[] = [
  { name: 'Kislay Dubey', role: 'Data Collection & Research Lead', branch: 'CSE', portrait: 'kisley', github: 'kislay2702', linkedin: 'kislay-dubey-6ba9a83b5' },
  { name: 'Shlok', role: 'UI/UX Lead', branch: 'CSE', portrait: 'shlok', github: 'shlokmodanwal', linkedin: 'shlok-modanwal-318a53326' },
  { name: 'Ritesh Yadav', role: 'Departmental Newsletter Lead', branch: 'CSE', portrait: 'ritesh', linkedin: 'riteshydv05' },
  { name: 'Manjeet K Yadav', role: 'Social Media & Creative Lead', branch: 'CSE', portrait: 'manjeet', linkedin: 'manjeet-kumar-571981347' },
  { name: 'Sameer Upadhyay', role: 'Event Operations Lead', branch: 'CSE', portrait: 'sameer', linkedin: 'sameer2028' },
  { name: 'Mangalam Chaurasia', role: 'Internships & Opportunities Lead', branch: 'ECE', portrait: 'mangalam' },
  { name: 'Rahul Kumar Singh', role: 'Resources & PYQ Lead', branch: 'CSE', portrait: 'rahul', linkedin: 'rahul-kumar-singh-004a76326' },
  { name: 'Raj Lakshmi', role: 'Executive Member', branch: 'CSE', portrait: 'rajlakshmi', github: 'Rajlakshmi-123', linkedin: 'rajlakshmi-chaudhary-522171305' },
  { name: 'Riya Kumari', role: 'Executive Member', branch: 'EE', portrait: 'riya', linkedin: 'riya-kumari-594565330' },
  { name: 'Priyanshi Singh', role: 'Executive Member', branch: 'CSE', portrait: 'priyanshi', linkedin: 'priyanshi-s-b04585341' },
];

type FacultyMember = {
  name: string;
  appointment: 'Assistant Professor' | 'Associate Professor';
  portrait: string;
  interests: string;
};

export const facultyCoordinators: FacultyMember[] = [
  { name: 'Dr. Sumit Kumar', appointment: 'Assistant Professor', portrait: 'sumit-kumar', interests: 'Machine learning, deep learning, and image processing' },
  { name: 'Dr. Rohit Kumar Tiwari', appointment: 'Associate Professor', portrait: 'rohit-kumar-tiwari', interests: 'Cloud computing, computer vision, and image processing' },
  { name: 'Dr. Pradeep Kumar Singh', appointment: 'Assistant Professor', portrait: 'pradeep-kumar-singh', interests: 'Algorithms, data mining, machine learning, and recommender systems' },
  { name: 'Dr. Pawan Kumar Mall', appointment: 'Assistant Professor', portrait: 'pawan-kumar-mall', interests: 'Deep learning, machine learning, computer vision, and image processing' },
];

export const facultyAdvisors: FacultyMember[] = [
  { name: 'Dr. Vimal Kumar', appointment: 'Assistant Professor', portrait: 'vimal-kumar', interests: 'Computer networks, cryptography, cybersecurity, and digital forensics' },
  { name: 'Dr. Satya Prakash Yadav', appointment: 'Associate Professor', portrait: 'satya-prakash-yadav', interests: 'Digital image processing, information retrieval, and image fusion' },
  { name: 'Dr. Shailesh Kumar', appointment: 'Assistant Professor', portrait: 'shailesh-kumar', interests: 'Computer architecture, storage systems, and multicore architecture' },
];
