# Railway GST Query Automation

This Sheet-bound Google Apps Script supports the portal's **Contact / Query** workflow.

## Google Form fields

Keep these questions in the linked Form. The script accepts common variations of the labels, but these names are recommended:

1. `Name` - required, short answer
2. `Division` - required, dropdown or short answer
3. `Email Address` - required; collecting verified email in Form settings is preferred
4. `Query Type` - required; Justification / Clarification / Missing HSN-SAC / Other
5. `HSN/SAC` - short answer
6. `Description of Query` - required, paragraph
7. `Supporting PDF` - required file upload; PDF only; maximum one file

Google Forms file upload requires the submitter to sign in. Configure the Form's upload question as PDF-only. The script performs an additional 5 MB check after submission and marks an oversize or invalid upload as `Attachment Review`.

## One-time installation

1. Open the linked response Sheet as its owner.
2. Choose **Extensions > Apps Script**.
3. Replace the editor contents with `Code.gs` from this folder.
4. In **Project Settings**, enable **Show appsscript.json manifest file in editor**, then replace the manifest with this folder's `appsscript.json`.
5. Save, select `setup` in the function menu, and click **Run**.
6. Approve the requested Spreadsheet, Drive, trigger and email permissions from the Sheet owner's Google account.
7. Submit one test response and confirm that the requester and `cpgramsingh@gmail.com` receive messages.

Running `setup()` again is safe: it replaces only this script's three owned triggers and leaves unrelated triggers untouched.

## Reviewer workflow

The script adds these columns if they do not already exist:

- `Request Number`
- `Status`
- `Assigned To`
- `Clarification / Answer`
- `Answered On`
- `Notification Sent`
- `Attachment Check`

For a completed review, enter the response in `Clarification / Answer`, optionally enter the reviewer in `Assigned To`, and set `Status` to `Answered`, `Closed`, or `Resolved`. The edit trigger sends the response immediately; a 15-minute scheduled trigger provides a fallback.

The request number is sent by email because Google Forms cannot place a row-specific generated number on its standard confirmation page.
