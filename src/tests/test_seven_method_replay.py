"""Verify source-faithful published seven-method dataset; no synthetic data fill."""
from pathlib import Path
import csv,gzip,json,hashlib,unittest

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'docs/assets/certified-benchmark'
M=['CAUSAL-UCB-CERT-DR','CAUSAL-UCB-CERT-IPS','CAUSAL-UCB','IPS-UCB','Raw-UCB','Greedy-Raw','Switchback-OED']

class ReplayPublishedTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.obj=json.loads((BASE/'seven-method-comparison.json').read_text())
  with (BASE/'per_seed.csv').open() as f:
   cls.original={(r['condition'],r['seed'],r['method']):r for r in csv.DictReader(f)}
  cls.audit=json.loads((BASE/'replayed_low_mismatch_audit.json').read_text())
 def test_all_7_x_2_x_24_x_200_trace_completeness(self):
  for c in ('high_mismatch','low_mismatch'):
   for m in M:
    d=self.obj['conditions'][c]['methods'][m]
    self.assertTrue(d['has_per_round'])
    self.assertEqual(len(d['seeds']),24)
    for seed,rec in d['seeds'].items():
     for k in ('regret','deployment','config'):self.assertEqual(len(rec['trace'][k]),200)
 def test_all_final_metrics_match_archived(self):
  for c in ('high_mismatch','low_mismatch'):
   for m in M:
    d=self.obj['conditions'][c]['methods'][m]
    for seed,rec in d['seeds'].items():
     o=self.original[(c,seed,m)]
     for k,orig in [('regret','regret'),('deployment','deploy')]:
      self.assertAlmostEqual(rec['trace'][k][-1],float(o[orig]),delta=2e-8)
     self.assertEqual(rec['trace']['config'][-1],int(o['final_configuration']))
 def test_low_reference_csv_matches_json_traces(self):
  counts={m:0 for m in M[2:]}
  with gzip.open(BASE/'replayed_low_mismatch_5methods.csv.gz','rt') as f:
   for row in csv.DictReader(f):
    rec=self.obj['conditions']['low_mismatch']['methods'][row['method']]['seeds'][row['seed']]
    i=int(row['t'])-1
    self.assertAlmostEqual(rec['trace']['regret'][i],float(row['cumulative_regret']),delta=5.1e-11)
    self.assertAlmostEqual(rec['trace']['deployment'][i],float(row['cumulative_deploy']),delta=5.1e-11)
    self.assertEqual(rec['trace']['config'][i],int(row['k']))
    counts[row['method']]+=1
  self.assertTrue(all(v==24*200 for v in counts.values()))
 def test_replay_audit_and_hash(self):
  self.assertEqual(self.audit['choice_sha256_checks_passed'],168)
  self.assertEqual(self.audit['new_reference_rows'],24000)
  self.assertEqual(self.audit['max_abs_terminal_difference'],0)
  self.assertEqual(hashlib.sha256((BASE/'replayed_low_mismatch_5methods.csv.gz').read_bytes()).hexdigest(),self.audit['replay_csv_sha256'])
 def test_legacy_certification_not_extended(self):
  for c in ('high_mismatch','low_mismatch'):
   for m in M:
    d=self.obj['conditions'][c]['methods'][m]
    self.assertEqual(bool(d['certificate_valid']),m in M[:2])
    if m in M[2:]:self.assertIsNone(d['summary']['width'])
 def test_200_round_mean_matches_archived_final(self):
  for c in ('high_mismatch','low_mismatch'):
   for m in M:
    d=self.obj['conditions'][c]['methods'][m]
    for k,f in [('regret','regret'),('deployment','deploy')]:
     self.assertAlmostEqual(d['charts'][k][-1][1],d['summary'][f],delta=2e-7)
if __name__=='__main__':unittest.main()
