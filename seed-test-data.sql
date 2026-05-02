-- ============================================================
-- NECT EXAM — Test Seed Data
-- Run in phpMyAdmin or: mysql -u root nect_exam < seed-test-data.sql
-- Requires: schema already imported + at least one admin user in profiles
-- ============================================================

USE nect_exam;

-- ── Helper: capture admin id ──────────────────────────────────────────────────
SET @admin_id = (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1);

-- ── 1. TRADES (skip if already exist) ────────────────────────────────────────
INSERT IGNORE INTO trades (id, name, code, description) VALUES
  ('t1000000-0000-0000-0000-000000000001', 'Electrical',            'ELE',  'Electrical installation and maintenance'),
  ('t1000000-0000-0000-0000-000000000002', 'Fitting & Machining',   'FIT',  'Fitting, turning and machining'),
  ('t1000000-0000-0000-0000-000000000003', 'Welding',               'WLD',  'Arc, MIG and TIG welding'),
  ('t1000000-0000-0000-0000-000000000004', 'Computer Applications', 'COPA', 'Computer software and office applications'),
  ('t1000000-0000-0000-0000-000000000005', 'Plumbing',              'PLB',  'Plumbing and pipe fitting');

-- ── 2. COURSES ────────────────────────────────────────────────────────────────
INSERT IGNORE INTO courses (id, admin_id, trade_id, title, description) VALUES
  ('c1000000-0000-0000-0000-000000000001', @admin_id,
   't1000000-0000-0000-0000-000000000001',
   'Electrical Safety Fundamentals',
   'Core principles of electrical safety, hazard identification and safe working practices.'),

  ('c1000000-0000-0000-0000-000000000002', @admin_id,
   't1000000-0000-0000-0000-000000000004',
   'Basic Computer Skills',
   'Introduction to operating systems, MS Office and internet usage.'),

  ('c1000000-0000-0000-0000-000000000003', @admin_id,
   't1000000-0000-0000-0000-000000000003',
   'Welding Techniques Level 1',
   'Fundamentals of arc welding, safety procedures and joint preparation.');

-- ═════════════════════════════════════════════════════════════════════════════
-- 3. EXAMS
-- ═════════════════════════════════════════════════════════════════════════════

-- ── EXAM A: Electrical Safety — MCQ (published / active) ─────────────────────
INSERT IGNORE INTO exams
  (id, course_id, title, description, instructions, status, is_public,
   duration_mins, pass_score, shuffle_questions, show_results) VALUES
  ('e1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   'Electrical Safety MCQ Test',
   'Multiple-choice test covering electrical hazards, PPE and safe isolation.',
   'Choose the best answer for each question. Each question carries 1 mark.',
   'published', 1, 20, 60, 1, 1);

-- Questions for Exam A
INSERT IGNORE INTO questions (id, exam_id, type, prompt, points, position) VALUES
  ('q1a00000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001','mcq',
   'What colour is the LIVE wire in a standard 3-pin plug?', 1, 1),
  ('q1a00000-0000-0000-0000-000000000002','e1000000-0000-0000-0000-000000000001','mcq',
   'Which of the following is the correct PPE for electrical work?', 1, 2),
  ('q1a00000-0000-0000-0000-000000000003','e1000000-0000-0000-0000-000000000001','mcq',
   'What does a fuse do in an electrical circuit?', 1, 3),
  ('q1a00000-0000-0000-0000-000000000004','e1000000-0000-0000-0000-000000000001','mcq',
   'Safe isolation must be confirmed using which instrument?', 1, 4),
  ('q1a00000-0000-0000-0000-000000000005','e1000000-0000-0000-0000-000000000001','mcq',
   'The unit of electrical resistance is:', 1, 5);

-- Options for Q1
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o1a01-1','q1a00000-0000-0000-0000-000000000001','Blue',  0, 1),
  ('o1a01-2','q1a00000-0000-0000-0000-000000000001','Brown', 1, 2),
  ('o1a01-3','q1a00000-0000-0000-0000-000000000001','Green', 0, 3),
  ('o1a01-4','q1a00000-0000-0000-0000-000000000001','Black', 0, 4);

-- Options for Q2
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o1a02-1','q1a00000-0000-0000-0000-000000000002','Latex gloves',          0, 1),
  ('o1a02-2','q1a00000-0000-0000-0000-000000000002','Insulated rubber gloves',1, 2),
  ('o1a02-3','q1a00000-0000-0000-0000-000000000002','Cotton gloves',          0, 3),
  ('o1a02-4','q1a00000-0000-0000-0000-000000000002','No gloves needed',       0, 4);

-- Options for Q3
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o1a03-1','q1a00000-0000-0000-0000-000000000003','Increases voltage',           0, 1),
  ('o1a03-2','q1a00000-0000-0000-0000-000000000003','Stores electrical energy',    0, 2),
  ('o1a03-3','q1a00000-0000-0000-0000-000000000003','Breaks the circuit on overcurrent',1, 3),
  ('o1a03-4','q1a00000-0000-0000-0000-000000000003','Reduces resistance',          0, 4);

-- Options for Q4
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o1a04-1','q1a00000-0000-0000-0000-000000000004','Ammeter',            0, 1),
  ('o1a04-2','q1a00000-0000-0000-0000-000000000004','Voltmeter/test lamp',1, 2),
  ('o1a04-3','q1a00000-0000-0000-0000-000000000004','Ohmmeter',           0, 3),
  ('o1a04-4','q1a00000-0000-0000-0000-000000000004','Megger',             0, 4);

-- Options for Q5
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o1a05-1','q1a00000-0000-0000-0000-000000000005','Ampere',  0, 1),
  ('o1a05-2','q1a00000-0000-0000-0000-000000000005','Volt',    0, 2),
  ('o1a05-3','q1a00000-0000-0000-0000-000000000005','Watt',    0, 3),
  ('o1a05-4','q1a00000-0000-0000-0000-000000000005','Ohm',     1, 4);


-- ── EXAM B: Electrical Safety — Mixed (True/False + Short Answer, draft) ─────
INSERT IGNORE INTO exams
  (id, course_id, title, description, instructions, status, is_public,
   duration_mins, pass_score, shuffle_questions, show_results) VALUES
  ('e1000000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000001',
   'Electrical Safety — Theory Paper',
   'True/False and written-answer questions on electrical safety theory.',
   'Answer all questions. True/False carries 1 mark each; written answers carry 2 marks.',
   'draft', 0, 30, 60, 0, 1);

INSERT IGNORE INTO questions (id, exam_id, type, prompt, points, position) VALUES
  ('q1b00000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000002','true_false',
   'A residual current device (RCD) protects against electric shock.', 1, 1),
  ('q1b00000-0000-0000-0000-000000000002','e1000000-0000-0000-0000-000000000002','true_false',
   'It is safe to work on live circuits as long as you use one hand.', 1, 2),
  ('q1b00000-0000-0000-0000-000000000003','e1000000-0000-0000-0000-000000000002','true_false',
   'The earth wire in a cable is coloured green and yellow.', 1, 3),
  ('q1b00000-0000-0000-0000-000000000004','e1000000-0000-0000-0000-000000000002','short_answer',
   'Name TWO hazards associated with working near overhead power lines.', 2, 4),
  ('q1b00000-0000-0000-0000-000000000005','e1000000-0000-0000-0000-000000000002','short_answer',
   'Explain the meaning of the term "safe isolation" in electrical work.', 2, 5);

-- True/False options for Q1
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o1b01-1','q1b00000-0000-0000-0000-000000000001','True',  1, 1),
  ('o1b01-2','q1b00000-0000-0000-0000-000000000001','False', 0, 2);

-- True/False options for Q2
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o1b02-1','q1b00000-0000-0000-0000-000000000002','True',  0, 1),
  ('o1b02-2','q1b00000-0000-0000-0000-000000000002','False', 1, 2);

-- True/False options for Q3
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o1b03-1','q1b00000-0000-0000-0000-000000000003','True',  1, 1),
  ('o1b03-2','q1b00000-0000-0000-0000-000000000003','False', 0, 2);


-- ═════════════════════════════════════════════════════════════════════════════
-- EXAM C: Computer Skills — MCQ (published / active)
-- ═════════════════════════════════════════════════════════════════════════════
INSERT IGNORE INTO exams
  (id, course_id, title, description, instructions, status, is_public,
   duration_mins, pass_score, shuffle_questions, show_results) VALUES
  ('e2000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000002',
   'Computer Basics MCQ',
   'Multiple-choice assessment on fundamental computer knowledge.',
   'Select one correct answer per question.',
   'published', 1, 15, 60, 1, 1);

INSERT IGNORE INTO questions (id, exam_id, type, prompt, points, position) VALUES
  ('q2a00000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000001','mcq',
   'Which of the following is an operating system?', 1, 1),
  ('q2a00000-0000-0000-0000-000000000002','e2000000-0000-0000-0000-000000000001','mcq',
   'What does "CPU" stand for?', 1, 2),
  ('q2a00000-0000-0000-0000-000000000003','e2000000-0000-0000-0000-000000000001','mcq',
   'Which shortcut key is used to copy selected text?', 1, 3),
  ('q2a00000-0000-0000-0000-000000000004','e2000000-0000-0000-0000-000000000001','mcq',
   'What is the function of RAM?', 1, 4),
  ('q2a00000-0000-0000-0000-000000000005','e2000000-0000-0000-0000-000000000001','mcq',
   'Which file extension is used by MS Word documents?', 1, 5),
  ('q2a00000-0000-0000-0000-000000000006','e2000000-0000-0000-0000-000000000001','mcq',
   'What does "www" stand for in a website address?', 1, 6);

-- Q1 options
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o2a01-1','q2a00000-0000-0000-0000-000000000001','Microsoft Word',  0, 1),
  ('o2a01-2','q2a00000-0000-0000-0000-000000000001','Windows 11',      1, 2),
  ('o2a01-3','q2a00000-0000-0000-0000-000000000001','Google Chrome',   0, 3),
  ('o2a01-4','q2a00000-0000-0000-0000-000000000001','VLC Media Player',0, 4);

-- Q2 options
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o2a02-1','q2a00000-0000-0000-0000-000000000002','Central Processing Unit',    1, 1),
  ('o2a02-2','q2a00000-0000-0000-0000-000000000002','Computer Personal Unit',     0, 2),
  ('o2a02-3','q2a00000-0000-0000-0000-000000000002','Core Power Utility',         0, 3),
  ('o2a02-4','q2a00000-0000-0000-0000-000000000002','Central Peripheral Upgrade', 0, 4);

-- Q3 options
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o2a03-1','q2a00000-0000-0000-0000-000000000003','Ctrl + V', 0, 1),
  ('o2a03-2','q2a00000-0000-0000-0000-000000000003','Ctrl + X', 0, 2),
  ('o2a03-3','q2a00000-0000-0000-0000-000000000003','Ctrl + C', 1, 3),
  ('o2a03-4','q2a00000-0000-0000-0000-000000000003','Ctrl + Z', 0, 4);

-- Q4 options
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o2a04-1','q2a00000-0000-0000-0000-000000000004','Stores data permanently',        0, 1),
  ('o2a04-2','q2a00000-0000-0000-0000-000000000004','Temporarily holds running data', 1, 2),
  ('o2a04-3','q2a00000-0000-0000-0000-000000000004','Processes graphics',             0, 3),
  ('o2a04-4','q2a00000-0000-0000-0000-000000000004','Connects to the internet',       0, 4);

-- Q5 options
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o2a05-1','q2a00000-0000-0000-0000-000000000005','.xls',  0, 1),
  ('o2a05-2','q2a00000-0000-0000-0000-000000000005','.ppt',  0, 2),
  ('o2a05-3','q2a00000-0000-0000-0000-000000000005','.docx', 1, 3),
  ('o2a05-4','q2a00000-0000-0000-0000-000000000005','.pdf',  0, 4);

-- Q6 options
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o2a06-1','q2a00000-0000-0000-0000-000000000006','World Wide Web',    1, 1),
  ('o2a06-2','q2a00000-0000-0000-0000-000000000006','Wide World Web',    0, 2),
  ('o2a06-3','q2a00000-0000-0000-0000-000000000006','Web World Wide',    0, 3),
  ('o2a06-4','q2a00000-0000-0000-0000-000000000006','Worldwide Weblink', 0, 4);


-- ═════════════════════════════════════════════════════════════════════════════
-- EXAM D: Welding Safety — MCQ (published / active)
-- ═════════════════════════════════════════════════════════════════════════════
INSERT IGNORE INTO exams
  (id, course_id, title, description, instructions, status, is_public,
   duration_mins, pass_score, shuffle_questions, show_results) VALUES
  ('e3000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000003',
   'Welding Safety MCQ',
   'MCQ assessment on welding hazards, PPE and safe working procedures.',
   'Select the single best answer for each question.',
   'published', 1, 20, 60, 1, 1);

INSERT IGNORE INTO questions (id, exam_id, type, prompt, points, position) VALUES
  ('q3a00000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000001','mcq',
   'What type of lens shade is required for arc welding?', 1, 1),
  ('q3a00000-0000-0000-0000-000000000002','e3000000-0000-0000-0000-000000000001','mcq',
   'Which gas is used as a shielding gas in MIG welding?', 1, 2),
  ('q3a00000-0000-0000-0000-000000000003','e3000000-0000-0000-0000-000000000001','mcq',
   'What hazard is produced by the welding arc that can damage eyesight?', 1, 3),
  ('q3a00000-0000-0000-0000-000000000004','e3000000-0000-0000-0000-000000000001','mcq',
   'Before welding, what should be done to prevent fire?', 1, 4),
  ('q3a00000-0000-0000-0000-000000000005','e3000000-0000-0000-0000-000000000001','mcq',
   'Which welding process uses a non-consumable tungsten electrode?', 1, 5);

-- Q1 options
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o3a01-1','q3a00000-0000-0000-0000-000000000001','Shade 2',  0, 1),
  ('o3a01-2','q3a00000-0000-0000-0000-000000000001','Shade 5',  0, 2),
  ('o3a01-3','q3a00000-0000-0000-0000-000000000001','Shade 10–12', 1, 3),
  ('o3a01-4','q3a00000-0000-0000-0000-000000000001','No shade needed', 0, 4);

-- Q2 options
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o3a02-1','q3a00000-0000-0000-0000-000000000002','Oxygen',       0, 1),
  ('o3a02-2','q3a00000-0000-0000-0000-000000000002','Argon or CO₂', 1, 2),
  ('o3a02-3','q3a00000-0000-0000-0000-000000000002','Hydrogen',     0, 3),
  ('o3a02-4','q3a00000-0000-0000-0000-000000000002','Nitrogen',     0, 4);

-- Q3 options
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o3a03-1','q3a00000-0000-0000-0000-000000000003','Infrared and ultraviolet radiation', 1, 1),
  ('o3a03-2','q3a00000-0000-0000-0000-000000000003','X-rays',                            0, 2),
  ('o3a03-3','q3a00000-0000-0000-0000-000000000003','Radio waves',                       0, 3),
  ('o3a03-4','q3a00000-0000-0000-0000-000000000003','Gamma rays',                        0, 4);

-- Q4 options
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o3a04-1','q3a00000-0000-0000-0000-000000000004','Increase ventilation only',                   0, 1),
  ('o3a04-2','q3a00000-0000-0000-0000-000000000004','Remove or shield flammable materials nearby', 1, 2),
  ('o3a04-3','q3a00000-0000-0000-0000-000000000004','Weld faster to reduce sparks',                0, 3),
  ('o3a04-4','q3a00000-0000-0000-0000-000000000004','Use a lower current setting',                 0, 4);

-- Q5 options
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o3a05-1','q3a00000-0000-0000-0000-000000000005','MIG welding',   0, 1),
  ('o3a05-2','q3a00000-0000-0000-0000-000000000005','Arc welding',   0, 2),
  ('o3a05-3','q3a00000-0000-0000-0000-000000000005','TIG welding',   1, 3),
  ('o3a05-4','q3a00000-0000-0000-0000-000000000005','Spot welding',  0, 4);


-- ═════════════════════════════════════════════════════════════════════════════
-- EXAM E: Welding — Mixed True/False + Short Answer (published)
-- ═════════════════════════════════════════════════════════════════════════════
INSERT IGNORE INTO exams
  (id, course_id, title, description, instructions, status, is_public,
   duration_mins, pass_score, shuffle_questions, show_results) VALUES
  ('e3000000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000003',
   'Welding Theory Paper',
   'True/False and short-answer questions on welding techniques and safety.',
   'Answer all questions honestly. Written answers will be marked by your instructor.',
   'published', 0, 30, 60, 0, 1);

INSERT IGNORE INTO questions (id, exam_id, type, prompt, points, position) VALUES
  ('q3b00000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000002','true_false',
   'Welding can be safely performed in a confined space without ventilation.', 1, 1),
  ('q3b00000-0000-0000-0000-000000000002','e3000000-0000-0000-0000-000000000002','true_false',
   'A welding helmet must always be used during arc welding.', 1, 2),
  ('q3b00000-0000-0000-0000-000000000003','e3000000-0000-0000-0000-000000000002','true_false',
   'MIG welding uses a continuously fed consumable wire electrode.', 1, 3),
  ('q3b00000-0000-0000-0000-000000000004','e3000000-0000-0000-0000-000000000002','short_answer',
   'List THREE personal protective equipment (PPE) items required for arc welding.', 2, 4),
  ('q3b00000-0000-0000-0000-000000000005','e3000000-0000-0000-0000-000000000002','short_answer',
   'What is the purpose of a welding electrode coating (flux)?', 2, 5);

-- True/False for Q1
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o3b01-1','q3b00000-0000-0000-0000-000000000001','True',  0, 1),
  ('o3b01-2','q3b00000-0000-0000-0000-000000000001','False', 1, 2);

-- True/False for Q2
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o3b02-1','q3b00000-0000-0000-0000-000000000002','True',  1, 1),
  ('o3b02-2','q3b00000-0000-0000-0000-000000000002','False', 0, 2);

-- True/False for Q3
INSERT IGNORE INTO answer_options (id, question_id, `text`, is_correct, position) VALUES
  ('o3b03-1','q3b00000-0000-0000-0000-000000000003','True',  1, 1),
  ('o3b03-2','q3b00000-0000-0000-0000-000000000003','False', 0, 2);

-- ─────────────────────────────────────────────────────────────────────────────
SELECT 'Seed complete' AS status,
  (SELECT COUNT(*) FROM trades)         AS trades,
  (SELECT COUNT(*) FROM courses)        AS courses,
  (SELECT COUNT(*) FROM exams)          AS exams,
  (SELECT COUNT(*) FROM questions)      AS questions,
  (SELECT COUNT(*) FROM answer_options) AS answer_options;
