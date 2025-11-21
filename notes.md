Set user’s credits to 15:
SELECT admin_set_credits('805eeb44-6ff6-4c68-809d-bee3aad85fe', 15);

Give user 120 credits:
SELECT admin_set_credits('USER_UUID_HERE', 120);

Bulk (multiple users):
SELECT admin_set_credits(id, 15)
FROM public.users
WHERE email ILIKE '%gmail.com';


This will update each matching user + log history + return outputs.