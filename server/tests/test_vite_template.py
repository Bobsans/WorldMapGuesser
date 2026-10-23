import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('template_loader', ROOT / 'server' / 'app' / 'templateloader.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ViteTemplateTests(unittest.TestCase):
    def render(self, manifest):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'index.html').write_text('<!-- {{ BUNDLE CSS }} --><!-- {{ BUNDLE JS }} -->', encoding='utf-8')
            stats = root / 'statics.json'
            stats.write_text(json.dumps(manifest), encoding='utf-8')
            return MODULE.TemplateLoader(str(root), str(stats), caching=False).render('index.html')

    def test_vite_css_imports_and_module_entry(self):
        html = self.render({
            'index.html': {'file': 'assets/main.js', 'css': ['assets/main.css', 'assets/shared.css'], 'imports': ['shared']},
            'shared': {'file': 'assets/shared.js', 'css': ['assets/shared.css']},
        })
        self.assertIn('<script type="module" src="/static/assets/main.js"></script>', html)
        self.assertEqual(html.count('href="/static/assets/shared.css"'), 1)
        self.assertLess(html.index('shared.css'), html.index('main.js'))
        self.assertNotIn('<!--', html)

    def test_classic_webpack_manifest_remains_readable(self):
        html = self.render({'status': 'done', 'bundles': {'bundle': [
            {'filename': 'old.js', 'publicPath': '/static/old.js'},
            {'filename': 'old.css', 'publicPath': '/static/old.css'},
        ]}})
        self.assertIn('<script src="/static/old.js"></script>', html)
        self.assertIn('href="/static/old.css"', html)

    def test_actual_build_manifest(self):
        manifest_path = ROOT / 'web' / 'dist' / 'statics.json'
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        self.assertIn('index.html', manifest, 'Run npm --prefix web run build before this integration test.')
        loader = MODULE.TemplateLoader(str(ROOT / 'server' / 'templates'), str(manifest_path), caching=False)
        html = loader.render('index.html')
        self.assertIn('type="module"', html)
        self.assertNotIn('<!-- {{', html)
        entry = manifest['index.html']
        for filename in [entry['file'], *entry.get('css', [])]:
            self.assertTrue((ROOT / 'web' / 'dist' / filename).is_file(), filename)
            self.assertIn('/static/' + filename, html)


if __name__ == '__main__':
    unittest.main()
