# Debug Session: signup-fetch-failure
- **Status**: [OPEN]
- **Issue**: Signup fails in the browser with a network fetch error.
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: .dbg/trae-debug-log-signup-fetch-failure.ndjson

## Reproduction Steps
1. Open the create-account page at the local frontend URL.
2. Enter valid account details.
3. Submit the signup form.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | The API is unavailable at the configured URL. | High | Low | Rejected |
| B | The API rejects the browser origin through CORS. | High | Low | Confirmed |
| C | The frontend API URL is stale or incorrect. | Medium | Low | Rejected |
| D | Registration fails after reaching the API due to database or SMTP configuration. | Medium | Medium | Pending |

## Log Evidence
The browser requested `http://localhost:5000/api/auth/register` from `http://localhost:8080` and failed before an HTTP response. Port 5000 accepts connections. The backend allowed only `http://localhost:3000`, confirming an origin mismatch.

## Verification Conclusion
Updated `FRONTEND_ORIGIN` to `http://localhost:8080`. The backend must restart before post-fix verification.
