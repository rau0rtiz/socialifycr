UPDATE public.agency_proposals
SET html_content = replace(
      replace(html_content,
        'main{padding:26px 0 calc(190px + env(safe-area-inset-bottom));}',
        'main{padding:26px 0 calc(260px + env(safe-area-inset-bottom));}'),
      'background:linear-gradient(to top, var(--cream) 62%, rgba(246,241,232,0));',
      'background:linear-gradient(to top, var(--cream) 72%, rgba(246,241,232,0));')
WHERE kind = 'form' AND html_content LIKE '%__sformWizard%';