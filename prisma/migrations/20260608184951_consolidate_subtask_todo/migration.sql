-- Migrate all Subtask records to Todo with NULL timeSpent
INSERT INTO Todo (id, title, isCompleted, timeSpent, createdAt, updatedAt, taskId)
SELECT id, title, isCompleted, NULL, createdAt, updatedAt, taskId FROM Subtask;

-- Drop the Subtask table
DROP TABLE Subtask;
