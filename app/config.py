import os

DEBUG = False

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

DB_FILE = os.path.join(BASE_DIR, 'db.sqlite')

STATIC_DIR = os.path.join(BASE_DIR, 'static')

TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')

LOG_FILE = os.path.join(BASE_DIR, 'logs', 'game.log')
