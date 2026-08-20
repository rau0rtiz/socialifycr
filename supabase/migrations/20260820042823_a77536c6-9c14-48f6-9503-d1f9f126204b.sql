UPDATE public.agency_proposals
SET html_content = regexp_replace(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        html_content,
        'main\{padding:26px 0 calc\([0-9]+px \+ env\(safe-area-inset-bottom\)\);\}',
        'main{padding:26px 0 0;}',
        'g'
      ),
      '\.nav\{\s*position:fixed; left:0; right:0; bottom:0; z-index:30;\s*background:linear-gradient\(to top, var\(--cream\) 72%, rgba\(246,241,232,0\)\);\s*padding:22px 0 calc\(16px \+ env\(safe-area-inset-bottom\)\); pointer-events:none;\s*\}',
      '.nav{ position:relative; z-index:1; background:var(--cream); padding:16px 0 calc(28px + env(safe-area-inset-bottom)); }',
      'g'
    ),
    '\.navin\{pointer-events:auto;',
    '.navin{',
    'g'
  ),
  '\.nav\{\s*position:fixed; left:0; right:0; bottom:0; z-index:30;[^}]*\}',
  '.nav{ position:relative; z-index:1; background:var(--cream); padding:16px 0 calc(28px + env(safe-area-inset-bottom)); }',
  'g'
)
WHERE kind = 'form'
  AND html_content LIKE '%__sformWizard%';