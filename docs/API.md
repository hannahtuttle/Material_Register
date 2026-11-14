# API Reference

## HTTP shape

**Base URL:** `http://localhost:3001`

Queries are HTTP GET requests with the input JSON-encoded in the `input` query parameter:

```
GET /trpc/materials.list?input=%7B%22page%22%3A2%2C%22pageSize%22%3A10%7D
```

Omitting `input` entirely applies all field defaults.

**Health check:** `GET /health` → `{ "status": "ok" }`

**Error shape:**

```json
{
  "error": {
    "message": "Something went wrong",
    "code": -32603,
    "data": {
      "code": "INTERNAL_SERVER_ERROR",
      "httpStatus": 500,
      "path": "materials.list",
      "requestId": "a1b2c3d4"
    }
  }
}
```

`data.requestId` matches the `X-Request-Id` response header and the server log line for the same request. `INTERNAL_SERVER_ERROR` messages are always replaced with `"Something went wrong"` before reaching the client. `BAD_REQUEST` messages include the Zod validation detail.

---

## Section template

## `<router>.<procedure>` (query | mutation)

**Input:** fields, defaults, limits (schema name in `packages/shared`)
**Returns:** shape
**Errors:** `BAD_REQUEST` on invalid input; `INTERNAL_SERVER_ERROR` (with `requestId`)
**Complexity:** time complexity and indexes used
**Example:**

```json
{}
```

---

## `materials.list` (query)

**Input:** `materialsListInput` from `packages/shared/src/materials.ts`

| field          | type                                                                                  | default            | constraint               |
| -------------- | ------------------------------------------------------------------------------------- | ------------------ | ------------------------ |
| `page`         | integer                                                                               | `1`                | ≥ 1                      |
| `pageSize`     | integer                                                                               | `25`               | one of `10, 25, 50, 100` |
| `search`       | string                                                                                | —                  | max 100 chars, optional  |
| `materialType` | `'Spare Part' \| 'Consumable' \| 'Raw Material' \| 'Tool'`                            | —                  | optional                 |
| `status`       | `'Active' \| 'Obsolete' \| 'Pending Review'`                                          | —                  | optional                 |
| `sortBy`       | `'materialNumber' \| 'description' \| 'unitPrice' \| 'quantityOnHand' \| 'updatedAt'` | `'materialNumber'` | —                        |
| `sortDir`      | `'asc' \| 'desc'`                                                                     | `'asc'`            | —                        |

**Returns:**

```ts
{
  items: {
    id: number;
    materialNumber: string;
    description: string;
    materialType: 'Spare Part' | 'Consumable' | 'Raw Material' | 'Tool';
    status: 'Active' | 'Obsolete' | 'Pending Review';
    manufacturerPartNumber: string;
    unitOfMeasure: string;
    unitPrice: string; // numeric string — format on the front end
    quantityOnHand: number;
    updatedAt: Date;
    plantCode: string; // joined from plants
    plantName: string;
    manufacturerName: string; // joined from manufacturers
  }
  [];
  total: number;
  page: number;
  pageSize: number;
}
```

**Errors:** `BAD_REQUEST` if `pageSize` is not one of `[10, 25, 50, 100]`, `page < 1`, or an enum value is invalid; `INTERNAL_SERVER_ERROR` (with `requestId`) on database failure

**Complexity:**

- `search`: `ILIKE '%term%'` on three columns — cannot use a btree index, sequential scan O(n). Fine at 5k rows; a `pg_trgm` GIN index would be the next step at scale.
- `materialType` / `status` filters: use the btree indexes `materials_material_type_idx` / `materials_status_idx` — O(matching rows).
- `sortBy`: each sort column has a btree index; sort still requires a scan over the matching rows.
- Count query: O(matching rows), runs in parallel with the page query.

**Example:**

```json
{
  "search": "bearing",
  "status": "Active",
  "sortBy": "unitPrice",
  "sortDir": "desc",
  "page": 1,
  "pageSize": 25
}
```

---
