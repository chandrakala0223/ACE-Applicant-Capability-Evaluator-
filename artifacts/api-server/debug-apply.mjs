import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const pdfPath = path.resolve(cwd, 'sample_resume.pdf');
if (!fs.existsSync(pdfPath)) {
  console.error('sample_resume.pdf not found at', pdfPath);
  process.exit(1);
}

const jobsResp = await fetch('http://localhost:5000/api/public/jobs');
if (!jobsResp.ok) {
  console.error('Failed to fetch jobs', jobsResp.status, await jobsResp.text());
  process.exit(1);
}
const jobs = await jobsResp.json();
console.log('jobs length', jobs.length);
if (!Array.isArray(jobs) || jobs.length === 0) {
  console.error('No jobs available to apply to');
  process.exit(1);
}
const jobId = jobs[0].id || jobs[0]._id;
console.log('Using jobId', jobId);

const pdfBuffer = fs.readFileSync(pdfPath);
const resumeBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
const form = new FormData();
form.append('name', 'Test User');
form.append('email', 'test@example.com');
form.append('jobId', jobId);
form.append('githubUrl', 'https://github.com/test');
form.append('linkedinUrl', 'https://linkedin.com/in/test');
form.append('resume', resumeBlob, 'sample_resume.pdf');

const applyResp = await fetch('http://localhost:5000/api/public/apply', {
  method: 'POST',
  body: form,
});
console.log('apply status', applyResp.status);
console.log(await applyResp.text());
