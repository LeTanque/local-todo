ALTER TABLE todos
  ADD COLUMN description TEXT
    CHECK (description IS NULL OR char_length(trim(description)) BETWEEN 1 AND 1000);
