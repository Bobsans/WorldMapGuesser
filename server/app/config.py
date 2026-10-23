import os

DEBUG = False

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

DB_FILE = os.path.join(BASE_DIR, 'db.sqlite')

REPO_DIR = os.path.dirname(BASE_DIR)
WEB_DIST = os.path.join(REPO_DIR, 'web', 'dist')
STATIC_DIR = os.environ.get(
    'WMG_STATIC_DIR',
    WEB_DIST if os.path.isdir(WEB_DIST) else os.path.join(BASE_DIR, 'static'),
)

TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')

LOG_FILE = os.path.join(BASE_DIR, 'logs', 'game.log')
