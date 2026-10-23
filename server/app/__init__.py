import json
import os

from bottle import abort, request, route, template

from . import config
from .db import create_tables, db
from .templateloader import TemplateLoader, TemplateNotFoundError
from .utils import create_logger

logger = create_logger('game')

_loader = None


def render(name, **kwargs):
    global _loader

    if _loader is None:
        _loader = TemplateLoader(config.TEMPLATE_DIR, os.path.join(config.STATIC_DIR, 'statics.json'), config.DEBUG)

    try:
        return template(_loader.render(f'{name}.html'), **kwargs)
    except TemplateNotFoundError as e:
        abort(500, e.message)


@route('/')
def index():
    return render('index')


@route('/get-top')
def get_top():
    try:
        data = db.query('SELECT * FROM results ORDER BY result DESC, time ASC LIMIT 0, 10').fetch(True, True)

        for item in data:
            item['rights'] = json.loads(item.get('rights', '[]'))
            item['wrongs'] = json.loads(item.get('wrongs', '[]'))

        return json.dumps(data)
    except:
        logger.error(f'Error on "{get_top.__name__}" view', exc_info=True)
        return json.dumps({'error': 'Server error.'})


@route('/send-score', method='POST')
def send_score():
    try:
        data = request.json
        username = data['user']
        result = data['result']
        time = data['time']
        rights = data['rights']
        wrongs = data['wrongs']

        if result > 256:
            raise ValueError(f'Field "result" needs to be lower than 256. Received: f{result}')
        if not isinstance(rights, list):
            raise ValueError(f'Field "rights" needs to be list type. Received: f{rights}')
        if not isinstance(wrongs, list):
            raise ValueError(f'Field "wrongs" needs to be list type. Received: f{wrongs}')

        db.query(f'INSERT INTO results VALUES (?,?,?,?,?)', (username, result, time, json.dumps(rights), json.dumps(wrongs))).commit()

        return json.dumps({'success': True})
    except Exception as e:
        logger.error(f'Error on "{get_top.__name__}" view', exc_info=True)
        return json.dumps({'error': 'Invalid data.'})
