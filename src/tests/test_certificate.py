import sys,unittest
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(HERE),str(HERE/'original_source')]
from cert_dr import PublicDesign,CertifiedPolicy,make_run
from causal_ucb_conditional import Setup,oracle_target_and_logging
from fast_compare import run_one_seed
class CertificateTests(unittest.TestCase):
 def test_known_action_probability(self):
  d=PublicDesign()
  self.assertAlmostEqual(d.q,(1-.55/2)**3)
  self.assertLess(1/d.q,d.wmax)
 def test_strictly_no_clipping(self):
  with self.assertRaises(ValueError):PublicDesign(wmax=2.)
 def test_confidence_monotonic(self):
  d=PublicDesign();self.assertGreaterEqual(d.epsilon(1),d.epsilon(20))
  self.assertGreaterEqual(d.epsilon(20),d.epsilon(100))
 def test_no_oracle_exposed(self):
  d=PublicDesign();self.assertFalse(hasattr(d,'mu'));self.assertFalse(hasattr(d,'effect'))
 def test_score_uses_old_nuisance(self):
  d=PublicDesign(T=4)
  p=CertifiedPolicy(d)
  a=np.zeros(d.N,dtype=np.int8);r=np.full(d.N,.7);e=np.zeros(d.N)
  p.observe(0,0,[(a,r,e)])
  old=p.arms[0].events[0]
  self.assertAlmostEqual(old['prior'],.5)
  self.assertEqual(old['training_latest_round'],-1)
  self.assertAlmostEqual(old['DR_score'],.5+(.7-.5)/d.q)
 def test_explicit_dr_identity(self):
  d=PublicDesign(T=4)
  p=CertifiedPolicy(d)
  a=np.zeros(d.N,dtype=np.int8);r=np.full(d.N,.7);e=np.zeros(d.N)
  p.observe(0,0,[(a,r,e)])
  p.observe(0,1,[(a,r,e)])
  ev=p.arms[0].events
  self.assertAlmostEqual(ev[1]['prior'],.7)
  score=sum(v['DR_score'] for v in ev)/2
  self.assertAlmostEqual(p.arms[0].predecision()['raw_center'],score)
  self.assertAlmostEqual(p.arms[0].predecision()['radius'],
      p.arms[0].predecision()['prior_component']+p.arms[0].predecision()['noise_component'])
 def test_drift_rejected(self):
  with self.assertRaises(ValueError):make_run(Setup(T=10,early_shift=.1),51001)
 def test_annealing_rejected(self):
  with self.assertRaises(ValueError):make_run(Setup(T=10,eta_after=.08),51001)
 def test_same_seed_full_trajectory(self):
  s=Setup(T=35)
  targ,logged=oracle_target_and_logging(s,s.eta)
  r,trace=run_one_seed('high_mismatch',s,51001,targ,logged)
  for row in r[:2]:
   self.assertEqual(row['coverage_all_times'],1)
   self.assertEqual(row['candidate_certificate_acts_on_decision'],1)
  self.assertTrue(all(t['strict_past_training']==1 for t in trace))
  self.assertTrue(all(t['certified_ofu_check']==1 for t in trace if t['was_pilot']==0))

if __name__=='__main__':unittest.main()
