"""A fully logged, conditional local-exposure submodel of V8 CAUSAL-UCB.

NOT a proof or byte-for-byte implementation of the accepted paper in general
black-box networks. Identifies W(z;eta=0) by a local joint randomized event
with known support. Every guarantee requires the printed assumptions in README.
No oracle target/reward/simulator parameter is accessible to a policy.
"""
from __future__ import annotations
from dataclasses import dataclass, asdict
import math
from statistics import NormalDist
import numpy as np

Z_NAMES = ('z0','z1','z2','z3','z4')
DEFAULT_MU=(.44,.49,.62,.54,.51)
DEFAULT_EFFECT=(-.10,-.05,-.60,-.07,-.02)
BASE_METHODS=('CAUSAL-UCB','IPS-UCB','Raw-UCB','Greedy-Raw','Switchback-OED')
ABLATIONS=('no_DR','no_Exposure','no_OFU','no_Exploration')

@dataclass(frozen=True)
class Setup:
    N:int=24
    T:int=180
    windows:int=2
    eta:float=.55
    eta_after:float|None=None
    switch_round:int=30
    rho:float=1.0
    radius:int=1
    sigma:float=.08
    wmax:float=8.0
    delta:float=.05
    pilot:int=2
    early_shift:float=0.0  # A deliberately *unsupported* nonstationarity stress condition.
    mu:tuple=DEFAULT_MU
    effect:tuple=DEFAULT_EFFECT


def local_weights(radius):
    if radius==1:return ((0,.6),(-1,.2),(1,.2))
    if radius==2:return ((0,.5),(-1,.15),(1,.15),(-2,.10),(2,.10))
    raise ValueError('radius must be 1 or 2')


def exposure_from_actions(actions,radius):
    return sum(weight*np.roll(actions,offset) for offset,weight in local_weights(radius))


def matched_mask(actions,radius):
    match=actions==0
    for d in range(1,radius+1):
        match &= np.roll(actions,d)==0
        match &= np.roll(actions,-d)==0
    return match


def exact_match_prob(eta,radius):
    return (1-eta/2)**(2*radius+1)


def clipped_normal_mean(mu,sigma):
    if sigma<=0:return min(1.,max(0.,mu))
    n=NormalDist();a=-mu/sigma;b=(1-mu)/sigma
    phi=lambda x:math.exp(-x*x/2)/math.sqrt(2*math.pi)
    return mu*(n.cdf(b)-n.cdf(a))+sigma*(phi(a)-phi(b))+1-n.cdf(b)


def oracle_target_and_logging(setup,eta):
    """Evaluation ONLY. Integrates 2^(2r+1) independent flip masks analytically."""
    target=np.array([clipped_normal_mean(m,setup.sigma) for m in setup.mu])
    law=[];weights=local_weights(setup.radius)
    from itertools import product
    p=eta/2
    for k,(mu,eff) in enumerate(zip(setup.mu,setup.effect)):
        val=0.
        for pattern in product((0,1),repeat=2*setup.radius+1):
            probs=math.prod(p if bit else 1-p for bit in pattern)
            a=dict(zip(range(-setup.radius,setup.radius+1),pattern))
            e=sum(weight*a[offset] for offset,weight in weights)
            val+=probs*clipped_normal_mean(mu+setup.rho*eff*e,setup.sigma)
        law.append(val)
    return target,np.array(law)


@dataclass(frozen=True)
class PublicPolicyConfig:
    """Observable/declared design parameters only; NO simulator target coefficients."""
    N:int
    K:int
    T:int
    windows:int
    radius:int
    pilot:int
    wmax:float
    delta:float
    sigma:float

class PastOnlyArm:
    """DR score: fitted m_z(0) + 1{entire known neighborhood clean}/q * (R-m_z(0)).

    Scores are network-window means, *not* N independent units. Temporal
    prequential nuisance fit. Conditional means of scores equal W_z(0) under
    fixed graph, independent Bernoulli interventions, stationary independent
    clipped reward noise, no hidden interventions or context drift.
    """
    def __init__(self,setup):
        self.s=setup;self.dr=[];self.ips=[];self.raw=[];self.local_c=[];self.whole_c=[]
        self.hist_e=[];self.hist_y=[];self.matched_n=0;self.matched_sum=0.;self.visits=0
        self.log=[]
    def prior(self):
        if not self.hist_y:return .5
        e=np.concatenate(self.hist_e);y=np.concatenate(self.hist_y)
        if len(y)<2:return float(np.clip(y.mean(),0,1))
        # configuration-specific, past-only bounded outcome nuisance at exposure=0
        em=float(e.mean());ym=float(y.mean());cov=float(np.mean((e-em)*(y-ym)))
        beta=cov/(float(np.mean((e-em)**2))+.04)
        return float(np.clip(ym-beta*em,0.,1.))
    def observe(self,round_index,eta,windows):
        prior=self.prior()   # Fit ONCE from earlier rounds: no within-round leakage
        for w,(actions,rewards,exposure) in enumerate(windows):
            assert len(actions)==self.s.N and 0<=rewards.min() and rewards.max()<=1
            match=matched_mask(actions,self.s.radius)
            q=exact_match_prob(eta,self.s.radius)
            # Clipped ratio: when wmax too small, bias is NOT certified; status is downgraded.
            iw=min(1/q,self.s.wmax)
            val=float(prior+np.mean(match*iw*(rewards-prior)))
            ips=float(np.mean(match*iw*rewards))
            raw=float(np.mean(rewards))
            degree=2*self.s.radius+1
            # McDiarmid: degree actions affect at most degree local scores;
            # node noises each affect at most one, bounded R in [0,1].
            # Valid for UNCLIPPED 1/q; clipped values keep the same bound but biased.
            local_c=(degree*degree+1)/(self.s.N*q*q)
            whole_c=1/(q*q)   # conservative comparison proxy per window
            self.dr.append(val);self.ips.append(ips);self.raw.append(raw)
            self.local_c.append(local_c);self.whole_c.append(whole_c)
            self.matched_n+=int(match.sum())
            self.matched_sum+=float(rewards[match].sum())
            self.log.append(dict(round=round_index,window=w,prior=prior,
              propensity=q,weight=iw,matched_nodes=int(match.sum()),dr=val,ips=ips,
              raw=raw,c_local=local_c,training_max_round=round_index-1))
        for a,r,e in windows:
            self.hist_e.append(e.copy());self.hist_y.append(r.copy())
        self.visits+=1
    def value(self,kind):
        scores={'dr':self.dr,'ips':self.ips,'raw':self.raw}[kind]
        return float(np.clip(np.mean(scores),0,1)) if scores else .5
    def radius(self,kind,total_horizon,delta):
        n=len(self.dr)
        if not n:return float('inf')
        l=math.log(2*len(Z_NAMES)*(total_horizon*self.s.windows+1)/delta)
        if kind in ('dr','ips'):
            # For DR and IPS, local joint randomization and independent node noise.
            # McDiarmid over 2N independent random inputs each window.
            return math.sqrt(l*sum(self.local_c)/(2*n*n))
        # Raw-reward mean is NOT unbiased for target; radius only for logged mean.
        return math.sqrt(l/(2*n))
    def interval_matched(self,delta,known_sigma=True):
        """Anytime uniform conditional CI for noise-homogeneous matched rewards.

        Clipping a Gaussian variable is Lipschitz, hence sigma-subGaussian.
        Known sigma is an ADDITIONAL assumption not in general V8 Theorem 1.
        Hoeffding alternative needs only iid bounded matched target rewards.
        """
        n=self.matched_n
        if not n:return (0.,1.)
        v=self.matched_sum/n
        L=math.log(2*self.s.K*self.s.N*self.s.T*self.s.windows/delta)
        r=(self.s.sigma*math.sqrt(2*L/n) if known_sigma else math.sqrt(L/(2*n)))
        return max(0.,v-r),min(1.,v+r)

    def interval(self,kind,delta):
        if not self.dr:return (0.,1.)
        r=self.radius(kind,self.s.T,delta);v=self.value(kind)
        return max(0.,v-r),min(1.,v+r)

class OnlinePolicy:
    def __init__(self,method,s):
        self.method=method
        self.s=PublicPolicyConfig(N=s.N,K=len(s.mu),T=s.T,windows=s.windows,
             radius=s.radius,pilot=s.pilot,wmax=s.wmax,delta=s.delta,sigma=s.sigma)
        self.arms=[PastOnlyArm(self.s) for _ in range(self.s.K)]
        self.traces=[]
        assert not hasattr(self.s,"mu") and not hasattr(self.s,"effect")
    def choice(self,t):
        m=self.method
        under=[k for k,a in enumerate(self.arms) if a.visits<self.s.pilot]
        if under:return under[0]
        if m=='Switchback-OED':return (t//2)%len(self.arms)
        if m in ('Greedy-Raw','Raw-UCB','no_Exposure','no_DR'): kind='raw' if m in ('Greedy-Raw','Raw-UCB','no_Exposure') else 'ips'
        else:kind='dr'
        v=np.array([a.value(kind) for a in self.arms]);r=np.array([a.radius(kind,self.s.T,self.s.delta) for a in self.arms]);
        if m in ('Greedy-Raw','no_OFU'):idx=int(np.argmax(v))
        else:
            # Correct capped OFU bounds for W in [0,1] (only causal/IPS under assumptions).
            u=np.minimum(1.,v+r)
            # Within mathematically exact optimistic ties, prefer highest estimate.
            best=np.flatnonzero(u>=max(u)-1e-12)
            idx=int(best[np.argmax(v[best])])
        return idx
    def observe(self,k,t,eta,windows):
        self.arms[k].observe(t,eta,windows)
    def estimates(self):
        m=self.method
        kind=('dr' if m in ('CAUSAL-UCB','no_OFU','no_Exploration') else 'ips' if m=='IPS-UCB' or m=='no_DR' else 'raw')
        return np.array([a.value(kind) for a in self.arms]),kind


def run_trajectory(s,seed,method,scenario,store_nodes=False):
    """Chosen policy only sees the 3-tuples (action, reward, exposure)."""
    learner=OnlinePolicy(method,s)
    target,logging0=oracle_target_and_logging(s,s.eta)
    best=float(target.max());k_best=int(target.argmax())
    rounds=[];nodes=[];regret=deploy=0.
    logged_by_eta={val:oracle_target_and_logging(s,val)[1] for val in (s.eta,s.eta_after if s.eta_after is not None else s.eta,0.0)}
    # For diagnostic fair-width assessment we use the SAME causal evaluator
    # on each method's *own logs*, never altering deployment choices.
    for t in range(s.T):
        eta=s.eta if s.eta_after is None or t<s.switch_round else s.eta_after
        if method=='no_Exploration':eta=0.0
        k=learner.choice(t)
        windows=[]
        for w in range(s.windows):
            rng=np.random.default_rng(np.random.SeedSequence([20261020,seed,t,w,1]))
            actions=(rng.random(s.N)<eta/2).astype(np.int8)
            e=exposure_from_actions(actions,s.radius)
            noise=np.random.default_rng(np.random.SeedSequence([20261020,seed,t,w,2])).normal(0,s.sigma,s.N)
            time_drift=s.early_shift*(t/max(1,s.T-1)-.5)
            rewards=np.clip(s.mu[k]+s.rho*s.effect[k]*e+time_drift+noise,0,1)
            windows.append((actions,rewards,e))
            if store_nodes:
                for i in range(s.N):nodes.append(dict(scenario=scenario,seed=seed,method=method,
                  t=t+1,window=w,node=i,configuration=k,eta=eta,action=int(actions[i]),
                  exposure=float(e[i]),reward=float(rewards[i])))
        learner.observe(k,t,eta,windows)
        logged=logged_by_eta[eta]
        regret+=best-target[k]
        deploy+=target[k]-logged[k]
        estimate,kind=learner.estimates()
        rounds.append(dict(scenario=scenario,seed=seed,method=method,t=t+1,k=k,eta=eta,
          target_regret_increment=best-target[k],cumulative_regret=regret,
          deployment_gap_increment=target[k]-logged[k],cumulative_deploy=deploy,
          reward_mean=float(np.mean([w[1].mean() for w in windows])),
          e_mean=float(np.mean([w[2].mean() for w in windows])),
          ci_width=max(pair_widths(learner.arms,kind='dr',delta=s.delta)),
          matched_nodes=learner.arms[k].log[-1]['matched_nodes'],
          prequential_training_max_round=t-1))
    estimate,kind=learner.estimates()
    # All algorithms' identification metrics: separately report native
    # estimator ATE AND a common posthoc causal audit built on the same logs.
    ix=np.triu_indices(len(target),1)
    def metric(v):return float(np.max(np.abs((v[:,None]-v[None,:]-(target[:,None]-target[None,:]))[ix])))
    audit=np.array([a.value('dr') for a in learner.arms])
    gaussian_intervals=np.array([a.interval_matched(s.delta,True) for a in learner.arms])
    hoeffding_intervals=np.array([a.interval_matched(s.delta,False) for a in learner.arms])
    def pair_diam(ivals):
        return float(max(ivals[i,1]-ivals[i,0]+ivals[j,1]-ivals[j,0] for i in range(len(ivals)) for j in range(i+1,len(ivals))))
    lohi=np.array([a.interval('dr',s.delta) for a in learner.arms])
    simultaneous=bool(np.all((target>=lohi[:,0]-1e-12)&(target<=lohi[:,1]+1e-12)))
    if s.early_shift:simultaneous_valid=False
    else:simultaneous_valid=(1/exact_match_prob(s.eta,s.radius)<=s.wmax+1e-12)
    # Across an annealed schedule max weight is attained at max eta
    if s.eta_after is not None:
        simultaneous_valid=(max(1/exact_match_prob(s.eta,s.radius),1/exact_match_prob(s.eta_after,s.radius))<=s.wmax+1e-12 and s.early_shift==0)
    pairs=pair_widths(learner.arms,'dr',s.delta)
    return dict(scenario=scenario,seed=seed,method=method,regret=float(regret),
      gap=float(best-target[rounds[-1]['k']]),ATE_error=metric(estimate),
      value_RMSE=float(np.sqrt(np.mean((estimate-target)**2))),
      audit_ATE_error=metric(audit),
      width=float(pair_diam(gaussian_intervals)),
      martingale_width=float(max(pairs)),
      hoeffding_width=pair_diam(hoeffding_intervals),
      gaussian_simultaneous_coverage=int(np.all((target>=gaussian_intervals[:,0]-1e-12)&(target<=gaussian_intervals[:,1]+1e-12))),
      hoeffding_simultaneous_coverage=int(np.all((target>=hoeffding_intervals[:,0]-1e-12)&(target<=hoeffding_intervals[:,1]+1e-12))),
      matched_counts_per_config='|'.join(str(a.matched_n) for a in learner.arms),
      deploy=float(deploy),
      simultaneous_value_coverage=int(simultaneous),
      interval_certified_under_declared_DGP=int(simultaneous_valid),
      final_optimal_identification=int(rounds[-1]['k']==k_best),
      matched_n=int(sum(x.matched_n for x in learner.arms)),
      visited_min=int(min(a.visits for a in learner.arms)),
      oracle_best_k=k_best,seed_scenario=f'{scenario}/{seed}',
      config_at_end=int(rounds[-1]['k'])),rounds,nodes,learner


def pair_widths(arms,kind,delta):
    intervals=[a.interval(kind,delta) for a in arms]
    return [max(0.,intervals[i][1]-intervals[i][0]+intervals[j][1]-intervals[j][0])
       for i in range(len(arms)) for j in range(i+1,len(arms))]
