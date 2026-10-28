"""Argument/registration test only: every child command and git read is stubbed."""
import contextlib
import io
import json
from pathlib import Path
import runpy
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

driver = Path(__file__).with_name('DISPATCH_DRIVER.py').resolve()


class SelectionTests(unittest.TestCase):
    def test_both_explicit_choices_reach_preflight_and_run_without_real_children(self):
        for flags, presentation in [([], 'VI_DATA_BLOCKS_V1'), (['--compact-v2'], 'VI_DATA_BLOCKS_COMPACT_V2')]:
            with self.subTest(presentation=presentation), tempfile.TemporaryDirectory(prefix='c3-driver-args-') as parent:
                out = Path(parent) / 'new-run'
                calls = []

                def git(args, **kwargs):
                    if args == ['git', 'rev-parse', 'HEAD']:
                        return 'stub-source-sha\n'
                    self.assertEqual(args, ['git', 'status', '--porcelain'])
                    return ''

                def run(args, **kwargs):
                    calls.append(args)
                    if Path(args[1]).name == 'feedback-controls-20261023.mjs' and '--preflight' not in args:
                        (out / 'controls').mkdir()
                        (out / 'controls/summary.json').write_text(json.dumps({'controlsPass': True}), encoding='utf-8')
                    return SimpleNamespace(returncode=0)

                with patch.object(sys, 'argv', [str(driver), str(out), *flags]), patch.object(subprocess, 'check_output', side_effect=git), patch.object(subprocess, 'run', side_effect=run), contextlib.redirect_stdout(io.StringIO()):
                    runpy.run_path(str(driver), run_name='__main__')
                self.assertEqual(len(calls), 6)
                self.assertEqual(json.loads((out / 'REGISTRATION.json').read_text())['ownerContextPresentation'], presentation)
                self.assertEqual(calls[0][-1], presentation)
                for args in calls[-2:]:
                    self.assertEqual(args[-2:], ['--presentation', presentation])
                self.assertEqual(json.loads((out / 'STATUS.json').read_text())['status'], 'COLLECTED_REQUIRES_BLIND_REVIEW')

    def test_unknown_flag_rejects_before_source_or_child_access(self):
        with tempfile.TemporaryDirectory(prefix='c3-driver-args-') as parent:
            out = Path(parent) / 'new-run'
            with patch.object(sys, 'argv', [str(driver), str(out), '--unknown']), patch.object(subprocess, 'check_output') as git, patch.object(subprocess, 'run') as run:
                with self.assertRaisesRegex(AssertionError, 'DRIVER_PRESENTATION_ARGUMENT'):
                    runpy.run_path(str(driver), run_name='__main__')
                git.assert_not_called()
                run.assert_not_called()
                self.assertFalse(out.exists())


if __name__ == '__main__':
    unittest.main()
