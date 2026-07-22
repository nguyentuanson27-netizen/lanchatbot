import json
import sqlite3
import sys

database = sys.argv[1]
workflow_id = sys.argv[2]

connection = sqlite3.connect(f"file:{database}?mode=ro", uri=True)
try:
    rows = connection.execute(
        "SELECT id, status, startedAt, stoppedAt FROM execution_entity "
        "WHERE workflowId = ? ORDER BY id DESC LIMIT 10",
        (workflow_id,),
    ).fetchall()
finally:
    connection.close()

print(json.dumps([
    {"id": row[0], "status": row[1], "startedAt": row[2], "stoppedAt": row[3]}
    for row in rows
]))
