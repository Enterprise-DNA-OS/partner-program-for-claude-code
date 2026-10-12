#!/usr/bin/env node
// The one CLI. Every slash command in .claude/commands runs one of these.
//   npm run partners -- <command> [--field=value ...] [--json]
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
import {table} from './lib/format.mjs';

export const reads={
 'partners':['List partners with tier, state and revenue','select p.id,p.name,p.kind,p.country,t.name as tier,p.state,p.owner,r.revenue_12m,p.currency from partners p join tiers t on t.id=p.tier_id join partner_revenue r on r.id=p.id order by t.rank desc,p.name'],
 'tiers':['List the partner tiers and what each needs','select name,rank,min_revenue_nz,min_revenue_au,min_certified,discount_pct,mdf_pct,benefits from tiers order by rank'],
 'agreements':['List partner agreements','select a.id,p.name as partner,a.version,a.kind,a.starts,a.ends,a.signed_on,a.standard_form,a.terms_reviewed_on,a.document from agreements a join partners p on p.id=a.partner_id order by p.name,a.starts'],
 'registrations':['List every deal registration','select r.id,r.reference,p.name as partner,r.end_customer,r.value,p.currency,r.state,r.submitted_on,r.decided_by,r.expires_on,r.closed_on from registrations r join partners p on p.id=r.partner_id order by r.submitted_on desc'],
 'to-decide':['Registrations waiting on a decision, oldest first, with clashes','select * from registrations_to_decide order by days_waiting desc'],
 'conflicts':['Open registrations that clash with another partner or a direct account','select reference,partner,end_customer,state,clashes_with,other_party,matched_on from registration_conflicts order by end_customer,reference'],
 'expiring':['Approved registrations whose protection ends within 30 days, or has lapsed','select reference,partner,end_customer,value,currency,expires_on,days_left from registrations_expiring order by expires_on'],
 'pipeline':['Approved, open registrations by partner',"select p.name as partner,p.currency,count(*) as open_registrations,sum(r.value) as value,min(r.expires_on) as next_expiry from registrations r join partners p on p.id=r.partner_id where r.state='approved' and r.expires_on>=current_date group by p.name,p.currency order by value desc"],
 'win-rate':['Registrations closed in the last 12 months: won, lost, lapsed, days to win',"select p.name as partner,count(*) filter (where r.state='won') as won,count(*) filter (where r.state='lost') as lost,count(*) filter (where r.state='expired') as lapsed,round(100.0*count(*) filter (where r.state='won')/nullif(count(*),0),0) as win_pct,round(avg(r.closed_on-r.submitted_on) filter (where r.state='won'),0) as days_to_win,coalesce(sum(r.value) filter (where r.state='won'),0) as won_value from registrations r join partners p on p.id=r.partner_id where r.state in ('won','lost','expired') and coalesce(r.closed_on,r.expires_on)>current_date-365 group by p.name order by win_pct desc nulls last,p.name"],
 'tier-review':['Every active partner against its tier: below, at risk, eligible to move up','select partner,currency,current_tier,revenue_12m,certified_now,earns,status,detail,next_tier,revenue_to_next,certified_to_next from tier_status order by case status when \'Below tier\' then 1 when \'At risk in 60 days\' then 2 when \'Eligible to move up\' then 3 else 4 end,partner'],
 'certifications':['Certifications lapsing in the next 60 days, or lapsed in the last 90','select person,partner,certification,expires_on,days_left from certifications_expiring order by expires_on'],
 'mdf':['Market development funds: allocated, committed, paid and left','select partner,currency,period_end,days_left,allocated,committed,paid,available,pct_paid from mdf_position order by partner'],
 'mdf-queue':['MDF requests and claims waiting on someone','select reference,partner,activity,state,currency,amount,finding,days from mdf_queue order by days desc'],
 'mdf-return':['What MDF paid in the last 12 months returned: leads, pipeline, revenue',"select p.name as partner,p.currency,coalesce(sum(m.approved_amount),0) as mdf_paid,coalesce(sum(m.leads),0) as leads,coalesce(sum(m.pipeline),0) as pipeline,r.revenue_12m,round(r.revenue_12m/nullif(sum(m.approved_amount),0),1) as revenue_per_mdf_dollar from partners p join partner_revenue r on r.id=p.id join mdf_funds f on f.partner_id=p.id left join mdf_requests m on m.fund_id=f.id and m.state='paid' and m.paid_on>current_date-365 group by p.name,p.currency,r.revenue_12m order by revenue_per_mdf_dollar desc nulls last"],
 'partner-revenue':['Revenue by partner, last 12 months, and the share that came through a registration',"select partner,country,currency,revenue_12m,registered_12m,round(100*registered_12m/nullif(revenue_12m,0),0) as pct_registered,last_sale from partner_revenue where state<>'exited' order by revenue_12m desc"],
 'onboarding':['Onboarding partners and every step, done or not',"select p.name as partner,p.joined_on,s.step,s.due_on,s.done_on,case when s.done_on is not null then 'Done' when s.due_on<current_date then 'Overdue '||(current_date-s.due_on)||' days' else 'Due' end as status from onboarding_steps s join partners p on p.id=s.partner_id where p.state='onboarding' order by p.name,s.due_on"],
 'quiet-partners':['Active partners with no registration and no sale in the quiet window','select partner,kind,owner,last_registration,last_sale from quiet_partners order by partner'],
 'partner-watch':['Partners without a current signed agreement, or with one ending soon','select partner,state,issue,ends from partner_watch order by partner'],
 'compliance':['Check agreements and MDF payments against the cited rules','select rule,partner,record,issue from compliance_gaps order by rule,partner'],
 'attention':['What needs doing: decisions, clashes, lapsing protection, tiers, MDF, onboarding, agreements, rule checks',"select kind,partner,item,detail from (select 'decide' as kind,partner,reference as item,promise||', waiting '||days_waiting||' days'||case when conflicts<>'' then '; clashes with '||conflicts else '' end as detail from registrations_to_decide where promise='Overdue' or conflicts<>'' union all select 'protection',partner,reference,case when days_left<0 then 'Lapsed '||(-days_left)||' days ago, still approved' else 'Ends in '||days_left||' days' end from registrations_expiring where days_left<=14 union all select 'tier',partner,current_tier,status||': '||detail from tier_status where status<>'On tier' union all select 'certification',partner,person,certification||case when days_left<0 then ' lapsed '||(-days_left)||' days ago' else ' lapses in '||days_left||' days' end from certifications_expiring where days_left<=30 union all select 'mdf',partner,reference,finding from mdf_queue union all select 'onboarding',partner,step,'Overdue '||days_overdue||' days' from onboarding_stuck union all select 'agreement',partner,state,issue from partner_watch union all select 'rule',partner,record,rule||': '||issue from compliance_gaps union all select 'quiet',partner,kind,'No registration or sale since '||coalesce(greatest(last_registration,last_sale)::text,'they joined') from quiet_partners) x order by kind,partner,item"],
 'history':['Read the last 100 changes and who made them','select * from history order by created_at desc,id limit 100']
};
export const usage={
 partner:'--partner=...',registration:'--registration=...',search:'--text=...',
 add:'--type=partner|contact|certification|agreement|house-account|registration|sale|fund|mdf-request|step|tier --actor=... (fields: see README)',
 'approve-registration':'--registration=... --actor=... [--override-reason=... when it clashes]',
 'reject-registration':'--registration=... --reason=... --actor=...',
 'close-registration':'--registration=... --outcome=won|lost [--closed-on=YYYY-MM-DD] [--value=...] --actor=...',
 'extend-registration':'--registration=... --days=1-90 --reason=... --actor=...',
 'expire-registrations':'--actor=... (marks every approved registration past its protection date as lapsed)',
 'preapprove-mdf':'--request=... --actor=...',
 'claim-mdf':'--request=... --amount=... --proof=... [--tax-invoice=...] [--leads=n] [--pipeline=...] [--claimed-on=YYYY-MM-DD] --actor=...',
 'approve-claim':'--request=... [--amount=... up to the pre-approved amount] --actor=... (not whoever pre-approved it)',
 'pay-mdf':'--request=... --paid-on=YYYY-MM-DD --payment-ref=... [--tax-invoice=...] --actor=...',
 'tax-invoice':'--request=... --ref=... --actor=...',
 'reject-mdf':'--request=... --reason=... --actor=...',
 'set-tier':'--partner=... --tier=... --reason=... --actor=...',
 'complete-step':'--partner=... --step=... --actor=...',
 log:'--partner=... --note=... --actor=...',
 import:'impartner --object=partners|contacts|registrations --file=export.csv --actor=... [--mapping=file.json] [--date-format=ymd|dmy|mdy] [--dry-run]',
 export:'--out=exports/backup.json',
 'weekly-review':'Write the Monday partner review to drafts/',
 'draft-tier-letter':'--partner=... (a tier change or tier warning letter, to drafts/)',
 'draft-registration-reply':'--registration=... (the decision on a registration, to drafts/)',
 'draft-qbr':'--partner=... (a quarterly business review pack, to drafts/)',
 help:'Show commands'
};
export const commands=[...Object.keys(reads),...Object.keys(usage)];
const yn=['gst-registered','small-business','standard-form','primary'];
const allowed={partner:['partner'],registration:['registration'],search:['text'],
 add:['type','name','kind','country','tier','owner','state','region','business-number','gst-registered','small-business','partner','email','role','primary','contact','earned-on','expires-on','version','starts','ends','signed-on','document','standard-form','terms-reviewed-on','minimum-resale-price','domain','reference','customer','contact-name','description','value','expected-close','submitted-on','invoice','date','registration','period-start','period-end','allocated','activity','planned-on','amount','step','due-on','rank','min-revenue-nz','min-revenue-au','min-certified','discount','mdf','benefits','actor'],
 'approve-registration':['registration','override-reason','actor'],'reject-registration':['registration','reason','actor'],
 'close-registration':['registration','outcome','closed-on','value','actor'],'extend-registration':['registration','days','reason','actor'],
 'expire-registrations':['actor'],'preapprove-mdf':['request','actor'],
 'claim-mdf':['request','amount','proof','tax-invoice','leads','pipeline','claimed-on','actor'],'approve-claim':['request','amount','actor'],
 'pay-mdf':['request','paid-on','payment-ref','tax-invoice','actor'],'tax-invoice':['request','ref','actor'],'reject-mdf':['request','reason','actor'],
 'set-tier':['partner','tier','reason','actor'],'complete-step':['partner','step','actor'],log:['partner','note','actor'],
 import:['object','file','actor','mapping','date-format','dry-run'],export:['out'],
 'draft-tier-letter':['partner'],'draft-registration-reply':['registration'],'draft-qbr':['partner']};
const lookups={
 partner:['partners','name'],registration:['registrations',"reference||' '||end_customer"],request:['mdf_requests',"reference||' '||activity"],
 tier:['tiers','name'],contact:['contacts','name']
};
const allTables=['program','tiers','partners','contacts','certifications','agreements','house_accounts','registrations','sales','mdf_funds','mdf_requests','onboarding_steps','notes','history'];
const kinds=['reseller','msp','integrator','distributor','referral'];

function req(o,k){if(typeof o[k]!=='string'||!o[k].trim())throw Error(`Required --${k}`);return o[k].trim();}
function date(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw Error(`Expected a real YYYY-MM-DD date, got ${s}`);return s;}
function num(s,k,{min=-Infinity,int=false}={}){const n=Number(String(s).replace(/[$,\s]|NZD|AUD/gi,''));if(String(s).trim()===''||!Number.isFinite(n)||n<min||(int&&!Number.isInteger(n)))throw Error(`--${k} must be ${int?'a whole number':'a number'}${min>-Infinity?` of at least ${min}`:''}`);return n;}
function choice(s,a,k){if(!a.includes(s))throw Error(`--${k} must be one of: ${a.join(', ')}`);return s;}
function bool(s,k){const v=String(s).toLowerCase();if(['yes','true','y','1'].includes(v))return true;if(['no','false','n','0'].includes(v))return false;throw Error(`--${k} must be yes or no`);}
function parse(args){const o={};for(const arg of args.filter(x=>x.startsWith('--'))){const i=arg.indexOf('='),k=arg.slice(2,i<0?undefined:i);if(k in o)throw Error(`Duplicate --${k}`);o[k]=i<0?true:arg.slice(i+1);}return o;}
const today=()=>new Date().toISOString().slice(0,10);

// Exact name or id first, then a partial match. More than one match lists them and fails.
export async function resolve(db,type,value,lock=false){
 const [tableName,label]=lookups[type];
 const extra=type==='registration'||type==='request'?' or lower(reference)=lower($1)':'';
 let rows=await db.query(`select *,${label} as label from ${tableName} where lower(${label})=lower($1) or id::text=$1${extra} order by 1${lock?' for update':''}`,[value]);
 if(!rows.length)rows=await db.query(`select *,${label} as label from ${tableName} where strpos(lower(${label}),lower($1))>0 or starts_with(id::text,lower($1)) order by 1${lock?' for update':''}`,[value]);
 if(rows.length!==1)throw Error(`${type} ${rows.length?'is ambiguous':'not found'}: ${value}\n${rows.map(r=>`  ${r.id}  ${r.label}`).join('\n')||`  Run the ${type==='request'?'mdf-queue':type==='registration'?'registrations':type+'s'} command to see the list.`}`);
 return rows[0];
}
function render(rows){
 if(!Array.isArray(rows))return JSON.stringify(rows,null,2);
 if(!rows.length)return '  (none)';
 return table(rows,Object.keys(rows[0]).map(key=>({key,label:key,align:/^-?\d+(\.\d+)?$/.test(String(rows[0][key]??''))?'right':'left',format:v=>v&&typeof v==='object'?JSON.stringify(v):v})));
}
function draft(name,body){const dir=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`${name}-${today()}-${randomUUID().slice(0,8)}.md`);fs.writeFileSync(file,body,{flag:'wx'});return {file};}
const program=async db=>(await db.query('select * from program where id=1'))[0];

// Impartner: the partner, user and deal registration headings most exports carry. Anything else: --mapping.
const importers={
 partners:{table:'partners',fields:{source_id:['Id','Account Id','Partner Id'],name:['Name','Account Name','Partner Name','Company'],tier:['Partner Level','Partner Tier','Tier','Level'],country:['Country','Billing Country','BillingCountry'],kind:['Partner Type','Type'],owner:['Channel Manager','Partner Manager','Account Owner','Owner'],state:['Status','Partner Status']},required:['source_id','name']},
 contacts:{table:'contacts',fields:{source_id:['Id','User Id','Contact Id'],partner:['Account Id','Partner Id','Partner Account Id'],name:['Full Name','Name'],first:['First Name','FirstName'],last:['Last Name','LastName'],email:['Email','Email Address'],role:['Title','Job Title','Role']},required:['source_id','partner']},
 registrations:{table:'registrations',fields:{source_id:['Id','Deal Id','Deal Registration Id'],reference:['Deal Registration Number','Registration Number','Deal Number','Name'],partner:['Account Id','Partner Id','Partner Account Id'],customer:['Customer Company','End Customer','Customer Name','Company'],domain:['Customer Website','Website','Customer Domain'],value:['Amount','Deal Value','Deal Amount'],status:['Status','Registration Status','Stage'],submitted:['Submitted Date','Date Submitted','Created Date','CreatedDate'],expires:['Expiration Date','Expiry Date','Expires'],closed:['Close Date','Closed Date']},required:['source_id','reference','partner','customer','status','submitted']}
};
const countryOf=v=>{const s=String(v||'').trim().toLowerCase();if(['au','aus','australia'].includes(s))return 'AU';if(['nz','nzl','new zealand'].includes(s)||!s)return 'NZ';throw Error(`Unknown country ${v}; this version handles NZ and AU`);};
const kindOf=v=>{const s=String(v||'').trim().toLowerCase();if(/msp|managed/.test(s))return 'msp';if(/integrat|si\b|consult/.test(s))return 'integrator';if(/distrib/.test(s))return 'distributor';if(/referr|agent|influenc/.test(s))return 'referral';return 'reseller';};
const partnerStateOf=v=>{const s=String(v||'').trim().toLowerCase();if(!s||/^active|approved/.test(s))return 'active';if(/onboard|prospect|pending|applicant|new/.test(s))return 'onboarding';if(/suspend|inactive|on hold/.test(s))return 'suspended';if(/terminat|exit|closed|former/.test(s))return 'exited';throw Error(`Unknown partner status ${v}`);};
const regStateOf=v=>{const s=String(v||'').trim().toLowerCase();if(/closed.?won|^won/.test(s))return 'won';if(/closed.?lost|^lost/.test(s))return 'lost';if(/expir|lapse/.test(s))return 'expired';if(/reject|declin|denied/.test(s))return 'rejected';if(/approv|accept/.test(s))return 'approved';if(/pend|submit|new|review|open/.test(s))return 'submitted';throw Error(`Unknown registration status ${v}`);};
function importDate(v,fmt){
 const s=String(v||'').trim();if(!s)return null;
 if(/^\d{4}-\d{2}-\d{2}/.test(s))return date(s.slice(0,10));
 const m=s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
 if(m&&fmt!=='ymd'){const [d,mo]=fmt==='mdy'?[m[2],m[1]]:[m[1],m[2]];return date(`${m[3]}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`);}
 if(m)throw Error(`Date ${s} is not YYYY-MM-DD. Pass --date-format=dmy (NZ and AU) or --date-format=mdy (US)`);
 return date(s);
}

async function importImpartner(db,o){
 const spec=importers[choice(req(o,'object'),Object.keys(importers),'object')];
 const fmt=o['date-format']?choice(o['date-format'],['ymd','dmy','mdy'],'date-format'):'ymd';
 const rows=parseCsv(fs.readFileSync(path.resolve(req(o,'file')),'utf8'));if(!rows.length)throw Error('No rows in that file');
 const mapping=o.mapping?JSON.parse(fs.readFileSync(path.resolve(o.mapping),'utf8')):{};
 for(const [k,v] of Object.entries(mapping))if(!(k in spec.fields)||typeof v!=='string'||!v.trim())throw Error(`Mapping key ${k} is not a field of ${o.object}: ${Object.keys(spec.fields).join(', ')}`);
 const g=await program(db);const [lowest]=await db.query('select id,name from tiers order by rank limit 1');if(!lowest)throw Error('Add your tiers first: add --type=tier');
 const seen=new Set();let inserted=0,skipped=0;
 for(const [i,src] of rows.entries()){
  const v=Object.fromEntries(Object.keys(spec.fields).map(k=>[k,pick(src,...(mapping[k]?[mapping[k]]:spec.fields[k])).trim()]));
  for(const k of spec.required)if(!v[k])throw Error(`Row ${i+2}: no ${k}. Map the heading with --mapping`);
  const sourceId=`impartner:${v.source_id}`;if(seen.has(sourceId))throw Error(`Row ${i+2}: Id ${v.source_id} appears twice`);seen.add(sourceId);
  const [old]=await db.query(`select source_snapshot from ${spec.table} where source_id=$1`,[sourceId]);
  if(old){const snap=old.source_snapshot||{};if(Object.keys(snap).length!==Object.keys(src).length||Object.keys(src).some(k=>snap[k]!==src[k]))throw Error(`Row ${i+2}: ${v.source_id} changed since the last import. Reconcile it by hand; nothing was overwritten`);skipped++;continue;}
  const partnerOf=async()=>{const [p]=await db.query('select id from partners where source_id=$1',[`impartner:${v.partner}`]);if(!p)throw Error(`Row ${i+2}: partner ${v.partner} not imported yet. Import partners first`);return p.id;};
  if(o.object==='partners'){
   let tierId=lowest.id;if(v.tier){const [t]=await db.query('select id from tiers where lower(name)=lower($1)',[v.tier]);if(!t)throw Error(`Row ${i+2}: no tier called ${v.tier}. Add it with add --type=tier, or rename it in the file`);tierId=t.id;}
   await db.query('insert into partners(name,kind,country,tier_id,owner,state,source_id,source_snapshot) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb)',[v.name,kindOf(v.kind),countryOf(v.country),tierId,v.owner,partnerStateOf(v.state),sourceId,JSON.stringify(src)]);
  }else if(o.object==='contacts'){
   const name=v.name||[v.first,v.last].filter(Boolean).join(' ');if(!name)throw Error(`Row ${i+2}: no name. Map the heading with --mapping`);
   await db.query('insert into contacts(partner_id,name,email,role,source_id,source_snapshot) values($1,$2,$3,$4,$5,$6::jsonb)',[await partnerOf(),name,v.email,v.role,sourceId,JSON.stringify(src)]);
  }else{
   const state=regStateOf(v.status),submitted=importDate(v.submitted,fmt),closed=importDate(v.closed,fmt);
   let expires=importDate(v.expires,fmt);if(state==='approved'&&!expires)expires=new Date(Date.parse(submitted)+g.registration_days*864e5).toISOString().slice(0,10);
   await db.query('insert into registrations(partner_id,reference,end_customer,customer_domain,value,submitted_on,state,decided_on,decided_by,expires_on,closed_on,reason,source_id,source_snapshot) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)',
    [await partnerOf(),v.reference,v.customer,v.domain.replace(/^https?:\/\//i,'').replace(/^www\./i,'').replace(/\/.*$/,'').toLowerCase(),v.value?num(v.value,'value',{min:0}):0,submitted,state,
     state==='submitted'?null:submitted,state==='submitted'?null:'Impartner import',expires,['won','lost'].includes(state)?(closed||submitted):closed,state==='rejected'?'Rejected in Impartner (imported)':null,sourceId,JSON.stringify(src)]);
  }
  inserted++;
 }
 return {object:o.object,inserted,skipped,dry_run:!!o['dry-run'],note:'Ids are kept as impartner:<Id> so a repeat import skips what is already here. Tiers come across by name; certifications, agreements and MDF are entered with add, or mapped by Enterprise DNA.'};
}

async function addRecord(db,o){
 const type=choice(req(o,'type'),['partner','contact','certification','agreement','house-account','registration','sale','fund','mdf-request','step','tier'],'type');
 for(const k of yn)if(k in o)o[k]=bool(o[k],k);
 const P=async()=>(await resolve(db,'partner',req(o,'partner'))).id;let t,f;
 if(type==='partner'){t='partners';const tier=o.tier?await resolve(db,'tier',o.tier):(await db.query('select id from tiers order by rank limit 1'))[0];if(!tier)throw Error('Add a tier first');
  f={name:req(o,'name'),kind:choice(o.kind||'reseller',kinds,'kind'),country:choice(o.country||'NZ',['NZ','AU'],'country'),tier_id:tier.id,owner:o.owner||'',state:choice(o.state||'onboarding',['onboarding','active','suspended','exited'],'state'),region:o.region||'',business_number:o['business-number']||''};
  if('gst-registered' in o)f.gst_registered=o['gst-registered'];if('small-business' in o)f.small_business=o['small-business'];}
 else if(type==='contact'){t='contacts';f={partner_id:await P(),name:req(o,'name'),email:o.email||'',role:o.role||'',is_primary:!!o.primary};}
 else if(type==='certification'){t='certifications';f={contact_id:(await resolve(db,'contact',req(o,'contact'))).id,name:req(o,'name'),earned_on:date(req(o,'earned-on')),expires_on:date(req(o,'expires-on'))};}
 else if(type==='agreement'){t='agreements';f={partner_id:await P(),kind:choice(o.kind||'reseller',kinds,'kind'),version:o.version||'',starts:date(req(o,'starts')),ends:date(req(o,'ends'))};
  if(o['signed-on'])f.signed_on=date(o['signed-on']);if(o.document)f.document=o.document;if('standard-form' in o)f.standard_form=o['standard-form'];
  if(o['terms-reviewed-on'])f.terms_reviewed_on=date(o['terms-reviewed-on']);if(o['minimum-resale-price'])f.minimum_resale_price=o['minimum-resale-price'];}
 else if(type==='house-account'){t='house_accounts';f={name:req(o,'name'),domain:(o.domain||'').toLowerCase(),owner:o.owner||''};}
 else if(type==='registration'){t='registrations';f={partner_id:await P(),reference:req(o,'reference'),end_customer:req(o,'customer'),customer_domain:(o.domain||'').toLowerCase(),contact_name:o['contact-name']||'',description:o.description||'',value:o.value?num(o.value,'value',{min:0}):0,submitted_on:o['submitted-on']?date(o['submitted-on']):today()};
  if(o['expected-close'])f.expected_close=date(o['expected-close']);}
 else if(type==='sale'){t='sales';f={partner_id:await P(),invoice_no:req(o,'invoice'),invoice_date:date(req(o,'date')),end_customer:o.customer||'',value:num(req(o,'value'),'value')};
  if(o.registration){const r=await resolve(db,'registration',o.registration);if(r.partner_id!==f.partner_id)throw Error('That registration belongs to another partner');f.registration_id=r.id;}}
 else if(type==='fund'){t='mdf_funds';f={partner_id:await P(),period_start:date(req(o,'period-start')),period_end:date(req(o,'period-end')),allocated:num(req(o,'allocated'),'allocated',{min:0})};}
 else if(type==='mdf-request'){t='mdf_requests';const pid=await P(),planned=date(req(o,'planned-on'));
  const [fund]=await db.query('select id from mdf_funds where partner_id=$1 and $2::date between period_start and period_end',[pid,planned]);if(!fund)throw Error(`No MDF fund for that partner covers ${planned}. Add one with add --type=fund`);
  f={fund_id:fund.id,reference:req(o,'reference'),activity:req(o,'activity'),planned_on:planned,requested_amount:num(req(o,'amount'),'amount',{min:0.01})};}
 else if(type==='step'){t='onboarding_steps';f={partner_id:await P(),step:req(o,'step'),due_on:date(req(o,'due-on'))};}
 else{t='tiers';f={name:req(o,'name'),rank:num(req(o,'rank'),'rank',{min:1,int:true}),min_revenue_nz:o['min-revenue-nz']?num(o['min-revenue-nz'],'min-revenue-nz',{min:0}):0,min_revenue_au:o['min-revenue-au']?num(o['min-revenue-au'],'min-revenue-au',{min:0}):0,min_certified:o['min-certified']?num(o['min-certified'],'min-certified',{min:0,int:true}):0,discount_pct:o.discount?num(o.discount,'discount',{min:0}):0,mdf_pct:o.mdf?num(o.mdf,'mdf',{min:0}):0,benefits:o.benefits||''};}
 const k=Object.keys(f);return (await db.query(`insert into ${t}(${k.join(',')}) values(${k.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(f)))[0];
}

async function drafts(db,cmd,o){
 let body=`# ${cmd}\n\nDRAFT. Check it before anyone sees it. Nothing has been sent.\n\n`;
 if(cmd==='weekly-review'){for(const c of ['attention','to-decide','tier-review','mdf-queue'])body+=`## ${c}\n\n${render(await run(db,[c]))}\n\n`;return draft(cmd,body);}
 if(cmd==='draft-registration-reply'){
  const r=await resolve(db,'registration',req(o,'registration'));const [p]=await db.query('select name,currency from partners where id=$1',[r.partner_id]);
  const clashes=await db.query('select clashes_with,other_party from registration_conflicts where id=$1',[r.id]);
  body+=`To: ${p.name}\nSubject: Deal registration ${r.reference}, ${r.end_customer}\n\n`;
  if(r.state==='approved')body+=`Your registration ${r.reference} for ${r.end_customer} (${p.currency} ${r.value}) is approved. It is protected for you until ${r.expires_on}. If the deal needs longer, ask before that date with an update on where it stands.\n`;
  else if(r.state==='rejected')body+=`We cannot approve registration ${r.reference} for ${r.end_customer}. The reason: ${r.reason}.\n`;
  else if(r.state==='submitted')body+=`We have your registration ${r.reference} for ${r.end_customer}, submitted ${r.submitted_on}. ${clashes.length?'Another registration or a direct account already covers this customer, so we are checking the history before we decide.':'You will have a decision shortly.'}\n`;
  else body+=`Registration ${r.reference} for ${r.end_customer} is recorded as ${r.state}${r.closed_on?` on ${r.closed_on}`:''}.\n`;
  return draft(cmd,body);
 }
 const p=await resolve(db,'partner',req(o,'partner'));
 if(cmd==='draft-tier-letter'){
  const [s]=await db.query('select * from tier_status where id=$1',[p.id]);if(!s)throw Error(`${p.name} is not an active partner, so it has no tier review`);
  const [earned]=await db.query('select name,discount_pct,mdf_pct,benefits from tiers where name=$1',[s.earns]);
  body+=`To: ${p.name}\nSubject: Your partner tier\n\n`;
  if(s.status==='Eligible to move up')body+=`Over the last 12 months you brought in ${s.currency} ${s.revenue_12m} with ${s.certified_now} certified people, which meets every ${s.earns} requirement. Subject to approval, you move from ${s.current_tier} to ${s.earns}: ${earned.discount_pct}% partner discount, ${earned.mdf_pct}% of revenue as market development funds, and ${earned.benefits.toLowerCase()}.\n`;
  else if(s.status==='Below tier')body+=`At this review you sit below the ${s.current_tier} requirements: ${s.detail}. We would rather fix that with you than move your tier. Can we agree a plan before the next review?\n`;
  else if(s.status==='At risk in 60 days')body+=`Heads up before it matters: ${s.detail} for ${s.current_tier}. Renewing those certifications in the next 60 days keeps your tier where it is.\n`;
  else body+=`You are on track at ${s.current_tier}. ${s.next_tier?`To reach ${s.next_tier}: ${s.revenue_to_next>0?`${s.currency} ${s.revenue_to_next} more revenue`:'revenue already there'}${s.certified_to_next>0?` and ${s.certified_to_next} more certified people`:''}.`:''}\n`;
  return draft(cmd,body);
 }
 const sec=async(title,sql)=>{body+=`## ${title}\n\n${render(await db.query(sql,[p.id]))}\n\n`;};
 body+=`Quarterly business review: ${p.name}\n\n`;
 await sec('Tier','select current_tier,revenue_12m,certified_now,status,detail,next_tier,revenue_to_next,certified_to_next from tier_status where id=$1');
 await sec('Deal registrations, last 12 months',"select state,count(*) as registrations,sum(value) as value from registrations where partner_id=$1 and submitted_on>current_date-365 group by state order by state");
 await sec('Open registrations','select reference,end_customer,value,expires_on from registrations where partner_id=$1 and state=\'approved\' and expires_on>=current_date order by expires_on');
 await sec('Market development funds','select period_end,allocated,committed,paid,available from mdf_position where id in (select id from mdf_funds where partner_id=$1)');
 await sec('Certifications lapsing','select person,certification,expires_on,days_left from certifications_expiring where partner=(select name from partners where id=$1)');
 body+='Questions for the partner: what is in your pipeline we have not seen registered, what do you need from us to close it, and who is next to certify?\n';
 return draft(cmd,body);
}

export async function run(db,args){
 const cmd=args[0]||'help',o=parse(args.slice(1)),pos=args.slice(1).filter(x=>!x.startsWith('--'));
 if(!commands.includes(cmd))throw Error(`Unknown command: ${cmd}. Run help for the list`);
 for(const k of Object.keys(o))if(!['json',...(allowed[cmd]||[])].includes(k))throw Error(`Unknown --${k} for ${cmd}`);
 for(const k of ['json','dry-run'])if(k in o&&o[k]!==true)throw Error(`Use --${k} without a value`);
 if(pos.length&&!(cmd==='import'&&pos.length===1&&pos[0]==='impartner'))throw Error('Unexpected argument. Use --field=value');
 if(reads[cmd])return db.query(reads[cmd][1]);
 if(cmd==='help')return commands.map(command=>({command,usage:reads[command]?.[0]||usage[command]}));
 if(cmd==='search')return db.query("select 'partner' as kind,id,name from partners where strpos(lower(name),lower($1))>0 union all select 'contact',id,name from contacts where strpos(lower(name||' '||email),lower($1))>0 union all select 'registration',id,reference||' '||end_customer from registrations where strpos(lower(reference||' '||end_customer||' '||customer_domain||' '||description),lower($1))>0 union all select 'mdf',id,reference||' '||activity from mdf_requests where strpos(lower(reference||' '||activity),lower($1))>0 order by kind,name",[req(o,'text')]);
 if(cmd==='partner'){
  const p=await resolve(db,'partner',req(o,'partner'));delete p.label;delete p.source_snapshot;
  return {partner:p,tier:(await db.query('select * from tier_status where id=$1',[p.id]))[0]||null,
   people:await db.query("select c.name,c.role,c.email,(select string_agg(x.name||' to '||x.expires_on,', ' order by x.expires_on) from certifications x where x.contact_id=c.id and x.expires_on>=current_date) as certified from contacts c where c.partner_id=$1 order by c.is_primary desc,c.name",[p.id]),
   agreements:await db.query('select version,starts,ends,signed_on,document from agreements where partner_id=$1 order by starts',[p.id]),
   registrations:await db.query('select reference,end_customer,value,state,expires_on from registrations where partner_id=$1 order by submitted_on desc',[p.id]),
   mdf:await db.query('select m.reference,m.activity,m.state,m.requested_amount,m.approved_amount from mdf_requests m join mdf_funds f on f.id=m.fund_id where f.partner_id=$1 order by m.requested_on desc',[p.id]),
   notes:await db.query('select actor,body,created_at from notes where partner_id=$1 order by created_at desc',[p.id])};
 }
 if(cmd==='registration'){
  const r=await resolve(db,'registration',req(o,'registration'));delete r.label;delete r.source_snapshot;
  return {registration:r,partner:(await db.query('select name from partners where id=$1',[r.partner_id]))[0].name,conflicts:await db.query('select clashes_with,other_party,matched_on from registration_conflicts where id=$1',[r.id]),
   sales:await db.query('select invoice_no,invoice_date,value from sales where registration_id=$1 order by invoice_date',[r.id])};
 }
 if(cmd==='export'){
  const backup={format:'partner-program-backup-v1',exported_at:new Date().toISOString(),records:{}};
  await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');try{for(const t of allTables)backup.records[t]=await db.query(`select * from ${t} order by id`);await db.exec('COMMIT');}catch(e){await db.exec('ROLLBACK');throw e;}
  const file=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,req(o,'out'));fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(backup,null,2)+'\n',{flag:'wx'});
  return {file,counts:Object.fromEntries(Object.entries(backup.records).map(([k,v])=>[k,v.length]))};
 }
 if(cmd==='weekly-review'||cmd.startsWith('draft-'))return drafts(db,cmd,o);

 const actor=req(o,'actor');await db.exec('BEGIN');
 try{
  let row,result;
  if(cmd==='add')row=await addRecord(db,o);
  else if(cmd.endsWith('-registration')){
   const r=await resolve(db,'registration',req(o,'registration'),true);const g=await program(db);
   if(cmd==='approve-registration'){
    if(r.state!=='submitted')throw Error(`Registration is already ${r.state}`);
    const clashes=await db.query('select clashes_with,other_party from registration_conflicts where id=$1',[r.id]);
    if(clashes.length&&!o['override-reason'])throw Error(`Clashes with ${clashes.map(c=>`${c.clashes_with} (${c.other_party})`).join(', ')}. Reject it, or approve with --override-reason=...`);
    [row]=await db.query("update registrations set state='approved',decided_on=current_date,decided_by=$2,expires_on=current_date+$3::int,override_reason=$4 where id=$1 returning *",[r.id,actor,g.registration_days,o['override-reason']||null]);
   }else if(cmd==='reject-registration'){
    if(r.state!=='submitted')throw Error(`Registration is already ${r.state}`);
    [row]=await db.query("update registrations set state='rejected',decided_on=current_date,decided_by=$2,reason=$3 where id=$1 returning *",[r.id,actor,req(o,'reason')]);
   }else if(cmd==='close-registration'){
    if(r.state!=='approved')throw Error(`Only an approved registration can be closed; this one is ${r.state}`);
    const outcome=choice(req(o,'outcome'),['won','lost'],'outcome');
    [row]=await db.query('update registrations set state=$2,closed_on=$3,value=coalesce($4,value) where id=$1 returning *',[r.id,outcome,o['closed-on']?date(o['closed-on']):today(),o.value?num(o.value,'value',{min:0}):null]);
   }else{
    if(r.state!=='approved')throw Error(`Only an approved registration can be extended; this one is ${r.state}`);
    const days=num(req(o,'days'),'days',{min:1,int:true});if(days>90)throw Error('--days must be 90 or fewer. A longer hold is a new registration');
    [row]=await db.query("update registrations set expires_on=expires_on+$2::int,reason=concat_ws('; ',reason,$3::text) where id=$1 returning *",[r.id,days,`Extended ${days} days by ${actor}: ${req(o,'reason')}`]);
   }
  }else if(cmd==='expire-registrations'){
   const rows=await db.query("update registrations set state='expired' where state='approved' and expires_on<current_date returning reference,end_customer,expires_on");
   result={expired:rows.length,registrations:rows};
  }else if(['preapprove-mdf','claim-mdf','approve-claim','pay-mdf','tax-invoice','reject-mdf'].includes(cmd)){
   const m=await resolve(db,'request',req(o,'request'),true);
   if(cmd==='preapprove-mdf'){
    if(m.state!=='requested')throw Error(`Request is already ${m.state}`);
    const [f]=await db.query('select available,currency from mdf_position where id=$1',[m.fund_id]);
    if(Number(f.available)<Number(m.requested_amount))throw Error(`Only ${f.currency} ${f.available} is left in this fund; the request is for ${m.requested_amount}`);
    [row]=await db.query("update mdf_requests set state='pre-approved',preapproved_by=$2,preapproved_on=current_date where id=$1 returning *",[m.id,actor]);
   }else if(cmd==='claim-mdf'){
    if(m.state!=='pre-approved')throw Error(`Only a pre-approved request can be claimed; this one is ${m.state}`);
    [row]=await db.query("update mdf_requests set state='claimed',claimed_amount=$2,proof=$3,tax_invoice_ref=$4,leads=$5,pipeline=$6,claimed_on=$7 where id=$1 returning *",
     [m.id,num(req(o,'amount'),'amount',{min:0.01}),req(o,'proof'),o['tax-invoice']||null,o.leads?num(o.leads,'leads',{min:0,int:true}):null,o.pipeline?num(o.pipeline,'pipeline',{min:0}):null,o['claimed-on']?date(o['claimed-on']):today()]);
   }else if(cmd==='approve-claim'){
    if(m.state!=='claimed')throw Error(`Only a claimed request can be approved; this one is ${m.state}`);
    if(m.preapproved_by.toLowerCase()===actor.toLowerCase())throw Error('The claim must be approved by a different person from whoever pre-approved it');
    const amount=o.amount?num(o.amount,'amount',{min:0.01}):Number(m.claimed_amount);
    if(amount>Number(m.claimed_amount))throw Error(`Cannot approve more than was claimed (${m.claimed_amount})`);
    if(amount>Number(m.requested_amount))throw Error(`The claim is more than was pre-approved (${m.requested_amount}). Approve with --amount=${m.requested_amount} or less, or reject it`);
    [row]=await db.query("update mdf_requests set state='approved',approved_amount=$2,approved_by=$3 where id=$1 returning *",[m.id,amount,actor]);
   }else if(cmd==='pay-mdf'){
    if(m.state!=='approved')throw Error('Approve the claim before recording payment');
    [row]=await db.query("update mdf_requests set state='paid',paid_on=$2,payment_ref=$3,tax_invoice_ref=coalesce($4,tax_invoice_ref) where id=$1 returning *",[m.id,date(req(o,'paid-on')),req(o,'payment-ref'),o['tax-invoice']||null]);
   }else if(cmd==='tax-invoice'){
    if(!['claimed','approved','paid'].includes(m.state))throw Error('Record the tax invoice once the claim is in');
    [row]=await db.query('update mdf_requests set tax_invoice_ref=$2 where id=$1 returning *',[m.id,req(o,'ref')]);
   }else{
    if(!['requested','pre-approved','claimed'].includes(m.state))throw Error(`Request is already ${m.state}`);
    [row]=await db.query("update mdf_requests set state='rejected',reason=$2 where id=$1 returning *",[m.id,req(o,'reason')]);
   }
  }else if(cmd==='set-tier'){
   const p=await resolve(db,'partner',req(o,'partner'),true),t=await resolve(db,'tier',req(o,'tier'));
   if(p.tier_id===t.id)throw Error(`${p.name} is already ${t.name}`);const reason=req(o,'reason');
   const [from]=await db.query('select name from tiers where id=$1',[p.tier_id]);
   [row]=await db.query('update partners set tier_id=$2 where id=$1 returning *',[p.id,t.id]);
   result={partner:p.name,from:from.name,to:t.name,reason};
  }else if(cmd==='complete-step'){
   const p=await resolve(db,'partner',req(o,'partner'));
   const steps=await db.query('select * from onboarding_steps where partner_id=$1 and strpos(lower(step),lower($2))>0 for update',[p.id,req(o,'step')]);
   if(steps.length!==1)throw Error(`step ${steps.length?'is ambiguous':'not found'}: ${o.step}\n${steps.map(s=>'  '+s.step).join('\n')}`);
   if(steps[0].done_on)throw Error(`Already done on ${steps[0].done_on}`);
   [row]=await db.query('update onboarding_steps set done_on=current_date,done_by=$2 where id=$1 returning *',[steps[0].id,actor]);
  }else if(cmd==='log'){
   const p=await resolve(db,'partner',req(o,'partner'));[row]=await db.query('insert into notes(partner_id,actor,body) values($1,$2,$3) returning *',[p.id,actor,req(o,'note')]);
  }else if(cmd==='import'){
   if(pos[0]!=='impartner')throw Error('Use: import impartner --object=partners|contacts|registrations --file=...');result=await importImpartner(db,o);
  }
  if(row){delete row.label;delete row.source_snapshot;}
  await db.query('insert into history(actor,operation,record_id,detail) values($1,$2,$3,$4::jsonb)',[actor,cmd,row?.id||null,JSON.stringify(result||row)]);
  await db.exec(o['dry-run']?'ROLLBACK':'COMMIT');return result||row;
 }catch(e){await db.exec('ROLLBACK');throw e;}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 let db;try{db=await getDb();const data=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(data,null,2):render(data));}
 catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}
}
