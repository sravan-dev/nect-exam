-- Run this on existing databases to add new student profile fields
-- mysql -u root -p nect_exam < alter-tables.sql

ALTER TABLE courses
  ADD COLUMN duration VARCHAR(100) AFTER description;

ALTER TABLE profiles
  ADD COLUMN dob         DATE         AFTER avatar_url,
  ADD COLUMN father_name VARCHAR(255) AFTER dob,
  ADD COLUMN mother_name VARCHAR(255) AFTER father_name,
  ADD COLUMN address     TEXT         AFTER mother_name,
  ADD COLUMN pin_code    VARCHAR(20)  AFTER address,
  ADD COLUMN mobile      VARCHAR(20)  AFTER pin_code,
  ADD COLUMN course_id   CHAR(36)     AFTER mobile,
  ADD COLUMN reference   VARCHAR(255) AFTER course_id;

-- Password reset tokens
ALTER TABLE profiles
  ADD COLUMN reset_token        VARCHAR(64) DEFAULT NULL AFTER password_hash,
  ADD COLUMN reset_token_expiry DATETIME    DEFAULT NULL AFTER reset_token;

-- Attempt limits per assignment
ALTER TABLE exam_assignments
  ADD COLUMN max_attempts INT NOT NULL DEFAULT 1 AFTER student_id;
