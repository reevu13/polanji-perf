import http from 'k6/http';

export function pickFirst(arr, predicate = () => true) {
  if (!Array.isArray(arr)) return null;
  for (const item of arr) if (predicate(item)) return item;
  return null;
}

export function findCourseWithQuiz(baseUrl, headers = {}, options = {}) {
  const { maxCourses = 20, maxSections = 5 } = options;

  const coursesRes = http.get(`${baseUrl}/courses`, {
    headers,
    tags: { endpoint: '/courses' },
  });
  if (coursesRes.status < 200 || coursesRes.status >= 300) return null;

  const courses = Array.isArray(coursesRes.json()) ? coursesRes.json() : [];
  const limitedCourses = maxCourses ? courses.slice(0, maxCourses) : courses;

  for (const course of limitedCourses) {
    const courseId = course?.id;
    if (!courseId) continue;

    let sectionIndices = [];
    const detailsRes = http.get(`${baseUrl}/courses/${courseId}`, {
      headers,
      tags: { endpoint: '/courses/{course_id}' },
    });
    if (detailsRes.status >= 200 && detailsRes.status < 300) {
      try {
        const details = detailsRes.json();
        const sections = Array.isArray(details?.sections) ? details.sections : [];
        for (const section of sections) {
          const candidate =
            section?.section_index ??
            section?.sectionIndex ??
            section?.index ??
            section?.order;
          if (Number.isInteger(candidate) && candidate >= 0) {
            sectionIndices.push(candidate);
          }
        }
      } catch (_err) {
        // ignore JSON errors and fallback to default indices
      }
    }

    if (!sectionIndices.length) sectionIndices = [0];
    const limitedSections = maxSections ? sectionIndices.slice(0, maxSections) : sectionIndices;

    for (const sectionIndex of limitedSections) {
      const quizRes = http.get(
        `${baseUrl}/section-quizzes?course_id=${courseId}&section_index=${sectionIndex}`,
        {
          headers,
          tags: { endpoint: '/section-quizzes' },
        }
      );

      if (quizRes.status >= 200 && quizRes.status < 300) {
        try {
          const quizzes = quizRes.json();
          if (Array.isArray(quizzes) && quizzes.length) {
            return { course, courseId, sectionIndex, quizzes };
          }
        } catch (_err) {
          // Response not JSON; continue searching
        }
      }
    }
  }

  return null;
}
