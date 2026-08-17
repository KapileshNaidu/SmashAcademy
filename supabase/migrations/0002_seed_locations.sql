-- Optional starter locations so the app has somewhere to place students on day
-- one. Safe to skip, and safe to re-run — matching names are left untouched.
insert into public.locations (name, city_area, address, total_courts)
select v.name, v.city_area, v.address, v.total_courts
from (values
  ('North Hub - Court 1-4',  'Indiranagar', '100 Feet Road, Bengaluru 560038', 4),
  ('South Hub - Court 1-6',  'Jayanagar',   '4th Block, Bengaluru 560011',     6),
  ('East Arena - Court 1-3', 'Whitefield',  'ITPL Main Road, Bengaluru 560066', 3)
) as v(name, city_area, address, total_courts)
where not exists (
  select 1 from public.locations l where l.name = v.name
);
