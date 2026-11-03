"""A decision-active V8-style DR certificate in a *restricted homogeneous* network.

Assumptions: fixed global configuration z per arm, ring/local exposure completely
known, nodes independently Bernoulli(eta/2), known q=(1-eta/2)^(2r+1),
no clipping of 1/q, no context shift or residual dependence across windows,
matched-node outcomes are iid clip(mu_z+N(0,sigma^2),0,1) with known upper
bound sigma, noises independent of random action masks and past history.

This is NOT certification of arbitrary black-box V8 Theorem 1.
"""
from dataclasses import dataclass
from math import log, sqrt
from typing import List
import numpy as np

@dataclass(frozen=True)
class PublicDesign:
    K: int = 5
    N: int = 24
    T: int = 200
    windows: int = 2
    eta: float = .55
    radius: int = 1
    wmax: float = 8.
    sigma_bound: float = .08
    delta: float = .05
    pilot: int = 2
    def __post_init__(self):
        if not 0 < self.delta < 1 or self.N <= 2*self.radius or self.K < 2:raise ValueError('design')
        if not 0 <= self.eta < 1 or self.sigma_bound <= 0:raise ValueError('eta/sigma')
        if self.wmax+1e-12 < 1/self.q:raise ValueError('Clipping would bias DR. Must set wmax >= 1/q')
    @property
    def q(self):return (1.-self.eta/2.)**(2*self.radius+1)
    @property
    def L(self):
        # A union bound for every arm and every possible matched-sample count,
        # including counts selected adaptively by the allocation rule.
        max_m=self.N*self.windows*self.T
        return log(2*self.K*(max_m+1)/self.delta)
    def epsilon(self,m):
        if m == 0:return .5  # prior .5, W in [0,1]
        return min(1.,self.sigma_bound*sqrt(2*self.L/m))

class CertifiedArm:
    def __init__(self,design,prior_mode="dr"):
        self.d=design;self.prior_mode=prior_mode;self.visits=0;self.nwin=0;self.raw_dr_sum=0.
        self.matched_total=0;self.matched_sum=0.;self.prior_budget_sum=0.
        self.matched_prefix=[];self.events=[];self.rawsum=0.;self.nraw=0
    def predecision(self):
        d=self.d
        if self.nwin == 0:
            return dict(center=.5,raw_center=.5,radius=.5,lower=0.,upper=1.,
                        matched_n=0,n_windows=0,prior_component=.5,noise_component=0.)
        center=float(np.clip(self.raw_dr_sum/self.nwin,0,1))
        # Raw DR estimate is projected to [0,1]; projection cannot increase its error to W.
        b_prior=self.prior_budget_sum/self.nwin
        b_noise=self.matched_total * d.epsilon(self.matched_total)/(self.nwin*d.N*d.q)
        b=b_prior+b_noise
        return dict(center=center,raw_center=self.raw_dr_sum/self.nwin,radius=b,
                    lower=max(0.,center-b),upper=min(1.,center+b),
                    matched_n=self.matched_total,n_windows=self.nwin,
                    prior_component=b_prior,noise_component=b_noise)
    def observe(self,t,windows):
        from causal_ucb_conditional import matched_mask
        d=self.d
        # Frozen nuisance prediction for the *whole round* is trained strictly in the past.
        old_n=self.matched_total
        prior=(self.matched_sum/old_n if old_n else .5) if self.prior_mode=="dr" else 0.
        eps=d.epsilon(old_n) if self.prior_mode=="dr" else 1.
        for w,(actions,rewards,exposure) in enumerate(windows):
            I=matched_mask(actions,d.radius)
            nmatch=int(I.sum());h=nmatch/(d.N*d.q)
            score=float(prior+np.sum(I*(rewards-prior))/(d.N*d.q))
            self.raw_dr_sum+=score
            self.prior_budget_sum+=abs(1-h)*eps
            self.matched_total+=nmatch
            self.matched_sum+=float(rewards[I].sum())
            self.matched_prefix.append(nmatch)
            self.rawsum+=float(np.mean(rewards));self.nraw+=1
            self.nwin+=1
            self.events.append(dict(round=t,window=w,match=nmatch,h=h,prior=prior,
                                    epsilon_prior=eps,DR_score=score,
                                    training_latest_round=t-1,weight=1/d.q))
        self.visits+=1

class CertifiedPolicy:
    def __init__(self,design,prior_mode="dr"):
        self.d=design
        self.arms=[CertifiedArm(design,prior_mode=prior_mode) for _ in range(design.K)]
    def choice(self,t):
        vals=[a.predecision() for a in self.arms]
        pending=[k for k,a in enumerate(self.arms) if a.visits<self.d.pilot]
        if pending: return pending[0],True,vals
        optimism=np.array([v['upper'] for v in vals])
        best=np.flatnonzero(optimism>=np.max(optimism)-1e-12)
        chosen=int(best[np.argmax([vals[k]['center'] for k in best])])
        return chosen,False,vals
    def observe(self,k,t,windows):self.arms[k].observe(t,windows)
    def values(self):return [a.predecision() for a in self.arms]


def make_run(s,seed,method='CAUSAL-UCB-CERT-DR',condition='baseline',store_predecision=True):
    """Same generator / common random numbers as frozen 2026-10-20 SYN main.

    Observed data is the *only* input to policy; oracle values are used AFTER
    choosing to evaluate regret and coverage, never for scoring or selecting.
    """
    from causal_ucb_conditional import (Setup, run_trajectory,
         oracle_target_and_logging,exposure_from_actions,OnlinePolicy)
    if method!='CAUSAL-UCB-CERT-DR':
        r,rounds,nodes,learner=run_trajectory(s,seed,method,condition)
        return r,rounds,None
    d=PublicDesign(K=len(s.mu),N=s.N,T=s.T,windows=s.windows,
           eta=s.eta,radius=s.radius,wmax=s.wmax,sigma_bound=s.sigma,
           delta=s.delta,pilot=s.pilot)
    if s.early_shift!=0 or s.eta_after is not None:
        raise ValueError('This certificate REQUIRES stationarity and a fixed eta')
    policy=CertifiedPolicy(d)
    target,logging=oracle_target_and_logging(s,s.eta)
    best=float(target.max());opt=int(np.argmax(target))
    regret=0.;deploy=0.;rounds=[];all_good=True
    for t in range(s.T):
        k,pilot,vals=policy.choice(t)
        s_opt=vals[opt];s_chosen=vals[k]
        simultaneous=all(v['lower']-1e-12<=target[arm]<=v['upper']+1e-12
                         for arm,v in enumerate(vals))
        inst_regret=best-target[k]
        ofu_pass=inst_regret <= 2*s_chosen['radius']+1e-12
        if not pilot and simultaneous and not ofu_pass:raise AssertionError('OFU certificate violated')
        windows=[]
        for w in range(s.windows):
            rng=np.random.default_rng(np.random.SeedSequence([20261020,seed,t,w,1]))
            actions=(rng.random(s.N)<s.eta/2).astype(np.int8)
            e=exposure_from_actions(actions,s.radius)
            noise=np.random.default_rng(np.random.SeedSequence([20261020,seed,t,w,2])).normal(0,s.sigma,s.N)
            rewards=np.clip(s.mu[k]+s.rho*s.effect[k]*e+noise,0,1)
            windows.append((actions,rewards,e))
        regret+=inst_regret;deploy+=float(target[k]-logging[k]);policy.observe(k,t,windows)
        curvals=policy.values()
        all_good=all_good and all(x['lower']-1e-12<=target[j]<=x['upper']+1e-12 for j,x in enumerate(curvals))
        rounds.append(dict(seed=seed,condition=condition,method=method,t=t+1,k=k,pilot=int(pilot),
            eta=s.eta,regret_inc=float(inst_regret),cumulative_regret=float(regret),
            cumulative_deploy=float(deploy),predecision_center=s_chosen['center'],
            predecision_radius=s_chosen['radius'],predecision_UCB=s_chosen['upper'],
            predecision_n=s_chosen['n_windows'],postdecision_n=curvals[k]['n_windows'],
            predecision_prior_component=s_chosen['prior_component'],
            predecision_noise_component=s_chosen['noise_component'],
            predecision_joint_all_covered=int(simultaneous),
            postdecision_joint_all_covered=int(all(x['lower']<=target[j]<=x['upper'] for j,x in enumerate(curvals))),
            certified_ofu_inequality=int(ofu_pass) if not pilot else -1,
            selected_estimate_is_actual_certificate=1,
            training_max_round=t-1))
    v=policy.values();centers=np.array([x['center'] for x in v]);
    pairw=max((v[i]['upper']-v[i]['lower']+v[j]['upper']-v[j]['lower']) for i in range(d.K) for j in range(i+1,d.K))
    idx=np.triu_indices(d.K,1)
    ate=float(np.max(np.abs((centers[:,None]-centers[None,:]-target[:,None]+target[None,:])[idx])))
    r=dict(condition=condition,seed=seed,method=method,regret=float(regret),
          gap=float(best-target[rounds[-1]['k']]),ATE_error=ate,width=float(pairw),
          deploy=float(deploy),coverage_all_times=int(all_good),
          coverage_final=int(all(x['lower']<=target[j]<=x['upper'] for j,x in enumerate(v))),
          UCB_certificate_applied=1,mean_chosen_b=float(np.mean([x['predecision_radius'] for x in rounds])),
          max_final_b=float(max(x['radius'] for x in v)),
          final_optimal_identification=int(rounds[-1]['k']==opt),
          no_oracle_in_policy=1,certificate_type='prequential DR same-estimator anytime matched-noise budget',
          all_assumptions_satisfied=int(s.early_shift==0 and s.eta_after is None and 1/d.q<=s.wmax))
    return r,rounds,policy
