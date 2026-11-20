"""Recompute missing low-mismatch reference trajectories using the frozen matched-seed driver.

Retains existing algorithm/seed generator, validates each replay against the separately
archived per_seed.csv, including exact decision sequence digest and final estimates.
The added CSV is new replay output, not historic saved instrumentation.
"""
from __future__ import annotations
import argparse,csv,datetime,hashlib,json,sys,math
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
sys.path.insert(0,str(HERE/'original_source'))
from fast_compare import METHODS,run_one_seed,save_csv
from causal_ucb_conditional import Setup,oracle_target_and_logging

FIVE=METHODS[2:]
def sha256(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--archive',default=str(HERE.parent/'docs/assets/certified-benchmark/per_seed.csv'))
    ap.add_argument('--out',default=str(HERE.parent/'docs/assets/certified-benchmark/replayed_low_mismatch_5methods.csv.gz'))
    ap.add_argument('--audit',default=str(HERE.parent/'docs/assets/certified-benchmark/replayed_low_mismatch_audit.json'))
    args=ap.parse_args()
    original={(r['condition'],int(r['seed']),r['method']):r for r in csv.DictReader(open(args.archive))}
    s=Setup(T=200,N=24,windows=2,eta=.08,rho=1.,radius=1,pilot=2,wmax=8.)
    target,logged=oracle_target_and_logging(s,s.eta)
    output=[];max_difference=0;checked=0
    for seed in range(51001,51025):
        new=[]
        records,cert=run_one_seed('low_mismatch',s,seed,target,logged,reference_rounds=new)
        for r in records:
            key=(r['condition'],seed,r['method'])
            old=original[key]
            assert r['choices_sha256']==old['choices_sha256'],f'decision sequence mismatch {key}'
            for k in ['regret','gap','ATE_error','deploy','width_common_local_audit']:
                delta=abs(r[k]-float(old[k]))
                max_difference=max(max_difference,delta)
                assert delta<=1e-10,f'{key} mismatch for {k}: {delta}'
            assert r['final_configuration']==int(old['final_configuration'])
            checked+=1
        for method in FIVE:
            rows=[r for r in new if r['method']==method]
            assert len(rows)==s.T
            key=('low_mismatch',seed,method)
            old=original[key]
            assert abs(rows[-1]['cumulative_regret']-float(old['regret']))<1e-10
            assert abs(rows[-1]['cumulative_deploy']-float(old['deploy']))<1e-10
            assert rows[-1]['k']==int(old['final_configuration'])
        output.extend(new)
        print(f'verified seed {seed} · {checked} / 168 policy terminal hashes checked',flush=True)
    path=Path(args.out);path.parent.mkdir(parents=True,exist_ok=True)
    import gzip,io
    # Stable gzip bytes on every exact rerun: zero mtime + no embedded filename.
    with path.open('wb') as raw:
        with gzip.GzipFile(fileobj=raw,mode='wb',filename='',compresslevel=9,mtime=0) as gz:
            with io.TextIOWrapper(gz,encoding='utf-8',newline='') as f:
                writer=csv.DictWriter(f,fieldnames=list(output[0]));writer.writeheader();writer.writerows(output)
    audit={
      'result':'pass','type':'new deterministic source replay / not an original archived low-mismatch CSV',
      'cohort':{'condition':'low_mismatch','eta':s.eta,'T':s.T,'seeds':24,'seed_start':51001,'N':s.N,'windows':s.windows,'methods':FIVE},
      'per_method_round_rows':24*s.T,'new_reference_rows':len(output),
      'terminal_archived_records_checked':checked,
      'choice_sha256_checks_passed':checked,'terminal_metrics_checked':['regret','gap','ATE_error','deploy','width_common_local_audit','final_configuration'],
      'max_abs_terminal_difference':max_difference,
      'archive_sha256':sha256(args.archive),
      'replay_csv_sha256':sha256(path),
      'driver_sha256':sha256(HERE/'fast_compare.py'),
      'generator_sha256':sha256(HERE/'original_source/causal_ucb_conditional.py'),
      'note':'Target regret and deployment costs are computed against evaluation oracles AFTER choosing z_t; certification not assigned to baselines.'
    }
    Path(args.audit).write_text(json.dumps(audit,indent=2)+'\n')
    print('ALL DONE:',json.dumps(audit,indent=2),flush=True)
if __name__=='__main__':main()
