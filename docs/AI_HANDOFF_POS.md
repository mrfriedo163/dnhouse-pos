# DN House POS - AI handoff

This project is the internal DN House POS at `app.giatsaycantho.vn`.

## Data source

Google Sheet: `DN house theo dõi doanh thu`

The POS syncs through `src/app/api/pos-sync/route.ts`, which forwards requests to the Google Apps Script webhook. The canonical Apps Script source is:

`docs/google-apps-script-pos.gs`

Whenever this file changes, paste the full content into Google Apps Script and deploy a new web app version.

## Sheet naming convention

- Real production orders go to `DATA_TMM_YYYY`, for example `DATA_T07_2026`.
- Admin demo/test orders go to `DEMO_TMM_YYYY`, for example `DEMO_T07_2026`.
- The script auto-creates the next monthly tab when a new month starts.
- Legacy data may still exist in `DON_HANG`.
- `HUONG_DAN_AI` explains the same rules inside the spreadsheet for future AI sessions.

## Declaration/accounting rules

For a real monthly declaration:

1. Use only the real monthly tab, e.g. `DATA_T07_2026`.
2. Exclude rows where `Trạng thái` is `Đã xóa`.
3. Exclude all `DEMO_*` tabs.
4. Revenue is column `J` / `Tổng thu`.
5. Discount is column `I` / `Giảm giá`.
6. Keep soft-deleted rows for audit; do not hard-delete unless the owner explicitly requests it.

## Realtime behavior

The web app is lightweight and does not use WebSocket/Supabase realtime for the demo POS screen.

It updates in two ways:

- BroadcastChannel/localStorage: instant sync across tabs on the same device.
- Google Sheet polling: every 10 seconds, the app calls `list_orders` via `/api/pos-sync` and merges updates from the current monthly tabs.

This is near-realtime and good enough for DN House's current workflow.

## Access behavior

- `admin` can enable demo mode and write test orders into `DEMO_TMM_YYYY`.
- `staff` cannot enable demo mode; their orders are real by default and go to `DATA_TMM_YYYY`.
- Both accounts currently use password `123456789`.
