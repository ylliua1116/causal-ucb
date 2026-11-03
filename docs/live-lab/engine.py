"""Browser-side, faithful restricted-model experiment wrapper.

Imports the UNCHANGED `causal_ucb_conditional.py` from the research archive.
Does not claim general black-box certification or reproduce the full 24-seed study.
No server, no upstream network requests beyond loading the Pyodide runtime.
"""
import json
from dataclasses import replace
from causal_ucb_conditional import Setup, run_trajectory

ALLOWED = ('CAUSAL-UCB', 'IPS-UCB', 'Greedy-Raw', 'Raw-UCB', 'Switchback-OED')

def run_one(params_json, method):
    p = json.loads(params_json)
    if method not in ALLOWED:
        raise ValueError('Unknown experiment method')
    t = int(p.get('rounds', 40))
    eta = float(p.get('eta', .55))
    seed = int(p.get('seed', 42))
    rho = float(p.get('rho', 1.0))
    if not (20 <= t <= 120 and 0.1 <= eta <= 0.75 and 0.5 <= rho <= 1.5 and 0 <= seed <= 9999999):
        raise ValueError('Configuration outside interactive-study constraints')
    setup = Setup(N=24,T=t,windows=2,eta=eta,rho=rho, radius=1,
                  sigma=.08,wmax=8.,delta=.05,pilot=2)
    summary, rounds, nodes, model = run_trajectory(setup, seed=seed, method=method,
                        scenario='browser-local-exposure', store_nodes=False)
    return json.dumps({
       'method':method, 'rounds':t, 'seed':seed,'eta':eta,'rho':rho,
       'scope':'restricted-known-ring-local-exposure',
       'summary':{k:summary[k] for k in (
           'regret','ATE_error','width','martingale_width','deploy',
           'simultaneous_value_coverage','interval_certified_under_declared_DGP',
           'matched_n','visited_min','final_optimal_identification')},
       'trace':[{k:r[k] for k in (
           't','k','eta','cumulative_regret','cumulative_deploy',
           'ci_width','matched_nodes','reward_mean','e_mean')}
           for r in rounds]
    },allow_nan=False,separators=(',',':'))
