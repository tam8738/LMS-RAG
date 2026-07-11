# BE-07 Library API Test Cases

## Prerequisites

1. Start Docker services:

```bash
docker compose up -d
```

2. Run the seed script to create demo published documents:

```bash
# Copy seed script into postgres container
docker cp scripts/seed_demo_library.sql lms-rag-postgres:/tmp/seed_demo_library.sql

# Execute seed script
docker exec -i lms-rag-postgres psql -U postgres -d lms_rag -f /tmp/seed_demo_library.sql
```

3. Login as a Teacher to get JWT token:

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo.teacher@example.com","password":"123456"}'
```

Save the returned `access_token` into `TOKEN` env:

```bash
export TOKEN="<your-access-token>"
```

## Test Cases

### TC-01: List all published documents

```bash
curl -s "http://localhost:8080/api/v1/library" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:** 5 documents returned, all with `publicationStatus=PUBLISHED`.

---

### TC-02: Filter by subject (exact match)

```bash
curl -s "http://localhost:8080/api/v1/library?subject=C%C6%A1%20s%E1%BB%9F%20d%E1%BB%AF%20li%E1%BB%87u" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:** Only "Bài giảng Cơ sở dữ liệu" returned.

---

### TC-03: Filter by topic (partial match)

```bash
curl -s "http://localhost:8080/api/v1/library?topic=TCP" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:** Only "Bài giảng Mạng máy tính" returned.

---

### TC-04: Filter by chapter

```bash
curl -s "http://localhost:8080/api/v1/library?chapter=Ch%C6%B0%C6%A1ng%204" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:** Only "Bài giảng Trí tuệ nhân tạo" returned.

---

### TC-05: Search by `q` across title/description/subject/topic/chapter

```bash
curl -s "http://localhost:8080/api/v1/library?q=machine%20learning" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:** Only "Bài giảng Trí tuệ nhân tạo" returned (matches topic).

Try another:

```bash
curl -s "http://localhost:8080/api/v1/library?q=l%E1%BA%ADp%20tr%C3%ACnh" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:** "Bài giảng Lập trình hướng đối tượng" and "Bài giảng Phát triển Web" returned.

---

### TC-06: Filter by tags (comma-separated)

```bash
curl -s "http://localhost:8080/api/v1/library?tags=database" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:** Only "Bài giảng Cơ sở dữ liệu" returned.

Multiple tags (AND):

```bash
curl -s "http://localhost:8080/api/v1/library?tags=database,normalization" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:** Only "Bài giảng Cơ sở dữ liệu" returned.

No match:

```bash
curl -s "http://localhost:8080/api/v1/library?tags=database,oop" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:** Empty list (no document has both tags).

---

### TC-07: Filter by uploadedBy

First find the demo teacher user id:

```bash
curl -s "http://localhost:8080/api/v1/auth/me" \
  -H "Authorization: Bearer $TOKEN" | jq
```

Then filter by that id:

```bash
curl -s "http://localhost:8080/api/v1/library?uploadedBy=1" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:** 5 demo documents returned (or adjust id to match demo teacher).

---

### TC-08: Combined filters

```bash
curl -s "http://localhost:8080/api/v1/library?q=b%C3%A0i%20gi%E1%BA%A3ng&subject=L%E1%BA%ADp%20tr%C3%ACnh%20h%C6%B0%E1%BB%9Bng%20%C4%91%E1%BB%91i%20t%C6%B0%E1%BB%A3ng" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:** Only "Bài giảng Lập trình hướng đối tượng" returned.

---

### TC-09: Pagination

```bash
curl -s "http://localhost:8080/api/v1/library?size=2&page=0" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:** 2 documents, `totalElements=5`, `totalPages=3`.

---

### TC-10: Get library detail

Pick any published `documentId` from TC-01:

```bash
curl -s "http://localhost:8080/api/v1/library/1" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:** Document detail with `publicationStatus=PUBLISHED`.

---

### TC-11: Detail of non-published document should fail

Try a `DRAFT` document id (if exists):

```bash
curl -s "http://localhost:8080/api/v1/library/999" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:** 404 Not Found.

---

## Verification SQL

Check seeded documents directly in PostgreSQL:

```sql
SELECT id, title, subject, topic, chapter, tags, publication_status, uploaded_by
FROM documents
WHERE publication_status = 'PUBLISHED'
ORDER BY published_at DESC;
```
