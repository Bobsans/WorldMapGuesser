import json
import os

from bottle import abort, request, route, template

from . import config
from .db import create_tables, db


def render(name, **kwargs):
    path = os.path.join(config.BASE_DIR, 'templates', f'{name}.html')
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as file:
            return template(file.read(), **kwargs)
    abort(500, f'Template ({name}) not found')


@route('/')
def index():
    return render('index')


@route('/get-top')
def get_top():
    try:
        data = db.query('SELECT * FROM results ORDER BY result DESC, time ASC LIMIT 0, 20').fetch(True, True)
        return json.dumps(data)
    except Exception as e:
        print(e)
        return json.dumps({'error': 'Server error.'})


@route('/send-score', method='POST')
def send_score():
    try:
        data = request.json
        username = data.get('user')
        result = data.get('result')
        time = data.get('time')

        db.query(f'INSERT INTO results VALUES (?,?,?)', (username, result, time)).commit()

        return json.dumps({'success': True})
    except Exception as e:
        print(e)
        return json.dumps({'error': 'Invalid data.'})
