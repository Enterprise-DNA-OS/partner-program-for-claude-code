-- Partner Program for Claude Code: partner tiers, partners and their people,
-- certifications, partner agreements, deal registrations, partner-sourced sales,
-- market development funds (MDF) and onboarding.
-- Amounts exclude GST and are in the partner's currency (NZD for NZ, AUD for AU).
create function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;

-- Lowercase, punctuation and company suffixes removed, so "Pilbara Haulage Group Pty Ltd" matches "Pilbara Haulage".
create function norm_name(t text) returns text language sql immutable as $$
 select trim(regexp_replace(regexp_replace(lower(regexp_replace(coalesce(t,''),'[^A-Za-z0-9 ]',' ','g')),'\m(ltd|limited|pty|group|inc|co|nz|au|the)\M','','g'),'\s+',' ','g'))
$$;

create table program (
 id int primary key default 1 check(id=1), name text not null default 'Partner program',
 registration_days int not null default 90 check(registration_days between 1 and 365),
 decision_days int not null default 2 check(decision_days between 0 and 30),
 claim_window_days int not null default 60 check(claim_window_days between 1 and 365),
 quiet_days int not null default 90 check(quiet_days between 7 and 730),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into program(id) values(1) on conflict do nothing;

create table tiers (
 id uuid primary key default gen_random_uuid(), name text not null unique check(length(trim(name))>0),
 rank int not null unique check(rank>0),
 min_revenue_nz numeric(14,2) not null default 0 check(min_revenue_nz>=0),
 min_revenue_au numeric(14,2) not null default 0 check(min_revenue_au>=0),
 min_certified int not null default 0 check(min_certified>=0),
 discount_pct numeric(5,2) not null default 0 check(discount_pct between 0 and 100),
 mdf_pct numeric(5,2) not null default 0 check(mdf_pct between 0 and 100),
 benefits text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table partners (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0),
 kind text not null default 'reseller' check(kind in ('reseller','msp','integrator','distributor','referral')),
 country text not null default 'NZ' check(country in ('NZ','AU')),
 currency text generated always as (case country when 'AU' then 'AUD' else 'NZD' end) stored,
 tier_id uuid not null references tiers(id), owner text not null default '',
 state text not null default 'onboarding' check(state in ('onboarding','active','suspended','exited')),
 joined_on date not null default current_date, region text not null default '', business_number text not null default '',
 gst_registered boolean not null default true, small_business boolean not null default true,
 source_id text unique, source_snapshot jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table contacts (
 id uuid primary key default gen_random_uuid(), partner_id uuid not null references partners(id),
 name text not null check(length(trim(name))>0), email text not null default '', role text not null default '',
 is_primary boolean not null default false, source_id text unique, source_snapshot jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table certifications (
 id uuid primary key default gen_random_uuid(), contact_id uuid not null references contacts(id),
 name text not null check(length(trim(name))>0), earned_on date not null, expires_on date not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(expires_on>earned_on), unique(contact_id,name,earned_on)
);
create table agreements (
 id uuid primary key default gen_random_uuid(), partner_id uuid not null references partners(id),
 kind text not null default 'reseller' check(kind in ('reseller','msp','integrator','distributor','referral')),
 version text not null default '', starts date not null, ends date not null, signed_on date, document text,
 standard_form boolean not null default true, terms_reviewed_on date, minimum_resale_price text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(ends>=starts)
);
create table house_accounts (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0),
 domain text not null default '', owner text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table registrations (
 id uuid primary key default gen_random_uuid(), partner_id uuid not null references partners(id),
 reference text not null unique, end_customer text not null check(length(trim(end_customer))>0),
 customer_domain text not null default '', contact_name text not null default '', description text not null default '',
 value numeric(14,2) not null default 0 check(value>=0), expected_close date,
 submitted_on date not null default current_date,
 state text not null default 'submitted' check(state in ('submitted','approved','rejected','won','lost','expired')),
 decided_on date, decided_by text, reason text, expires_on date, closed_on date, override_reason text,
 source_id text unique, source_snapshot jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(state='submitted' or decided_on is not null),
 check(state<>'approved' or expires_on is not null),
 check(state<>'rejected' or length(trim(reason))>0),
 check(state not in ('won','lost') or closed_on is not null)
);
create table sales (
 id uuid primary key default gen_random_uuid(), partner_id uuid not null references partners(id),
 registration_id uuid references registrations(id), invoice_no text not null, invoice_date date not null,
 end_customer text not null default '', value numeric(14,2) not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(partner_id,invoice_no)
);
create table mdf_funds (
 id uuid primary key default gen_random_uuid(), partner_id uuid not null references partners(id),
 period_start date not null, period_end date not null, allocated numeric(14,2) not null check(allocated>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(period_end>period_start), unique(partner_id,period_start)
);
create table mdf_requests (
 id uuid primary key default gen_random_uuid(), fund_id uuid not null references mdf_funds(id),
 reference text not null unique, activity text not null check(length(trim(activity))>0),
 planned_on date not null, requested_amount numeric(14,2) not null check(requested_amount>0),
 requested_on date not null default current_date,
 state text not null default 'requested' check(state in ('requested','pre-approved','claimed','approved','paid','rejected')),
 preapproved_by text, preapproved_on date,
 claimed_amount numeric(14,2) check(claimed_amount>0), claimed_on date, proof text, tax_invoice_ref text,
 leads int check(leads>=0), pipeline numeric(14,2) check(pipeline>=0),
 approved_amount numeric(14,2) check(approved_amount>0), approved_by text,
 paid_on date, payment_ref text, reason text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(state in ('requested','rejected') or preapproved_by is not null),
 check(state not in ('claimed','approved','paid') or (claimed_amount is not null and length(trim(proof))>0)),
 check(state not in ('approved','paid') or (approved_amount<=requested_amount and approved_by is not null and lower(approved_by)<>lower(preapproved_by))),
 check(state<>'paid' or (paid_on is not null and length(trim(payment_ref))>0)),
 check(state<>'rejected' or length(trim(reason))>0)
);
create table onboarding_steps (
 id uuid primary key default gen_random_uuid(), partner_id uuid not null references partners(id),
 step text not null check(length(trim(step))>0), due_on date not null, done_on date, done_by text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(partner_id,step)
);
create table notes (
 id uuid primary key default gen_random_uuid(), partner_id uuid not null references partners(id),
 actor text not null, body text not null check(length(trim(body))>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table history (
 id uuid primary key default gen_random_uuid(), actor text not null, operation text not null,
 record_id uuid, detail jsonb, created_at timestamptz not null default now()
);
do $$ declare t text; begin
 foreach t in array array['program','tiers','partners','contacts','certifications','agreements','house_accounts','registrations','sales','mdf_funds','mdf_requests','onboarding_steps','notes'] loop
  execute format('create trigger touch before update on %I for each row execute function touch_updated()',t);
 end loop;
end $$;
create index on registrations(partner_id); create index on sales(partner_id,invoice_date); create index on contacts(partner_id);

-- Revenue the partner brought in, the last 12 months.
create view partner_revenue as
select p.id, p.name as partner, p.country, p.currency, p.state,
 coalesce(sum(s.value) filter (where s.invoice_date>current_date-365),0) as revenue_12m,
 coalesce(sum(s.value) filter (where s.invoice_date>current_date-365 and s.registration_id is not null),0) as registered_12m,
 max(s.invoice_date) as last_sale
from partners p left join sales s on s.partner_id=p.id group by p.id;

-- People at each partner holding at least one certification that is current today, and in 60 days.
create view partner_certified as
select p.id, count(distinct c.id) filter (where x.expires_on>=current_date) as certified_now,
 count(distinct c.id) filter (where x.expires_on>=current_date+60) as certified_in_60
from partners p left join contacts c on c.partner_id=p.id left join certifications x on x.contact_id=c.id group by p.id;

create view tier_status as
with b as (
 select p.id, p.name as partner, p.country, p.currency, t.name as current_tier, t.rank as current_rank,
  case p.country when 'AU' then t.min_revenue_au else t.min_revenue_nz end as tier_min_revenue, t.min_certified as tier_min_certified,
  r.revenue_12m, c.certified_now, c.certified_in_60
 from partners p join tiers t on t.id=p.tier_id join partner_revenue r on r.id=p.id join partner_certified c on c.id=p.id where p.state='active'
), q as (
 select b.*,
  (select t2.rank from tiers t2 where (case b.country when 'AU' then t2.min_revenue_au else t2.min_revenue_nz end)<=b.revenue_12m and t2.min_certified<=b.certified_now order by t2.rank desc limit 1) as earned_rank,
  (select t2.rank from tiers t2 where (case b.country when 'AU' then t2.min_revenue_au else t2.min_revenue_nz end)<=b.revenue_12m and t2.min_certified<=b.certified_in_60 order by t2.rank desc limit 1) as rank_in_60
 from b
)
select q.id, q.partner, q.currency, q.current_tier, q.revenue_12m, q.certified_now, e.name as earns,
 case when q.earned_rank>q.current_rank then 'Eligible to move up' when q.earned_rank<q.current_rank then 'Below tier'
  when q.rank_in_60<q.current_rank then 'At risk in 60 days' else 'On tier' end as status,
 case when q.earned_rank>q.current_rank then 'Meets every '||e.name||' requirement'
  when q.earned_rank<q.current_rank then concat_ws('; ',case when q.revenue_12m<q.tier_min_revenue then q.currency||' '||(q.tier_min_revenue-q.revenue_12m)||' more revenue needed' end,case when q.certified_now<q.tier_min_certified then (q.tier_min_certified-q.certified_now)||' more certified '||case when q.tier_min_certified-q.certified_now=1 then 'person' else 'people' end||' needed' end)
  when q.rank_in_60<q.current_rank then (q.certified_now-q.certified_in_60)||' of '||q.certified_now||' certified people lapse within 60 days; '||q.current_tier||' needs '||q.tier_min_certified
  else '' end as detail,
 n.name as next_tier,
 case when n.id is not null then greatest((case q.country when 'AU' then n.min_revenue_au else n.min_revenue_nz end)-q.revenue_12m,0) end as revenue_to_next,
 case when n.id is not null then greatest(n.min_certified-q.certified_now,0) end as certified_to_next
from q left join tiers e on e.rank=q.earned_rank
left join lateral (select * from tiers t3 where t3.rank>q.current_rank order by t3.rank limit 1) n on true;

-- Open registrations that clash with another partner's open registration or a direct (house) account.
create view registration_conflicts as
select r.id, r.reference, p.name as partner, r.end_customer, r.state, o.reference as clashes_with, op.name as other_party,
 case when r.customer_domain<>'' and lower(o.customer_domain)=lower(r.customer_domain) then 'Same website' else 'Same customer name' end as matched_on
from registrations r join partners p on p.id=r.partner_id
join registrations o on o.id<>r.id and o.partner_id<>r.partner_id and o.state in ('submitted','approved') and (o.expires_on is null or o.expires_on>=current_date)
 and ((r.customer_domain<>'' and lower(o.customer_domain)=lower(r.customer_domain)) or norm_name(o.end_customer)=norm_name(r.end_customer))
join partners op on op.id=o.partner_id
where r.state in ('submitted','approved') and (r.expires_on is null or r.expires_on>=current_date)
union all
select r.id, r.reference, p.name, r.end_customer, r.state, 'Direct account', h.name||' ('||h.owner||')',
 case when r.customer_domain<>'' and lower(h.domain)=lower(r.customer_domain) then 'Same website' else 'Same customer name' end
from registrations r join partners p on p.id=r.partner_id
join house_accounts h on (r.customer_domain<>'' and lower(h.domain)=lower(r.customer_domain)) or norm_name(h.name)=norm_name(r.end_customer)
where r.state in ('submitted','approved') and (r.expires_on is null or r.expires_on>=current_date);

create view registrations_to_decide as
select r.id, r.reference, p.name as partner, r.end_customer, p.currency, r.value, r.submitted_on, current_date-r.submitted_on as days_waiting,
 case when current_date-r.submitted_on>g.decision_days then 'Overdue' else 'Within '||g.decision_days||' days' end as promise,
 coalesce((select string_agg(c.clashes_with||' ('||c.other_party||')',', ' order by c.clashes_with) from registration_conflicts c where c.id=r.id),'') as conflicts
from registrations r join partners p on p.id=r.partner_id cross join program g where r.state='submitted';

create view registrations_expiring as
select r.id, r.reference, p.name as partner, r.end_customer, p.currency, r.value, r.decided_on, r.expires_on, r.expires_on-current_date as days_left
from registrations r join partners p on p.id=r.partner_id where r.state='approved' and r.expires_on<=current_date+30;

create view certifications_expiring as
select x.id, c.name as person, p.name as partner, x.name as certification, x.expires_on, x.expires_on-current_date as days_left
from certifications x join contacts c on c.id=x.contact_id join partners p on p.id=c.partner_id
where p.state in ('active','onboarding') and x.expires_on<=current_date+60 and x.expires_on>=current_date-90
 and not exists (select 1 from certifications y where y.contact_id=x.contact_id and y.name=x.name and y.expires_on>x.expires_on);

create view mdf_position as
select f.id, p.name as partner, p.currency, f.period_start, f.period_end, f.period_end-current_date as days_left, f.allocated,
 coalesce(sum(case m.state when 'pre-approved' then m.requested_amount when 'claimed' then least(m.claimed_amount,m.requested_amount) when 'approved' then m.approved_amount end),0) as committed,
 coalesce(sum(m.approved_amount) filter (where m.state='paid'),0) as paid,
 f.allocated-coalesce(sum(case m.state when 'pre-approved' then m.requested_amount when 'claimed' then least(m.claimed_amount,m.requested_amount) when 'approved' then m.approved_amount when 'paid' then m.approved_amount end),0) as available,
 round(100*coalesce(sum(m.approved_amount) filter (where m.state='paid'),0)/nullif(f.allocated,0),1) as pct_paid
from mdf_funds f join partners p on p.id=f.partner_id left join mdf_requests m on m.fund_id=f.id group by f.id,p.name,p.currency;

create view mdf_queue as
select m.id, m.reference, p.name as partner, m.activity, m.state, p.currency,
 case m.state when 'requested' then m.requested_amount when 'pre-approved' then m.requested_amount when 'claimed' then m.claimed_amount else m.approved_amount end as amount,
 case when m.state='requested' then 'Decide pre-approval'
  when m.state='pre-approved' then 'Claim overdue: activity was '||(current_date-m.planned_on)||' days ago'
  when m.state='claimed' and m.claimed_amount>m.requested_amount then 'Claims more than pre-approved ('||m.requested_amount||')'
  when m.state='claimed' then 'Ready to approve'
  else 'Ready to pay' end as finding,
 case m.state when 'requested' then current_date-m.requested_on when 'pre-approved' then current_date-m.planned_on when 'claimed' then current_date-m.claimed_on else current_date-m.claimed_on end as days
from mdf_requests m join mdf_funds f on f.id=m.fund_id join partners p on p.id=f.partner_id cross join program g
where m.state in ('requested','claimed','approved') or (m.state='pre-approved' and m.planned_on<current_date-g.claim_window_days);

create view onboarding_stuck as
select s.id, p.name as partner, s.step, s.due_on, current_date-s.due_on as days_overdue, p.joined_on
from onboarding_steps s join partners p on p.id=s.partner_id where p.state='onboarding' and s.done_on is null and s.due_on<current_date;

create view quiet_partners as
select p.id, p.name as partner, p.kind, p.owner, (select max(r.submitted_on) from registrations r where r.partner_id=p.id) as last_registration, v.last_sale
from partners p join partner_revenue v on v.id=p.id cross join program g
where p.state='active' and coalesce((select max(r.submitted_on) from registrations r where r.partner_id=p.id),'1900-01-01')<current_date-g.quiet_days
 and coalesce(v.last_sale,'1900-01-01')<current_date-g.quiet_days;

-- Agreements: every active or onboarding partner needs a signed agreement covering today.
create view partner_watch as
select p.id, p.name as partner, p.state, 'No current signed agreement' as issue, null::date as ends
from partners p where p.state in ('active','onboarding') and not exists (select 1 from agreements a where a.partner_id=p.id and a.signed_on is not null and current_date between a.starts and a.ends)
union all
select p.id, p.name, p.state, 'Agreement ends in '||(a.ends-current_date)||' days', a.ends
from agreements a join partners p on p.id=a.partner_id
where p.state='active' and a.signed_on is not null and a.ends between current_date and current_date+60
 and not exists (select 1 from agreements b where b.partner_id=p.id and b.id<>a.id and b.starts>a.starts and b.ends>a.ends);

-- The rules in docs/compliance.md. Prompts for a person to check, not legal or tax advice.
create view compliance_gaps as
select 'RPM-MIN-PRICE' as rule, p.name as partner, coalesce(nullif(a.version,''),a.kind||' agreement') as record,
 'Clause sets a minimum resale price: '||a.minimum_resale_price as issue
from agreements a join partners p on p.id=a.partner_id where a.ends>=current_date and length(trim(coalesce(a.minimum_resale_price,'')))>0
union all
select case p.country when 'AU' then 'UNFAIR-TERMS-AU' else 'UNFAIR-TERMS-NZ' end, p.name, coalesce(nullif(a.version,''),a.kind||' agreement'),
 'Standard form agreement with a small business partner; terms not reviewed since '||case p.country when 'AU' then '9 November 2023' else '16 August 2022' end
from agreements a join partners p on p.id=a.partner_id
where a.ends>=current_date and a.standard_form and p.small_business and p.state<>'exited'
 and (a.terms_reviewed_on is null or a.terms_reviewed_on<case p.country when 'AU' then date '2023-11-09' else date '2022-08-16' end)
union all
select 'GST-TAX-INVOICE', p.name, m.reference,
 'MDF of '||p.currency||' '||m.approved_amount||' paid '||m.paid_on||' to a GST-registered partner with no tax invoice on file'
from mdf_requests m join mdf_funds f on f.id=m.fund_id join partners p on p.id=f.partner_id
where m.state='paid' and p.gst_registered and coalesce(trim(m.tax_invoice_ref),'')=''
 and ((p.country='AU' and m.approved_amount*1.10>82.50) or (p.country='NZ' and m.approved_amount*1.15>200));
