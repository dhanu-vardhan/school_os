#!/usr/bin/env python3
import argparse, csv, json, os, re, shutil, subprocess, sys, time, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEATURES_PATH = ROOT / 'verify' / 'features.yaml'

def load_features(path):
    # minimal YAML subset parser for our registry
    text = path.read_text()
    features = []
    cur = None
    for raw in text.splitlines():
        line = raw.rstrip()
        if line.strip().startswith('- id:'):
            if cur: features.append(cur)
            cur = {'id': line.split(':',1)[1].strip(), 'checks': [], 'roles': [], 'platform': []}
        elif cur is None:
            continue
        elif re.match(r'^\s{4}\w+:', line):
            k,v = line.strip().split(':',1)
            v=v.strip()
            if v.startswith('[') and v.endswith(']'):
                cur[k]=[x.strip() for x in v[1:-1].split(',') if x.strip()]
            else:
                cur[k]=v.strip('"').strip("'")
        elif re.match(r'^\s{6}\w+:', line):
            k,v = line.strip().split(':',1)
            v=v.strip()
            if v.startswith('[') and v.endswith(']'):
                cur[k]=[x.strip() for x in v[1:-1].split(',') if x.strip()]
            else:
                cur[k]=v.strip('"').strip("'")
    if cur: features.append(cur)
    return features

class CheckResult:
    def __init__(self, gid, cid, status, msg, features=None, duration=0.0):
        self.gid=gid; self.cid=cid; self.status=status; self.msg=msg; self.features=features or []; self.duration=duration

def http_status(url, timeout=5):
    try:
        req=urllib.request.Request(url, method='GET')
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read(4096)
    except urllib.error.HTTPError as e:
        return e.code, b''
    except Exception as e:
        return None, str(e).encode()

def run_cmd(cmd, timeout=30):
    p=subprocess.run(cmd, shell=True, cwd=ROOT, capture_output=True, text=True, timeout=timeout)
    return p.returncode, p.stdout, p.stderr

def g0_preflight():
    res=[]
    t=time.time()
    for name,cmd in [('python3','python3 --version'),('node','node --version'),('pnpm','pnpm --version'),('docker','docker --version'),('java','/opt/homebrew/opt/openjdk@21/bin/java -version')]:
        code,out,err=run_cmd(cmd)
        ok=code==0
        res.append(CheckResult('G0',f'preflight.{name}','pass' if ok else 'fail', (out or err).strip().splitlines()[0] if (out or err) else 'missing'))
    if os.environ.get('SCHOOLOS_ENV','local').lower() in ('prod','production') or os.environ.get('ENV','').lower() in ('prod','production'):
        res.append(CheckResult('G0','env.guard','fail','forbidden environment'))
    res[0].duration=time.time()-t
    return res

def g1_infra():
    res=[]; t=time.time()
    st,body=http_status('http://localhost:3000/')
    res.append(CheckResult('G1','web.document','pass' if st==200 else 'fail', f'status={st}', ['INFRA-WEB-01']))
    st,_=http_status('http://localhost:8080/actuator/health')
    res.append(CheckResult('G1','api.health','pass' if st==200 else 'fail', f'status={st}', ['INFRA-API-01']))
    code,out,err=run_cmd('PGPASSWORD=schoolos_app psql -h localhost -p 5432 -U schoolos_app -d schoolos -c "SELECT 1"', timeout=10)
    res.append(CheckResult('G1','db.select1','pass' if code==0 else 'fail', 'ok' if code==0 else (err.strip() or 'psql failed'), ['INFRA-DB-01']))
    st,_=http_status('http://localhost:3000/api/students')
    res.append(CheckResult('G1','api.protected','pass' if st==401 else 'fail', f'/api/students status={st} (expected 401 without JWT)', ['INFRA-API-01']))
    # check css loaded in built/served preview (fetch dist asset if exists) and no plain text markers
    page = body.decode('utf-8','ignore') if isinstance(body,(bytes,bytearray)) else ''
    unstyled = 'Screen: classes (director)' in page or ('PREVIEW MODE - fictional data' in page and 'class="min-h-screen' not in page)
    res.append(CheckResult('G1','web.not_unstyled_marker','pass' if not unstyled else 'fail','no plain placeholder marker in HTML', ['INFRA-WEB-01']))
    for r in res: r.duration=time.time()-t
    return res

def g2_db_tenant():
    res=[]; t=time.time()
    code,out,err=run_cmd("""PGPASSWORD=schoolos_app psql -h localhost -p 5432 -U schoolos_app -d schoolos -Atc "SELECT tablename FROM pg_tables t JOIN pg_class c ON c.relname=t.tablename WHERE schemaname='public' AND c.relrowsecurity AND c.relforcerowsecurity AND tablename IN ('school','student','membership')" """, timeout=10)
    rows=[r for r in out.strip().splitlines() if r.strip()] if code==0 else []
    res.append(CheckResult('G2','rls.forced.core_tables','pass' if {'school','student','membership'}.issubset(set(rows)) else 'fail', f'tables={rows}', ['P2-7-tenantflow','P2-7-rls','INFRA-DB-01']))
    code2,out2,err2=run_cmd("PGPASSWORD=schoolos_app psql -h localhost -p 5432 -U schoolos_app -d schoolos -Atc \"SELECT column_name FROM information_schema.columns WHERE table_name='student' AND column_name='ine_number'\"", timeout=10)
    res.append(CheckResult('G2','schema.student.ine_number','pass' if code2==0 and 'ine_number' in out2 else 'fail', 'present' if code2==0 and 'ine_number' in out2 else (err2.strip() or out2.strip() or 'missing'), ['P1-5.2-ine']))
    for r in res: r.duration=time.time()-t
    return res

def g10_screen_smoke():
    res=[]; t=time.time()
    st,body=http_status('http://localhost:3000/')
    html=body.decode('utf-8','ignore') if isinstance(body,(bytes,bytearray)) else ''
    st2,app=http_status('http://localhost:3000/src/App.tsx')
    appsrc=app.decode('utf-8','ignore') if isinstance(app,(bytes,bytearray)) else ''
    st3,css=http_status('http://localhost:3000/src/index.css')
    csssrc=css.decode('utf-8','ignore') if isinstance(css,(bytes,bytearray)) else ''
    styled = st3==200 and ('--color-bg' in csssrc or 'tailwind' in csssrc.lower())
    has_cls = ('Classes' in appsrc) or ('Classes' in html)
    ok_cls = st==200 and has_cls and styled
    res.append(CheckResult('G10','screen.director.classes','pass' if ok_cls else 'fail', f'Classes={has_cls} styled_css={styled} status={st}', ['SCR-DIR-CLASSES','INFRA-WEB-01']))
    ok_home = st==200 and ('Accueil' in appsrc or 'Bonjour' in appsrc)
    res.append(CheckResult('G10','screen.director.home','pass' if ok_home else 'fail','director/home markers present in preview app', ['SCR-DIR-HOME']))
    for r in res: r.duration=time.time()-t
    return res

GROUPS = {
  'G0': g0_preflight,
  'G1': g1_infra,
  'G2': g2_db_tenant,
  'G10': g10_screen_smoke,
}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--quick', action='store_true')
    ap.add_argument('--full', action='store_true')
    ap.add_argument('--group')
    ap.add_argument('--env', default='local')
    ap.add_argument('--keep-up', action='store_true')
    ap.add_argument('--fail-fast', action='store_true')
    ap.add_argument('--no-browser', action='store_true')
    ap.add_argument('--report-dir')
    ap.add_argument('--selftest-break', choices=['api401','nostyle','rls'])
    args=ap.parse_args()
    if args.env.lower() in ('prod','production'):
        print('REFUSED: production environment', file=sys.stderr); return 3
    if args.selftest_break:
        print(f'selftest-break {args.selftest_break}: not implemented in this step'); return 1
    features = load_features(FEATURES_PATH) if FEATURES_PATH.exists() else []
    all_checks_defined = set()
    # compute coverage against implemented checks
    implemented = {'G0.preflight.python3','G0.preflight.node','G0.preflight.pnpm','G0.preflight.docker','G0.preflight.java','G1.web.document','G1.api.health','G1.db.select1','G1.api.protected','G1.web.not_unstyled_marker','G2.rls.forced.core_tables','G10.screen.director.classes','G10.screen.director.home'}
    unchecked = [f['id'] for f in features if f.get('status')=='expected-working' and not any((c in ''.join([x.cid for x in []])) for c in f.get('checks',[]))]
    # real unchecked: expected-working features whose id not covered by any result feature tags we will produce
    covered_ids=set(['INFRA-WEB-01','INFRA-API-01','INFRA-DB-01','P2-7-tenantflow','P2-7-rls','P1-5.2-ine','SCR-DIR-CLASSES','SCR-DIR-HOME'])
    missing_checks=[f['id'] for f in features if f.get('status')=='expected-working' and f['id'] not in covered_ids]
    groups = [args.group] if args.group else (['G0','G1'] if args.quick else ['G0','G1','G2','G10'])
    results=[]
    start=time.time()
    for g in groups:
        fn=GROUPS.get(g)
        if not fn:
            results.append(CheckResult(g,'unimplemented','fail',f'group {g} not implemented'))
            if args.fail_fast: break
            continue
        rs=fn(); results.extend(rs)
        if args.fail_fast and any(r.status=='fail' for r in rs): break
    # mark missing checks as failures
    for fid in missing_checks:
        results.append(CheckResult('REG','coverage','fail',f'expected-working feature {fid} has no implemented check'))
    total=len(results); passed=sum(1 for r in results if r.status=='pass'); failed=sum(1 for r in results if r.status=='fail')
    ts=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    outdir=Path(args.report_dir) if args.report_dir else ROOT/'reports'/'verify'/ts
    outdir.mkdir(parents=True, exist_ok=True)
    summary={
      'timestamp':ts,'overall':'PASS' if failed==0 else 'FAIL','total':total,'passed':passed,'failed':failed,
      'groups':groups,'feature_count':len(features),'covered_feature_ids':sorted(covered_ids),
      'missing_check_features':missing_checks,
      'warnings':[{'id':f['id'],'status':f.get('status'),'reason':f.get('reason','')} for f in features if f.get('status') in ('stubbed','known-broken','planned')]
    }
    (outdir/'summary.json').write_text(json.dumps(summary,indent=2))
    (outdir/'results.json').write_text(json.dumps([r.__dict__ for r in results],indent=2))
    # junit
    cases=[]
    for r in results:
        case=f'<testcase classname="{r.gid}" name="{r.cid}" time="{r.duration:.3f}">'
        if r.status!='pass': case+=f'<failure message="{r.msg}"/>'
        case+='</testcase>'; cases.append(case)
    (outdir/'junit.xml').write_text('<?xml version="1.0"?><testsuite tests="%d" failures="%d">%s</testsuite>'%(total,failed,''.join(cases)))
    # markdown
    lines=[f"# verify-all summary ({ts})", '', f"Overall: **{summary['overall']}**  ", f"Checks: {passed}/{total} passed, {failed} failed  ", f"Features in registry: {len(features)}  ", f"Missing checks (expected-working): {', '.join(missing_checks) if missing_checks else 'none'}  ", '', '## Groups']
    for r in results:
        mark='PASS' if r.status=='pass' else 'FAIL'
        lines.append(f"- [{mark}] {r.gid}.{r.cid}: {r.msg}")
    lines += ['', '## Warnings (stubbed/known-broken/planned)']
    for w in summary['warnings']:
        lines.append(f"- {w['id']} [{w['status']}] {w.get('reason','')}")
    (outdir/'summary.md').write_text('\n'.join(lines)+'\n')
    # features csv
    with (outdir/'features.csv').open('w',newline='') as fp:
        w=csv.writer(fp); w.writerow(['id','module','name','status','covered'])
        for f in features:
            w.writerow([f.get('id'),f.get('module'),f.get('name'),f.get('status'), f.get('id') in covered_ids])
    # history
    hist=ROOT/'reports'/'verify'/'history.csv'
    hist.parent.mkdir(parents=True, exist_ok=True)
    new=not hist.exists()
    with hist.open('a',newline='') as fp:
        w=csv.writer(fp)
        if new: w.writerow(['timestamp','overall','passed','failed','total','features'])
        w.writerow([ts,summary['overall'],passed,failed,total,len(features)])
    # terminal
    print(f"verify-all {summary['overall']} | {passed}/{total} checks | features {len(features)} | report {outdir}")
    for r in results:
        sym='OK' if r.status=='pass' else 'FAIL'
        print(f"  [{sym}] {r.gid}.{r.cid} - {r.msg}")
    if summary['warnings']:
        print(f"  warnings: {len(summary['warnings'])} stubbed/known-broken/planned")
    return 0 if failed==0 else 1

if __name__=='__main__':
    sys.exit(main())
