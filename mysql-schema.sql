-- ============================================================
-- NECT EXAM — MySQL 8.0 Schema
-- Run: mysql -u root -p < mysql-schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS nect_exam CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nect_exam;

-- 1. TABLES

CREATE TABLE IF NOT EXISTS profiles (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  full_name     VARCHAR(255),
  role          ENUM('admin','student') NOT NULL DEFAULT 'student',
  password_hash VARCHAR(255) NOT NULL,
  avatar_url    VARCHAR(500),
  dob           DATE,
  father_name   VARCHAR(255),
  mother_name   VARCHAR(255),
  address       TEXT,
  pin_code      VARCHAR(20),
  mobile        VARCHAR(20),
  course_id     CHAR(36),
  reference     VARCHAR(255),
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
  `key`      VARCHAR(100) NOT NULL PRIMARY KEY,
  `value`    TEXT,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trades (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  code        VARCHAR(20),
  description TEXT,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  admin_id    CHAR(36)     NOT NULL,
  trade_id    CHAR(36),
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  duration    VARCHAR(100),
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (trade_id) REFERENCES trades(id)   ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS exams (
  id                CHAR(36)     NOT NULL PRIMARY KEY,
  course_id         CHAR(36)     NOT NULL,
  title             VARCHAR(500) NOT NULL,
  description       TEXT,
  instructions      TEXT,
  status            ENUM('draft','published','active','expired') NOT NULL DEFAULT 'draft',
  is_public         TINYINT(1)   NOT NULL DEFAULT 0,
  duration_mins     INT,
  pass_score        INT          DEFAULT 60,
  shuffle_questions TINYINT(1)   NOT NULL DEFAULT 0,
  show_results      TINYINT(1)   NOT NULL DEFAULT 1,
  starts_at         DATETIME,
  ends_at           DATETIME,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS questions (
  id          CHAR(36)  NOT NULL PRIMARY KEY,
  exam_id     CHAR(36)  NOT NULL,
  type        ENUM('mcq','true_false','short_answer') NOT NULL,
  prompt      TEXT      NOT NULL,
  points      INT       NOT NULL DEFAULT 1,
  position    INT       NOT NULL DEFAULT 0,
  explanation TEXT,
  created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS answer_options (
  id          CHAR(36)   NOT NULL PRIMARY KEY,
  question_id CHAR(36)   NOT NULL,
  `text`      TEXT       NOT NULL,
  is_correct  TINYINT(1) NOT NULL DEFAULT 0,
  position    INT        NOT NULL DEFAULT 0,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS question_library (
  id          CHAR(36)  NOT NULL PRIMARY KEY,
  type        ENUM('mcq','true_false','short_answer') NOT NULL,
  prompt      TEXT      NOT NULL,
  points      INT       NOT NULL DEFAULT 1,
  explanation TEXT,
  created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS question_library_options (
  id                  CHAR(36)   NOT NULL PRIMARY KEY,
  question_library_id CHAR(36)   NOT NULL,
  `text`              TEXT       NOT NULL,
  is_correct          TINYINT(1) NOT NULL DEFAULT 0,
  position            INT        NOT NULL DEFAULT 0,
  FOREIGN KEY (question_library_id) REFERENCES question_library(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exam_assignments (
  id          CHAR(36)  NOT NULL PRIMARY KEY,
  exam_id     CHAR(36)  NOT NULL,
  student_id  CHAR(36)  NOT NULL,
  assigned_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_exam_student (exam_id, student_id),
  FOREIGN KEY (exam_id)    REFERENCES exams(id)    ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attempts (
  id               CHAR(36)      NOT NULL PRIMARY KEY,
  exam_id          CHAR(36)      NOT NULL,
  student_id       CHAR(36)      NOT NULL,
  status           ENUM('in_progress','submitted','graded') NOT NULL DEFAULT 'in_progress',
  started_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at     DATETIME,
  time_spent_secs  INT,
  score_raw        INT,
  score_pct        DECIMAL(5,2),
  passed           TINYINT(1),
  graded_at        DATETIME,
  grader_notes     TEXT,
  UNIQUE KEY uq_exam_student (exam_id, student_id),
  FOREIGN KEY (exam_id)    REFERENCES exams(id)    ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS responses (
  id                 CHAR(36)   NOT NULL PRIMARY KEY,
  attempt_id         CHAR(36)   NOT NULL,
  question_id        CHAR(36)   NOT NULL,
  selected_option_id CHAR(36),
  text_answer        TEXT,
  is_correct         TINYINT(1),
  points_awarded     INT,
  created_at         DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attempt_question (attempt_id, question_id),
  FOREIGN KEY (attempt_id)         REFERENCES attempts(id)       ON DELETE CASCADE,
  FOREIGN KEY (question_id)        REFERENCES questions(id)       ON DELETE CASCADE,
  FOREIGN KEY (selected_option_id) REFERENCES answer_options(id) ON DELETE SET NULL
);

-- 2. DEFAULT SEED DATA
-- Passwords are bcrypt hashes; run server/seed.js to create test users instead.
-- Or insert manually after running: node -e "require('bcryptjs').hash('admin1234',10).then(console.log)"

-- Default app settings
INSERT IGNORE INTO app_settings (`key`, `value`) VALUES ('app_title', 'NECT Exam');
INSERT IGNORE INTO app_settings (`key`, `value`) VALUES ('app_logo_url', '');

-- Default trades
INSERT IGNORE INTO trades (id, name, code, description) VALUES
  (UUID(), 'Electrical',          'ELE',  'Electrical trade'),
  (UUID(), 'Fitting & Machining', 'FIT',  'Fitting and machining trade'),
  (UUID(), 'Welding',             'WLD',  'Welding trade'),
  (UUID(), 'Computer Applications', 'COPA', 'Computer applications trade'),
  (UUID(), 'Plumbing',            'PLB',  'Plumbing trade');
