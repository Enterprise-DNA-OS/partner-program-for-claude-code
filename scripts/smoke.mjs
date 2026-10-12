// npm test: a temporary database, migrate twice, seed twice, then every command.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {run,commands,reads} from './partners.mjs';
import {parseCsv} from './lib/csv.mjs';
import {page,table as htmlTable} from './lib/render.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'partners-test-'));
process.env.DATA_DIR=path.join(temp,'db');process.env.OUTPUT_DIR=temp;
// Ignore real credentials; PostgreSQL CI supplies a disposable database.
process.env.DATABASE_URL=process.env.TEST_DATABASE_URL||'';
const db=await getDb(),seen=new Set();let rejections=0;
const call=async(cmd,...flags)=>{seen.add(cmd);return run(db,[cmd,...flags]);};
const fails=async(cmd,flags,pattern)=>{seen.add(cmd);await assert.rejects(()=>run(db,[cmd,...flags]),pattern);rejections++;};
const ben='--actor=Ben',aroha='--actor=Aroha';
const today=new Date().toISOString().slice(0,10);
try{
 if(db.mode==='postgres'){const [r]=await db.query("select count(*)::int as n from information_schema.tables where table_schema='public' and table_type='BASE TABLE'");assert.equal(r.n,0,'TEST_DATABASE_URL must point at a fresh empty database');}
 await migrate(db);assert.equal((await migrate(db)).ran.length,0);
 const seed=fs.readFileSync(path.join(REPO_ROOT,'supabase/seed.sql'),'utf8');await db.exec(seed);await db.exec(seed);
 for(const cmd of Object.keys(reads))assert.ok(Array.isArray(await call(cmd)),cmd);
 assert.equal((await call('help')).length,commands.length);
 assert.equal((await call('partners')).length,6);

 // The tier review: each status from the demo data, checked against the tier rules.
 const tiers=Object.fromEntries((await call('tier-review')).map(r=>[r.partner,r]));
 assert.equal(tiers['Kauri IT Solutions'].status,'Below tier');assert.match(tiers['Kauri IT Solutions'].detail,/1 more certified person/);
 assert.equal(Number(tiers['Kauri IT Solutions'].revenue_12m),340000,'the sale 500 days ago is outside the 12 months');
 assert.equal(tiers['Harbour Digital'].status,'At risk in 60 days');
 assert.equal(tiers['Outback Networks'].status,'Eligible to move up');assert.equal(tiers['Outback Networks'].earns,'Silver');
 assert.equal(tiers['Southern Cross Systems'].status,'On tier');assert.equal(Number(tiers['Southern Cross Systems'].revenue_to_next),115000);
 assert.equal(tiers['Kauri IT Solutions'].next_tier,null);
 assert.ok(!('Coral Coast Tech' in tiers),'onboarding partners are not reviewed');

 // Clashes: same website across partners, and a partner on a direct account.
 assert.deepEqual((await call('conflicts')).map(c=>c.reference).sort(),['HD-0093','KIT-0412','ON-0021']);
 assert.equal((await call('to-decide')).find(r=>r.reference==='SCS-1187').promise,'Overdue');
 assert.deepEqual((await call('expiring')).map(r=>r.reference),['HD-0071','KIT-0412']);
 assert.deepEqual((await call('compliance')).map(r=>r.rule).sort(),['GST-TAX-INVOICE','RPM-MIN-PRICE','UNFAIR-TERMS-AU','UNFAIR-TERMS-NZ']);
 assert.deepEqual((await call('partner-watch')).map(r=>r.partner).sort(),['Coral Coast Tech','Southern Cross Systems','Tasman Referral Partners']);
 assert.equal((await call('quiet-partners'))[0].partner,'Tasman Referral Partners');
 assert.equal((await call('certifications')).length,2);
 const fund=(await call('mdf')).find(f=>f.partner==='Kauri IT Solutions');
 assert.equal(Number(fund.available),12000-4000-2950);
 assert.equal((await call('mdf-queue')).find(m=>m.reference==='SCS-MDF-01').finding,'Claims more than pre-approved (2500.00)');
 assert.equal(Number((await call('mdf-return')).find(r=>r.partner==='Kauri IT Solutions').revenue_per_mdf_dollar),115.3);
 assert.equal(Number((await call('win-rate')).find(r=>r.partner==='Kauri IT Solutions').days_to_win),60);
 assert.ok((await call('attention')).length>=20);

 // Lookups: case-insensitive names, references, partial ids, ambiguity lists the candidates.
 assert.equal((await call('partner','--partner=kauri it solutions')).people.length,4);
 assert.equal((await call('registration','--registration=kit-0412')).conflicts.length,1);
 await fails('partner',['--partner=a0000000'],/ambiguous[\s\S]*a0000000-0000-0000-0000-000000000001/);
 await fails('partner',['--partner=Nobody'],/not found/);
 assert.ok((await call('search','--text=waitemata')).length>=2);

 // Bad input is refused before anything is written.
 await fails('approve-registration',['--registration=SCS-1187'],/Required --actor/);
 await fails('approve-registration',['--registration=SCS-1187',ben,'--typo=1'],/Unknown --typo/);
 await fails('add',['--type=registration','--partner=Harbour Digital','--reference=X-1','--customer=X','--submitted-on=2026-02-30',ben],/real YYYY/);
 await fails('add',['--type=widget',ben],/must be one of/);

 // Registrations: approve, refuse a clash without a reason, override with one, reject, extend, close, lapse.
 const a=await call('approve-registration','--registration=SCS-1187',ben);
 assert.equal(a.state,'approved');assert.equal(a.decided_by,'Ben');
 assert.equal((Date.parse(a.expires_on)-Date.parse(today))/864e5,90);
 await fails('approve-registration',['--registration=SCS-1187',ben],/already approved/);
 await fails('approve-registration',['--registration=HD-0093',ben],/Clashes with KIT-0412[\s\S]*override-reason/);
 await fails('reject-registration',['--registration=HD-0093',ben],/Required --reason/);
 await call('reject-registration','--registration=HD-0093','--reason=Kauri IT Solutions registered this customer first and is still protected',aroha);
 const o=await call('approve-registration','--registration=ON-0021','--override-reason=Mere agreed Outback leads the Pilbara depots; direct keeps head office',aroha);
 assert.match(o.override_reason,/Mere agreed/);
 await fails('extend-registration',['--registration=KIT-0412','--days=120','--reason=x',ben],/90 or fewer/);
 const e=await call('extend-registration','--registration=KIT-0412','--days=30','--reason=Board decision moved to next month',ben);
 assert.match(e.reason,/Extended 30 days by Ben/);
 await fails('close-registration',['--registration=HD-0093','--outcome=won',ben],/Only an approved/);
 await fails('close-registration',['--registration=KIT-0420','--outcome=maybe',ben],/must be one of/);
 assert.equal((await call('close-registration','--registration=KIT-0420','--outcome=won','--value=42000',ben)).state,'won');
 const lapsed=await call('expire-registrations',ben);assert.equal(lapsed.expired,1);assert.equal(lapsed.registrations[0].reference,'HD-0071');
 assert.equal((await call('expire-registrations',ben)).expired,0);
 assert.deepEqual((await call('conflicts')).map(c=>c.reference),['ON-0021'],'the rejected clash clears; the override stays visible');

 // MDF: pre-approve within the fund, claim with proof, a second person approves, pay, then the tax invoice.
 await fails('claim-mdf',['--request=HD-MDF-01','--amount=100','--proof=x',ben],/Only a pre-approved/);
 await call('preapprove-mdf','--request=HD-MDF-01',ben);
 await fails('claim-mdf',['--request=HD-MDF-01','--amount=1400',ben],/Required --proof/);
 await call('claim-mdf','--request=HD-MDF-01','--amount=1400','--proof=Restaurant invoice and guest list','--leads=9','--pipeline=55000',ben);
 await fails('approve-claim',['--request=HD-MDF-01',ben],/different person/);
 await fails('approve-claim',['--request=HD-MDF-01','--amount=1450',aroha],/more than was claimed/);
 await call('approve-claim','--request=HD-MDF-01',aroha);
 await fails('pay-mdf',['--request=SCS-MDF-01',`--paid-on=${today}`,'--payment-ref=EFT-1',ben],/Approve the claim/);
 await fails('approve-claim',['--request=SCS-MDF-01',aroha],/more than was pre-approved \(2500\.00\)/);
 assert.equal(Number((await call('approve-claim','--request=SCS-MDF-01','--amount=2500',aroha)).approved_amount),2500);
 await call('pay-mdf','--request=HD-MDF-01',`--paid-on=${today}`,'--payment-ref=EFT-6001','--tax-invoice=HD-TI-0007',ben);
 await call('pay-mdf','--request=SCS-MDF-01',`--paid-on=${today}`,'--payment-ref=EFT-6002',ben);
 await call('reject-mdf','--request=KIT-MDF-02','--reason=No claim within 60 days of the activity',ben);
 await fails('reject-mdf',['--request=KIT-MDF-02','--reason=again',ben],/already rejected/);
 await call('tax-invoice','--request=SCS-MDF-02','--ref=SCS-TI-0150',ben);
 assert.ok(!(await call('compliance')).some(r=>r.record==='SCS-MDF-02'),'the tax invoice clears the GST check');
 await call('add','--type=fund','--partner=Coral Coast Tech',`--period-start=${today}`,'--period-end=2099-12-31','--allocated=500',ben);
 await call('add','--type=mdf-request','--partner=Coral Coast Tech','--reference=CCT-MDF-01','--activity=Launch lunch',`--planned-on=${today}`,'--amount=800',ben);
 await fails('preapprove-mdf',['--request=CCT-MDF-01',ben],/Only AUD 500\.00 is left/);
 await fails('add',['--type=mdf-request','--partner=Harbour Digital','--reference=HD-X','--activity=x','--planned-on=1999-01-01','--amount=1',ben],/No MDF fund/);

 // Partners, people, tiers, onboarding, agreements.
 const p=await call('add','--type=partner','--name=Test Partner Ltd','--country=AU','--kind=msp','--small-business=no',ben);
 assert.equal(p.currency,'AUD');assert.equal(p.small_business,false);
 await fails('add',['--type=partner','--name=Bad','--gst-registered=maybe',ben],/yes or no/);
 await call('add','--type=contact','--partner=Test Partner Ltd','--name=Test Person','--primary=yes',ben);
 await call('add','--type=certification','--contact=Test Person','--name=Certified Implementer',`--earned-on=${today}`,'--expires-on=2099-01-01',ben);
 await call('add','--type=agreement','--partner=Test Partner Ltd','--version=MSP v1',`--starts=${today}`,'--ends=2099-01-01',`--signed-on=${today}`,`--terms-reviewed-on=${today}`,ben);
 await call('add','--type=house-account','--name=Test Direct Co','--domain=TESTDIRECT.example','--owner=Mere',ben);
 await call('add','--type=registration','--partner=Test Partner Ltd','--reference=TP-1','--customer=Test Direct Co','--value=$5,000',ben);
 assert.equal((await call('to-decide')).find(r=>r.reference==='TP-1').conflicts,'Direct account (Test Direct Co (Mere))');
 await call('add','--type=sale','--partner=Test Partner Ltd','--invoice=TP-INV-1',`--date=${today}`,'--value=95000',ben);
 await fails('add',['--type=sale','--partner=Test Partner Ltd','--invoice=TP-INV-2',`--date=${today}`,'--value=1','--registration=KIT-0412',ben],/another partner/);
 await call('add','--type=tier','--name=Platinum','--rank=4','--min-revenue-nz=600000','--min-revenue-au=540000','--min-certified=6','--discount=35','--mdf=5',ben);
 await fails('add',['--type=tier','--name=Platinum 2','--rank=4',ben],/duplicate|unique/i);
 await call('add','--type=step','--partner=Coral Coast Tech','--step=Agreed first year plan',`--due-on=${today}`,ben);
 await call('complete-step','--partner=Coral Coast Tech','--step=sign partner',aroha);
 await fails('complete-step',['--partner=Coral Coast Tech','--step=sign partner',aroha],/Already done/);
 await fails('complete-step',['--partner=Coral Coast Tech','--step=first',aroha],/ambiguous/);
 await fails('set-tier',['--partner=Outback Networks','--tier=Registered','--reason=x',ben],/already Registered/);
 const st=await call('set-tier','--partner=Outback Networks','--tier=Silver','--reason=Tier review: meets every Silver requirement',ben);
 assert.deepEqual([st.from,st.to],['Registered','Silver']);
 assert.equal((await call('tier-review')).find(r=>r.partner==='Outback Networks').status,'On tier');
 await call('log','--partner=Tasman Referral Partners','--note=Called Hana; agreed a renewal meeting',ben);
 assert.equal((await call('partner','--partner=Tasman Referral Partners')).notes.length,2);

 // Import from an Impartner export: dry run writes nothing, repeats skip, changes are refused.
 const ex=f=>path.join(REPO_ROOT,'examples/impartner',f);
 const before=(await call('partners')).length,hist=(await call('history')).length;
 assert.equal((await call('import','impartner','--object=partners',`--file=${ex('partners.csv')}`,ben,'--dry-run')).inserted,3);
 assert.equal((await call('partners')).length,before);assert.equal((await call('history')).length,hist);
 await fails('import',['impartner','--object=contacts',`--file=${ex('contacts.csv')}`,ben],/Import partners first/);
 assert.equal((await call('import','impartner','--object=partners',`--file=${ex('partners.csv')}`,ben)).inserted,3);
 const rang=await call('partner','--partner=Rangitoto Networks');assert.equal(rang.partner.kind,'msp');assert.equal(rang.partner.state,'active');
 assert.equal((await call('partner','--partner=Darling Harbour IT')).partner.state,'onboarding');
 assert.equal((await call('partner','--partner=Kapiti Cloud')).partner.kind,'referral');
 assert.equal((await call('import','impartner','--object=contacts',`--file=${ex('contacts.csv')}`,ben)).inserted,2);
 assert.equal((await call('import','impartner','--object=registrations',`--file=${ex('registrations.csv')}`,ben)).inserted,3);
 const dr=await call('registration','--registration=DR-10021');assert.equal(dr.registration.customer_domain,'wgtnbus.example');assert.equal(Number(dr.registration.value),48000);
 assert.equal((await call('registration','--registration=DR-10023')).registration.state,'won');
 assert.equal((await call('import','impartner','--object=registrations',`--file=${ex('registrations.csv')}`,ben)).skipped,3);
 const bad=path.join(temp,'bad.csv');
 fs.writeFileSync(bad,fs.readFileSync(ex('registrations.csv'),'utf8').replace('22000','23000'));
 await fails('import',['impartner','--object=registrations',`--file=${bad}`,ben],/changed since the last import/);
 fs.writeFileSync(bad,'Id,Account Name,Partner Level\nX1,Fine Partner,\nX2,Odd Tier Partner,Diamond\n');
 const partnersBefore=(await db.query('select count(*)::int as n from partners'))[0].n;
 await fails('import',['impartner','--object=partners',`--file=${bad}`,ben],/no tier called Diamond/);
 assert.equal((await db.query('select count(*)::int as n from partners'))[0].n,partnersBefore,'a failed import writes nothing');
 fs.writeFileSync(bad,'Id,Reg No,Account Id,Client,Est. Value,Stage,Created\nMAP1,DR-2001,IMP-A3,Porirua Joinery,9000,Submitted,05/10/2026\n');
 await fails('import',['impartner','--object=registrations',`--file=${bad}`,ben,`--mapping=${path.join(REPO_ROOT,'examples/column-mapping.json')}`],/--date-format=dmy/);
 assert.equal((await call('import','impartner','--object=registrations',`--file=${bad}`,ben,`--mapping=${path.join(REPO_ROOT,'examples/column-mapping.json')}`,'--date-format=dmy')).inserted,1);
 assert.equal((await call('registration','--registration=DR-2001')).registration.submitted_on,'2026-10-05');
 fs.writeFileSync(bad,'{"bogus":"x"}');await fails('import',['impartner','--object=partners',`--file=${ex('partners.csv')}`,ben,`--mapping=${bad}`],/not a field/);
 assert.throws(()=>parseCsv('A,A\n1,2'),/unique/);assert.throws(()=>parseCsv('A,B\n1'),/expected/);assert.throws(()=>parseCsv('A\n"oops'),/unclosed/);

 // Drafts, backups, escaped HTML.
 for(const [cmd,flags,pattern] of [['weekly-review',[],/## tier-review/],['draft-tier-letter',['--partner=Kauri IT Solutions'],/below the Gold requirements/],['draft-tier-letter',['--partner=Harbour Digital'],/Renewing those certifications/],
  ['draft-registration-reply',['--registration=HD-0093'],/cannot approve/],['draft-registration-reply',['--registration=SCS-1187'],/protected for you until/],['draft-qbr',['--partner=Southern Cross Systems'],/Quarterly business review/]]){
  const d=await call(cmd,...flags);const text=fs.readFileSync(d.file,'utf8');assert.match(text,/Nothing has been sent/);assert.match(text,pattern);
 }
 await fails('draft-tier-letter',['--partner=Coral Coast Tech'],/not an active partner/);
 const exp=await call('export','--out=exports/backup.json');const backup=JSON.parse(fs.readFileSync(exp.file,'utf8'));
 assert.equal(Object.keys(backup.records).length,14);assert.ok(backup.records.history.length>30);
 await fails('export',['--out=exports/backup.json'],/EEXIST/);
 const html=page({title:'<script>x</script>',sections:[{title:'Rows',html:htmlTable([{name:'<script>x</script>'}])}]});assert.ok(!html.includes('<script>x'));
 assert.deepEqual(commands.filter(c=>!seen.has(c)),[],'every command exercised');
 await db.close();

 for(const file of ['view.mjs','docs.mjs']){const c=spawnSync(process.execPath,[path.join(REPO_ROOT,'scripts',file)],{env:process.env,encoding:'utf8',cwd:REPO_ROOT});assert.equal(c.status,0,c.stderr);}
 assert.ok(fs.existsSync(path.join(temp,'views/week.html')));
 assert.ok(fs.readdirSync(path.join(temp,'docs-out/partner-scorecard')).length>=5);
 assert.ok(fs.readdirSync(path.join(temp,'docs-out/mdf-remittance')).length>=4);
 const amb=spawnSync(process.execPath,[path.join(REPO_ROOT,'scripts/partners.mjs'),'partner','--partner=a0000000'],{env:process.env,encoding:'utf8'});
 assert.equal(amb.status,1);assert.match(amb.stderr,/ambiguous/);
 const json=spawnSync(process.execPath,[path.join(REPO_ROOT,'scripts/partners.mjs'),'tier-review','--json'],{env:process.env,encoding:'utf8'});
 assert.equal(json.status,0,json.stderr);assert.ok(JSON.parse(json.stdout).length>=5);
 console.log(`PASS: all ${commands.length} commands, ${rejections} refused inputs, the tier review checked against the rules, registration clashes and overrides, MDF approval by a second person, four cited rules, atomic Impartner import with repeats, mapping and dates, drafts, backups, views and documents (${db.mode}, ${process.platform}).`);
}finally{try{await db.close();}catch{}fs.rmSync(temp,{recursive:true,force:true});}
