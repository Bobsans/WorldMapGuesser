import json
import os
import re

STATS_REGEX = r'(?P<full><!-- {{ (?P<bundle>[A-Z]+)(?: (?P<type>[A-Z]+))? }} -->)'


class TemplateNotFoundError(Exception):
    def __init__(self, path):
        self.message = f'Template by path "{path}" not found.'


class TemplateLoader:
    _template_cache = {}
    _stats_cache = {}

    def __init__(self, root, stats_path='stats.json', caching=True):
        self.root = root
        self.stats_path = stats_path
        self.caching = caching

    def _load_template(self, path):
        if not self.caching or (self.caching and not self._template_cache):
            abspath = os.path.join(self.root, path)
            if os.path.exists(abspath):
                with open(abspath, 'r', encoding='utf-8') as file:
                    self._template_cache[path] = file.read()
            else:
                raise TemplateNotFoundError(path)
        return self._template_cache[path]

    def _load_stats(self):
        if not self.caching or (self.caching and not self._stats_cache):
            if os.path.exists(self.stats_path):
                with open(self.stats_path, 'r', encoding='utf-8') as file:
                    self._stats_cache = json.load(file)
        return self._stats_cache

    def _include_stats(self, template):
        stats = self._load_stats()

        if stats.get('status') == 'done':
            match = re.search(STATS_REGEX, template)
            while match:
                bundle_name = (match.group('bundle') or '').lower()
                files_type = (match.group('type') or '').lower()

                files = stats.get('bundles', {}).get(bundle_name, [])

                rendered = self._render_stats_files(files, files_type)

                template = template[:match.start('full')] + rendered + template[match.end('full'):]
                match = re.search(STATS_REGEX, template)

        return template

    def _render_stats_files(self, files, file_types=None):
        output = []

        for file in files:
            _, ext = os.path.splitext(file.get('filename', ''))

            if file_types and f'.{file_types}' != ext:
                continue

            if ext == '.js':
                output.append(f'<script src="%s"></script>' % file.get('publicPath'))
            elif ext == '.css':
                output.append(f'<link rel="stylesheet" type="text/css" href="%s">' % file.get('publicPath'))

        return '\n'.join(output)

    def render(self, path):
        return self._include_stats(self._load_template(path))
