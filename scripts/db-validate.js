#!/usr/bin/env node
const { Client } = require('pg');

function logResult(name, ok, detail) {
  const status = ok ? 'PASS' : 'FAIL';
  const message = detail ? ` - ${detail}` : '';
  console.log(`${status}: ${name}${message}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  const {
    PGHOST,
    PGDATABASE,
    PGUSER,
    PGPASSWORD,
    PGPORT,
    DB_SSL,
    DB_SSL_STRICT,
    EMAIL,
  } = process.env;

  if (!PGHOST || !PGDATABASE || !PGUSER || !PGPASSWORD) {
    console.error('PGHOST, PGDATABASE, PGUSER, and PGPASSWORD environment variables are required for DB validation.');
    process.exit(1);
  }

  const dbHost = PGHOST.trim();
  const dbName = PGDATABASE.trim();
  const dbUser = PGUSER.trim();
  const dbPassword = PGPASSWORD.trim();
  const dbPort = Number.parseInt(PGPORT ?? '', 10) || 5432;
  const sslEnabled = String(DB_SSL ?? 'false').toLowerCase() === 'true';
  const sslRejectUnauthorized = String(DB_SSL_STRICT ?? 'false').toLowerCase() === 'true';
  const dbSsl = sslEnabled ? { rejectUnauthorized: sslRejectUnauthorized } : false;

  if (!EMAIL) {
    console.error('EMAIL environment variable is required for DB validation.');
    process.exit(1);
  }

  const client = new Client({
    host: dbHost,
    database: dbName,
    user: dbUser,
    password: dbPassword,
    port: dbPort,
    ssl: dbSsl,
  });

  await client.connect();

  const topicsCount = await client.query('SELECT COUNT(*)::int AS count FROM topics');
  logResult('topics table has data', topicsCount.rows[0].count > 0, `count=${topicsCount.rows[0].count}`);

  const coursesCount = await client.query('SELECT COUNT(*)::int AS count FROM courses');
  logResult('courses table has data', coursesCount.rows[0].count > 0, `count=${coursesCount.rows[0].count}`);

  const userRes = await client.query('SELECT id, role FROM users WHERE email = $1', [EMAIL]);
  if (userRes.rowCount === 0) {
    logResult('user exists', false, `email=${EMAIL}`);
    await client.end();
    return;
  }

  const user = userRes.rows[0];
  const userId = user.id;
  logResult('user exists', true, `id=${userId}, role=${user.role}`);

  const quizProgress = await client.query(
    'SELECT course_id, section_index, passed, passed_at FROM course_section_quiz_progress WHERE user_id = $1 ORDER BY passed_at DESC LIMIT 1',
    [userId]
  );

  let targetCourseId = null;
  if (quizProgress.rowCount > 0) {
    const quiz = quizProgress.rows[0];
    targetCourseId = quiz.course_id;
    logResult('quiz completion record', !!quiz.passed, `course_id=${quiz.course_id}, section_index=${quiz.section_index}, passed=${quiz.passed}`);
  } else {
    logResult('quiz completion record', false, 'no quiz progress rows found');
  }

  const interactionQuery = targetCourseId
    ? await client.query(
        'SELECT course_id, course_progress, updated_at FROM course_interactions WHERE user_id = $1 AND course_id = $2 ORDER BY updated_at DESC LIMIT 1',
        [userId, targetCourseId]
      )
    : await client.query(
        'SELECT course_id, course_progress, updated_at FROM course_interactions WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
        [userId]
      );

  if (interactionQuery.rowCount === 0) {
    logResult('enrollment record', false, 'course_interactions has no rows for user');
  } else {
    const row = interactionQuery.rows[0];
    logResult('enrollment record', true, `course_id=${row.course_id}`);
    logResult('progress updated', row.course_progress !== null && row.course_progress >= 0, `progress=${row.course_progress}`);
    targetCourseId = targetCourseId ?? row.course_id;
  }

  if (targetCourseId !== null) {
    const sectionQuizzes = await client.query(
      'SELECT COUNT(*)::int AS count FROM section_quizzes WHERE course_id = $1',
      [targetCourseId]
    );
    logResult(
      'section quizzes available',
      sectionQuizzes.rows[0].count > 0,
      `course_id=${targetCourseId}, count=${sectionQuizzes.rows[0].count}`
    );
  } else {
    logResult('section quizzes available', false, 'no relevant course_id to inspect');
  }

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
