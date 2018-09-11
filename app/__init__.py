import json
import os
from argparse import ArgumentParser

from bottle import abort, request, route, run, template

from app import config
from app.db import create_tables, db


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


if __name__ == '__main__':
    parser = ArgumentParser()
    parser.add_argument('-p', '--port', type=int, action='store', dest='port', default=8000, help='Port')
    args = parser.parse_args()

    create_tables()

    try:
        run(port=args.port)
    except KeyboardInterrupt:
        print('kill by ctrl+c')
        db.close()
