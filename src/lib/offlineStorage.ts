const DB_NAME = "lessons_offline";
const DB_VERSION = 2;
const STORE_LESSONS = "lessons";
const STORE_EXAM_QUESTIONS = "exam_questions";
const STORE_PENDING_RESULTS = "pending_exam_results";

export interface OfflineLesson {
  id: string;
  title: string;
  content: string;
  summary: string;
  questions: OfflineQuestion[];
  savedAt: string;
}

export interface OfflineQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
  display_order: number;
}

export interface OfflineExamQuestions {
  majorId: string;
  questions: OfflineQuestion[];
  savedAt: string;
}

export interface PendingExamResult {
  id: string;
  studentId: string;
  majorId: string;
  answers: Record<string, string>;
  score: number;
  total: number;
  startedAt: string;
  completedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(STORE_LESSONS)) {
          db.createObjectStore(STORE_LESSONS, { keyPath: "id" });
        }
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORE_EXAM_QUESTIONS)) {
          db.createObjectStore(STORE_EXAM_QUESTIONS, { keyPath: "majorId" });
        }
        if (!db.objectStoreNames.contains(STORE_PENDING_RESULTS)) {
          db.createObjectStore(STORE_PENDING_RESULTS, { keyPath: "id" });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---- Lessons ----

export async function saveLesson(lesson: OfflineLesson): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LESSONS, "readwrite");
    tx.objectStore(STORE_LESSONS).put(lesson);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLesson(id: string): Promise<OfflineLesson | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LESSONS, "readonly");
    const req = tx.objectStore(STORE_LESSONS).get(id);
    req.onsuccess = () => resolve(req.result as OfflineLesson | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function removeLesson(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LESSONS, "readwrite");
    tx.objectStore(STORE_LESSONS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllSavedLessons(): Promise<OfflineLesson[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LESSONS, "readonly");
    const req = tx.objectStore(STORE_LESSONS).getAll();
    req.onsuccess = () => resolve(req.result as OfflineLesson[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getSavedLessonIds(): Promise<Set<string>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LESSONS, "readonly");
    const req = tx.objectStore(STORE_LESSONS).getAllKeys();
    req.onsuccess = () => resolve(new Set(req.result.map(String)));
    req.onerror = () => reject(req.error);
  });
}

// ---- Exam Questions ----

export async function saveExamQuestions(majorId: string, questions: OfflineQuestion[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EXAM_QUESTIONS, "readwrite");
    tx.objectStore(STORE_EXAM_QUESTIONS).put({
      majorId,
      questions,
      savedAt: new Date().toISOString(),
    } as OfflineExamQuestions);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getExamQuestions(majorId: string): Promise<OfflineQuestion[] | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EXAM_QUESTIONS, "readonly");
    const req = tx.objectStore(STORE_EXAM_QUESTIONS).get(majorId);
    req.onsuccess = () => {
      const result = req.result as OfflineExamQuestions | undefined;
      resolve(result ? result.questions : null);
    };
    req.onerror = () => reject(req.error);
  });
}

// ---- Pending Exam Results ----

export async function savePendingExamResult(result: PendingExamResult): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING_RESULTS, "readwrite");
    tx.objectStore(STORE_PENDING_RESULTS).put(result);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingExamResults(): Promise<PendingExamResult[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING_RESULTS, "readonly");
    const req = tx.objectStore(STORE_PENDING_RESULTS).getAll();
    req.onsuccess = () => resolve(req.result as PendingExamResult[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removePendingResult(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING_RESULTS, "readwrite");
    tx.objectStore(STORE_PENDING_RESULTS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
