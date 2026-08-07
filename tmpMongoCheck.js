const fs = require('fs');
const mongoose = require('mongoose');
const env = fs.readFileSync('.env', 'utf-8').split(/\r?\n/).filter(Boolean).reduce((acc, line) => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) acc[m[1]] = m[2].trim();
  return acc;
}, {});
console.log('MONGODB_URI=', env.MONGODB_URI ? 'present' : 'missing');
(async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      dbName: 'talentos',
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      tls: true,
      tlsAllowInvalidCertificates: false,
    });
    console.log('connected', mongoose.connection.readyState);
    const JobSchema = new mongoose.Schema({}, { strict: false, collection: 'jobs' });
    const Job = mongoose.models.JobTest || mongoose.model('JobTest', JobSchema);
    const start = Date.now();
    const cursor = Job.find({ status: 'active' })
      .select('title description requiredSkills preferredSkills minExperience createdAt')
      .sort({ createdAt: -1 })
      .lean()
      .cursor();
    let count = 0;
    for await (const doc of cursor) {
      count += 1;
      if (count <= 2) console.log('doc', doc);
      if (count >= 5) break;
    }
    console.log('fetched', count, 'documents', 'elapsed', Date.now() - start);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('error', err && err.message);
    console.error(err);
    process.exit(1);
  }
})();
