UPDATE public.agency_proposals
SET html_content = replace(html_content, 'main{padding:26px 0 calc(120px', 'main{padding:26px 0 calc(190px')
WHERE kind = 'form' AND html_content LIKE '%main{padding:26px 0 calc(120px%';