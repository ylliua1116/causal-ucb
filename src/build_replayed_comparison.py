"""Merge verified source replay into published seven-method comparison JSON.

This script changes ONLY low-mismatch five-baseline trace availability, metadata,
and recalculates their chart mean ± 95% tCI. All historic terminal values remain
untouched. Source: src/replay_missing_rounds.py + frozen per_seed.csv.
"""
from pathlib import Path
from collections import defaultdict
from statistics import mean,stdev
from math import sqrt
import json,csv,gzip,hashlib

ROOT=Path(__file__).resolve().parent.parent
BASE=ROOT/'docs/assets/certified-benchmark'
FIVE=['CAUSAL-UCB','IPS-UCB','Raw-UCB','Greedy-Raw','Switchback-OED']
TC=2.068657610

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def build():
    js=BASE/'seven-method-comparison.json'
    obj=json.loads(js.read_text())
    audit=json.loads((BASE/'replayed_low_mismatch_audit.json').read_text())
    assert audit['result']=='pass' and audit['choice_sha256_checks_passed']==168
    by_method=defaultdict(lambda:defaultdict(list))
    with gzip.open(BASE/'replayed_low_mismatch_5methods.csv.gz','rt') as f:
        for r in csv.DictReader(f):
            assert r['condition']=='low_mismatch'
            by_method[r['method']][r['seed']].append(r)
    old_perseed={ (r['condition'],r['seed'],r['method']):r for r in csv.DictReader((BASE/'per_seed.csv').open()) }
    for m in FIVE:
        d=obj['conditions']['low_mismatch']['methods'][m]
        assert len(d['seeds'])==24
        for seed,rows in by_method[m].items():
            assert len(rows)==200 and [int(r['t']) for r in rows]==list(range(1,201))
            r=d['seeds'][seed];orig=old_perseed[('low_mismatch',seed,m)]
            trace={'config':[int(row['k']) for row in rows],
                   'regret':[round(float(row['cumulative_regret']),10) for row in rows],
                   'deployment':[round(float(row['cumulative_deploy']),10) for row in rows]}
            assert abs(trace['regret'][-1]-float(orig['regret']))<1e-9
            assert abs(trace['deployment'][-1]-float(orig['deploy']))<1e-9
            assert trace['config'][-1]==int(orig['final_configuration'])
            r['trace']=trace
        charts={}
        for metric in ('regret','deployment'):
            curve=[]
            for idx in range(200):
                values=[d['seeds'][seed]['trace'][metric][idx] for seed in sorted(d['seeds'])]
                avg=mean(values);err=TC*stdev(values)/sqrt(len(values))
                curve.append([idx+1,round(avg,9),round(avg-err,9),round(avg+err,9)])
            charts[metric]=curve
        assert abs(charts['regret'][-1][1]-d['summary']['regret'])<1e-8
        assert abs(charts['deployment'][-1][1]-d['summary']['deploy'])<1e-8
        d['charts']=charts
        d['has_per_round']=True
        d['source']='replayed_low_mismatch_5methods.csv.gz (frozen-driver exact verified replay)'
    # Populate already archived terminal-selection statistics for all methods.
    seed_rows=list(csv.DictReader((BASE/'per_seed.csv').open()))
    for regime in ('high_mismatch','low_mismatch'):
        for method,dct in obj['conditions'][regime]['methods'].items():
            vals=[r for r in seed_rows if r['condition']==regime and r['method']==method]
            assert len(vals)==24
            dct['summary']['final_best_identification_rate']=sum(int(r['final_best_identification']) for r in vals)/24
            dct['summary']['final_target_gap']=sum(float(r['gap']) for r in vals)/24
    obj['metadata']['low_mismatch']='All 7 methods now have 200-round traces. The 5 reference traces were freshly deterministically replayed with the frozen seed generator and verified by all 168 recorded decision SHA-256 hashes, terminal metrics, and final configuration. These 5 are replicated, not separately archived original round logs.'
    obj['metadata']['no_online_training']='All plotted results are replay records, not browser-generated. Recorded high mismatch and certified low mismatch are original archives; low-mismatch reference trajectories are reproducible deterministic replays. Live Lab uses separate conditional policies.'
    obj['sha256']['replayed_low_mismatch_5methods.csv.gz']=sha(BASE/'replayed_low_mismatch_5methods.csv.gz')
    obj['sha256']['replayed_low_mismatch_audit.json']=sha(BASE/'replayed_low_mismatch_audit.json')
    obj['version']='matched-seven-method-study'
    js.write_text(json.dumps(obj,separators=(',',':'),ensure_ascii=False)+'\n')
    print('built JSON',js.stat().st_size,'bytes')
    for m in FIVE:
        d=obj['conditions']['low_mismatch']['methods'][m]
        print(m, 'regret=',d['charts']['regret'][-1][1], 'deploy=',d['charts']['deployment'][-1][1], 'trace_count=',len(d['seeds']))

if __name__=='__main__':build()
