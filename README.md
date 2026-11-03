# Agappe Medical Equipment Documentation Portal

## Deployment
1. Keep the repository structure unchanged.
2. Commit and push the contents of this folder to the GitHub repository.
3. In GitHub, open **Settings → Pages** and deploy from the `main` branch and `/ (root)` folder.
4. Open `https://<username>.github.io/<repository>/` to see the documentation home page.

## QR behavior
The admin dashboard generates one equipment QR URL in this format:
`https://<username>.github.io/<repository>/?id=<equipment-id>`

Scanning the QR opens the equipment portal, where all PDFs attached to that equipment are listed.

## Supabase requirements
- Keep the existing `equipment` and `equipment_documents` tables.
- Keep the existing `equipment-pdfs` storage bucket.
- The bucket must allow public reads if customers should open PDFs without signing in.
- Enable suitable Row Level Security policies. Public users should have read-only access to the intended equipment and document rows; only authorized administrators should be able to insert, update, or delete.
- Never put a Supabase `service_role` key in frontend code. The configured key must be a publishable/anon key.

## Files updated
- `index.html`: customer-facing portal and home state when no equipment ID is present.
- `css/style.css`: responsive customer portal styles; existing admin styles retained.
- `js/public.js`: equipment lookup, manual listing, view/download links and clearer errors.
- `js/admin.js`: equipment-level QR generation while retaining existing admin workflows.
- `admin.html`: updated QR description.
