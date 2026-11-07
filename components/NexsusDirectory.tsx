import Image from 'next/image';
import styles from './NexsusDirectory.module.css';
import { facultyAdvisors, facultyCoordinators, leadership, peopleSources } from '@/lib/nexsus-people';

const branchName = {
  CSE: 'Computer Science & Engineering',
  ECE: 'Electronics & Communication Engineering',
  EE: 'Electrical Engineering',
};

export function TeamGrid({ members, featured = false }: { members: typeof leadership; featured?: boolean }) {
  return (
    <ul className={featured ? styles.featuredGrid : styles.teamGrid}>
      {members.map((member) => (
        <li className={styles.member} key={member.name}>
          <div className={styles.memberPortrait}>
            <Image
              src={`/continuum/people/${member.portrait}.webp`}
              alt=""
              width={400}
              height={400}
              sizes={featured ? '(max-width: 760px) 100px, 164px' : '96px'}
            />
          </div>
          <div className={styles.memberBody}>
            <p className={styles.eyebrow}>{member.role}</p>
            <h3>{member.name}</h3>
            <p className={styles.branch}>{branchName[member.branch]}</p>
            {(member.github || member.linkedin) && (
              <div className={styles.profiles}>
                {member.linkedin && (
                  <a href={`https://www.linkedin.com/in/${member.linkedin}/`} aria-label={`${member.name} on LinkedIn`} target="_blank" rel="noreferrer">LinkedIn ↗</a>
                )}
                {member.github && (
                  <a href={`https://github.com/${member.github}`} aria-label={`${member.name} on GitHub`} target="_blank" rel="noreferrer">GitHub ↗</a>
                )}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function FacultyGrid({ members }: { members: typeof facultyCoordinators }) {
  return (
    <ul className={styles.facultyGrid}>
      {members.map((member) => (
        <li className={styles.facultyMember} key={member.name}>
          <div className={styles.facultyPortrait}>
            <Image
              src={`/continuum/people/${member.portrait}.webp`}
              alt=""
              width={1080}
              height={1440}
              sizes="(max-width: 760px) 94vw, (max-width: 1200px) 50vw, 600px"
            />
          </div>
          <div className={styles.facultyText}>
            <h3>{member.name}</h3>
            <p className={styles.branch}>{member.appointment}, CSE</p>
            <p>{member.interests}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function FacultyDirectory() {
  return (
    <div className={styles.directory}>
      <div className={styles.university}>
        <section className={styles.office} aria-labelledby="patron-heading">
          <h2 className={styles.eyebrow} id="patron-heading">Patron</h2>
          <p className={styles.officeName}>Festival patron to be announced</p>
          <p>Prof. Anupama Kaushik Sharma is the Vice-Chancellor of MMMUT.</p>
        </section>
        <section className={styles.office} aria-labelledby="hod-heading">
          <h2 className={styles.eyebrow} id="hod-heading">Head of Department</h2>
          <p className={styles.officeName}>Prof. Rakesh Kumar</p>
          <p>Professor and Head of Computer Science &amp; Engineering, MMMUT</p>
        </section>
      </div>
      <p className={styles.source}><a href={peopleSources.administration} target="_blank" rel="noreferrer">MMMUT administration ↗</a></p>
      <section className={styles.group} aria-labelledby="coordinators-heading">
        <h2 id="coordinators-heading">Faculty coordinators</h2>
        <FacultyGrid members={facultyCoordinators} />
      </section>
      <section className={styles.group} aria-labelledby="advisors-heading">
        <h2 id="advisors-heading">Faculty advisors</h2>
        <FacultyGrid members={facultyAdvisors} />
      </section>
      <p className={styles.source}><a href={peopleSources.faculty} target="_blank" rel="noreferrer">Nexsus faculty directory ↗</a></p>
    </div>
  );
}
