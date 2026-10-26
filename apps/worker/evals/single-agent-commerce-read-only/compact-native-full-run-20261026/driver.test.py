"""Offline argument/accounting test; every child/git command is stubbed."""
import contextlib
import io
import json
from pathlib import Path
import runpy
import subprocess
import sys
import tempfile
from types import SimpleNamespace
from unittest.mock import patch
import unittest

driver = Path(__file__).with_name('DISPATCH_DRIVER.py').resolve()

class DriverTest(unittest.TestCase):
    def test_full_population_once_and_explicit_selection(self):
        with tempfile.TemporaryDirectory(prefix='c3-native-driver-') as parent:
            out = Path(parent) / 'run'
            calls = []
            counts = {'opening-quotes': 5, 'media-followup': 7, 'missing-pos': 3,
                      'b1-first': 7, 'b1-rest': 14, 'journey-openings': 4,
                      'stateful': 8, 'negotiation': 3}
            def git(args, **kwargs):
                if args[0]=='node': return json.dumps({'version':'codex-cli 0.159.2','binarySha256':'52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a'})
                return 'stub-source\n' if args == ['git', 'rev-parse', 'HEAD'] else ''
            def child(args, **kwargs):
                calls.append(args)
                if any(str(v).endswith('feedback-controls-20261023.mjs') for v in args) and '--preflight' not in args:
                    (out/'controls').mkdir()
                    (out/'controls/summary.json').write_text('{"controlsPass":true}')
                for name,count in counts.items():
                    if str(out/name) in args:
                        p=out/name;p.mkdir()
                        if name.startswith('b1-'):
                            for i in range(count): (p/f'attempt-{i+1}.json').write_text('{}')
                        else: (p/'integration.json').write_text(json.dumps({'testDatabaseDropped':True,'completedOutcomes':count}))
                return SimpleNamespace(returncode=0)
            for phase in ['controls','native']:
                with patch.object(sys,'argv',[str(driver),str(out),phase]),patch.object(subprocess,'check_output',side_effect=git),patch.object(subprocess,'run',side_effect=child),contextlib.redirect_stdout(io.StringIO()):
                    runpy.run_path(str(driver),run_name='__main__')
            self.assertEqual(len(calls),20)
            status=json.loads((out/'DISPATCH_STATUS.json').read_text())
            self.assertEqual(status['nativeNotRun'],[])
            self.assertEqual(set(status['completedCohorts']),set(counts))
            reg=json.loads((out/'REGISTRATION.json').read_text())
            self.assertEqual(sum(c['slots'] for c in reg['cohorts']),51)
            self.assertEqual(reg['ownerContextPresentation'],'VI_DATA_BLOCKS_COMPACT_V2')
            for args in calls[4:]:
                i=args.index('--owner-presentation')
                self.assertEqual(args[i+1],'VI_DATA_BLOCKS_COMPACT_V2')
            self.assertTrue(all(c['status']=='COMPLETE' for c in json.loads((out/'COMMANDS.json').read_text())))

    def test_wrong_client_blocks_before_any_child_or_output(self):
        with tempfile.TemporaryDirectory(prefix='c3-client-precheck-') as parent:
            out=Path(parent)/'new'
            def read(args,**kwargs):
                if args[0]=='node':raise RuntimeError('CODEX_CLIENT_VERSION')
                return 'stub-source' if args[1:] == ['rev-parse','HEAD'] else ''
            with patch.object(sys,'argv',[str(driver),str(out),'controls']),patch.object(subprocess,'check_output',side_effect=read),patch.object(subprocess,'run') as child:
                with self.assertRaisesRegex(RuntimeError,'CODEX_CLIENT_VERSION'):runpy.run_path(str(driver),run_name='__main__')
                child.assert_not_called();self.assertFalse(out.exists())

if __name__=='__main__':unittest.main()
