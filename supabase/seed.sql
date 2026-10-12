-- Demo data: a fictional NZ software vendor selling through six partners in New Zealand and Australia.
-- Dates are relative to today so the overdue, lapsed and quiet rows stay overdue, lapsed and quiet.
-- Idempotent: run it twice and nothing doubles.
insert into tiers(id,name,rank,min_revenue_nz,min_revenue_au,min_certified,discount_pct,mdf_pct,benefits) values
 ('10000000-0000-0000-0000-000000000001','Registered',1,0,0,0,10,0,'Partner pricing, deal registration'),
 ('10000000-0000-0000-0000-000000000002','Silver',2,100000,90000,2,20,2,'Deal registration, MDF, listed on the partner finder'),
 ('10000000-0000-0000-0000-000000000003','Gold',3,300000,270000,4,30,4,'Deal registration, MDF, named channel manager, first look at direct leads')
on conflict do nothing;

insert into partners(id,name,kind,country,tier_id,owner,state,joined_on,region,business_number,gst_registered,small_business) values
 ('a0000000-0000-0000-0000-000000000001','Kauri IT Solutions','reseller','NZ','10000000-0000-0000-0000-000000000003','Ben','active',current_date-900,'Auckland','9429041234567',true,true),
 ('a0000000-0000-0000-0000-000000000002','Southern Cross Systems','reseller','AU','10000000-0000-0000-0000-000000000002','Ben','active',current_date-700,'Queensland','51 824 753 556',true,false),
 ('a0000000-0000-0000-0000-000000000003','Harbour Digital','integrator','NZ','10000000-0000-0000-0000-000000000002','Aroha','active',current_date-520,'Nelson','9429047654321',true,true),
 ('a0000000-0000-0000-0000-000000000004','Outback Networks','msp','AU','10000000-0000-0000-0000-000000000001','Aroha','active',current_date-260,'Western Australia','33 102 417 032',true,true),
 ('a0000000-0000-0000-0000-000000000005','Tasman Referral Partners','referral','NZ','10000000-0000-0000-0000-000000000001','Ben','active',current_date-820,'Otago','9429040001112',false,true),
 ('a0000000-0000-0000-0000-000000000006','Coral Coast Tech','reseller','AU','10000000-0000-0000-0000-000000000001','Aroha','onboarding',current_date-15,'Queensland','74 172 177 893',true,true)
on conflict do nothing;

insert into contacts(id,partner_id,name,email,role,is_primary) values
 ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','Kiri Ngata','kiri@kauriit.example','Managing director',true),
 ('b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','Liam Chen','liam@kauriit.example','Solutions engineer',false),
 ('b0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001','Sione Taufa','sione@kauriit.example','Consultant',false),
 ('b0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000001','Grace Patel','grace@kauriit.example','Consultant',false),
 ('b0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000002','Jack Murray','jack@scsystems.example','Sales director',true),
 ('b0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000002','Priya Singh','priya@scsystems.example','Implementation lead',false),
 ('b0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000003','Tama Walker','tama@harbourdigital.example','Lead consultant',true),
 ('b0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000003','Emma Brooks','emma@harbourdigital.example','Consultant',false),
 ('b0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000004','Mick O''Brien','mick@outbacknet.example','Owner',true),
 ('b0000000-0000-0000-0000-000000000010','a0000000-0000-0000-0000-000000000004','Chloe Nguyen','chloe@outbacknet.example','Service manager',false),
 ('b0000000-0000-0000-0000-000000000011','a0000000-0000-0000-0000-000000000005','Hana Kim','hana@tasmanreferral.example','Partner',true),
 ('b0000000-0000-0000-0000-000000000012','a0000000-0000-0000-0000-000000000006','Ben Foster','ben@coralcoast.example','Director',true)
on conflict do nothing;

insert into certifications(contact_id,name,earned_on,expires_on) values
 ('b0000000-0000-0000-0000-000000000001','Certified Implementer',current_date-300,current_date+430),
 ('b0000000-0000-0000-0000-000000000002','Certified Implementer',current_date-200,current_date+530),
 ('b0000000-0000-0000-0000-000000000003','Certified Implementer',current_date-500,current_date+230),
 ('b0000000-0000-0000-0000-000000000004','Certified Implementer',current_date-760,current_date-30),
 ('b0000000-0000-0000-0000-000000000005','Certified Implementer',current_date-150,current_date+580),
 ('b0000000-0000-0000-0000-000000000006','Certified Implementer',current_date-400,current_date+330),
 ('b0000000-0000-0000-0000-000000000007','Certified Implementer',current_date-710,current_date+20),
 ('b0000000-0000-0000-0000-000000000008','Certified Implementer',current_date-100,current_date+630),
 ('b0000000-0000-0000-0000-000000000009','Certified Implementer',current_date-180,current_date+550),
 ('b0000000-0000-0000-0000-000000000010','Certified Implementer',current_date-90,current_date+640)
on conflict do nothing;

insert into agreements(id,partner_id,kind,version,starts,ends,signed_on,document,standard_form,terms_reviewed_on,minimum_resale_price) values
 ('c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','reseller','Reseller agreement v3',current_date-400,current_date+330,current_date-402,'agreements/kauri-v3.pdf',true,date '2024-02-01',null),
 ('c0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002','reseller','Reseller agreement v2 (AU)',current_date-320,current_date+45,current_date-322,'agreements/scs-v2.pdf',true,date '2024-03-15','Partner must not advertise the software below RRP less 10%'),
 ('c0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003','integrator','Integrator agreement v1',current_date-500,current_date+230,current_date-505,'agreements/harbour-v1.pdf',true,null,null),
 ('c0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000004','msp','MSP agreement v1 (AU)',current_date-250,current_date+480,current_date-252,'agreements/outback-v1.pdf',true,date '2023-05-01',null),
 ('c0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000005','referral','Referral agreement v1',current_date-800,current_date-20,current_date-801,'agreements/tasman-v1.pdf',true,date '2023-01-20',null),
 ('c0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000006','reseller','Reseller agreement v3 (AU)',current_date-15,current_date+350,null,null,true,date '2026-01-10',null)
on conflict do nothing;

insert into house_accounts(id,name,domain,owner) values
 ('f0000000-0000-0000-0000-000000000001','Pilbara Haulage Group','pilbarahaulage.com.au','Mere, direct sales'),
 ('f0000000-0000-0000-0000-000000000002','Canterbury Grain Co-op','canterburygrain.co.nz','Mere, direct sales')
on conflict do nothing;

insert into registrations(id,partner_id,reference,end_customer,customer_domain,contact_name,description,value,expected_close,submitted_on,state,decided_on,decided_by,expires_on,closed_on) values
 ('d0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','KIT-0412','Waitemata Port Services','waitematapsl.co.nz','Ana Ruawai','Inspections across three wharves',95000,current_date+20,current_date-82,'approved',current_date-80,'Ben',current_date+10,null),
 ('d0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002','SCS-1187','Brisbane Water Utilities','bnewater.com.au','Darren Lowe','Field crews, 120 users',60000,current_date+60,current_date-5,'submitted',null,null,null,null),
 ('d0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003','HD-0093','Waitemata Port Services Ltd','waitematapsl.co.nz','Ana Ruawai','Wharf maintenance inspections',70000,current_date+45,current_date-1,'submitted',null,null,null,null),
 ('d0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000004','ON-0021','Pilbara Haulage Pty Ltd','pilbarahaulage.com.au','Shane Ellis','Vehicle prestart checks',45000,current_date+30,current_date,'submitted',null,null,null,null),
 ('d0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000001','KIT-0388','Auckland Fresh Logistics','aklfresh.co.nz','Mia Tuhoe','Cold store audits',120000,null,current_date-160,'won',current_date-158,'Ben',current_date-68,current_date-100),
 ('d0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000002','SCS-1102','Gold Coast Marine','gcmarine.com.au','Rob Hayes','Vessel checks',30000,null,current_date-200,'lost',current_date-198,'Aroha',current_date-108,current_date-120),
 ('d0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000003','HD-0071','Nelson Aquaculture','nelsonaqua.co.nz','Kate Ford','Farm site audits',25000,current_date-5,current_date-102,'approved',current_date-100,'Aroha',current_date-10,null),
 ('d0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000004','ON-0015','Kalgoorlie Mining Services','kalgoorliems.com.au','Dean Price','Site safety inspections',60000,null,current_date-130,'won',current_date-129,'Ben',current_date-39,current_date-75),
 ('d0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000005','TRP-0004','Otago Vineyards','otagovines.co.nz','Sam Reid','Vineyard spray records',12000,null,current_date-220,'lost',current_date-219,'Ben',current_date-129,current_date-150),
 ('d0000000-0000-0000-0000-000000000010','a0000000-0000-0000-0000-000000000001','KIT-0420','Hutt Valley Engineering','hvengineering.co.nz','Paul Grey','Workshop equipment checks',40000,current_date+50,current_date-21,'approved',current_date-20,'Aroha',current_date+70,null)
on conflict do nothing;

insert into sales(partner_id,registration_id,invoice_no,invoice_date,end_customer,value) values
 ('a0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000005','INV-1001',current_date-100,'Auckland Fresh Logistics',120000),
 ('a0000000-0000-0000-0000-000000000001',null,'INV-1022',current_date-60,'Auckland Transport Depots',140000),
 ('a0000000-0000-0000-0000-000000000001',null,'INV-1040',current_date-20,'North Shore Facilities',80000),
 ('a0000000-0000-0000-0000-000000000001',null,'INV-0950',current_date-500,'Waikato Dairy Sheds',50000),
 ('a0000000-0000-0000-0000-000000000002',null,'INV-2001',current_date-150,'Sunshine Coast Council Depots',95000),
 ('a0000000-0000-0000-0000-000000000002',null,'INV-2010',current_date-40,'Logan Plumbing Supplies',60000),
 ('a0000000-0000-0000-0000-000000000003',null,'INV-3001',current_date-90,'Marlborough Ferries',70000),
 ('a0000000-0000-0000-0000-000000000003',null,'INV-3005',current_date-30,'Tasman Timber',50000),
 ('a0000000-0000-0000-0000-000000000004','d0000000-0000-0000-0000-000000000008','INV-4001',current_date-75,'Kalgoorlie Mining Services',60000),
 ('a0000000-0000-0000-0000-000000000004',null,'INV-4002',current_date-35,'Perth Cold Chain',70000),
 ('a0000000-0000-0000-0000-000000000005',null,'INV-5001',current_date-200,'Queenstown Lodges',4000)
on conflict do nothing;

insert into mdf_funds(id,partner_id,period_start,period_end,allocated) values
 ('e1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001',date_trunc('year',current_date)::date,(date_trunc('year',current_date)+interval '1 year -1 day')::date,12000),
 ('e1000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002',date_trunc('year',current_date)::date,(date_trunc('year',current_date)+interval '1 year -1 day')::date,6000),
 ('e1000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003',date_trunc('year',current_date)::date,(date_trunc('year',current_date)+interval '1 year -1 day')::date,3000),
 ('e1000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000004',date_trunc('year',current_date)::date,(date_trunc('year',current_date)+interval '1 year -1 day')::date,2000)
on conflict do nothing;

insert into mdf_requests(id,fund_id,reference,activity,planned_on,requested_amount,requested_on,state,preapproved_by,preapproved_on,claimed_amount,claimed_on,proof,tax_invoice_ref,leads,pipeline,approved_amount,approved_by,paid_on,payment_ref) values
 ('e0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001','KIT-MDF-01','Field service breakfast, Auckland',current_date-90,3000,current_date-120,'paid','Ben',current_date-118,2950,current_date-80,'Venue invoice and attendee list','KIT-INV-7781',22,140000,2950,'Aroha',current_date-70,'EFT-5521'),
 ('e0000000-0000-0000-0000-000000000002','e1000000-0000-0000-0000-000000000001','KIT-MDF-02','LinkedIn campaign, inspections',current_date-75,4000,current_date-95,'pre-approved','Ben',current_date-93,null,null,null,null,null,null,null,null,null,null),
 ('e0000000-0000-0000-0000-000000000003','e1000000-0000-0000-0000-000000000002','SCS-MDF-01','Brisbane roadshow',current_date-25,2500,current_date-50,'claimed','Ben',current_date-48,2600,current_date-10,'Venue and catering invoices','SCS-TI-0193',15,90000,null,null,null,null),
 ('e0000000-0000-0000-0000-000000000004','e1000000-0000-0000-0000-000000000002','SCS-MDF-02','Webinar series, water utilities',current_date-100,1800,current_date-130,'paid','Ben',current_date-128,1800,current_date-85,'Webinar registration report',null,40,60000,1800,'Aroha',current_date-60,'EFT-5480'),
 ('e0000000-0000-0000-0000-000000000005','e1000000-0000-0000-0000-000000000003','HD-MDF-01','Nelson customer lunch',current_date+20,1500,current_date-3,'requested',null,null,null,null,null,null,null,null,null,null,null,null),
 ('e0000000-0000-0000-0000-000000000006','e1000000-0000-0000-0000-000000000004','ON-MDF-01','Perth trade show stand',current_date-30,900,current_date-60,'approved','Ben',current_date-58,900,current_date-12,'Stand invoice and badge scans','ON-TI-0042',31,75000,900,'Aroha',null,null)
on conflict do nothing;

insert into onboarding_steps(partner_id,step,due_on,done_on,done_by) values
 ('a0000000-0000-0000-0000-000000000006','Welcome call',current_date-14,current_date-13,'Aroha'),
 ('a0000000-0000-0000-0000-000000000006','Sign partner agreement',current_date-10,null,null),
 ('a0000000-0000-0000-0000-000000000006','First person certified',current_date+5,null,null),
 ('a0000000-0000-0000-0000-000000000006','First deal registered',current_date+30,null,null)
on conflict do nothing;

insert into notes(id,partner_id,actor,body) values
 ('f1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005','Ben','Hana asked whether referral fees change if they move to resale. Follow up after the tier review.')
on conflict do nothing;
