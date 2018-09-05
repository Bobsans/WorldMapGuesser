import os
from argparse import ArgumentParser

from bottle import route, run, template, abort

BASE = os.path.dirname(__file__)

def render(name, **kwargs):
    path = os.path.join(BASE, 'templates', f'{name}.html')
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as file:
            return template(file.read(), **kwargs)
    abort(500, f'Template ({name}) not found')


@route('/')
def index():
    return render('index')


if __name__ == '__main__':
    parser = ArgumentParser()
    parser.add_argument('-p', '--port', type=int, action='store', dest='port', default=8000, help='Port')
    args = parser.parse_args()

    run(port=args.port)
