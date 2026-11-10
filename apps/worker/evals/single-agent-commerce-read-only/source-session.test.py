"""Exercise the actual admin-route predicate without importing SSH/credential side effects."""
import ast
from pathlib import Path
from types import SimpleNamespace
import unittest

script = Path(__file__).with_name('source-session.py').resolve()
tree = ast.parse(script.read_text(encoding='utf-8'))
condition = next(node.test for node in ast.walk(tree) if isinstance(node, ast.If)
                 and any(isinstance(child, ast.Subscript) and isinstance(child.value, ast.Name)
                         and child.value.id == 'env' and isinstance(child.slice, ast.Constant)
                         and child.slice.value == 'C3_B_TEST_ADMIN_DATABASE_URL'
                         for statement in node.body for child in ast.walk(statement)))


def allowed(*args):
    # Compile only the unchanged predicate, never the module that opens tunnels.
    return eval(compile(ast.Expression(condition), str(script), 'eval'),
                {'sys': SimpleNamespace(argv=[str(script), *args]), 'Path': Path, '__file__': str(script)})


class TestAdminScope(unittest.TestCase):
    def test_existing_integration_still_allowed(self):
        self.assertTrue(allowed('node', str(script.with_name('isolated-integration.mjs'))))

    def test_exact_policy_handoff_runner_allowed(self):
        self.assertTrue(allowed('node', str(script.parent / 'policy-handoff-run-20261020/run.mjs')))

    def test_arbitrary_or_similarly_named_scripts_denied(self):
        for name in ['run.mjs', 'advice-diagnostic.mjs', 'policy-handoff-run-OTHER/run.mjs']:
            with self.subTest(name=name):
                self.assertFalse(allowed('node', str(script.parent / name)))

    def test_other_interpreter_and_inline_code_denied(self):
        self.assertFalse(allowed('python', str(script.with_name('isolated-integration.mjs'))))
        self.assertFalse(allowed('node', '-e', 'arbitrary code'))

    def test_missing_arguments_denied(self):
        self.assertFalse(allowed())
        self.assertFalse(allowed('node'))


if __name__ == '__main__':
    unittest.main()
