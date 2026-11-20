"""Matched-seed accelerated replay, with frozen 20261020 generator semantics."""
from __future__ import annotations
import argparse,csv,json,sys,hashlib
from dataclasses import replace,asdict
from pathlib import Path
from math import sqrt
import numpy as np
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE/'original_source'))
from causal_ucb_conditional import (Setup, OnlinePolicy, oracle_target_and_logging,
            exposure_from_actions, pair_widths)
from cert_dr import CertifiedPolicy,PublicDesign

METHODS=['CAUSAL-UCB-CERT-DR','CAUSAL-UCB-CERT-IPS','CAUSAL-UCB','IPS-UCB','Raw-UCB','Greedy-Raw','Switchback-OED']
SCENARIOS={'high_mismatch':.55,'low_mismatch':.08,'medium_mismatch':.30}
def save_csv(p,rows):
 if not rows:return
 p=Path(p);p.parent.mkdir(exist_ok=True,parents=True)
 keys=list(dict.fromkeys(k for row in rows for k in row))
 with p.open('w',newline='',encoding='utf-8') as f:
  w=csv.DictWriter(f,fieldnames=keys);w.writeheader();w.writerows(rows)

def run_one_seed(sc,setup,seed,target,logged,save_full=True,reference_rounds=None):
 """Noise/action arrays exactly match the original source SeedSequence labeling.
    Each policy sees only its chosen reward/exposure and past selected outcomes.
 """
 env=[]
 for t in range(setup.T):
  row=[]
  for w in range(setup.windows):
   a=(np.random.default_rng(np.random.SeedSequence([20261020,seed,t,w,1])).random(setup.N)<setup.eta/2).astype(np.int8)
   e=exposure_from_actions(a,setup.radius)
   noise=np.random.default_rng(np.random.SeedSequence([20261020,seed,t,w,2])).normal(0,setup.sigma,setup.N)
   row.append((a,e,noise))
  env.append(row)
 summary=[];trace=[];best=float(max(target));opt=int(np.argmax(target))
 for name in METHODS:
  policy=(CertifiedPolicy(PublicDesign(K=len(setup.mu),N=setup.N,T=setup.T,windows=setup.windows,
                  eta=setup.eta,radius=setup.radius,pilot=setup.pilot,wmax=setup.wmax,
                  sigma_bound=setup.sigma,delta=setup.delta),
              prior_mode=('ips' if name=='CAUSAL-UCB-CERT-IPS' else 'dr')) if name.startswith('CAUSAL-UCB-CERT-')
          else OnlinePolicy(name,setup))
  regret=deploy=0.;all_covered=1;ofubad=0;decisions=[]
  for t in range(setup.T):
   if name.startswith('CAUSAL-UCB-CERT-'):
    k,pilot,vals=policy.choice(t);val=vals[k]
    fullcovered=int(all(x['lower']-1e-12<=target[j]<=x['upper']+1e-12 for j,x in enumerate(vals)))
    ofucheck=int(best-target[k] <= 2*val['radius']+1e-12) if not pilot else -1
    if fullcovered and ofucheck==0:raise AssertionError(f'OFU failure with simultaneous cover {seed},{sc},{t}')
    if not pilot and ofucheck==0:ofubad+=1
   else:
    k=policy.choice(t);pilot=int(t<setup.pilot*len(setup.mu));val=None
   windows=[]
   for a,e,noise in env[t]:
    y=np.clip(setup.mu[k]+setup.rho*setup.effect[k]*e+noise,0.,1.)
    windows.append((a,y,e))
   policy.observe(k,t,setup.eta,windows) if not name.startswith('CAUSAL-UCB-CERT-') else policy.observe(k,t,windows)
   regret+=best-target[k];deploy+=target[k]-logged[k];decisions.append(k)
   if reference_rounds is not None and not name.startswith('CAUSAL-UCB-CERT-'):
    reference_rounds.append(dict(condition=sc,seed=seed,method=name,t=t+1,k=int(k),
       target_regret_increment=float(best-target[k]),cumulative_regret=float(regret),
       deployment_gap_increment=float(target[k]-logged[k]),cumulative_deploy=float(deploy)))
   if name.startswith('CAUSAL-UCB-CERT-'):
    scored=policy.arms[k].events[-setup.windows:]
    strict=all(e['training_latest_round']==t-1 for e in scored)
    assert strict, 'Future nuisance leakage'
    curr=policy.values()
    fullcovered_post=int(all(x['lower']-1e-12<=target[j]<=x['upper']+1e-12 for j,x in enumerate(curr)))
    all_covered=min(all_covered,fullcovered,fullcovered_post)
    trace.append(dict(condition=sc,seed=seed,t=t+1,method=name,k=k,
       eta=setup.eta,was_pilot=int(pilot),predecision_center=val['center'],
       predecision_radius=val['radius'],predecision_upper=val['upper'],
       predecision_prior_component=val['prior_component'],
       predecision_noise_component=val['noise_component'],
       predecision_n_windows=val['n_windows'],
       postdecision_n_windows=curr[k]['n_windows'],
       predecision_joint_coverage=fullcovered,
       postdecision_joint_coverage=fullcovered_post,
       certified_ofu_check=ofucheck,cum_regret=float(regret),
       regret_increment=float(best-target[k]),cum_deploy=float(deploy),
       strict_past_training=int(strict),
       scored_round_first_nuisance=float(scored[0]['prior']),
       scored_round_first_DR_score=float(scored[0]['DR_score']),
       matched_nodes_round=sum(e['match'] for e in scored),
       postdecision_raw_DR_center=curr[k]['raw_center']))
  if name.startswith('CAUSAL-UCB-CERT-'):
   vals=policy.values();estimated=np.array([v['center'] for v in vals]);
   width=max((vals[i]['upper']-vals[i]['lower']+vals[j]['upper']-vals[j]['lower']) for i in range(len(vals)) for j in range(i+1,len(vals)))
   certified=True
  else:
   estimated,kind=policy.estimates()
   audit=[a.interval('dr',setup.delta) for a in policy.arms]
   width=max((audit[i][1]-audit[i][0]+audit[j][1]-audit[j][0]) for i in range(len(audit)) for j in range(i+1,len(audit)))
   certified=False # use existing generic local-McDiarmid audit comparator (not same chosen radius)
  ix=np.triu_indices(len(target),1)
  ate=float(np.max(np.abs((estimated[:,None]-estimated[None,:]-(target[:,None]-target[None,:]))[ix])))
  summary.append(dict(condition=sc,seed=seed,method=name,regret=float(regret),
    gap=float(best-target[decisions[-1]]),ATE_error=ate,
    width_decision_certificate=float(width) if certified else float('nan'),
    width_common_local_audit=float(width),deploy=float(deploy),
    coverage_all_times=int(all_covered) if certified else '',
    candidate_certificate_acts_on_decision=int(certified),
    ofu_fail_without_coverage=int(ofubad) if certified else '',
    final_best_identification=int(decisions[-1]==opt),
    final_configuration=int(decisions[-1]),
    choices_sha256=hashlib.sha256(bytes(decisions)).hexdigest()))
 return summary,trace

def main():
 ap=argparse.ArgumentParser()
 ap.add_argument('--out',default='results_fast')
 ap.add_argument('--seeds',type=int,default=24)
 ap.add_argument('--T',type=int,default=200)
 ap.add_argument('--pilot',type=int,default=2)
 ap.add_argument('--scenarios',default='high_mismatch,low_mismatch')
 args=ap.parse_args();out=Path(args.out);out.mkdir(exist_ok=True,parents=True)
 rows=[];rounds=[]
 for sc in args.scenarios.split(','):
  s=Setup(T=args.T,N=24,windows=2,eta=SCENARIOS[sc],rho=1.,radius=1,pilot=args.pilot,wmax=8.)
  target,logged=oracle_target_and_logging(s,s.eta)
  for seed in range(51001,51001+args.seeds):
   se,tr=run_one_seed(sc,s,seed,target,logged)
   rows+=se;rounds+=tr
  save_csv(out/'per_seed_checkpoint.csv',rows)
  print('FINISHED',sc,'n_methods_seed',len(rows),flush=True)
 save_csv(out/'per_seed.csv',rows);save_csv(out/'cert_dr_all_rounds.csv',rounds)
 summaries=[]
 for sc in args.scenarios.split(','):
  for m in METHODS:
   a=[x for x in rows if x['condition']==sc and x['method']==m]
   r=np.array([x['regret'] for x in a]);d=np.array([x['deploy'] for x in a])
   base=dict(condition=sc,method=m,n_seeds=len(a),regret_mean=float(r.mean()),
      regret_SE=float(r.std(ddof=1)/sqrt(len(r))) if len(r)>1 else 0.,
      deploy_mean=float(d.mean()),ATE_mean=float(np.mean([x['ATE_error'] for x in a])),
      width_decision_certificate_mean=float(np.mean([x['width_decision_certificate'] for x in a])) if m.startswith('CAUSAL-UCB-CERT-') else '',
      within_horizon_all_time_coverage_rate=float(np.mean([x['coverage_all_times'] for x in a])) if m.startswith('CAUSAL-UCB-CERT-') else '',
      final_best_identification_rate=float(np.mean([x['final_best_identification'] for x in a])))
   if m.startswith('CAUSAL-UCB-CERT-'):
    baseline=np.array([x['regret'] for x in rows if x['condition']==sc and x['method']=='Greedy-Raw'])
    diff=r-baseline
    base.update(paired_mean_regret_diff_vs_greedy=float(diff.mean()),
        paired_sd_regret_diff_vs_greedy=float(diff.std(ddof=1)))
   summaries.append(base)
 save_csv(out/'summary.csv',summaries)
 (out/'protocol.json').write_text(json.dumps(dict(generator='Original frozen SYN 2026-10-20',
         assumptions='known sparse ring radius, stationary homogeneous no-exploration clipped gaussian, matched iid noise, known sigma upper bound, fixed eta, no clipping bias',
         seed_start=51001,seeds=args.seeds,T=args.T,windows=2,pilot=args.pilot,
         methods=METHODS,eta=SCENARIOS,epsilon_union='log(2*K*(N*T*windows+1)/delta)',
         oracle_used_for_evaluation_only=True,
         parent_reference='CAUSAL_UCB_GitHub_Conditional_Release_20261020'),indent=2))
 for x in summaries:print(x,flush=True)
 print('ALL DONE',len(rows),len(rounds),flush=True)
if __name__=='__main__':main()
